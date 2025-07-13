import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { auth } from '../firebaseConfig';
import { signOut } from 'firebase/auth';
import './Navbar.css';

// Importa tu logo. Ajusta la ruta si es necesario.
import logo from '../assets/ltcadena2.png'; // <-- ¡Asegúrate de que esta ruta sea correcta!

// Importa el icono de React Icons. Puedes elegir el que más te guste,
// por ejemplo, de la librería Fa (Font Awesome).
// Si no tienes React Icons instalado, primero ejecuta: npm install react-icons
import { FaSignOutAlt } from 'react-icons/fa'; // O MdLogout, IoLogOut, etc.

interface NavbarProps {
  userRole: string | null; // Define la prop userRole
}

const Navbar: React.FC<NavbarProps> = ({ userRole }) => { // Acepta userRole
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const navbarRef = useRef<HTMLElement>(null);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log('Usuario ha cerrado sesión desde Navbar');
      navigate('/login'); // Redirige al login después de cerrar sesión
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Error al cerrar sesión desde Navbar:', error.message);
      } else {
        console.error('Error al cerrar sesión desde Navbar:', error);
      }
    }
  };

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navbarRef.current && !navbarRef.current.contains(event.target as Node) && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <nav className="navbar" ref={navbarRef}>
      <div className="navbar-left">
        <div className="navbar-brand">
          {/* Reemplazamos el texto "LinkTex" por la imagen del logo */}
          <NavLink to="/">
            <img src={logo} alt="LinkTex Logo" className="navbar-logo" />
          </NavLink>
        </div>
        <button className="hamburger-menu" onClick={toggleMenu}>
          <span className="bar"></span>
          <span className="bar"></span>
          <span className="bar"></span>
        </button>
      </div>

      <ul className={`navbar-nav ${isOpen ? 'open' : ''}`}>
        <li className="nav-item">
          <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => setIsOpen(false)} end translate='no'>Dashboard</NavLink>
        </li>

        {userRole === 'admin' && (
          <li className="nav-item">
            <NavLink to="/product-management" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => setIsOpen(false)}>Gestión de Productos</NavLink>
          </li>
        )}

        <li className="nav-item">
          {/* Reemplazamos el texto "Cerrar Sesión" por el icono */}
          <button onClick={handleLogout} className="nav-logout-button">
            <FaSignOutAlt className="logout-icon" /> {/* Icono de Font Awesome */}
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default Navbar;