// src/components/AuthWrapper.tsx
import React, { useState, useEffect, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import Login from './Login';
import Register from './Register';
import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './Dashboard';
import LoadingSpinner from './LoadingSpinner';
import MainLayout from './MainLayout'; // Importamos MainLayout
import ProductManagement from './ProductManagement';

interface ProtectedRouteProps {
  children: ReactNode;
  user: User | null;
  loading: boolean;
}

function isFirebaseAuthError(error: unknown): error is { code: string; message: string } {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  if (!('code' in error)) {
    return false;
  }
  return typeof (error as { code: unknown }).code === 'string';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, user, loading }) => {
  if (loading) {
    return <LoadingSpinner />;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const AuthWrapper: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [globalError, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            setUserRole(userData.role as string);
            setCompanyId(userData.companyId as string);
          } else {
            console.warn("Documento de usuario no encontrado en Firestore para UID:", user.uid);
            setError("Documento de usuario no encontrado. Contacta al administrador.");
            setUserRole(null);
            setCompanyId(null);
            auth.signOut();
          }
        } catch (err: unknown) {
          if (isFirebaseAuthError(err)) {
            console.error("Error al obtener el rol/empresa del usuario (Firebase Error):", err.message, err.code);
            setError("Error al cargar el perfil del usuario: " + err.message);
          } else if (err instanceof Error) {
            console.error("Error al obtener el rol/empresa del usuario (General Error):", err.message);
            setError("Error al cargar el perfil del usuario: " + err.message);
          } else {
            console.error("Error al obtener el rol/empresa del usuario: Error desconocido.", err);
            setError("Error desconocido al cargar el perfil del usuario.");
          }
          setUserRole(null);
          setCompanyId(null);
          auth.signOut();
        }
      } else {
        setUserRole(null);
        setCompanyId(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {globalError && <div style={{ color: 'red', textAlign: 'center', padding: '10px' }}>{globalError}</div>}

      {/* Aquí pasamos userRole y companyId directamente al MainLayout */}
      {/* MainLayout es el wrapper, y el Outlet dentro de él pasará el contexto */}
      <Route
        path="/"
        element={
          <ProtectedRoute user={currentUser} loading={loading}>
            {/* MainLayout ahora recibe userRole y companyId como props directas */}
            <MainLayout userRole={userRole} companyId={companyId} />
          </ProtectedRoute>
        }
      >
        {/* Los componentes anidados no necesitan props aquí, porque usarán useOutletContext */}
        <Route index element={<Dashboard />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="product-management" element={<ProductManagement />} />
      </Route>

      <Route path="*" element={loading ? <LoadingSpinner /> : <Navigate to="/login" />} />
    </Routes>
  );
};

export default AuthWrapper;