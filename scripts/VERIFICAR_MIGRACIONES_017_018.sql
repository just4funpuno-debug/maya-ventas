-- ================================================================
-- FASE 1 - SUBFASE 1.1 y 1.2: Verificación de Migraciones
-- ================================================================
-- Objetivo: Verificar que las columnas product_id fueron agregadas correctamente
-- ================================================================

-- Verificar whatsapp_tags
SELECT 
  'whatsapp_tags' AS tabla,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'whatsapp_tags'
  AND column_name = 'product_id';

-- Verificar índice de whatsapp_tags
SELECT 
  'whatsapp_tags' AS tabla,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'whatsapp_tags'
  AND indexname = 'idx_tags_product';

-- Verificar whatsapp_quick_replies
SELECT 
  'whatsapp_quick_replies' AS tabla,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'whatsapp_quick_replies'
  AND column_name = 'product_id';

-- Verificar índice de whatsapp_quick_replies
SELECT 
  'whatsapp_quick_replies' AS tabla,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'whatsapp_quick_replies'
  AND indexname = 'idx_quick_replies_product';

-- Contar registros antes de la migración
SELECT 
  'whatsapp_tags' AS tabla,
  COUNT(*) AS total_registros,
  COUNT(*) FILTER (WHERE product_id IS NULL) AS sin_product_id
FROM whatsapp_tags
UNION ALL
SELECT 
  'whatsapp_quick_replies' AS tabla,
  COUNT(*) AS total_registros,
  COUNT(*) FILTER (WHERE product_id IS NULL) AS sin_product_id
FROM whatsapp_quick_replies;

