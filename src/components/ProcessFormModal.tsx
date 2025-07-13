import React, { useState, useEffect, type ChangeEvent, type FormEvent } from 'react';
import './Modal.css';
import { FaEdit, FaTrash } from 'react-icons/fa';

interface Process {
  name: string;
  value: number;
}

interface ProcessFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  currentProcesses: Process[];
  productionCost: number;
  onSaveProcess: (
    productId: string,
    indexToUpdate: number | null,
    process: Process,
    currentProcesses: Process[], // Se pasa para que la lógica de validación/actualización sea externa
    productionCost: number
  ) => Promise<void>;
  onDeleteProcess: (productId: string, indexToRemove: number, currentProcesses: Process[]) => Promise<void>; // Se pasa para que la lógica de validación/actualización sea externa
}

const ProcessFormModal: React.FC<ProcessFormModalProps> = ({
  isOpen,
  onClose,
  productId,
  productName,
  currentProcesses,
  productionCost,
  onSaveProcess,
  onDeleteProcess,
}) => {
  const [processInput, setProcessInput] = useState<Process>({ name: '', value: 0 });
  const [editingProcessIndex, setEditingProcessIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setProcessInput({ name: '', value: 0 });
      setEditingProcessIndex(null);
      setError(null);
    }
  }, [isOpen, productId]); // Dependencia productId para resetear si se cambia de producto

  const handleProcessInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProcessInput(prev => ({
      ...prev,
      [name]: name === 'value' ? parseFloat(value) : value
    }));
  };

  const startEditingProcess = (index: number, process: Process) => {
    setEditingProcessIndex(index);
    setProcessInput(process);
    setError(null);
  };

  const handleProcessSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!processInput.name || isNaN(processInput.value) || processInput.value <= 0) {
      setError("El nombre del proceso y su valor deben ser válidos y mayores que cero.");
      return;
    }

    // Se calcula la suma de valores aquí para la validación previa al envío
    const tempProcesses = editingProcessIndex !== null
      ? currentProcesses.map((p, idx) => idx === editingProcessIndex ? processInput : p)
      : [...currentProcesses, processInput];

    const totalProcessValue = tempProcesses.reduce((sum, p) => sum + p.value, 0);

    if (totalProcessValue > productionCost) {
      setError(`La suma de los valores de los procesos (${totalProcessValue.toFixed(2)}) excede el costo de producción de la prenda (${productionCost.toFixed(2)}).`);
      return;
    }

    try {
      await onSaveProcess(
        productId,
        editingProcessIndex,
        processInput,
        currentProcesses,
        productionCost
      );
      setProcessInput({ name: '', value: 0 });
      setEditingProcessIndex(null);
    } catch (err: unknown) { // CORRECCIÓN: Usar unknown para el tipo de error
      if (err instanceof Error) { // CORRECCIÓN: Comprobar si es una instancia de Error
        setError(err.message);
      } else {
        setError("Error al guardar el proceso. Por favor, inténtalo de nuevo.");
      }
    }
  };

  const handleDeleteProcess = async (index: number) => {
    setError(null);
    try {
      await onDeleteProcess(productId, index, currentProcesses);
      // Opcional: Si el proceso que se estaba editando es el que se eliminó, limpiar el formulario de edición
      if (editingProcessIndex === index) {
        setEditingProcessIndex(null);
        setProcessInput({ name: '', value: 0 });
      }
    } catch (err: unknown) { // CORRECCIÓN: Usar unknown para el tipo de error
      if (err instanceof Error) { // CORRECCIÓN: Comprobar si es una instancia de Error
        setError(err.message);
      } else {
        setError("Error al eliminar el proceso. Por favor, inténtalo de nuevo.");
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Gestionar Procesos para "{productName}"</h3>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {error && <p className="error-message">{error}</p>}

          <form onSubmit={handleProcessSubmit} className="modal-form">
            <h4>{editingProcessIndex !== null ? 'Editar Proceso' : 'Añadir Nuevo Proceso'}</h4>
            <input
              type="text"
              name="name"
              placeholder="Nombre del Proceso"
              value={processInput.name}
              onChange={handleProcessInputChange}
              required
            />
            <input
              type="number"
              name="value"
              placeholder="Valor por Unidad (ej. 2.50)"
              value={processInput.value === 0 || isNaN(processInput.value) ? '' : processInput.value}
              onChange={handleProcessInputChange}
              min="0"
              step="0.01"
              required
            />
            <div className="form-actions">
              <button type="submit">
                {editingProcessIndex !== null ? 'Actualizar Proceso' : 'Añadir Proceso'}
              </button>
              {editingProcessIndex !== null && (
                <button type="button" onClick={() => {
                  setEditingProcessIndex(null);
                  setProcessInput({ name: '', value: 0 });
                  setError(null);
                }} className="cancel-button">
                  Cancelar Edición
                </button>
              )}
            </div>
          </form>

          <div className="current-items-list">
            <h5>Procesos Actuales:</h5>
            {currentProcesses.length === 0 ? (
              <p className="no-items-message">No hay procesos definidos para esta prenda.</p>
            ) : (
              <ul>
                {currentProcesses.map((p, index) => (
                  <li key={index}>
                    <span>{p.name}: ${p.value.toFixed(2)}</span>
                    <div className="item-actions">
                      <button onClick={() => startEditingProcess(index, p)} className="edit-button icon-button small-icon-button" title="Editar">
                        <FaEdit />
                      </button>
                      <button onClick={() => handleDeleteProcess(index)} className="delete-button icon-button small-icon-button" title="Eliminar">
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

export default ProcessFormModal;