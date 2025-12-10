-- ================================================================
-- FASE 1 - SUBFASE 1.2: Ejecutar migración 018
-- ================================================================
-- Objetivo: Agregar product_id a whatsapp_quick_replies
-- ================================================================

-- Ejecutar migración
\i supabase/migrations/018_add_product_id_to_quick_replies.sql

-- Verificar resultado
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'whatsapp_quick_replies'
  AND column_name = 'product_id';

-- Verificar índice
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'whatsapp_quick_replies'
  AND indexname = 'idx_quick_replies_product';

