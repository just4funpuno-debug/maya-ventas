/**
 * Edge Function para recibir webhooks de WhatsApp Cloud API
 * SUBFASE 1.5: Webhook básico con verificación GET y procesamiento POST
 * 
 * URL: https://[project-ref].supabase.co/functions/v1/whatsapp-webhook
 * 
 * Configurar en Meta Developer Console:
 * - Webhook URL: https://[project-ref].supabase.co/functions/v1/whatsapp-webhook
 * - Verify Token: (el mismo que está en whatsapp_accounts.verify_token)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================================
// TIPOS
// ============================================================================

interface WhatsAppWebhookPayload {
  object: string;
  entry: WhatsAppWebhookEntry[];
}

interface WhatsAppWebhookEntry {
  id: string;
  changes: WhatsAppWebhookChange[];
}

interface WhatsAppWebhookChange {
  value: WhatsAppWebhookValue;
  field: string;
}

interface WhatsAppWebhookValue {
  messaging_product: string;
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: WhatsAppContact[];
  messages?: WhatsAppMessage[];
  statuses?: WhatsAppStatus[];
}

interface WhatsAppContact {
  profile: {
    name: string;
  };
  wa_id: string;
}

interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'document';
  text?: {
    body: string;
  };
  image?: {
    id: string;
    mime_type: string;
    sha256: string;
    caption?: string;
  };
  video?: {
    id: string;
    mime_type: string;
    sha256: string;
    caption?: string;
  };
  audio?: {
    id: string;
    mime_type: string;
    sha256: string;
  };
  document?: {
    id: string;
    filename?: string;
    mime_type: string;
    sha256: string;
    caption?: string;
  };
  context?: {
    from: string;
    id: string;
    referred_product?: {
      catalog_id: string;
      product_retailer_id: string;
    };
  };
}

interface WhatsAppStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
  conversation?: {
    id: string;
    expiration_timestamp?: string;
    origin: {
      type: string;
    };
  };
  pricing?: {
    billable: boolean;
    pricing_model: string;
    category: string;
  };
  errors?: Array<{
    code: number;
    title: string;
    message: string;
    error_data?: {
      details: string;
    };
  }>;
}

// ============================================================================
// UTILIDADES
// ============================================================================

function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no configurados');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

async function getAccountByPhoneNumberId(phoneNumberId: string) {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('whatsapp_accounts')
    .select('*')
    .eq('phone_number_id', phoneNumberId)
    .eq('active', true)
    .maybeSingle();
  
  if (error) {
    console.error('[getAccountByPhoneNumberId] Error:', error);
    return null;
  }
  
  return data;
}

function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}

async function upsertContact(
  accountId: string,
  phone: string,
  name?: string,
  profilePicUrl?: string
) {
  const supabase = getSupabaseClient();
  const normalizedPhone = normalizePhone(phone);
  
  const { data, error } = await supabase
    .from('whatsapp_contacts')
    .upsert({
      account_id: accountId,
      phone: normalizedPhone,
      name: name || null,
      profile_pic_url: profilePicUrl || null,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'account_id,phone',
      ignoreDuplicates: false
    })
    .select()
    .single();
  
  if (error) {
    console.error('[upsertContact] Error:', error);
    return null;
  }
  
  return data;
}

async function updateContactInteraction(
  contactId: string,
  source: 'client' | 'manual' | 'cloud_api' | 'puppeteer'
) {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase.rpc('update_contact_interaction', {
    p_contact_id: contactId,
    p_source: source,
    p_interaction_time: new Date().toISOString()
  });
  
  if (error) {
    console.error('[updateContactInteraction] Error:', error);
    return null;
  }
  
  return data;
}

/**
 * Crear lead automáticamente si no existe
 * FASE 1: Creación automática de leads cuando llega mensaje nuevo
 */
async function createLeadIfNotExists(contactId: string, accountId: string) {
  try {
    const supabase = getSupabaseClient();
    
    // 1. Obtener product_id de la cuenta
    const { data: account, error: accountError } = await supabase
      .from('whatsapp_accounts')
      .select('product_id')
      .eq('id', accountId)
      .single();
    
    if (accountError || !account) {
      console.warn('[createLeadIfNotExists] Error obteniendo cuenta o cuenta sin product_id:', accountError?.message || 'No encontrada');
      return;
    }
    
    if (!account.product_id) {
      console.warn('[createLeadIfNotExists] Cuenta no tiene product_id asignado, no se crea lead');
      return;
    }
    
    // 2. Verificar si ya existe lead activo para este contacto y producto
    const { data: existingLead, error: checkError } = await supabase
      .from('whatsapp_leads')
      .select('id')
      .eq('contact_id', contactId)
      .eq('product_id', account.product_id)
      .eq('status', 'active')
      .maybeSingle();
    
    if (checkError) {
      console.error('[createLeadIfNotExists] Error verificando lead existente:', checkError);
      return;
    }
    
    if (existingLead) {
      console.log('[createLeadIfNotExists] Lead ya existe:', existingLead.id);
      return;
    }
    
    // 3. Crear lead automáticamente en etapa "entrantes"
    const { data: newLead, error: createError } = await supabase
      .from('whatsapp_leads')
      .insert({
        contact_id: contactId,
        account_id: accountId,
        product_id: account.product_id,
        pipeline_stage: 'entrantes', // Normalizado a minúsculas
        source: 'whatsapp_incoming', // Nuevo source para diferenciar de manuales
        status: 'active',
        last_activity_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (createError) {
      console.error('[createLeadIfNotExists] Error creando lead:', createError);
      return;
    }
    
    console.log('[createLeadIfNotExists] ✅ Lead creado automáticamente:', newLead.id);
  } catch (error) {
    console.error('[createLeadIfNotExists] Error fatal:', error);
    // No lanzar error para no interrumpir el procesamiento del mensaje
  }
}

/**
 * Pausar secuencia si el cliente respondió después de iniciarla
 * FASE 4.2: Detección de respuestas
 */
async function pauseSequenceIfNeeded(contactId: string) {
  try {
    const supabase = getSupabaseClient();
    
    // Verificar si el contacto tiene secuencia activa
    const { data: contact } = await supabase
      .from('whatsapp_contacts')
      .select('sequence_active, sequence_id, sequence_started_at, last_interaction_at, client_responses_count')
      .eq('id', contactId)
      .single();
    
    if (!contact || !contact.sequence_active || !contact.sequence_id) {
      return; // No hay secuencia activa, no hacer nada
    }
    
    // Verificar si el cliente respondió después de iniciar la secuencia
    if (contact.client_responses_count > 0 && contact.last_interaction_at && contact.sequence_started_at) {
      const lastInteraction = new Date(contact.last_interaction_at);
      const sequenceStart = new Date(contact.sequence_started_at);
      
      if (lastInteraction > sequenceStart) {
        // Cliente respondió después de iniciar la secuencia, pausar
        const { error: updateError } = await supabase
          .from('whatsapp_contacts')
          .update({
            sequence_active: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', contactId);
        
        if (updateError) {
          console.error('[pauseSequenceIfNeeded] Error pausando secuencia:', updateError);
        } else {
          console.log(`[pauseSequenceIfNeeded] Secuencia pausada para contacto ${contactId} (cliente respondió)`);
        }
      }
    }
  } catch (err) {
    console.error('[pauseSequenceIfNeeded] Error fatal:', err);
    // No lanzar error, solo loguear
  }
}

async function saveMessage(
  contactId: string,
  accountId: string,
  message: WhatsAppMessage,
  isFromMe: boolean,
  sentVia: 'client' | 'manual' | 'cloud_api' | 'puppeteer'
) {
  const supabase = getSupabaseClient();
  
  let messageType: 'text' | 'audio' | 'image' | 'video' | 'document' = 'text';
  let textContent: string | null = null;
  let mediaUrl: string | null = null;
  let mediaFilename: string | null = null;
  let mediaMimeType: string | null = null;
  let mediaCaption: string | null = null;
  let mediaWaId: string | null = null;
  
  if (message.type === 'text' && message.text) {
    messageType = 'text';
    textContent = message.text.body;
  } else if (message.type === 'image' && message.image) {
    messageType = 'image';
    mediaWaId = message.image.id;
    mediaMimeType = message.image.mime_type;
    mediaCaption = message.image.caption || null;
  } else if (message.type === 'video' && message.video) {
    messageType = 'video';
    mediaWaId = message.video.id;
    mediaMimeType = message.video.mime_type;
    mediaCaption = message.video.caption || null;
  } else if (message.type === 'audio' && message.audio) {
    messageType = 'audio';
    mediaWaId = message.audio.id;
    mediaMimeType = message.audio.mime_type;
  } else if (message.type === 'document' && message.document) {
    messageType = 'document';
    mediaWaId = message.document.id;
    mediaFilename = message.document.filename || null;
    mediaMimeType = message.document.mime_type;
    mediaCaption = message.document.caption || null;
  }
  
  const timestamp = new Date(parseInt(message.timestamp) * 1000).toISOString();
  
  const { data, error } = await supabase
    .from('whatsapp_messages')
    .insert({
      contact_id: contactId,
      account_id: accountId,
      wa_message_id: message.id,
      message_type: messageType,
      text_content: textContent,
      media_url: mediaUrl,
      media_filename: mediaFilename,
      media_mime_type: mediaMimeType,
      media_caption: mediaCaption,
      media_wa_id: mediaWaId,
      is_from_me: isFromMe,
      sent_via: sentVia,
      status: isFromMe ? 'sent' : 'pending',
      timestamp: timestamp
    })
    .select()
    .single();
  
  if (error) {
    console.error('[saveMessage] Error:', error);
    return null;
  }
  
  return data;
}

async function updateMessageStatus(
  waMessageId: string,
  status: 'sent' | 'delivered' | 'read' | 'failed',
  errorMessage?: string
) {
  const supabase = getSupabaseClient();
  
  const updateData: any = {
    status: status,
    status_updated_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  if (errorMessage) {
    updateData.error_message = errorMessage;
  }
  
  const { data, error } = await supabase
    .from('whatsapp_messages')
    .update(updateData)
    .eq('wa_message_id', waMessageId)
    .select()
    .maybeSingle();
  
  if (error) {
    console.error('[updateMessageStatus] Error:', error);
    return null;
  }
  
  return data;
}

async function saveWebhookLog(
  accountId: string | null,
  eventType: string,
  payload: any,
  processed: boolean = false,
  errorMessage?: string
) {
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase
    .from('whatsapp_webhook_logs')
    .insert({
      account_id: accountId,
      event_type: eventType,
      payload: payload,
      processed: processed,
      error_message: errorMessage || null
    })
    .select()
    .single();
  
  if (error) {
    console.error('[saveWebhookLog] Error:', error);
    return null;
  }
  
  return data;
}

// ============================================================================
// FUNCIÓN PRINCIPAL
// ============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // VERIFICACIÓN GET
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const mode = url.searchParams.get('hub.mode');
      const token = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');
      
      console.log('[Webhook GET] Verificación recibida:', { mode, token: token ? '***' : null, challenge });
      
      if (mode !== 'subscribe') {
        console.error('[Webhook GET] Mode inválido:', mode);
        return new Response('Forbidden', { status: 403, headers: corsHeaders });
      }
      
      const supabase = getSupabaseClient();
      
      const { data: account, error: accountError } = await supabase
        .from('whatsapp_accounts')
        .select('id, phone_number_id, verify_token')
        .eq('verify_token', token || '')
        .eq('active', true)
        .maybeSingle();
      
      if (accountError || !account) {
        console.error('[Webhook GET] Token inválido o cuenta no encontrada');
        return new Response('Forbidden', { status: 403, headers: corsHeaders });
      }
      
      console.log('[Webhook GET] Verificación exitosa para cuenta:', account.phone_number_id);
      
      return new Response(challenge || '', {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
      });
    }
    
    // PROCESAMIENTO POST
    if (req.method === 'POST') {
      const payload: WhatsAppWebhookPayload = await req.json();
      
      console.log('[Webhook POST] Payload recibido:', JSON.stringify(payload, null, 2));
      
      if (!payload.object || payload.object !== 'whatsapp_business_account') {
        console.error('[Webhook POST] Object inválido:', payload.object);
        await saveWebhookLog(null, 'invalid_object', payload, false, 'Object no es whatsapp_business_account');
        return new Response(JSON.stringify({ success: false, error: 'Invalid object' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      if (!payload.entry || !Array.isArray(payload.entry) || payload.entry.length === 0) {
        console.error('[Webhook POST] No hay entries en el payload');
        await saveWebhookLog(null, 'no_entries', payload, false, 'No hay entries en el payload');
        return new Response(JSON.stringify({ success: false, error: 'No entries' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      for (const entry of payload.entry) {
        if (!entry.changes || !Array.isArray(entry.changes)) {
          console.warn('[Webhook POST] Entry sin changes:', entry.id);
          continue;
        }
        
        for (const change of entry.changes) {
          if (change.field !== 'messages') {
            console.log('[Webhook POST] Ignorando field:', change.field);
            continue;
          }
          
          const value: WhatsAppWebhookValue = change.value;
          const phoneNumberId = value.metadata?.phone_number_id;
          
          if (!phoneNumberId) {
            console.error('[Webhook POST] No phone_number_id en metadata');
            await saveWebhookLog(null, 'no_phone_number_id', payload, false, 'No phone_number_id');
            continue;
          }
          
          const account = await getAccountByPhoneNumberId(phoneNumberId);
          if (!account) {
            console.error('[Webhook POST] Cuenta no encontrada para phone_number_id:', phoneNumberId);
            await saveWebhookLog(null, 'account_not_found', payload, false, `Account no encontrada: ${phoneNumberId}`);
            continue;
          }
          
          await saveWebhookLog(account.id, 'webhook_received', payload, false);
          
          if (value.messages && Array.isArray(value.messages) && value.messages.length > 0) {
            await processMessages(account.id, value, payload);
          }
          
          if (value.statuses && Array.isArray(value.statuses) && value.statuses.length > 0) {
            await processStatuses(account.id, value, payload);
          }
        }
      }
      
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('[Webhook] Error fatal:', error);
    
    try {
      await saveWebhookLog(null, 'error', { error: error.message }, false, error.message);
    } catch (logError) {
      console.error('[Webhook] Error guardando log:', logError);
    }
    
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// ============================================================================
// PROCESAR MENSAJES
// ============================================================================

async function processMessages(
  accountId: string,
  value: WhatsAppWebhookValue,
  fullPayload: WhatsAppWebhookPayload
) {
  console.log('[processMessages] Procesando mensajes para cuenta:', accountId);
  
  if (!value.messages || !value.contacts) {
    console.warn('[processMessages] No hay mensajes o contactos');
    return;
  }
  
  for (const message of value.messages) {
    try {
      const contactData = value.contacts?.find(c => c.wa_id === message.from);
      if (!contactData) {
        console.warn('[processMessages] Contacto no encontrado para:', message.from);
        continue;
      }
      
      const normalizedPhone = normalizePhone(message.from);
      const contact = await upsertContact(
        accountId,
        normalizedPhone,
        contactData.profile?.name,
        undefined
      );
      
      if (!contact) {
        console.error('[processMessages] Error creando/actualizando contacto');
        continue;
      }
      
      const isFromMe = false;
      const sentVia: 'client' | 'manual' | 'cloud_api' | 'puppeteer' = isFromMe ? 'manual' : 'client';
      
      const savedMessage = await saveMessage(
        contact.id,
        accountId,
        message,
        isFromMe,
        sentVia
      );
      
      if (!savedMessage) {
        console.error('[processMessages] Error guardando mensaje');
        continue;
      }
      
      if (!isFromMe) {
        await updateContactInteraction(contact.id, 'client');
        console.log('[processMessages] Interacción actualizada para contacto:', contact.id);
        
        // FASE 4.2: Pausar secuencia si el cliente respondió
        await pauseSequenceIfNeeded(contact.id);
        
        // FASE 1: Crear lead automáticamente si no existe
        await createLeadIfNotExists(contact.id, accountId);
      }
      
      console.log('[processMessages] Mensaje procesado:', savedMessage.id);
      
    } catch (error) {
      console.error('[processMessages] Error procesando mensaje:', error);
      await saveWebhookLog(accountId, 'message_error', { message, error: error.message }, false, error.message);
    }
  }
}

// ============================================================================
// PROCESAR STATUSES
// ============================================================================

async function processStatuses(
  accountId: string,
  value: WhatsAppWebhookValue,
  fullPayload: WhatsAppWebhookPayload
) {
  console.log('[processStatuses] Procesando statuses para cuenta:', accountId);
  
  if (!value.statuses) {
    return;
  }
  
  for (const status of value.statuses) {
    try {
      const errorMessage = status.errors?.[0]?.message || null;
      const updated = await updateMessageStatus(
        status.id,
        status.status,
        errorMessage
      );
      
      if (!updated) {
        console.warn('[processStatuses] Mensaje no encontrado para actualizar:', status.id);
        continue;
      }
      
      if (status.status === 'delivered' || status.status === 'read') {
        const supabase = getSupabaseClient();
        
        const { data: message } = await supabase
          .from('whatsapp_messages')
          .select('contact_id')
          .eq('wa_message_id', status.id)
          .maybeSingle();
        
        if (message && message.contact_id) {
          const updateField = status.status === 'delivered' ? 'total_messages_delivered' : 'total_messages_read';
          const { error: counterError } = await supabase.rpc('increment_contact_counter', {
            p_contact_id: message.contact_id,
            p_counter: updateField
          });
          
          if (counterError) {
            console.error('[processStatuses] Error incrementando contador:', counterError);
          }
        }
      }
      
      console.log('[processStatuses] Status actualizado:', status.id, status.status);
      
    } catch (error) {
      console.error('[processStatuses] Error procesando status:', error);
      await saveWebhookLog(accountId, 'status_error', { status, error: error.message }, false, error.message);
    }
  }
}
