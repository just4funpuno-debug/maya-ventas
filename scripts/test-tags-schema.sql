-- ============================================================================
-- TEST: Verificación del Schema de Etiquetas
-- FASE 1: SUBFASE 1.1 - Testing del Schema
-- ============================================================================

-- 1. Verificar que las tablas existen
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'whatsapp_tags'
  ) THEN
    RAISE EXCEPTION '❌ Tabla whatsapp_tags no existe';
  ELSE
    RAISE NOTICE '✅ Tabla whatsapp_tags existe';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'whatsapp_contact_tags'
  ) THEN
    RAISE EXCEPTION '❌ Tabla whatsapp_contact_tags no existe';
  ELSE
    RAISE NOTICE '✅ Tabla whatsapp_contact_tags existe';
  END IF;
END $$;

-- 2. Verificar columnas de whatsapp_tags
DO $$
DECLARE
  expected_columns TEXT[] := ARRAY['id', 'account_id', 'name', 'color', 'created_at', 'updated_at'];
  actual_columns TEXT[];
  col TEXT;
BEGIN
  SELECT ARRAY_AGG(column_name ORDER BY ordinal_position)
  INTO actual_columns
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'whatsapp_tags';

  FOREACH col IN ARRAY expected_columns
  LOOP
    IF NOT (col = ANY(actual_columns)) THEN
      RAISE EXCEPTION '❌ Columna % no existe en whatsapp_tags', col;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ Todas las columnas de whatsapp_tags existen';
END $$;

-- 3. Verificar columnas de whatsapp_contact_tags
DO $$
DECLARE
  expected_columns TEXT[] := ARRAY['id', 'contact_id', 'tag_id', 'created_at'];
  actual_columns TEXT[];
  col TEXT;
BEGIN
  SELECT ARRAY_AGG(column_name ORDER BY ordinal_position)
  INTO actual_columns
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'whatsapp_contact_tags';

  FOREACH col IN ARRAY expected_columns
  LOOP
    IF NOT (col = ANY(actual_columns)) THEN
      RAISE EXCEPTION '❌ Columna % no existe en whatsapp_contact_tags', col;
    END IF;
  END LOOP;
  
  RAISE NOTICE '✅ Todas las columnas de whatsapp_contact_tags existen';
END $$;

-- 4. Verificar índices
DO $$
DECLARE
  index_count INT;
BEGIN
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'public' 
    AND tablename IN ('whatsapp_tags', 'whatsapp_contact_tags');
  
  IF index_count < 7 THEN
    RAISE EXCEPTION '❌ Faltan índices. Esperados al menos 7, encontrados: %', index_count;
  ELSE
    RAISE NOTICE '✅ Índices creados correctamente (total: %)', index_count;
  END IF;
END $$;

-- 5. Verificar RLS habilitado
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
      AND tablename = 'whatsapp_tags' 
      AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION '❌ RLS no está habilitado en whatsapp_tags';
  ELSE
    RAISE NOTICE '✅ RLS habilitado en whatsapp_tags';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
      AND tablename = 'whatsapp_contact_tags' 
      AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION '❌ RLS no está habilitado en whatsapp_contact_tags';
  ELSE
    RAISE NOTICE '✅ RLS habilitado en whatsapp_contact_tags';
  END IF;
END $$;

-- 6. Verificar políticas RLS
DO $$
DECLARE
  policy_count INT;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public' 
    AND tablename IN ('whatsapp_tags', 'whatsapp_contact_tags');
  
  IF policy_count < 8 THEN
    RAISE EXCEPTION '❌ Faltan políticas RLS. Esperadas al menos 8, encontradas: %', policy_count;
  ELSE
    RAISE NOTICE '✅ Políticas RLS creadas correctamente (total: %)', policy_count;
  END IF;
END $$;

-- 7. Verificar función get_contact_tags
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
      AND p.proname = 'get_contact_tags'
  ) THEN
    RAISE EXCEPTION '❌ Función get_contact_tags no existe';
  ELSE
    RAISE NOTICE '✅ Función get_contact_tags existe';
  END IF;
END $$;

-- 8. Verificar trigger de updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'whatsapp_tags_updated_at'
  ) THEN
    RAISE EXCEPTION '❌ Trigger whatsapp_tags_updated_at no existe';
  ELSE
    RAISE NOTICE '✅ Trigger whatsapp_tags_updated_at existe';
  END IF;
END $$;

-- 9. Test de inserción (si hay datos de prueba)
-- Nota: Este test requiere que exista al menos una cuenta WhatsApp
DO $$
DECLARE
  test_account_id UUID;
  test_tag_id UUID;
  test_contact_id UUID;
BEGIN
  -- Buscar una cuenta de prueba
  SELECT id INTO test_account_id
  FROM whatsapp_accounts
  LIMIT 1;
  
  IF test_account_id IS NULL THEN
    RAISE NOTICE '⚠️ No hay cuentas WhatsApp para probar inserción. Test omitido.';
    RETURN;
  END IF;
  
  -- Buscar un contacto de prueba
  SELECT id INTO test_contact_id
  FROM whatsapp_contacts
  WHERE account_id = test_account_id
  LIMIT 1;
  
  IF test_contact_id IS NULL THEN
    RAISE NOTICE '⚠️ No hay contactos para probar inserción. Test omitido.';
    RETURN;
  END IF;
  
  -- Intentar crear una etiqueta de prueba
  BEGIN
    INSERT INTO whatsapp_tags (account_id, name, color)
    VALUES (test_account_id, 'TEST_TAG_' || gen_random_uuid()::TEXT, '#ff0000')
    RETURNING id INTO test_tag_id;
    
    RAISE NOTICE '✅ Test de inserción en whatsapp_tags: OK';
    
    -- Intentar asignar etiqueta a contacto
    INSERT INTO whatsapp_contact_tags (contact_id, tag_id)
    VALUES (test_contact_id, test_tag_id);
    
    RAISE NOTICE '✅ Test de inserción en whatsapp_contact_tags: OK';
    
    -- Probar función get_contact_tags
    PERFORM * FROM get_contact_tags(test_contact_id);
    
    RAISE NOTICE '✅ Test de función get_contact_tags: OK';
    
    -- Limpiar datos de prueba
    DELETE FROM whatsapp_contact_tags WHERE tag_id = test_tag_id;
    DELETE FROM whatsapp_tags WHERE id = test_tag_id;
    
    RAISE NOTICE '✅ Datos de prueba eliminados';
    
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION '❌ Error en test de inserción: %', SQLERRM;
  END;
END $$;

-- Resumen final
SELECT 
  '✅ Todos los tests del schema de etiquetas pasaron correctamente' AS resultado;

