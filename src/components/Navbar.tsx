import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { auth } from '../firebaseConfig';
import { signOut } from 'firebase/auth';
import './Navbar.css';

import logo from '../assets/ltcadena2.png';
import { FaSignOutAlt, FaUserAlt } from 'react-icons/fa'; // Importa FaUserAlt

interface NavbarProps {
  userRole: string | null;
}

const Navbar: React.FC<NavbarProps> = ({ userRole }) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const navbarRef = useRef<HTMLElement>(null);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log('Usuario ha cerrado sesión desde Navbar');
      navigate('/login');
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
          <NavLink to="/">
            <img src={logo} alt="LinkTex Logo" className="bar-logo" />
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

        {/* NUEVO ENLACE AL PERFIL */}
        <li className="nav-item">
          <NavLink to="/profile" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => setIsOpen(false)} aria-label="Mi Perfil" title="Mi Perfil">
            <FaUserAlt className="profile-icon" /> {/* Icono de perfil */}
          </NavLink>
        </li>

        <li className="nav-item">
          <button onClick={handleLogout} className="nav-logout-button">
            <FaSignOutAlt className="logout-icon" />
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default Navbar;