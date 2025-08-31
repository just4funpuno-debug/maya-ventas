// Serverless function to delete an image from Cloudinary by public_id
// Body: { public_id }
import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const { public_id } = req.body || {};
    if (!public_id) return res.status(400).json({ error: 'public_id_required' });
    const timestamp = Math.round(Date.now() / 1000);
    const toSignBase = `public_id=${public_id}&timestamp=${timestamp}${process.env.CLOUDINARY_API_SECRET}`;
    const signature = crypto.createHash('sha1').update(toSignBase).digest('hex');
    const form = new URLSearchParams();
    form.append('public_id', public_id);
    form.append('timestamp', String(timestamp));
    form.append('api_key', process.env.CLOUDINARY_API_KEY);
    form.append('signature', signature);

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const resp = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
      method: 'POST',
      body: form
    });
    const json = await resp.json();
    return res.status(200).json(json);
  } catch (err) {
    return res.status(500).json({ error: 'delete_error', details: err.message });
  }
}
