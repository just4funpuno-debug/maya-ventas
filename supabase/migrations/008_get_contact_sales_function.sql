-- ============================================================================
-- MIGRACIÓN 008: Función get_contact_sales
-- Fecha: 2025-01-30
-- Descripción: Crea función SQL para obtener ventas asociadas a un contacto
-- ============================================================================

-- Crear tabla de relación si no existe
CREATE TABLE IF NOT EXISTS whatsapp_contact_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES whatsapp_contacts(id) ON DELETE CASCADE NOT NULL,
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contact_id, sale_id)
);

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_contact_sales_contact_id 
  ON whatsapp_contact_sales(contact_id);

CREATE INDEX IF NOT EXISTS idx_contact_sales_sale_id 
  ON whatsapp_contact_sales(sale_id);

-- Función para obtener ventas de un contacto
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

COMMENT ON FUNCTION get_contact_sales(UUID) IS 'Obtiene todas las ventas asociadas a un contacto de WhatsApp';


