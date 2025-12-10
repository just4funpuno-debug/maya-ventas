-- ============================================================================
-- EJECUTAR MIGRACIÓN 006: INTEGRACIÓN CON SISTEMA DE VENTAS
-- ============================================================================
-- Este script crea la tabla whatsapp_contact_sales y la función get_contact_sales
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

-- 1. Crear tabla de relación SIN foreign key primero (para evitar error si sales no es tabla)
CREATE TABLE IF NOT EXISTS whatsapp_contact_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES whatsapp_contacts(id) ON DELETE CASCADE NOT NULL,
  sale_id UUID NOT NULL, -- Sin foreign key constraint por ahora
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contact_id, sale_id)
);

-- 2. Intentar agregar foreign key constraint si sales es una tabla
DO $$
BEGIN
  -- Verificar si sales es una tabla (no una vista)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'sales' 
    AND table_type = 'BASE TABLE'
  ) THEN
    -- Intentar agregar constraint si no existe
    BEGIN
      ALTER TABLE whatsapp_contact_sales 
      ADD CONSTRAINT whatsapp_contact_sales_sale_id_fkey 
      FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN
      -- El constraint ya existe, ignorar
      NULL;
    END;
  END IF;
END $$;

-- 3. Crear índices
CREATE INDEX IF NOT EXISTS idx_contact_sales_contact ON whatsapp_contact_sales(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_sales_sale ON whatsapp_contact_sales(sale_id);
CREATE INDEX IF NOT EXISTS idx_contact_sales_created ON whatsapp_contact_sales(created_at DESC);

-- 4. Habilitar RLS
ALTER TABLE whatsapp_contact_sales ENABLE ROW LEVEL SECURITY;

-- 5. Crear políticas RLS
DROP POLICY IF EXISTS "whatsapp_contact_sales_select_all" ON whatsapp_contact_sales;
CREATE POLICY "whatsapp_contact_sales_select_all" 
  ON whatsapp_contact_sales FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "whatsapp_contact_sales_insert_all" ON whatsapp_contact_sales;
CREATE POLICY "whatsapp_contact_sales_insert_all" 
  ON whatsapp_contact_sales FOR INSERT 
  WITH CHECK (true);

DROP POLICY IF EXISTS "whatsapp_contact_sales_update_all" ON whatsapp_contact_sales;
CREATE POLICY "whatsapp_contact_sales_update_all" 
  ON whatsapp_contact_sales FOR UPDATE 
  USING (true);

DROP POLICY IF EXISTS "whatsapp_contact_sales_delete_all" ON whatsapp_contact_sales;
CREATE POLICY "whatsapp_contact_sales_delete_all" 
  ON whatsapp_contact_sales FOR DELETE 
  USING (true);

-- 6. Crear función get_contact_sales
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
  INNER JOIN public.sales s ON s.id = wcs.sale_id
  WHERE wcs.contact_id = p_contact_id
  ORDER BY s.fecha DESC, s.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verificar que se creó correctamente
SELECT '✅ Migración 006 completada' AS status;
