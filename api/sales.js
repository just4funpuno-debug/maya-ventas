import { createClient } from '@supabase/supabase-js'

// Cliente Supabase con service_role (solo en servidor)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // 🔒 nunca en frontend
)

export default async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      // Crear venta: { cantidad: number }
      const { cantidad } = req.body
      if (typeof cantidad !== 'number') {
        return res.status(400).json({ error: 'cantidad debe ser un número' })
      }
      const { data, error } = await supabase.rpc('safe_insert_sale', { p_cantidad: cantidad })
      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json({ ok: true, data })
    }

    if (req.method === 'PUT') {
      // Actualizar venta: { id: number, cantidad: number, version: number }
      const { id, cantidad, version } = req.body
      if (typeof id !== 'number' || typeof cantidad !== 'number' || typeof version !== 'number') {
        return res.status(400).json({ error: 'id, cantidad y version deben ser números' })
      }
      const { data, error } = await supabase.rpc('safe_update_sales', {
        p_id: id,
        p_cantidad: cantidad,
        p_version: version,
      })
      if (error) return res.status(500).json({ error: error.message })
      return res.status(200).json({ ok: true, data })
    }

    if (req.method === 'DELETE') {
      // Eliminar venta: { id: number }
      const { id } = req.body
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
