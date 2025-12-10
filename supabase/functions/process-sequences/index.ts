/**
 * Edge Function para procesar secuencias de mensajes automáticamente
 * FASE 4: SUBFASE 4.3 - Cron Jobs
 * 
 * Esta función se ejecuta cada hora para evaluar y enviar mensajes de secuencias
 * que están listos para ser enviados.
 * 
 * Uso:
 * - Ejecutar manualmente: POST /functions/v1/process-sequences
 * - Configurar cron: Usar Supabase Scheduled Functions o pg_cron
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessResult {
  success: boolean;
  processed: number;
  sent: number;
  errors: number;
  details: Array<{
    contactId: string;
    success: boolean;
    method?: string;
    error?: string;
  }>;
}

/**
 * Evaluar secuencia de un contacto
 */
async function evaluateContactSequence(
  supabase: any,
  contactId: string
): Promise<{ shouldSend: boolean; nextMessage: any; error: any }> {
  try {
    // Obtener información del contacto
    const { data: contact, error: contactError } = await supabase
      .from('whatsapp_contacts')
      .select('*')
      .eq('id', contactId)
      .single();

    if (contactError || !contact) {
      return {
        shouldSend: false,
        nextMessage: null,
        error: contactError || { message: 'Contacto no encontrado' }
      };
    }

    // Verificar si tiene secuencia activa
    if (!contact.sequence_active || !contact.sequence_id) {
      return {
        shouldSend: false,
        nextMessage: null,
        error: null
      };
    }

    // Verificar si el cliente respondió (pausar secuencia)
    if (contact.client_responses_count > 0 && contact.last_interaction_source === 'client') {
      if (contact.sequence_started_at && contact.last_interaction_at) {
        const sequenceStart = new Date(contact.sequence_started_at);
        const lastInteraction = new Date(contact.last_interaction_at);
        
        if (lastInteraction > sequenceStart) {
          // Cliente respondió después de iniciar la secuencia, pausar
          await supabase
            .from('whatsapp_contacts')
            .update({ sequence_active: false })
            .eq('id', contactId);
          
          return {
            shouldSend: false,
            nextMessage: null,
            error: null
          };
        }
      }
    }

    // Obtener la secuencia y sus mensajes
    const { data: sequence, error: seqError } = await supabase
      .from('whatsapp_sequences')
      .select('*, whatsapp_sequence_messages(*)')
      .eq('id', contact.sequence_id)
      .eq('active', true)
      .single();

    if (seqError || !sequence || !sequence.active) {
      return {
        shouldSend: false,
        nextMessage: null,
        error: seqError || { message: 'Secuencia no encontrada o inactiva' }
      };
    }

    // Verificar si hay mensajes en la secuencia
    if (!sequence.whatsapp_sequence_messages || sequence.whatsapp_sequence_messages.length === 0) {
      return {
        shouldSend: false,
        nextMessage: null,
        error: { message: 'Secuencia sin mensajes' }
      };
    }

    // Obtener siguiente mensaje a enviar
    const currentPosition = contact.sequence_position || 0;
    const messages = sequence.whatsapp_sequence_messages || [];
    
    // Ordenar mensajes por order_position
    const sortedMessages = [...messages].sort((a, b) => 
      (a.order_position || 0) - (b.order_position || 0)
    );

    // Buscar siguiente mensaje después de la posición actual
    const nextMessageIndex = sortedMessages.findIndex(
      msg => (msg.order_position || 0) > currentPosition
    );

    if (nextMessageIndex === -1) {
      // Secuencia completada
      return {
        shouldSend: false,
        nextMessage: null,
        error: null
      };
    }

    const nextMessage = sortedMessages[nextMessageIndex];

    // Verificar si es momento de enviar
    const now = new Date();
    let shouldSend = false;

    // Si es el primer mensaje (sequence_position === 0)
    if (currentPosition === 0) {
      if (contact.sequence_started_at) {
        const startedAt = new Date(contact.sequence_started_at);
        const timeSinceStart = (now.getTime() - startedAt.getTime()) / (1000 * 60 * 60); // horas
        
        // Si han pasado menos de 1 hora desde el inicio, esperar
        if (timeSinceStart < 1) {
          return {
            shouldSend: false,
            nextMessage: null,
            error: null
          };
        }
      }
      
      // Primer mensaje, enviar inmediatamente si no hay delay
      if (nextMessage.delay_hours_from_previous === 0) {
        shouldSend = true;
      }
    } else {
      // Obtener el último mensaje enviado de esta secuencia
      const { data: lastMessage } = await supabase
        .from('whatsapp_messages')
        .select('timestamp')
        .eq('contact_id', contactId)
        .eq('sequence_message_id', currentPosition)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (lastMessage) {
        const lastMessageTime = new Date(lastMessage.timestamp);
        const hoursSinceLastMessage = (now.getTime() - lastMessageTime.getTime()) / (1000 * 60 * 60);
        const delayRequired = nextMessage.delay_hours_from_previous || 0;

        if (hoursSinceLastMessage >= delayRequired) {
          shouldSend = true;
        }
      } else if (nextMessage.delay_hours_from_previous === 0) {
        shouldSend = true;
      }
    }

    return {
      shouldSend,
      nextMessage: shouldSend ? nextMessage : null,
      error: null
    };
  } catch (err) {
    console.error('[evaluateContactSequence] Error fatal:', err);
    return {
      shouldSend: false,
      nextMessage: null,
      error: { message: err.message || 'Error desconocido' }
    };
  }
}

/**
 * Decidir método de envío (Cloud API vs Puppeteer)
 */
async function decideSendMethod(
  supabase: any,
  contactId: string
): Promise<{ method: string; reason: string; error?: any }> {
  try {
    // Verificar ventana 24h
    const { data: window24h } = await supabase.rpc('calculate_window_24h', {
      p_contact_id: contactId
    });

    if (window24h?.is_active) {
      return {
        method: 'cloud_api',
        reason: 'window_24h_active'
      };
    }

    // Verificar ventana 72h (Free Entry Point)
    const { data: window72h } = await supabase.rpc('calculate_window_72h', {
      p_contact_id: contactId
    });

    if (window72h?.is_active) {
      return {
        method: 'cloud_api',
        reason: 'window_72h_active'
      };
    }

    // Si no hay ventana activa, usar Puppeteer
    return {
      method: 'puppeteer',
      reason: 'window_closed'
    };
  } catch (err) {
    console.error('[decideSendMethod] Error:', err);
    return {
      method: 'puppeteer',
      reason: 'error_fallback',
      error: err
    };
  }
}

/**
 * Procesar mensaje de secuencia
 */
async function processSequenceMessage(
  supabase: any,
  contactId: string,
  messageData: any,
  accountId: string
): Promise<{ success: boolean; method: string; error?: any }> {
  try {
    // Decidir método de envío
    const { method, reason, error: decisionError } = await decideSendMethod(supabase, contactId);

    if (decisionError) {
      console.error('[processSequenceMessage] Error al decidir método:', decisionError);
      // Por defecto, usar Puppeteer si hay error
      return await sendViaPuppeteer(supabase, contactId, messageData);
    }

    // Enviar según método decidido
    if (method === 'cloud_api') {
      return await sendViaCloudAPI(supabase, accountId, contactId, messageData);
    } else {
      return await sendViaPuppeteer(supabase, contactId, messageData);
    }
  } catch (err) {
    console.error('[processSequenceMessage] Error fatal:', err);
    return {
      success: false,
      method: 'unknown',
      error: { message: `Error al procesar mensaje: ${err.message}` }
    };
  }
}

/**
 * Enviar mensaje via Cloud API
 */
async function sendViaCloudAPI(
  supabase: any,
  accountId: string,
  contactId: string,
  messageData: any
): Promise<{ success: boolean; method: string; error?: any }> {
  try {
    // Obtener cuenta WhatsApp
    const { data: account } = await supabase
      .from('whatsapp_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('active', true)
      .single();

    if (!account) {
      return {
        success: false,
        method: 'cloud_api',
        error: { message: 'Cuenta WhatsApp no encontrada o inactiva' }
      };
    }

    // Obtener teléfono del contacto
    const { data: contact } = await supabase
      .from('whatsapp_contacts')
      .select('phone')
      .eq('id', contactId)
      .single();

    if (!contact) {
      return {
        success: false,
        method: 'cloud_api',
        error: { message: 'Contacto no encontrado' }
      };
    }

    const { message_type, content_text, media_url, media_filename, caption, order_position } = messageData;
    
    // Construir payload según tipo de mensaje
    let payload: any = {
      messaging_product: 'whatsapp',
      to: contact.phone,
      recipient_type: 'individual'
    };

    switch (message_type) {
      case 'text':
        payload.type = 'text';
        payload.text = { body: content_text || '' };
        break;
      
      case 'image':
        payload.type = 'image';
        payload.image = {
          link: media_url,
          caption: caption || ''
        };
        break;
      
      case 'video':
        payload.type = 'video';
        payload.video = {
          link: media_url,
          caption: caption || ''
        };
        break;
      
      case 'audio':
        payload.type = 'audio';
        payload.audio = {
          link: media_url
        };
        break;
      
      case 'document':
        payload.type = 'document';
        payload.document = {
          link: media_url,
          filename: media_filename || '',
          caption: caption || ''
        };
        break;
      
      default:
        return {
          success: false,
          method: 'cloud_api',
          error: { message: `Tipo de mensaje no soportado: ${message_type}` }
        };
    }

    // Enviar mensaje via WhatsApp Cloud API
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${account.phone_number_id}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${account.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }
    );

    const result = await response.json();

    if (!response.ok || result.error) {
      console.error('[sendViaCloudAPI] Error de API:', result.error);
      // Fallback a Puppeteer
      return await sendViaPuppeteer(supabase, contactId, messageData);
    }

    // Actualizar contadores y posición
    await updateContactAfterSend(supabase, contactId, 'cloud_api', order_position);

    // Guardar mensaje en BD
    await supabase
      .from('whatsapp_messages')
      .insert({
        contact_id: contactId,
        account_id: accountId,
        message_type,
        text_content: message_type === 'text' ? content_text : null,
        media_url: ['image', 'video', 'audio', 'document'].includes(message_type) ? media_url : null,
        is_from_me: true,
        sent_via: 'cloud_api',
        sequence_message_id: order_position,
        whatsapp_message_id: result.messages?.[0]?.id || null,
        status: 'sent',
        timestamp: new Date().toISOString()
      });

    return {
      success: true,
      method: 'cloud_api'
    };
  } catch (err) {
    console.error('[sendViaCloudAPI] Error:', err);
    // Fallback a Puppeteer
    return await sendViaPuppeteer(supabase, contactId, messageData);
  }
}

/**
 * Enviar mensaje via Puppeteer (agregar a cola)
 */
async function sendViaPuppeteer(
  supabase: any,
  contactId: string,
  messageData: any
): Promise<{ success: boolean; method: string; error?: any }> {
  try {
    const { message_type, content_text, media_url, media_filename, caption, order_position } = messageData;

    // Agregar a cola Puppeteer
    // La función SQL requiere: p_contact_id, p_message_number, p_message_type, p_content_text, p_media_path, p_media_size_kb, p_caption, p_priority
    const { data: queueResult, error: queueError } = await supabase.rpc('add_to_puppeteer_queue', {
      p_contact_id: contactId,
      p_message_number: order_position || 1, // Usar order_position como message_number
      p_message_type: message_type,
      p_content_text: content_text || null,
      p_media_path: media_url || null, // media_url se usa como media_path (el bot Puppeteer descargará desde la URL)
      p_media_size_kb: null, // No tenemos el tamaño aquí, se puede calcular después
      p_caption: caption || null,
      p_priority: 'MEDIUM' // Prioridad como string: 'HIGH', 'MEDIUM', 'LOW'
    });

    if (queueError) {
      return {
        success: false,
        method: 'puppeteer',
        error: queueError
      };
    }

    // Actualizar contadores y posición
    await updateContactAfterSend(supabase, contactId, 'puppeteer', order_position);

    // Guardar mensaje en BD (pendiente)
    await supabase
      .from('whatsapp_messages')
      .insert({
        contact_id: contactId,
        message_type,
        text_content: message_type === 'text' ? content_text : null,
        media_url: ['image', 'video', 'audio', 'document'].includes(message_type) ? media_url : null,
        is_from_me: true,
        sent_via: 'puppeteer',
        sequence_message_id: order_position,
        status: 'pending',
        timestamp: new Date().toISOString()
      });

    return {
      success: true,
      method: 'puppeteer'
    };
  } catch (err) {
    console.error('[sendViaPuppeteer] Error:', err);
    return {
      success: false,
      method: 'puppeteer',
      error: { message: `Error al agregar a cola Puppeteer: ${err.message}` }
    };
  }
}

/**
 * Actualizar contacto después de enviar mensaje
 */
async function updateContactAfterSend(
  supabase: any,
  contactId: string,
  method: string,
  orderPosition: number
): Promise<void> {
  try {
    // Obtener contadores actuales
    const { data: contact } = await supabase
      .from('whatsapp_contacts')
      .select('messages_sent_via_cloud_api, messages_sent_via_puppeteer, sequence_position, account_id')
      .eq('id', contactId)
      .single();

    if (!contact) return;

    // Actualizar contadores según método
    const updates: any = {
      sequence_position: orderPosition || (contact.sequence_position || 0) + 1
    };

    if (method === 'cloud_api') {
      updates.messages_sent_via_cloud_api = (contact.messages_sent_via_cloud_api || 0) + 1;
    } else if (method === 'puppeteer') {
      updates.messages_sent_via_puppeteer = (contact.messages_sent_via_puppeteer || 0) + 1;
    }

    // Actualizar contacto
    await supabase
      .from('whatsapp_contacts')
      .update(updates)
      .eq('id', contactId);
  } catch (err) {
    console.error('[updateContactAfterSend] Error:', err);
    // No lanzar error, solo loguear
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

    const result: ProcessResult = {
      success: true,
      processed: 0,
      sent: 0,
      errors: 0,
      details: []
    };

    // Obtener todas las cuentas activas
    const { data: accounts, error: accountsError } = await supabase
      .from('whatsapp_accounts')
      .select('id')
      .eq('active', true);

    if (accountsError) {
      console.error('[process-sequences] Error obteniendo cuentas:', accountsError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Error obteniendo cuentas WhatsApp',
          details: accountsError
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Procesar cada cuenta
    for (const account of accounts || []) {
      // Obtener contactos con secuencias activas para esta cuenta
      const { data: contacts, error: contactsError } = await supabase
        .from('whatsapp_contacts')
        .select('id, account_id')
        .eq('account_id', account.id)
        .eq('sequence_active', true)
        .not('sequence_id', 'is', null);

      if (contactsError) {
        console.error(`[process-sequences] Error obteniendo contactos para cuenta ${account.id}:`, contactsError);
        continue;
      }

      // Procesar cada contacto
      for (const contact of contacts || []) {
        result.processed++;

        try {
          // Evaluar secuencia
          const evaluation = await evaluateContactSequence(supabase, contact.id);

          if (!evaluation.shouldSend || !evaluation.nextMessage) {
            // No es momento de enviar o no hay siguiente mensaje
            result.details.push({
              contactId: contact.id,
              success: true,
              method: 'none',
              error: evaluation.error?.message || 'No es momento de enviar'
            });
            continue;
          }

          // Procesar mensaje
          const processResult = await processSequenceMessage(
            supabase,
            contact.id,
            evaluation.nextMessage,
            contact.account_id
          );

          if (processResult.success) {
            result.sent++;
            result.details.push({
              contactId: contact.id,
              success: true,
              method: processResult.method
            });
          } else {
            result.errors++;
            result.details.push({
              contactId: contact.id,
              success: false,
              method: processResult.method,
              error: processResult.error?.message || 'Error desconocido'
            });
          }
        } catch (err) {
          result.errors++;
          result.details.push({
            contactId: contact.id,
            success: false,
            error: err.message || 'Error fatal'
          });
          console.error(`[process-sequences] Error procesando contacto ${contact.id}:`, err);
        }
      }
    }

    // Logging resumen
    console.log(`[process-sequences] Procesados: ${result.processed}, Enviados: ${result.sent}, Errores: ${result.errors}`);

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (err) {
    console.error('[process-sequences] Error fatal:', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || 'Error desconocido',
        processed: 0,
        sent: 0,
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

