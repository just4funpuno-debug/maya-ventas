-- ================================================================
-- FASE 4 - SUBFASE 4.2: Actualizar función get_account_ids_without_product
-- ================================================================
-- Objetivo: Actualizar la función para que retorne array vacío
-- ya que después de la migración no debería haber cuentas sin producto
-- ================================================================

CREATE OR REPLACE FUNCTION get_account_ids_without_product()
RETURNS UUID[] AS $$
  -- FASE 4: SUBFASE 4.2 - Después de la migración, no debería haber cuentas sin producto
  -- Retornar array vacío para evitar problemas
  SELECT ARRAY[]::UUID[];
  -- Comentado: La consulta original ya no se usa
  -- SELECT ARRAY_AGG(id)
  -- FROM whatsapp_accounts
  -- WHERE product_id IS NULL AND active = true;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION get_account_ids_without_product IS 'FASE 4: Ya no se usan cuentas sin producto. Retorna array vacío.';

-- Verificar que la función se actualizó correctamente
DO $$
DECLARE
  func_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM pg_proc 
    WHERE proname = 'get_account_ids_without_product'
  ) INTO func_exists;
  
  IF func_exists THEN
    RAISE NOTICE '✅ Función get_account_ids_without_product actualizada correctamente';
  ELSE
    RAISE WARNING '⚠️ Función get_account_ids_without_product no encontrada';
  END IF;
END $$;

