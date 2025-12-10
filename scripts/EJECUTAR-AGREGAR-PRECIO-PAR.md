# Agregar Columna precio_par a almacen_central

## 📋 Objetivo

Agregar la columna `precio_par` a la tabla `almacen_central` para que el campo "Precio/par" se guarde correctamente en la base de datos.

## 🚀 Pasos de Ejecución

### Paso 1: Ejecutar Script SQL

1. Ve al SQL Editor de Supabase: https://supabase.com/dashboard/project/alwxhiombhfyjyyziyxz/sql/new
2. Abre el archivo: `scripts/add-precio-par-column.sql`
3. Copia TODO el contenido del script
4. Pégalo en el SQL Editor
5. Haz clic en "Run" o presiona `Ctrl+Enter`

### Paso 2: Verificar

El script mostrará:
- ✅ Verificación de que la columna se agregó
- ✅ Resumen con total de productos

## ✅ Cambios Realizados en el Código

### 1. Función `fijarValoresProducto` (App.jsx)
- ✅ Ahora guarda tanto `delivery` como `precio_par` en la base de datos
- ✅ Actualización optimista implementada
- ✅ Manejo de errores con reversión

### 2. Normalización de Datos (supabaseUsers.js)
- ✅ Incluye `precioPar` al cargar productos desde `almacen_central`
- ✅ Mapea `precio_par` (snake_case) a `precioPar` (camelCase)

## 🧪 Testing

Después de ejecutar el script SQL:

1. **Recargar la aplicación** (F5)
2. **Ir al menú "Almacen Central"**
3. **Editar un producto:**
   - Cambiar "Delivery"
   - Cambiar "Precio/par"
   - Hacer clic en "Fijar"
4. **Verificar:**
   - [ ] Los valores se guardan correctamente
   - [ ] Al recargar la página, los valores se mantienen
   - [ ] El cálculo "TOTAL POR VENDER" funciona correctamente

## 📝 Notas

- La columna `precio_par` se crea con valor por defecto `0`
- Los productos existentes tendrán `precio_par = 0` inicialmente
- Puedes editar el valor en los cuadros de productos y guardarlo con "Fijar"


