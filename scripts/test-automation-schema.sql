-- ============================================================================
-- TESTING: Schema de Automatizaciones
-- FASE 1: SUBFASE 1.2 - Testing de Schema
-- 
-- Este script verifica que el schema funciona correctamente
-- ============================================================================

-- ============================================================================
-- TEST 1: Verificar que las columnas existen
-- ============================================================================
SELECT 
  'TEST 1: Verificar columnas' AS test_name,
  CASE 
    WHEN COUNT(*) = 5 THEN '✅ PASS: Todas las columnas existen'
    ELSE '❌ FAIL: Faltan columnas'
  END AS result,
  COUNT(*) AS columns_found
FROM information_schema.columns
WHERE table_name = 'whatsapp_sequence_messages'
  AND column_name IN ('pause_type', 'condition_type', 'next_message_if_true', 'next_message_if_false', 'days_without_response');

-- ============================================================================
-- TEST 2: Verificar valores por defecto
-- ============================================================================
SELECT 
  'TEST 2: Valores por defecto' AS test_name,
  CASE 
    WHEN COUNT(*) = COUNT(CASE WHEN pause_type = 'fixed_delay' THEN 1 END) 
         AND COUNT(*) = COUNT(CASE WHEN condition_type = 'none' THEN 1 END)
    THEN '✅ PASS: Todos los registros tienen valores por defecto'
    ELSE '❌ FAIL: Algunos registros no tienen valores por defecto'
  END AS result,
  COUNT(*) AS total_records,
  COUNT(CASE WHEN pause_type = 'fixed_delay' THEN 1 END) AS fixed_delay_count,
  COUNT(CASE WHEN condition_type = 'none' THEN 1 END) AS none_condition_count
FROM whatsapp_sequence_messages;

-- ============================================================================
-- TEST 3: Verificar CHECK constraints
-- ============================================================================
-- Intentar insertar valores inválidos (debe fallar)
DO $$
DECLARE
  test_sequence_id UUID;
  test_result TEXT;
BEGIN
  -- Obtener un sequence_id de prueba (o crear uno temporal)
  SELECT id INTO test_sequence_id FROM whatsapp_sequences LIMIT 1;
  
  IF test_sequence_id IS NULL THEN
    RAISE NOTICE 'TEST 3: ⚠️ SKIP: No hay secuencias para probar';
    RETURN;
  END IF;
  
  -- Intentar insertar pause_type inválido (debe fallar)
  BEGIN
    INSERT INTO whatsapp_sequence_messages (
      sequence_id, message_number, message_type, content_text, 
      delay_hours_from_previous, order_position, pause_type
    ) VALUES (
      test_sequence_id, 999, 'text', 'Test', 0, 999, 'invalid_pause_type'
    );
    test_result := '❌ FAIL: Debería haber fallado con pause_type inválido';
  EXCEPTION WHEN OTHERS THEN
    test_result := '✅ PASS: CHECK constraint funciona para pause_type';
  END;
  
  RAISE NOTICE 'TEST 3: %', test_result;
  
  -- Intentar insertar condition_type inválido (debe fallar)
  BEGIN
    INSERT INTO whatsapp_sequence_messages (
      sequence_id, message_number, message_type, content_text, 
      delay_hours_from_previous, order_position, condition_type
    ) VALUES (
      test_sequence_id, 998, 'text', 'Test', 0, 998, 'invalid_condition'
    );
    test_result := '❌ FAIL: Debería haber fallado con condition_type inválido';
  EXCEPTION WHEN OTHERS THEN
    test_result := '✅ PASS: CHECK constraint funciona para condition_type';
  END;
  
  RAISE NOTICE 'TEST 3: %', test_result;
END $$;

-- ============================================================================
-- TEST 4: Insertar mensaje con valores por defecto
-- ============================================================================
DO $$
DECLARE
  test_sequence_id UUID;
  inserted_id UUID;
BEGIN
  -- Obtener un sequence_id de prueba
  SELECT id INTO test_sequence_id FROM whatsapp_sequences LIMIT 1;
  
  IF test_sequence_id IS NULL THEN
    RAISE NOTICE 'TEST 4: ⚠️ SKIP: No hay secuencias para probar';
    RETURN;
  END IF;
  
  -- Insertar mensaje con valores por defecto
  INSERT INTO whatsapp_sequence_messages (
    sequence_id, message_number, message_type, content_text, 
    delay_hours_from_previous, order_position
  ) VALUES (
    test_sequence_id, 997, 'text', 'Test con valores por defecto', 0, 997
  ) RETURNING id INTO inserted_id;
  
  -- Verificar valores
  IF (SELECT pause_type FROM whatsapp_sequence_messages WHERE id = inserted_id) = 'fixed_delay'
     AND (SELECT condition_type FROM whatsapp_sequence_messages WHERE id = inserted_id) = 'none' THEN
    RAISE NOTICE 'TEST 4: ✅ PASS: Mensaje insertado con valores por defecto correctos';
  ELSE
    RAISE NOTICE 'TEST 4: ❌ FAIL: Valores por defecto incorrectos';
  END IF;
  
  -- Limpiar
  DELETE FROM whatsapp_sequence_messages WHERE id = inserted_id;
END $$;

-- ============================================================================
-- TEST 5: Insertar mensaje con pause_type = 'until_message'
-- ============================================================================
DO $$
DECLARE
  test_sequence_id UUID;
  inserted_id UUID;
BEGIN
  SELECT id INTO test_sequence_id FROM whatsapp_sequences LIMIT 1;
  
  IF test_sequence_id IS NULL THEN
    RAISE NOTICE 'TEST 5: ⚠️ SKIP: No hay secuencias para probar';
    RETURN;
  END IF;
  
  INSERT INTO whatsapp_sequence_messages (
    sequence_id, message_number, message_type, content_text, 
    delay_hours_from_previous, order_position, pause_type
  ) VALUES (
    test_sequence_id, 996, 'text', 'Test until_message', 0, 996, 'until_message'
  ) RETURNING id INTO inserted_id;
  
  IF (SELECT pause_type FROM whatsapp_sequence_messages WHERE id = inserted_id) = 'until_message' THEN
    RAISE NOTICE 'TEST 5: ✅ PASS: pause_type = until_message funciona';
  ELSE
    RAISE NOTICE 'TEST 5: ❌ FAIL: pause_type = until_message no funciona';
  END IF;
  
  DELETE FROM whatsapp_sequence_messages WHERE id = inserted_id;
END $$;

-- ============================================================================
-- TEST 6: Insertar mensaje con condition_type = 'if_responded'
-- ============================================================================
DO $$
DECLARE
  test_sequence_id UUID;
  inserted_id UUID;
BEGIN
  SELECT id INTO test_sequence_id FROM whatsapp_sequences LIMIT 1;
  
  IF test_sequence_id IS NULL THEN
    RAISE NOTICE 'TEST 6: ⚠️ SKIP: No hay secuencias para probar';
    RETURN;
  END IF;
  
  INSERT INTO whatsapp_sequence_messages (
    sequence_id, message_number, message_type, content_text, 
    delay_hours_from_previous, order_position, condition_type
  ) VALUES (
    test_sequence_id, 995, 'text', 'Test if_responded', 0, 995, 'if_responded'
  ) RETURNING id INTO inserted_id;
  
  IF (SELECT condition_type FROM whatsapp_sequence_messages WHERE id = inserted_id) = 'if_responded' THEN
    RAISE NOTICE 'TEST 6: ✅ PASS: condition_type = if_responded funciona';
  ELSE
    RAISE NOTICE 'TEST 6: ❌ FAIL: condition_type = if_responded no funciona';
  END IF;
  
  DELETE FROM whatsapp_sequence_messages WHERE id = inserted_id;
END $$;

-- ============================================================================
-- TEST 7: Insertar mensaje con ramificaciones
-- ============================================================================
DO $$
DECLARE
  test_sequence_id UUID;
  message1_id UUID;
  message2_id UUID;
  inserted_id UUID;
BEGIN
  SELECT id INTO test_sequence_id FROM whatsapp_sequences LIMIT 1;
  
  IF test_sequence_id IS NULL THEN
    RAISE NOTICE 'TEST 7: ⚠️ SKIP: No hay secuencias para probar';
    RETURN;
  END IF;
  
  -- Crear dos mensajes de referencia (uno por uno)
  INSERT INTO whatsapp_sequence_messages (
    sequence_id, message_number, message_type, content_text, 
    delay_hours_from_previous, order_position
  ) VALUES (
    test_sequence_id, 994, 'text', 'Mensaje 1', 0, 994
  ) RETURNING id INTO message1_id;
  
  INSERT INTO whatsapp_sequence_messages (
    sequence_id, message_number, message_type, content_text, 
    delay_hours_from_previous, order_position
  ) VALUES (
    test_sequence_id, 993, 'text', 'Mensaje 2', 0, 993
  ) RETURNING id INTO message2_id;
  
  -- Insertar mensaje con ramificaciones
  INSERT INTO whatsapp_sequence_messages (
    sequence_id, message_number, message_type, content_text, 
    delay_hours_from_previous, order_position, 
    condition_type, next_message_if_true, next_message_if_false
  ) VALUES (
    test_sequence_id, 992, 'text', 'Test ramificaciones', 0, 992,
    'if_responded', message1_id, message2_id
  ) RETURNING id INTO inserted_id;
  
  IF (SELECT next_message_if_true FROM whatsapp_sequence_messages WHERE id = inserted_id) = message1_id
     AND (SELECT next_message_if_false FROM whatsapp_sequence_messages WHERE id = inserted_id) = message2_id THEN
    RAISE NOTICE 'TEST 7: ✅ PASS: Ramificaciones funcionan correctamente';
  ELSE
    RAISE NOTICE 'TEST 7: ❌ FAIL: Ramificaciones no funcionan';
  END IF;
  
  -- Limpiar
  DELETE FROM whatsapp_sequence_messages WHERE id IN (inserted_id, message1_id, message2_id);
END $$;

-- ============================================================================
-- TEST 8: Verificar foreign keys
-- ============================================================================
DO $$
DECLARE
  test_sequence_id UUID;
  message1_id UUID;
  invalid_id UUID := gen_random_uuid();
BEGIN
  SELECT id INTO test_sequence_id FROM whatsapp_sequences LIMIT 1;
  
  IF test_sequence_id IS NULL THEN
    RAISE NOTICE 'TEST 8: ⚠️ SKIP: No hay secuencias para probar';
    RETURN;
  END IF;
  
  -- Crear mensaje de referencia
  INSERT INTO whatsapp_sequence_messages (
    sequence_id, message_number, message_type, content_text, 
    delay_hours_from_previous, order_position
  ) VALUES (test_sequence_id, 991, 'text', 'Referencia', 0, 991)
  RETURNING id INTO message1_id;
  
  -- Intentar insertar con next_message_if_true inválido (debe fallar)
  BEGIN
    INSERT INTO whatsapp_sequence_messages (
      sequence_id, message_number, message_type, content_text, 
      delay_hours_from_previous, order_position, next_message_if_true
    ) VALUES (
      test_sequence_id, 990, 'text', 'Test FK', 0, 990, invalid_id
    );
    RAISE NOTICE 'TEST 8: ❌ FAIL: Debería haber fallado con FK inválido';
  EXCEPTION WHEN foreign_key_violation THEN
    RAISE NOTICE 'TEST 8: ✅ PASS: Foreign key constraint funciona';
  END;
  
  DELETE FROM whatsapp_sequence_messages WHERE id = message1_id;
END $$;

-- ============================================================================
-- TEST 9: Verificar índices
-- ============================================================================
SELECT 
  'TEST 9: Verificar índices' AS test_name,
  CASE 
    WHEN COUNT(*) >= 4 THEN '✅ PASS: Índices creados correctamente'
    ELSE '❌ FAIL: Faltan índices'
  END AS result,
  COUNT(*) AS indexes_found,
  array_agg(indexname) AS index_names
FROM pg_indexes
WHERE tablename = 'whatsapp_sequence_messages'
  AND indexname LIKE 'idx_sequence_messages%';

-- ============================================================================
-- RESUMEN FINAL
-- ============================================================================
SELECT 
  'RESUMEN' AS summary,
  COUNT(*) AS total_sequence_messages,
  COUNT(CASE WHEN pause_type = 'fixed_delay' THEN 1 END) AS fixed_delay_count,
  COUNT(CASE WHEN pause_type = 'until_message' THEN 1 END) AS until_message_count,
  COUNT(CASE WHEN pause_type = 'until_days_without_response' THEN 1 END) AS until_days_count,
  COUNT(CASE WHEN condition_type = 'none' THEN 1 END) AS none_condition_count,
  COUNT(CASE WHEN condition_type = 'if_responded' THEN 1 END) AS if_responded_count,
  COUNT(CASE WHEN condition_type = 'if_not_responded' THEN 1 END) AS if_not_responded_count,
  COUNT(CASE WHEN next_message_if_true IS NOT NULL THEN 1 END) AS with_ramification_true,
  COUNT(CASE WHEN next_message_if_false IS NOT NULL THEN 1 END) AS with_ramification_false
FROM whatsapp_sequence_messages;

