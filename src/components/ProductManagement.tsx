import React, { useState, useEffect, useCallback, } from 'react';
import { db } from '../firebaseConfig';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, Timestamp, query, where, } from 'firebase/firestore';
import { useOutletContext } from 'react-router-dom';
import './ProductManagement.css';
import './Modal.css'; // Asegúrate de que este CSS esté disponible para los modales.

import ProcessFormModal from './ProcessFormModal';
import VariantFormModal from './VariantFormModal';
import ProductFormModal from './ProductFormModal';

import { FaEdit, FaTrash, FaPlus, FaSearch } from 'react-icons/fa';

// --- Interfaces de Datos (Mantenerlas consistentemente o importar desde un archivo compartido) ---
interface Process {
    name: string;
    value: number;
}

// Interfaz para los datos que el formulario maneja y envía (debe coincidir con ProductFormData del modal)
interface ProductFormData {
    name: string;
    ref: string;
    productionCost: number;
}

// Interfaz completa de Producto (debe coincidir con Product del modal)
export interface Product {
    id?: string;
    name: string;
    ref: string;
    productionCost: number;
    processes: Process[];
    createdAt: Timestamp;
}

interface ProductVariant {
    id?: string;
    color: string;
    stockInProduction: number;
    startDate: Timestamp; // Añadida la propiedad 'startDate' para resolver el error de tipo
    createdAt: Timestamp;
}

interface ProductVariantFormData {
    color: string;
    stockInProduction: number;
}


interface OutletContextType {
    userRole: string | null;
    companyId: string | null;
}

const ProductManagement: React.FC = () => {
    const { userRole, companyId } = useOutletContext<OutletContextType>();

    const [products, setProducts] = useState<Product[]>([]);
    const [productVariants, setProductVariants] = useState<{ [productId: string]: ProductVariant[] }>({});
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null); // Renombrado a errorMessage para mayor claridad

    // ESTADO PARA EL MODAL PRINCIPAL DE PRODUCTO
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);

    // NUEVO ESTADO PARA EL FILTRO DE BÚSQUEDA
    const [searchTerm, setSearchTerm] = useState<string>('');

    // ESTADOS PARA LOS MODALES SECUNDARIOS
    const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
    const [selectedProductForProcesses, setSelectedProductForProcesses] = useState<Product | null>(null);
    const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
    const [selectedProductForVariants, setSelectedProductForVariants] = useState<Product | null>(null);

    const getProductsAndVariants = useCallback(async () => {
        if (!companyId) {
            setErrorMessage("No se pudo obtener la ID de la empresa. Acceso denegado.");
            setLoading(false);
            return;
        }

        setLoading(true);
        setErrorMessage(null); // Limpiar errores al iniciar la carga
        try {
            const productsRef = collection(db, 'companies', companyId, 'products');
            const data = await getDocs(productsRef);
            const fetchedProducts: Product[] = [];
            const fetchedVariants: { [productId: string]: ProductVariant[] } = {};

            for (const productDoc of data.docs) {
                const product = productDoc.data() as Omit<Product, 'id'>;
                fetchedProducts.push({ ...product, id: productDoc.id });

                const variantsRef = collection(db, 'companies', companyId, 'products', productDoc.id, 'variants');
                const variantsData = await getDocs(variantsRef);
                fetchedVariants[productDoc.id] = variantsData.docs.map(variantDoc => ({
                    ...(variantDoc.data() as Omit<ProductVariant, 'id'>),
                    id: variantDoc.id,
                    createdAt: variantDoc.data().createdAt, // Asegúrate de que createdAt se está obteniendo correctamente
                    startDate: variantDoc.data().startDate // Asegúrate de obtener startDate también
                }));
            }
            setProducts(fetchedProducts);
            setProductVariants(fetchedVariants);
        } catch (err: unknown) {
            if (err instanceof Error) {
                console.error("Error al obtener productos y variantes:", err.message);
                setErrorMessage("No se pudieron cargar los productos. " + err.message);
            } else {
                console.error("Error al obtener productos y variantes:", err);
                setErrorMessage("No se pudo cargar los productos. Error desconocido.");
            }
        } finally {
            setLoading(false);
        }
    }, [companyId]); // Dependencia actualizada para useCallback

    useEffect(() => {
        if (userRole === 'admin') {
            getProductsAndVariants();
        } else if (userRole !== null && userRole !== 'admin') {
            setLoading(false);
            setProducts([]);
            setErrorMessage("No tienes permisos para ver y gestionar productos.");
        }
    }, [getProductsAndVariants, userRole]); // Dependencias para useEffect

    // NUEVO useEffect para actualizar selectedProductForProcesses/Variants
    useEffect(() => {
        // Si el modal de procesos está abierto y hay un producto seleccionado
        if (isProcessModalOpen && selectedProductForProcesses) {
            // Busca la versión más reciente de ese producto en el array 'products'
            const updatedProduct = products.find(p => p.id === selectedProductForProcesses.id);
            if (updatedProduct) {
                // Actualiza el estado con la versión más reciente
                setSelectedProductForProcesses(updatedProduct);
            }
        }
        // Si el modal de variantes está abierto y hay un producto seleccionado
        if (isVariantModalOpen && selectedProductForVariants) {
            const updatedProduct = products.find(p => p.id === selectedProductForVariants.id);
            if (updatedProduct) {
                setSelectedProductForVariants(updatedProduct);
            }
        }
    }, [products, isProcessModalOpen, selectedProductForProcesses, isVariantModalOpen, selectedProductForVariants]);


    // --- Manejo del formulario principal de producto (Añadir/Editar Prenda) ---
    const handleSaveProduct = async (productData: ProductFormData, productId?: string) => {
        setErrorMessage(null); // Limpiar errores previos al intentar guardar
        if (!companyId) {
            // Esto debería ser un error que detenga la operación, no solo un console.error
            throw new Error("No se pudo obtener la ID de la empresa. Error al guardar el producto.");
        }

        try {
            if (productId) {
                // Modo edición
                const productDocRef = doc(db, 'companies', companyId, 'products', productId);
                await updateDoc(productDocRef, {
                    name: productData.name,
                    // La referencia no cambia en edición en el modal, pero la actualizamos por consistencia
                    ref: productData.ref,
                    productionCost: productData.productionCost,
                });
            } else {
                // Modo añadir
                const q = query(collection(db, 'companies', companyId, 'products'), where('ref', '==', productData.ref));
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    // Si la referencia ya existe, lanzar un error específico
                    throw new Error(`Ya existe una prenda con la referencia '${productData.ref}' en esta empresa.`);
                }

                await addDoc(collection(db, 'companies', companyId, 'products'), {
                    ...productData,
                    processes: [], // Los nuevos productos empiezan sin procesos
                    createdAt: Timestamp.now(),
                });
            }
            await getProductsAndVariants(); // Refrescar la lista de productos
            // Solo cerrar el modal si el guardado fue exitoso
            setIsProductModalOpen(false);
            setEditingProduct(null);
        } catch (err: unknown) {
            if (err instanceof Error) {
                console.error("Error al guardar producto:", err.message);
                setErrorMessage(err.message); // Establecer el mensaje de error en el estado del padre
            } else {
                console.error("Error al guardar producto:", err);
                setErrorMessage("Error al guardar producto: Error desconocido.");
            }
            // Importante: No re-lanzar el error para que el ProductFormModal no cierre el modal,
            // sino que muestre el error pasado por props.
            // Si el modal necesita saber que hubo un error para no cerrarse,
            // la `onSave` prop no debe resolver su promesa si hay un error.
            // En React, la forma estándar es que el componente padre gestione los errores y se los pase a los hijos.
            throw err; // Vuelves a lanzar para que el modal sepa que no debe cerrarse
        }
    };

    const startEditingProduct = (product: Product) => {
        setEditingProduct(product);
        openProductModal(); // Abre el modal en modo edición
        // Asegurarse de que los otros modales estén cerrados
        setIsProcessModalOpen(false);
        setIsVariantModalOpen(false);
    };

    const deleteProduct = async (productId: string) => {
        setErrorMessage(null); // Limpiar errores antes de la operación
        if (!companyId) {
            setErrorMessage("No se pudo obtener la ID de la empresa. Error al eliminar el producto.");
            return;
        }
        if (!window.confirm("¿Estás seguro de que quieres eliminar esta prenda y todas sus variantes de stock? Esta acción es irreversible.")) {
            return;
        }
        try {
            const productDocRef = doc(db, 'companies', companyId, 'products', productId);
            const variantsToDeleteRef = collection(db, 'companies', companyId, 'products', productId, 'variants');
            const variantsSnapshot = await getDocs(variantsToDeleteRef);
            const deleteVariantPromises = variantsSnapshot.docs.map(vDoc => deleteDoc(vDoc.ref));
            await Promise.all(deleteVariantPromises);

            await deleteDoc(productDocRef);

            await getProductsAndVariants();
        } catch (err: unknown) {
            if (err instanceof Error) {
                console.error("Error al eliminar producto:", err.message);
                setErrorMessage("No se pudo eliminar el producto. " + err.message);
            } else {
                console.error("Error al eliminar producto:", err);
                setErrorMessage("No se pudo eliminar el producto. Error desconocido.");
            }
        }
    };

    // --- Funciones para manejar Procesos del Producto (ahora usadas por ProcessFormModal) ---
    const handleSaveProcess = useCallback(async (
        productId: string,
        indexToUpdate: number | null,
        process: Process,
        currentProcesses: Process[],
        productionCost: number
    ) => {
        setErrorMessage(null);
        if (!companyId) throw new Error("ID de empresa no disponible.");

        let updatedProcessesArray: Process[];
        if (indexToUpdate !== null) {
            updatedProcessesArray = currentProcesses.map((p, idx) =>
                idx === indexToUpdate ? process : p
            );
        } else {
            updatedProcessesArray = [...currentProcesses, process];
        }

        const totalProcessValue = updatedProcessesArray.reduce((sum, p) => sum + p.value, 0);

        if (totalProcessValue > productionCost) {
            throw new Error(`La suma de los valores de los procesos (${totalProcessValue.toFixed(2)}) excede el costo de producción de la prenda (${productionCost.toFixed(2)}).`);
        }

        try {
            const productDocRef = doc(db, 'companies', companyId, 'products', productId);
            await updateDoc(productDocRef, { processes: updatedProcessesArray });
            await getProductsAndVariants(); // Refrescar los datos
        } catch (err: unknown) {
            if (err instanceof Error) {
                console.error("Error al guardar proceso:", err.message);
                setErrorMessage("No se pudo guardar el proceso. " + err.message); // Establecer error en ProductManagement
                throw new Error("No se pudo guardar el proceso. " + err.message); // Re-lanzar para el modal
            } else {
                console.error("Error al guardar proceso:", err);
                setErrorMessage("No se pudo guardar el proceso. Error desconocido."); // Establecer error en ProductManagement
                throw new Error("No se pudo guardar el proceso. Error desconocido."); // Re-lanzar para el modal
            }
        }
    }, [companyId, getProductsAndVariants]);


    const handleDeleteProcess = useCallback(async (
        productId: string,
        indexToRemove: number,
        currentProcesses: Process[]
    ) => {
        setErrorMessage(null);
        if (!companyId) throw new Error("ID de empresa no disponible.");
        if (!window.confirm("¿Estás seguro de que quieres eliminar este proceso?")) {
            return;
        }
        try {
            const updatedProcessesArray = currentProcesses.filter((_, index) => index !== indexToRemove);
            const productDocRef = doc(db, 'companies', companyId, 'products', productId);
            await updateDoc(productDocRef, { processes: updatedProcessesArray });
            await getProductsAndVariants(); // Refrescar los datos
        } catch (err: unknown) {
            if (err instanceof Error) {
                console.error("Error al eliminar proceso:", err.message);
                setErrorMessage("No se pudo eliminar el proceso. " + err.message); // Establecer error en ProductManagement
                throw new Error("No se pudo eliminar el proceso. " + err.message); // Re-lanzar para el modal
            } else {
                console.error("Error al eliminar proceso:", err);
                setErrorMessage("No se pudo eliminar el proceso. Error desconocido."); // Establecer error en ProductManagement
                throw new Error("No se pudo eliminar el proceso. Error desconocido."); // Re-lanzar para el modal
            }
        }
    }, [companyId, getProductsAndVariants]);

    // --- Funciones para manejar Variantes del Producto (ahora usadas por VariantFormModal) ---
    const handleSaveVariant = useCallback(async (
        productId: string,
        variantData: ProductVariantFormData,
        variantIdToUpdate: string | undefined
    ) => {
        setErrorMessage(null);
        if (!companyId) throw new Error("ID de empresa no disponible.");

        try {
            if (variantIdToUpdate) {
                const variantDocRef = doc(db, 'companies', companyId, 'products', productId, 'variants', variantIdToUpdate);
                await updateDoc(variantDocRef, { ...variantData });
            } else {
                await addDoc(collection(db, 'companies', companyId, 'products', productId, 'variants'), {
                    ...variantData,
                    createdAt: Timestamp.now(),
                    startDate: Timestamp.now(), // Asegúrate de que startDate se añade al crear
                });
            }
            await getProductsAndVariants();
        } catch (err: unknown) {
            if (err instanceof Error) {
                console.error("Error al guardar variante:", err.message);
                setErrorMessage("No se pudo guardar la variante. " + err.message); // Establecer error en ProductManagement
                throw new Error("No se pudo guardar la variante. " + err.message); // Re-lanzar para el modal
            } else {
                console.error("Error al guardar variante:", err);
                setErrorMessage("No se pudo guardar la variante. Error desconocido."); // Establecer error en ProductManagement
                throw new Error("No se pudo guardar la variante. Error desconocido."); // Re-lanzar para el modal
            }
        }
    }, [companyId, getProductsAndVariants]);

    const handleDeleteVariant = useCallback(async (productId: string, variantId: string) => {
        setErrorMessage(null);
        if (!companyId) throw new Error("ID de empresa no disponible.");
        if (!window.confirm("¿Estás seguro de que quieres eliminar esta variante de stock?")) {
            return;
        }
        try {
            const variantDocRef = doc(db, 'companies', companyId, 'products', productId, 'variants', variantId);
            await deleteDoc(variantDocRef);
            await getProductsAndVariants();
        } catch (err: unknown) {
            if (err instanceof Error) {
                console.error("Error al eliminar variante:", err.message);
                setErrorMessage("No se pudo eliminar la variante. " + err.message); // Establecer error en ProductManagement
                throw new Error("No se pudo eliminar la variante. " + err.message); // Re-lanzar para el modal
            } else {
                console.error("Error al eliminar variante:", err);
                setErrorMessage("No se pudo eliminar la variante. Error desconocido."); // Establecer error en ProductManagement
                throw new Error("No se pudo eliminar la variante. Error desconocido."); // Re-lanzar para el modal
            }
        }
    }, [companyId, getProductsAndVariants]);

    // --- Funciones para abrir/cerrar los modales ---
    const openProductModal = () => {
        setIsProductModalOpen(true);
        setErrorMessage(null); // Limpia errores al abrir
    };

    const closeProductModal = () => {
        setIsProductModalOpen(false);
        setEditingProduct(null); // Reiniciar editingProduct al cerrar el modal
        setErrorMessage(null); // Limpiar errores del padre
    };

    const openProcessModal = (product: Product) => {
        setSelectedProductForProcesses(product);
        setIsProcessModalOpen(true);
        setErrorMessage(null); // Limpiar errores del padre
    };

    const closeProcessModal = () => {
        setIsProcessModalOpen(false);
        setSelectedProductForProcesses(null);
        setErrorMessage(null); // Limpiar errores del padre
    };

    const openVariantModal = (product: Product) => {
        setSelectedProductForVariants(product);
        setIsVariantModalOpen(true);
        setErrorMessage(null); // Limpiar errores del padre
    };

    const closeVariantModal = () => {
        setIsVariantModalOpen(false);
        setSelectedProductForVariants(null);
        setErrorMessage(null); // Limpiar errores del padre
    };

    // Función para limpiar el error en el componente padre, pasada al modal
    const clearParentError = useCallback(() => { // Usar useCallback para estabilidad
        setErrorMessage(null);
    }, []);

    // --- LÓGICA DE FILTRADO ---
    const filteredProducts = products.filter(product => {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        return (
            product.name.toLowerCase().includes(lowerCaseSearchTerm) ||
            product.ref.toLowerCase().includes(lowerCaseSearchTerm)
        );
    });

    if (userRole === null && loading) {
        return <p>Cargando permisos...</p>;
    }

    if (userRole !== 'admin') {
        return (
            <div className="product-management-container">
                <h2 style={{ color: '#dc3545', textAlign: 'center' }}>Acceso Denegado</h2>
                <p style={{ textAlign: 'center' }}>No tienes los permisos necesarios para gestionar productos.</p>
            </div>
        );
    }

    return (
        <div className="product-management-container">
            <div className="products-header">
                <h2>Gestión de Productos</h2>
                <button className="add-new-product-button" onClick={() => {
                    setEditingProduct(null); // Asegurarse de que no estamos en modo edición
                    openProductModal(); // Abre el modal para añadir una nueva prenda
                }}>
                    <FaPlus /> <span>Añadir Nueva Prenda</span>
                </button>
            </div>

            {/* El mensaje de error global se mostrará aquí si el modal no está abierto */}
            {errorMessage && !isProductModalOpen && (
                <p className="error-message">{errorMessage}</p>
            )}

            <h3 id='subh3'>Prendas de tu Empresa</h3>

            {/* NUEVO INPUT DE BÚSQUEDA */}
            <div className="search-bar">
                <FaSearch className="search-icon" />
                <input
                    type="text"
                    placeholder="Buscar por nombre o referencia..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                />
            </div>

            {loading ? (
                <p>Cargando prendas...</p>
            ) : products.length === 0 ? (
                <p className="no-products-message">No hay prendas registradas para tu empresa.</p>
            ) : (
                <div className="product-list-container">
                    {/* Si no hay resultados de búsqueda */}
                    {filteredProducts.length === 0 && searchTerm !== '' && (
                        <p className="no-results-message">No se encontraron prendas que coincidan con "{searchTerm}".</p>
                    )}

                    {/* Tabla para escritorio */}
                    <table className="product-table desktop-only">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Referencia</th>
                                <th>Costo Producción</th>
                                <th>Procesos</th>
                                <th>Lotes Abiertos</th>
                                <th>Editar/Eliminar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Usamos filteredProducts en lugar de products directamente */}
                            {filteredProducts.map(product => (
                                <tr className="product-row" key={product.id}>
                                    <td data-label="Nombre" translate='no'>{product.name}</td>
                                    <td data-label="Referencia">{product.ref}</td>
                                    <td data-label="Costo Producción">${product.productionCost.toFixed(2)}</td>
                                    <td className="process-summary-cell" data-label="Procesos">
                                        {product.processes.length > 0 ? (
                                            <>
                                                <ul className="process-list-compact">
                                                    {product.processes.slice(0, 2).map((p, pIndex) => (
                                                        <li key={pIndex}>{p.name}: ${p.value.toFixed(2)}</li>
                                                    ))}
                                                    {product.processes.length > 2 && <li>... ({product.processes.length - 2} más)</li>}
                                                </ul>
                                            </>
                                        ) : (
                                            <span>No hay procesos.</span>
                                        )}
                                        <button onClick={() => openProcessModal(product)} className="toggle-sub-form-button" title="Ver/Editar Procesos">
                                            <FaPlus />
                                        </button>
                                    </td>
                                    <td className="variant-summary-cell" data-label="Asignar Stock">
                                        {productVariants[product.id!]?.length > 0 ? (
                                            <>
                                                <ul className="variant-list-compact">
                                                    {productVariants[product.id!]?.slice(0, 2).map((v, vIndex) => (
                                                        <li key={vIndex}>{v.color}: {v.stockInProduction}</li>
                                                    ))}
                                                    {productVariants[product.id!]!.length > 2 && <li>... ({productVariants[product.id!]!.length - 2} más)</li>}
                                                </ul>
                                            </>
                                        ) : (
                                            <span>No hay Lotes.</span>
                                        )}
                                        <button onClick={() => openVariantModal(product)} className="toggle-sub-form-button" title="Asignar Lote">
                                            <FaPlus />
                                        </button>
                                    </td>
                                    <td className="product-actions-cell" data-label="Acciones">
                                        <button onClick={() => startEditingProduct(product)} className="edit-button icon-button" title="Editar Prenda">
                                            <FaEdit />
                                        </button>
                                        <button onClick={() => deleteProduct(product.id!)} className="button-del icon-button" title="Eliminar Prenda">
                                            <FaTrash />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Diseño de tarjetas para móvil */}
                    <div className="product-cards-container mobile-only">
                        {/* Usamos filteredProducts en lugar de products directamente */}
                        {filteredProducts.map(product => (
                            <div key={product.id} className="product-card">
                                <div className="card-header">
                                    <h4 className="product-name">{product.name}</h4>
                                    <span className="product-ref">Ref: {product.ref}</span>
                                </div>
                                <div className="card-body">
                                    <p className="product-cost">Costo de Producción: **${product.productionCost.toFixed(2)}**</p>

                                    <div className="card-section">
                                        <h5>Procesos ({product.processes.length})</h5>
                                        {product.processes.length > 0 ? (
                                            <ul className="process-list-compact">
                                                {product.processes.map((p, pIndex) => (
                                                    <li key={pIndex}>{p.name}: ${p.value.toFixed(2)}</li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="no-items-message">No hay procesos definidos.</p>
                                        )}
                                        <button onClick={() => openProcessModal(product)} className="full-width-button">
                                            <FaPlus /> Procesos
                                        </button>
                                    </div>

                                    <div className="card-section">
                                        <h5>Cantidad por Color ({productVariants[product.id!]?.length || 0})</h5>
                                        {productVariants[product.id!]?.length > 0 ? (
                                            <ul className="variant-list-compact">
                                                {productVariants[product.id!]?.map((v, vIndex) => (
                                                    <li key={vIndex}>{v.color}: {v.stockInProduction}</li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="no-items-message">No hay lote en producción.</p>
                                        )}
                                        <button onClick={() => openVariantModal(product)} className="full-width-button">
                                            <FaPlus /> Abrir Lote
                                        </button>
                                    </div>
                                </div>
                                <div className="card-actions">
                                    <button onClick={() => startEditingProduct(product)} className="edit-button icon-button" title="Editar Prenda">
                                        <FaEdit />
                                    </button>
                                    <button onClick={() => deleteProduct(product.id!)} className="button-del icon-button" title="Eliminar Prenda">
                                        <FaTrash />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* MODAL DE AÑADIR/EDITAR PRODUCTO */}
            <ProductFormModal
                isOpen={isProductModalOpen}
                onClose={closeProductModal}
                onSave={handleSaveProduct} // Pasamos la nueva función handleSaveProduct
                editingProduct={editingProduct}
                errorMessage={errorMessage} // Pasa el mensaje de error al modal
                clearError={clearParentError} // Pasa la función para limpiar el error del padre
            />

            {/* MODAL DE PROCESOS */}
            {selectedProductForProcesses && (
                <ProcessFormModal
                    isOpen={isProcessModalOpen}
                    onClose={closeProcessModal}
                    productId={selectedProductForProcesses.id!}
                    productName={selectedProductForProcesses.name}
                    currentProcesses={selectedProductForProcesses.processes}
                    productionCost={selectedProductForProcesses.productionCost}
                    onSaveProcess={handleSaveProcess}
                    onDeleteProcess={handleDeleteProcess}
                />
            )}

            {/* MODAL DE VARIANTES */}
            {selectedProductForVariants && (
                <VariantFormModal
                    isOpen={isVariantModalOpen}
                    onClose={closeVariantModal}
                    productId={selectedProductForVariants.id!}
                    productName={selectedProductForVariants.name}
                    currentVariants={productVariants[selectedProductForVariants.id!] || []}
                    onSaveVariant={handleSaveVariant}
                    onDeleteVariant={handleDeleteVariant}
                />
            )}
        </div>
    );
};

export default ProductManagement;