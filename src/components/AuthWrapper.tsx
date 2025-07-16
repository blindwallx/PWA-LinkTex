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
import Profile from './Profile';
import OperariosManagement from './OperariosManagement'; // Importa el nuevo componente

interface ProtectedRouteProps {
  children: ReactNode;
  user: User | null;
  loading: boolean;
  userStatus: string | null; // Nuevo prop para el estado del usuario
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, user, loading, userStatus }) => {
  if (loading) {
    return <LoadingSpinner />;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  // Si el usuario es un operario y su estado es 'pending', no permitir acceso a las rutas protegidas.
  // Mostrar un mensaje de pendiente de aprobación.
  if (userStatus === 'pending') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f0f2f5',
        textAlign: 'center',
        padding: '20px'
      }}>
        <h2 style={{ color: '#e67e22', fontSize: '2em', marginBottom: '15px' }}>Acceso Pendiente</h2>
        <p style={{ color: '#555', fontSize: '1.1em', maxWidth: '500px' }}>
          Tu cuenta está pendiente de aprobación por el administrador de la empresa.
          Por favor, espera a que tu solicitud sea revisada.
        </p>
        <p style={{ color: '#555', fontSize: '1.1em', maxWidth: '500px' }}>
          Recibirás una notificación cuando tu estado cambie.
        </p>
        <button
          onClick={() => auth.signOut()}
          style={{
            marginTop: '30px',
            padding: '10px 20px',
            backgroundColor: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '1em'
          }}
        >
          Cerrar Sesión
        </button>
      </div>
    );
  }
  // Si el usuario es 'rejected', también podemos mostrar un mensaje y forzar el cierre de sesión
  if (userStatus === 'rejected') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f0f2f5',
        textAlign: 'center',
        padding: '20px'
      }}>
        <h2 style={{ color: '#e74c3c', fontSize: '2em', marginBottom: '15px' }}>Acceso Denegado</h2>
        <p style={{ color: '#555', fontSize: '1.1em', maxWidth: '500px' }}>
          Tu solicitud de ingreso a la empresa ha sido rechazada por el administrador.
          Si crees que esto es un error, por favor contacta al administrador de la empresa.
        </p>
        <button
          onClick={() => auth.signOut()}
          style={{
            marginTop: '30px',
            padding: '10px 20px',
            backgroundColor: '#e74c3c',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '1em'
          }}
        >
          Cerrar Sesión
        </button>
      </div>
    );
  }
  // Si el usuario no es 'pending' ni 'rejected' (es decir, está aprobado o es admin), permitir acceso
  return <>{children}</>;
};

const AuthWrapper: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [lastName, setLastName] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [userStatus, setUserStatus] = useState<string | null>(null); // NUEVO ESTADO PARA EL STATUS

  const [globalError, setGlobalError] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let retryTimeout: NodeJS.Timeout | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        setLoading(true);
        setEmail(user.email);

        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            setUserRole(userData.role as string);
            setCompanyId(userData.companyId as string);
            setFirstName(userData.firstName as string || null);
            setLastName(userData.lastName as string || null);
            setPhoneNumber(userData.phoneNumber as string || null);
            setUserStatus(userData.status as string || null); // OBTENER EL STATUS

            setGlobalError(null);
            setLoading(false);
            console.log("Documento de usuario encontrado inmediatamente.");

          } else {
            if (location.pathname === '/register') {
              console.log("Documento de usuario no encontrado inmediatamente, esperando creación...");

              if (retryTimeout) clearTimeout(retryTimeout);

              retryTimeout = setTimeout(async () => {
                try {
                  const userDocRefRetry = doc(db, "users", user.uid);
                  const userDocSnapRetry = await getDoc(userDocRefRetry);

                  if (userDocSnapRetry.exists()) {
                    const userDataRetry = userDocSnapRetry.data();
                    setUserRole(userDataRetry.role as string);
                    setCompanyId(userDataRetry.companyId as string);
                    setFirstName(userDataRetry.firstName as string || null);
                    setLastName(userDataRetry.lastName as string || null);
                    setPhoneNumber(userDataRetry.phoneNumber as string || null);
                    setUserStatus(userDataRetry.status as string || null); // OBTENER EL STATUS DESPUÉS DEL RETRASO

                    setGlobalError(null);
                    console.log("Documento de usuario encontrado después del retraso.");
                    setLoading(false);
                  } else {
                    setGlobalError("Error de registro: Perfil de usuario no se pudo completar. Por favor, contacta al soporte.");
                    setUserRole(null);
                    setCompanyId(null);
                    setFirstName(null);
                    setLastName(null);
                    setPhoneNumber(null);
                    setEmail(null);
                    setUserStatus(null); // Limpiar status
                    auth.signOut();
                    setLoading(false);
                    console.error("Documento de usuario no encontrado después del retraso. Cerrando sesión.");
                  }
                } catch (retryErr: unknown) {
                  console.error("Error al reintentar obtener perfil de usuario:", retryErr);
                  setGlobalError("Error al cargar el perfil. Inténtalo de nuevo o contacta al soporte.");
                  setUserRole(null);
                  setCompanyId(null);
                  setFirstName(null);
                  setLastName(null);
                  setPhoneNumber(null);
                  setEmail(null);
                  setUserStatus(null); // Limpiar status
                  auth.signOut();
                  setLoading(false);
                }
              }, 3000);

            } else {
              setGlobalError("Documento de usuario no encontrado. Por favor, inicia sesión de nuevo o contacta al administrador.");
              setUserRole(null);
              setCompanyId(null);
              setFirstName(null);
              setLastName(null);
              setPhoneNumber(null);
              setEmail(null);
              setUserStatus(null); // Limpiar status
              auth.signOut();
              setLoading(false);
              console.error("Documento de usuario no encontrado para un usuario que no está registrándose. Cerrando sesión.");
            }
          }
        } catch (err: unknown) {
          console.error("Error inesperado al obtener perfil de usuario:", err);
          setGlobalError("Error al cargar el perfil. Por favor, reinicia la aplicación o contacta al soporte.");
          setUserRole(null);
          setCompanyId(null);
          setFirstName(null);
          setLastName(null);
          setPhoneNumber(null);
          setEmail(null);
          setUserStatus(null); // Limpiar status
          auth.signOut();
          setLoading(false);
        }
      } else {
        if (retryTimeout) clearTimeout(retryTimeout);
        setCurrentUser(null);
        setUserRole(null);
        setCompanyId(null);
        setFirstName(null);
        setLastName(null);
        setPhoneNumber(null);
        setEmail(null);
        setUserStatus(null); // Limpiar status
        setGlobalError(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (retryTimeout) clearTimeout(retryTimeout);
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
            <ProtectedRoute user={currentUser} loading={loading} userStatus={userStatus}> {/* Pasar userStatus */}
              <MainLayout
                userRole={userRole}
                companyId={companyId}
                firstName={firstName}
                lastName={lastName}
                phoneNumber={phoneNumber}
                email={email}
                userStatus={userStatus} // Pasar userStatus a MainLayout
              />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="product-management" element={<ProductManagement />} />
          <Route path="profile" element={<Profile />} />
          <Route path="operarios-management" element={<OperariosManagement />} /> {/* NUEVA RUTA */}
        </Route>

        <Route path="*" element={loading ? <LoadingSpinner /> : <Navigate to="/login" />} />
      </Routes>
    </>
  );
};

export default AuthWrapper;