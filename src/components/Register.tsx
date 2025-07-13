// src/components/Register.tsx
import React, { useState, type FormEvent } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import { doc, setDoc, collection, addDoc } from 'firebase/firestore'; // Importamos collection y addDoc
import { Link, useNavigate } from 'react-router-dom';
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
  const [companyName, setCompanyName] = useState(''); // Nuevo estado para el nombre de la empresa
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false); // Nuevo estado para éxito
  const [assignedCompanyId, setAssignedCompanyId] = useState<string | null>(null); // Para mostrar el ID al usuario
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
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 1. Crear un nuevo documento en la colección 'companies'
      const companiesCollectionRef = collection(db, "companies");
      const newCompanyDocRef = await addDoc(companiesCollectionRef, {
        name: companyName,
        createdAt: new Date(),
        adminUsers: [user.uid] // Opcional: para referencia rápida de admins
      });

      // Obtener el ID de la empresa recién creada
      const companyId = newCompanyDocRef.id;

      // 2. Crear el documento del usuario con el rol de 'admin' y la 'companyId'
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        role: "admin", // El primer usuario registrado es un admin
        companyId: companyId, // Asignar la companyId generada
        createdAt: new Date(),
      });

      setAssignedCompanyId(companyId); // Guardar para mostrar al usuario
      setRegistrationSuccess(true);
      console.log('Usuario registrado, empresa creada y rol asignado como admin:', user);
      // No redirigir de inmediato, mostrar el ID de la empresa
    } catch (err: unknown) {
      if (isFirebaseAuthError(err)) {
        if (err.code === 'auth/email-already-in-use') {
          setError('El correo electrónico ya está en uso. Por favor, inicia sesión o usa otro correo.');
        } else if (err.code === 'auth/weak-password') {
          setError('La contraseña debe tener al menos 6 caracteres.');
        } else {
          setError('Error al registrarse: ' + err.message);
        }
        console.error("Error al registrar usuario (Firebase Auth Error):", err);
      } else if (err instanceof Error) {
        setError('Error al registrarse: ' + err.message);
        console.error("Error al registrar usuario (General Error):", err);
      } else {
        setError('Error al registrarse. Inténtalo de nuevo.');
        console.error("Error al registrar usuario: Error desconocido o inesperado.", err);
      }
    } finally {
      setLoading(false);
    }
  };

  if (registrationSuccess) {
    return (
      <div className="register-container success-message">
        <h2>¡Registro Exitoso!</h2>
        <p>Tu cuenta ha sido creada como administrador de una nueva empresa.</p>
        <p>El ID de tu empresa es: <strong>{assignedCompanyId}</strong></p>
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
      <h2>Registrar Nueva Empresa y Administrador</h2>
      {error && <p className="error-message">{error}</p>}
      <form onSubmit={handleRegister} className="register-form">
        <input
          type="text"
          placeholder="Nombre de tu Empresa (ej. LinkTex S.A.)"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          required
        />
        <input
          type="email"
          placeholder="Correo electrónico del Administrador"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Contraseña (mínimo 6 caracteres)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Registrando...' : 'Registrar Empresa y Administrador'}
        </button>
      </form>
      <p className="login-link">
        ¿Ya tienes una cuenta? <Link to="/login">Inicia Sesión aquí</Link>
      </p>
    </div>
  );
};

export default Register;