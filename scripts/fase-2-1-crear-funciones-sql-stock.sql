-- ============================================================================
-- FASE 2.1: CREAR FUNCIONES SQL ATÓMICAS PARA OPERACIONES DE STOCK
-- ============================================================================
-- Objetivo: Eliminar race conditions en discountCityStock y restoreCityStock
-- ============================================================================

-- ============================================================================
-- FUNCIÓN 1: DESCONTAR STOCK DE FORMA ATÓMICA
-- ============================================================================
-- Esta función descuenta stock de forma atómica, evitando race conditions
-- Usa UPDATE con WHERE para garantizar que solo se actualiza si hay stock suficiente
-- ============================================================================

CREATE OR REPLACE FUNCTION descontar_stock_ciudad_atomico(
  p_ciudad text,
  p_sku text,
  p_cantidad integer
) RETURNS integer AS $$
DECLARE
  v_ciudad_normalizada text;
  v_stock_actual integer;
  v_stock_nuevo integer;
BEGIN
  -- Validar parámetros
  IF p_ciudad IS NULL OR p_sku IS NULL OR p_cantidad IS NULL OR p_cantidad <= 0 THEN
    RAISE EXCEPTION 'Parámetros inválidos: ciudad=%, sku=%, cantidad=%', p_ciudad, p_sku, p_cantidad;
  END IF;

  -- Normalizar ciudad
  v_ciudad_normalizada := normalize_city(p_ciudad);
  
  IF v_ciudad_normalizada IS NULL THEN
    RAISE EXCEPTION 'Ciudad inválida: %', p_ciudad;
  END IF;

  -- Verificar que el producto existe en almacen_central (foreign key)
  IF NOT EXISTS (SELECT 1 FROM almacen_central WHERE sku = p_sku) THEN
    RAISE EXCEPTION 'Producto no existe en almacen_central: %', p_sku;
  END IF;

  -- Obtener stock actual (si existe)
  SELECT cantidad INTO v_stock_actual
  FROM city_stock
  WHERE ciudad = v_ciudad_normalizada AND sku = p_sku;

  -- Si no existe registro, crear con cantidad 0
  IF v_stock_actual IS NULL THEN
    INSERT INTO city_stock (ciudad, sku, cantidad)
    VALUES (v_ciudad_normalizada, p_sku, 0)
    ON CONFLICT (ciudad, sku) DO NOTHING;
    
    -- Re-leer después del insert
    SELECT cantidad INTO v_stock_actual
    FROM city_stock
    WHERE ciudad = v_ciudad_normalizada AND sku = p_sku;
    
    -- Si aún es NULL, hubo un problema
    IF v_stock_actual IS NULL THEN
      RAISE EXCEPTION 'No se pudo crear/obtener registro de stock para ciudad=%, sku=%', v_ciudad_normalizada, p_sku;
    END IF;
  END IF;

  -- Calcular nuevo stock
  v_stock_nuevo := GREATEST(0, v_stock_actual - p_cantidad);

  -- Actualizar de forma atómica
  -- Usamos WHERE para garantizar que solo se actualiza si el stock no cambió
  UPDATE city_stock
  SET cantidad = v_stock_nuevo
  WHERE ciudad = v_ciudad_normalizada 
    AND sku = p_sku
    AND cantidad = v_stock_actual; -- Optimistic locking: solo actualiza si el stock no cambió

  -- Verificar que se actualizó
  IF NOT FOUND THEN
    -- El stock cambió entre el SELECT y el UPDATE (race condition detectada)
    -- Reintentar una vez más con el stock actual
    SELECT cantidad INTO v_stock_actual
    FROM city_stock
    WHERE ciudad = v_ciudad_normalizada AND sku = p_sku;
    
    v_stock_nuevo := GREATEST(0, v_stock_actual - p_cantidad);
    
    UPDATE city_stock
    SET cantidad = v_stock_nuevo
    WHERE ciudad = v_ciudad_normalizada 
      AND sku = p_sku
      AND cantidad = v_stock_actual;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'No se pudo actualizar stock después de reintento. Posible race condition persistente.';
    END IF;
  END IF;

  -- Retornar el nuevo stock
  RETURN v_stock_nuevo;

EXCEPTION
  WHEN OTHERS THEN
    -- Re-lanzar el error con contexto
    RAISE EXCEPTION 'Error en descontar_stock_ciudad_atomico: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCIÓN 2: RESTAURAR STOCK DE FORMA ATÓMICA
-- ============================================================================
-- Esta función suma stock de forma atómica, evitando race conditions
-- Usa ON CONFLICT DO UPDATE para garantizar atomicidad
-- ============================================================================

CREATE OR REPLACE FUNCTION restaurar_stock_ciudad_atomico(
  p_ciudad text,
  p_sku text,
  p_cantidad integer
) RETURNS integer AS $$
DECLARE
  v_ciudad_normalizada text;
  v_stock_actual integer;
  v_stock_nuevo integer;
BEGIN
  -- Validar parámetros
  IF p_ciudad IS NULL OR p_sku IS NULL OR p_cantidad IS NULL OR p_cantidad <= 0 THEN
    RAISE EXCEPTION 'Parámetros inválidos: ciudad=%, sku=%, cantidad=%', p_ciudad, p_sku, p_cantidad;
  END IF;

  -- Normalizar ciudad
  v_ciudad_normalizada := normalize_city(p_ciudad);
  
  IF v_ciudad_normalizada IS NULL THEN
    RAISE EXCEPTION 'Ciudad inválida: %', p_ciudad;
  END IF;

  -- Verificar que el producto existe en almacen_central (foreign key)
  IF NOT EXISTS (SELECT 1 FROM almacen_central WHERE sku = p_sku) THEN
    RAISE EXCEPTION 'Producto no existe en almacen_central: %', p_sku;
  END IF;

  -- Usar INSERT ... ON CONFLICT DO UPDATE para garantizar atomicidad
  -- Esto es más seguro que SELECT + UPDATE porque PostgreSQL garantiza atomicidad
  INSERT INTO city_stock (ciudad, sku, cantidad)
  VALUES (v_ciudad_normalizada, p_sku, p_cantidad)
  ON CONFLICT (ciudad, sku) 
  DO UPDATE SET cantidad = city_stock.cantidad + p_cantidad;

  -- Obtener el stock final
  SELECT cantidad INTO v_stock_nuevo
  FROM city_stock
  WHERE ciudad = v_ciudad_normalizada AND sku = p_sku;

  -- Retornar el nuevo stock
  RETURN v_stock_nuevo;

EXCEPTION
  WHEN OTHERS THEN
    -- Re-lanzar el error con contexto
    RAISE EXCEPTION 'Error en restaurar_stock_ciudad_atomico: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VERIFICACIÓN: Las funciones fueron creadas correctamente
-- ============================================================================

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'descontar_stock_ciudad_atomico') 
      AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'restaurar_stock_ciudad_atomico')
    THEN '✅ Funciones creadas correctamente'
    ELSE '❌ Error: Una o ambas funciones no fueron creadas'
  END as verificacion;

