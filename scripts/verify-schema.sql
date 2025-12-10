-- ============================================================================
-- SCRIPT DE VERIFICACIÓN DEL SCHEMA WHATSAPP
-- Ejecutar después de la migración 001 para verificar que todo está correcto
-- ============================================================================

-- Verificar tablas
SELECT 
  'Tablas' as tipo,
  COUNT(*) as cantidad,
  CASE 
    WHEN COUNT(*) = 9 THEN '✅ Correcto'
    ELSE '❌ Faltan tablas'
  END as estado
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'whatsapp_accounts',
    'whatsapp_contacts',
    'whatsapp_messages',
    'whatsapp_sequences',
    'whatsapp_sequence_messages',
    'puppeteer_queue',
    'puppeteer_config',
    'whatsapp_delivery_issues',
    'whatsapp_webhook_logs'
  );

-- Verificar índices críticos
SELECT 
  'Índices' as tipo,
  COUNT(*) as cantidad,
  CASE 
    WHEN COUNT(*) >= 15 THEN '✅ Suficientes'
    ELSE '⚠️ Pueden faltar índices'
  END as estado
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename LIKE 'whatsapp%' OR tablename = 'puppeteer_queue';

-- Verificar triggers
SELECT 
  'Triggers' as tipo,
  COUNT(*) as cantidad,
  CASE 
    WHEN COUNT(*) >= 6 THEN '✅ Correcto'
    ELSE '⚠️ Faltan triggers'
  END as estado
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name LIKE '%updated%';

-- Verificar RLS
SELECT 
  'RLS' as tipo,
  COUNT(*) as tablas_con_rls,
  CASE 
    WHEN COUNT(*) = 9 THEN '✅ Todas las tablas tienen RLS'
    ELSE '⚠️ Faltan políticas RLS'
  END as estado
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'whatsapp_accounts',
    'whatsapp_contacts',
    'whatsapp_messages',
    'whatsapp_sequences',
    'whatsapp_sequence_messages',
    'puppeteer_queue',
    'puppeteer_config',
    'whatsapp_delivery_issues',
    'whatsapp_webhook_logs'
  )
  AND rowsecurity = true;

-- Verificar constraints importantes
SELECT 
  'Constraints' as tipo,
  constraint_name,
  table_name
FROM information_schema.table_constraints
WHERE constraint_schema = 'public'
  AND constraint_type = 'UNIQUE'
  AND table_name IN (
    'whatsapp_accounts',
    'whatsapp_contacts',
    'whatsapp_messages',
    'whatsapp_sequence_messages',
    'puppeteer_config'
  )
ORDER BY table_name;

-- Resumen final
SELECT 
  'RESUMEN' as seccion,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'whatsapp%' OR table_name = 'puppeteer_queue' OR table_name = 'puppeteer_config') as tablas,
  (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND (tablename LIKE 'whatsapp%' OR tablename = 'puppeteer_queue')) as indices,
  (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public' AND trigger_name LIKE '%updated%') as triggers,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND (tablename LIKE 'whatsapp%' OR tablename = 'puppeteer_queue' OR tablename = 'puppeteer_config') AND rowsecurity = true) as tablas_con_rls;

