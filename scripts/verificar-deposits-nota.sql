-- Verificar estructura de depósitos existentes
-- Ejecutar en Supabase SQL Editor

-- 1. Contar depósitos con y sin nota
SELECT 
  COUNT(*) as total_deposits,
  COUNT(nota) as deposits_con_nota,
  COUNT(*) - COUNT(nota) as deposits_sin_nota
FROM deposits;

-- 2. Ver estructura de algunos depósitos
SELECT 
  id,
  ciudad,
  fecha,
  monto_total,
  estado,
  CASE 
    WHEN nota IS NULL THEN 'NULL'
    WHEN nota = '' THEN 'VACIO'
    WHEN LEFT(nota, 1) = '{' THEN 'JSON_VALIDO'
    ELSE 'TEXTO'
  END as tipo_nota,
  LENGTH(nota) as longitud_nota,
  LEFT(nota, 100) as preview_nota
FROM deposits
ORDER BY created_at DESC
LIMIT 10;

-- 3. Verificar si nota contiene resumen y ventas
SELECT 
  id,
  ciudad,
  fecha,
  CASE 
    WHEN nota IS NULL THEN 'SIN_NOTA'
    WHEN nota::jsonb ? 'resumen' AND nota::jsonb ? 'ventas' THEN 'COMPLETO'
    WHEN nota::jsonb ? 'resumen' THEN 'SOLO_RESUMEN'
    WHEN nota::jsonb ? 'ventas' THEN 'SOLO_VENTAS'
    ELSE 'ESTRUCTURA_DIFERENTE'
  END as estructura_nota
FROM deposits
WHERE nota IS NOT NULL
ORDER BY created_at DESC
LIMIT 20;


