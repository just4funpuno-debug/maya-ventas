# Testing FASE 2: Actualizar código JavaScript

## Cambios Realizados

### ✅ 1. `src/supabaseUsers.js`
- [x] `tableMap` actualizado: `'almacenCentral': 'almacen_central'`

### ✅ 2. `src/App.jsx`
- [x] Todas las operaciones INSERT/UPDATE/DELETE ahora usan `almacen_central`
- [x] Actualizaciones optimistas implementadas
- [x] Referencias a `products` actualizadas a `almacen_central`

### ✅ 3. `src/supabaseClient.js`
- [x] Función `testSupabaseConnection()` actualizada para usar `almacen_central`

## Checklist de Testing

### 1. Menú "Productos"
- [ ] Los productos se cargan correctamente
- [ ] Puedes ver la lista completa
- [ ] Puedes agregar un nuevo producto
  - [ ] Aparece inmediatamente (sin F5)
  - [ ] Se guarda correctamente en `almacen_central`
- [ ] Puedes editar un producto existente
  - [ ] Los cambios se ven inmediatamente (sin F5)
  - [ ] Se guardan correctamente en `almacen_central`
- [ ] Puedes eliminar un producto
  - [ ] Se elimina inmediatamente (sin F5)
  - [ ] Se elimina de `almacen_central`

### 2. Menú "Almacen Central"
- [ ] Los productos aparecen en el formulario de despachos
- [ ] Puedes crear un despacho
- [ ] El stock se actualiza correctamente
- [ ] Puedes confirmar un despacho
- [ ] El stock se descuenta correctamente

### 3. Menú "Ventas"
- [ ] Puedes registrar una venta
- [ ] Los productos aparecen en el selector
- [ ] El stock de ciudad se actualiza correctamente

### 4. Consola del Navegador
- [ ] No hay errores en la consola (F12)
- [ ] No hay errores de "table not found"
- [ ] No hay errores de "column not found"
- [ ] La suscripción en tiempo real funciona

### 5. Verificación en Supabase
Ejecuta en SQL Editor:
```sql
-- Verificar que los cambios se guardan en almacen_central
SELECT COUNT(*) FROM almacen_central;

-- Verificar que la vista products muestra los mismos datos
SELECT COUNT(*) FROM products;

-- Verificar que products_backup NO se modifica (debe tener 8 registros)
SELECT COUNT(*) FROM products_backup;
```

## Criterios de Éxito

La FASE 2 está completa cuando:
- [x] Todas las referencias directas a `products` actualizadas
- [ ] La aplicación funciona correctamente
- [ ] No hay errores en consola
- [ ] Los cambios se ven inmediatamente (actualizaciones optimistas)
- [ ] Los datos se guardan en `almacen_central` (no en `products_backup`)

## Notas

- `products_backup` NO debe modificarse (es solo backup)
- Todos los cambios van a `almacen_central`
- La vista `products` muestra los datos de `almacen_central` automáticamente


