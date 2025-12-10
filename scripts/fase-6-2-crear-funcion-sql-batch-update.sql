-- FASE 6.2: Función SQL para actualizar múltiples productos en una transacción
-- 
-- Esta función permite actualizar el stock de múltiples productos en una sola transacción,
-- mejorando el rendimiento y garantizando atomicidad.
--
-- Uso:
-- SELECT actualizar_stock_multiple(ARRAY[
--   '{"id": "uuid-1", "diff": -5}',
--   '{"id": "uuid-2", "diff": 10}'
-- ]::jsonb[]);

CREATE OR REPLACE FUNCTION actualizar_stock_multiple(
  actualizaciones jsonb[]
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  resultado jsonb := '{"actualizados": 0, "errores": []}'::jsonb;
  actualizacion jsonb;
  producto_id uuid;
  diferencia integer;
  stock_actual integer;
  nuevo_stock integer;
  error_msg text;
BEGIN
  -- Validar que se proporcionaron actualizaciones
  IF actualizaciones IS NULL OR array_length(actualizaciones, 1) IS NULL THEN
    RETURN jsonb_build_object(
      'exito', false,
      'error', 'No se proporcionaron actualizaciones'
    );
  END IF;

  -- Procesar cada actualización
  FOREACH actualizacion IN ARRAY actualizaciones
  LOOP
    BEGIN
      -- Extraer datos de la actualización
      producto_id := (actualizacion->>'id')::uuid;
      diferencia := (actualizacion->>'diff')::integer;

      -- Validar que los datos son válidos
      IF producto_id IS NULL THEN
        resultado := jsonb_set(
          resultado,
          '{errores}',
          (resultado->'errores')::jsonb || jsonb_build_array('ID de producto nulo')
        );
        CONTINUE;
      END IF;

      IF diferencia IS NULL THEN
        resultado := jsonb_set(
          resultado,
          '{errores}',
          (resultado->'errores')::jsonb || jsonb_build_array(format('Diferencia nula para producto %s', producto_id))
        );
        CONTINUE;
      END IF;

      -- Obtener stock actual
      SELECT stock INTO stock_actual
      FROM almacen_central
      WHERE id = producto_id;

      -- Verificar que el producto existe
      IF stock_actual IS NULL THEN
        resultado := jsonb_set(
          resultado,
          '{errores}',
          (resultado->'errores')::jsonb || jsonb_build_array(format('Producto no encontrado: %s', producto_id))
        );
        CONTINUE;
      END IF;

      -- Calcular nuevo stock (asegurar que no sea negativo)
      nuevo_stock := GREATEST(0, stock_actual - diferencia);

      -- Actualizar stock
      UPDATE almacen_central
      SET stock = nuevo_stock,
          updated_at = NOW()
      WHERE id = producto_id;

      -- Incrementar contador de actualizados
      resultado := jsonb_set(
        resultado,
        '{actualizados}',
        to_jsonb((resultado->>'actualizados')::integer + 1)
      );

    EXCEPTION
      WHEN OTHERS THEN
        -- Capturar errores y continuar con las siguientes actualizaciones
        error_msg := format('Error actualizando producto %s: %s', producto_id, SQLERRM);
        resultado := jsonb_set(
          resultado,
          '{errores}',
          (resultado->'errores')::jsonb || jsonb_build_array(error_msg)
        );
    END;
  END LOOP;

  -- Retornar resultado
  RETURN jsonb_set(resultado, '{exito}', to_jsonb(true));
END;
$$;

-- Comentario de la función
COMMENT ON FUNCTION actualizar_stock_multiple(jsonb[]) IS 
'Actualiza el stock de múltiples productos en una sola transacción. Recibe un array de objetos JSON con "id" (UUID) y "diff" (integer). Retorna un objeto JSON con "exito", "actualizados" (número de productos actualizados) y "errores" (array de mensajes de error).';


