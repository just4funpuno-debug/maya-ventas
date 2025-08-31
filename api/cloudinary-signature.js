// Serverless function (Vercel) to generate a signed upload signature for Cloudinary
// Expects JSON body with optional: public_id, folder. Always adds timestamp.
// Returns: { signature, timestamp, apiKey, cloudName, folder }

import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const { folder = 'productos', public_id } = req.body || {};
    const timestamp = Math.round(Date.now() / 1000);
    const params = { timestamp, folder };
    if (public_id) params.public_id = public_id;

    // Build signature string sorted alphabetically
    const sorted = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
    const toSign = `${sorted}${process.env.CLOUDINARY_API_SECRET}`;
    const signature = crypto.createHash('sha1').update(toSign).digest('hex');
    return res.status(200).json({ signature, timestamp, apiKey: process.env.CLOUDINARY_API_KEY, cloudName: process.env.CLOUDINARY_CLOUD_NAME, folder });
  } catch (err) {
    return res.status(500).json({ error: 'signature_error', details: err.message });
  }
}
