-- Verificar depósitos de la ciudad "prueba"
SELECT 
  id,
  ciudad,
  fecha,
  monto_total,
  estado,
  created_at
FROM generar_deposito
WHERE ciudad = 'prueba'
ORDER BY created_at DESC;


