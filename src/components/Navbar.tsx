import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { auth } from '../firebaseConfig';
import { signOut } from 'firebase/auth';
import './Navbar.css';

import logo from '../assets/ltcadena2.png';
import { FaSignOutAlt, FaUserAlt, FaUsersCog, FaChevronDown } from 'react-icons/fa'; // Importa FaUsersCog y FaChevronDown
import { FaShirt } from 'react-icons/fa6';

interface NavbarProps {
  userRole: string | null;
}

const Navbar: React.FC<NavbarProps> = ({ userRole }) => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false); // Estado para el menú hamburguesa principal
  const [isGestionOpen, setIsGestionOpen] = useState(false); // Nuevo estado para el submenú de Gestión
  const navbarRef = useRef<HTMLElement>(null);
  const gestionDropdownRef = useRef<HTMLLIElement>(null); // Referencia para el elemento LI del menú de Gestión

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
    setIsMenuOpen(!isMenuOpen);
    if (isGestionOpen) setIsGestionOpen(false); // Cerrar submenú de gestión si el menú principal se abre/cierra
  };

  const toggleGestionMenu = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevenir el comportamiento por defecto del enlace
    setIsGestionOpen(!isGestionOpen);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Cerrar el menú principal si se hace clic fuera
      if (navbarRef.current && !navbarRef.current.contains(event.target as Node) && isMenuOpen) {
        setIsMenuOpen(false);
      }
      // Cerrar el submenú de Gestión si se hace clic fuera de él
      if (gestionDropdownRef.current && !gestionDropdownRef.current.contains(event.target as Node) && isGestionOpen) {
        setIsGestionOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen, isGestionOpen]); // Añadir isGestionOpen a las dependencias

  return (
    <nav className="navbar" ref={navbarRef}>
      <div className="navbar-left">
        <div className="navbar-brand">
          <NavLink to="/">
            <img src={logo} alt="LinkTex Logo" className="bar-logo" />
          </NavLink>
        </div>
        <button className="hamburger-menu" onClick={toggleMenu} aria-label="Abrir menú de navegación">
          <span className="bar"></span>
          <span className="bar"></span>
          <span className="bar"></span>
        </button>
      </div>

      <ul className={`navbar-nav ${isMenuOpen ? 'open' : ''}`}>
        <li className="nav-item">
          <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => setIsMenuOpen(false)} end translate='no'>Dashboard</NavLink>
        </li>

        {userRole === 'admin' && (
          <li className="nav-item has-dropdown" ref={gestionDropdownRef}>
            <a href="#" onClick={toggleGestionMenu} className={`nav-link-dropdown ${isGestionOpen ? 'active' : ''}`} aria-expanded={isGestionOpen}>
              Gestión <FaChevronDown className={`dropdown-arrow ${isGestionOpen ? 'open' : ''}`} />
            </a>
            <ul className={`dropdown-menu ${isGestionOpen ? 'open' : ''}`}>
              <li className="dropdown-item">
                <NavLink to="/product-management" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => { setIsMenuOpen(false); setIsGestionOpen(false); }}>Prendas<FaShirt className="management-icon" /></NavLink>
              </li>
              <li className="dropdown-item">
                <NavLink to="/operarios-management" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => { setIsMenuOpen(false); setIsGestionOpen(false); }} aria-label="Gestión de Operarios" title="Gestión de Operarios">
                  Personal <FaUsersCog className="management-icon" />
                </NavLink>
              </li>
            </ul>
          </li>
        )}

        <li className="nav-item">
          <NavLink to="/profile" className={({ isActive }) => isActive ? 'active' : ''} onClick={() => setIsMenuOpen(false)} aria-label="Mi Perfil" title="Mi Perfil">
            <FaUserAlt className="profile-icon" /> Mi Perfil
          </NavLink>
        </li>

        <li className="nav-item">
          <button onClick={handleLogout} className="nav-logout-button">
            <FaSignOutAlt className="logout-icon" /> Cerrar Sesión
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default Navbar;