// src/components/Register.tsx
import React, { useState, type FormEvent } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import { doc, setDoc, collection, addDoc, getDoc} from 'firebase/firestore';
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
  const [companyName, setCompanyName] = useState(''); // Para registro de admin
  const [joinCompanyId, setJoinCompanyId] = useState(''); // Para registro de operario
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [assignedCompanyId, setAssignedCompanyId] = useState<string | null>(null);
  const [assignedCompanyName, setAssignedCompanyName] = useState<string | null>(null); // Para mostrar el nombre de la empresa al operario
  const [userRoleOnSuccess, setUserRoleOnSuccess] = useState<string | null>(null); // Para mostrar el rol en el mensaje de éxito
  const [registrationType, setRegistrationType] = useState<'admin' | 'operario'>('admin'); // Nuevo estado para el tipo de registro

  const navigate = useNavigate();

  // Función para mostrar feedback de copia (reutilizada del Dashboard)
  const showCopyFeedback = (message: string) => {
    // Por simplicidad, usamos alert. Se recomienda un modal personalizado.
    // Reemplazar con un modal personalizado si es necesario, ya que alert() no debe usarse.
    const feedbackModal = document.createElement('div');
    feedbackModal.className = 'custom-alert-modal';
    feedbackModal.innerHTML = `
      <div class="custom-alert-content">
        <p>${message}</p>
        <button class="custom-alert-button">OK</button>
      </div>
    `;
    document.body.appendChild(feedbackModal);

    const closeButton = feedbackModal.querySelector('.custom-alert-button');
    closeButton?.addEventListener('click', () => {
      document.body.removeChild(feedbackModal);
    });
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setRegistrationSuccess(false);

    // Validaciones básicas para los nuevos campos
    if (!firstName.trim()) {
      setError("Por favor, introduce tu nombre.");
      setLoading(false);
      return;
    }
    if (!lastName.trim()) {
      setError("Por favor, introduce tu apellido.");
      setLoading(false);
      return;
    }
    if (!phoneNumber.trim()) { // Mantener como requerido por ahora, puedes cambiarlo
      setError("Por favor, introduce tu número de teléfono.");
      setLoading(false);
      return;
    }

    try {
      // Lógica de registro para ADMINISTRADOR (crear nueva empresa)
      if (registrationType === 'admin') {
        if (!companyName.trim()) {
          setError("Por favor, introduce un nombre para tu empresa.");
          setLoading(false);
          return;
        }

        console.log("Paso 1 (Admin): Intentando crear usuario con Firebase Authentication...");
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log("Paso 1 (Admin) completado: Usuario de Auth creado. UID:", user.uid);

        console.log("Paso 2 (Admin): Intentando crear documento en la colección 'companies'...");
        const companiesCollectionRef = collection(db, "companies");
        const newCompanyDocRef = await addDoc(companiesCollectionRef, {
          name: companyName,
          createdAt: new Date(),
          adminUsers: [user.uid], // El primer admin
          operarioUsers: [] // Inicializar array de operarios
        });
        const companyId = newCompanyDocRef.id;
        console.log("Paso 2 (Admin) completado: Documento de empresa creado. ID de empresa:", companyId);

        console.log("Paso 3 (Admin): Intentando crear documento del usuario en la colección 'users' para UID:", user.uid);
        await setDoc(doc(db, "users", user.uid), {
          email: user.email,
          role: "admin",
          companyId: companyId,
          createdAt: new Date(),
          firstName: firstName,
          lastName: lastName,
          phoneNumber: phoneNumber,
          status: "approved" // Los administradores se aprueban automáticamente
        });
        console.log("Paso 3 (Admin) completado: Documento de usuario creado exitosamente en Firestore.");

        setAssignedCompanyId(companyId);
        setAssignedCompanyName(companyName);
        setUserRoleOnSuccess('admin');
        setRegistrationSuccess(true);
        console.log('Registro completo (Admin): Usuario, empresa y rol asignado como admin.');

      } else { // Lógica de registro para OPERARIO (unirse a empresa existente)
        if (!joinCompanyId.trim()) {
          setError("Por favor, introduce el ID de la empresa a la que deseas unirte.");
          setLoading(false);
          return;
        }

        console.log("Paso 1 (Operario): Intentando crear usuario con Firebase Authentication...");
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log("Paso 1 (Operario) completado: Usuario de Auth creado. UID:", user.uid);

        console.log("Paso 2 (Operario): Verificando Company ID...");
        const companyDocRef = doc(db, "companies", joinCompanyId);
        const companyDocSnap = await getDoc(companyDocRef);

        if (!companyDocSnap.exists()) {
          console.error("El ID de empresa proporcionado no existe. Eliminando usuario de Auth...");
          await user.delete(); // Eliminar el usuario de Auth
          setError("El ID de empresa proporcionado no existe.");
          setLoading(false);
          return;
        }
        const companyData = companyDocSnap.data();
        const existingCompanyName = companyData?.name;
        console.log("Paso 2 (Operario) completado: Company ID verificado. Nombre de empresa:", existingCompanyName);

        // NOTA: No añadimos el operario a 'operarioUsers' de la empresa aquí.
        // Esto se hará solo cuando el administrador lo apruebe.

        console.log("Paso 3 (Operario): Intentando crear documento del usuario en la colección 'users' para UID:", user.uid);
        await setDoc(doc(db, "users", user.uid), {
          email: user.email,
          role: "operario",
          companyId: joinCompanyId,
          createdAt: new Date(),
          firstName: firstName,
          lastName: lastName,
          phoneNumber: phoneNumber,
          status: "pending" // Los operarios tienen un estado inicial de pendiente
        });
        console.log("Paso 3 (Operario) completado: Documento de usuario creado exitosamente en Firestore con estado 'pending'.");

        setAssignedCompanyId(joinCompanyId);
        setAssignedCompanyName(existingCompanyName);
        setUserRoleOnSuccess('operario');
        setRegistrationSuccess(true);
        console.log('Registro completo (Operario): Usuario, empresa asignada y rol asignado como operario, pendiente de aprobación.');
      }
    } catch (err: unknown) {
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
      <div className={`register-container success-message ${userRoleOnSuccess === 'admin' ? 'admin-success-message' : ''}`}>
        <img src={logo} className="myLogo" alt="LinkTex Logo" />
        <h2 translate='no'>
          {userRoleOnSuccess === 'admin' ? '¡Registro Exitoso!' : 'Solicitud de Registro Pendiente'}
        </h2>
        {userRoleOnSuccess === 'admin' ? (
          <>
            <p>Tu cuenta ha sido creada como administrador de una nueva empresa.</p>
            <p>
              El ID de tu empresa es: <strong>{assignedCompanyId}</strong>
              <button
                onClick={() => {
                  if (assignedCompanyId) {
                    const tempInput = document.createElement('textarea');
                    tempInput.value = assignedCompanyId;
                    document.body.appendChild(tempInput);
                    tempInput.select();
                    tempInput.setSelectionRange(0, 99999);
                    try {
                      document.execCommand('copy');
                      showCopyFeedback("¡ID de empresa copiado!");
                    } catch (err) {
                      console.error('Error al copiar con execCommand:', err);
                      // Fallback para navegadores que no soportan execCommand o en entornos restringidos
                      navigator.clipboard.writeText(assignedCompanyId)
                        .then(() => showCopyFeedback("¡ID de empresa copiado!"))
                        .catch(e => {
                          console.error('Error al copiar con navigator.clipboard:', e);
                          showCopyFeedback("Error al copiar. Intenta copiar manualmente.");
                        });
                    } finally {
                      document.body.removeChild(tempInput);
                    }
                  } else {
                    showCopyFeedback("No se pudo copiar el ID de la empresa.");
                  }
                }}
                className="copy-button"
                aria-label="Copiar ID de empresa"
                title="Copiar ID de empresa"
              >
                <FaCopy />
              </button>
            </p>
            <p>Podrás ver este ID en tu Dashboard, lo necesitarás para añadir operarios o referenciar tu empresa.</p>
          </>
        ) : (
          <>
            <p>Tu solicitud de ingreso a <strong>{assignedCompanyName}</strong> está **pendiente de aprobación** por el administrador
              de la empresa. Recibirás una notificación cuando tu cuenta sea activada.
            </p>
            <p>Ya puedes intentar iniciar sesión con tus credenciales, pero no podrás acceder al dashboard hasta ser aprobado.</p>
          </>
        )}
        <button onClick={() => navigate('/login')} className="go-to-dashboard-button">
          Ir a Iniciar Sesión
        </button>
      </div>
    );
  }

  return (
    <div className="register-container">
      <img src={logo} className="myLogo" alt="LinkTex Logo" />
      <h2 translate='no'>Registro</h2>
      {error && <p className="error-message">{error}</p>}
      <form onSubmit={handleRegister} className="register-form">
        {/* Selección de tipo de registro */}
        <div className="registration-type-selection">
          <label className="radio-label">
            <input
              type="radio"
              value="admin"
              checked={registrationType === 'admin'}
              onChange={() => setRegistrationType('admin')}
            />
            Registrar nueva empresa (Administrador)
          </label>
          <label className="radio-label">
            <input
              type="radio"
              value="operario"
              checked={registrationType === 'operario'}
              onChange={() => setRegistrationType('operario')}
            />
            Unirse a empresa existente (Operario)
          </label>
        </div>

        {/* Campos Nombre, Apellido, Teléfono (comunes a ambos tipos de registro) */}
        <label htmlFor="first-name">Nombre:</label>
        <input
          type="text"
          placeholder="Tu nombre"
          id='first-name'
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          required
        />

        <label htmlFor="last-name">Apellido:</label>
        <input
          type="text"
          placeholder="Tu apellido"
          id='last-name'
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          required
        />

        <label htmlFor="phone-number">Teléfono:</label>
        <input
          type="tel"
          placeholder="Tu número de teléfono"
          id='phone-number'
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          required
        />

        {registrationType === 'admin' ? (
          <>
            <label htmlFor="company-register">Nombre Empresa:</label>
            <input
              type="text"
              placeholder="Nombre de tu Empresa (ej. LinkTex S.A.)"
              id='company-register'
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
            />
          </>
        ) : (
          <>
            <label htmlFor="join-company-id">ID de Empresa:</label>
            <input
              type="text"
              placeholder="ID de la empresa a la que te unes"
              id='join-company-id'
              value={joinCompanyId}
              onChange={(e) => setJoinCompanyId(e.target.value)}
              required
            />
          </>
        )}

        <label htmlFor="register-email">Email:</label>
        <input
          type="email"
          placeholder="Correo electrónico"
          id='register-email'
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label htmlFor="register-password">Contraseña:</label>
        <input
          type="password"
          placeholder="Contraseña (mínimo 6 caracteres)"
          id='register-password'
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" translate='no' disabled={loading}>
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
