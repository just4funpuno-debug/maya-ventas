/**
 * Servicio para enviar respuestas rápidas
 * FASE 2: SUBFASE 2.2 - Servicios Backend
 */

import { getQuickReplyById } from './quick-replies';
import { sendMessageIntelligent } from './send-decision';
import { supabase } from '../../supabaseClient';

const STORAGE_BUCKET = 'whatsapp-media';

/**
 * Descargar archivo desde Storage y convertirlo a File
 * @param {string} filePath - Ruta del archivo en Storage
 * @returns {Promise<File>}
 */
async function downloadFileFromStorage(filePath) {
  try {
    // Descargar archivo desde Storage
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(filePath);

    if (error) {
      throw new Error(`Error descargando archivo: ${error.message}`);
    }

    // Obtener el nombre del archivo desde la ruta
    const fileName = filePath.split('/').pop() || 'file';

    // Convertir Blob a File
    const file = new File([data], fileName, { type: data.type });

    return file;
  } catch (err) {
    console.error('[downloadFileFromStorage] Error:', err);
    throw err;
  }
}

/**
 * Enviar una respuesta rápida
 * @param {string} accountId - ID de la cuenta WhatsApp
 * @param {string} contactId - ID del contacto
 * @param {string} quickReplyId - ID de la respuesta rápida
 * @param {Object} [options] - Opciones adicionales para el envío
 * @returns {Promise<{success: boolean, results: Array, error: Object|null}>}
 */
export async function sendQuickReply(accountId, contactId, quickReplyId, options = {}) {
  try {
    if (!accountId || !contactId || !quickReplyId) {
      return {
        success: false,
        results: [],
        error: { message: 'accountId, contactId y quickReplyId son requeridos' }
      };
    }

    // Obtener la respuesta rápida
    const { data: quickReply, error: quickReplyError } = await getQuickReplyById(quickReplyId);

    if (quickReplyError || !quickReply) {
      return {
        success: false,
        results: [],
        error: quickReplyError || { message: 'Respuesta rápida no encontrada' }
      };
    }

    // Verificar que pertenece a la cuenta correcta
    if (quickReply.account_id !== accountId) {
      return {
        success: false,
        results: [],
        error: { message: 'La respuesta rápida no pertenece a esta cuenta' }
      };
    }

    const results = [];
    let lastError = null;

    // Enviar según el tipo
    switch (quickReply.type) {
      case 'text':
        // Solo texto
        const textResult = await sendMessageIntelligent(
          accountId,
          contactId,
          'text',
          { contentText: quickReply.content_text },
          options
        );

        results.push(textResult);
        if (textResult.error) {
          lastError = textResult.error;
        }
        break;

      case 'image':
        // Solo imagen
        try {
          const imageFile = await downloadFileFromStorage(quickReply.media_path);
          const imageResult = await sendMessageIntelligent(
            accountId,
            contactId,
            'image',
            { mediaFile: imageFile },
            options
          );

          results.push(imageResult);
          if (imageResult.error) {
            lastError = imageResult.error;
          }
        } catch (err) {
          lastError = { message: `Error descargando imagen: ${err.message}` };
          results.push({ success: false, error: lastError });
        }
        break;

      case 'image_text':
        // Imagen + texto (enviar primero imagen con caption, luego texto si es necesario)
        try {
          const imageFile = await downloadFileFromStorage(quickReply.media_path);

          // Enviar imagen con caption
          const imageResult = await sendMessageIntelligent(
            accountId,
            contactId,
            'image',
            {
              mediaFile: imageFile,
              caption: quickReply.content_text // Caption en la imagen
            },
            options
          );

          results.push(imageResult);
          if (imageResult.error) {
            lastError = imageResult.error;
          }
          // WhatsApp Cloud API permite caption en imágenes, así que no necesitamos enviar texto adicional
        } catch (err) {
          lastError = { message: `Error descargando imagen: ${err.message}` };
          results.push({ success: false, error: lastError });
        }
        break;

      case 'audio':
        // Solo audio
        try {
          const audioFile = await downloadFileFromStorage(quickReply.media_path);
          const audioResult = await sendMessageIntelligent(
            accountId,
            contactId,
            'audio',
            { mediaFile: audioFile },
            options
          );

          results.push(audioResult);
          if (audioResult.error) {
            lastError = audioResult.error;
          }
        } catch (err) {
          lastError = { message: `Error descargando audio: ${err.message}` };
          results.push({ success: false, error: lastError });
        }
        break;

      case 'audio_text':
        // Audio + texto (enviar primero texto, luego audio)
        // 1. Enviar texto
        const textResult2 = await sendMessageIntelligent(
          accountId,
          contactId,
          'text',
          { contentText: quickReply.content_text },
          options
        );

        results.push(textResult2);
        if (textResult2.error) {
          lastError = textResult2.error;
        } else {
          // 2. Enviar audio (solo si el texto se envió correctamente)
          try {
            const audioFile = await downloadFileFromStorage(quickReply.media_path);
            const audioResult = await sendMessageIntelligent(
              accountId,
              contactId,
              'audio',
              { mediaFile: audioFile },
              options
            );

            results.push(audioResult);
            if (audioResult.error) {
              lastError = audioResult.error;
            }
          } catch (err) {
            lastError = { message: `Error descargando audio: ${err.message}` };
            results.push({ success: false, error: lastError });
          }
        }
        break;

      default:
        return {
          success: false,
          results: [],
          error: { message: `Tipo de respuesta rápida no soportado: ${quickReply.type}` }
        };
    }

    // Determinar éxito general
    const allSuccessful = results.every(r => r.success !== false);
    const hasErrors = results.some(r => r.error);

    return {
      success: allSuccessful && !hasErrors,
      results,
      error: lastError || null
    };
  } catch (err) {
    console.error('[sendQuickReply] Error fatal:', err);
    return {
      success: false,
      results: [],
      error: { message: err.message || 'Error desconocido' }
    };
  }
}

