import React, { type ReactNode, useEffect } from 'react';
import './claimOpModal.css'; // Asegúrate de que este CSS existe y está bien definido

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string; // Opcional: para un título dentro del modal
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title }) => {
  useEffect(() => {
    // Evita que el scroll de la página de fondo funcione cuando el modal está abierto
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset'; // Limpiar al desmontar o al cerrar
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}> {/* Evita que el clic en el contenido cierre el modal */}
        <button className="modal-close-button" onClick={onClose}>
          &times;
        </button>
        {title && <h2 className="modal-title">{title}</h2>}
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;