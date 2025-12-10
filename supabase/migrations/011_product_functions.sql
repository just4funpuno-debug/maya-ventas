-- ============================================================================
-- MIGRACIÓN 011: Funciones Helper para Productos
-- FASE 1: SUBFASE 1.2
-- Fecha: 2025-01-30
-- Descripción: Funciones SQL para convertir SKUs a product_ids y filtrar cuentas
-- ============================================================================

-- ============================================================================
-- 1. FUNCIÓN: Obtener product_ids desde array de SKUs
-- ============================================================================
-- Convierte un array de SKUs (strings) a un array de UUIDs (product_ids)
-- Útil para filtrar cuentas por productos asignados a un usuario
-- ============================================================================

CREATE OR REPLACE FUNCTION get_product_ids_from_skus(p_skus TEXT[])
RETURNS UUID[] AS $$
DECLARE
  result UUID[];
BEGIN
  -- Intentar con products primero
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'products') THEN
    SELECT ARRAY_AGG(id) INTO result
    FROM products
    WHERE sku = ANY(p_skus);
  -- Fallback a almacen_central
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'almacen_central') THEN
    SELECT ARRAY_AGG(id) INTO result
    FROM almacen_central
    WHERE sku = ANY(p_skus);
  ELSE
    result := ARRAY[]::UUID[];
  END IF;
  
  RETURN COALESCE(result, ARRAY[]::UUID[]);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_product_ids_from_skus IS 'Convierte array de SKUs a array de product_ids (UUIDs)';

-- ============================================================================
-- 2. FUNCIÓN: Obtener account_ids por SKUs de usuario
-- ============================================================================
-- Obtiene los account_ids de cuentas WhatsApp que pertenecen a productos
-- cuyos SKUs están en el array proporcionado
-- ============================================================================

CREATE OR REPLACE FUNCTION get_account_ids_by_user_skus(p_skus TEXT[])
RETURNS UUID[] AS $$
DECLARE
  result UUID[];
  product_ids UUID[];
BEGIN
  -- Obtener product_ids desde SKUs (usa la función helper)
  SELECT get_product_ids_from_skus(p_skus) INTO product_ids;
  
  -- Si hay product_ids, obtener account_ids
  IF array_length(product_ids, 1) > 0 THEN
    SELECT ARRAY_AGG(DISTINCT id) INTO result
    FROM whatsapp_accounts
    WHERE product_id = ANY(product_ids)
      AND active = true;
  ELSE
    result := ARRAY[]::UUID[];
  END IF;
  
  RETURN COALESCE(result, ARRAY[]::UUID[]);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_account_ids_by_user_skus IS 'Obtiene account_ids de cuentas activas cuyos productos tienen SKUs en el array proporcionado';

-- ============================================================================
-- 3. FUNCIÓN: Obtener account_ids sin producto
-- ============================================================================
-- Obtiene los account_ids de cuentas WhatsApp que no tienen producto asignado
-- Útil para mostrar pestaña "Sin Producto" (solo admin)
-- ============================================================================

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

-- ============================================================================
-- 4. FUNCIÓN: Obtener account_ids por product_id específico
-- ============================================================================
-- Obtiene los account_ids de cuentas WhatsApp de un producto específico
-- Útil para filtrar por pestaña de producto
-- ============================================================================

CREATE OR REPLACE FUNCTION get_account_ids_by_product_id(p_product_id UUID)
RETURNS UUID[] AS $$
  SELECT ARRAY_AGG(id)
  FROM whatsapp_accounts
  WHERE product_id = p_product_id AND active = true;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION get_account_ids_by_product_id IS 'Obtiene account_ids de cuentas activas de un producto específico';

-- ============================================================================
-- 5. FUNCIÓN: Obtener account_ids por múltiples product_ids
-- ============================================================================
-- Obtiene los account_ids de cuentas WhatsApp de múltiples productos
-- Útil para filtrar por productos asignados a un usuario
-- ============================================================================

CREATE OR REPLACE FUNCTION get_account_ids_by_product_ids(p_product_ids UUID[])
RETURNS UUID[] AS $$
  SELECT ARRAY_AGG(id)
  FROM whatsapp_accounts
  WHERE product_id = ANY(p_product_ids) AND active = true;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION get_account_ids_by_product_ids IS 'Obtiene account_ids de cuentas activas de múltiples productos';

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

DO $$
DECLARE
  func_count INT;
BEGIN
  SELECT COUNT(*) INTO func_count
  FROM pg_proc
  WHERE proname IN (
    'get_product_ids_from_skus',
    'get_account_ids_by_user_skus',
    'get_account_ids_without_product',
    'get_account_ids_by_product_id',
    'get_account_ids_by_product_ids'
  );
  
  IF func_count = 5 THEN
    RAISE NOTICE '✅ Todas las funciones creadas correctamente (5/5)';
  ELSE
    RAISE WARNING '⚠️ Solo se crearon %/5 funciones', func_count;
  END IF;
END $$;

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================

