// Frontend helper for signed uploads to Cloudinary
// Usage: const { secure_url, public_id } = await uploadProductImage(file, optionalPublicId)

export async function getSignature(params = {}) {
  const resp = await fetch('/api/cloudinary-signature', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  if (!resp.ok) throw new Error('No se pudo obtener firma');
  return resp.json();
}

export async function uploadProductImage(file, opts = {}) {
  // (optional) pre-compress large images client-side via canvas if desired (reuse existing logic outside)
  const { public_id, folder = 'productos' } = opts;
  const { signature, timestamp, apiKey, cloudName } = await getSignature({ public_id, folder });
  const form = new FormData();
  form.append('file', file);
  form.append('api_key', apiKey);
  form.append('timestamp', timestamp);
  form.append('signature', signature);
  form.append('folder', folder);
  if (public_id) form.append('public_id', public_id);
  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
  const resp = await fetch(uploadUrl, { method: 'POST', body: form });
  const json = await resp.json();
  if (!resp.ok || json.error) throw new Error(json.error?.message || 'Error al subir');
  return json; // includes secure_url, public_id
}
