# Actualizar Depósitos con Campo Nota

## Problema Identificado

Todos los depósitos en Supabase tienen `nota = NULL`, por lo que el menú "Generar Depósito" no puede mostrar los datos correctamente.

## Solución

El script `actualizar-deposits-con-nota.sql` actualiza todos los depósitos existentes:
1. Busca las ventas asociadas a cada depósito (por `deposit_id` en `sales`)
2. Construye el objeto `resumen` con estadísticas
3. Construye el array `ventas` con todos los datos de las ventas
4. Actualiza el campo `nota` con el JSON completo

## Pasos para Ejecutar

1. **Ve al SQL Editor de Supabase**
2. **Copia y pega el contenido de** `scripts/actualizar-deposits-con-nota.sql`
3. **Ejecuta el script**
4. **Verifica los resultados** (el script muestra un resumen al final)

## Qué hace el script

- **Paso 1**: Muestra cuántas ventas tiene cada depósito (solo para verificación)
- **Paso 2**: Actualiza cada depósito sin `nota` con:
  - `resumen`: Estadísticas calculadas (total ventas, monto, delivery, etc.)
  - `ventas`: Array completo con todos los datos de las ventas asociadas
- **Paso 3**: Muestra un resumen de los depósitos actualizados

## Después de Ejecutar

1. Recarga la aplicación en localhost
2. Ve al menú "Generar Depósito"
3. Los datos deberían aparecer correctamente ahora

## Notas

- El script solo actualiza depósitos que tienen `nota IS NULL`
- No elimina ni modifica datos existentes
- Si un depósito no tiene ventas asociadas, el array `ventas` será vacío `[]`
- El campo `productos` en `resumen` se deja vacío por ahora (se puede calcular después si es necesario)


