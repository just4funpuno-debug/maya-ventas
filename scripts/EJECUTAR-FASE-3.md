# Ejecutar FASE 3: Actualizar Foreign Keys

## ⚠️ ADVERTENCIA IMPORTANTE

Esta fase es **CRÍTICA** porque actualiza las foreign keys en la base de datos. 

**ANTES de ejecutar:**
- [ ] Has completado y verificado FASE 1 ✅
- [ ] Has completado y verificado FASE 2 ✅
- [ ] Has hecho backup de la base de datos (recomendado)
- [ ] Estás en el proyecto correcto de Supabase

## 🚀 Pasos de Ejecución

### Paso 1: Ejecutar Script Principal

1. Ve al SQL Editor de Supabase: https://supabase.com/dashboard/project/alwxhiombhfyjyyziyxz/sql/new
2. Abre el archivo: `scripts/fase-3-renombrar-products.sql`
3. Copia TODO el contenido del script
4. Pégalo en el SQL Editor
5. Haz clic en "Run" o presiona `Ctrl+Enter`
6. **Espera a que termine** (puede tardar unos segundos)

### Paso 2: Verificar Resultados del Script

El script mostrará mensajes en la consola:
- ✅ `Foreign key sales_sku_fkey eliminada`
- ✅ `Foreign key sales_sku_extra_fkey eliminada`
- ✅ `Foreign key numbers_sku_fkey eliminada`
- ✅ `Trigger almacen_central_updated existe`
- ✅ `Índice idx_almacen_central_sku existe`
- ✅ `Política RLS almacen_central_select_all existe`
- ✅ `Todas las foreign keys actualizadas correctamente`

**Si ves errores, NO continúes. Revisa los errores primero.**

### Paso 3: Ejecutar Script de Testing

1. Abre el archivo: `scripts/test-fase-3-renombrar-products.sql`
2. Copia TODO el contenido
3. Pégalo en el SQL Editor
4. Ejecuta el script
5. Revisa TODOS los resultados

### Paso 4: Verificar en la Aplicación

1. Abre la aplicación en localhost
2. Inicia sesión como admin
3. Ve al menú **"Ventas"**
4. Verifica:
   - [ ] Puedes registrar una venta
   - [ ] Los productos aparecen en el selector
   - [ ] La venta se guarda correctamente
   - [ ] No hay errores de foreign key

5. Ve al menú **"Mis Números"**
6. Verifica:
   - [ ] Puedes agregar un número
   - [ ] Puedes asignar un producto
   - [ ] Se guarda correctamente
   - [ ] No hay errores de foreign key

## ✅ Criterios de Éxito

La FASE 3 se considera exitosa si:

- [ ] El script SQL se ejecutó sin errores
- [ ] El script de testing muestra todos los checks en verde ✅
- [ ] Las foreign keys apuntan a `almacen_central`
- [ ] La aplicación funciona correctamente
- [ ] Puedes registrar ventas sin errores
- [ ] Puedes agregar números sin errores
- [ ] No hay errores en la consola del navegador

## ⚠️ Si Algo Falla

### Error: "constraint does not exist"
- Esto es normal si la foreign key no existía. El script tiene protección para esto.

### Error: "relation almacen_central does not exist"
- Verifica que la FASE 1 se ejecutó correctamente.

### Error en la aplicación: "foreign key constraint"
- Verifica que las foreign keys se crearon correctamente ejecutando el script de testing.

## 🔄 Rollback (si es necesario)

Si necesitas revertir la FASE 3:

```sql
-- Eliminar foreign keys nuevas
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_sku_fkey;
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_sku_extra_fkey;
ALTER TABLE mis_numeros DROP CONSTRAINT IF EXISTS numbers_sku_fkey;

-- Recrear foreign keys apuntando a products (vista)
-- Nota: Esto requeriría que la vista products soporte foreign keys
-- Mejor: restaurar desde backup si es necesario
```

## 📝 Notas

- Las foreign keys ahora apuntan directamente a `almacen_central`
- La vista `products` sigue funcionando para lectura
- Los triggers e índices ya están configurados desde FASE 1

## ✅ Siguiente Paso

Una vez que la FASE 3 esté verificada y funcionando correctamente, puedes continuar con la **FASE 4** (limpieza final y eliminación de la vista `products` si lo deseas).


