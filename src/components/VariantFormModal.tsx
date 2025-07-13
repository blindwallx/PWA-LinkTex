import React, { useState, useEffect, type ChangeEvent, type FormEvent } from 'react';
import './Modal.css';
import { FaEdit, FaTrash } from 'react-icons/fa';
import { Timestamp } from 'firebase/firestore';

// Definición completa de la variante tal como se almacena en Firestore
interface ProductVariant {
    id?: string;
    color: string;
    stockInProduction: number;
    createdAt: Timestamp;
    startDate: Timestamp; // <-- NUEVO: Fecha de inicio del lote
    dueDate?: Timestamp; // <-- NUEVO: Fecha límite del lote (opcional)
}

// Nueva interfaz para los datos de entrada del formulario de variante (sin ID ni createdAt)
interface ProductVariantFormData {
    color: string;
    stockInProduction: number;
    startDate: Timestamp; // <-- NUEVO: Se enviará como Timestamp
    dueDate?: Timestamp; // <-- NUEVO: Se enviará como Timestamp (opcional)
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
    // Función de ayuda para obtener la fecha de hoy como string YYYY-MM-DD
    const getTodayDateString = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = (today.getMonth() + 1).toString().padStart(2, '0');
        const day = today.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Función de ayuda para formatear Timestamp a string YYYY-MM-DD
    const formatDateToInput = (timestamp?: Timestamp): string => {
        if (!timestamp) return '';
        const date = timestamp.toDate();
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [variantInput, setVariantInput] = useState<Omit<ProductVariantFormData, 'startDate' | 'dueDate'> & { startDate: string, dueDate: string }>({
        color: '',
        stockInProduction: 0,
        startDate: getTodayDateString(), // Por defecto la fecha de hoy en formato string
        dueDate: '', // Por defecto vacío
    });
    const [editingVariantId, setEditingVariantId] = useState<string | undefined>(undefined);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) {
            setVariantInput({
                color: '',
                stockInProduction: 0,
                startDate: getTodayDateString(), // Resetear a la fecha actual al cerrar
                dueDate: '',
            });
            setEditingVariantId(undefined);
            setError(null);
        }
    }, [isOpen]);

    const handleVariantInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setVariantInput(prev => ({
            ...prev,
            [name]: name === 'stockInProduction' ? parseFloat(value) : value
        }));
    };

    const startEditingVariant = (variant: ProductVariant) => {
        setEditingVariantId(variant.id);
        setVariantInput({
            color: variant.color,
            stockInProduction: variant.stockInProduction,
            startDate: formatDateToInput(variant.startDate),
            dueDate: formatDateToInput(variant.dueDate),
        });
        setError(null);
    };

    const handleVariantSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validaciones básicas
        if (!variantInput.color.trim()) {
            setError("El color es requerido.");
            return;
        }
        if (isNaN(variantInput.stockInProduction) || variantInput.stockInProduction <= 0) {
            setError("La cantidad de stock debe ser un número válido mayor que cero.");
            return;
        }
        if (!variantInput.startDate) {
            setError("La fecha de inicio es requerida.");
            return;
        }

        // Convertir las fechas de string a Timestamp de Firebase
        const dataToSave: ProductVariantFormData = {
            color: variantInput.color.trim(),
            stockInProduction: variantInput.stockInProduction,
            startDate: Timestamp.fromDate(new Date(variantInput.startDate)),
        };

        if (variantInput.dueDate) {
            dataToSave.dueDate = Timestamp.fromDate(new Date(variantInput.dueDate));
        }

        try {
            await onSaveVariant(productId, dataToSave, editingVariantId);
            setVariantInput({
                color: '',
                stockInProduction: 0,
                startDate: getTodayDateString(),
                dueDate: '',
            });
            setEditingVariantId(undefined);
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

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
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
                        <input
                            type="number"
                            name="stockInProduction"
                            placeholder="Definir Cantidad (ej. 100)"
                            value={variantInput.stockInProduction === 0 || isNaN(variantInput.stockInProduction) ? '' : variantInput.stockInProduction}
                            onChange={handleVariantInputChange}
                            min="0"
                            step="1"
                            required
                        />
                        <label htmlFor="startDateInput" className="input-label">Fecha de Inicio:</label>
                        <input
                            type="date"
                            name="startDate"
                            id="startDateInput"
                            value={variantInput.startDate}
                            onChange={handleVariantInputChange}
                            required
                            // Deshabilitar la edición si estamos editando y el lote ya existe (startDate ya guardada)
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
                                        stockInProduction: 0,
                                        startDate: getTodayDateString(), // Resetear a la fecha actual al cancelar edición
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
                                            Color: {variant.color}, Stock: {variant.stockInProduction}
                                            <br />
                                            Inicio: {formatDateToInput(variant.startDate)}
                                            {variant.dueDate && `, Límite: ${formatDateToInput(variant.dueDate)}`}
                                        </span>
                                        <div className="item-actions">
                                            <button onClick={() => startEditingVariant(variant)} className="edit-button icon-button small-icon-button" title="Editar">
                                                <FaEdit />
                                            </button>
                                            <button onClick={() => handleDeleteVariant(variant.id!)} className="delete-button icon-button small-icon-button" title="Eliminar">
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