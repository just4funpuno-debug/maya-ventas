/**
 * Servicio para gestionar frases motivacionales
 * MIGRACIÓN 029: Frases Motivacionales en Supabase
 * 
 * Proporciona funciones CRUD para frases y gestión del saludo diario
 */

import { supabase } from '../supabaseClient';
import { todayISO } from '../App.jsx';

const PHRASES_TABLE = 'motivational_phrases';
const GREETING_LOG_TABLE = 'user_greeting_log';
const PHRASE_POOL_TABLE = 'user_phrase_pool';

// ============================================================================
// CRUD DE FRASES
// ============================================================================

/**
 * Obtener todas las frases activas
 * @returns {Promise<{data: Array|null, error: Object|null}>}
 */
export async function getAllPhrases() {
  try {
    const { data, error } = await supabase
      .from(PHRASES_TABLE)
      .select('*')
      .eq('active', true)
      .order('display_order', { ascending: true });
    
    if (error) {
      console.error('[getAllPhrases] Error:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (err) {
    console.error('[getAllPhrases] Error fatal:', err);
    return { data: null, error: err };
  }
}

/**
 * Obtener todas las frases (incluye inactivas)
 * @returns {Promise<{data: Array|null, error: Object|null}>}
 */
export async function getAllPhrasesIncludingInactive() {
  try {
    const { data, error } = await supabase
      .from(PHRASES_TABLE)
      .select('*')
      .order('display_order', { ascending: true });
    
    if (error) {
      console.error('[getAllPhrasesIncludingInactive] Error:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (err) {
    console.error('[getAllPhrasesIncludingInactive] Error fatal:', err);
    return { data: null, error: err };
  }
}

/**
 * Agregar una nueva frase
 * @param {string} phraseText - Texto de la frase
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function addPhrase(phraseText) {
  try {
    const { data, error } = await supabase.rpc('insert_motivational_phrase', {
      p_phrase_text: phraseText,
      p_active: true
    });
    
    if (error) {
      console.error('[addPhrase] Error:', error);
      return { data: null, error };
    }
    
    // Obtener la frase completa recién creada
    const { data: phrase, error: fetchError } = await supabase
      .from(PHRASES_TABLE)
      .select('*')
      .eq('id', data)
      .single();
    
    if (fetchError) {
      console.error('[addPhrase] Error obteniendo frase:', fetchError);
      return { data: null, error: fetchError };
    }
    
    return { data: phrase, error: null };
  } catch (err) {
    console.error('[addPhrase] Error fatal:', err);
    return { data: null, error: err };
  }
}

/**
 * Actualizar una frase
 * @param {string} phraseId - ID de la frase
 * @param {Object} updates - Campos a actualizar { phrase_text?, active?, display_order? }
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function updatePhrase(phraseId, updates) {
  try {
    const { data, error } = await supabase
      .from(PHRASES_TABLE)
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', phraseId)
      .select()
      .single();
    
    if (error) {
      console.error('[updatePhrase] Error:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (err) {
    console.error('[updatePhrase] Error fatal:', err);
    return { data: null, error: err };
  }
}

/**
 * Eliminar una frase (soft delete: marca como inactiva)
 * @param {string} phraseId - ID de la frase
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function deletePhrase(phraseId) {
  try {
    // Soft delete: marcar como inactiva
    const { data, error } = await supabase
      .from(PHRASES_TABLE)
      .update({ 
        active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', phraseId)
      .select()
      .single();
    
    if (error) {
      console.error('[deletePhrase] Error:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (err) {
    console.error('[deletePhrase] Error fatal:', err);
    return { data: null, error: err };
  }
}

/**
 * Eliminar permanentemente una frase
 * @param {string} phraseId - ID de la frase
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function permanentlyDeletePhrase(phraseId) {
  try {
    const { data, error } = await supabase
      .from(PHRASES_TABLE)
      .delete()
      .eq('id', phraseId)
      .select()
      .single();
    
    if (error) {
      console.error('[permanentlyDeletePhrase] Error:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (err) {
    console.error('[permanentlyDeletePhrase] Error fatal:', err);
    return { data: null, error: err };
  }
}

// ============================================================================
// GESTIÓN DEL SALUDO DIARIO
// ============================================================================

/**
 * Verificar si el usuario ya vio el saludo hoy
 * @param {string} userId - ID del usuario
 * @param {Date|null} todayDate - Fecha de hoy (opcional, usa CURRENT_DATE si no se proporciona)
 * @returns {Promise<{data: boolean, error: Object|null}>}
 */
export async function hasUserSeenGreetingToday(userId, todayDate = null) {
  try {
    // Usar todayISO() para obtener fecha en zona horaria de Bolivia (America/La_Paz)
    const dateParam = todayDate 
      ? todayDate.toISOString().split('T')[0] // YYYY-MM-DD (si se proporciona una fecha específica)
      : todayISO(); // Usar fecha de Bolivia, no UTC/local
    
    const { data, error } = await supabase.rpc('has_user_seen_greeting_today', {
      p_user_id: userId,
      p_today_date: dateParam
    });
    
    if (error) {
      console.error('[hasUserSeenGreetingToday] Error:', error);
      return { data: false, error };
    }
    
    return { data: data === true, error: null };
  } catch (err) {
    console.error('[hasUserSeenGreetingToday] Error fatal:', err);
    return { data: false, error: err };
  }
}

/**
 * Obtener la próxima frase para un usuario (del pool)
 * @param {string} userId - ID del usuario
 * @returns {Promise<{data: {phrase_id: string, phrase_text: string}|null, error: Object|null}>}
 */
export async function getNextPhraseForUser(userId) {
  try {
    const { data, error } = await supabase.rpc('get_next_phrase_for_user', {
      p_user_id: userId
    });
    
    if (error) {
      console.error('[getNextPhraseForUser] Error:', error);
      return { data: null, error };
    }
    
    // La función retorna un array, tomar el primer elemento
    if (data && data.length > 0) {
      return { data: data[0], error: null };
    }
    
    return { data: null, error: { message: 'No hay frases disponibles' } };
  } catch (err) {
    console.error('[getNextPhraseForUser] Error fatal:', err);
    return { data: null, error: err };
  }
}

/**
 * Registrar que un usuario vio un saludo hoy
 * @param {string} userId - ID del usuario
 * @param {string} phraseId - ID de la frase mostrada
 * @param {string} phraseText - Texto de la frase
 * @param {string} saludoType - Tipo de saludo ('Buenos días', 'Buenas tardes', 'Buenas noches')
 * @param {Date|null} greetingDate - Fecha del saludo (opcional, usa hoy si no se proporciona)
 * @returns {Promise<{data: string|null, error: Object|null}>}
 */
export async function logUserGreeting(userId, phraseId, phraseText, saludoType, greetingDate = null) {
  try {
    // Usar todayISO() para obtener fecha en zona horaria de Bolivia (America/La_Paz)
    const dateParam = greetingDate 
      ? greetingDate.toISOString().split('T')[0] // YYYY-MM-DD (si se proporciona una fecha específica)
      : todayISO(); // Usar fecha de Bolivia, no UTC/local
    
    const { data, error } = await supabase.rpc('log_user_greeting', {
      p_user_id: userId,
      p_greeting_date: dateParam,
      p_phrase_id: phraseId,
      p_phrase_text: phraseText,
      p_saludo_type: saludoType
    });
    
    if (error) {
      console.error('[logUserGreeting] Error:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (err) {
    console.error('[logUserGreeting] Error fatal:', err);
    return { data: null, error: err };
  }
}

/**
 * Obtener historial de saludos de un usuario
 * @param {string} userId - ID del usuario
 * @param {number} limit - Límite de resultados (default: 30)
 * @returns {Promise<{data: Array|null, error: Object|null}>}
 */
export async function getUserGreetingHistory(userId, limit = 30) {
  try {
    const { data, error } = await supabase
      .from(GREETING_LOG_TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('greeting_date', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('[getUserGreetingHistory] Error:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (err) {
    console.error('[getUserGreetingHistory] Error fatal:', err);
    return { data: null, error: err };
  }
}

// ============================================================================
// MIGRACIÓN DESDE LOCALSTORAGE
// ============================================================================

/**
 * Migrar frases desde localStorage a Supabase
 * Solo inserta frases que no existen ya
 * @param {Array<string>} phrases - Array de frases desde localStorage
 * @returns {Promise<{data: {inserted: number, skipped: number}, error: Object|null}>}
 */
export async function migratePhrasesFromLocalStorage(phrases) {
  try {
    if (!phrases || phrases.length === 0) {
      return { data: { inserted: 0, skipped: 0 }, error: null };
    }
    
    // Obtener frases existentes
    const { data: existingPhrases, error: fetchError } = await getAllPhrasesIncludingInactive();
    if (fetchError) {
      return { data: null, error: fetchError };
    }
    
    const existingTexts = new Set((existingPhrases || []).map(p => p.phrase_text.trim().toLowerCase()));
    
    // Filtrar frases nuevas
    const newPhrases = phrases.filter(phrase => {
      const normalized = phrase.trim().toLowerCase();
      return !existingTexts.has(normalized);
    });
    
    if (newPhrases.length === 0) {
      return { data: { inserted: 0, skipped: phrases.length }, error: null };
    }
    
    // Insertar nuevas frases
    let inserted = 0;
    let errors = [];
    
    for (const phraseText of newPhrases) {
      const { error } = await addPhrase(phraseText.trim());
      if (error) {
        errors.push({ phrase: phraseText, error });
      } else {
        inserted++;
      }
    }
    
    if (errors.length > 0) {
      console.warn('[migratePhrasesFromLocalStorage] Algunas frases no se insertaron:', errors);
    }
    
    return { 
      data: { 
        inserted, 
        skipped: phrases.length - newPhrases.length + (newPhrases.length - inserted)
      }, 
      error: errors.length > 0 ? errors[0].error : null 
    };
  } catch (err) {
    console.error('[migratePhrasesFromLocalStorage] Error fatal:', err);
    return { data: null, error: err };
  }
}

