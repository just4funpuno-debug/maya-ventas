# FASE 2: Actualizar código JavaScript

## Objetivo
Actualizar todas las referencias directas a `products` en el código JavaScript para usar `almacen_central` o el mapeo existente.

## Cambios necesarios

### 1. Actualizar `src/supabaseUsers.js`
- Cambiar el mapeo de `'almacenCentral': 'products'` a `'almacenCentral': 'almacen_central'`

### 2. Actualizar `src/App.jsx`
- Buscar todas las referencias a `supabase.from('products')`
- Cambiar a `supabase.from('almacen_central')`

### 3. Verificar otros archivos
- Buscar referencias en otros archivos si existen

## Script de búsqueda

Antes de hacer cambios, ejecuta:
```bash
# Buscar todas las referencias
grep -r "from('products')" src/
grep -r 'from("products")' src/
grep -r "\.from\(['\"]products" src/
```

## Pasos de implementación

1. **Actualizar `tableMap` en `supabaseUsers.js`**
2. **Actualizar referencias directas en `App.jsx`**
3. **Probar en localhost** que todo funciona
4. **Verificar** que no hay errores en consola

## Testing

Después de los cambios, verifica:
- ✅ El menú "Productos" carga correctamente
- ✅ Se pueden agregar/editar productos
- ✅ El stock se actualiza correctamente
- ✅ Los despachos funcionan
- ✅ Las ventas funcionan (foreign keys)

## Nota importante

⚠️ **NO ejecutar FASE 3 hasta confirmar que FASE 2 funciona correctamente**


