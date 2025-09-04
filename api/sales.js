// api/sales.js — CommonJS para Vercel Functions con chequeo de envs
const { createClient } = require('@supabase/supabase-js')

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

module.exports = async function handler(req, res) {
  try {
    if (!URL || !SERVICE_KEY) {
      return res.status(500).json({
        error: 'Missing environment variables',
        need: {
          NEXT_PUBLIC_SUPABASE_URL: !!URL,
          SUPABASE_SERVICE_ROLE_KEY: !!SERVICE_KEY
        }
      })
    }

    const supabase = createClient(URL, SERVICE_KEY)

    if (req.method === 'POST') {
      const { cantidad } = req.body || {}
      if (typeof cantidad !== 'number') {
        return res.status(400).json({ error: 'cantidad debe ser un número' })
      }
      const { data, error } = await supabase.rpc('safe_insert_sale', { p_cantidad: cantidad })
      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json({ ok: true, data })
    }

    if (req.method === 'PUT') {
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
      const { id } = req.body || {}
      if (typeof id !== 'number') {
        return res.status(400).json({ error: 'id debe ser un número' })
      }
      const { data, error } = await supabase.rpc('safe_delete_sale', { p_id: id })
      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json({ ok: true, data })
    }

    return res.status(405).json({ error: 'Método no permitido' })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
