-- ============================================================================
-- EJECUTAR: Crear función get_contact_sales
-- ============================================================================
-- INSTRUCCIONES:
-- 1. Copia todo este contenido
-- 2. Ve a Supabase Dashboard > SQL Editor
-- 3. Pega este SQL y ejecuta
-- ============================================================================

-- Crear tabla de relación si no existe
CREATE TABLE IF NOT EXISTS whatsapp_contact_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES whatsapp_contacts(id) ON DELETE CASCADE NOT NULL,
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contact_id, sale_id)
);

-- Crear índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_contact_sales_contact_id 
  ON whatsapp_contact_sales(contact_id);

CREATE INDEX IF NOT EXISTS idx_contact_sales_sale_id 
  ON whatsapp_contact_sales(sale_id);

-- Actualizar función para retornar todas las columnas necesarias
CREATE OR REPLACE FUNCTION get_contact_sales(p_contact_id UUID)
RETURNS TABLE (
  sale_id UUID,
  fecha DATE,
  ciudad TEXT,
  cliente TEXT,
  celular TEXT,
  sku TEXT,
  cantidad INT,
  precio NUMERIC(12,2),
  total NUMERIC(12,2),
  metodo TEXT,
  estado_entrega TEXT,
  vendedora TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id AS sale_id,
    s.fecha,
    s.ciudad,
    s.cliente,
    s.celular,
    s.sku,
    s.cantidad,
    s.precio,
    s.total,
    s.metodo,
    s.estado_entrega,
    s.vendedora,
    s.notas,
    s.created_at
  FROM sales s
  INNER JOIN whatsapp_contact_sales wcs ON s.id = wcs.sale_id
  WHERE wcs.contact_id = p_contact_id
  ORDER BY s.fecha DESC, s.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verificar que la función se creó correctamente
SELECT 
  routine_name, 
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name = 'get_contact_sales';

