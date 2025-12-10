-- ================================================================
-- VERIFICAR DEPÓSITO DE PRUEBA
-- ================================================================
-- Este script verifica si el depósito de la ciudad "PRUEBA" se creó correctamente
-- ================================================================

-- Ver todos los depósitos de la ciudad "prueba"
SELECT 
  id,
  ciudad,
  fecha,
  monto_total,
  estado,
  created_at,
  CASE 
    WHEN nota IS NULL THEN 'Sin nota'
    WHEN nota = '' THEN 'Nota vacía'
    ELSE 'Con nota'
  END as estado_nota
FROM generar_deposito
WHERE ciudad = 'prueba'
ORDER BY created_at DESC;

-- Verificar si hay ventas asociadas al depósito
SELECT 
  v.id,
  v.fecha,
  v.ciudad,
  v.estado_entrega,
  v.estado_pago,
  v.deposit_id,
  v.settled_at,
  gd.id as deposit_id_en_generar_deposito,
  gd.estado as deposit_estado
FROM ventas v
LEFT JOIN generar_deposito gd ON v.deposit_id = gd.id
WHERE v.ciudad = 'prueba'
ORDER BY v.created_at DESC;

-- Verificar el contenido de la nota del depósito (si existe)
SELECT 
  id,
  ciudad,
  estado,
  nota,
  LENGTH(nota::text) as longitud_nota
FROM generar_deposito
WHERE ciudad = 'prueba'
ORDER BY created_at DESC
LIMIT 1;

