// src/components/Register.tsx
import React, { useState, type FormEvent } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import { doc, setDoc, collection, addDoc } from 'firebase/firestore';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../assets/ltcadena2.png';
import { FaCopy } from 'react-icons/fa';
import './Register.css';

// Type guard para verificar si un error es de Firebase Auth y tiene una propiedad 'code'
function isFirebaseAuthError(error: unknown): error is { code: string; message: string } {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  if (!('code' in error)) {
    return false;
  }
  return typeof (error as { code: unknown }).code === 'string';
}

const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [assignedCompanyId, setAssignedCompanyId] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setRegistrationSuccess(false);

    if (!companyName.trim()) {
      setError("Por favor, introduce un nombre para tu empresa.");
      setLoading(false);
      return;
    }

    try {
      console.log("Paso 1: Intentando crear usuario con Firebase Authentication...");
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log("Paso 1 completado: Usuario de Auth creado. UID:", user.uid);

      console.log("Paso 2: Intentando crear documento en la colección 'companies'...");
      const companiesCollectionRef = collection(db, "companies");
      const newCompanyDocRef = await addDoc(companiesCollectionRef, {
        name: companyName,
        createdAt: new Date(),
        adminUsers: [user.uid]
      });
      const companyId = newCompanyDocRef.id;
      console.log("Paso 2 completado: Documento de empresa creado. ID de empresa:", companyId);

      console.log("Paso 3: Intentando crear documento del usuario en la colección 'users' para UID:", user.uid);
      try {
        await setDoc(doc(db, "users", user.uid), {
          email: user.email,
          role: "admin",
          companyId: companyId,
          createdAt: new Date(),
        });
        console.log("Paso 3 completado: Documento de usuario creado exitosamente en Firestore.");
      } catch (setDocError: unknown) {
        // Este catch está específicamente para el setDoc del usuario
        console.error("ERROR EN EL PASO 3: Falló la creación del documento de usuario en Firestore.", setDocError);
        if (setDocError instanceof Error) {
          setError('Error al guardar el perfil del usuario: ' + setDocError.message + '. Verifica las reglas de Firestore.');
        } else {
          setError('Error desconocido al guardar el perfil del usuario.');
        }
        // Opcional: podrías considerar borrar el usuario de Auth si falla aquí para no dejar datos "huérfanos"
        // await auth.currentUser?.delete();
        // auth.signOut(); // También desloguear si no se pudo crear el perfil
        setLoading(false); // Asegúrate de que loading se desactive aquí también
        return; // Detener la ejecución si falla este paso crítico
      }

      setAssignedCompanyId(companyId);
      setRegistrationSuccess(true);
      console.log('Registro completo: Usuario, empresa y rol asignado como admin.');
      // No redirigir de inmediato, mostrar el ID de la empresa
    } catch (err: unknown) {
      // Este catch es para errores de autenticación o de creación de la empresa
      if (isFirebaseAuthError(err)) {
        if (err.code === 'auth/email-already-in-use') {
          setError('El correo electrónico ya está en uso. Por favor, inicia sesión o usa otro correo.');
        } else if (err.code === 'auth/weak-password') {
          setError('La contraseña debe tener al menos 6 caracteres.');
        } else {
          setError('Error al registrarse (Firebase Auth/Empresa): ' + err.message);
        }
        console.error("Error general en el registro (Firebase Auth o creación de empresa):", err);
      } else if (err instanceof Error) {
        setError('Error al registrarse (General Error): ' + err.message);
        console.error("Error general en el registro (General Error):", err);
      } else {
        setError('Error al registrarse. Inténtalo de nuevo.');
        console.error("Error general en el registro (Error desconocido):", err);
      }
    } finally {
      setLoading(false); // Siempre desactiva el estado de carga al final
    }
  };


if (registrationSuccess) {
  return (
    <div className="register-container success-message">
      <img src={logo} className="myLogo" />
      <h2>¡Registro Exitoso!</h2>
      <p>Tu cuenta ha sido creada como administrador de una nueva empresa.</p>
      <p>
        El ID de tu empresa es: <strong>{assignedCompanyId}</strong>
        <button
          onClick={() => {
            // **IMPORTANTE: Verificar si assignedCompanyId no es null antes de copiar**
            if (assignedCompanyId) {
              navigator.clipboard.writeText(assignedCompanyId);
              alert("¡ID de empresa copiado!"); // Opcional: para feedback al usuario
            } else {
              // Manejar el caso en que assignedCompanyId sea null (aunque no debería pasar aquí si el registro fue exitoso)
              alert("No se pudo copiar el ID de la empresa.");
            }
          }}
          className="copy-button"
          aria-label="Copiar ID de empresa"
        >
          <FaCopy /> {/* Icono de copiar de React Icons */}
        </button>
      </p>
      <p>Guarda este ID, lo necesitarás si en el futuro necesitas añadir operarios o referenciar tu empresa.</p>
      <button onClick={() => navigate('/dashboard')} className="go-to-dashboard-button">
        Ir al Dashboard
      </button>
      <p className="login-link">
        ¿Ya tienes una cuenta? <Link to="/login">Inicia Sesión aquí</Link>
      </p>
    </div>
  );
}

  return (
    <div className="register-container">
      <img src={logo} className="myLogo" />
      <h2 translate='no'>Registro Empresa</h2>
      {error && <p className="error-message">{error}</p>}
      <form onSubmit={handleRegister} className="register-form">
        
        <label htmlFor="company-register">Nombre Empresa:</label>
        <input
          type="text"
          placeholder="Nombre de tu Empresa (ej. LinkTex S.A.)"
          id='company-register'
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          required
        />

        <label htmlFor="register-email">Email:</label>
        <input
          type="email"
          placeholder="Correo electrónico del Administrador"
          id='register-email'
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label htmlFor="register-password">Password:</label>
        <input
          type="password"
          placeholder="Contraseña (mínimo 6 caracteres)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" disabled={loading} translate='no'>
          {loading ? 'Registrando...' : 'Registrar'}
        </button>
      </form>
      <p className="login-link">
        ¿Ya tienes una cuenta? <Link to="/login">Inicia Sesión aquí</Link>
      </p>
    </div>
  );
};

export default Register;