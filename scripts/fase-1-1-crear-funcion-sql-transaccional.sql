-- ============================================================================
-- FASE 1.1: CREAR FUNCIÓN SQL TRANSACCIONAL PARA REGISTRAR VENTA PENDIENTE
-- ============================================================================
-- Esta función garantiza que el stock se descuente y la venta se registre
-- de forma atómica (todo o nada)
-- ============================================================================

-- Función auxiliar para normalizar ciudad (si no existe)
CREATE OR REPLACE FUNCTION normalize_city(ciudad_input text)
RETURNS text AS $$
BEGIN
  IF ciudad_input IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN lower(trim(regexp_replace(ciudad_input, '\s+', '_', 'g')));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Función principal: Registrar venta pendiente de forma atómica
CREATE OR REPLACE FUNCTION registrar_venta_pendiente_atomica(
  p_fecha date,
  p_ciudad text,
  p_sku text,
  p_cantidad integer,
  p_precio numeric,
  p_sku_extra text DEFAULT NULL,
  p_cantidad_extra integer DEFAULT NULL,
  p_total numeric DEFAULT NULL,
  p_vendedora text DEFAULT NULL,
  p_vendedora_id uuid DEFAULT NULL,
  p_celular text DEFAULT NULL,
  p_metodo text DEFAULT NULL,
  p_cliente text DEFAULT NULL,
  p_notas text DEFAULT NULL,
  p_gasto numeric DEFAULT 0,
  p_gasto_cancelacion numeric DEFAULT 0,
  p_codigo_unico uuid DEFAULT NULL,
  p_hora_entrega text DEFAULT NULL,
  p_comprobante text DEFAULT NULL,
  p_destino_encomienda text DEFAULT NULL,
  p_motivo text DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  v_venta_id uuid;
  v_ciudad_normalizada text;
  v_cantidad_principal integer;
  v_cantidad_extra integer;
  v_stock_disponible integer;
  v_stock_extra_disponible integer;
BEGIN
  -- Normalizar ciudad
  v_ciudad_normalizada := normalize_city(p_ciudad);
  
  IF v_ciudad_normalizada IS NULL OR p_sku IS NULL OR p_cantidad IS NULL THEN
    RAISE EXCEPTION 'Parámetros requeridos faltantes: ciudad, sku, cantidad';
  END IF;
  
  -- Validar y descontar stock principal (operación atómica)
  IF p_cantidad > 0 THEN
    -- Verificar stock disponible
    SELECT cantidad INTO v_stock_disponible
    FROM city_stock
    WHERE ciudad = v_ciudad_normalizada AND sku = p_sku;
    
    -- Si no existe registro, crear con cantidad 0
    IF v_stock_disponible IS NULL THEN
      INSERT INTO city_stock (ciudad, sku, cantidad)
      VALUES (v_ciudad_normalizada, p_sku, 0)
      ON CONFLICT (ciudad, sku) DO NOTHING;
      
      SELECT cantidad INTO v_stock_disponible
      FROM city_stock
      WHERE ciudad = v_ciudad_normalizada AND sku = p_sku;
    END IF;
    
    -- Descontar stock de forma atómica (solo si hay suficiente)
    UPDATE city_stock
    SET cantidad = cantidad - p_cantidad
    WHERE ciudad = v_ciudad_normalizada 
      AND sku = p_sku
      AND cantidad >= p_cantidad;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Stock insuficiente para % en %: disponible %, requerido %', 
        p_sku, p_ciudad, COALESCE(v_stock_disponible, 0), p_cantidad;
    END IF;
  END IF;
  
  -- Validar y descontar stock extra (operación atómica)
  IF p_sku_extra IS NOT NULL AND p_cantidad_extra IS NOT NULL AND p_cantidad_extra > 0 THEN
    -- Verificar stock disponible
    SELECT cantidad INTO v_stock_extra_disponible
    FROM city_stock
    WHERE ciudad = v_ciudad_normalizada AND sku = p_sku_extra;
    
    -- Si no existe registro, crear con cantidad 0
    IF v_stock_extra_disponible IS NULL THEN
      INSERT INTO city_stock (ciudad, sku, cantidad)
      VALUES (v_ciudad_normalizada, p_sku_extra, 0)
      ON CONFLICT (ciudad, sku) DO NOTHING;
      
      SELECT cantidad INTO v_stock_extra_disponible
      FROM city_stock
      WHERE ciudad = v_ciudad_normalizada AND sku = p_sku_extra;
    END IF;
    
    -- Descontar stock extra de forma atómica
    UPDATE city_stock
    SET cantidad = cantidad - p_cantidad_extra
    WHERE ciudad = v_ciudad_normalizada 
      AND sku = p_sku_extra
      AND cantidad >= p_cantidad_extra;
    
    IF NOT FOUND THEN
      -- Revertir descuento del stock principal
      UPDATE city_stock
      SET cantidad = cantidad + p_cantidad
      WHERE ciudad = v_ciudad_normalizada AND sku = p_sku;
      
      RAISE EXCEPTION 'Stock insuficiente para producto extra % en %: disponible %, requerido %', 
        p_sku_extra, p_ciudad, COALESCE(v_stock_extra_disponible, 0), p_cantidad_extra;
    END IF;
  END IF;
  
  -- Generar código único si no se proporciona
  IF p_codigo_unico IS NULL THEN
    v_venta_id := gen_random_uuid();
  ELSE
    v_venta_id := p_codigo_unico;
  END IF;
  
  -- Insertar venta
  INSERT INTO ventas (
    id,
    fecha,
    ciudad,
    sku,
    cantidad,
    precio,
    sku_extra,
    cantidad_extra,
    total,
    vendedora,
    vendedora_id,
    celular,
    metodo,
    cliente,
    notas,
    estado_entrega,
    estado_pago,
    gasto,
    gasto_cancelacion,
    codigo_unico,
    hora_entrega,
    comprobante,
    destino_encomienda,
    motivo,
    deleted_from_pending_at
  ) VALUES (
    v_venta_id,
    p_fecha,
    v_ciudad_normalizada,
    p_sku,
    p_cantidad,
    p_precio,
    p_sku_extra,
    p_cantidad_extra,
    p_total,
    p_vendedora,
    p_vendedora_id,
    p_celular,
    p_metodo,
    p_cliente,
    p_notas,
    'pendiente',
    'pendiente',
    p_gasto,
    p_gasto_cancelacion,
    v_venta_id,
    p_hora_entrega,
    p_comprobante,
    p_destino_encomienda,
    p_motivo,
    NULL
  );
  
  -- Si el insert falla, el stock ya fue descontado pero PostgreSQL
  -- automáticamente revierte toda la transacción
  
  RETURN v_venta_id;
  
EXCEPTION
  WHEN OTHERS THEN
    -- En caso de error, PostgreSQL automáticamente revierte la transacción
    -- Esto incluye los descuentos de stock
    RAISE;
END;
$$ LANGUAGE plpgsql;

-- Comentario de la función
COMMENT ON FUNCTION registrar_venta_pendiente_atomica IS 
'Registra una venta pendiente y descuenta stock de forma atómica. 
Si cualquier operación falla, toda la transacción se revierte automáticamente.';

-- Verificar que la función se creó correctamente
SELECT 
  'FASE 1.1 COMPLETA' as estado,
  proname as funcion_creada,
  pg_get_function_arguments(oid) as argumentos
FROM pg_proc
WHERE proname = 'registrar_venta_pendiente_atomica';


