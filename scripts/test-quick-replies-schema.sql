-- ============================================================================
-- TEST: Verificación del Schema de Respuestas Rápidas
-- FASE 2: SUBFASE 2.1 - Testing del Schema
-- ============================================================================

-- 1. Verificar que la tabla existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'whatsapp_quick_replies'
  ) THEN
    RAISE EXCEPTION '❌ Tabla whatsapp_quick_replies no existe';
  ELSE
    RAISE NOTICE '✅ Tabla whatsapp_quick_replies existe';
  END IF;
END $$;

-- 2. Verificar columnas de whatsapp_quick_replies
DO $$
DECLARE
  expected_columns TEXT[] := ARRAY['id', 'account_id', 'trigger', 'name', 'type', 'content_text', 'media_path', 'media_type', 'created_at', 'updated_at'];
  actual_columns TEXT[];
  col TEXT;
BEGIN
  SELECT ARRAY_AGG(column_name ORDER BY ordinal_position)
  INTO actual_columns
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'whatsapp_quick_replies';

  FOREACH col IN ARRAY expected_columns
  LOOP
    IF NOT (col = ANY(actual_columns)) THEN
      RAISE EXCEPTION '❌ Columna % no existe en whatsapp_quick_replies', col;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ Todas las columnas de whatsapp_quick_replies existen';
END $$;

-- 3. Verificar índices
DO $$
DECLARE
  index_count INT;
BEGIN
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'public' 
    AND tablename = 'whatsapp_quick_replies';
  
  IF index_count < 4 THEN
    RAISE EXCEPTION '❌ Faltan índices. Esperados al menos 4, encontrados: %', index_count;
  ELSE
    RAISE NOTICE '✅ Índices creados correctamente (total: %)', index_count;
  END IF;
END $$;

-- 4. Verificar RLS habilitado
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
      AND tablename = 'whatsapp_quick_replies' 
      AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION '❌ RLS no está habilitado en whatsapp_quick_replies';
  ELSE
    RAISE NOTICE '✅ RLS habilitado en whatsapp_quick_replies';
  END IF;
END $$;

-- 5. Verificar políticas RLS
DO $$
DECLARE
  policy_count INT;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public' 
    AND tablename = 'whatsapp_quick_replies';
  
  IF policy_count < 4 THEN
    RAISE EXCEPTION '❌ Faltan políticas RLS. Esperadas al menos 4, encontradas: %', policy_count;
  ELSE
    RAISE NOTICE '✅ Políticas RLS creadas correctamente (total: %)', policy_count;
  END IF;
END $$;

-- 6. Verificar existencia de la función get_quick_replies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
      AND p.proname = 'get_quick_replies'
  ) THEN
    RAISE EXCEPTION '❌ Función get_quick_replies no existe';
  ELSE
    RAISE NOTICE '✅ Función get_quick_replies existe';
  END IF;
END $$;

-- 7. Verificar trigger de updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'whatsapp_quick_replies_updated_at'
  ) THEN
    RAISE EXCEPTION '❌ Trigger whatsapp_quick_replies_updated_at no existe';
  ELSE
    RAISE NOTICE '✅ Trigger whatsapp_quick_replies_updated_at existe';
  END IF;
END $$;

-- 8. Verificar CHECK constraints
DO $$
DECLARE
  constraint_count INT;
BEGIN
  SELECT COUNT(*) INTO constraint_count
  FROM information_schema.table_constraints
  WHERE table_schema = 'public' 
    AND table_name = 'whatsapp_quick_replies'
    AND constraint_type = 'CHECK';
  
  IF constraint_count < 5 THEN
    RAISE EXCEPTION '❌ Faltan CHECK constraints. Esperados al menos 5, encontrados: %', constraint_count;
  ELSE
    RAISE NOTICE '✅ CHECK constraints creados correctamente (total: %)', constraint_count;
  END IF;
END $$;

-- 9. Test de inserción (si hay datos de prueba)
DO $$
DECLARE
  test_account_id UUID;
  test_quick_reply_id UUID;
BEGIN
  -- Buscar una cuenta de prueba
  SELECT id INTO test_account_id
  FROM whatsapp_accounts
  LIMIT 1;
  
  IF test_account_id IS NULL THEN
    RAISE NOTICE '⚠️ No hay cuentas WhatsApp para probar inserción. Test omitido.';
    RETURN;
  END IF;
  
  -- Intentar crear una respuesta rápida de prueba (tipo text)
  BEGIN
    INSERT INTO whatsapp_quick_replies (account_id, trigger, name, type, content_text)
    VALUES (test_account_id, '/test', 'Test Quick Reply', 'text', 'Este es un mensaje de prueba')
    RETURNING id INTO test_quick_reply_id;
    
    RAISE NOTICE '✅ Test de inserción en whatsapp_quick_replies (tipo text): OK';
    
    -- Probar función get_quick_replies
    PERFORM * FROM get_quick_replies(test_account_id, NULL);
    
    RAISE NOTICE '✅ Test de función get_quick_replies: OK';
    
    -- Probar búsqueda
    PERFORM * FROM get_quick_replies(test_account_id, 'test');
    
    RAISE NOTICE '✅ Test de búsqueda en get_quick_replies: OK';
    
    -- Limpiar datos de prueba
    DELETE FROM whatsapp_quick_replies WHERE id = test_quick_reply_id;
    
    RAISE NOTICE '✅ Datos de prueba eliminados';
    
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION '❌ Error en test de inserción: %', SQLERRM;
  END;
END $$;

-- 10. Test de validaciones (CHECK constraints)
DO $$
DECLARE
  test_account_id UUID;
BEGIN
  SELECT id INTO test_account_id
  FROM whatsapp_accounts
  LIMIT 1;
  
  IF test_account_id IS NULL THEN
    RAISE NOTICE '⚠️ No hay cuentas WhatsApp para probar validaciones. Test omitido.';
    RETURN;
  END IF;
  
  -- Test 1: Trigger debe empezar con "/"
  BEGIN
    INSERT INTO whatsapp_quick_replies (account_id, trigger, name, type, content_text)
    VALUES (test_account_id, 'sin-slash', 'Test', 'text', 'Test');
    RAISE EXCEPTION '❌ Validación de trigger falló: debería requerir "/" al inicio';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE '✅ Validación de trigger (debe empezar con "/"): OK';
  END;
  
  -- Test 2: content_text requerido para tipo text
  BEGIN
    INSERT INTO whatsapp_quick_replies (account_id, trigger, name, type)
    VALUES (test_account_id, '/test2', 'Test', 'text');
    RAISE EXCEPTION '❌ Validación de content_text falló: debería ser requerido para tipo text';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE '✅ Validación de content_text requerido: OK';
  END;
  
  -- Test 3: media_path requerido para tipo image
  BEGIN
    INSERT INTO whatsapp_quick_replies (account_id, trigger, name, type)
    VALUES (test_account_id, '/test3', 'Test', 'image');
    RAISE EXCEPTION '❌ Validación de media_path falló: debería ser requerido para tipo image';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE '✅ Validación de media_path requerido: OK';
  END;
  
  -- Test 4: trigger único por cuenta
  BEGIN
    INSERT INTO whatsapp_quick_replies (account_id, trigger, name, type, content_text)
    VALUES (test_account_id, '/duplicado', 'Test 1', 'text', 'Test 1');
    
    INSERT INTO whatsapp_quick_replies (account_id, trigger, name, type, content_text)
    VALUES (test_account_id, '/duplicado', 'Test 2', 'text', 'Test 2');
    
    RAISE EXCEPTION '❌ Validación de trigger único falló: debería ser único por cuenta';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE '✅ Validación de trigger único por cuenta: OK';
    
    -- Limpiar
    DELETE FROM whatsapp_quick_replies WHERE trigger = '/duplicado';
  END;
END $$;

-- Resumen final
SELECT 
  '✅ Todos los tests del schema de respuestas rápidas pasaron correctamente' AS resultado;

