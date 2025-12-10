-- ============================================================================
-- MIGRACIÓN 018: Agregar product_id a whatsapp_quick_replies
-- FASE 1 - SUBFASE 1.2: Schema y Base de Datos
-- Fecha: 2025-01-30
-- Descripción: Agrega columna product_id a whatsapp_quick_replies para hacerlas independientes por producto
-- ============================================================================

-- ============================================================================
-- 1. AGREGAR COLUMNA product_id
-- ============================================================================

-- Agregar columna product_id (nullable inicialmente para migración)
ALTER TABLE whatsapp_quick_replies
  ADD COLUMN IF NOT EXISTS product_id UUID;

COMMENT ON COLUMN whatsapp_quick_replies.product_id IS 'ID del producto al que pertenece la respuesta rápida (independiente por producto)';

-- ============================================================================
-- 2. AGREGAR ÍNDICE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_quick_replies_product ON whatsapp_quick_replies(product_id);

-- ============================================================================
-- 3. AGREGAR FOREIGN KEY (con manejo de errores si products no existe)
-- ============================================================================

-- Intentar agregar foreign key a products, si no existe, no hacer nada
DO $$
BEGIN
  -- Verificar si existe la tabla products
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products') THEN
    -- Agregar foreign key a products
    BEGIN
      ALTER TABLE whatsapp_quick_replies
        ADD CONSTRAINT fk_quick_replies_product
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
      
      RAISE NOTICE '✅ Foreign key a products agregada';
    EXCEPTION
      WHEN duplicate_object THEN
        RAISE NOTICE '⚠️ Foreign key ya existe, continuando...';
    END;
  ELSE
    RAISE NOTICE '⚠️ Tabla products no existe, omitiendo foreign key';
  END IF;
END $$;

-- ============================================================================
-- 4. VERIFICACIÓN
-- ============================================================================

DO $$
DECLARE
  col_exists BOOLEAN;
  idx_exists BOOLEAN;
BEGIN
  -- Verificar que la columna existe
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'whatsapp_quick_replies' 
      AND column_name = 'product_id'
  ) INTO col_exists;
  
  -- Verificar que el índice existe
  SELECT EXISTS (
    SELECT 1 
    FROM pg_indexes 
    WHERE tablename = 'whatsapp_quick_replies' 
      AND indexname = 'idx_quick_replies_product'
  ) INTO idx_exists;
  
  IF col_exists THEN
    RAISE NOTICE '✅ Columna product_id agregada a whatsapp_quick_replies';
  ELSE
    RAISE WARNING '⚠️ Columna product_id NO encontrada';
  END IF;
  
  IF idx_exists THEN
    RAISE NOTICE '✅ Índice idx_quick_replies_product creado';
  ELSE
    RAISE WARNING '⚠️ Índice idx_quick_replies_product NO encontrado';
  END IF;
END $$;

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================

