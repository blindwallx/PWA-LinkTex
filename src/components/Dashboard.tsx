import React, { useState } from 'react'; // Importa useState para el mensaje de confirmación
import { useOutletContext } from 'react-router-dom';
import './Dashboard.css';
import { FaCopy } from 'react-icons/fa';

interface OutletContextType {
  userRole: string | null;
  companyId: string | null;
  companyName: string | null;
}

const Dashboard: React.FC = () => {
  const { userRole, companyId, companyName } = useOutletContext<OutletContextType>();
  const [copyMessage, setCopyMessage] = useState<string | null>(null); // Nuevo estado para el mensaje

  const showCopyFeedback = (message: string) => {
    setCopyMessage(message);
    setTimeout(() => {
      setCopyMessage(null); // Ocultar el mensaje después de 2 segundos
    }, 2000);
  };

  const handleCopyCompanyId = (event: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>) => {
    event.preventDefault(); // Crucial para móviles
    event.stopPropagation(); // Evita que el evento se propague a elementos padre

    if (!companyId) {
      showCopyFeedback('No hay un ID de empresa para copiar.');
      return;
    }

    // --- Estrategia de copia más robusta usando un textarea temporal ---
    const tempInput = document.createElement('textarea');
    tempInput.value = companyId;
    document.body.appendChild(tempInput); // Añade el textarea al DOM
    tempInput.select(); // Selecciona el texto dentro del textarea
    tempInput.setSelectionRange(0, 99999); // Para móviles que no soportan select() tan bien

    let success = false;
    try {
      success = document.execCommand('copy'); // Intenta copiar el texto seleccionado
      if (success) {
        showCopyFeedback('¡ID de empresa copiado!');
      } else {
        // Fallback si execCommand falla o no está disponible
        navigator.clipboard.writeText(companyId)
          .then(() => {
            showCopyFeedback('¡ID de empresa copiado!');
          })
          .catch(err => {
            console.error('Error al copiar con navigator.clipboard:', err);
            showCopyFeedback('Error al copiar. Intenta copiar manualmente.');
          });
      }
    } catch (err) {
      // Fallback si execCommand falla (ej. en iOS para algunos elementos)
      console.error('Error al copiar con execCommand:', err);
      navigator.clipboard.writeText(companyId)
        .then(() => {
          showCopyFeedback('¡ID de empresa copiado!');
        })
        .catch(navErr => {
          console.error('Error al copiar con navigator.clipboard (fallback):', navErr);
          showCopyFeedback('Error al copiar. Intenta copiar manualmente.');
        });
    } finally {
      document.body.removeChild(tempInput); // Elimina el textarea del DOM
    }
  };

  return (
    <div className="dashboard-container">
      {/* Mensaje de confirmación/error */}
      {copyMessage && (
        <div className="copy-feedback-message">
          {copyMessage}
        </div>
      )}

      <div className="dashboard-header-info-wrapper">
        {userRole === 'admin' ? (
          <>
            <p className="user-role-display">
              Tu rol actual es: <strong>{userRole}</strong>
            </p>
            {(companyId || companyName) && (
              <div className="company-info-display">
                {companyName && (
                  <p>
                    Empresa: <strong>{companyName}</strong>
                  </p>
                )}
                {companyId && (
                  <p>
                    ID Empresa: <strong id='copy-id'>{companyId}</strong>
                    <button
                      onClick={handleCopyCompanyId}
                      onTouchStart={handleCopyCompanyId} // Mantener onTouchStart
                      className="copy-button"
                      aria-label="Copiar ID de empresa"
                      title="Copiar ID de empresa"
                    >
                      <FaCopy />
                    </button>
                  </p>
                )}
              </div>
            )}
          </>
        ) : (
          userRole && (
            <p className="user-role-display-non-admin">
              Tu rol actual es: <strong>{userRole}</strong>
            </p>
          )
        )}
      </div>

      <h2 className="dashboard-title">¡Bienvenido al Dashboard de LinkTex!</h2>
      <p className="dashboard-description">
        Esta es la página principal de tu aplicación después de iniciar sesión.
      </p>
      <p className="dashboard-description">
        Aquí podrás visualizar las diferentes secciones y funcionalidades.
      </p>

      {userRole === 'admin' && (
        <div className="admin-dashboard-section">
          <h3>Panel de Administrador</h3>
          <p>Como administrador, tienes acceso a:</p>
          <ul>
            <li>Gestión de Productos y Stock</li>
            <li>Registro de Operarios</li>
            <li>Gestión de Usuarios y Roles</li>
          </ul>
        </div>
      )}

      {userRole === 'operario' && (
        <div className="operario-dashboard-section">
          <h3>Panel de Operario</h3>
          <p>Como operario, puedes:</p>
          <ul>
            <li>Ver el estado de las órdenes asignadas</li>
            <li>Actualizar el progreso de tus tareas</li>
            <li>Acceder a la información de productos</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default Dashboard;