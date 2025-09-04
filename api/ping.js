// api/ping.js — prueba mínima
module.exports = async function handler(req, res) {
  res.status(200).json({ ok: true, method: req.method, t: Date.now() });
};
