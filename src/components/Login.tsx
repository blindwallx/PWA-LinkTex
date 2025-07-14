// src/components/Login.tsx
import React, { useState } from 'react';
import { auth } from '../firebaseConfig';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/ltcadena2.png';
import './Login.css';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResetMessage(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log('Usuario ha iniciado sesión');
      // AÑADIR ESTA LÍNEA: Navegar explícitamente al dashboard después de un login exitoso
      navigate('/'); // Redirige a la ruta principal, que está protegida y mostrará el Dashboard
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
        console.error("Error al iniciar sesión:", err.message);
      } else {
        setError("Ocurrió un error inesperado al iniciar sesión.");
        console.error("Error al iniciar sesión:", err);
      }
    }
  };

  const handlePasswordReset = async () => {
    setError(null);
    setResetMessage(null);
    if (!email) {
      setError("Por favor, ingresa tu email para restablecer la contraseña.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setResetMessage("Se ha enviado un enlace para restablecer la contraseña a tu correo electrónico.");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
        console.error("Error al restablecer contraseña:", err.message);
      } else {
        setError("Ocurrió un error inesperado al restablecer la contraseña.");
        console.error("Error al restablecer contraseña:", err);
      }
    }
  };

  return (
    <div className="register-container">
      <img src={logo} className="myLogo" />
      <h2>Iniciar Sesión</h2>
      <form onSubmit={handleLogin} className="register-form">
        <div className="form-group">
          <label htmlFor="login-email">Email:</label>
          <input
            type="email"
            placeholder="Correo electrónico"
            id="login-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="login-password">Contraseña:</label>
          <input
            type="password"
            placeholder="Contraseña"
            id="login-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className="error-message">{error}</p>}
        {resetMessage && <p className="success-message">{resetMessage}</p>}
        <button type="submit" className="auth-button primary">Iniciar Sesión</button>
        <p className="forgot-password">
          <a href="#" onClick={handlePasswordReset}>¿Olvidaste tu contraseña?</a>
        </p>
      </form>
      <p className="auth-switch-link">
        ¿No tienes una cuenta? <a href="#" onClick={() => navigate('/register')}>Regístrate aquí</a>
      </p>
    </div>
  );
};

export default Login;