/**
 * Utilidad para comprimir imágenes antes de subirlas
 * Usa la misma lógica que las imágenes de productos
 */

/**
 * Comprime una imagen a un tamaño objetivo
 * @param {File} file - Archivo de imagen a comprimir
 * @param {number} targetKB - Tamaño objetivo en KB (default: 60)
 * @param {number} maxSide - Lado máximo en píxeles (default: 500)
 * @returns {Promise<File>} - Archivo comprimido
 */
export async function compressImage(file, targetKB = 60, maxSide = 500) {
  return new Promise((resolve, reject) => {
    // Solo comprimir si es una imagen
    if (!file.type.startsWith('image/')) {
      resolve(file); // Si no es imagen, devolver el archivo original
      return;
    }

    const img = new Image();
    const reader = new FileReader();

    reader.onload = (ev) => {
      if (typeof ev.target?.result !== 'string') {
        reject(new Error('Error leyendo archivo'));
        return;
      }

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let { width, height } = img;

          // Redimensionar si es necesario
          if (width > maxSide || height > maxSide) {
            const scale = Math.min(maxSide / width, maxSide / height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Comprimir con calidad ajustable
          let quality = 0.7;
          let dataURL;
          for (; quality >= 0.3; quality -= 0.1) {
            dataURL = canvas.toDataURL('image/jpeg', quality);
            if ((dataURL.length / 1024) <= targetKB) break;
          }

          // Convertir dataURL a File
          const dataURLtoFile = (dataurl, filename) => {
            const arr = dataurl.split(',');
            const mime = arr[0].match(/:(.*?);/)[1];
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
              u8arr[n] = bstr.charCodeAt(n);
            }
            return new File([u8arr], filename, { type: mime });
          };

          const compressedFile = dataURLtoFile(dataURL, file.name || 'compressed.jpg');
          resolve(compressedFile);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error('Error cargando imagen'));
      };

      img.src = ev.target.result;
    };

    reader.onerror = () => {
      reject(new Error('Error leyendo archivo'));
    };

    reader.readAsDataURL(file);
  });
}


