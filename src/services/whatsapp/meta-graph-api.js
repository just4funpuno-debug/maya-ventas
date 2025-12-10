/**
 * Servicio para interactuar con Meta Graph API
 * FASE 4: Servicio Graph API para obtener datos automáticamente
 * 
 * Este servicio encapsula todas las llamadas a Meta Graph API
 * y puede ser usado desde el frontend o desde Edge Functions.
 */

const GRAPH_API_VERSION = 'v18.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

/**
 * Obtener variables de entorno
 */
function getEnvVars() {
  const metaAppId = import.meta.env.VITE_META_APP_ID || import.meta.env.META_APP_ID;
  const metaAppSecret = import.meta.env.VITE_META_APP_SECRET || import.meta.env.META_APP_SECRET;
  const redirectUri = import.meta.env.VITE_META_OAUTH_REDIRECT_URI || import.meta.env.META_OAUTH_REDIRECT_URI;
  
  return { metaAppId, metaAppSecret, redirectUri };
}

/**
 * Manejar errores de Graph API
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
 * Intercambiar code de OAuth por access_token
 * 
 * @param {string} code - Código de autorización de OAuth
 * @param {string} redirectUri - URI de redirección (opcional, usa env si no se proporciona)
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function exchangeCodeForToken(code, redirectUri = null) {
  try {
    if (!code) {
      return {
        data: null,
        error: {
          error: true,
          message: 'Code es requerido',
          status: 400
        }
      };
    }

    const { metaAppId, metaAppSecret, redirectUri: envRedirectUri } = getEnvVars();
    
    if (!metaAppId || !metaAppSecret) {
      return {
        data: null,
        error: {
          error: true,
          message: 'Faltan variables de entorno: META_APP_ID o META_APP_SECRET',
          status: 500
        }
      };
    }

    const finalRedirectUri = redirectUri || envRedirectUri;
    if (!finalRedirectUri) {
      return {
        data: null,
        error: {
          error: true,
          message: 'Redirect URI es requerido',
          status: 500
        }
      };
    }

    const tokenUrl = `${GRAPH_API_BASE}/oauth/access_token`;
    const params = new URLSearchParams({
      client_id: metaAppId,
      client_secret: metaAppSecret,
      redirect_uri: finalRedirectUri,
      code: code,
    });

    const response = await fetch(`${tokenUrl}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const error = handleGraphApiError(response, 'exchangeCodeForToken');
    if (error) {
      const errorText = await response.text();
      return {
        data: null,
        error: {
          ...error,
          details: errorText.substring(0, 200)
        }
      };
    }

    const data = await response.json();
    
    if (!data.access_token) {
      return {
        data: null,
        error: {
          error: true,
          message: 'La respuesta de Meta no contiene access_token',
          status: 400,
          details: JSON.stringify(data)
        }
      };
    }

    return { data, error: null };
  } catch (err) {
    console.error('[exchangeCodeForToken] Error:', err);
    return {
      data: null,
      error: {
        error: true,
        message: `Error al intercambiar code: ${err.message}`,
        status: 500,
        details: err.stack
      }
    };
  }
}

/**
 * Obtener información del usuario de Meta
 * 
 * @param {string} accessToken - Token de acceso de OAuth
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function getUserInfo(accessToken) {
  try {
    if (!accessToken) {
      return {
        data: null,
        error: {
          error: true,
          message: 'Access token es requerido',
          status: 400
        }
      };
    }

    const response = await fetch(
      `${GRAPH_API_BASE}/me?fields=id,name,email&access_token=${accessToken}`
    );

    const error = handleGraphApiError(response, 'getUserInfo');
    if (error) {
      const errorText = await response.text();
      return {
        data: null,
        error: {
          ...error,
          details: errorText.substring(0, 200)
        }
      };
    }

    const data = await response.json();
    return { data, error: null };
  } catch (err) {
    console.error('[getUserInfo] Error:', err);
    return {
      data: null,
      error: {
        error: true,
        message: `Error al obtener información del usuario: ${err.message}`,
        status: 500
      }
    };
  }
}

/**
 * Obtener Business Accounts del usuario
 * 
 * @param {string} accessToken - Token de acceso de OAuth
 * @returns {Promise<{data: Array|null, error: Object|null}>}
 */
export async function getBusinessAccounts(accessToken) {
  try {
    if (!accessToken) {
      return {
        data: null,
        error: {
          error: true,
          message: 'Access token es requerido',
          status: 400
        }
      };
    }

    const response = await fetch(
      `${GRAPH_API_BASE}/me/businesses?access_token=${accessToken}`
    );

    const error = handleGraphApiError(response, 'getBusinessAccounts');
    if (error) {
      const errorText = await response.text();
      return {
        data: null,
        error: {
          ...error,
          details: errorText.substring(0, 200)
        }
      };
    }

    const result = await response.json();
    
    if (!result.data || !Array.isArray(result.data)) {
      return {
        data: null,
        error: {
          error: true,
          message: 'Respuesta inválida de Graph API',
          status: 400,
          details: JSON.stringify(result)
        }
      };
    }

    return { data: result.data, error: null };
  } catch (err) {
    console.error('[getBusinessAccounts] Error:', err);
    return {
      data: null,
      error: {
        error: true,
        message: `Error al obtener Business Accounts: ${err.message}`,
        status: 500
      }
    };
  }
}

/**
 * Obtener Phone Numbers de un Business Account
 * 
 * @param {string} businessAccountId - ID del Business Account
 * @param {string} accessToken - Token de acceso de OAuth
 * @returns {Promise<{data: Array|null, error: Object|null}>}
 */
export async function getPhoneNumbers(businessAccountId, accessToken) {
  try {
    if (!businessAccountId || !accessToken) {
      return {
        data: null,
        error: {
          error: true,
          message: 'Business Account ID y Access Token son requeridos',
          status: 400
        }
      };
    }

    const response = await fetch(
      `${GRAPH_API_BASE}/${businessAccountId}/owned_phone_numbers?access_token=${accessToken}`
    );

    const error = handleGraphApiError(response, 'getPhoneNumbers');
    if (error) {
      const errorText = await response.text();
      return {
        data: null,
        error: {
          ...error,
          details: errorText.substring(0, 200)
        }
      };
    }

    const result = await response.json();
    
    if (!result.data || !Array.isArray(result.data)) {
      return {
        data: null,
        error: {
          error: true,
          message: 'Respuesta inválida de Graph API',
          status: 400,
          details: JSON.stringify(result)
        }
      };
    }

    return { data: result.data, error: null };
  } catch (err) {
    console.error('[getPhoneNumbers] Error:', err);
    return {
      data: null,
      error: {
        error: true,
        message: `Error al obtener Phone Numbers: ${err.message}`,
        status: 500
      }
    };
  }
}

/**
 * Obtener detalles de un Phone Number
 * 
 * @param {string} phoneNumberId - ID del Phone Number
 * @param {string} accessToken - Token de acceso de OAuth
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function getPhoneNumberDetails(phoneNumberId, accessToken) {
  try {
    if (!phoneNumberId || !accessToken) {
      return {
        data: null,
        error: {
          error: true,
          message: 'Phone Number ID y Access Token son requeridos',
          status: 400
        }
      };
    }

    const fields = 'display_phone_number,verified_name,code_verification_status,quality_rating';
    const response = await fetch(
      `${GRAPH_API_BASE}/${phoneNumberId}?fields=${fields}&access_token=${accessToken}`
    );

    const error = handleGraphApiError(response, 'getPhoneNumberDetails');
    if (error) {
      const errorText = await response.text();
      return {
        data: null,
        error: {
          ...error,
          details: errorText.substring(0, 200)
        }
      };
    }

    const data = await response.json();
    return { data, error: null };
  } catch (err) {
    console.error('[getPhoneNumberDetails] Error:', err);
    return {
      data: null,
      error: {
        error: true,
        message: `Error al obtener detalles del Phone Number: ${err.message}`,
        status: 500
      }
    };
  }
}

/**
 * Verificar estado de coexistencia de un Phone Number
 * 
 * @param {string} phoneNumberId - ID del Phone Number
 * @param {string} accessToken - Token de acceso de OAuth
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function checkCoexistenceStatus(phoneNumberId, accessToken) {
  try {
    const { data, error } = await getPhoneNumberDetails(phoneNumberId, accessToken);
    
    if (error) {
      return { data: null, error };
    }

    const verificationStatus = data.code_verification_status;
    const coexistenceStatus = verificationStatus === 'VERIFIED' ? 'connected' : 'pending';
    
    return {
      data: {
        coexistence_status: coexistenceStatus,
        verification_status: verificationStatus,
        needs_action: coexistenceStatus === 'pending',
        verified_at: coexistenceStatus === 'connected' ? new Date().toISOString() : null
      },
      error: null
    };
  } catch (err) {
    console.error('[checkCoexistenceStatus] Error:', err);
    return {
      data: null,
      error: {
        error: true,
        message: `Error al verificar coexistencia: ${err.message}`,
        status: 500
      }
    };
  }
}

/**
 * Obtener todos los datos necesarios para crear una cuenta WhatsApp
 * (Función de conveniencia que combina múltiples llamadas)
 * 
 * @param {string} accessToken - Token de acceso de OAuth
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function getWhatsAppAccountData(accessToken) {
  try {
    if (!accessToken) {
      return {
        data: null,
        error: {
          error: true,
          message: 'Access token es requerido',
          status: 400
        }
      };
    }

    // Paso 1: Obtener información del usuario
    const { data: userInfo, error: userError } = await getUserInfo(accessToken);
    if (userError) {
      console.warn('[getWhatsAppAccountData] No se pudo obtener user info:', userError);
    }

    // Paso 2: Obtener Business Accounts
    const { data: businesses, error: businessesError } = await getBusinessAccounts(accessToken);
    if (businessesError || !businesses || businesses.length === 0) {
      return {
        data: null,
        error: businessesError || {
          error: true,
          message: 'No se encontraron Business Accounts',
          status: 400
        }
      };
    }

    const businessAccountId = businesses[0].id;

    // Paso 3: Obtener Phone Numbers
    const { data: phoneNumbers, error: phoneNumbersError } = await getPhoneNumbers(businessAccountId, accessToken);
    if (phoneNumbersError || !phoneNumbers || phoneNumbers.length === 0) {
      return {
        data: null,
        error: phoneNumbersError || {
          error: true,
          message: 'No se encontraron Phone Numbers',
          status: 400
        }
      };
    }

    const phoneNumber = phoneNumbers[0];
    const phoneNumberId = phoneNumber.id;

    // Paso 4: Obtener detalles del Phone Number
    const { data: phoneDetails, error: phoneDetailsError } = await getPhoneNumberDetails(phoneNumberId, accessToken);
    if (phoneDetailsError) {
      console.warn('[getWhatsAppAccountData] No se pudieron obtener detalles del Phone Number:', phoneDetailsError);
    }

    // Paso 5: Verificar coexistencia
    const { data: coexistenceData, error: coexistenceError } = await checkCoexistenceStatus(phoneNumberId, accessToken);
    if (coexistenceError) {
      console.warn('[getWhatsAppAccountData] No se pudo verificar coexistencia:', coexistenceError);
    }

    // Combinar todos los datos
    const result = {
      meta_user_id: userInfo?.id || null,
      business_account_id: businessAccountId,
      phone_number_id: phoneNumberId,
      phone_number: phoneDetails?.display_phone_number || phoneNumber.display_phone_number || phoneNumber.phone_number || null,
      display_name: phoneDetails?.verified_name || phoneNumber.verified_name || phoneNumber.display_phone_number || null,
      coexistence: coexistenceData || {
        coexistence_status: 'pending',
        verification_status: null,
        needs_action: true,
        verified_at: null
      }
    };

    return { data: result, error: null };
  } catch (err) {
    console.error('[getWhatsAppAccountData] Error:', err);
    return {
      data: null,
      error: {
        error: true,
        message: `Error al obtener datos de WhatsApp: ${err.message}`,
        status: 500
      }
    };
  }
}

