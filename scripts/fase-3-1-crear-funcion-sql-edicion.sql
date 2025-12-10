-- ============================================================================
-- FASE 3.1: CREAR FUNCIÓN SQL TRANSACCIONAL PARA EDICIÓN DE VENTAS
-- ============================================================================
-- Objetivo: Garantizar que la edición de ventas y el ajuste de stock ocurran
-- de forma atómica (todo o nada), evitando inconsistencias
-- ============================================================================

-- ============================================================================
-- FUNCIÓN: EDITAR VENTA PENDIENTE DE FORMA ATÓMICA
-- ============================================================================
-- Esta función edita una venta pendiente y ajusta el stock de forma atómica
-- Maneja cambios de ciudad, SKU, cantidad, producto adicional
-- ============================================================================

CREATE OR REPLACE FUNCTION editar_venta_pendiente_atomica(
  p_venta_id uuid,
  -- Datos anteriores (requeridos)
  p_ciudad_anterior text,
  p_sku_anterior text,
  p_cantidad_anterior integer,
  -- Datos nuevos (requeridos)
  p_fecha date,
  p_ciudad_nueva text,
  p_sku_nueva text,
  p_cantidad_nueva integer,
  -- Datos anteriores opcionales
  p_sku_extra_anterior text DEFAULT NULL,
  p_cantidad_extra_anterior integer DEFAULT NULL,
  -- Datos nuevos opcionales
  p_precio numeric DEFAULT NULL,
  p_sku_extra_nueva text DEFAULT NULL,
  p_cantidad_extra_nueva integer DEFAULT NULL,
  p_total numeric DEFAULT NULL,
  p_vendedora text DEFAULT NULL,
  p_vendedora_id uuid DEFAULT NULL,
  p_celular text DEFAULT NULL,
  p_metodo text DEFAULT NULL,
  p_cliente text DEFAULT NULL,
  p_notas text DEFAULT NULL,
  p_gasto numeric DEFAULT 0,
  p_gasto_cancelacion numeric DEFAULT 0,
  p_hora_entrega text DEFAULT NULL,
  p_comprobante text DEFAULT NULL,
  p_destino_encomienda text DEFAULT NULL,
  p_motivo text DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  v_ciudad_anterior_norm text;
  v_ciudad_nueva_norm text;
  v_stock_disponible integer;
  v_stock_extra_disponible integer;
  v_diferencia integer;
  v_stock_actual integer;
BEGIN
  -- Validar parámetros requeridos
  IF p_venta_id IS NULL OR p_ciudad_anterior IS NULL OR p_sku_anterior IS NULL OR 
     p_ciudad_nueva IS NULL OR p_sku_nueva IS NULL OR p_cantidad_nueva IS NULL THEN
    RAISE EXCEPTION 'Parámetros requeridos faltantes';
  END IF;

  -- Normalizar ciudades
  v_ciudad_anterior_norm := normalize_city(p_ciudad_anterior);
  v_ciudad_nueva_norm := normalize_city(p_ciudad_nueva);
  
  IF v_ciudad_anterior_norm IS NULL OR v_ciudad_nueva_norm IS NULL THEN
    RAISE EXCEPTION 'Ciudad inválida';
  END IF;

  -- Verificar que la venta existe y es pendiente
  IF NOT EXISTS (
    SELECT 1 FROM ventas 
    WHERE id = p_venta_id 
    AND estado_entrega = 'pendiente'
    AND deleted_from_pending_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Venta no encontrada o no es pendiente: %', p_venta_id;
  END IF;

  -- ============================================================================
  -- PASO 1: OPTIMIZACIÓN: Si el SKU y ciudad son los mismos, calcular diferencia
  -- ============================================================================
  -- Si el SKU y ciudad son los mismos, podemos optimizar calculando la diferencia
  -- en lugar de restaurar y luego descontar
  
  -- Validar y ajustar stock principal
  IF p_sku_nueva IS NOT NULL AND p_cantidad_nueva > 0 THEN
    -- Si el SKU y ciudad son los mismos, calcular diferencia
    IF v_ciudad_anterior_norm = v_ciudad_nueva_norm AND p_sku_anterior = p_sku_nueva THEN
      -- Calcular diferencia: cantidad_nueva - cantidad_anterior
      v_diferencia := p_cantidad_nueva - p_cantidad_anterior;
      
      -- Leer stock actual
      SELECT cantidad INTO v_stock_actual
      FROM city_stock
      WHERE ciudad = v_ciudad_nueva_norm AND sku = p_sku_nueva;
      
      -- Si no existe registro, crear con cantidad 0
      IF v_stock_actual IS NULL THEN
        INSERT INTO city_stock (ciudad, sku, cantidad)
        VALUES (v_ciudad_nueva_norm, p_sku_nueva, 0)
        ON CONFLICT (ciudad, sku) DO NOTHING;
        
        SELECT cantidad INTO v_stock_actual
        FROM city_stock
        WHERE ciudad = v_ciudad_nueva_norm AND sku = p_sku_nueva;
      END IF;
      
      -- Si la diferencia es positiva, necesitamos más stock (descontar diferencia)
      IF v_diferencia > 0 THEN
        -- Verificar que hay stock suficiente para la diferencia
        IF COALESCE(v_stock_actual, 0) < v_diferencia THEN
          RAISE EXCEPTION 'Stock insuficiente para % en %: disponible %, requerido %', 
            p_sku_nueva, v_ciudad_nueva_norm, COALESCE(v_stock_actual, 0), v_diferencia;
        END IF;
        
        -- Descontar solo la diferencia
        PERFORM descontar_stock_ciudad_atomico(
          v_ciudad_nueva_norm,
          p_sku_nueva,
          v_diferencia
        );
      ELSIF v_diferencia < 0 THEN
        -- Si la diferencia es negativa, restauramos la diferencia (sumamos)
        PERFORM restaurar_stock_ciudad_atomico(
          v_ciudad_nueva_norm,
          p_sku_nueva,
          -v_diferencia
        );
      END IF;
      -- Si v_diferencia = 0, no hacemos nada
    ELSE
      -- SKU o ciudad diferentes: restaurar anterior y descontar nuevo
      -- Restaurar stock principal anterior
      IF p_sku_anterior IS NOT NULL AND p_cantidad_anterior > 0 THEN
        PERFORM restaurar_stock_ciudad_atomico(
          v_ciudad_anterior_norm,
          p_sku_anterior,
          p_cantidad_anterior
        );
      END IF;
      
      -- Leer stock disponible DESPUÉS de restaurar
      SELECT cantidad INTO v_stock_disponible
      FROM city_stock
      WHERE ciudad = v_ciudad_nueva_norm AND sku = p_sku_nueva;
      
      -- Si no existe registro, crear con cantidad 0
      IF v_stock_disponible IS NULL THEN
        INSERT INTO city_stock (ciudad, sku, cantidad)
        VALUES (v_ciudad_nueva_norm, p_sku_nueva, 0)
        ON CONFLICT (ciudad, sku) DO NOTHING;
        
        SELECT cantidad INTO v_stock_disponible
        FROM city_stock
        WHERE ciudad = v_ciudad_nueva_norm AND sku = p_sku_nueva;
      END IF;
      
      -- Verificar que hay stock suficiente
      IF COALESCE(v_stock_disponible, 0) < p_cantidad_nueva THEN
        RAISE EXCEPTION 'Stock insuficiente para % en %: disponible %, requerido %', 
          p_sku_nueva, v_ciudad_nueva_norm, COALESCE(v_stock_disponible, 0), p_cantidad_nueva;
      END IF;
      
      -- Descontar stock
      PERFORM descontar_stock_ciudad_atomico(
        v_ciudad_nueva_norm,
        p_sku_nueva,
        p_cantidad_nueva
      );
    END IF;
  ELSE
    -- Si no hay stock nuevo, solo restaurar el anterior
    IF p_sku_anterior IS NOT NULL AND p_cantidad_anterior > 0 THEN
      PERFORM restaurar_stock_ciudad_atomico(
        v_ciudad_anterior_norm,
        p_sku_anterior,
        p_cantidad_anterior
      );
    END IF;
  END IF;

  -- ============================================================================
  -- PASO 2: MANEJAR STOCK EXTRA
  -- ============================================================================
  
  -- Validar y ajustar stock extra
  IF p_sku_extra_nueva IS NOT NULL AND p_cantidad_extra_nueva > 0 THEN
    -- Si el SKU extra y ciudad son los mismos, calcular diferencia
    IF v_ciudad_anterior_norm = v_ciudad_nueva_norm AND 
       p_sku_extra_anterior = p_sku_extra_nueva AND
       p_sku_extra_anterior IS NOT NULL THEN
      -- Calcular diferencia: cantidad_extra_nueva - cantidad_extra_anterior
      v_diferencia := p_cantidad_extra_nueva - COALESCE(p_cantidad_extra_anterior, 0);
      
      -- Leer stock actual
      SELECT cantidad INTO v_stock_actual
      FROM city_stock
      WHERE ciudad = v_ciudad_nueva_norm AND sku = p_sku_extra_nueva;
      
      -- Si no existe registro, crear con cantidad 0
      IF v_stock_actual IS NULL THEN
        INSERT INTO city_stock (ciudad, sku, cantidad)
        VALUES (v_ciudad_nueva_norm, p_sku_extra_nueva, 0)
        ON CONFLICT (ciudad, sku) DO NOTHING;
        
        SELECT cantidad INTO v_stock_actual
        FROM city_stock
        WHERE ciudad = v_ciudad_nueva_norm AND sku = p_sku_extra_nueva;
      END IF;
      
      -- Si la diferencia es positiva, necesitamos más stock (descontar diferencia)
      IF v_diferencia > 0 THEN
        -- Verificar que hay stock suficiente para la diferencia
        IF COALESCE(v_stock_actual, 0) < v_diferencia THEN
          RAISE EXCEPTION 'Stock insuficiente para producto extra % en %: disponible %, requerido %', 
            p_sku_extra_nueva, v_ciudad_nueva_norm, COALESCE(v_stock_actual, 0), v_diferencia;
        END IF;
        
        -- Descontar solo la diferencia
        PERFORM descontar_stock_ciudad_atomico(
          v_ciudad_nueva_norm,
          p_sku_extra_nueva,
          v_diferencia
        );
      ELSIF v_diferencia < 0 THEN
        -- Si la diferencia es negativa, restauramos la diferencia (sumamos)
        PERFORM restaurar_stock_ciudad_atomico(
          v_ciudad_nueva_norm,
          p_sku_extra_nueva,
          -v_diferencia
        );
      END IF;
      -- Si v_diferencia = 0, no hacemos nada
    ELSE
      -- SKU extra o ciudad diferentes: restaurar anterior y descontar nuevo
      -- Restaurar stock extra anterior
      IF p_sku_extra_anterior IS NOT NULL AND p_cantidad_extra_anterior > 0 THEN
        PERFORM restaurar_stock_ciudad_atomico(
          v_ciudad_anterior_norm,
          p_sku_extra_anterior,
          p_cantidad_extra_anterior
        );
      END IF;
      
      -- Leer stock disponible DESPUÉS de restaurar
      SELECT cantidad INTO v_stock_extra_disponible
      FROM city_stock
      WHERE ciudad = v_ciudad_nueva_norm AND sku = p_sku_extra_nueva;
      
      -- Si no existe registro, crear con cantidad 0
      IF v_stock_extra_disponible IS NULL THEN
        INSERT INTO city_stock (ciudad, sku, cantidad)
        VALUES (v_ciudad_nueva_norm, p_sku_extra_nueva, 0)
        ON CONFLICT (ciudad, sku) DO NOTHING;
        
        SELECT cantidad INTO v_stock_extra_disponible
        FROM city_stock
        WHERE ciudad = v_ciudad_nueva_norm AND sku = p_sku_extra_nueva;
      END IF;
      
      -- Verificar que hay stock suficiente
      IF COALESCE(v_stock_extra_disponible, 0) < p_cantidad_extra_nueva THEN
        RAISE EXCEPTION 'Stock insuficiente para producto extra % en %: disponible %, requerido %', 
          p_sku_extra_nueva, v_ciudad_nueva_norm, COALESCE(v_stock_extra_disponible, 0), p_cantidad_extra_nueva;
      END IF;
      
      -- Descontar stock extra
      PERFORM descontar_stock_ciudad_atomico(
        v_ciudad_nueva_norm,
        p_sku_extra_nueva,
        p_cantidad_extra_nueva
      );
    END IF;
  ELSE
    -- Si no hay stock extra nuevo, solo restaurar el anterior
    IF p_sku_extra_anterior IS NOT NULL AND p_cantidad_extra_anterior > 0 THEN
      PERFORM restaurar_stock_ciudad_atomico(
        v_ciudad_anterior_norm,
        p_sku_extra_anterior,
        p_cantidad_extra_anterior
      );
    END IF;
  END IF;

  -- ============================================================================
  -- PASO 3: ACTUALIZAR VENTA
  -- ============================================================================
  
  -- Actualizar venta (solo campos que no son NULL)
  UPDATE ventas
  SET 
    fecha = p_fecha,
    ciudad = v_ciudad_nueva_norm,
    sku = p_sku_nueva,
    cantidad = p_cantidad_nueva,
    precio = COALESCE(p_precio, precio),
    sku_extra = p_sku_extra_nueva,
    cantidad_extra = COALESCE(p_cantidad_extra_nueva, cantidad_extra),
    total = COALESCE(p_total, total),
    vendedora = COALESCE(p_vendedora, vendedora),
    vendedora_id = COALESCE(p_vendedora_id, vendedora_id),
    celular = COALESCE(p_celular, celular),
    metodo = COALESCE(p_metodo, metodo),
    cliente = COALESCE(p_cliente, cliente),
    notas = COALESCE(p_notas, notas),
    gasto = COALESCE(p_gasto, gasto),
    gasto_cancelacion = COALESCE(p_gasto_cancelacion, gasto_cancelacion),
    hora_entrega = COALESCE(p_hora_entrega, hora_entrega),
    comprobante = COALESCE(p_comprobante, comprobante),
    destino_encomienda = COALESCE(p_destino_encomienda, destino_encomienda),
    motivo = COALESCE(p_motivo, motivo)
  WHERE id = p_venta_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se pudo actualizar la venta: %', p_venta_id;
  END IF;

  -- Retornar ID de la venta editada
  RETURN p_venta_id;

EXCEPTION
  WHEN OTHERS THEN
    -- PostgreSQL automáticamente revierte toda la transacción
    -- Esto incluye las restauraciones y descuentos de stock
    RAISE EXCEPTION 'Error en editar_venta_pendiente_atomica: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VERIFICACIÓN: La función fue creada correctamente
-- ============================================================================

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'editar_venta_pendiente_atomica')
    THEN '✅ Función creada correctamente'
    ELSE '❌ Error: La función no fue creada'
  END as verificacion;

