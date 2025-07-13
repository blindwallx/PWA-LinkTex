// src/components/LoadingSpinner.tsx
import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontSize: '1.5em',
      color: '#333',
      flexDirection: 'column'
    }}>
      <div style={{
        border: '8px solid #f3f3f3',
        borderTop: '8px solid #007bff',
        borderRadius: '50%',
        width: '60px',
        height: '60px',
        animation: 'spin 1s linear infinite',
        marginBottom: '20px'
      }}></div>
      <p>Cargando...</p>
      {/* Eliminamos el atributo jsx="true" */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default LoadingSpinner;