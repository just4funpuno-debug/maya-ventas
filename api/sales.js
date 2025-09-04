// api/sales.js — CommonJS para Vercel Functions
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // 🔒 solo servidor
)

module.exports = async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      // Body JSON: { "cantidad": 9 }
      const { cantidad } = req.body || {}
      if (typeof cantidad !== 'number') {
        return res.status(400).json({ error: 'cantidad debe ser un número' })
      }
      const { data, error } = await supabase.rpc('safe_insert_sale', { p_cantidad: cantidad })
      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json({ ok: true, data })
    }

    if (req.method === 'PUT') {
      // Body JSON: { "id": 1, "cantidad": 7, "version": 0 }
      const { id, cantidad, version } = req.body || {}
      if (typeof id !== 'number' || typeof cantidad !== 'number' || typeof version !== 'number') {
        return res.status(400).json({ error: 'id, cantidad y version deben ser números' })
      }
      const { data, error } = await supabase.rpc('safe_update_sales', {
        p_id: id, p_cantidad: cantidad, p_version: version
      })
      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json({ ok: true, data })
    }

    if (req.method === 'DELETE') {
      // Body JSON: { "id": 1 }
      const { id } = req.body || {}
      if (typeof id !== 'number') {
        return res.status(400).json({ error: 'id debe ser un número' })
      }
      const { data, error } = await supabase.rpc('safe_delete_sale', { p_id: id })
      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json({ ok: true, data })
    }

    // GET u otros métodos
    return res.status(405).json({ error: 'Método no permitido' })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
