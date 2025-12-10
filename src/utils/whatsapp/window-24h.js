/**
 * Utilidades para trabajar con ventana 24h de WhatsApp
 * FASE 2: Utilidades de ventana 24h
 */

import { supabase } from '../../supabaseClient';

/**
 * Verificar si la ventana 24h está activa
 * @param {string} contactId - ID del contacto
 * @returns {Promise<boolean>}
 */
export async function isWindow24hActive(contactId) {
  try {
    const { data, error } = await supabase.rpc('is_window_active', {
      p_window_expires_at: null // Se calculará en la función SQL
    });

    if (error) {
      console.error('[isWindow24hActive] Error:', error);
      return false;
    }

    // Obtener contacto para calcular ventana
    const { data: contact } = await supabase
      .from('whatsapp_contacts')
      .select('window_expires_at')
      .eq('id', contactId)
      .single();

    if (!contact || !contact.window_expires_at) {
      return false;
    }

    const expiresAt = new Date(contact.window_expires_at);
    const now = new Date();
    
    return now < expiresAt;
  } catch (err) {
    console.error('[isWindow24hActive] Error fatal:', err);
    return false;
  }
}

/**
 * Calcular horas restantes en ventana 24h
 * @param {string} contactId - ID del contacto
 * @returns {Promise<number|null>} Horas restantes o null si no hay ventana activa
 */
export async function getHoursRemaining(contactId) {
  try {
    const { data: contact } = await supabase
      .from('whatsapp_contacts')
      .select('window_expires_at')
      .eq('id', contactId)
      .single();

    if (!contact || !contact.window_expires_at) {
      return null;
    }

    const expiresAt = new Date(contact.window_expires_at);
    const now = new Date();

    if (now >= expiresAt) {
      return null; // Ventana cerrada
    }

    const hoursRemaining = (expiresAt - now) / (1000 * 60 * 60);
    return Math.max(0, hoursRemaining);
  } catch (err) {
    console.error('[getHoursRemaining] Error fatal:', err);
    return null;
  }
}

/**
 * Verificar si el contacto está dentro de la ventana 72h
 * @param {string} contactId - ID del contacto
 * @returns {Promise<{isWithin72h: boolean, hoursSinceCreation: number|null}>}
 */
export async function isWithin72hWindow(contactId) {
  try {
    const { data: contact } = await supabase
      .from('whatsapp_contacts')
      .select('created_at')
      .eq('id', contactId)
      .single();

    if (!contact || !contact.created_at) {
      return { isWithin72h: false, hoursSinceCreation: null };
    }

    const createdAt = new Date(contact.created_at);
    const now = new Date();
    const hoursSinceCreation = (now - createdAt) / (1000 * 60 * 60);
    const isWithin72h = hoursSinceCreation < 72;

    return { isWithin72h, hoursSinceCreation };
  } catch (err) {
    console.error('[isWithin72hWindow] Error fatal:', err);
    return { isWithin72h: false, hoursSinceCreation: null };
  }
}


