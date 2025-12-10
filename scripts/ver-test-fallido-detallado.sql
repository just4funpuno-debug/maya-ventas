-- ============================================================================
-- VER TEST FALLIDO DETALLADO: Ejecutar DESPUÉS de test-fase-3-1-todo-en-uno.sql
-- ============================================================================

-- Mostrar el test que falló con todos sus detalles
SELECT 
  'TEST QUE FALLÓ' as info,
  test_num as "#",
  test_name as "Nombre del Test",
  resultado as "Resultado",
  detalles as "Mensaje de Error"
FROM test_results_fase_3_1
WHERE resultado LIKE '❌%'
ORDER BY test_num;

-- Mostrar también los tests que pasaron para comparar
SELECT 
  'TESTS QUE PASARON' as info,
  test_num as "#",
  test_name as "Nombre del Test",
  resultado as "Resultado",
  detalles as "Detalles"
FROM test_results_fase_3_1
WHERE resultado = '✅ PASÓ'
ORDER BY test_num;

