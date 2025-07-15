import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import './Dashboard.css';
import { FaCopy } from 'react-icons/fa';

interface OutletContextType {
  userRole: string | null;
  companyId: string | null;
  companyName: string | null;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null; // Aunque no se mostrará aquí, sigue siendo parte del contexto
}

const Dashboard: React.FC = () => {
  const { userRole, companyId, companyName, firstName, lastName} = useOutletContext<OutletContextType>();
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  const showCopyFeedback = (message: string) => {
    setCopyMessage(message);
    setTimeout(() => {
      setCopyMessage(null);
    }, 2000);
  };

  const handleCopyCompanyId = (event: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (!companyId) {
      showCopyFeedback('No hay un ID de empresa para copiar.');
      return;
    }

    const tempInput = document.createElement('textarea');
    tempInput.value = companyId;
    document.body.appendChild(tempInput);
    tempInput.select();
    tempInput.setSelectionRange(0, 99999);

    let success = false;
    try {
      success = document.execCommand('copy');
      if (success) {
        showCopyFeedback('¡ID de empresa copiado!');
      } else {
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
      document.body.removeChild(tempInput);
    }
  };

  return (
    <div className="dashboard-container">
      {copyMessage && (
        <div className="copy-feedback-message">
          {copyMessage}
        </div>
      )}

      <div className="dashboard-header-info-wrapper">
        {/* Mostrar Nombre y Apellido junto al rol */}
        {userRole && (
          <p className="user-role-display">
            {firstName && lastName ? `${firstName} ${lastName}` : 'Usuario'}: <strong>{userRole}</strong>
          </p>
        )}
        {userRole === 'admin' ? (
          <>
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
                      onTouchStart={handleCopyCompanyId}
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
            // Para operarios, solo mostrar el nombre de la empresa
            companyName && (
              <div className="company-info-display">
                <p>
                  Empresa: <strong>{companyName}</strong>
                </p>
              </div>
            )
          )
        )}
      </div>

      <h2 className="dashboard-title">¡Bienvenido al Dashboard de LinkTex!</h2>
      {/* Eliminar la visualización del teléfono aquí */}
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