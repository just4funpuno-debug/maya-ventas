import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ToastProvider } from './components/ToastProvider.jsx'
import { validateEnv } from './utils/envValidation'

// Validar variables de entorno al inicio de la aplicación
const envValidation = validateEnv();
if (!envValidation.isValid) {
  // Si faltan variables críticas, no continuar
  // La validación ya mostró los errores en consola y UI (en desarrollo)
  console.error('❌ La aplicación no puede iniciar sin las variables de entorno requeridas.');
  // En producción, podríamos mostrar un error más amigable
  if (import.meta.env.PROD) {
    document.body.innerHTML = `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        background: #1a2430;
        color: white;
        font-family: system-ui, -apple-system, sans-serif;
        padding: 2rem;
        text-align: center;
      ">
        <div>
          <h1 style="color: #dc2626; margin-bottom: 1rem;">⚠️ Error de Configuración</h1>
          <p>La aplicación no puede iniciar porque faltan variables de entorno requeridas.</p>
          <p style="margin-top: 1rem; color: #9ca3af; font-size: 0.9rem;">
            Por favor, contacta al administrador del sistema.
          </p>
        </div>
      </div>
    `;
  }
} else {
  // Variables válidas, continuar con el renderizado normal
  createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <ToastProvider>
        <App />
      </ToastProvider>
    </React.StrictMode>
  )
}
