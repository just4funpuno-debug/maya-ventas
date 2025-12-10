-- ============================================================================
-- VER TEST FALLIDO: Mostrar detalles del test que falló
-- ============================================================================

-- Ejecutar primero test-fase-3-1-resultados.sql, luego este script

-- Mostrar todos los resultados
SELECT 
  test_num as "#",
  test_name as "Test",
  resultado as "Resultado",
  detalles as "Detalles"
FROM test_results_fase_3_1
ORDER BY test_num;

-- Mostrar solo los tests que fallaron
SELECT 
  test_num as "#",
  test_name as "Test",
  resultado as "Resultado",
  detalles as "Detalles"
FROM test_results_fase_3_1
WHERE resultado LIKE '❌%'
ORDER BY test_num;

