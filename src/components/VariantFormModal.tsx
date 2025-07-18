import React, { useState, useEffect, type ChangeEvent, type FormEvent } from 'react';
import './Modal.css'; // ¡Importando tu Modal.css original ahora!
import { FaEdit, FaTrash } from 'react-icons/fa';
import { Timestamp } from 'firebase/firestore';

export type Sizes = {
    xs: number;
    s: number;
    m: number;
    l: number;
    xl: number;
    '2xl': number;
    '3xl': number;
    '4xl': number;
    '5xl': number;
};

interface ProductVariant {
    id?: string;
    color: string;
    sizes: Sizes;
    stockInProduction: number;
    createdAt: Timestamp;
    startDate: Timestamp;
    dueDate?: Timestamp;
}

interface ProductVariantFormData {
    color: string;
    sizes: Sizes;
    stockInProduction: number;
    startDate: Timestamp;
    dueDate?: Timestamp;
}

interface VariantFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    productId: string;
    productName: string;
    currentVariants: ProductVariant[];
    onSaveVariant: (productId: string, variantData: ProductVariantFormData, variantIdToUpdate: string | undefined) => Promise<void>;
    onDeleteVariant: (productId: string, variantId: string) => Promise<void>;
}

const VariantFormModal: React.FC<VariantFormModalProps> = ({
    isOpen,
    onClose,
    productId,
    productName,
    currentVariants,
    onSaveVariant,
    onDeleteVariant,
}) => {
    const allSizes: (keyof Sizes)[] = ['xs', 's', 'm', 'l', 'xl', '2xl', '3xl', '4xl', '5xl'];

    const getTodayDateString = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = (today.getMonth() + 1).toString().padStart(2, '0');
        const day = today.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const formatDateToInput = (timestamp?: Timestamp): string => {
        if (!timestamp) return '';
        const date = timestamp.toDate();
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const initialSizesState: Sizes = {
        xs: 0, s: 0, m: 0, l: 0, xl: 0, '2xl': 0, '3xl': 0, '4xl': 0, '5xl': 0
    };

    const [variantInput, setVariantInput] = useState<Omit<ProductVariantFormData, 'startDate' | 'dueDate'> & { startDate: string, dueDate: string }>({
        color: '',
        sizes: { ...initialSizesState },
        stockInProduction: 0,
        startDate: getTodayDateString(),
        dueDate: '',
    });
    const [editingVariantId, setEditingVariantId] = useState<string | undefined>(undefined);
    const [error, setError] = useState<string | null>(null);

    const [shouldRender, setShouldRender] = useState(false); 

    useEffect(() => {
        if (isOpen) {
            setShouldRender(true); 
        } else {
            const timer = setTimeout(() => {
                setShouldRender(false);
            }, 300); 
            return () => clearTimeout(timer); 
        }

        if (!isOpen) {
            setVariantInput({
                color: '',
                sizes: { ...initialSizesState },
                stockInProduction: 0,
                startDate: getTodayDateString(),
                dueDate: '',
            });
            setEditingVariantId(undefined);
            setError(null);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]); 

    if (!shouldRender) {
        return null;
    }

    const handleVariantInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setVariantInput(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSizeInputChange = (size: keyof Sizes, value: string) => {
        const parsedValue = parseInt(value, 10);
        setVariantInput(prev => ({
            ...prev,
            sizes: {
                ...prev.sizes,
                [size]: isNaN(parsedValue) ? 0 : parsedValue
            }
        }));
    };

    const startEditingVariant = (variant: ProductVariant) => {
        setEditingVariantId(variant.id);
        setVariantInput({
            color: variant.color,
            sizes: { ...variant.sizes },
            stockInProduction: variant.stockInProduction,
            startDate: formatDateToInput(variant.startDate),
            dueDate: formatDateToInput(variant.dueDate),
        });
        setError(null);
    };

    const calculateTotalStock = (sizes: Sizes): number => {
        return Object.values(sizes).reduce((sum, qty) => sum + qty, 0);
    };

    const handleVariantSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!variantInput.color.trim()) {
            setError("El color es requerido.");
            return;
        }
        if (!variantInput.startDate) {
            setError("La fecha de inicio es requerida.");
            return;
        }

        const totalStock = calculateTotalStock(variantInput.sizes);
        if (totalStock <= 0) {
            setError("Debes ingresar al menos una cantidad para alguna talla.");
            return;
        }

        const dataToSave: ProductVariantFormData = {
            color: variantInput.color.trim(),
            sizes: variantInput.sizes,
            stockInProduction: totalStock,
            startDate: Timestamp.fromDate(new Date(variantInput.startDate)),
        };

        if (variantInput.dueDate) {
            dataToSave.dueDate = Timestamp.fromDate(new Date(variantInput.dueDate));
        }

        try {
            await onSaveVariant(productId, dataToSave, editingVariantId);
            onClose(); 
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Error al guardar la variante. Por favor, inténtalo de nuevo.");
            }
        }
    };

    const handleDeleteVariant = async (variantId: string) => {
        setError(null);
        try {
            await onDeleteVariant(productId, variantId);
            if (editingVariantId === variantId) {
                setEditingVariantId(undefined);
                setVariantInput({
                    color: '',
                    sizes: { ...initialSizesState },
                    stockInProduction: 0,
                    startDate: getTodayDateString(),
                    dueDate: '',
                });
            }
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Error al eliminar la variante. Por favor, inténtalo de nuevo.");
            }
        }
    };

    return (
        <div className={`modal-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}>
            <div className={`modal-content ${isOpen ? 'open' : ''}`} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Gestión de Lotes para "{productName}"</h3>
                    <button className="close-button" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    {error && <p className="error-message">{error}</p>}

                    <form onSubmit={handleVariantSubmit} className="modal-form">
                        <h4>{editingVariantId ? 'Editar Lote' : 'Añadir Nuevo Lote'}</h4>
                        <input
                            type="text"
                            name="color"
                            placeholder="Color (ej. Azul, Rojo)"
                            value={variantInput.color}
                            onChange={handleVariantInputChange}
                            required
                        />

                        {/* Contenedor de inputs de talla - usa una nueva clase para agruparlos */}
                        <div className="sizes-input-container"> 
                            {allSizes.map(size => (
                                <div key={size} className="size-input-item"> 
                                    <label htmlFor={`size-${size}`} className="size-label">{size.toUpperCase()}</label> 
                                    <input
                                        type="number"
                                        id={`size-${size}`}
                                        name={`size-${size}`}
                                        value={variantInput.sizes[size] === 0 ? '' : variantInput.sizes[size]}
                                        onChange={(e) => handleSizeInputChange(size, e.target.value)}
                                        min="0"
                                        step="1"
                                        placeholder="0"
                                        className="size-input" 
                                    />
                                </div>
                            ))}
                        </div>
                        <p className="total-stock-display"> 
                            **Cantidad total a producir:** {calculateTotalStock(variantInput.sizes)} unidades
                        </p>

                        <label htmlFor="startDateInput" className="input-label">Fecha de Inicio:</label>
                        <input
                            type="date"
                            name="startDate"
                            id="startDateInput"
                            value={variantInput.startDate}
                            onChange={handleVariantInputChange}
                            required
                            disabled={!!editingVariantId} 
                        />
                        <label htmlFor="dueDateInput" className="input-label">Fecha Límite (opcional):</label>
                        <input
                            type="date"
                            name="dueDate"
                            id="dueDateInput"
                            value={variantInput.dueDate}
                            onChange={handleVariantInputChange}
                        />
                        <div className="form-actions">
                            <button type="submit">
                                {editingVariantId ? 'Actualizar Lote' : 'Agregar Lote'}
                            </button>
                            {editingVariantId && (
                                <button type="button" onClick={() => {
                                    setEditingVariantId(undefined);
                                    setVariantInput({
                                        color: '',
                                        sizes: { ...initialSizesState },
                                        stockInProduction: 0,
                                        startDate: getTodayDateString(),
                                        dueDate: '',
                                    });
                                    setError(null);
                                }} className="cancel-button">
                                    Cancelar Edición
                                </button>
                            )}
                        </div>
                    </form>

                    <div className="current-items-list">
                        <h5>Lotes Abiertos:</h5>
                        {currentVariants.length === 0 ? (
                            <p className="no-items-message">No hay lotes abiertos actualmente.</p>
                        ) : (
                            <ul>
                                {currentVariants.map(variant => (
                                    <li key={variant.id}>
                                        <span>
                                            **Color:** {variant.color}
                                            <br />
                                            **Stock Total:** {variant.stockInProduction} unidades
                                            <br />
                                            **Cantidades por talla:** {
                                                Object.entries(variant.sizes)
                                                    .filter(([, qty]) => qty > 0)
                                                    .map(([size, qty]) => `${size.toUpperCase()}: ${qty}`)
                                                    .join(', ') || 'Ninguna talla definida'
                                            }
                                            <br />
                                            Inicio: {formatDateToInput(variant.startDate)}
                                            {variant.dueDate && `, Límite: ${formatDateToInput(variant.dueDate)}`}
                                        </span>
                                        <div className="item-actions">
                                            <button onClick={() => startEditingVariant(variant)} className="icon-button edit-button" title="Editar">
                                                <FaEdit />
                                            </button>
                                            <button onClick={() => handleDeleteVariant(variant.id!)} className="icon-button delete-button" title="Eliminar">
                                                <FaTrash />
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VariantFormModal;