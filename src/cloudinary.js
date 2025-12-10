// Frontend helper for signed uploads to Cloudinary
// Usage: const { secure_url, public_id } = await uploadProductImage(file, optionalPublicId)

// Permite usar endpoint local en desarrollo
const SIGNATURE_URL = import.meta.env.VITE_CLOUDINARY_SIGNATURE_URL || '/api/cloudinary-signature';

export async function getSignature(params = {}) {
  const resp = await fetch(SIGNATURE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  let json = null;
  let rawText = '';
  try { rawText = await resp.text(); json = JSON.parse(rawText); } catch { /* ignore parse */ }
  if (!resp.ok) {
    const msg = json?.error || json?.details || rawText || ('No se pudo obtener firma ('+resp.status+')');
    throw new Error('firma_error: '+msg);
  }
  if(!json) throw new Error('Respuesta vacía de firma');
  return json;
}

export async function uploadProductImage(file, opts = {}) {
  // (optional) pre-compress large images client-side via canvas if desired (reuse existing logic outside)
  const { public_id, folder = 'productos' } = opts;
  const { signature, timestamp, apiKey, cloudName, folder: signedFolder } = await getSignature({ public_id, folder });
  const form = new FormData();
  form.append('file', file);
  form.append('api_key', apiKey);
  form.append('timestamp', timestamp);
  form.append('signature', signature);
  form.append('folder', signedFolder); // usa el folder firmado
  if (public_id) form.append('public_id', public_id);
  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
  const resp = await fetch(uploadUrl, { method: 'POST', body: form });
  const json = await resp.json();
  if (!resp.ok || json.error) throw new Error(json.error?.message || 'Error al subir');
  return json; // includes secure_url, public_id
}

export async function deleteProductImage(public_id){
  if(!public_id) return { skipped: true };
  try {
    const resp = await fetch('/api/cloudinary-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ public_id })
    });
    let data=null; try { data = await resp.json(); } catch { /* ignore */ }
    if(!resp.ok){ throw new Error(data?.error||('No se pudo borrar ('+resp.status+')')); }
    return { ok:true, result:data };
  } catch(err){
    console.warn('[cloudinary delete] fallo', public_id, err.message);
    return { ok:false, error:err.message };
  }
}
