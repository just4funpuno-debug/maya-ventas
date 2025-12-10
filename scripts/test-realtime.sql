-- ============================================================================
-- SCRIPT DE TESTING PARA STORAGE Y REALTIME
-- Ejecutar después de la migración 003 para verificar configuración
-- ============================================================================

-- ============================================================================
-- TEST 1: VERIFICAR BUCKET DE STORAGE
-- ============================================================================

SELECT 'TEST 1: Verificar bucket whatsapp-media' as test_name;

-- Verificar si el bucket existe (requiere permisos de service_role)
-- Nota: Este query solo funciona con service_role key
SELECT 
  'Bucket whatsapp-media' as check_name,
  name,
  id,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE name = 'whatsapp-media';

-- Si el bucket no existe, mostrar mensaje
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE name = 'whatsapp-media'
  ) THEN
    RAISE NOTICE '⚠️ Bucket "whatsapp-media" no existe. Crear desde Supabase Dashboard > Storage';
  ELSE
    RAISE NOTICE '✅ Bucket "whatsapp-media" existe';
  END IF;
END $$;

-- ============================================================================
-- TEST 2: VERIFICAR POLÍTICAS DE STORAGE
-- ============================================================================

SELECT 'TEST 2: Verificar políticas de Storage' as test_name;

SELECT 
  'Políticas de Storage' as check_name,
  policyname,
  cmd as operation,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE 'whatsapp_media%'
ORDER BY policyname;

-- Verificar que todas las políticas existen
SELECT 
  'Resumen de políticas' as check_name,
  COUNT(*) as total_politicas,
  CASE 
    WHEN COUNT(*) >= 4 THEN '✅ Todas las políticas creadas'
    ELSE '⚠️ Faltan políticas'
  END as estado
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE 'whatsapp_media%';

-- ============================================================================
-- TEST 3: VERIFICAR FUNCIONES AUXILIARES
-- ============================================================================

SELECT 'TEST 3: Verificar funciones auxiliares' as test_name;

-- Test 3.1: get_whatsapp_media_url
SELECT 
  'Test 3.1: get_whatsapp_media_url' as scenario,
  get_whatsapp_media_url('images/test.jpg') as url_generada,
  get_whatsapp_media_url('videos/test.mp4', 'whatsapp-media') as url_video;

-- Test 3.2: validate_whatsapp_media_type
SELECT 
  'Test 3.2: validate_whatsapp_media_type - Imagen válida' as scenario,
  validate_whatsapp_media_type('test.jpg', 'image') as es_valida;

SELECT 
  'Test 3.2: validate_whatsapp_media_type - Video válido' as scenario,
  validate_whatsapp_media_type('test.mp4', 'video') as es_valida;

SELECT 
  'Test 3.2: validate_whatsapp_media_type - Audio válido' as scenario,
  validate_whatsapp_media_type('test.mp3', 'audio') as es_valida;

SELECT 
  'Test 3.2: validate_whatsapp_media_type - Documento válido' as scenario,
  validate_whatsapp_media_type('test.pdf', 'document') as es_valida;

SELECT 
  'Test 3.2: validate_whatsapp_media_type - Tipo incorrecto' as scenario,
  validate_whatsapp_media_type('test.jpg', 'video') as es_valida; -- Debe ser false

-- ============================================================================
-- TEST 4: VERIFICAR REALTIME (MANUAL)
-- ============================================================================

SELECT 'TEST 4: Verificar Realtime (verificar manualmente)' as test_name;

-- Listar tablas que deben tener Realtime habilitado
SELECT 
  'Tablas para Realtime' as check_name,
  table_name,
  'Verificar en Dashboard > Database > Replication' as instruccion
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'whatsapp_contacts',
    'whatsapp_messages',
    'puppeteer_queue',
    'whatsapp_delivery_issues'
  )
ORDER BY table_name;

-- Nota: No hay forma de verificar Realtime via SQL
-- Debe verificarse manualmente desde Supabase Dashboard

DO $$
BEGIN
  RAISE NOTICE '⚠️ IMPORTANTE: Verificar Realtime manualmente';
  RAISE NOTICE '   1. Ir a Supabase Dashboard > Database > Replication';
  RAISE NOTICE '   2. Verificar que estas tablas tienen Realtime habilitado:';
  RAISE NOTICE '      - whatsapp_contacts';
  RAISE NOTICE '      - whatsapp_messages';
  RAISE NOTICE '      - puppeteer_queue';
  RAISE NOTICE '      - whatsapp_delivery_issues';
END $$;

-- ============================================================================
-- RESUMEN DE VERIFICACIÓN
-- ============================================================================

SELECT 
  'RESUMEN DE VERIFICACIÓN' as summary,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE 'whatsapp_media%') as politicas_storage,
  (SELECT COUNT(*) FROM pg_proc WHERE proname IN ('get_whatsapp_media_url', 'validate_whatsapp_media_type')) as funciones_auxiliares,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('whatsapp_contacts', 'whatsapp_messages', 'puppeteer_queue', 'whatsapp_delivery_issues')) as tablas_para_realtime;

-- ============================================================================
-- INSTRUCCIONES PARA CONFIGURACIÓN MANUAL
-- ============================================================================

SELECT 
  'INSTRUCCIONES MANUALES' as seccion,
  '1. Crear bucket whatsapp-media desde Dashboard > Storage' as paso_1,
  '2. Habilitar Realtime en tablas críticas desde Dashboard > Database > Replication' as paso_2,
  '3. Verificar políticas de Storage con este script' as paso_3,
  '4. Probar subida de archivo de prueba al bucket' as paso_4;

