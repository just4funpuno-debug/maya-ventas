-- =====================================================
-- FASE 4: Limpieza Final
-- =====================================================
-- Objetivo: Eliminar vista deposits y tabla deposits_backup
-- ⚠️ SOLO EJECUTAR DESPUÉS DE VERIFICAR QUE TODO FUNCIONA
-- =====================================================

-- PASO 1: Verificar que no hay dependencias en la vista deposits
SELECT 
  'Verificando dependencias de vista deposits' as paso,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.views 
      WHERE table_schema = 'public' 
      AND table_name = 'deposits'
    ) THEN 'Vista deposits existe'
    ELSE 'Vista deposits NO existe'
  END as estado;

-- PASO 2: Verificar que no hay referencias a deposits en código
-- (Esto debe verificarse manualmente antes de ejecutar)

-- PASO 3: Eliminar vista deposits
DROP VIEW IF EXISTS deposits CASCADE;

-- PASO 4: Verificar que deposits_backup no tiene dependencias
SELECT 
  'Verificando dependencias de deposits_backup' as paso,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.table_constraints AS tc
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name = 'deposits_backup'
    ) THEN '⚠️ EXISTEN FOREIGN KEYS APUNTANDO A BACKUP'
    ELSE '✅ NO HAY DEPENDENCIAS'
  END as estado;

-- PASO 5: Verificar conteo final antes de eliminar backup
DO $$
DECLARE
  total_backup INTEGER;
  total_nuevo INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_backup FROM deposits_backup;
  SELECT COUNT(*) INTO total_nuevo FROM generar_deposito;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICACIÓN ANTES DE ELIMINAR BACKUP';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Registros en deposits_backup: %', total_backup;
  RAISE NOTICE 'Registros en generar_deposito: %', total_nuevo;
  
  IF total_backup = total_nuevo THEN
    RAISE NOTICE '✅ Los conteos coinciden. Es seguro eliminar el backup.';
  ELSE
    RAISE WARNING '⚠️ DISCREPANCIA DETECTADA. NO eliminar el backup hasta resolver.';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;

-- PASO 6: Eliminar deposits_backup
-- ⚠️ Esta operación es irreversible, pero los datos ya están en generar_deposito
DROP TABLE IF EXISTS deposits_backup CASCADE;

-- PASO 7: Verificación final
DO $$
DECLARE
  total_generar_deposito INTEGER := 0;
  total_deposits_vista INTEGER := 0;
  total_deposits_backup INTEGER := 0;
  existe_generar_deposito BOOLEAN;
  existe_deposits_vista BOOLEAN;
  existe_deposits_backup BOOLEAN;
BEGIN
  -- Verificar generar_deposito
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'generar_deposito'
  ) INTO existe_generar_deposito;
  
  IF existe_generar_deposito THEN
    SELECT COUNT(*) INTO total_generar_deposito FROM generar_deposito;
  END IF;
  
  -- Verificar vista deposits
  SELECT EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_schema = 'public' 
    AND table_name = 'deposits'
  ) INTO existe_deposits_vista;
  
  IF existe_deposits_vista THEN
    SELECT COUNT(*) INTO total_deposits_vista FROM deposits;
  END IF;
  
  -- Verificar deposits_backup
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'deposits_backup'
  ) INTO existe_deposits_backup;
  
  IF existe_deposits_backup THEN
    SELECT COUNT(*) INTO total_deposits_backup FROM deposits_backup;
  END IF;
  
  -- Mostrar resultados
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICACIÓN FINAL FASE 4';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'generar_deposito: % registros - %', 
    total_generar_deposito, 
    CASE WHEN existe_generar_deposito THEN '✅ Existe' ELSE '❌ NO existe' END;
  RAISE NOTICE 'deposits (vista): % registros - %', 
    total_deposits_vista, 
    CASE WHEN existe_deposits_vista THEN '⚠️ Aún existe' ELSE '✅ Eliminada' END;
  RAISE NOTICE 'deposits_backup: % registros - %', 
    total_deposits_backup, 
    CASE WHEN existe_deposits_backup THEN '⚠️ Aún existe' ELSE '✅ Eliminada' END;
  RAISE NOTICE '========================================';
END $$;

-- Mostrar resumen en formato tabla
SELECT 
  'generar_deposito' as tabla,
  (SELECT COUNT(*) FROM generar_deposito) as total_registros,
  '✅ Existe' as estado
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'generar_deposito'
)
UNION ALL
SELECT 
  'deposits (vista)' as tabla,
  0 as total_registros,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.views 
      WHERE table_schema = 'public' 
      AND table_name = 'deposits'
    ) THEN '⚠️ Aún existe'
    ELSE '✅ Eliminada'
  END as estado
UNION ALL
SELECT 
  'deposits_backup' as tabla,
  0 as total_registros,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'deposits_backup'
    ) THEN '⚠️ Aún existe'
    ELSE '✅ Eliminada'
  END as estado;

-- Resumen final
SELECT 
  'RESUMEN FASE 4' as resumen,
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM information_schema.views 
      WHERE table_schema = 'public' 
      AND table_name = 'deposits'
    ) THEN '✅ Vista deposits eliminada'
    ELSE '⚠️ Vista deposits aún existe'
  END as estado_vista,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'generar_deposito'
    ) THEN '✅ Tabla generar_deposito existe'
    ELSE '❌ Tabla generar_deposito NO existe'
  END as estado_tabla,
  'MIGRACIÓN COMPLETA' as estado_final;

