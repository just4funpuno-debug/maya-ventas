-- ============================================================================
-- VERIFICACIÓN DE MIGRACIÓN 022: Detección de Palabras Clave
-- 
-- Ejecutar DESPUÉS de ejecutar: supabase/migrations/022_add_keyword_conditions.sql
-- ============================================================================

-- ============================================================================
-- VERIFICACIÓN 1: Constraint de condition_type
-- ============================================================================
DO $$
DECLARE
  constraint_exists BOOLEAN;
  constraint_allows_keywords BOOLEAN;
BEGIN
  -- Verificar que existe el constraint
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu 
      ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_name = 'whatsapp_sequence_messages'
      AND tc.constraint_type = 'CHECK'
      AND ccu.column_name = 'condition_type'
  ) INTO constraint_exists;

  -- Verificar que permite 'if_message_contains'
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.check_constraints
    WHERE constraint_name LIKE '%condition_type%'
      AND check_clause LIKE '%if_message_contains%'
  ) INTO constraint_allows_keywords;

  IF constraint_exists AND constraint_allows_keywords THEN
    RAISE NOTICE '✅ VERIFICACIÓN 1: Constraint de condition_type correcto (permite if_message_contains)';
  ELSE
    RAISE WARNING '❌ VERIFICACIÓN 1: Constraint de condition_type incorrecto o no permite if_message_contains';
  END IF;
END $$;

-- ============================================================================
-- VERIFICACIÓN 2: Campo condition_keywords existe
-- ============================================================================
DO $$
DECLARE
  column_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'whatsapp_sequence_messages'
      AND column_name = 'condition_keywords'
      AND data_type = 'jsonb'
  ) INTO column_exists;

  IF column_exists THEN
    RAISE NOTICE '✅ VERIFICACIÓN 2: Campo condition_keywords existe (tipo JSONB)';
  ELSE
    RAISE WARNING '❌ VERIFICACIÓN 2: Campo condition_keywords NO existe o tiene tipo incorrecto';
  END IF;
END $$;

-- ============================================================================
-- VERIFICACIÓN 3: Índice creado
-- ============================================================================
DO $$
DECLARE
  index_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE tablename = 'whatsapp_sequence_messages'
      AND indexname = 'idx_sequence_messages_condition_keywords'
  ) INTO index_exists;

  IF index_exists THEN
    RAISE NOTICE '✅ VERIFICACIÓN 3: Índice idx_sequence_messages_condition_keywords creado';
  ELSE
    RAISE WARNING '❌ VERIFICACIÓN 3: Índice idx_sequence_messages_condition_keywords NO existe';
  END IF;
END $$;

-- ============================================================================
-- VERIFICACIÓN 4: Estructura de datos válida (si hay registros)
-- ============================================================================
SELECT 
  'VERIFICACIÓN 4: Estructura de condition_keywords' as verificacion,
  COUNT(*) FILTER (WHERE condition_type = 'if_message_contains') as condiciones_con_keywords,
  COUNT(*) FILTER (
    WHERE condition_type = 'if_message_contains' 
    AND condition_keywords IS NULL
  ) as condiciones_sin_keywords_config,
  COUNT(*) FILTER (
    WHERE condition_type = 'if_message_contains'
    AND condition_keywords IS NOT NULL
    AND condition_keywords->>'keywords' IS NOT NULL
  ) as condiciones_con_keywords_validas
FROM whatsapp_sequence_messages;

-- ============================================================================
-- VERIFICACIÓN 5: Ejemplos de estructura JSON válida (si hay registros)
-- ============================================================================
SELECT 
  'VERIFICACIÓN 5: Ejemplos de condition_keywords' as verificacion,
  id,
  condition_type,
  condition_keywords
FROM whatsapp_sequence_messages
WHERE condition_type = 'if_message_contains'
  AND condition_keywords IS NOT NULL
LIMIT 3;

-- ============================================================================
-- RESUMEN FINAL
-- ============================================================================
DO $$
DECLARE
  total_messages INTEGER;
  keyword_conditions INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_messages FROM whatsapp_sequence_messages;
  SELECT COUNT(*) INTO keyword_conditions 
  FROM whatsapp_sequence_messages 
  WHERE condition_type = 'if_message_contains';
  
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE 'RESUMEN FINAL - Migración 022';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE 'Total de pasos en secuencias: %', total_messages;
  RAISE NOTICE 'Condiciones con keywords configuradas: %', keyword_conditions;
  
  IF total_messages > 0 THEN
    IF keyword_conditions = 0 THEN
      RAISE NOTICE 'Estado: ✅ Migración completada. No hay condiciones de keywords configuradas aún (normal)';
    ELSE
      RAISE NOTICE 'Estado: ✅ Migración completada. Hay % condiciones de keywords configuradas', keyword_conditions;
    END IF;
  ELSE
    RAISE NOTICE 'Estado: ✅ Migración completada. No hay pasos en secuencias aún (normal)';
  END IF;
  
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;


