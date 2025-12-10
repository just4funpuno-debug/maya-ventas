// Serverless function (Vercel) to generate a signed upload signature for Cloudinary
// Expects JSON body with optional: public_id, folder. Always adds timestamp.
// Returns: { signature, timestamp, apiKey, cloudName, folder }



// No usar dotenv en serverless Vercel, las env se inyectan automáticamente
import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  // Asegurar que el body esté parseado (Vercel lo hace, pero para local puedes necesitar bodyParser)
  const { folder = 'productos', public_id } = req.body || {};
  const timestamp = Math.round(Date.now() / 1000);
  const params = { timestamp, folder };
  if (public_id) params.public_id = public_id;

  // Validar variables de entorno
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName) {
    return res.status(500).json({ error: 'Falta CLOUDINARY_CLOUD_NAME en variables de entorno' });
  }
  if (!apiKey || !apiSecret) {
    return res.status(500).json({ error: 'Faltan CLOUDINARY_API_KEY o CLOUDINARY_API_SECRET en variables de entorno' });
  }

  // Build signature string sorted alphabetically
  const sorted = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
  const toSign = `${sorted}${apiSecret}`;
  const signature = crypto.createHash('sha1').update(toSign).digest('hex');
  return res.status(200).json({
    signature,
    timestamp,
    apiKey,
    cloudName,
    folder
  });
}
