// src/components/Profile.tsx
import React from 'react';
import { useOutletContext } from 'react-router-dom';
import './Profile.css'; // Crearemos este archivo CSS a continuación

interface OutletContextType {
  userRole: string | null;
  companyId: string | null;
  companyName: string | null;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  email: string | null; // Asumiendo que el email también está en el contexto o se puede derivar
}

const Profile: React.FC = () => {
  const { userRole, companyName, firstName, lastName, phoneNumber, email } = useOutletContext<OutletContextType>();

  return (
    <div className="profile-container">
      <h2 className="profile-title">Mi Perfil</h2>
      <div className="profile-info-card">
        <p><strong>Nombre:</strong> {firstName || 'N/A'}</p>
        <p><strong>Apellido:</strong> {lastName || 'N/A'}</p>
        <p><strong>Email:</strong> {email || 'N/A'}</p>
        <p><strong>Teléfono:</strong> {phoneNumber || 'N/A'}</p>
        <p><strong>Rol:</strong> {userRole || 'N/A'}</p>
        {companyName && (
          <p><strong>Empresa:</strong> {companyName}</p>
        )}
      </div>
      <p className="profile-description">
        Aquí puedes ver y gestionar tu información personal.
      </p>
    </div>
  );
};

export default Profile;
