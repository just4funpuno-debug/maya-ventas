-- ============================================================================
-- VER RESULTADOS COMPLETOS: Ejecutar DESPUÉS de test-fase-3-1-todo-en-uno.sql
-- ============================================================================

-- Mostrar TODOS los resultados con más detalle
SELECT 
  test_num as "#",
  test_name as "Test",
  resultado as "Resultado",
  detalles as "Detalles",
  CASE 
    WHEN resultado = '✅ PASÓ' THEN 'VERDE'
    WHEN resultado LIKE '❌%' THEN 'ROJO'
    WHEN resultado LIKE '⚠️%' THEN 'AMARILLO'
    ELSE 'DESCONOCIDO'
  END as color
FROM test_results_fase_3_1
ORDER BY test_num;

-- Mostrar solo los tests que fallaron con detalles
SELECT 
  test_num as "#",
  test_name as "Test",
  resultado as "Resultado",
  detalles as "Detalles"
FROM test_results_fase_3_1
WHERE resultado LIKE '❌%'
ORDER BY test_num;

-- Contar por tipo de resultado
SELECT 
  resultado as "Tipo de Resultado",
  COUNT(*) as "Cantidad"
FROM test_results_fase_3_1
GROUP BY resultado
ORDER BY resultado;

