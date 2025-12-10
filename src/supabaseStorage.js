// Funciones para subir imágenes a Supabase Storage
// Usado en todos los entornos (desarrollo y producción)

import { supabase } from './supabaseClient';

/**
 * Sube una imagen a Supabase Storage
 * @param {string|File} file - Archivo (File) o base64 string
 * @param {string} folder - Carpeta donde guardar (default: 'productos')
 * @returns {Promise<{url: string, path: string}>}
 */
export async function uploadImageToSupabase(file, folder = 'productos') {
  try {
    // Convertir base64 a File si es necesario
    let fileToUpload = file;
    let fileName = `product_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
    
    if (typeof file === 'string' && file.startsWith('data:')) {
      // Convertir base64 a Blob
      const response = await fetch(file);
      const blob = await response.blob();
      fileToUpload = new File([blob], fileName, { type: 'image/jpeg' });
    } else if (file instanceof File) {
      fileName = file.name || fileName;
      fileToUpload = file;
    } else {
      throw new Error('Formato de archivo no soportado');
    }

    // Generar ruta única
    const filePath = `${folder}/${Date.now()}_${fileName}`;

    // Subir a Supabase Storage
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(filePath, fileToUpload, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      throw new Error(`Error subiendo imagen: ${error.message}`);
    }

    // Obtener URL pública
    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      throw new Error('No se pudo obtener la URL pública de la imagen');
    }

    return {
      url: urlData.publicUrl,
      path: filePath
    };
  } catch (error) {
    console.error('[supabaseStorage] Error subiendo imagen:', error);
    throw error;
  }
}

/**
 * Sube un comprobante (imagen o PDF) a Supabase Storage
 * @param {File} file - Archivo a subir
 * @param {string} folder - Carpeta donde guardar (default: 'comprobantes')
 * @returns {Promise<{url: string, path: string}>}
 */
export async function uploadComprobanteToSupabase(file, folder = 'comprobantes') {
  try {
    if (!(file instanceof File)) {
      throw new Error('Se requiere un objeto File');
    }

    // Validar tamaño (máx 2MB)
    if (file.size > 2 * 1024 * 1024) {
      throw new Error('El archivo supera el límite de 2MB');
    }

    // Validar tipo MIME
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Tipo de archivo no permitido. Solo imágenes (JPEG, PNG, WebP) y PDF');
    }

    // Generar nombre único
    const extension = file.name.split('.').pop() || 'jpg';
    const fileName = `comprobante_${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;
    const filePath = `${folder}/${fileName}`;

    // Subir a Supabase Storage
    const { data, error } = await supabase.storage
      .from('comprobantes')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      throw new Error(`Error subiendo comprobante: ${error.message}`);
    }

    // Obtener URL pública
    const { data: urlData } = supabase.storage
      .from('comprobantes')
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      throw new Error('No se pudo obtener la URL pública del comprobante');
    }

    return {
      url: urlData.publicUrl,
      path: filePath,
      secure_url: urlData.publicUrl // Compatibilidad con formato Cloudinary
    };
  } catch (error) {
    console.error('[supabaseStorage] Error subiendo comprobante:', error);
    throw error;
  }
}

/**
 * Elimina una imagen de Supabase Storage
 * @param {string} path - Ruta del archivo en Storage
 * @returns {Promise<boolean>}
 */
export async function deleteImageFromSupabase(path) {
  try {
    if (!path) return true; // Si no hay path, no hay nada que eliminar

    // Extraer el path del bucket si es una URL completa
    let filePath = path;
    if (path.includes('/storage/v1/object/public/product-images/')) {
      filePath = path.split('/storage/v1/object/public/product-images/')[1];
    }

    const { error } = await supabase.storage
      .from('product-images')
      .remove([filePath]);

    if (error) {
      console.warn('[supabaseStorage] Error eliminando imagen:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.warn('[supabaseStorage] Error eliminando imagen:', error);
    return false;
  }
}

/**
 * Sube una imagen de producto (compatible con API de Cloudinary)
 * Esta función mantiene la misma interfaz que uploadProductImage de Cloudinary
 * para facilitar la migración.
 * 
 * @param {File|string} file - Archivo a subir (File o base64 string)
 * @param {object} opts - Opciones: { folder, public_id }
 * @returns {Promise<{secure_url: string, public_id: string, url: string}>}
 */
export async function uploadProductImage(file, opts = {}) {
  try {
    const { folder = 'productos' } = opts;
    
    // Determinar el bucket según el folder
    let bucketName = 'product-images';
    if (folder === 'comprobantes') {
      bucketName = 'comprobantes';
    } else if (folder === 'maya-productos' || folder === 'productos') {
      bucketName = 'product-images';
    }
    
    // Si es comprobante, usar la función específica
    if (folder === 'comprobantes' && file instanceof File) {
      const result = await uploadComprobanteToSupabase(file, folder);
      return {
        secure_url: result.url,
        public_id: result.path,
        url: result.url
      };
    }
    
    // Para imágenes de productos
    const result = await uploadImageToSupabase(file, folder);
    return {
      secure_url: result.url,
      public_id: result.path,
      url: result.url
    };
  } catch (error) {
    console.error('[supabaseStorage] Error en uploadProductImage:', error);
    throw error;
  }
}

/**
 * Elimina una imagen (compatible con API de Cloudinary)
 * @param {string} public_id - Path o public_id de la imagen
 * @returns {Promise<{ok: boolean, skipped?: boolean, error?: string}>}
 */
export async function deleteProductImage(public_id) {
  if (!public_id) {
    return { skipped: true };
  }
  
  try {
    const success = await deleteImageFromSupabase(public_id);
    return { ok: success };
  } catch (error) {
    console.warn('[supabaseStorage] Error en deleteProductImage:', error);
    return { ok: false, error: error.message };
  }
}

