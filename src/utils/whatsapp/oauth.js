/**
 * Utilidades para OAuth de Meta
 * FASE 5: Utilidades para conectar con Meta OAuth
 */

/**
 * Generar state único para OAuth (UUID)
 * @returns {string} UUID v4
 */
export function generateOAuthState() {
  // Generar UUID v4 simple
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Construir URL de autorización OAuth de Meta
 * @param {string} state - State único para seguridad CSRF
 * @returns {string} URL de autorización OAuth
 */
export function buildOAuthUrl(state) {
  const metaAppId = import.meta.env.VITE_META_APP_ID || import.meta.env.META_APP_ID;
  
  if (!metaAppId) {
    throw new Error('META_APP_ID no configurado en variables de entorno');
  }

  // Obtener Redirect URI
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL no configurado en variables de entorno');
  }

  // Extraer project reference de la URL
  const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');
  const redirectUri = import.meta.env.VITE_META_OAUTH_REDIRECT_URI || 
    `https://${projectRef}.supabase.co/functions/v1/meta-oauth-callback`;

  // Permisos necesarios para WhatsApp Business
  const scopes = [
    'whatsapp_business_management',
    'whatsapp_business_messaging',
    'business_management'
  ].join(',');

  // Construir URL de autorización
  const authUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth');
  authUrl.searchParams.set('client_id', metaAppId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('scope', scopes);
  authUrl.searchParams.set('response_type', 'code');

  return authUrl.toString();
}

/**
 * Guardar state en localStorage para validación después del callback
 * @param {string} state - State único
 */
export function saveOAuthState(state) {
  try {
    localStorage.setItem('whatsapp_oauth_state', state);
    // Guardar timestamp para expiración (5 minutos)
    localStorage.setItem('whatsapp_oauth_state_timestamp', Date.now().toString());
  } catch (err) {
    console.error('[OAuth] Error guardando state:', err);
  }
}

/**
 * Validar state desde localStorage
 * @param {string} receivedState - State recibido del callback
 * @returns {boolean} true si el state es válido
 */
export function validateOAuthState(receivedState) {
  try {
    const savedState = localStorage.getItem('whatsapp_oauth_state');
    const timestamp = localStorage.getItem('whatsapp_oauth_state_timestamp');
    
    if (!savedState || !timestamp) {
      return false;
    }

    // Verificar expiración (5 minutos)
    const age = Date.now() - parseInt(timestamp, 10);
    if (age > 5 * 60 * 1000) {
      // State expirado
      clearOAuthState();
      return false;
    }

    // Verificar que coincida
    return savedState === receivedState;
  } catch (err) {
    console.error('[OAuth] Error validando state:', err);
    return false;
  }
}

/**
 * Limpiar state de localStorage
 */
export function clearOAuthState() {
  try {
    localStorage.removeItem('whatsapp_oauth_state');
    localStorage.removeItem('whatsapp_oauth_state_timestamp');
  } catch (err) {
    console.error('[OAuth] Error limpiando state:', err);
  }
}

/**
 * Abrir ventana OAuth (popup o redirección)
 * @param {string} oauthUrl - URL de autorización OAuth
 * @param {boolean} usePopup - Si true, abre popup; si false, redirige
 * @returns {Window|null} Referencia a la ventana popup (si usePopup es true)
 */
export function openOAuthWindow(oauthUrl, usePopup = true) {
  if (usePopup) {
    // Abrir popup centrado
    const width = 600;
    const height = 700;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    
    const popup = window.open(
      oauthUrl,
      'MetaOAuth',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );
    
    return popup;
  } else {
    // Redirigir en la misma ventana
    window.location.href = oauthUrl;
    return null;
  }
}

/**
 * Escuchar callback OAuth desde popup
 * El popup redirige al frontend con datos en el hash, luego envía mensaje al parent
 * @param {Window} popup - Referencia a la ventana popup
 * @param {Function} onSuccess - Callback cuando OAuth es exitoso
 * @param {Function} onError - Callback cuando hay error
 * @returns {Function} Función para cancelar el listener
 */
export function listenOAuthCallback(popup, onSuccess, onError) {
  if (!popup) {
    // Si no hay popup, no hay nada que escuchar
    return () => {};
  }

  // Escuchar mensaje desde popup (el popup envía mensaje después de procesar el hash)
  const messageHandler = (event) => {
    // Verificar origen (debe ser desde el mismo origen o Supabase)
    const currentOrigin = window.location.origin;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL;
    
    // Permitir mensajes del mismo origen o desde Supabase
    if (event.origin !== currentOrigin && 
        event.origin !== supabaseUrl?.replace(/\/$/, '') && 
        !event.origin.includes('supabase.co')) {
      console.warn('[OAuth] Mensaje de origen no permitido:', event.origin);
      return;
    }

    // Verificar que el popup aún existe
    if (popup.closed) {
      window.removeEventListener('message', messageHandler);
      return;
    }

    // Procesar mensaje
    if (event.data && event.data.type === 'whatsapp_oauth_callback') {
      window.removeEventListener('message', messageHandler);
      
      if (event.data.success) {
        onSuccess(event.data.data);
      } else {
        onError(event.data.error || { message: 'Error desconocido' });
      }
    }
  };

  window.addEventListener('message', messageHandler);

  // También verificar si el popup se cerró manualmente
  const checkInterval = setInterval(() => {
    if (popup.closed) {
      clearInterval(checkInterval);
      window.removeEventListener('message', messageHandler);
      onError({ message: 'OAuth cancelado por el usuario' });
    }
  }, 1000);

  // También verificar el hash del popup periódicamente (fallback)
  const hashCheckInterval = setInterval(() => {
    try {
      if (popup.closed) {
        clearInterval(hashCheckInterval);
        return;
      }

      // Intentar acceder al hash del popup (puede fallar por CORS)
      try {
        const popupHash = popup.location.hash;
        if (popupHash) {
          // Procesar hash
          if (popupHash.includes('oauth-callback=')) {
            const encodedData = popupHash.split('oauth-callback=')[1];
            const data = JSON.parse(atob(encodedData));
            
            if (data.type === 'whatsapp_oauth_callback') {
              clearInterval(hashCheckInterval);
              clearInterval(checkInterval);
              window.removeEventListener('message', messageHandler);
              
              if (data.success) {
                onSuccess(data.data);
              } else {
                onError(data.error || { message: 'Error desconocido' });
              }
            }
          } else if (popupHash.includes('oauth-error=')) {
            const encodedError = popupHash.split('oauth-error=')[1];
            const errorData = JSON.parse(atob(encodedError));
            
            if (errorData.type === 'whatsapp_oauth_callback') {
              clearInterval(hashCheckInterval);
              clearInterval(checkInterval);
              window.removeEventListener('message', messageHandler);
              onError(errorData.error || { message: 'Error desconocido' });
            }
          }
        }
      } catch (e) {
        // CORS error - no podemos acceder al hash del popup
        // Esto es normal, esperamos el mensaje
      }
    } catch (err) {
      // Ignorar errores de acceso al popup
    }
  }, 500);

  // Retornar función para cancelar
  return () => {
    clearInterval(checkInterval);
    clearInterval(hashCheckInterval);
    window.removeEventListener('message', messageHandler);
  };
}

/**
 * Procesar hash de OAuth callback en la página actual
 * Se llama cuando el popup redirige al frontend
 * @returns {Object|null} Datos del callback o null si no hay callback
 */
export function processOAuthHash() {
  try {
    const hash = window.location.hash;
    
    if (hash.includes('oauth-callback=')) {
      const encodedData = hash.split('oauth-callback=')[1].split('&')[0];
      const data = JSON.parse(atob(encodedData));
      
      // Limpiar hash
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      
      if (data.type === 'whatsapp_oauth_callback' && data.success) {
        return { success: true, data: data.data };
      }
    } else if (hash.includes('oauth-error=')) {
      const encodedError = hash.split('oauth-error=')[1].split('&')[0];
      const errorData = JSON.parse(atob(encodedError));
      
      // Limpiar hash
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      
      if (errorData.type === 'whatsapp_oauth_callback' && !errorData.success) {
        return { success: false, error: errorData.error };
      }
    }
  } catch (err) {
    console.error('[OAuth] Error procesando hash:', err);
  }
  
  return null;
}

