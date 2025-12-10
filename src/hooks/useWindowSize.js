/**
 * Hook para detectar tamaño de ventana
 * FASE 2: SUBFASE 2.1 - Detección de tamaño
 */

import { useState, useEffect } from 'react';

/**
 * Hook para obtener el tamaño actual de la ventana
 * @returns {{width: number, height: number}} Ancho y alto de la ventana
 */
export function useWindowSize() {
  // Inicializar con valores por defecto razonables si window no está disponible
  const getInitialSize = () => {
    if (typeof window !== 'undefined') {
      return {
        width: window.innerWidth,
        height: window.innerHeight,
      };
    }
    // Valores por defecto para SSR o inicialización
    return {
      width: 1024, // Laptop estándar
      height: 768,
    };
  };

  const [windowSize, setWindowSize] = useState(getInitialSize);

  useEffect(() => {
    // Función para actualizar el tamaño
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    // Agregar listener
    window.addEventListener('resize', handleResize);

    // Llamar una vez para obtener el tamaño inicial
    handleResize();

    // Limpiar listener al desmontar
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
}

