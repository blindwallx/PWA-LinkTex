// src/components/OperarioPanel.tsx
import React, { useState, useEffect, useCallback, type ChangeEvent, type FormEvent } from 'react';
import { db } from '../firebaseConfig';
import { collection, getDocs, doc, updateDoc, Timestamp, addDoc, getDoc, FieldValue } from 'firebase/firestore';
import { useOutletContext } from 'react-router-dom';
import './OperarioPanel.css';
import './claimOpModal.css'; // Asegúrate de importar el CSS del modal
import Modal from './claimOpModal'; // <-- IMPORTAR EL COMPONENTE MODAL
import { type Product } from './ProductManagement';

// NUEVA INTERFAZ PARA LA ESTRUCTURA INTERNA DE LA TALLA
interface ProductVariantSizeDetail {
    total: number;
    processesCompleted: {
        [processName: string]: number;
    };
}

// NUEVA ESTRUCTURA DE VARIANTE
interface ProductVariant {
    id?: string;
    color: string;
    sizes: {
        [key: string]: ProductVariantSizeDetail;
    };
    stockInProduction: number;
    createdAt: Timestamp;
    startDate: Timestamp;
    dueDate?: Timestamp;
    productId: string;
}

interface OperarioWorkRecord {
    id?: string;
    operarioId: string;
    operarioName: string;
    productId: string;
    productName: string;
    productRef: string;
    variantId: string;
    variantColor: string;
    processName: string;
    processValue: number;
    size: string;
    quantity: number;
    timestamp: Timestamp;
    companyId: string;
}

interface OutletContextType {
    userId: string | null;
    userName: string | null;
    userRole: string | null;
    companyId: string | null;
}

function isProductVariantSizeDetail(data: unknown): data is ProductVariantSizeDetail {
    if (typeof data !== 'object' || data === null) {
        return false;
    }

    if (!('total' in data) || typeof (data as { total: unknown }).total !== 'number') {
        return false;
    }

    if (!('processesCompleted' in data) || typeof (data as { processesCompleted: unknown }).processesCompleted !== 'object' || (data as { processesCompleted: unknown }).processesCompleted === null) {
        return false;
    }

    return true;
}

// Define una interfaz o tipo para los valores que pueden ser actualizados en Firestore.
type FirestoreUpdateValue = number | string | boolean | null | Date | ProductVariantSizeDetail | FieldValue | Record<string, unknown> | Array<unknown>;


const OperarioPanel: React.FC = () => {
    const { userId, userName, userRole, companyId } = useOutletContext<OutletContextType>();

    const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
    const [openVariants, setOpenVariants] = useState<ProductVariant[]>([]);

    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
    const [selectedProcess, setSelectedProcess] = useState<string>('');
    const [selectedProcessValue, setSelectedProcessValue] = useState<number>(0);
    const [selectedSize, setSelectedSize] = useState<string>('');
    const [quantityCompleted, setQuantityCompleted] = useState<number>(0);
    const [maxQuantityForSize, setMaxQuantityForSize] = useState<number>(0);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false); // <-- NUEVO ESTADO PARA EL MODAL

    useEffect(() => {
        if (errorMessage || successMessage) {
            const timer = setTimeout(() => {
                setErrorMessage(null);
                setSuccessMessage(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [errorMessage, successMessage]);

    const fetchOpenBatches = useCallback(async () => {
        if (!companyId) {
            setErrorMessage("ID de empresa no disponible. No se pueden cargar los lotes.");
            setLoading(false);
            return;
        }

        setLoading(true);
        setErrorMessage(null);
        try {
            const productsRef = collection(db, 'companies', companyId, 'products');
            const productsSnapshot = await getDocs(productsRef);
            const fetchedProducts: Product[] = [];
            const fetchedVariants: ProductVariant[] = [];

            console.log("FETCHING BATCHES: Iniciando carga de lotes...");

            for (const productDoc of productsSnapshot.docs) {
                const product = { ...productDoc.data() as Product, id: productDoc.id };
                fetchedProducts.push(product);

                const variantsRef = collection(db, 'companies', companyId, 'products', product.id!, 'variants');
                const variantsSnapshot = await getDocs(variantsRef);
                variantsSnapshot.docs.forEach(variantDoc => {
                    const variantData = variantDoc.data();
                    const parsedSizes: ProductVariant['sizes'] = {};

                    if (variantData.sizes && typeof variantData.sizes === 'object') {
                        Object.entries(variantData.sizes).forEach(([sizeKey, sizeValueFromDoc]: [string, unknown]) => {
                            if (sizeValueFromDoc !== null && sizeValueFromDoc !== undefined) {
                                if (typeof sizeValueFromDoc === 'number') {
                                    parsedSizes[sizeKey] = {
                                        total: sizeValueFromDoc,
                                        processesCompleted: {}
                                    };
                                } else if (isProductVariantSizeDetail(sizeValueFromDoc)) {
                                    parsedSizes[sizeKey] = {
                                        total: sizeValueFromDoc.total,
                                        processesCompleted: sizeValueFromDoc.processesCompleted || {}
                                    };
                                }
                            }
                        });
                    }

                    const newVariant: ProductVariant = {
                        ...variantData as Omit<ProductVariant, 'id' | 'sizes'>,
                        id: variantDoc.id,
                        sizes: parsedSizes,
                        stockInProduction: variantData.stockInProduction || 0,
                        startDate: variantData.startDate || Timestamp.now(),
                        createdAt: variantData.createdAt || Timestamp.now(),
                        dueDate: variantData.dueDate || undefined,
                        productId: product.id!,
                    };
                    fetchedVariants.push(newVariant);
                    console.log(`FETCHING BATCHES: Variante cargada: ${newVariant.id} (Color: ${newVariant.color}), Tallas Procesadas: `, newVariant.sizes);
                });
            }
            setAvailableProducts(fetchedProducts);
            setOpenVariants(fetchedVariants);
            console.log("FETCHING BATCHES: Lotes cargados y estado actualizados.", fetchedVariants);
        } catch (err: unknown) {
            console.error("Error al cargar lotes abiertos:", err);
            setErrorMessage("Error al cargar lotes abiertos. Intenta de nuevo.");
        } finally {
            setLoading(false);
        }
    }, [companyId]);

    // Nuevo useEffect para sincronizar selectedVariant con openVariants actualizados y recalcular maxQuantityForSize
    useEffect(() => {
        if (selectedVariant && openVariants.length > 0) {
            const updatedSelectedVariant = openVariants.find(v => v.id === selectedVariant.id);
            if (updatedSelectedVariant && updatedSelectedVariant !== selectedVariant) {
                // Solo actualiza si la referencia del objeto ha cambiado
                setSelectedVariant(updatedSelectedVariant);
                console.log("SYNC: selectedVariant actualizado con la última versión del estado.");
            }
            // Forzar un nuevo cálculo de maxQuantityForSize si la variante actual fue seleccionada
            // o si alguna de sus dependencias (proceso, talla) ha cambiado.
            if ((updatedSelectedVariant || selectedVariant) && selectedProcess && selectedSize) {
                // Usar la versión más reciente (updatedSelectedVariant si existe, o el original selectedVariant)
                const variantToUse = updatedSelectedVariant || selectedVariant;

                const sizeData = variantToUse.sizes[selectedSize];
                if (sizeData) {
                    const totalForSelectedSize = sizeData.total;
                    const completedForSelectedProcess = sizeData.processesCompleted[selectedProcess] || 0;
                    const available = totalForSelectedSize - completedForSelectedProcess;
                    setMaxQuantityForSize(Math.max(0, available));
                    console.log("SYNC: Recalculado maxQuantityForSize tras actualización de selectedVariant o sus dependencias.");
                }
            }
        }
    }, [openVariants, selectedVariant, selectedProcess, selectedSize]); // Dependencias añadidas

    useEffect(() => {
        if (userRole === 'operario') {
            fetchOpenBatches();
        } else if (userRole !== null && userRole !== 'operario') {
            setLoading(false);
            setErrorMessage("No tienes permisos para acceder a este panel.");
        }
    }, [fetchOpenBatches, userRole]);

    const handleVariantSelect = (variant: ProductVariant) => {
        setSelectedVariant(variant);
        setSelectedProcess('');
        setSelectedProcessValue(0);
        setSelectedSize('');
        setQuantityCompleted(0);
        setMaxQuantityForSize(0);
        setErrorMessage(null);
        setSuccessMessage(null);
        setIsModalOpen(true); // <-- ABRIR EL MODAL AL SELECCIONAR UNA VARIANTE
        console.log("VARIANT SELECTED: Variante seleccionada:", variant);
    };

    const handleProcessAndSizeSelection = (e: ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        // Si no hay selectedVariant, o si los openVariants no tienen la variante seleccionada (aún no se ha refrescado)
        if (!selectedVariant || !openVariants.some(v => v.id === selectedVariant.id)) {
            console.warn("SELECTION: No hay variante seleccionada o no se encuentra en el estado actualizado. Abortando cálculo.");
            setMaxQuantityForSize(0);
            return;
        }

        // Aseguramos que estamos trabajando con la versión más reciente de la variante
        const currentVariantInState = openVariants.find(v => v.id === selectedVariant.id);
        if (!currentVariantInState) {
             console.error("SELECTION: La variante seleccionada no se encontró en el estado de lotes abiertos.");
             setMaxQuantityForSize(0);
             return;
        }

        const product = availableProducts.find(p => p.id === currentVariantInState.productId); // Usar currentVariantInState
        if (!product) {
            setErrorMessage("Error: Producto asociado al lote no encontrado.");
            setMaxQuantityForSize(0); // También resetear la cantidad
            return;
        }

        let newSelectedProcess = selectedProcess;
        let newSelectedSize = selectedSize;

        if (name === 'process') {
            newSelectedProcess = value;
            setSelectedProcess(value);
            const process = product.processes.find(p => p.name === value);
            setSelectedProcessValue(process ? process.value : 0);
            setQuantityCompleted(0);
            console.log("SELECTION: Proceso seleccionado:", newSelectedProcess);
        } else if (name === 'size') {
            newSelectedSize = value;
            setSelectedSize(value);
            setQuantityCompleted(0);
            console.log("SELECTION: Talla seleccionada:", newSelectedSize);
        }

        // --- CLAVE: Aquí es donde se recalcula el maxQuantityForSize ---
        if (currentVariantInState && newSelectedSize && newSelectedProcess) {
            const sizeData = currentVariantInState.sizes[newSelectedSize]; // Usamos 'currentVariantInState' aquí
            if (sizeData) {
                const totalForSelectedSize = sizeData.total;
                const completedForSelectedProcess = sizeData.processesCompleted[newSelectedProcess] || 0;
                const available = totalForSelectedSize - completedForSelectedProcess;
                setMaxQuantityForSize(Math.max(0, available));
                console.log(`SELECTION: Recalculado maxQuantityForSize para ${newSelectedProcess} en ${newSelectedSize}: Total=${totalForSelectedSize}, Completado=${completedForSelectedProcess}, Disponible=${Math.max(0, available)}`);
            } else {
                setMaxQuantityForSize(0);
                console.log("SELECTION: sizeData no encontrado, maxQuantityForSize = 0.");
            }
        } else {
            setMaxQuantityForSize(0);
            console.log("SELECTION: Faltan datos para recalcular maxQuantityForSize, establecido a 0.");
        }
    };


    const handleSubmitWork = async (e: FormEvent) => {
        e.preventDefault();
        setErrorMessage(null);
        setSuccessMessage(null);
        setIsSubmitting(true);

        console.log("SUBMIT: Intentando registrar trabajo...");

        if (!userId || !userName || !companyId) {
            setErrorMessage("Información de usuario o empresa no disponible. Por favor, recarga la página o contacta al soporte.");
            setIsSubmitting(false);
            return;
        }

        if (!selectedVariant || !selectedProcess || !selectedSize || quantityCompleted <= 0) {
            setErrorMessage("Por favor, selecciona un lote, un proceso, una talla y una cantidad válida (mayor que 0).");
            setIsSubmitting(false);
            return;
        }

        // Importante: obtener la variante más reciente del estado 'openVariants'
        const currentVariantInStateForValidation = openVariants.find(v => v.id === selectedVariant.id);
        if (!currentVariantInStateForValidation) {
            setErrorMessage("Error: La variante seleccionada no se encontró en la lista de lotes abiertos actuales.");
            setIsSubmitting(false);
            return;
        }

        // Validación adicional del `maxQuantityForSize` usando la variante del estado actual
        const currentMaxQuantityForValidation = currentVariantInStateForValidation.sizes[selectedSize]?.total - (currentVariantInStateForValidation.sizes[selectedSize]?.processesCompleted[selectedProcess] || 0) || 0;

        if (quantityCompleted > currentMaxQuantityForValidation) {
            setErrorMessage(`La cantidad ingresada (${quantityCompleted}) excede la cantidad disponible para el proceso "${selectedProcess}" en la talla ${selectedSize.toUpperCase()} (${currentMaxQuantityForValidation}).`);
            setIsSubmitting(false);
            return;
        }


        const parentProduct = availableProducts.find(p => p.id === selectedVariant.productId);
        if (!parentProduct) {
            setErrorMessage("No se pudo encontrar el producto asociado al lote. Por favor, recarga la página.");
            setIsSubmitting(false);
            return;
        }

        try {
            console.log("SUBMIT: Datos a registrar en workRecords:", {
                operarioId: userId,
                operarioName: userName,
                productId: parentProduct.id,
                productName: parentProduct.name,
                productRef: parentProduct.ref,
                variantId: selectedVariant.id,
                variantColor: selectedVariant.color,
                processName: selectedProcess,
                processValue: selectedProcessValue,
                size: selectedSize,
                quantity: quantityCompleted,
                companyId: companyId,
            });

            const workRecord: OperarioWorkRecord = {
                operarioId: userId,
                operarioName: userName,
                productId: parentProduct.id!,
                productName: parentProduct.name,
                productRef: parentProduct.ref,
                variantId: selectedVariant.id!,
                variantColor: selectedVariant.color,
                processName: selectedProcess,
                processValue: selectedProcessValue,
                size: selectedSize,
                quantity: quantityCompleted,
                timestamp: Timestamp.now(),
                companyId: companyId,
            };

            await addDoc(collection(db, 'companies', companyId, 'workRecords'), workRecord);
            console.log("SUBMIT: Trabajo registrado en workRecords.");

            const variantRef = doc(db, 'companies', companyId, 'products', parentProduct.id!, 'variants', selectedVariant.id!);

            // Obtener los datos actuales de la variante de Firestore justo antes de actualizar
            const currentVariantDoc = await getDoc(variantRef);
            if (!currentVariantDoc.exists()) {
                throw new Error("La variante no existe o fue eliminada.");
            }
            const currentVariantData = currentVariantDoc.data() as ProductVariant; // Aserción de tipo

            // --- INICIO DE LA CORRECCIÓN CLAVE PARA EL TypeError: Cannot create property ---
            const updatesToFirestore: Record<string, FirestoreUpdateValue> = {}; // <-- CAMBIO AQUÍ

            // 1. Asegurarse de que `sizes` existe en la variante (aunque esto no debería ser el problema aquí)
            if (!currentVariantData.sizes) {
                console.warn("SUBMIT: 'sizes' no existe en el documento de variante, inicializando como objeto vacío en memoria.");
                currentVariantData.sizes = {};
                updatesToFirestore[`sizes`] = {}; // Preparar para actualizar Firestore
            }

            // 2. Comprobar si la talla específica es un NÚMERO (estructura antigua)
            //    Si es un número, migrarla a la nueva estructura en MEMORIA y preparar actualización a Firestore.
            if (typeof currentVariantData.sizes[selectedSize] === 'number') {
                const oldTotal = currentVariantData.sizes[selectedSize] as number;
                console.warn(`SUBMIT: La talla '${selectedSize}' es un número (${oldTotal}), migrando a la nueva estructura.`);
                currentVariantData.sizes[selectedSize] = {
                    total: oldTotal,
                    processesCompleted: {} // Inicializar processesCompleted
                };
                // Asegúrate de que el objeto que se asigna sea compatible con FirestoreUpdateValue
                updatesToFirestore[`sizes.${selectedSize}`] = currentVariantData.sizes[selectedSize] as ProductVariantSizeDetail;
            }

            // 3. Asegurarse de que `processesCompleted` existe como un objeto para la talla seleccionada
            //    (Esto se ejecuta DESPUÉS de la posible migración de la talla)
            //    Si no existe o no es un objeto válido, inicializarlo.
            if (!currentVariantData.sizes[selectedSize].processesCompleted || typeof currentVariantData.sizes[selectedSize].processesCompleted !== 'object') {
                console.warn(`SUBMIT: 'processesCompleted' para la talla '${selectedSize}' no existe o no es un objeto válido, inicializando como objeto vacío.`);
                currentVariantData.sizes[selectedSize].processesCompleted = {};
                // Si la talla ya era un objeto pero le faltaba processesCompleted, también lo actualizamos en Firestore
                // No es necesario añadirlo a updatesToFirestore si ya lo hicimos en el paso 2,
                // ya que el update del paso 2 ya incluye toda la subestructura.
                // Si no fue migrada en paso 2, entonces actualizamos solo esta subpropiedad.
                if(!updatesToFirestore[`sizes.${selectedSize}`]) { // Evitar sobrescribir si ya se actualizó en el paso 2
                    updatesToFirestore[`sizes.${selectedSize}.processesCompleted`] = {}; // Asignamos un objeto vacío
                }
            }
            // --- FIN DE LA CORRECCIÓN CLAVE ---


            // Ahora que estamos seguros de que la estructura existe, podemos calcular.
            const currentCompletedQty = currentVariantData.sizes[selectedSize].processesCompleted[selectedProcess] || 0;
            const newCompletedQty = currentCompletedQty + quantityCompleted;

            const updatePath = `sizes.${selectedSize}.processesCompleted.${selectedProcess}`;

            console.log("SUBMIT: Actualizando cantidad completada en variante:", {
                variantId: selectedVariant.id,
                size: selectedSize,
                process: selectedProcess,
                oldCompletedQty: currentCompletedQty,
                newCompletedQty: newCompletedQty,
                updatePath: updatePath
            });

            // Agrega la actualización del proceso específico a las actualizaciones de Firestore
            updatesToFirestore[updatePath] = newCompletedQty;

            // Realiza la actualización en Firestore con todas las propiedades a modificar
            await updateDoc(variantRef, updatesToFirestore);
            console.log("SUBMIT: Cantidad completada para proceso y talla y/o estructura de datos actualizada en Firestore.");


            setSuccessMessage("Trabajo registrado y stock de proceso actualizado exitosamente.");
            await fetchOpenBatches(); // Refrescar los lotes para mostrar las cantidades actualizadas
            console.log("SUBMIT: Lotes refrescados.");

            // Limpiar formulario después de guardar y CERRAR EL MODAL
            setSelectedVariant(null);
            setSelectedProcess('');
            setSelectedProcessValue(0);
            setSelectedSize('');
            setQuantityCompleted(0);
            setMaxQuantityForSize(0);
            setIsModalOpen(false); // <-- CERRAR EL MODAL
            console.log("SUBMIT: Formulario limpiado y modal cerrado.");

        } catch (err: unknown) {
            console.error("SUBMIT: Error detallado al registrar trabajo:", err);
            let msg = "Error al registrar el trabajo. Por favor, intenta de nuevo.";
            if (err instanceof Error) {
                msg += ` Detalles: ${err.message}`;
            }
            setErrorMessage(msg);
        } finally {
            setIsSubmitting(false);
            console.log("SUBMIT: Proceso de envío finalizado.");
        }
    };

    if (loading) {
        return <p className="loading-message">Cargando panel de operario...</p>;
    }

    if (userRole !== 'operario') {
        return (
            <div className="operario-panel-container">
                <h2 className="access-denied-title">Acceso Denegado</h2>
                <p className="no-permissions-message">No tienes los permisos necesarios para acceder a este panel.</p>
            </div>
        );
    }

    const formatSizes = (sizes: ProductVariant['sizes']) => {
        return Object.entries(sizes)
            .filter(([, sizeData]) => sizeData.total > 0)
            .map(([sizeKey, sizeData]) => {
                const totalStr = `Total: ${sizeData.total}`;
                // Filtrar procesos con cantidad > 0 para mostrar solo los relevantes
                const processesStr = Object.entries(sizeData.processesCompleted)
                    .filter(([, qty]) => qty > 0)
                    .map(([processName, qty]) => `${processName}: ${qty}`)
                    .join(', ');
                return `${sizeKey.toUpperCase()} (${totalStr}${processesStr ? `; ${processesStr}` : ''})`;
            })
            .join(' | ');
    };

    const isSubmitButtonDisabled =
        isSubmitting ||
        !selectedVariant ||
        !selectedProcess ||
        !selectedSize ||
        quantityCompleted <= 0 ||
        quantityCompleted > maxQuantityForSize ||
        maxQuantityForSize <= 0;

    return (
        <div className="operario-panel-container">
            <h2>Panel del Operario</h2>
            {errorMessage && <p className="error-message">{errorMessage}</p>}
            {successMessage && <p className="success-message">{successMessage}</p>}

            <div className="batches-overview">
                <h3>Lotes de Producción Abiertos</h3>
                {openVariants.length === 0 ? (
                    <p className="no-batches-message">No hay lotes de producción abiertos en este momento.</p>
                ) : (
                    <div className="batch-cards-container">
                        {openVariants.map(variant => {
                            const product = availableProducts.find(p => p.id === variant.productId);
                            if (variant.stockInProduction <= 0) return null;

                            return (
                                <div
                                    key={variant.id}
                                    className={`batch-card ${selectedVariant?.id === variant.id ? 'selected' : ''}`}
                                    onClick={() => handleVariantSelect(variant)}
                                >
                                    <h4>{product?.name || 'Producto Desconocido'} - Color: {variant.color}</h4>
                                    <p>Referencia: {product?.ref || 'N/A'}</p>
                                    {/* Mostrar el total original de la variante */}
                                    <p>Stock Total General (inicial): **{variant.stockInProduction}** unidades</p>
                                    <p>Iniciado: {variant.startDate?.toDate().toLocaleDateString()}</p>
                                    {variant.dueDate && <p>Fecha Límite: {variant.dueDate.toDate().toLocaleDateString()}</p>}
                                    <div className="sizes-stock">
                                        {formatSizes(variant.sizes) ? (
                                            formatSizes(variant.sizes).split(' | ').map((sizeInfo, index) => (
                                                <span key={index} className="size-pill">{sizeInfo}</span>
                                            ))
                                        ) : (
                                            <span className="size-pill">Sin tallas definidas</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* El formulario ahora está dentro del componente Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedVariant(null); // Limpiar la variante seleccionada al cerrar el modal
                    // También puedes resetear otros estados del formulario aquí si quieres.
                    setSelectedProcess('');
                    setSelectedProcessValue(0);
                    setSelectedSize('');
                    setQuantityCompleted(0);
                    setMaxQuantityForSize(0);
                }}
                title="Registrar Trabajo para Lote Seleccionado"
            >
                {selectedVariant && ( // Asegurarse de que selectedVariant no es null antes de renderizar el contenido
                    <>
                        {/* Obtener el producto asociado para mostrar su referencia */}
                        {(() => {
                            const product = availableProducts.find(p => p.id === selectedVariant.productId);
                            return (
                                <p className="selected-item-info">
                                    Prenda: **{product?.name || 'Desconocido'}** (Ref: {product?.ref || 'N/A'}) (Color: {selectedVariant.color})
                                </p>
                            );
                        })()}

                        <form onSubmit={handleSubmitWork}>
                            <div className="form-group">
                                <label htmlFor="processSelect">Proceso Realizado:</label>
                                <select
                                    id="processSelect"
                                    name="process"
                                    value={selectedProcess}
                                    onChange={handleProcessAndSizeSelection}
                                    required
                                    disabled={!selectedVariant}
                                >
                                    <option value="">Selecciona un proceso</option>
                                    {availableProducts.find(p => p.id === selectedVariant.productId)?.processes.map((process) => (
                                        <option key={process.name} value={process.name}>
                                            {process.name} (${process.value.toFixed(2)}/unidad)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="sizeSelect">Talla:</label>
                                <select
                                    id="sizeSelect"
                                    name="size"
                                    value={selectedSize}
                                    onChange={handleProcessAndSizeSelection}
                                    required
                                    disabled={!selectedVariant || !selectedProcess}
                                >
                                    <option value="">Selecciona una talla</option>
                                    {Object.entries(selectedVariant.sizes)
                                        .filter(([, sizeData]) => sizeData.total > 0)
                                        .map(([sizeKey, sizeData]) => {
                                            // Usamos el selectedProcess aquí para calcular el 'disponible' para esta talla/proceso
                                            const completedForProcess = sizeData.processesCompleted[selectedProcess] || 0;
                                            const available = sizeData.total - completedForProcess;
                                            return (
                                                <option key={sizeKey} value={sizeKey}>
                                                    {sizeKey.toUpperCase()} (Disponible para este proceso: {Math.max(0, available)})
                                                </option>
                                            );
                                        })}
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="quantityCompleted">Cantidad Realizada:</label>
                                <input
                                    type="number"
                                    id="quantityCompleted"
                                    value={quantityCompleted === 0 ? '' : quantityCompleted}
                                    onChange={(e) => {
                                        const qty = parseInt(e.target.value);
                                        setQuantityCompleted(isNaN(qty) || qty < 0 ? 0 : qty);
                                    }}
                                    min="1"
                                    max={maxQuantityForSize > 0 ? maxQuantityForSize : undefined}
                                    required
                                    disabled={!selectedSize || maxQuantityForSize <= 0}
                                />
                                {selectedSize && (
                                    <p className="quantity-info">
                                        Máximo disponible para {selectedProcess} en {selectedSize.toUpperCase()}: **{maxQuantityForSize}** unidades
                                    </p>
                                )}
                                {selectedSize && maxQuantityForSize === 0 && (
                                    <p className="quantity-info error">
                                        No hay unidades disponibles para el proceso {selectedProcess} en la talla {selectedSize.toUpperCase()}.
                                    </p>
                                )}
                            </div>

                            <button
                                translate='no'
                                type="submit"
                                className="button primary"
                                disabled={isSubmitButtonDisabled}
                            >
                                {isSubmitting ? 'Registrando...' : 'Registrar Trabajo'}
                            </button>
                        </form>
                    </>
                )}
            </Modal>
        </div>
    );
};

export default OperarioPanel;