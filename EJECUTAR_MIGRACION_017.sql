-- ================================================================
-- FASE 1 - SUBFASE 1.1: Ejecutar migración 017
-- ================================================================
-- Objetivo: Agregar product_id a whatsapp_tags
-- ================================================================

-- Ejecutar migración
\i supabase/migrations/017_add_product_id_to_tags.sql

-- Verificar resultado
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'whatsapp_tags'
  AND column_name = 'product_id';

-- Verificar índice
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'whatsapp_tags'
  AND indexname = 'idx_tags_product';

