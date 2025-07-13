// src/components/MainLayout.tsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import './MainLayout.css';

interface MainLayoutProps {
  userRole: string | null;
  companyId: string | null; // Nuevo prop
}

const MainLayout: React.FC<MainLayoutProps> = ({ userRole, companyId }) => {
  return (
    <div className="main-layout">
      {/* Pasar userRole a Navbar para mostrar/ocultar enlaces */}
      <Navbar userRole={userRole} />
      <main className="content">
        {/* Outlet renderizará los componentes anidados (Dashboard, ProductManagement) */}
        <Outlet context={{ userRole, companyId }} /> {/* Pasamos context a los hijos de Outlet */}
      </main>
    </div>
  );
};

export default MainLayout;