// src/components/Dashboard.tsx
import React from 'react';
import { useOutletContext } from 'react-router-dom';
import './Dashboard.css';

interface OutletContextType {
  userRole: string | null;
  companyId: string | null; // Nuevo en el contexto
}

const Dashboard: React.FC = () => {
  const { userRole, companyId } = useOutletContext<OutletContextType>(); // Obtener del contexto

  return (
    <div className="dashboard-container">
      <h2>¡Bienvenido al Dashboard de LinkTex!</h2>
      <p>Esta es la página principal de tu aplicación después de iniciar sesión.</p>
      <p>Aquí podrás visualizar las diferentes secciones y funcionalidades.</p>

      {userRole && <p>Tu rol actual es: <strong>{userRole}</strong></p>}
      {companyId && <p>ID de tu empresa: <strong>{companyId}</strong></p>} {/* Mostrar companyId */}

      {/* Contenido condicional para administradores */}
      {userRole === 'admin' && (
        <div className="admin-dashboard-section">
          <h3>Panel de Administrador</h3>
          <p>Como administrador, tienes acceso a:</p>
          <ul>
            <li>Gestión de Productos y Stock</li>
            <li>Registro de Operarios</li>
            {/* Agrega más funcionalidades aquí */}
          </ul>
        </div>
      )}

      {/* Contenido condicional para operarios */}
      {userRole === 'operario' && (
        <div className="operario-dashboard-section">
          <h3>Panel de Operario</h3>
          <p>Como operario, puedes:</p>
          <ul>
            <li>Ver el estado de las órdenes</li>
            <li>Actualizar el progreso de tus tareas</li>
            {/* Agrega más funcionalidades aquí */}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Dashboard;