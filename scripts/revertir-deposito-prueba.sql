-- ================================================================
-- REVERTIR DEPÓSITO DE PRUEBA
-- ================================================================
-- Este script revierte un depósito de prueba, restaurando las ventas
-- al menú "Ventas" y eliminando el depósito de "Generar Depósito"
--
-- ⚠️ USO: Solo para pruebas. Ejecutar después de probar "Generar Depósito"
-- ================================================================

-- Paso 1: Ver depósitos pendientes para identificar el ID del depósito de prueba
-- (Ejecuta esto primero para ver qué depósitos tienes)
SELECT 
  id,
  ciudad,
  fecha,
  monto_total,
  estado,
  created_at
FROM generar_deposito
WHERE estado = 'pendiente'
ORDER BY created_at DESC
LIMIT 10;

-- Paso 2: Reemplaza 'DEPOSIT_ID_AQUI' con el ID del depósito que quieres revertir
-- y ejecuta el bloque DO $$ siguiente:

DO $$
DECLARE
  v_deposit_id uuid := 'DEPOSIT_ID_AQUI'::uuid; -- ⚠️ CAMBIAR ESTE ID
  v_ventas_afectadas int;
BEGIN
  -- Verificar que el depósito existe
  IF NOT EXISTS (SELECT 1 FROM generar_deposito WHERE id = v_deposit_id) THEN
    RAISE EXCEPTION 'Depósito % no encontrado', v_deposit_id;
  END IF;

  -- Revertir ventas: quitar settled_at, deposit_id, fecha_cobro, estado_pago
  UPDATE ventas
  SET 
    settled_at = NULL,
    deposit_id = NULL,
    fecha_cobro = NULL,
    estado_pago = 'pendiente'
  WHERE deposit_id = v_deposit_id;

  GET DIAGNOSTICS v_ventas_afectadas = ROW_COUNT;

  -- Eliminar el depósito
  DELETE FROM generar_deposito WHERE id = v_deposit_id;

  -- Mostrar resultado
  RAISE NOTICE '✅ Depósito revertido exitosamente';
  RAISE NOTICE '   - Ventas restauradas: %', v_ventas_afectadas;
  RAISE NOTICE '   - Depósito eliminado: %', v_deposit_id;
END $$;

-- Paso 3: Verificar que las ventas fueron restauradas
-- (Ejecuta esto después para confirmar)
SELECT 
  COUNT(*) as ventas_restauradas,
  ciudad,
  estado_pago
FROM ventas
WHERE deposit_id IS NULL 
  AND estado_pago = 'pendiente'
  AND estado_entrega IN ('confirmado', 'entregada')
GROUP BY ciudad, estado_pago
ORDER BY ciudad;


