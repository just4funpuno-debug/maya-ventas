/**
 * Edge Function para detectar bloqueos automáticamente
 * FASE 5: SUBFASE 5.2 - Detección Automática de Bloqueos
 * 
 * Esta función se ejecuta cada 6 horas para verificar contactos
 * que pueden estar bloqueados basándose en el status de mensajes
 * enviados hace más de 72 horas.
 * 
 * Uso:
 * - Ejecutar manualmente: POST /functions/v1/detect-blocks
 * - Configurar cron: Usar Supabase Scheduled Functions o pg_cron
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DetectionResult {
  success: boolean;
  checked: number;
  blocked: number;
  probable: number;
  errors: number;
  details: Array<{
    contactId: string;
    phone: string;
    isBlocked: boolean;
    probability: number;
    consecutiveUndelivered: number;
    error?: string;
  }>;
}

/**
 * Verificar status de un mensaje en WhatsApp Cloud API
 */
async function checkMessageStatus(
  supabase: any,
  accountId: string,
  messageId: string
): Promise<{ status: string; error: any }> {
  try {
    // Obtener cuenta para acceder al access_token
    const { data: account, error: accountError } = await supabase
      .from('whatsapp_accounts')
      .select('access_token, phone_number_id')
      .eq('id', accountId)
      .eq('active', true)
      .single();

    if (accountError || !account) {
      return {
        status: 'unknown',
        error: accountError || { message: 'Cuenta no encontrada' }
      };
    }

    // Verificar status en WhatsApp Cloud API
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${account.phone_number_id}/messages?ids=${messageId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${account.access_token}`
        }
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        status: 'unknown',
        error: { message: errorData.error?.message || 'Error verificando status' }
      };
    }

    const data = await response.json();
    const message = data.data?.[0];

    if (!message) {
      return {
        status: 'unknown',
        error: { message: 'Mensaje no encontrado en API' }
      };
    }

    // WhatsApp retorna: sent, delivered, read, failed
    return {
      status: message.status || 'unknown',
      error: null
    };
  } catch (err) {
    console.error('[checkMessageStatus] Error fatal:', err);
    return {
      status: 'unknown',
      error: { message: err.message || 'Error desconocido' }
    };
  }
}

/**
 * Detectar si un contacto está bloqueado
 */
async function detectBlockedContact(
  supabase: any,
  contactId: string
): Promise<{
  isBlocked: boolean;
  probability: number;
  consecutiveUndelivered: number;
  error: any;
}> {
  try {
    // Obtener información del contacto
    const { data: contact, error: contactError } = await supabase
      .from('whatsapp_contacts')
      .select('*')
      .eq('id', contactId)
      .single();

    if (contactError || !contact) {
      return {
        isBlocked: false,
        probability: 0,
        consecutiveUndelivered: 0,
        error: contactError || { message: 'Contacto no encontrado' }
      };
    }

    // Obtener mensajes "sent" con más de 72 horas
    const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
    
    const { data: oldMessages, error: messagesError } = await supabase
      .from('whatsapp_messages')
      .select('id, wa_message_id, status, timestamp, sent_via, account_id')
      .eq('contact_id', contactId)
      .eq('is_from_me', true)
      .eq('status', 'sent')
      .lt('timestamp', seventyTwoHoursAgo)
      .order('timestamp', { ascending: false })
      .limit(10); // Verificar últimos 10 mensajes

    if (messagesError) {
      console.error('[detectBlockedContact] Error obteniendo mensajes:', messagesError);
      return {
        isBlocked: false,
        probability: contact.block_probability || 0,
        consecutiveUndelivered: contact.consecutive_undelivered || 0,
        error: messagesError
      };
    }

    if (!oldMessages || oldMessages.length === 0) {
      // No hay mensajes antiguos para verificar
      return {
        isBlocked: false,
        probability: contact.block_probability || 0,
        consecutiveUndelivered: contact.consecutive_undelivered || 0,
        error: null
      };
    }

    // Verificar status de cada mensaje
    let consecutiveUndelivered = 0;
    let totalChecked = 0;
    let undeliveredCount = 0;

    for (const message of oldMessages) {
      if (!message.wa_message_id || !message.account_id) continue;

      // Solo verificar mensajes de Cloud API (tienen wa_message_id)
      if (message.sent_via !== 'cloud_api') continue;

      totalChecked++;
      const statusCheck = await checkMessageStatus(supabase, message.account_id, message.wa_message_id);

      if (statusCheck.status === 'sent' && !statusCheck.error) {
        // Mensaje sigue en "sent" después de 72h, probablemente no entregado
        consecutiveUndelivered++;
        undeliveredCount++;
      } else if (statusCheck.status === 'delivered' || statusCheck.status === 'read') {
        // Mensaje entregado, resetear contador
        consecutiveUndelivered = 0;
      } else if (statusCheck.status === 'failed') {
        // Mensaje fallido, incrementar contador
        consecutiveUndelivered++;
        undeliveredCount++;
      }
    }

    // Calcular probabilidad de bloqueo (0-100%)
    let probability = 0;
    if (totalChecked > 0) {
      const undeliveredRatio = undeliveredCount / totalChecked;
      probability = Math.round(undeliveredRatio * 100);
    }

    // Si hay mensajes consecutivos sin entregar, aumentar probabilidad
    if (consecutiveUndelivered >= 3) {
      probability = Math.min(100, probability + (consecutiveUndelivered * 10));
    }

    // Marcar como bloqueado si probabilidad > 80%
    const isBlocked = probability >= 80;

    return {
      isBlocked,
      probability,
      consecutiveUndelivered,
      error: null
    };
  } catch (err) {
    console.error('[detectBlockedContact] Error fatal:', err);
    return {
      isBlocked: false,
      probability: 0,
      consecutiveUndelivered: 0,
      error: { message: err.message || 'Error desconocido' }
    };
  }
}

/**
 * Actualizar estado de bloqueo de un contacto
 */
async function updateBlockStatus(
  supabase: any,
  contactId: string,
  detectionResult: {
    isBlocked: boolean;
    probability: number;
    consecutiveUndelivered: number;
  }
): Promise<{ success: boolean; error: any }> {
  try {
    const { isBlocked, probability, consecutiveUndelivered } = detectionResult;

    // Actualizar contacto
    const { error: updateError } = await supabase
      .from('whatsapp_contacts')
      .update({
        consecutive_undelivered: consecutiveUndelivered,
        block_probability: probability,
        is_blocked: isBlocked,
        updated_at: new Date().toISOString()
      })
      .eq('id', contactId);

    if (updateError) {
      console.error('[updateBlockStatus] Error actualizando contacto:', updateError);
      return { success: false, error: updateError };
    }

    // Si está bloqueado, pausar secuencias automáticamente
    if (isBlocked) {
      await supabase
        .from('whatsapp_contacts')
        .update({
          sequence_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', contactId);
    }

    // Registrar en delivery_issues si está bloqueado o tiene alta probabilidad
    if (isBlocked || probability >= 50) {
      const { data: contact } = await supabase
        .from('whatsapp_contacts')
        .select('account_id')
        .eq('id', contactId)
        .single();

      if (contact) {
        // Verificar si ya existe un issue no resuelto
        const { data: existingIssue } = await supabase
          .from('whatsapp_delivery_issues')
          .select('id')
          .eq('contact_id', contactId)
          .eq('resolved', false)
          .single();

        if (!existingIssue) {
          // Crear nuevo issue solo si no existe uno no resuelto
          await supabase
            .from('whatsapp_delivery_issues')
            .insert({
              contact_id: contactId,
              account_id: contact.account_id,
              issue_type: isBlocked ? 'confirmed_block' : 'probable_block',
              message_source: 'cloud_api',
              days_undelivered: Math.floor(consecutiveUndelivered / 2),
              consecutive_count: consecutiveUndelivered,
              action_taken: isBlocked ? 'paused' : 'none',
              resolved: false
            });
        }
      }
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('[updateBlockStatus] Error fatal:', err);
    return { success: false, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Obtener contactos que necesitan verificación
 */
async function getContactsToCheck(supabase: any, limit: number = 50): Promise<Array<any>> {
  try {
    const hoursThreshold = 72;
    const thresholdDate = new Date(Date.now() - hoursThreshold * 60 * 60 * 1000).toISOString();

    // Obtener contactos con mensajes "sent" antiguos de Cloud API
    const { data: messages, error } = await supabase
      .from('whatsapp_messages')
      .select(`
        contact_id,
        whatsapp_contacts!inner (
          id,
          phone,
          name,
          account_id,
          consecutive_undelivered,
          block_probability,
          is_blocked
        )
      `)
      .eq('is_from_me', true)
      .eq('status', 'sent')
      .eq('sent_via', 'cloud_api')
      .not('wa_message_id', 'is', null)
      .lt('timestamp', thresholdDate)
      .order('timestamp', { ascending: false })
      .limit(limit * 10); // Obtener más mensajes para agrupar

    if (error) {
      console.error('[getContactsToCheck] Error:', error);
      return [];
    }

    // Agrupar por contacto y obtener el más reciente
    const contactMap = new Map();
    (messages || []).forEach((msg: any) => {
      const contact = msg.whatsapp_contacts;
      if (contact && !contactMap.has(contact.id)) {
        contactMap.set(contact.id, contact);
      }
    });

    return Array.from(contactMap.values()).slice(0, limit);
  } catch (err) {
    console.error('[getContactsToCheck] Error fatal:', err);
    return [];
  }
}

serve(async (req) => {
  // Manejar CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Crear cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const result: DetectionResult = {
      success: true,
      checked: 0,
      blocked: 0,
      probable: 0,
      errors: 0,
      details: []
    };

    // Obtener contactos a verificar
    const contacts = await getContactsToCheck(supabase, 50);

    if (contacts.length === 0) {
      console.log('[detect-blocks] No hay contactos para verificar');
      return new Response(
        JSON.stringify({
          ...result,
          message: 'No hay contactos para verificar'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Procesar cada contacto
    for (const contact of contacts) {
      result.checked++;

      try {
        // Detectar bloqueo
        const detection = await detectBlockedContact(supabase, contact.id);

        if (detection.error) {
          result.errors++;
          result.details.push({
            contactId: contact.id,
            phone: contact.phone || 'unknown',
            isBlocked: false,
            probability: 0,
            consecutiveUndelivered: 0,
            error: detection.error.message || 'Error desconocido'
          });
          continue;
        }

        // Actualizar estado
        const updateResult = await updateBlockStatus(supabase, contact.id, detection);

        if (!updateResult.success) {
          result.errors++;
          result.details.push({
            contactId: contact.id,
            phone: contact.phone || 'unknown',
            isBlocked: detection.isBlocked,
            probability: detection.probability,
            consecutiveUndelivered: detection.consecutiveUndelivered,
            error: updateResult.error?.message || 'Error actualizando estado'
          });
          continue;
        }

        // Contar bloqueos y probables
        if (detection.isBlocked) {
          result.blocked++;
        } else if (detection.probability >= 50) {
          result.probable++;
        }

        result.details.push({
          contactId: contact.id,
          phone: contact.phone || 'unknown',
          isBlocked: detection.isBlocked,
          probability: detection.probability,
          consecutiveUndelivered: detection.consecutiveUndelivered
        });
      } catch (err) {
        result.errors++;
        result.details.push({
          contactId: contact.id,
          phone: contact.phone || 'unknown',
          isBlocked: false,
          probability: 0,
          consecutiveUndelivered: 0,
          error: err.message || 'Error fatal'
        });
        console.error(`[detect-blocks] Error procesando contacto ${contact.id}:`, err);
      }
    }

    // Logging resumen
    console.log(
      `[detect-blocks] Verificados: ${result.checked}, ` +
      `Bloqueados: ${result.blocked}, ` +
      `Probables: ${result.probable}, ` +
      `Errores: ${result.errors}`
    );

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (err) {
    console.error('[detect-blocks] Error fatal:', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || 'Error desconocido',
        checked: 0,
        blocked: 0,
        probable: 0,
        errors: 0,
        details: []
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});


