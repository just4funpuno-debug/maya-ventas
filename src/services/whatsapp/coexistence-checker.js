/**
 * Servicio para verificar estado de coexistencia de WhatsApp
 * FASE 6: Verificación de coexistencia y obtención de QR
 * 
 * Este servicio verifica el estado de coexistencia de un número de WhatsApp
 * y obtiene el QR code si es necesario escanearlo.
 */

import { getPhoneNumberDetails } from './meta-graph-api';

/**
 * Verificar estado de coexistencia de un número de WhatsApp
 * @param {string} phoneNumberId - ID del número de teléfono
 * @param {string} accessToken - Access token de Meta
 * @returns {Promise<{status: 'pending'|'connected'|'failed', qrUrl: string|null, needsAction: boolean}>}
 */
export async function checkCoexistenceStatus(phoneNumberId, accessToken) {
  try {
    if (!phoneNumberId || !accessToken) {
      throw new Error('Phone Number ID y Access Token son requeridos');
    }

    // Obtener detalles del número incluyendo code_verification_status
    const { data: details, error: detailsError } = await getPhoneNumberDetails(
      phoneNumberId,
      accessToken
    );

    if (detailsError || !details) {
      return {
        status: 'failed',
        qrUrl: null,
        needsAction: true,
        error: detailsError?.message || 'No se pudieron obtener los detalles del número'
      };
    }

    const verificationStatus = details.code_verification_status;

    if (verificationStatus === 'VERIFIED') {
      return {
        status: 'connected',
        qrUrl: null,
        needsAction: false
      };
    }

    // Si no está verificado, necesita acción (escanear QR)
    // Nota: Meta generalmente no proporciona el QR directamente via API
    // El QR se obtiene desde Meta Developer Console o se genera manualmente
    // Por ahora retornamos null para qrUrl, pero el modal puede mostrar instrucciones
    return {
      status: 'pending',
      qrUrl: null, // Se llenará desde otra fuente o se mostrará instrucciones
      needsAction: true
    };
  } catch (error) {
    console.error('[Coexistence Checker] Error verificando coexistencia:', error);
    return {
      status: 'failed',
      qrUrl: null,
      needsAction: true,
      error: error.message || 'Error desconocido al verificar coexistencia'
    };
  }
}

/**
 * Polling para verificar coexistencia periódicamente
 * @param {string} phoneNumberId - ID del número de teléfono
 * @param {string} accessToken - Access token de Meta
 * @param {Function} onStatusChange - Callback cuando cambia el estado
 * @param {Object} options - Opciones de polling
 * @param {number} options.interval - Intervalo en ms (default: 5000)
 * @param {number} options.maxAttempts - Máximo de intentos (default: 60 = 5 minutos)
 * @returns {Function} Función para cancelar el polling
 */
export function pollCoexistenceStatus(
  phoneNumberId,
  accessToken,
  onStatusChange,
  options = {}
) {
  const {
    interval = 5000, // 5 segundos
    maxAttempts = 60 // 60 intentos = 5 minutos
  } = options;

  let attempts = 0;
  let isCancelled = false;

  const checkStatus = async () => {
    if (isCancelled || attempts >= maxAttempts) {
      if (attempts >= maxAttempts && !isCancelled) {
        // Timeout alcanzado
        onStatusChange({
          status: 'failed',
          qrUrl: null,
          needsAction: true,
          error: 'Tiempo de espera agotado. Por favor, intenta nuevamente.'
        });
      }
      return;
    }

    attempts++;

    try {
      const result = await checkCoexistenceStatus(phoneNumberId, accessToken);

      // Notificar cambio de estado
      if (onStatusChange) {
        onStatusChange(result);
      }

      // Si está conectado, detener polling
      if (result.status === 'connected') {
        return;
      }

      // Si falló, detener polling
      if (result.status === 'failed' && !result.needsAction) {
        return;
      }

      // Continuar polling si está pendiente
      if (result.status === 'pending' && !isCancelled) {
        setTimeout(checkStatus, interval);
      }
    } catch (error) {
      console.error('[Coexistence Checker] Error en polling:', error);
      
      // Notificar error pero continuar intentando
      if (onStatusChange && attempts < maxAttempts) {
        onStatusChange({
          status: 'pending',
          qrUrl: null,
          needsAction: true,
          error: error.message
        });
        setTimeout(checkStatus, interval);
      } else {
        // Máximo de intentos alcanzado
        onStatusChange({
          status: 'failed',
          qrUrl: null,
          needsAction: true,
          error: 'Error al verificar coexistencia después de múltiples intentos'
        });
      }
    }
  };

  // Iniciar polling
  checkStatus();

  // Retornar función para cancelar
  return () => {
    isCancelled = true;
  };
}

/**
 * Obtener URL del QR code para coexistencia
 * Nota: Meta generalmente no proporciona el QR directamente via API
 * Esta función puede obtener el QR desde otra fuente o generar instrucciones
 * 
 * @param {string} phoneNumberId - ID del número de teléfono
 * @param {string} accessToken - Access token de Meta
 * @returns {Promise<{qrUrl: string|null, instructions: string}>}
 */
export async function getCoexistenceQR(phoneNumberId, accessToken) {
  try {
    // Por ahora, Meta no proporciona el QR directamente via Graph API
    // El QR se obtiene desde Meta Developer Console manualmente
    // O se puede generar usando una librería de QR basada en instrucciones
    
    // Retornar null para qrUrl, pero proporcionar instrucciones
    return {
      qrUrl: null,
      instructions: 'Para obtener el QR code de coexistencia:\n' +
        '1. Ve a Meta Developer Console\n' +
        '2. Selecciona tu App de WhatsApp\n' +
        '3. Ve a WhatsApp > Phone Numbers\n' +
        '4. Selecciona tu número\n' +
        '5. Haz clic en "Use existing number"\n' +
        '6. Escanea el QR que aparece en la pantalla'
    };
  } catch (error) {
    console.error('[Coexistence Checker] Error obteniendo QR:', error);
    return {
      qrUrl: null,
      instructions: 'Error al obtener QR code. Por favor, configura la coexistencia manualmente desde Meta Developer Console.'
    };
  }
}

/**
 * Función de conveniencia para iniciar verificación de coexistencia con polling
 * @param {string} phoneNumberId - ID del número de teléfono
 * @param {string} accessToken - Access token de Meta
 * @param {Function} onStatusChange - Callback cuando cambia el estado
 * @param {Object} options - Opciones de polling
 * @returns {Function} Función para cancelar el polling
 */
export function startCoexistenceVerification(
  phoneNumberId,
  accessToken,
  onStatusChange,
  options = {}
) {
  let cancelPolling = null;

  // Verificar estado inicial
  checkCoexistenceStatus(phoneNumberId, accessToken)
    .then((initialStatus) => {
      if (onStatusChange) {
        onStatusChange(initialStatus);
      }

      // Si ya está conectado, no hacer polling
      if (initialStatus.status === 'connected') {
        return;
      }

      // Si está pendiente, iniciar polling
      if (initialStatus.status === 'pending') {
        cancelPolling = pollCoexistenceStatus(
          phoneNumberId,
          accessToken,
          onStatusChange,
          options
        );
      }
    })
    .catch((error) => {
      console.error('[Coexistence Checker] Error en verificación inicial:', error);
      if (onStatusChange) {
        onStatusChange({
          status: 'failed',
          qrUrl: null,
          needsAction: true,
          error: error.message || 'Error al iniciar verificación'
        });
      }
    });

  // Retornar función de cancelación
  return () => {
    if (cancelPolling) {
      cancelPolling();
    }
  };
}

