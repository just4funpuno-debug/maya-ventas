-- ============================================================================
-- SCRIPT DE VERIFICACIÓN: Campos OAuth en whatsapp_accounts
-- Fecha: 2025-12-02
-- Descripción: Verifica que los campos OAuth se agregaron correctamente
-- ============================================================================

-- Verificar que los campos existen
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'whatsapp_accounts'
  AND column_name IN (
    'meta_app_id',
    'meta_user_id',
    'oauth_access_token',
    'oauth_refresh_token',
    'oauth_expires_at',
    'connection_method',
    'coexistence_status',
    'coexistence_qr_url',
    'coexistence_verified_at'
  )
ORDER BY column_name;

-- Verificar índices
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'whatsapp_accounts'
  AND indexname IN (
    'idx_whatsapp_accounts_meta_app_id',
    'idx_whatsapp_accounts_connection_method',
    'idx_whatsapp_accounts_coexistence_status'
  )
ORDER BY indexname;

-- Verificar constraints CHECK
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'whatsapp_accounts'::regclass
  AND contype = 'c'
  AND (
    conname LIKE '%connection_method%' OR
    conname LIKE '%coexistence_status%'
  );

-- Resumen
SELECT 
  'RESUMEN' AS seccion,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_schema = 'public' 
   AND table_name = 'whatsapp_accounts'
   AND column_name IN (
     'meta_app_id', 'meta_user_id', 'oauth_access_token', 
     'oauth_refresh_token', 'oauth_expires_at', 'connection_method',
     'coexistence_status', 'coexistence_qr_url', 'coexistence_verified_at'
   )) AS campos_oauth,
  (SELECT COUNT(*) FROM pg_indexes 
   WHERE tablename = 'whatsapp_accounts'
   AND (indexname LIKE 'idx_whatsapp_accounts_%oauth%' 
   OR indexname LIKE 'idx_whatsapp_accounts_%connection%'
   OR indexname LIKE 'idx_whatsapp_accounts_%coexistence%')) AS indices_oauth;

