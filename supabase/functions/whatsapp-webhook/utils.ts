/**
 * Utilidades para procesar webhooks de WhatsApp
 * SUBFASE 1.5: Funciones auxiliares para procesamiento
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { WhatsAppWebhookValue, WhatsAppMessage, WhatsAppStatus, WhatsAppContact } from './types.ts';

// ============================================================================
// CLIENTE SUPABASE
// ============================================================================

export function getSupabaseClient() {
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

// ============================================================================
// OBTENER CUENTA POR PHONE NUMBER ID
// ============================================================================

export async function getAccountByPhoneNumberId(phoneNumberId: string) {
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

// ============================================================================
// CREAR O ACTUALIZAR CONTACTO
// ============================================================================

export async function upsertContact(
  accountId: string,
  phone: string,
  name?: string,
  profilePicUrl?: string
) {
  const supabase = getSupabaseClient();
  
  // Normalizar teléfono (remover espacios, guiones, etc.)
  const normalizedPhone = phone.replace(/[^\d+]/g, '');
  
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

// ============================================================================
// ACTUALIZAR INTERACCIÓN DEL CONTACTO
// ============================================================================

export async function updateContactInteraction(
  contactId: string,
  source: 'client' | 'manual' | 'cloud_api' | 'puppeteer'
) {
  const supabase = getSupabaseClient();
  
  // Llamar a la función SQL que actualiza la interacción
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

// ============================================================================
// GUARDAR MENSAJE EN BD
// ============================================================================

export async function saveMessage(
  contactId: string,
  accountId: string,
  message: WhatsAppMessage,
  isFromMe: boolean,
  sentVia: 'client' | 'manual' | 'cloud_api' | 'puppeteer'
) {
  const supabase = getSupabaseClient();
  
  // Extraer datos del mensaje según tipo
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
  
  // Convertir timestamp de WhatsApp (segundos) a ISO string
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

// ============================================================================
// ACTUALIZAR STATUS DE MENSAJE
// ============================================================================

export async function updateMessageStatus(
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

// ============================================================================
// GUARDAR LOG DE WEBHOOK
// ============================================================================

export async function saveWebhookLog(
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
// DETECTAR SI ES ENVÍO MANUAL
// ============================================================================

export function isManualSend(message: WhatsAppMessage, accountPhoneNumberId: string): boolean {
  // En WhatsApp Cloud API, los mensajes enviados manualmente desde el celular
  // NO tienen el campo `from` igual al número del negocio
  // Pero para detectar envíos manuales, necesitamos verificar si:
  // 1. El mensaje tiene `is_from_me = true` (esto viene en el webhook)
  // 2. O si el `from` es diferente al número del negocio
  
  // Nota: WhatsApp Cloud API no envía `is_from_me` explícitamente en el webhook
  // Necesitamos inferirlo: si el mensaje viene con `from` = número del negocio
  // y fue enviado por nosotros, entonces es manual
  
  // Por ahora, asumimos que si el mensaje tiene `from` y no es del cliente,
  // podría ser un envío manual. Esto se refinará cuando tengamos más información.
  
  return false; // Se determinará mejor cuando procesemos el mensaje
}

// ============================================================================
// NORMALIZAR TELÉFONO
// ============================================================================

export function normalizePhone(phone: string): string {
  // Remover espacios, guiones, paréntesis, etc.
  return phone.replace(/[^\d+]/g, '');
}

