-- ============================================================================
-- MIGRACIÓN 006: INTEGRACIÓN CON SISTEMA DE VENTAS
-- FASE 7: SUBFASE 7.1.1 - Integración con Sistema de Ventas
-- Fecha: 2025-01-30
-- Descripción: Agrega relación entre contactos WhatsApp y ventas
-- ============================================================================

-- ============================================================================
-- 1. TABLA DE RELACIÓN MUCHOS-A-MUCHOS
-- ============================================================================
-- Un contacto puede tener múltiples ventas
-- Una venta puede estar asociada a un contacto (o ninguno)

CREATE TABLE IF NOT EXISTS whatsapp_contact_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES whatsapp_contacts(id) ON DELETE CASCADE NOT NULL,
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Evitar duplicados
  UNIQUE(contact_id, sale_id)
);

COMMENT ON TABLE whatsapp_contact_sales IS 'Relación muchos-a-muchos entre contactos WhatsApp y ventas';
COMMENT ON COLUMN whatsapp_contact_sales.contact_id IS 'ID del contacto de WhatsApp';
COMMENT ON COLUMN whatsapp_contact_sales.sale_id IS 'ID de la venta';

-- ============================================================================
-- 2. ÍNDICES PARA BÚSQUEDAS RÁPIDAS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_contact_sales_contact ON whatsapp_contact_sales(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_sales_sale ON whatsapp_contact_sales(sale_id);
CREATE INDEX IF NOT EXISTS idx_contact_sales_created ON whatsapp_contact_sales(created_at DESC);

-- ============================================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE whatsapp_contact_sales ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas (ajustar según necesidades de seguridad)
CREATE POLICY "whatsapp_contact_sales_select_all" 
  ON whatsapp_contact_sales FOR SELECT 
  USING (true);

CREATE POLICY "whatsapp_contact_sales_insert_all" 
  ON whatsapp_contact_sales FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "whatsapp_contact_sales_update_all" 
  ON whatsapp_contact_sales FOR UPDATE 
  USING (true);

CREATE POLICY "whatsapp_contact_sales_delete_all" 
  ON whatsapp_contact_sales FOR DELETE 
  USING (true);

-- ============================================================================
-- 4. FUNCIÓN HELPER: Obtener ventas de un contacto
-- ============================================================================

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
  FROM whatsapp_contact_sales wcs
  INNER JOIN sales s ON s.id = wcs.sale_id
  WHERE wcs.contact_id = p_contact_id
  ORDER BY s.fecha DESC, s.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_contact_sales(UUID) IS 'Obtiene todas las ventas asociadas a un contacto WhatsApp';

-- ============================================================================
-- 5. FUNCIÓN HELPER: Obtener contacto de una venta
-- ============================================================================

CREATE OR REPLACE FUNCTION get_sale_contact(p_sale_id UUID)
RETURNS TABLE (
  contact_id UUID,
  phone VARCHAR,
  name VARCHAR,
  account_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wc.id AS contact_id,
    wc.phone,
    wc.name,
    wc.account_id
  FROM whatsapp_contact_sales wcs
  INNER JOIN whatsapp_contacts wc ON wc.id = wcs.contact_id
  WHERE wcs.sale_id = p_sale_id
  LIMIT 1; -- Una venta puede tener solo un contacto principal
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_sale_contact(UUID) IS 'Obtiene el contacto WhatsApp asociado a una venta';

-- ============================================================================
-- 6. VERIFICACIÓN
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migración 006 completada: Integración con Sistema de Ventas';
  RAISE NOTICE '   - Tabla whatsapp_contact_sales creada';
  RAISE NOTICE '   - Índices creados';
  RAISE NOTICE '   - RLS habilitado';
  RAISE NOTICE '   - Funciones helper creadas';
END $$;

