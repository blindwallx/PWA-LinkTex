// src/App.tsx
//import React from 'react';
// Modifica esta línea:
import { BrowserRouter as Router } from 'react-router-dom'; // <--- CAMBIO AQUÍ
import AuthWrapper from './components/AuthWrapper';
import './App.css';

function App() {
  return (
    <div className="App">
      <Router>
        <AuthWrapper />
      </Router>
    </div>
  );
}

export default App;