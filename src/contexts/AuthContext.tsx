// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig'; // Asegúrate de que la ruta sea correcta

// Define el tipo para los datos del usuario en el contexto
interface UserDataContext {
  uid: string;
  email: string | null;
  role: string | null;
  companyId: string | null;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
}

// Define el tipo para el valor del contexto
interface AuthContextType {
  currentUser: UserDataContext | null;
  loading: boolean;
  userRole: string | null; // Facilitar acceso directo
  companyId: string | null; // Facilitar acceso directo
  globalError: string | null;
  // Puedes añadir funciones de login/logout aquí si las manejas en el contexto
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserDataContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
      if (user) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userDataFromFirestore = userDocSnap.data();
            const userProfile: UserDataContext = {
              uid: user.uid,
              email: user.email,
              role: userDataFromFirestore.role || null,
              companyId: userDataFromFirestore.companyId || null,
              firstName: userDataFromFirestore.firstName || null,
              lastName: userDataFromFirestore.lastName || null,
              phoneNumber: userDataFromFirestore.phoneNumber || null,
            };
            setCurrentUser(userProfile);
            setUserRole(userProfile.role);
            setCompanyId(userProfile.companyId);
            setGlobalError(null);
          } else {
            console.warn("Documento de usuario no encontrado en Firestore para UID:", user.uid);
            setCurrentUser(null);
            setUserRole(null);
            setCompanyId(null);
            setGlobalError("Tu perfil no pudo ser cargado correctamente. Intenta de nuevo.");
            await auth.signOut(); // Desloguear si el perfil no existe
          }
        } catch (error) {
          console.error("Error al obtener datos del usuario de Firestore:", error);
          setCurrentUser(null);
          setUserRole(null);
          setCompanyId(null);
          setGlobalError("Hubo un problema al cargar tu perfil. Intenta de nuevo.");
          await auth.signOut(); // Desloguear en caso de error
        }
      } else {
        setCurrentUser(null);
        setUserRole(null);
        setCompanyId(null);
        setGlobalError(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = {
    currentUser,
    loading,
    userRole,
    companyId,
    globalError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};