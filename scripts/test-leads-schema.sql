-- ================================================================
-- TEST: Verificación de Schema de Leads
-- FASE 1 - SUBFASE 1.1: Testing de Tablas
-- ================================================================
-- Ejecutar después de la migración 013 para verificar que todo está correcto
-- ================================================================

-- 1. Verificar que las tablas existen
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('whatsapp_leads', 'whatsapp_lead_activities', 'whatsapp_pipelines')
ORDER BY table_name;

-- 2. Verificar columnas de whatsapp_leads
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'whatsapp_leads'
ORDER BY ordinal_position;

-- 3. Verificar columnas de whatsapp_lead_activities
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'whatsapp_lead_activities'
ORDER BY ordinal_position;

-- 4. Verificar columnas de whatsapp_pipelines
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'whatsapp_pipelines'
ORDER BY ordinal_position;

-- 5. Verificar índices
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('whatsapp_leads', 'whatsapp_lead_activities', 'whatsapp_pipelines')
ORDER BY tablename, indexname;

-- 6. Verificar triggers
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table IN ('whatsapp_leads', 'whatsapp_pipelines')
ORDER BY event_object_table, trigger_name;

-- 7. Verificar RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('whatsapp_leads', 'whatsapp_lead_activities', 'whatsapp_pipelines')
ORDER BY tablename, policyname;

-- 8. Verificar constraints (foreign keys, checks)
SELECT
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'public'
  AND tc.table_name IN ('whatsapp_leads', 'whatsapp_lead_activities', 'whatsapp_pipelines')
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;

-- 9. Probar insertar lead de prueba (requiere contact_id y account_id válidos)
-- NOTA: Comentar si no hay datos de prueba disponibles
/*
DO $$
DECLARE
  v_contact_id UUID;
  v_account_id UUID;
  v_product_id UUID;
  v_lead_id UUID;
BEGIN
  -- Obtener IDs de prueba (ajustar según tus datos)
  SELECT id INTO v_contact_id FROM whatsapp_contacts LIMIT 1;
  SELECT id INTO v_account_id FROM whatsapp_accounts WHERE active = true LIMIT 1;
  SELECT id INTO v_product_id FROM products WHERE (sintetico = false OR sintetico IS NULL) LIMIT 1;
  
  IF v_contact_id IS NULL OR v_account_id IS NULL THEN
    RAISE NOTICE 'No hay datos de prueba disponibles (contactos o cuentas)';
    RETURN;
  END IF;
  
  -- Insertar lead de prueba
  INSERT INTO whatsapp_leads (
    contact_id,
    account_id,
    product_id,
    pipeline_stage,
    source,
    status
  ) VALUES (
    v_contact_id,
    v_account_id,
    v_product_id,
    'entrantes',
    'manual',
    'active'
  ) RETURNING id INTO v_lead_id;
  
  RAISE NOTICE 'Lead de prueba creado con ID: %', v_lead_id;
  
  -- Insertar actividad de prueba
  INSERT INTO whatsapp_lead_activities (
    lead_id,
    type,
    content,
    user_id
  ) VALUES (
    v_lead_id,
    'note',
    'Lead creado para testing',
    NULL
  );
  
  RAISE NOTICE 'Actividad de prueba creada';
  
  -- Limpiar datos de prueba
  DELETE FROM whatsapp_lead_activities WHERE lead_id = v_lead_id;
  DELETE FROM whatsapp_leads WHERE id = v_lead_id;
  
  RAISE NOTICE 'Datos de prueba eliminados';
END $$;
*/

-- 10. Verificar que las tablas están vacías (o con datos si ya hay)
SELECT 
  'whatsapp_leads' AS tabla,
  COUNT(*) AS total_registros
FROM whatsapp_leads
UNION ALL
SELECT 
  'whatsapp_lead_activities' AS tabla,
  COUNT(*) AS total_registros
FROM whatsapp_lead_activities
UNION ALL
SELECT 
  'whatsapp_pipelines' AS tabla,
  COUNT(*) AS total_registros
FROM whatsapp_pipelines;

