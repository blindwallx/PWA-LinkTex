import React, { useState, useEffect, type ChangeEvent, type FormEvent } from 'react';
import './Modal.css'; // Reutilizamos los estilos del modal
import { Timestamp } from 'firebase/firestore'; // Importamos Timestamp si se usa para createdAt

// --- Interfaces de Datos ---
// Puedes definir estas interfaces aquí si solo las usas en este modal
// O, idealmente, importarlas desde un archivo centralizado (ej. '../types/interfaces.ts')
interface Process {
    name: string;
    value: number;
}

// Interfaz para los datos que el formulario maneja y envía
interface ProductFormData {
    name: string;
    ref: string;
    productionCost: number;
}

// Interfaz completa de Producto, usada para el 'editingProduct'
interface Product {
    id?: string; // ID es opcional al crear, pero presente al editar
    name: string;
    ref: string;
    productionCost: number;
    processes: Process[];
    createdAt: Timestamp; // Usamos Timestamp de Firestore
}

// --- Props para el componente ProductFormModal ---
interface ProductFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    // La función onSave ahora espera 'ProductFormData' como primer argumento
    // y un 'productId' opcional para indicar si es una edición
    onSave: (productData: ProductFormData, productId?: string) => Promise<void>;
    editingProduct: Product | null; // El producto que se está editando, o null si es nuevo
    errorMessage: string | null; // Mensaje de error pasado desde el componente padre
    clearError: () => void; // Función para limpiar el error en el padre
}

const ProductFormModal: React.FC<ProductFormModalProps> = ({
    isOpen,
    onClose,
    onSave,
    editingProduct,
    errorMessage,
    clearError
}) => {
    // Estado local para los datos del formulario
    const [formData, setFormData] = useState<ProductFormData>({
        name: '',
        ref: '',
        productionCost: NaN, // Usamos NaN para indicar que no hay un número válido al inicio
    });
    // Estado local para errores de validación dentro del modal
    const [localError, setLocalError] = useState<string | null>(null);

    // Efecto para inicializar el formulario cuando el modal se abre
    // o cuando el producto a editar cambia
    useEffect(() => {
        if (editingProduct) {
            // Si hay un producto para editar, carga sus datos
            setFormData({
                name: editingProduct.name,
                ref: editingProduct.ref,
                productionCost: editingProduct.productionCost,
            });
        } else {
            // Si no hay producto (es nuevo), reinicia el formulario
            setFormData({
                name: '',
                ref: '',
                productionCost: NaN,
            });
        }
        // Limpia cualquier error local o del padre al abrir/cambiar producto
        setLocalError(null);
        clearError();
    }, [editingProduct, isOpen, clearError]);

    // **NUEVO EFECTO:** Para limpiar el mensaje de error automáticamente
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (errorMessage || localError) {
            timer = setTimeout(() => {
                setLocalError(null);
                clearError(); // Llama a clearError para limpiar el error del padre también
            }, 5000); // El error desaparecerá después de 5 segundos (5000 ms)
        }
        // Función de limpieza para evitar fugas de memoria si el componente se desmonta
        // o si el error cambia antes de que el temporizador termine
        return () => clearTimeout(timer);
    }, [errorMessage, localError, clearError]); // Dependencias: Si el mensaje de error cambia, reinicia el temporizador

    // Si el modal no está abierto, no renderiza nada
    if (!isOpen) return null;

    // Manejador de cambios en los inputs del formulario
    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            // Convierte 'productionCost' a número, si no es ese campo, usa el valor directo
            [name]: (name === 'productionCost') ? parseFloat(value) : value
        }));
        // Limpia los errores locales y del padre al empezar a escribir
        setLocalError(null);
        clearError();
    };

    // Manejador del envío del formulario
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault(); // Previene el comportamiento por defecto del formulario (recargar la página)
        setLocalError(null); // Limpia errores previos antes de la validación
        clearError();

        // Validaciones del formulario
        if (!formData.name.trim() || !formData.ref.trim() || isNaN(formData.productionCost) || formData.productionCost <= 0) {
            setLocalError("Por favor, rellena todos los campos obligatorios (Nombre, Referencia, Costo de Producción válido).");
            return;
        }

        try {
            // Llama a la función 'onSave' pasada por props,
            // con los datos del formulario y el ID del producto si está editando
            await onSave(formData, editingProduct?.id);
            onClose(); // Cierra el modal al guardar exitosamente
        } catch (err: unknown) { // 'err' es de tipo 'unknown' por seguridad en TypeScript
            // El error ya es manejado por la función onSave en el componente padre
            // (ProductManagement.tsx) y se muestra a través de la prop `errorMessage`.
            // Aquí solo hacemos un log para depuración si es necesario,
            // pero no establecemos un error en el estado local de este modal
            // para evitar duplicidad o conflictos.
            if (err instanceof Error) {
                console.error("Error capturado en ProductFormModal.handleSubmit:", err.message);
            } else {
                console.error("Error desconocido capturado en ProductFormModal.handleSubmit:", err);
            }
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h2>{editingProduct ? 'Editar Prenda Base' : 'Añadir Nueva Prenda'}</h2>
                    <button className="close-button" onClick={() => { onClose(); clearError(); }}>&times;</button>
                </div>
                {/* Muestra errores locales o pasados por props */}
                {(localError || errorMessage) && <p className="error-message">{localError || errorMessage}</p>}
                <div className="modal-body">
                    <form onSubmit={handleSubmit} className="product-form modal-form">
                        <input
                            type="text"
                            name="name"
                            placeholder="Nombre de la Prenda (ej. Camiseta Polo)"
                            value={formData.name}
                            onChange={handleChange}
                            required
                        />
                        <input
                            type="text"
                            name="ref"
                            placeholder="Referencia (ej. CP-001) - Única por empresa"
                            value={formData.ref}
                            onChange={handleChange}
                            required
                            // El campo de referencia se deshabilita si se está editando un producto existente
                            disabled={!!editingProduct}
                        />
                        <input
                            type="number"
                            name="productionCost"
                            placeholder="Costo de Producción por Unidad (ej. 15.00)"
                            // Si productionCost es NaN, muestra un string vacío para que el input esté limpio
                            value={isNaN(formData.productionCost) ? '' : formData.productionCost}
                            onChange={handleChange}
                            min="0" // Permite solo valores no negativos
                            step="0.01" // Permite dos decimales
                            required
                        />
                        <div className="modal-actions">
                            <button type="submit" className="button primary">
                                {editingProduct ? 'Actualizar Prenda' : 'Añadir Prenda'}
                            </button>
                            <button
                                type="button"
                                onClick={() => { onClose(); clearError(); }}
                                className="button secondary cancel-button"
                            >
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ProductFormModal;