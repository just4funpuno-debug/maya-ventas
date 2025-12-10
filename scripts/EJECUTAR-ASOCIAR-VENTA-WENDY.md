# Asociar Venta de Wendy al Depósito

## Situación

La venta de Wendy (25/10/2025, 4:00 PM, SUCRE, celular 60322315, total 580.00) existe en Supabase pero NO está asociada al depósito.

## Solución

El script `asociar-venta-wendy-al-deposito.sql`:
1. Asocia la venta al depósito del 25/10/2025 en SUCRE
2. Actualiza el campo `nota` del depósito para incluir esta venta

## Pasos

1. **Ve al SQL Editor de Supabase**
2. **Copia y pega el contenido de** `scripts/asociar-venta-wendy-al-deposito.sql`
3. **Ejecuta el script completo**
4. **Verifica los resultados** (el script muestra las ventas del depósito al final)

## Después de Ejecutar

1. Recarga la aplicación en localhost
2. Ve al menú "Generar Depósito"
3. Selecciona SUCRE y el depósito del 25/10/2025
4. La venta de Wendy debería aparecer ahora


