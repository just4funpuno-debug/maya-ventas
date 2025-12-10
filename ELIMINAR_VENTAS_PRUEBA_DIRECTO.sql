-- ============================================================================
-- ELIMINACIÓN DIRECTA: Ventas de "PRUEBA" del 30/11/2025
-- ============================================================================
-- ⚠️ ADVERTENCIA: Este script ELIMINA PERMANENTEMENTE las ventas
-- ⚠️ Esta acción NO SE PUEDE DESHACER
-- ============================================================================
-- 
-- Este script está LISTO para ejecutar (sin comentarios de seguridad)
-- Solo ejecuta si estás 100% seguro
-- 
-- ============================================================================

-- PASO 1: Verificar cuántas ventas se van a eliminar
DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*)
  INTO v_count
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
END $$;

-- PASO 2: ELIMINAR VENTAS
DELETE FROM ventas
WHERE fecha = '2025-11-30'
  AND (
    LOWER(REPLACE(ciudad, ' ', '_')) = 'prueba'
    OR ciudad ILIKE '%PRUEBA%'
    OR ciudad = 'PRUEBA'
  );

-- PASO 3: Verificar eliminación
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
    RAISE WARNING '⚠️ Quedaron % ventas sin eliminar. Verifica formato de ciudad.', v_remaining;
  END IF;
END $$;

-- ============================================================================
-- IMPORTANTE: Después de ejecutar este script:
-- 1. Refresca la página del historial (F5)
-- 2. Cierra y abre el menú historial nuevamente
-- 3. Si aún aparecen, puede ser cache del navegador - usa Ctrl+Shift+R
-- ============================================================================

