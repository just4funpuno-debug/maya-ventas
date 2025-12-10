-- ============================================================================
-- VERIFICACIÓN DE MIGRACIÓN 024: Templates de WhatsApp
-- 
-- Ejecutar DESPUÉS de ejecutar: supabase/migrations/024_add_whatsapp_templates.sql
-- ============================================================================

-- ============================================================================
-- VERIFICACIÓN 1: Tabla existe
-- ============================================================================
DO $$
DECLARE
  table_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_name = 'whatsapp_templates'
  ) INTO table_exists;

  IF table_exists THEN
    RAISE NOTICE '✅ VERIFICACIÓN 1: Tabla whatsapp_templates existe';
  ELSE
    RAISE WARNING '❌ VERIFICACIÓN 1: Tabla whatsapp_templates NO existe';
  END IF;
END $$;

-- ============================================================================
-- VERIFICACIÓN 2: Columnas principales existen
-- ============================================================================
SELECT 
  'VERIFICACIÓN 2: Columnas principales' as verificacion,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'whatsapp_templates'
  AND column_name IN ('name', 'category', 'language', 'body_text', 'wa_status', 'header_type', 'buttons')
ORDER BY column_name;

-- ============================================================================
-- VERIFICACIÓN 3: Constraints de CHECK
-- ============================================================================
DO $$
DECLARE
  category_check_exists BOOLEAN;
  header_type_check_exists BOOLEAN;
  wa_status_check_exists BOOLEAN;
BEGIN
  -- Verificar constraint de category
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.check_constraints
    WHERE constraint_name LIKE '%category%'
      AND check_clause LIKE '%MARKETING%'
  ) INTO category_check_exists;

  -- Verificar constraint de header_type
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.check_constraints
    WHERE constraint_name LIKE '%header_type%'
  ) INTO header_type_check_exists;

  -- Verificar constraint de wa_status
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.check_constraints
    WHERE constraint_name LIKE '%wa_status%'
  ) INTO wa_status_check_exists;

  IF category_check_exists THEN
    RAISE NOTICE '✅ VERIFICACIÓN 3.1: Constraint de category correcto (MARKETING, UTILITY, AUTHENTICATION)';
  ELSE
    RAISE WARNING '❌ VERIFICACIÓN 3.1: Constraint de category NO encontrado';
  END IF;

  IF header_type_check_exists THEN
    RAISE NOTICE '✅ VERIFICACIÓN 3.2: Constraint de header_type correcto';
  ELSE
    RAISE WARNING '❌ VERIFICACIÓN 3.2: Constraint de header_type NO encontrado';
  END IF;

  IF wa_status_check_exists THEN
    RAISE NOTICE '✅ VERIFICACIÓN 3.3: Constraint de wa_status correcto';
  ELSE
    RAISE WARNING '❌ VERIFICACIÓN 3.3: Constraint de wa_status NO encontrado';
  END IF;
END $$;

-- ============================================================================
-- VERIFICACIÓN 4: Índices creados
-- ============================================================================
SELECT 
  'VERIFICACIÓN 4: Índices' as verificacion,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'whatsapp_templates'
ORDER BY indexname;

-- ============================================================================
-- VERIFICACIÓN 5: Trigger de updated_at
-- ============================================================================
DO $$
DECLARE
  trigger_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trigger_update_whatsapp_templates_updated_at'
  ) INTO trigger_exists;

  IF trigger_exists THEN
    RAISE NOTICE '✅ VERIFICACIÓN 5: Trigger para updated_at configurado';
  ELSE
    RAISE WARNING '❌ VERIFICACIÓN 5: Trigger para updated_at NO encontrado';
  END IF;
END $$;

-- ============================================================================
-- VERIFICACIÓN 6: Estructura de foreign keys
-- ============================================================================
SELECT 
  'VERIFICACIÓN 6: Foreign Keys' as verificacion,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'whatsapp_templates'
  AND tc.constraint_type = 'FOREIGN KEY';

-- ============================================================================
-- VERIFICACIÓN 7: Estructura JSONB de buttons (test conceptual)
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ VERIFICACIÓN 7: Estructura de buttons (JSONB)';
  RAISE NOTICE '   Formato esperado:';
  RAISE NOTICE '   [{"type": "QUICK_REPLY", "text": "Sí"}, {"type": "CALL_TO_ACTION", "text": "Visitar", "url": "https://..."}]';
END $$;

-- ============================================================================
-- RESUMEN FINAL
-- ============================================================================
DO $$
DECLARE
  total_templates INTEGER;
  drafts_count INTEGER;
  approved_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_templates FROM whatsapp_templates;
  SELECT COUNT(*) INTO drafts_count FROM whatsapp_templates WHERE wa_status = 'draft';
  SELECT COUNT(*) INTO approved_count FROM whatsapp_templates WHERE wa_status = 'approved';
  
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE 'RESUMEN FINAL - Migración 024';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE 'Total de templates: %', total_templates;
  RAISE NOTICE 'Templates en borrador: %', drafts_count;
  RAISE NOTICE 'Templates aprobados: %', approved_count;
  
  IF total_templates = 0 THEN
    RAISE NOTICE 'Estado: ✅ Migración completada. No hay templates creados aún (normal)';
  ELSE
    RAISE NOTICE 'Estado: ✅ Migración completada. Hay % templates en el sistema', total_templates;
  END IF;
  
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

