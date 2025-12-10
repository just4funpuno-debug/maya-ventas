# Asociar Ventas a Depósitos

## Problema

Los depósitos tienen el campo `nota` completo, pero el array `ventas` está vacío porque las ventas en la tabla `sales` no tienen `deposit_id` asociado.

## Solución

El script `asociar-ventas-a-deposits.sql` hace dos cosas:

1. **Asocia ventas a depósitos**: Busca ventas que coincidan con la fecha y ciudad del depósito y les asigna el `deposit_id`
2. **Actualiza el campo nota**: Vuelve a construir el campo `nota` con las ventas ahora asociadas

## Pasos para Ejecutar

1. **Ve al SQL Editor de Supabase**
2. **Copia y pega el contenido de** `scripts/asociar-ventas-a-deposits.sql`
3. **Ejecuta el script completo**
4. **Verifica los resultados** (el script muestra un resumen al final)

## Qué hace el script

- **Paso 1**: Muestra estadísticas de la situación actual
- **Paso 2**: Asocia ventas a depósitos por fecha y ciudad (solo si no tienen `deposit_id`)
- **Paso 3**: Verifica cuántas ventas se asociaron
- **Paso 4**: Actualiza el campo `nota` de los depósitos con las ventas ahora asociadas
- **Paso 5**: Muestra un resumen final con la cantidad de ventas en cada depósito

## Criterio de Asociación

Las ventas se asocian a un depósito si:
- La venta no tiene `deposit_id` (`deposit_id IS NULL`)
- La fecha de la venta coincide con la fecha del depósito
- La ciudad de la venta coincide con la ciudad del depósito (normalizada)
- El depósito tiene `nota` pero sin ventas (`ventas = []`)

## Después de Ejecutar

1. Recarga la aplicación en localhost
2. Ve al menú "Generar Depósito"
3. Los datos deberían aparecer correctamente ahora con todas las ventas

## Notas

- El script solo asocia ventas que no tienen `deposit_id` (no modifica ventas ya asociadas)
- Solo actualiza depósitos que tienen `nota` pero sin ventas
- Si una venta ya está asociada a otro depósito, no se modifica


