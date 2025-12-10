/**
 * Servicio para integrar WhatsApp CRM con el sistema de ventas
 * FASE 7: SUBFASE 7.1.2 - Integración con Sistema de Ventas
 */

import { supabase } from '../../supabaseClient';

const CONTACTS_TABLE = 'whatsapp_contacts';
const SALES_TABLE = 'sales';
const CONTACT_SALES_TABLE = 'whatsapp_contact_sales';

/**
 * Normalizar número de teléfono para búsqueda
 * Elimina espacios, guiones, paréntesis y convierte a formato estándar
 * @param {string} phone - Número de teléfono
 * @returns {string} Número normalizado
 */
function normalizePhone(phone) {
  if (!phone) return '';
  // Eliminar espacios, guiones, paréntesis
  return phone.replace(/[\s\-\(\)]/g, '').trim();
}

/**
 * Buscar contacto por teléfono
 * @param {string} phone - Número de teléfono
 * @param {string} accountId - ID de la cuenta WhatsApp
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function findContactByPhone(phone, accountId) {
  try {
    if (!phone || !accountId) {
      return { data: null, error: { message: 'phone y accountId son requeridos' } };
    }

    const normalizedPhone = normalizePhone(phone);

    // Buscar contacto por teléfono normalizado
    const { data, error } = await supabase
      .from(CONTACTS_TABLE)
      .select('*')
      .eq('account_id', accountId)
      .eq('phone', normalizedPhone)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('[findContactByPhone] Error:', error);
      return { data: null, error };
    }

    return { data: data || null, error: null };
  } catch (err) {
    console.error('[findContactByPhone] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Crear contacto desde una venta
 * @param {string} saleId - ID de la venta
 * @param {string} accountId - ID de la cuenta WhatsApp
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function createContactFromSale(saleId, accountId) {
  try {
    if (!saleId || !accountId) {
      return { data: null, error: { message: 'saleId y accountId son requeridos' } };
    }

    // Obtener datos de la venta
    const { data: sale, error: saleError } = await supabase
      .from(SALES_TABLE)
      .select('*')
      .eq('id', saleId)
      .single();

    if (saleError || !sale) {
      console.error('[createContactFromSale] Error obteniendo venta:', saleError);
      return { data: null, error: saleError || { message: 'Venta no encontrada' } };
    }

    // Validar que la venta tenga teléfono
    if (!sale.celular || sale.celular.trim() === '') {
      return { data: null, error: { message: 'La venta no tiene teléfono asociado' } };
    }

    const normalizedPhone = normalizePhone(sale.celular);

    // Verificar si ya existe un contacto con este teléfono
    const { data: existingContact } = await findContactByPhone(normalizedPhone, accountId);
    
    if (existingContact) {
      // Si ya existe, asociar la venta con el contacto existente
      const { data: association, error: assocError } = await associateContactWithSale(
        existingContact.id,
        saleId
      );

      if (assocError) {
        return { data: null, error: assocError };
      }

      return { 
        data: existingContact, 
        error: null,
        wasExisting: true 
      };
    }

    // Crear nuevo contacto
    const { data: newContact, error: contactError } = await supabase
      .from(CONTACTS_TABLE)
      .insert({
        account_id: accountId,
        phone: normalizedPhone,
        name: sale.cliente || `Cliente ${normalizedPhone}`,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (contactError) {
      console.error('[createContactFromSale] Error creando contacto:', contactError);
      return { data: null, error: contactError };
    }

    // Asociar contacto con venta
    const { error: assocError } = await supabase
      .from(CONTACT_SALES_TABLE)
      .insert({
        contact_id: newContact.id,
        sale_id: saleId
      });

    if (assocError) {
      console.error('[createContactFromSale] Error asociando venta:', assocError);
      // No fallar si la asociación falla, el contacto ya fue creado
      return { data: newContact, error: null, associationError: assocError };
    }

    return { data: newContact, error: null, wasExisting: false };
  } catch (err) {
    console.error('[createContactFromSale] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Asociar contacto con una venta
 * @param {string} contactId - ID del contacto
 * @param {string} saleId - ID de la venta
 * @returns {Promise<{success: boolean, error: Object|null}>}
 */
export async function associateContactWithSale(contactId, saleId) {
  try {
    if (!contactId || !saleId) {
      return { success: false, error: { message: 'contactId y saleId son requeridos' } };
    }

    // Verificar que el contacto existe
    const { data: contact, error: contactError } = await supabase
      .from(CONTACTS_TABLE)
      .select('id')
      .eq('id', contactId)
      .single();

    if (contactError || !contact) {
      return { success: false, error: contactError || { message: 'Contacto no encontrado' } };
    }

    // Verificar que la venta existe
    const { data: sale, error: saleError } = await supabase
      .from(SALES_TABLE)
      .select('id')
      .eq('id', saleId)
      .single();

    if (saleError || !sale) {
      return { success: false, error: saleError || { message: 'Venta no encontrada' } };
    }

    // Crear asociación (ignorar si ya existe por UNIQUE constraint)
    const { error } = await supabase
      .from(CONTACT_SALES_TABLE)
      .insert({
        contact_id: contactId,
        sale_id: saleId
      });

    if (error) {
      // Si es error de duplicado, considerarlo éxito
      if (error.code === '23505') { // unique_violation
        return { success: true, error: null };
      }
      console.error('[associateContactWithSale] Error:', error);
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('[associateContactWithSale] Error fatal:', err);
    return { success: false, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Obtener todas las ventas de un contacto
 * @param {string} contactId - ID del contacto
 * @returns {Promise<{data: Array, error: Object|null}>}
 */
export async function getContactSales(contactId) {
  try {
    if (!contactId) {
      return { data: null, error: { message: 'contactId es requerido' } };
    }

    // Usar función RPC o query directa
    const { data, error } = await supabase.rpc('get_contact_sales', {
      p_contact_id: contactId
    });

    if (error) {
      console.error('[getContactSales] Error:', error);
      return { data: null, error };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('[getContactSales] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Obtener contacto asociado a una venta
 * @param {string} saleId - ID de la venta
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function getSaleContact(saleId) {
  try {
    if (!saleId) {
      return { data: null, error: { message: 'saleId es requerido' } };
    }

    // Usar función RPC
    const { data, error } = await supabase.rpc('get_sale_contact', {
      p_sale_id: saleId
    });

    if (error) {
      console.error('[getSaleContact] Error:', error);
      return { data: null, error };
    }

    // La función retorna un array, tomar el primer elemento
    return { data: data && data.length > 0 ? data[0] : null, error: null };
  } catch (err) {
    console.error('[getSaleContact] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Desasociar contacto de una venta
 * @param {string} contactId - ID del contacto
 * @param {string} saleId - ID de la venta
 * @returns {Promise<{success: boolean, error: Object|null}>}
 */
export async function disassociateContactFromSale(contactId, saleId) {
  try {
    if (!contactId || !saleId) {
      return { success: false, error: { message: 'contactId y saleId son requeridos' } };
    }

    const { error } = await supabase
      .from(CONTACT_SALES_TABLE)
      .delete()
      .eq('contact_id', contactId)
      .eq('sale_id', saleId);

    if (error) {
      console.error('[disassociateContactFromSale] Error:', error);
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('[disassociateContactFromSale] Error fatal:', err);
    return { success: false, error: { message: err.message || 'Error desconocido' } };
  }
}


