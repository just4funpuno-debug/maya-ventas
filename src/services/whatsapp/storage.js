/**
 * Servicio para subir media a Supabase Storage (bucket whatsapp-media)
 * FASE 4: SUBFASE 4.1 - Storage para Media de Secuencias
 */

import { supabase } from '../../supabaseClient';

const STORAGE_BUCKET = 'whatsapp-media';

/**
 * Sube un archivo de media al bucket whatsapp-media de Supabase Storage
 * @param {File} file - Archivo a subir
 * @param {string} messageType - Tipo de mensaje (image, video, audio, document)
 * @returns {Promise<{url: string, path: string}>}
 */
export async function uploadMediaToWhatsAppStorage(file, messageType) {
  try {
    if (!(file instanceof File)) {
      throw new Error('Se requiere un objeto File');
    }

    // Validar tamaño según tipo
    const fileSizeKB = file.size / 1024;
    const maxSizes = {
      image: 300, // KB
      video: 10240, // KB (10 MB)
      audio: 10240, // KB (10 MB)
      document: 10240 // KB (10 MB)
    };

    const maxSize = maxSizes[messageType];
    if (maxSize && fileSizeKB > maxSize) {
      throw new Error(
        `El archivo es demasiado grande. Máximo para ${messageType}: ${maxSize} KB (${(maxSize / 1024).toFixed(1)} MB)`
      );
    }

    // Validar tipo MIME según messageType
    const allowedTypes = {
      image: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
      video: ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo'],
      audio: ['audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/wav', 'audio/aac'],
      document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    };

    const allowed = allowedTypes[messageType] || [];
    if (allowed.length > 0 && !allowed.includes(file.type)) {
      throw new Error(`Tipo de archivo no permitido para ${messageType}. Tipos permitidos: ${allowed.join(', ')}`);
    }

    // Generar nombre único
    const extension = file.name.split('.').pop() || 'bin';
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const fileName = `${messageType}_${timestamp}_${random}.${extension}`;
    const filePath = `${messageType}s/${fileName}`;

    // Subir a Supabase Storage
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      throw new Error(`Error subiendo archivo: ${error.message}`);
    }

    // Obtener URL pública
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      throw new Error('No se pudo obtener la URL pública del archivo');
    }

    return {
      url: urlData.publicUrl,
      path: filePath
    };
  } catch (error) {
    console.error('[uploadMediaToWhatsAppStorage] Error:', error);
    throw error;
  }
}


