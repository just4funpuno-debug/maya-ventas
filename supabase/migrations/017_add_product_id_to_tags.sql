-- ============================================================================
-- MIGRACIÓN 017: Agregar product_id a whatsapp_tags
-- FASE 1 - SUBFASE 1.1: Schema y Base de Datos
-- Fecha: 2025-01-30
-- Descripción: Agrega columna product_id a whatsapp_tags para hacerlas independientes por producto
-- ============================================================================

-- ============================================================================
-- 1. AGREGAR COLUMNA product_id
-- ============================================================================

-- Agregar columna product_id (nullable inicialmente para migración)
ALTER TABLE whatsapp_tags
  ADD COLUMN IF NOT EXISTS product_id UUID;

COMMENT ON COLUMN whatsapp_tags.product_id IS 'ID del producto al que pertenece la etiqueta (independiente por producto)';

-- ============================================================================
-- 2. AGREGAR ÍNDICE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_tags_product ON whatsapp_tags(product_id);

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
      ALTER TABLE whatsapp_tags
        ADD CONSTRAINT fk_tags_product
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
      AND table_name = 'whatsapp_tags' 
      AND column_name = 'product_id'
  ) INTO col_exists;
  
  -- Verificar que el índice existe
  SELECT EXISTS (
    SELECT 1 
    FROM pg_indexes 
    WHERE tablename = 'whatsapp_tags' 
      AND indexname = 'idx_tags_product'
  ) INTO idx_exists;
  
  IF col_exists THEN
    RAISE NOTICE '✅ Columna product_id agregada a whatsapp_tags';
  ELSE
    RAISE WARNING '⚠️ Columna product_id NO encontrada';
  END IF;
  
  IF idx_exists THEN
    RAISE NOTICE '✅ Índice idx_tags_product creado';
  ELSE
    RAISE WARNING '⚠️ Índice idx_tags_product NO encontrado';
  END IF;
END $$;

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================

