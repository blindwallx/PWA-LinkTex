// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Esto permite que el servidor sea accesible desde otras IPs en la red
    port: 5173, // Asegúrate de que este es el puerto correcto
  }
});