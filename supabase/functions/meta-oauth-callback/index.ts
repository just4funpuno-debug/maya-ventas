/**
 * Edge Function para procesar callback de OAuth de Meta
 * FASE 3: OAuth Callback Handler
 * 
 * URL: https://[project-ref].supabase.co/functions/v1/meta-oauth-callback
 * 
 * Flujo:
 * 1. Usuario autoriza en Meta OAuth
 * 2. Meta redirige aquí con ?code=XXX&state=YYY
 * 3. Intercambiamos code por access_token
 * 4. Obtenemos datos de Graph API
 * 5. Creamos cuenta en BD
 * 6. Retornamos respuesta
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================================
// UTILIDADES
// ============================================================================

/**
 * Obtiene cliente de Supabase con service_role key
 */
function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Faltan variables de entorno: SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// ============================================================================
// SUBFASE 3.1: ESTRUCTURA BASE Y VALIDACIÓN
// ============================================================================

/**
 * Maneja el callback de OAuth de Meta
 */
serve(async (req) => {
  try {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    };

    // Manejar OPTIONS request (preflight)
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    // Esta función debe ser pública para callbacks de OAuth
    // No requerimos autenticación ya que Facebook redirige directamente aquí

    // Obtener URL y query parameters
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    const error_description = url.searchParams.get('error_description');

    // Manejar errores de OAuth
    if (error) {
      console.error('[OAuth Error]', error, error_description);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: error,
          error_description: error_description 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validar que tenemos code y state
    if (!code || !state) {
      console.error('[OAuth] Missing code or state', { code: !!code, state: !!state });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'missing_code_or_state',
          message: 'Code o state faltante en la URL' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // TODO SUBFASE 3.1: Validar state (seguridad CSRF)
    // Por ahora solo logueamos, en SUBFASE 3.1 implementaremos validación completa
    console.log('[OAuth] Received callback', { code: code.substring(0, 10) + '...', state });

    // ============================================================================
    // SUBFASE 3.2: INTERCAMBIAR CODE POR ACCESS TOKEN
    // ============================================================================
    
    // Obtener variables de entorno
    // Si no están configuradas como secrets, usar valores por defecto (solo para desarrollo)
    const META_APP_ID = Deno.env.get('META_APP_ID') || '1253651046588346';
    const META_APP_SECRET = Deno.env.get('META_APP_SECRET') || '6927430dc02034242b7235f1fa86818c';
    
    // Construir Redirect URI si no está configurado
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const PROJECT_REF = SUPABASE_URL?.replace('https://', '').replace('.supabase.co', '') || 'alwxhiombhfyjyyziyxz';
    const META_OAUTH_REDIRECT_URI = Deno.env.get('META_OAUTH_REDIRECT_URI') || 
      `https://${PROJECT_REF}.supabase.co/functions/v1/meta-oauth-callback`;

    if (!META_APP_ID || !META_APP_SECRET) {
      console.error('[OAuth] Missing Meta credentials', { 
        hasAppId: !!META_APP_ID, 
        hasAppSecret: !!META_APP_SECRET 
      });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'missing_meta_credentials',
          message: 'Faltan credenciales de Meta (META_APP_ID o META_APP_SECRET)' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('[OAuth] Exchanging code for access_token...');
    
    // Intercambiar code por access_token
    const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token`;
    const tokenParams = new URLSearchParams({
      client_id: META_APP_ID,
      client_secret: META_APP_SECRET,
      redirect_uri: META_OAUTH_REDIRECT_URI,
      code: code,
    });

    let accessTokenResponse;
    try {
      const tokenRequest = await fetch(`${tokenUrl}?${tokenParams.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!tokenRequest.ok) {
        const errorText = await tokenRequest.text();
        console.error('[OAuth] Token exchange failed', { 
          status: tokenRequest.status, 
          error: errorText 
        });
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'token_exchange_failed',
            message: `Error al intercambiar code por access_token: ${tokenRequest.status}`,
            details: errorText.substring(0, 200)
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      accessTokenResponse = await tokenRequest.json();
      
      // Validar respuesta
      if (!accessTokenResponse.access_token) {
        console.error('[OAuth] Invalid token response', accessTokenResponse);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'invalid_token_response',
            message: 'La respuesta de Meta no contiene access_token'
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      console.log('[OAuth] Access token obtained successfully', { 
        tokenLength: accessTokenResponse.access_token.length,
        expiresIn: accessTokenResponse.expires_in 
      });

    } catch (error) {
      console.error('[OAuth] Token exchange error', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'token_exchange_error',
          message: `Error al intercambiar code: ${error.message}`
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // ============================================================================
    // SUBFASE 3.3: OBTENER DATOS DE GRAPH API
    // ============================================================================
    
    const accessToken = accessTokenResponse.access_token;
    const graphApiVersion = 'v18.0';
    const graphApiBase = `https://graph.facebook.com/${graphApiVersion}`;

    console.log('[Graph API] Obteniendo datos de WhatsApp Business...');

            let businessAccountId: string | null = null;
            let phoneNumberId: string | null = null;
            let phoneNumber: string | null = null;
            let displayName: string | null = null;
            let metaUserId: string | null = null;

            try {
              // Paso 0: Obtener información del usuario (meta_user_id)
              console.log('[Graph API] Obteniendo información del usuario...');
              try {
                const meResponse = await fetch(
                  `${graphApiBase}/me?fields=id,name&access_token=${accessToken}`
                );
                if (meResponse.ok) {
                  const meData = await meResponse.json();
                  metaUserId = meData.id;
                  console.log('[Graph API] Meta User ID obtenido', { metaUserId });
                }
              } catch (meError) {
                console.warn('[Graph API] No se pudo obtener Meta User ID', meError);
                // No crítico, continuamos
              }

              // Paso 1: Obtener Business Accounts
              console.log('[Graph API] Obteniendo Business Accounts...');
              const businessesResponse = await fetch(
                `${graphApiBase}/me/businesses?access_token=${accessToken}`
              );

      if (!businessesResponse.ok) {
        const errorText = await businessesResponse.text();
        console.error('[Graph API] Error obteniendo Business Accounts', {
          status: businessesResponse.status,
          error: errorText
        });
        return new Response(
          JSON.stringify({
            success: false,
            error: 'graph_api_businesses_failed',
            message: `Error al obtener Business Accounts: ${businessesResponse.status}`,
            details: errorText.substring(0, 200)
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      const businessesData = await businessesResponse.json();
      console.log('[Graph API] Business Accounts obtenidos', {
        count: businessesData.data?.length || 0
      });

      // Obtener el primer Business Account (o el que tenga WhatsApp Business)
      if (!businessesData.data || businessesData.data.length === 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'no_business_accounts',
            message: 'No se encontraron Business Accounts asociados a esta cuenta'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      businessAccountId = businessesData.data[0].id;
      console.log('[Graph API] Business Account ID:', businessAccountId);

      // Paso 2: Obtener WhatsApp Business Accounts del Business Account
      console.log('[Graph API] Obteniendo WhatsApp Business Accounts...');
      const whatsappAccountsResponse = await fetch(
        `${graphApiBase}/${businessAccountId}/owned_whatsapp_business_accounts?access_token=${accessToken}`
      );

      if (!whatsappAccountsResponse.ok) {
        const errorText = await whatsappAccountsResponse.text();
        console.error('[Graph API] Error obteniendo WhatsApp Business Accounts', {
          status: whatsappAccountsResponse.status,
          error: errorText
        });
        return new Response(
          JSON.stringify({
            success: false,
            error: 'graph_api_whatsapp_accounts_failed',
            message: `Error al obtener WhatsApp Business Accounts: ${whatsappAccountsResponse.status}`,
            details: errorText.substring(0, 200)
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      const whatsappAccountsData = await whatsappAccountsResponse.json();
      console.log('[Graph API] WhatsApp Business Accounts obtenidos', {
        count: whatsappAccountsData.data?.length || 0
      });

      if (!whatsappAccountsData.data || whatsappAccountsData.data.length === 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'no_whatsapp_accounts',
            message: 'No se encontraron WhatsApp Business Accounts asociados a este Business Account'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      const whatsappBusinessAccountId = whatsappAccountsData.data[0].id;
      console.log('[Graph API] WhatsApp Business Account ID:', whatsappBusinessAccountId);

      // Paso 3: Obtener Phone Numbers del WhatsApp Business Account
      console.log('[Graph API] Obteniendo Phone Numbers...');
      const phoneNumbersResponse = await fetch(
        `${graphApiBase}/${whatsappBusinessAccountId}/phone_numbers?access_token=${accessToken}`
      );

      if (!phoneNumbersResponse.ok) {
        const errorText = await phoneNumbersResponse.text();
        console.error('[Graph API] Error obteniendo Phone Numbers', {
          status: phoneNumbersResponse.status,
          error: errorText
        });
        return new Response(
          JSON.stringify({
            success: false,
            error: 'graph_api_phone_numbers_failed',
            message: `Error al obtener Phone Numbers: ${phoneNumbersResponse.status}`,
            details: errorText.substring(0, 200)
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      const phoneNumbersData = await phoneNumbersResponse.json();
      console.log('[Graph API] Phone Numbers obtenidos', {
        count: phoneNumbersData.data?.length || 0
      });

      // Verificar que hay números disponibles
      if (!phoneNumbersData.data || phoneNumbersData.data.length === 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'no_phone_numbers',
            message: 'No se encontraron Phone Numbers asociados a este WhatsApp Business Account'
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Guardar todos los números disponibles para que el usuario pueda elegir
      const allPhoneNumbers = phoneNumbersData.data;

      // Si hay solo un número, usar ese (comportamiento automático)
      // Si hay múltiples, retornar todos para que el usuario elija
      if (allPhoneNumbers.length === 1) {
        // Un solo número: comportamiento automático como antes
        phoneNumberId = allPhoneNumbers[0].id;
        phoneNumber = allPhoneNumbers[0].display_phone_number || allPhoneNumbers[0].phone_number || null;
        displayName = allPhoneNumbers[0].verified_name || allPhoneNumbers[0].display_phone_number || null;
        
        console.log('[Graph API] Un solo número encontrado, usando automáticamente', {
          phoneNumberId,
          phoneNumber,
          displayName
        });
      } else {
        // Múltiples números: retornar lista para que el usuario elija
        // No guardamos todavía, esperamos que el usuario seleccione
        console.log('[Graph API] Múltiples números encontrados, se requiere selección del usuario', {
          count: allPhoneNumbers.length
        });
        
        // Retornar respuesta especial indicando que se requiere selección
        const encodedData = btoa(JSON.stringify({
          type: 'whatsapp_oauth_callback',
          success: true,
          requires_selection: true,
          data: {
            business_account_id: businessAccountId,
            phone_numbers: allPhoneNumbers.map(pn => ({
              id: pn.id,
              display_phone_number: pn.display_phone_number || pn.phone_number || null,
              phone_number: pn.phone_number || pn.display_phone_number || null,
              verified_name: pn.verified_name || null,
              quality_rating: pn.quality_rating || null
            })),
            access_token: accessToken, // Token temporal para obtener detalles después
            meta_app_id: META_APP_ID,
            meta_user_id: metaUserId || null
          }
        }));

        // Obtener frontend URL (mismo código que antes)
        let frontendUrl = Deno.env.get('FRONTEND_URL');
        if (!frontendUrl) {
          try {
            const stateData = JSON.parse(atob(state));
            if (stateData && stateData.frontend) {
              frontendUrl = stateData.frontend;
            }
          } catch (e) {
            // Ignorar
          }
        }
        if (!frontendUrl) {
          const referer = req.headers.get('referer') || '';
          if (referer.includes('localhost') || referer.includes('127.0.0.1')) {
            frontendUrl = 'http://localhost:5173';
          } else {
            frontendUrl = 'https://www.mayalife.shop';
          }
        }

        const redirectUrl = `${frontendUrl}/oauth-callback.html#oauth-callback=${encodedData}`;
        
        return new Response(null, {
          status: 302,
          headers: {
            ...corsHeaders,
            'Location': redirectUrl
          }
        });
      }

      // Paso 3: Obtener detalles adicionales del Phone Number (opcional)
      try {
        const phoneDetailsResponse = await fetch(
          `${graphApiBase}/${phoneNumberId}?fields=display_phone_number,verified_name,code_verification_status,quality_rating&access_token=${accessToken}`
        );

        if (phoneDetailsResponse.ok) {
          const phoneDetails = await phoneDetailsResponse.json();
          if (phoneDetails.display_phone_number) {
            phoneNumber = phoneDetails.display_phone_number;
          }
          if (phoneDetails.verified_name) {
            displayName = phoneDetails.verified_name;
          }
          console.log('[Graph API] Detalles del Phone Number obtenidos', phoneDetails);
        }
      } catch (detailsError) {
        // No crítico, continuamos con los datos que ya tenemos
        console.warn('[Graph API] No se pudieron obtener detalles adicionales', detailsError);
      }

      console.log('[Graph API] Datos obtenidos exitosamente', {
        businessAccountId,
        phoneNumberId,
        phoneNumber,
        displayName
      });

    } catch (error) {
      console.error('[Graph API] Error general', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'graph_api_error',
          message: `Error al obtener datos de Graph API: ${error.message}`
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // ============================================================================
    // SUBFASE 3.4: GENERAR TOKENS Y VERIFY TOKEN
    // ============================================================================
    
    // Validar que todos los datos necesarios estén presentes
    if (!businessAccountId || !phoneNumberId || !accessToken) {
      console.error('[Tokens] Missing required data', {
        hasBusinessAccountId: !!businessAccountId,
        hasPhoneNumberId: !!phoneNumberId,
        hasAccessToken: !!accessToken
      });
      return new Response(
        JSON.stringify({
          success: false,
          error: 'missing_required_data',
          message: 'Faltan datos necesarios para generar tokens'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('[Tokens] Generando tokens...');

    // Access Token permanente: Usar el access_token de OAuth
    // Este token puede expirar, pero por ahora lo usamos como permanente
    // En el futuro, podríamos renovarlo usando refresh_token si está disponible
    const permanentAccessToken = accessToken;
    const accessTokenExpiresAt = accessTokenResponse.expires_in 
      ? new Date(Date.now() + accessTokenResponse.expires_in * 1000).toISOString()
      : null;

    console.log('[Tokens] Access Token configurado', {
      tokenLength: permanentAccessToken.length,
      expiresAt: accessTokenExpiresAt
    });

    // Generar Verify Token automáticamente
    // Usar crypto de Deno para generar un token seguro y aleatorio
    const verifyTokenBytes = crypto.getRandomValues(new Uint8Array(32));
    const verifyToken = Array.from(verifyTokenBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .substring(0, 64); // 64 caracteres hexadecimales

    console.log('[Tokens] Verify Token generado', {
      tokenLength: verifyToken.length,
      tokenPreview: verifyToken.substring(0, 10) + '...'
    });

    // Validar que los tokens se generaron correctamente
    if (!permanentAccessToken || !verifyToken) {
      console.error('[Tokens] Error generando tokens');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'token_generation_failed',
          message: 'Error al generar tokens'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('[Tokens] Tokens generados exitosamente', {
      hasAccessToken: !!permanentAccessToken,
      hasVerifyToken: !!verifyToken,
      accessTokenExpiresAt
    });

    // ============================================================================
    // SUBFASE 3.5: PROCESAR COEXISTENCIA
    // ============================================================================
    
    console.log('[Coexistencia] Verificando estado de coexistencia...');

    let coexistenceStatus: 'pending' | 'connected' | 'failed' = 'pending';
    let coexistenceQrUrl: string | null = null;
    let coexistenceVerifiedAt: string | null = null;
    let coexistenceNeedsAction = false;

    try {
      // Verificar estado de coexistencia usando Graph API
      // El campo 'code_verification_status' indica si el número está verificado
      // Si está verificado, generalmente significa que coexistencia está activa
      console.log('[Coexistencia] Consultando detalles del Phone Number...');
      
      const phoneDetailsResponse = await fetch(
        `${graphApiBase}/${phoneNumberId}?fields=code_verification_status,quality_rating,display_phone_number,verified_name&access_token=${accessToken}`
      );

      if (phoneDetailsResponse.ok) {
        const phoneDetails = await phoneDetailsResponse.json();
        console.log('[Coexistencia] Detalles del Phone Number obtenidos', phoneDetails);

        // Verificar estado de verificación
        // 'VERIFIED' generalmente indica que coexistencia está activa
        // 'UNVERIFIED' o ausencia indica que puede necesitar coexistencia
        const verificationStatus = phoneDetails.code_verification_status;
        
        if (verificationStatus === 'VERIFIED') {
          coexistenceStatus = 'connected';
          coexistenceVerifiedAt = new Date().toISOString();
          console.log('[Coexistencia] Número verificado - Coexistencia activa');
        } else {
          // Si no está verificado, puede necesitar coexistencia
          coexistenceStatus = 'pending';
          coexistenceNeedsAction = true;
          console.log('[Coexistencia] Número no verificado - Puede necesitar coexistencia', {
            verificationStatus
          });
        }
      } else {
        // Si no podemos obtener detalles, asumimos que necesita verificación
        const errorText = await phoneDetailsResponse.text();
        console.warn('[Coexistencia] No se pudieron obtener detalles del Phone Number', {
          status: phoneDetailsResponse.status,
          error: errorText.substring(0, 200)
        });
        coexistenceStatus = 'pending';
        coexistenceNeedsAction = true;
      }

      // Nota: La coexistencia generalmente se configura manualmente desde Meta Developer Console
      // Si necesita coexistencia, el usuario debe:
      // 1. Ir a Meta Developer Console > WhatsApp > Phone Numbers
      // 2. Seleccionar "Use existing number"
      // 3. Escanear QR o ingresar código de verificación
      // 
      // Por ahora, solo verificamos el estado y guardamos 'pending' si no está verificado
      // En SUBFASE 3.6 guardaremos este estado en la BD

    } catch (error) {
      console.error('[Coexistencia] Error verificando coexistencia', error);
      // Si hay error, asumimos que necesita verificación
      coexistenceStatus = 'pending';
      coexistenceNeedsAction = true;
    }

    console.log('[Coexistencia] Estado de coexistencia determinado', {
      status: coexistenceStatus,
      needsAction: coexistenceNeedsAction,
      verifiedAt: coexistenceVerifiedAt
    });

    // ============================================================================
    // SUBFASE 3.6: CREAR CUENTA EN BASE DE DATOS
    // ============================================================================
    
    console.log('[BD] Creando cuenta en base de datos...');

    let accountId: string | null = null;
    let accountCreated = false;

    try {
      const supabase = getSupabaseClient();

      // Verificar si ya existe una cuenta con este phone_number_id
      const { data: existingAccount, error: checkError } = await supabase
        .from('whatsapp_accounts')
        .select('id, phone_number_id, connection_method')
        .eq('phone_number_id', phoneNumberId)
        .maybeSingle();

      if (checkError) {
        console.error('[BD] Error verificando cuenta existente', checkError);
        throw new Error(`Error al verificar cuenta existente: ${checkError.message}`);
      }

      // Preparar datos para insertar/actualizar
      const accountData: any = {
        phone_number_id: phoneNumberId,
        business_account_id: businessAccountId,
        access_token: permanentAccessToken,
        verify_token: verifyToken,
        phone_number: phoneNumber || '',
        display_name: displayName || null,
        connection_method: 'oauth',
        meta_app_id: META_APP_ID,
        meta_user_id: metaUserId || null,
        oauth_access_token: permanentAccessToken,
        oauth_expires_at: accessTokenExpiresAt,
        coexistence_status: coexistenceStatus,
        coexistence_qr_url: coexistenceQrUrl,
        coexistence_verified_at: coexistenceVerifiedAt,
        active: true,
      };

      if (existingAccount) {
        // Actualizar cuenta existente
        console.log('[BD] Actualizando cuenta existente', { id: existingAccount.id });
        
        const { data: updatedAccount, error: updateError } = await supabase
          .from('whatsapp_accounts')
          .update(accountData)
          .eq('id', existingAccount.id)
          .select()
          .single();

        if (updateError) {
          console.error('[BD] Error actualizando cuenta', updateError);
          throw new Error(`Error al actualizar cuenta: ${updateError.message}`);
        }

        accountId = updatedAccount.id;
        accountCreated = false; // No es nueva, es actualización
        console.log('[BD] Cuenta actualizada exitosamente', { id: accountId });
      } else {
        // Crear nueva cuenta
        console.log('[BD] Creando nueva cuenta...');
        
        const { data: newAccount, error: insertError } = await supabase
          .from('whatsapp_accounts')
          .insert(accountData)
          .select()
          .single();

        if (insertError) {
          console.error('[BD] Error creando cuenta', insertError);
          throw new Error(`Error al crear cuenta: ${insertError.message}`);
        }

        accountId = newAccount.id;
        accountCreated = true;
        console.log('[BD] Cuenta creada exitosamente', { id: accountId });
      }

    } catch (error) {
      console.error('[BD] Error en operación de BD', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'database_error',
          message: `Error al crear/actualizar cuenta en BD: ${error.message}`
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('[BD] Operación de BD completada', {
      accountId,
      accountCreated
    });

    // ============================================================================
    // SUBFASE 3.7: RETORNAR RESPUESTA Y MANEJO DE ERRORES
    // ============================================================================
    
    console.log('[Respuesta] Preparando respuesta final...');

    // Preparar respuesta completa
    const responseData = {
      success: true,
      message: accountCreated 
        ? 'Cuenta de WhatsApp conectada exitosamente mediante OAuth' 
        : 'Cuenta de WhatsApp actualizada exitosamente',
      account: {
        id: accountId,
        phone_number_id: phoneNumberId,
        business_account_id: businessAccountId,
        phone_number: phoneNumber,
        display_name: displayName,
        connection_method: 'oauth',
        active: true,
        coexistence: {
          status: coexistenceStatus,
          needs_action: coexistenceNeedsAction,
          verified_at: coexistenceVerifiedAt,
          note: coexistenceNeedsAction 
            ? 'El número puede necesitar coexistencia. Configúralo manualmente desde Meta Developer Console > WhatsApp > Phone Numbers > Use existing number'
            : coexistenceStatus === 'connected'
            ? 'Coexistencia verificada y activa'
            : 'Coexistencia no requerida o pendiente'
        }
      },
      metadata: {
        meta_app_id: META_APP_ID,
        meta_user_id: metaUserId,
        oauth_expires_at: accessTokenExpiresAt,
        created_at: new Date().toISOString()
      },
      next_steps: coexistenceNeedsAction 
        ? [
            '1. Configurar coexistencia desde Meta Developer Console si es necesario',
            '2. Configurar webhook en Meta Developer Console',
            '3. Probar envío de mensajes desde la app'
          ]
        : [
            '1. Configurar webhook en Meta Developer Console',
            '2. Probar envío de mensajes desde la app'
          ]
    };

    console.log('[Respuesta] Respuesta preparada', {
      accountId,
      phoneNumber,
      coexistenceStatus
    });

    // ============================================================================
    // FASE 5: REDIRIGIR AL FRONTEND CON DATOS
    // ============================================================================
    
    // Obtener URL del frontend desde variable de entorno o state
    // El state ahora contiene información sobre la URL del frontend (para localhost o producción)
    let frontendUrl = Deno.env.get('FRONTEND_URL');
    
    // Si no está en variables de entorno, intentar obtener del state
    if (!frontendUrl) {
      try {
        // El state ahora está codificado como base64 con { state: uuid, frontend: url }
        // Intenta decodificar el state para obtener la URL del frontend
        const stateData = JSON.parse(atob(state));
        if (stateData && stateData.frontend) {
          frontendUrl = stateData.frontend;
          console.log('[Frontend URL] Obtenida del state:', frontendUrl);
        }
      } catch (e) {
        // Si el state no está codificado o no tiene frontend, intentar decodificar como string simple
        console.warn('[Frontend URL] No se pudo obtener del state (formato codificado), intentando default');
      }
    }
    
    // Si aún no tenemos frontend URL, usar valores por defecto según el entorno
    if (!frontendUrl) {
      // Por defecto, detectar si estamos en desarrollo o producción
      // Si el referer incluye localhost, usar localhost; si no, usar producción
      const referer = req.headers.get('referer') || '';
      if (referer.includes('localhost') || referer.includes('127.0.0.1')) {
        frontendUrl = 'http://localhost:5173';
      } else {
        frontendUrl = 'https://www.mayalife.shop';
      }
      console.log('[Frontend URL] Usando valor por defecto:', frontendUrl);
    }
    
    // Codificar datos en base64 para pasarlos en el hash (más seguro que query params)
    const encodedData = btoa(JSON.stringify({
      type: 'whatsapp_oauth_callback',
      success: true,
      data: {
        phone_number_id: phoneNumberId,
        business_account_id: businessAccountId,
        phone_number: phoneNumber,
        display_name: displayName,
        account_id: accountId,
        connection_method: 'oauth',
        coexistence_status: coexistenceStatus,
        coexistence_needs_action: coexistenceNeedsAction
      }
    }));
    
    // Redirigir a la página de callback que procesará el hash y enviará mensaje al parent
    const redirectUrl = `${frontendUrl}/oauth-callback.html#oauth-callback=${encodedData}`;
    
    console.log('[Respuesta] Redirigiendo al frontend', {
      frontendUrl,
      redirectUrl: redirectUrl.substring(0, 100) + '...'
    });

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': redirectUrl
      }
    });

  } catch (error) {
    // ============================================================================
    // SUBFASE 3.7: MANEJO ROBUSTO DE ERRORES
    // ============================================================================
    
    console.error('[OAuth Callback Error]', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    // Determinar tipo de error y mensaje apropiado
    let errorType = 'internal_error';
    let errorMessage = 'Error interno del servidor';
    let statusCode = 500;

    if (error.message.includes('SUPABASE_URL') || error.message.includes('SUPABASE_SERVICE_ROLE_KEY')) {
      errorType = 'configuration_error';
      errorMessage = 'Error de configuración: Faltan variables de entorno de Supabase';
      statusCode = 500;
    } else if (error.message.includes('database') || error.message.includes('BD')) {
      errorType = 'database_error';
      errorMessage = `Error en base de datos: ${error.message}`;
      statusCode = 500;
    } else if (error.message.includes('Graph API') || error.message.includes('graph')) {
      errorType = 'graph_api_error';
      errorMessage = `Error al comunicarse con Graph API: ${error.message}`;
      statusCode = 502;
    } else if (error.message.includes('token') || error.message.includes('OAuth')) {
      errorType = 'oauth_error';
      errorMessage = `Error en proceso OAuth: ${error.message}`;
      statusCode = 400;
    }

    // ============================================================================
    // FASE 5: REDIRIGIR AL FRONTEND CON ERROR
    // ============================================================================
    
    // Obtener URL del frontend desde variable de entorno o state
    let frontendUrl = Deno.env.get('FRONTEND_URL');
    
    // Si no está en variables de entorno, intentar obtener del state
    if (!frontendUrl) {
      try {
        const stateData = JSON.parse(atob(state));
        if (stateData && stateData.frontend) {
          frontendUrl = stateData.frontend;
          console.log('[Frontend URL] Obtenida del state:', frontendUrl);
        }
      } catch (e) {
        console.warn('[Frontend URL] No se pudo obtener del state');
      }
    }
    
    // Si aún no tenemos frontend URL, usar valores por defecto
    if (!frontendUrl) {
      const referer = req.headers.get('referer') || '';
      if (referer.includes('localhost') || referer.includes('127.0.0.1')) {
        frontendUrl = 'http://localhost:5173';
      } else {
        frontendUrl = 'https://www.mayalife.shop';
      }
      console.log('[Frontend URL] Usando valor por defecto:', frontendUrl);
    }
    
    // Codificar error en base64
    const encodedError = btoa(JSON.stringify({
      type: 'whatsapp_oauth_callback',
      success: false,
      error: {
        type: errorType,
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    }));
    
    // Redirigir a la página de callback con error en el hash
    const redirectUrl = `${frontendUrl}/oauth-callback.html#oauth-error=${encodedError}`;
    
    console.log('[Error] Redirigiendo al frontend con error', {
      frontendUrl,
      errorType,
      redirectUrl: redirectUrl.substring(0, 100) + '...'
    });

    return new Response(null, {
      status: 302,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Location': redirectUrl
      }
    });
  }
});

