// src/components/MainLayout.tsx
import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import './MainLayout.css';

// Importa tus dependencias de Firebase Firestore Y AUTH
import { db, auth } from '../firebaseConfig'; // <-- ¡IMPORTA 'auth' AQUÍ!
import { doc, getDoc } from 'firebase/firestore';

interface MainLayoutProps {
    userRole: string | null;
    companyId: string | null;
    firstName: string | null;
    lastName: string | null;
    phoneNumber: string | null;
    email: string | null;
    userStatus: string | null;
}

const MainLayout: React.FC<MainLayoutProps> = ({ userRole, companyId, firstName, lastName, phoneNumber, email, userStatus }) => {
    const [companyName, setCompanyName] = useState<string | null>(null);

    useEffect(() => {
        const fetchCompanyName = async () => {
            if (companyId) {
                try {
                    const companyDocRef = doc(db, 'companies', companyId);
                    const companySnap = await getDoc(companyDocRef);

                    if (companySnap.exists()) {
                        const data = companySnap.data();
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

    // 1. Construir el nombre completo del usuario
    const userName = firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || email || null;

    // 2. Obtener el userId directamente del usuario autenticado de Firebase
    const userId = auth.currentUser?.uid || null; // <-- Obtiene el UID del usuario actual

    return (
        <div className="main-layout">
            <Navbar userRole={userRole} />
            <main className="content">
                <Outlet context={{
                    userId,         // <-- ¡Ahora pasa userId!
                    userName,       // <-- ¡Ahora pasa userName combinado!
                    userRole,
                    companyId,
                    companyName,
                    firstName,
                    lastName,
                    phoneNumber,
                    email,
                    userStatus
                }} />
            </main>
        </div>
    );
};

export default MainLayout;