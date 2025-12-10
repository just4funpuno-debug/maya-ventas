-- ============================================================================
-- VER SOLO TESTS FALLIDOS
-- ============================================================================
-- Ejecutar DESPUÉS de test-fase-3-1-resultados.sql en la misma sesión
-- ============================================================================

-- Mostrar solo los tests que fallaron
SELECT 
  test_num as "#",
  test_name as "Test",
  resultado as "Resultado",
  detalles as "Detalles"
FROM test_results_fase_3_1
WHERE resultado LIKE '❌%'
ORDER BY test_num;

-- Si no hay resultados, mostrar todos para verificar
SELECT 
  test_num as "#",
  test_name as "Test",
  resultado as "Resultado",
  detalles as "Detalles"
FROM test_results_fase_3_1
ORDER BY test_num;

