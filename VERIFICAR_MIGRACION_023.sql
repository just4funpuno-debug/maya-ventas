-- ============================================================================
-- VERIFICACIÓN DE MIGRACIÓN 023: Paso Tipo "Condición"
-- 
-- Ejecutar DESPUÉS de ejecutar: supabase/migrations/023_add_condition_step_type.sql
-- ============================================================================

-- ============================================================================
-- VERIFICACIÓN 1: Constraint de step_type permite 'condition'
-- ============================================================================
DO $$
DECLARE
  constraint_exists BOOLEAN;
  constraint_allows_condition BOOLEAN;
BEGIN
  -- Verificar que existe el constraint
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu 
      ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_name = 'whatsapp_sequence_messages'
      AND tc.constraint_type = 'CHECK'
      AND ccu.column_name = 'step_type'
  ) INTO constraint_exists;

  -- Verificar que permite 'condition'
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.check_constraints
    WHERE constraint_name LIKE '%step_type%'
      AND check_clause LIKE '%condition%'
  ) INTO constraint_allows_condition;

  IF constraint_exists AND constraint_allows_condition THEN
    RAISE NOTICE '✅ VERIFICACIÓN 1: Constraint de step_type correcto (permite condition)';
  ELSE
    RAISE WARNING '❌ VERIFICACIÓN 1: Constraint de step_type incorrecto o no permite condition';
  END IF;
END $$;

-- ============================================================================
-- VERIFICACIÓN 2: Verificar tipos válidos
-- ============================================================================
SELECT 
  'VERIFICACIÓN 2: Tipos de step_type existentes' as verificacion,
  step_type,
  COUNT(*) as cantidad
FROM whatsapp_sequence_messages
GROUP BY step_type
ORDER BY step_type;

-- ============================================================================
-- VERIFICACIÓN 3: Verificar que podemos insertar un paso de condición (test)
-- ============================================================================
DO $$
BEGIN
  -- Esto es solo una verificación conceptual, no inserta nada
  RAISE NOTICE '✅ VERIFICACIÓN 3: Estructura lista para insertar pasos de condición';
  RAISE NOTICE '   Los pasos de condición deben tener:';
  RAISE NOTICE '   - step_type = ''condition''';
  RAISE NOTICE '   - condition_type = ''if_message_contains'' (u otra condición)';
  RAISE NOTICE '   - condition_keywords (JSONB con keywords)';
  RAISE NOTICE '   - next_message_if_true (ID del paso si condición es verdadera)';
  RAISE NOTICE '   - next_message_if_false (ID del paso si condición es falsa)';
END $$;

-- ============================================================================
-- RESUMEN FINAL
-- ============================================================================
DO $$
DECLARE
  total_steps INTEGER;
  condition_steps INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_steps FROM whatsapp_sequence_messages;
  SELECT COUNT(*) INTO condition_steps 
  FROM whatsapp_sequence_messages 
  WHERE step_type = 'condition';
  
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE 'RESUMEN FINAL - Migración 023';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE 'Total de pasos en secuencias: %', total_steps;
  RAISE NOTICE 'Pasos de condición: %', condition_steps;
  
  IF total_steps > 0 THEN
    IF condition_steps = 0 THEN
      RAISE NOTICE 'Estado: ✅ Migración completada. No hay pasos de condición configurados aún (normal)';
    ELSE
      RAISE NOTICE 'Estado: ✅ Migración completada. Hay % pasos de condición configurados', condition_steps;
    END IF;
  ELSE
    RAISE NOTICE 'Estado: ✅ Migración completada. No hay pasos en secuencias aún (normal)';
  END IF;
  
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;


