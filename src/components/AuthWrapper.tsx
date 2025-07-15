// src/components/AuthWrapper.tsx
import React, { useState, useEffect, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import Login from './Login';
import Register from './Register';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Dashboard from './Dashboard';
import LoadingSpinner from './LoadingSpinner';
import MainLayout from './MainLayout';
import ProductManagement from './ProductManagement';

interface ProtectedRouteProps {
  children: ReactNode;
  user: User | null;
  loading: boolean;
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
  const [globalError, setGlobalError] = useState<string | null>(null); // Se usará solo para ERRORES REALES
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let retryTimeout: NodeJS.Timeout | null = null; // Para limpiar el timeout

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        // Al autenticar un usuario, siempre empezamos asumiendo que necesitamos cargar su perfil.
        setLoading(true); // Mantener el spinner activo mientras verificamos el perfil

        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            // Perfil encontrado: Cargar datos y limpiar errores si los hubiera.
            const userData = userDocSnap.data();
            setUserRole(userData.role as string);
            setCompanyId(userData.companyId as string);
            setGlobalError(null); // Limpiar cualquier error previo
            setLoading(false); // Detener el spinner, el perfil está listo
            console.log("Documento de usuario encontrado inmediatamente.");

          } else {
            // Perfil NO encontrado: Esto ocurre en dos escenarios:
            // 1. Justo después del registro, antes de que Register.tsx escriba el documento (temporal).
            // 2. Un usuario existente cuyo documento fue borrado o nunca se creó (error real).

            if (location.pathname === '/register') {
              // Caso 1: Estamos en el flujo de registro. No mostramos error AÚN.
              // En cambio, mantenemos el loading y esperamos un poco.
              console.log("Documento de usuario no encontrado inmediatamente, esperando creación...");
              
              // Limpiamos cualquier timeout previo para evitar múltiples ejecuciones
              if (retryTimeout) clearTimeout(retryTimeout);

              retryTimeout = setTimeout(async () => {
                try {
                  const userDocRefRetry = doc(db, "users", user.uid);
                  const userDocSnapRetry = await getDoc(userDocRefRetry);

                  if (userDocSnapRetry.exists()) {
                    const userDataRetry = userDocSnapRetry.data();
                    setUserRole(userDataRetry.role as string);
                    setCompanyId(userDataRetry.companyId as string);
                    setGlobalError(null); // ¡Éxito! Limpiamos el error
                    console.log("Documento de usuario encontrado después del retraso.");
                    setLoading(false); // Perfil listo
                    // Si Register.tsx ya no navega, podrías añadir un navigate aquí:
                    // navigate('/dashboard', { replace: true }); 
                  } else {
                    // Si incluso después del retraso no se encuentra, es un fallo en el registro.
                    setGlobalError("Error de registro: Perfil de usuario no se pudo completar. Por favor, contacta al soporte.");
                    setUserRole(null);
                    setCompanyId(null);
                    auth.signOut(); // Cerrar sesión para evitar un estado inconsistente
                    setLoading(false); // Detener el spinner, mostrar error
                    console.error("Documento de usuario no encontrado después del retraso. Cerrando sesión.");
                  }
                } catch (retryErr: unknown) {
                  console.error("Error al reintentar obtener perfil de usuario:", retryErr);
                  setGlobalError("Error al cargar el perfil. Inténtalo de nuevo o contacta al soporte.");
                  setUserRole(null);
                  setCompanyId(null);
                  auth.signOut();
                  setLoading(false); // Detener el spinner, mostrar error
                }
              }, 3000); // Espera 3 segundos (tiempo para que Register.tsx termine de escribir)

            } else {
              // Caso 2: No estamos en /register y el perfil no se encontró. Esto es un error real.
              setGlobalError("Documento de usuario no encontrado. Por favor, inicia sesión de nuevo o contacta al administrador.");
              setUserRole(null);
              setCompanyId(null);
              auth.signOut(); // Forzar logout si el perfil no existe para un usuario "conocido"
              setLoading(false); // Detener el spinner, mostrar error
              console.error("Documento de usuario no encontrado para un usuario que no está registrándose. Cerrando sesión.");
            }
          }
        } catch (err: unknown) {
          // Un error general al intentar obtener el documento (ej. problemas de red, permisos inesperados)
          console.error("Error inesperado al obtener perfil de usuario:", err);
          setGlobalError("Error al cargar el perfil. Por favor, reinicia la aplicación o contacta al soporte.");
          setUserRole(null);
          setCompanyId(null);
          auth.signOut();
          setLoading(false); // Detener el spinner, mostrar error
        }
      } else {
        // No hay usuario autenticado (deslogueado o nunca logueado)
        if (retryTimeout) clearTimeout(retryTimeout); // Limpiar timeout si el usuario se desloguea
        setCurrentUser(null);
        setUserRole(null);
        setCompanyId(null);
        setGlobalError(null); // Limpiar cualquier error
        setLoading(false); // No hay usuario, no hay carga de perfil, listo.
      }
    });

    // Función de limpieza del useEffect
    return () => {
      unsubscribe(); // Desuscribirse del listener de auth
      if (retryTimeout) clearTimeout(retryTimeout); // Limpiar el timeout si el componente se desmonta
    };
  }, [location.pathname, navigate]);

  return (
    <>
      {globalError && <div style={{ color: 'red', textAlign: 'center', padding: '10px' }}>{globalError}</div>}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/"
          element={
            <ProtectedRoute user={currentUser} loading={loading}>
              <MainLayout userRole={userRole} companyId={companyId} />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="product-management" element={<ProductManagement />} />
        </Route>

        <Route path="*" element={loading ? <LoadingSpinner /> : <Navigate to="/login" />} />
      </Routes>
    </>
  );
};

export default AuthWrapper;