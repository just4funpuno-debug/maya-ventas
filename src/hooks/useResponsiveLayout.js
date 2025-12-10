/**
 * Hook para calcular layout responsive
 * FASE 2: SUBFASE 2.2 - Cálculo de layout óptimo
 */

import { useMemo } from 'react';
import { useWindowSize } from './useWindowSize';

// Breakpoints personalizados
const BREAKPOINTS = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

// Anchos de lista de conversaciones según breakpoint (FIJOS - no cambian según contenido)
const CONVERSATION_LIST_WIDTHS = {
  xs: { width: '100%', minWidth: '100%', maxWidth: '100%' },      // Móvil: fullscreen
  sm: { width: '320px', minWidth: '320px', maxWidth: '320px' },   // Tablet pequeña: 320px fijo
  md: { width: '350px', minWidth: '350px', maxWidth: '350px' },   // Tablet: 350px fijo
  lg: { width: '380px', minWidth: '380px', maxWidth: '380px' },   // Laptop: 380px fijo
  xl: { width: '400px', minWidth: '400px', maxWidth: '400px' },   // Desktop: 400px fijo
  '2xl': { width: '420px', minWidth: '420px', maxWidth: '420px' }, // Desktop grande: 420px fijo
};

// Configuración de chat window
const CHAT_WINDOW_CONFIG = {
  minWidth: '300px',   // Mínimo para legibilidad
  maxWidth: '1200px',   // Máximo en pantallas muy grandes (centrado)
};

/**
 * Obtener breakpoint actual basado en el ancho
 * @param {number} width - Ancho de la ventana
 * @returns {string} Breakpoint actual
 */
function getCurrentBreakpoint(width) {
  if (width >= BREAKPOINTS['2xl']) return '2xl';
  if (width >= BREAKPOINTS.xl) return 'xl';
  if (width >= BREAKPOINTS.lg) return 'lg';
  if (width >= BREAKPOINTS.md) return 'md';
  if (width >= BREAKPOINTS.sm) return 'sm';
  return 'xs';
}

/**
 * Hook para calcular layout responsive
 * @returns {Object} Configuración de layout responsive
 */
export function useResponsiveLayout() {
  const { width, height } = useWindowSize();

  const layout = useMemo(() => {
    const breakpoint = getCurrentBreakpoint(width);
    const isMobile = breakpoint === 'xs';
    const isTablet = breakpoint === 'sm' || breakpoint === 'md';
    const isDesktop = breakpoint === 'lg' || breakpoint === 'xl' || breakpoint === '2xl';

    // Configuración de lista de conversaciones
    const conversationList = CONVERSATION_LIST_WIDTHS[breakpoint] || CONVERSATION_LIST_WIDTHS.xs;

    // Configuración de chat window
    const chatWindow = {
      ...CHAT_WINDOW_CONFIG,
      // En pantallas muy grandes, centrar el contenido
      maxWidth: breakpoint === '2xl' ? '1400px' : CHAT_WINDOW_CONFIG.maxWidth,
    };

    return {
      breakpoint,
      width,
      height,
      isMobile,
      isTablet,
      isDesktop,
      conversationList,
      chatWindow,
      // Padding y espaciado según tamaño
      padding: {
        xs: 'p-2',
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-4',
        xl: 'p-5',
        '2xl': 'p-6',
      }[breakpoint] || 'p-4',
    };
  }, [width, height]);

  return layout;
}

