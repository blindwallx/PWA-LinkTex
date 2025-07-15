// src/components/MainLayout.tsx
import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import './MainLayout.css';

// Importa tus dependencias de Firebase Firestore
import { db } from '../firebaseConfig'; // Asegúrate de que 'db' es tu instancia de Firestore
import { doc, getDoc } from 'firebase/firestore';

interface MainLayoutProps {
  userRole: string | null;
  companyId: string | null;
}

const MainLayout: React.FC<MainLayoutProps> = ({ userRole, companyId }) => {
  const [companyName, setCompanyName] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompanyName = async () => {
      if (companyId) {
        try {
          // CAMBIO AQUÍ: Usar 'companies' (minúscula) para coincidir con Register.tsx
          const companyDocRef = doc(db, 'companies', companyId);
          const companySnap = await getDoc(companyDocRef);

          if (companySnap.exists()) {
            const data = companySnap.data();
            // CAMBIO AQUÍ: Usar 'name' (minúscula) para coincidir con Register.tsx
            setCompanyName(data.name || null);
            console.log("Nombre de empresa cargado:", data.name);
          } else {
            console.log("No se encontró el documento de la empresa para el ID:", companyId);
            setCompanyName(null);
          }
        } catch (error: unknown) {
          if (error instanceof Error) {
            console.error("Error al obtener el nombre de la empresa:", error.message);
          } else {
            console.error("Error desconocido al obtener el nombre de la empresa:", error);
          }
          setCompanyName(null);
        }
      } else {
        setCompanyName(null);
      }
    };

    fetchCompanyName();
  }, [companyId]);

  return (
    <div className="main-layout">
      <Navbar userRole={userRole} />
      <main className="content">
        <Outlet context={{ userRole, companyId, companyName }} />
      </main>
    </div>
  );
};

export default MainLayout;