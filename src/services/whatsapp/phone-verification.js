/**
 * Servicio para verificar números de teléfono con código de 6 dígitos
 * FASE 1: Servicio Backend de Verificación
 * 
 * Este servicio maneja la verificación de códigos de 6 dígitos para coexistencia
 * de WhatsApp Business Cloud API mediante Meta Graph API.
 */

const GRAPH_API_VERSION = 'v18.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

/**
 * Validar formato de código (6 dígitos numéricos)
 * @param {string} code - Código a validar
 * @returns {boolean} - true si el código es válido
 */
function isValidCodeFormat(code) {
  if (typeof code !== 'string' && typeof code !== 'number') {
    return false;
  }
  
  // Convertir a string si es número
  const codeStr = String(code).trim();
  
  // Debe ser exactamente 6 dígitos
  return /^\d{6}$/.test(codeStr);
}

/**
 * Manejar errores de Graph API
 * @param {Response} response - Respuesta de fetch
 * @param {string} context - Contexto de la operación
 * @returns {Object|null} - Objeto de error o null si no hay error
 */
function handleGraphApiError(response, context) {
  if (!response.ok) {
    return {
      error: true,
      message: `Error en ${context}: ${response.status} ${response.statusText}`,
      status: response.status,
      details: null
    };
  }
  return null;
}

/**
 * Procesar respuesta de error de Graph API
 * @param {Object} errorData - Datos de error de la API
 * @returns {Object} - Objeto de error procesado
 */
function processGraphApiError(errorData) {
  const errorCode = errorData?.error?.code;
  const errorMessage = errorData?.error?.message || 'Error desconocido';
  const errorType = errorData?.error?.type || 'UnknownError';

  // Verificar errores específicos en orden de prioridad
  
  // 1. Código expirado (verificar primero para evitar confusión con "invalid")
  if (errorMessage.includes('expired') || errorMessage.includes('Expired')) {
    return {
      success: false,
      error: 'El código ha expirado. Por favor solicita un nuevo código.',
      errorCode: errorCode,
      errorType: errorType
    };
  }

  // 2. Permisos
  if (errorCode === 10 || errorMessage.includes('Permission') || errorMessage.includes('permission')) {
    return {
      success: false,
      error: 'No tienes permisos para verificar este número. Verifica tu access token.',
      errorCode: errorCode,
      errorType: errorType
    };
  }

  // 3. Código inválido (verificar después de expired para evitar falsos positivos)
  if (errorCode === 190 || errorMessage.includes('Invalid') || errorMessage.includes('invalid')) {
    return {
      success: false,
      error: 'Código inválido. Por favor verifica el código e intenta de nuevo.',
      errorCode: errorCode,
      errorType: errorType
    };
  }

  // Error genérico
  return {
    success: false,
    error: errorMessage,
    errorCode: errorCode,
    errorType: errorType
  };
}

/**
 * Verificar código de 6 dígitos
 * 
 * @param {string} phoneNumberId - ID del número de teléfono de Meta Graph API
 * @param {string} accessToken - Access token de Meta (Bearer token)
 * @param {string|number} code - Código de 6 dígitos recibido en WhatsApp Business
 * @returns {Promise<{success: boolean, error?: string, errorCode?: number, errorType?: string}>}
 * 
 * @example
 * const result = await verifyCode('123456789', 'EAAR0MG...', '123456');
 * if (result.success) {
 *   console.log('Código verificado exitosamente');
 * } else {
 *   console.error('Error:', result.error);
 * }
 */
export async function verifyCode(phoneNumberId, accessToken, code) {
  try {
    // Validar parámetros requeridos
    if (!phoneNumberId || typeof phoneNumberId !== 'string') {
      return {
        success: false,
        error: 'Phone Number ID es requerido y debe ser un string'
      };
    }

    if (!accessToken || typeof accessToken !== 'string') {
      return {
        success: false,
        error: 'Access Token es requerido y debe ser un string'
      };
    }

    if (!code) {
      return {
        success: false,
        error: 'Código de verificación es requerido'
      };
    }

    // Validar formato del código (6 dígitos)
    if (!isValidCodeFormat(code)) {
      return {
        success: false,
        error: 'El código debe ser de 6 dígitos numéricos'
      };
    }

    // Normalizar código a string (por si viene como número)
    const codeStr = String(code).trim();

    // Construir URL del endpoint
    const url = `${GRAPH_API_BASE}/${phoneNumberId}/verify_code`;

    console.log('[Phone Verification] Verificando código:', {
      phoneNumberId,
      url: url.replace(accessToken, '***'),
      codeLength: codeStr.length
    });

    // Realizar petición a Graph API
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        code: codeStr
      })
    });

    // Parsear respuesta
    const data = await response.json();

    // Manejar errores HTTP
    if (!response.ok) {
      console.error('[Phone Verification] Error en respuesta:', {
        status: response.status,
        statusText: response.statusText,
        error: data.error
      });

      return processGraphApiError(data);
    }

    // Verificar respuesta exitosa
    if (data.success === true) {
      console.log('[Phone Verification] ✅ Código verificado exitosamente');
      return {
        success: true
      };
    }

    // Respuesta inesperada (sin success ni error claro)
    console.warn('[Phone Verification] Respuesta inesperada:', data);
    return {
      success: false,
      error: 'Respuesta inesperada del servidor. Por favor intenta de nuevo.'
    };

  } catch (error) {
    // Manejar errores de red u otros errores
    console.error('[Phone Verification] Error verificando código:', error);
    
    // Distinguir entre errores de red y otros errores
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return {
        success: false,
        error: 'Error de conexión. Por favor verifica tu conexión a internet e intenta de nuevo.'
      };
    }

    return {
      success: false,
      error: error.message || 'Error desconocido al verificar código'
    };
  }
}

/**
 * Registrar número de teléfono después de verificación exitosa
 * 
 * @param {string} phoneNumberId - ID del número de teléfono de Meta Graph API
 * @param {string} accessToken - Access token de Meta (Bearer token)
 * @param {string|number} pin - PIN de 6 dígitos (mismo código usado en verifyCode)
 * @returns {Promise<{success: boolean, error?: string, errorCode?: number, errorType?: string}>}
 * 
 * @example
 * const result = await registerPhoneNumber('123456789', 'EAAR0MG...', '123456');
 * if (result.success) {
 *   console.log('Número registrado exitosamente');
 * } else {
 *   console.error('Error:', result.error);
 * }
 */
export async function registerPhoneNumber(phoneNumberId, accessToken, pin) {
  try {
    // Validar parámetros requeridos
    if (!phoneNumberId || typeof phoneNumberId !== 'string') {
      return {
        success: false,
        error: 'Phone Number ID es requerido y debe ser un string'
      };
    }

    if (!accessToken || typeof accessToken !== 'string') {
      return {
        success: false,
        error: 'Access Token es requerido y debe ser un string'
      };
    }

    if (!pin) {
      return {
        success: false,
        error: 'PIN es requerido'
      };
    }

    // Validar formato del PIN (6 dígitos)
    if (!isValidCodeFormat(pin)) {
      return {
        success: false,
        error: 'El PIN debe ser de 6 dígitos numéricos'
      };
    }

    // Normalizar PIN a string (por si viene como número)
    const pinStr = String(pin).trim();

    // Construir URL del endpoint
    const url = `${GRAPH_API_BASE}/${phoneNumberId}/register`;

    console.log('[Phone Verification] Registrando número:', {
      phoneNumberId,
      url: url.replace(accessToken, '***'),
      pinLength: pinStr.length
    });

    // Realizar petición a Graph API
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        pin: pinStr
      })
    });

    // Parsear respuesta
    const data = await response.json();

    // Manejar errores HTTP
    if (!response.ok) {
      console.error('[Phone Verification] Error en registro:', {
        status: response.status,
        statusText: response.statusText,
        error: data.error
      });

      return processGraphApiError(data);
    }

    // Verificar respuesta exitosa
    if (data.success === true) {
      console.log('[Phone Verification] ✅ Número registrado exitosamente');
      return {
        success: true
      };
    }

    // Respuesta inesperada (sin success ni error claro)
    console.warn('[Phone Verification] Respuesta inesperada en registro:', data);
    return {
      success: false,
      error: 'Respuesta inesperada del servidor. Por favor intenta de nuevo.'
    };

  } catch (error) {
    // Manejar errores de red u otros errores
    console.error('[Phone Verification] Error registrando número:', error);
    
    // Distinguir entre errores de red y otros errores
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return {
        success: false,
        error: 'Error de conexión. Por favor verifica tu conexión a internet e intenta de nuevo.'
      };
    }

    return {
      success: false,
      error: error.message || 'Error desconocido al registrar número'
    };
  }
}

/**
 * Función completa: Verificar código y registrar número
 * 
 * Esta función combina verifyCode() y registerPhoneNumber() en un solo flujo.
 * Primero verifica el código y luego registra el número si la verificación es exitosa.
 * 
 * @param {string} phoneNumberId - ID del número de teléfono de Meta Graph API
 * @param {string} accessToken - Access token de Meta (Bearer token)
 * @param {string|number} code - Código de 6 dígitos recibido en WhatsApp Business
 * @returns {Promise<{success: boolean, error?: string, verified?: boolean, registered?: boolean, errorCode?: number, errorType?: string}>}
 * 
 * @example
 * const result = await verifyAndRegisterPhoneNumber('123456789', 'EAAR0MG...', '123456');
 * if (result.success) {
 *   console.log('Código verificado y número registrado exitosamente');
 * } else {
 *   console.error('Error:', result.error);
 * }
 */
export async function verifyAndRegisterPhoneNumber(phoneNumberId, accessToken, code) {
  try {
    // Paso 1: Verificar código
    console.log('[Phone Verification] Iniciando verificación y registro...');
    
    const verifyResult = await verifyCode(phoneNumberId, accessToken, code);
    
    if (!verifyResult.success) {
      // Si la verificación falla, retornar error inmediatamente
      console.error('[Phone Verification] ❌ Verificación fallida:', verifyResult.error);
      return {
        success: false,
        error: verifyResult.error,
        verified: false,
        registered: false,
        errorCode: verifyResult.errorCode,
        errorType: verifyResult.errorType
      };
    }

    console.log('[Phone Verification] ✅ Código verificado. Procediendo a registrar número...');

    // Paso 2: Registrar número (usar el mismo código como PIN)
    const registerResult = await registerPhoneNumber(phoneNumberId, accessToken, code);
    
    if (!registerResult.success) {
      // Si el registro falla, retornar error (pero la verificación ya fue exitosa)
      console.error('[Phone Verification] ⚠️ Verificación exitosa pero registro fallido:', registerResult.error);
      return {
        success: false,
        error: registerResult.error,
        verified: true, // Verificación fue exitosa
        registered: false, // Pero registro falló
        errorCode: registerResult.errorCode,
        errorType: registerResult.errorType
      };
    }

    // Ambos pasos exitosos
    console.log('[Phone Verification] ✅✅ Verificación y registro completados exitosamente');
    return {
      success: true,
      verified: true,
      registered: true
    };

  } catch (error) {
    // Manejar errores no esperados
    console.error('[Phone Verification] Error en verifyAndRegisterPhoneNumber:', error);
    return {
      success: false,
      error: error.message || 'Error desconocido al verificar y registrar número',
      verified: false,
      registered: false
    };
  }
}

export {
  isValidCodeFormat,
  handleGraphApiError,
  processGraphApiError
};

