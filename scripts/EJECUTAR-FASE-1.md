# Ejecutar FASE 1: Renombrar products a almacen_central

## 📋 Checklist Pre-Ejecución

- [ ] Tienes acceso al SQL Editor de Supabase
- [ ] Has hecho backup de la base de datos (recomendado)
- [ ] Estás en el proyecto correcto de Supabase

## 🚀 Pasos de Ejecución

### Paso 1: Ejecutar Script Principal

1. Ve al SQL Editor de Supabase: https://supabase.com/dashboard/project/alwxhiombhfyjyyziyxz/sql/new
2. Abre el archivo: `scripts/fase-1-renombrar-products.sql`
3. Copia TODO el contenido del script
4. Pégalo en el SQL Editor
5. Haz clic en "Run" o presiona `Ctrl+Enter`
6. **Espera a que termine** (puede tardar unos segundos)

### Paso 2: Verificar Resultados del Script

El script mostrará mensajes en la consola:
- ✅ `Productos en tabla original (products): X`
- ✅ `Productos en nueva tabla (almacen_central): X`
- ✅ `✅ Migración exitosa: Ambas tablas tienen el mismo número de registros`
- ✅ `Vista products creada correctamente` con el total de registros

**Si ves errores, NO continúes. Revisa los errores primero.**

### Paso 3: Ejecutar Script de Testing

1. Abre el archivo: `scripts/test-fase-1-renombrar-products.sql`
2. Copia TODO el contenido
3. Pégalo en el SQL Editor
4. Ejecuta el script
5. Revisa TODOS los resultados

### Paso 4: Verificar en la Aplicación

1. Abre la aplicación en localhost
2. Inicia sesión como admin
3. Ve al menú **"Productos"**
4. Verifica:
   - [ ] Los productos se cargan correctamente
   - [ ] Puedes ver la lista de productos
   - [ ] Las imágenes se muestran (si hay)
   - [ ] Puedes editar un producto existente
   - [ ] Puedes agregar un nuevo producto
   - [ ] El stock se muestra correctamente

5. Ve al menú **"Almacen Central"**
6. Verifica:
   - [ ] Los productos se muestran en el formulario de despachos
   - [ ] Puedes crear un despacho
   - [ ] El stock se actualiza correctamente

## ✅ Criterios de Éxito

La FASE 1 se considera exitosa si:

- [ ] El script SQL se ejecutó sin errores
- [ ] El script de testing muestra todos los checks en verde ✅
- [ ] La tabla `almacen_central` existe y tiene datos
- [ ] La vista `products` existe y muestra los mismos datos
- [ ] La aplicación carga productos correctamente
- [ ] Puedes agregar/editar productos sin errores
- [ ] Los despachos funcionan correctamente
- [ ] No hay errores en la consola del navegador

## ⚠️ Si Algo Falla

### Error: "relation products already exists"
- Esto es normal si `products` es una tabla. El script creará la vista sobre `almacen_central`.

### Error: "duplicate key value violates unique constraint"
- Significa que ya hay datos en `almacen_central`. El script tiene protección para esto.

### Error en la aplicación: "Could not find the 'products' column"
- Verifica que la vista `products` se creó correctamente ejecutando:
  ```sql
  SELECT * FROM products LIMIT 1;
  ```

### La aplicación no carga productos
- Verifica que la vista funciona:
  ```sql
  SELECT COUNT(*) FROM products;
  SELECT COUNT(*) FROM almacen_central;
  ```
- Deben mostrar el mismo número.

## 🔄 Rollback (si es necesario)

Si necesitas revertir la FASE 1:

```sql
-- Eliminar vista products
DROP VIEW IF EXISTS products;

-- Eliminar tabla almacen_central (CUIDADO: esto elimina los datos)
-- DROP TABLE IF EXISTS almacen_central;
```

**Nota:** La tabla original `products` NO se modifica en la FASE 1, así que no hay riesgo de perder datos.

## 📝 Notas

- La FASE 1 es **100% segura** porque:
  - No modifica la tabla `products` original
  - Crea una nueva tabla `almacen_central`
  - Crea una vista `products` que apunta a `almacen_central`
  - El código existente sigue funcionando sin cambios

- Puedes ejecutar la FASE 1 múltiples veces sin problemas (es idempotente)

## ✅ Siguiente Paso

Una vez que la FASE 1 esté verificada y funcionando correctamente, puedes continuar con la **FASE 2** (actualizar código JavaScript).


