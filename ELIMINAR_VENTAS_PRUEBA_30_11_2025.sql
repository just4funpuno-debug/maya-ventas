-- ============================================================================
-- ELIMINACIÓN: Ventas de "PRUEBA" del 30/11/2025
-- ============================================================================
-- ⚠️ ADVERTENCIA: Este script ELIMINA PERMANENTEMENTE las ventas
-- ⚠️ Esta acción NO SE PUEDE DESHACER
-- ============================================================================
-- 
-- ANTES DE EJECUTAR:
-- 1. ✅ Ejecuta primero CONSULTA_VENTAS_PRUEBA_30_11_2025.sql
-- 2. ✅ Revisa los resultados
-- 3. ✅ Confirma que son las ventas correctas
-- 4. ✅ Haz un backup si es necesario
-- 
-- ============================================================================

-- PASO 1: Verificar cuántas ventas se van a eliminar
-- (Este paso es solo informativo, no elimina nada)
DO $$
DECLARE
  v_count INT;
  v_ids UUID[];
BEGIN
  SELECT COUNT(*), ARRAY_AGG(id)
  INTO v_count, v_ids
  FROM ventas
  WHERE fecha = '2025-11-30'
    AND (
      LOWER(REPLACE(ciudad, ' ', '_')) = 'prueba'
      OR ciudad ILIKE '%PRUEBA%'
      OR ciudad = 'PRUEBA'
    );
  
  IF v_count = 0 THEN
    RAISE NOTICE '⚠️ No se encontraron ventas para eliminar';
    RAISE NOTICE '   Verifica la fecha (2025-11-30) y ciudad (PRUEBA)';
    RETURN;
  END IF;
  
  RAISE NOTICE '============================================================';
  RAISE NOTICE '📊 VENTAS A ELIMINAR: %', v_count;
  RAISE NOTICE '============================================================';
  RAISE NOTICE '✅ Si estás seguro, descomenta la eliminación en el PASO 2';
  RAISE NOTICE '⚠️  Esta acción NO SE PUEDE DESHACER';
  RAISE NOTICE '============================================================';
END $$;

-- ============================================================================
-- PASO 2: ELIMINACIÓN (DESCOMENTAR PARA EJECUTAR)
-- ============================================================================
-- ⚠️ ADVERTENCIA CRÍTICA: Descomenta las líneas siguientes SOLO si:
-- 1. ✅ Ya ejecutaste la consulta y revisaste los resultados
-- 2. ✅ Confirmaste que son las ventas correctas
-- 3. ✅ Estás seguro de eliminar PERMANENTEMENTE
-- 
-- Para descomentar, elimina los dos guiones (--) al inicio de cada línea
-- ============================================================================

/*
-- Eliminar ventas de "PRUEBA" del 30/11/2025
DELETE FROM ventas
WHERE fecha = '2025-11-30'
  AND (
    LOWER(REPLACE(ciudad, ' ', '_')) = 'prueba'
    OR ciudad ILIKE '%PRUEBA%'
    OR ciudad = 'PRUEBA'
  );

-- Verificar eliminación
DO $$
DECLARE
  v_remaining INT;
BEGIN
  SELECT COUNT(*)
  INTO v_remaining
  FROM ventas
  WHERE fecha = '2025-11-30'
    AND (
      LOWER(REPLACE(ciudad, ' ', '_')) = 'prueba'
      OR ciudad ILIKE '%PRUEBA%'
      OR ciudad = 'PRUEBA'
    );
  
  IF v_remaining = 0 THEN
    RAISE NOTICE '✅ Eliminación completada exitosamente';
    RAISE NOTICE '   Todas las ventas de PRUEBA del 30/11/2025 fueron eliminadas';
  ELSE
    RAISE WARNING '⚠️ Quedaron % ventas sin eliminar', v_remaining;
  END IF;
END $$;
*/

-- ============================================================================
-- INSTRUCCIONES FINALES:
-- ============================================================================
-- 
-- 1. Ejecuta primero CONSULTA_VENTAS_PRUEBA_30_11_2025.sql
-- 2. Revisa los resultados y confirma
-- 3. Para eliminar, descomenta el bloque del PASO 2
-- 4. Ejecuta este script nuevamente
-- 
-- ============================================================================

