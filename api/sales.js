// api/sales.js — Prueba mínima (debe responder 200 en GET/POST/etc.)
module.exports = async function handler(req, res) {
  try {
    res.status(200).json({
      ok: true,
      method: req.method,
      now: new Date().toISOString()
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
