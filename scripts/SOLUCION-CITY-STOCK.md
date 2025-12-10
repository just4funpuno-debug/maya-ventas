# 🔍 Solución: Stock por Ciudad en Localhost

## Problema
En localhost (Supabase) no aparece stock por ciudad, mientras que en Vercel (Firebase) sí hay datos.

## Diagnóstico

### Paso 1: Verificar Estado Actual
Ejecuta el script `verificar-city-stock.sql` en el SQL Editor de Supabase para ver:
- Si hay datos en `city_stock`
- Si hay despachos confirmados
- Qué ciudades tienen stock

### Paso 2: Migrar desde Despachos Confirmados
Si hay despachos confirmados pero no hay stock en `city_stock`, ejecuta:
`migrar-city-stock-desde-despachos.sql`

Este script procesará todos los despachos confirmados y creará/actualizará los registros en `city_stock`.

## Instrucciones de Ejecución

### Opción A: Ejecutar Scripts Manualmente

1. **Abre Supabase Dashboard** → SQL Editor
2. **Ejecuta `verificar-city-stock.sql`**:
   - Copia el contenido del archivo
   - Pega en el SQL Editor
   - Ejecuta (Run)
   - Revisa los resultados

3. **Si no hay datos en `city_stock` pero hay despachos confirmados**:
   - Ejecuta `migrar-city-stock-desde-despachos.sql`
   - Esto creará los registros necesarios

### Opción B: Script Automático (Recomendado)

He creado un script combinado que:
- ✅ Verifica el estado actual
- ✅ Migra automáticamente si es necesario
- ✅ Muestra un resumen final

**Ejecuta:** `verificar-y-migrar-city-stock.sql`

## Verificación Post-Migración

Después de ejecutar los scripts:

1. **Refresca la página** en localhost
2. **Ve al menú "Despacho de Productos"**
3. **Selecciona una ciudad** (ej: "EL ALTO")
4. **Verifica que aparezca el stock** en el cuadro "STOCK EN [CIUDAD]"

## Notas Importantes

- Los nombres de ciudades se normalizan: "EL ALTO" → "el_alto"
- El stock se crea automáticamente cuando confirmas un despacho
- Si no hay despachos confirmados, no habrá stock en `city_stock`
- Los datos de Vercel (Firebase) no se migran automáticamente - necesitas confirmar despachos en localhost

## Próximos Pasos

Si después de la migración aún no aparece stock:
1. Verifica que hay despachos confirmados en la tabla `dispatches`
2. Confirma algunos despachos desde el menú "Despacho de Productos"
3. Verifica que `confirmDispatch` esté funcionando correctamente


