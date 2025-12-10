# ✅ FASE 9.4: Corregir Rollback Incompleto en Crear Despacho - COMPLETADA

**Fecha:** 2025-01-27

---

## 📋 Objetivo

Corregir el rollback incompleto en la función de crear despacho. Si falla al descontar stock, se debe revertir tanto `products` como `dispatches`.

---

## 🐛 Problema Identificado

**Ubicación:** `src/App.jsx:4576-4597`

**Problema:**
- Cuando falla al descontar stock en Supabase, solo se revertía `products`
- El despacho optimista (`dispatches`) quedaba en el estado local aunque la operación hubiera fallado
- Esto causaba inconsistencias: el despacho aparecía en la UI pero no existía en la base de datos

---

## ✅ Cambios Realizados

### Antes
```javascript
if (error) {
  console.warn('[Crear Despacho] Error descontando stock', error);
  // Revertir actualización optimista de productos
  setProducts(previousProducts);
  throw error;
}
catch(err) { 
  console.warn('[Crear Despacho] Error descontando stock', err);
  // Revertir actualización optimista de productos
  setProducts(previousProducts);
  throw err;
}
```

### Después
```javascript
if (error) {
  console.warn('[Crear Despacho] Error descontando stock', error);
  // Revertir actualizaciones optimistas: productos y dispatches
  setProducts(previousProducts);
  setDispatches(previousDispatches);
  throw error;
}
catch(err) { 
  console.warn('[Crear Despacho] Error descontando stock', err);
  // Revertir actualizaciones optimistas: productos y dispatches
  setProducts(previousProducts);
  setDispatches(previousDispatches);
  throw err;
}
```

### Cambios Específicos

1. ✅ **Línea 4588**: Agregado `setDispatches(previousDispatches);` en el bloque `if (error)`
2. ✅ **Línea 4594**: Agregado `setDispatches(previousDispatches);` en el bloque `catch(err)`

---

## 🎯 Comportamiento Corregido

### Antes
- ❌ Si falla al descontar stock → Solo se revertía `products`
- ❌ El despacho optimista quedaba en `dispatches`
- ❌ Inconsistencia: despacho visible en UI pero no en BD

### Después
- ✅ Si falla al descontar stock → Se revierten **ambos** (`products` y `dispatches`)
- ✅ El estado local queda completamente revertido
- ✅ Consistencia: UI y BD sincronizadas

---

## 🧪 Testing

### Verificaciones Realizadas

1. ✅ **Build exitoso**: `npm run build` se ejecuta sin errores
2. ✅ **Sin errores de linter**: No hay errores de linting
3. ✅ **Rollback completo**: Ambos estados se revierten correctamente

### Casos de Prueba

#### Caso 1: Error al descontar stock
- ✅ Se revierten `products` al estado anterior
- ✅ Se revierten `dispatches` al estado anterior (eliminando el despacho optimista)
- ✅ Se lanza el error para que el usuario sea notificado
- ✅ No queda ningún rastro del despacho fallido en la UI

#### Caso 2: Error al guardar despacho en Supabase
- ✅ Ya estaba correcto: se revertían ambos estados (líneas 4616-4617 y 4634-4635)
- ✅ No se requirieron cambios adicionales

---

## 📝 Contexto de la Función

La función de crear despacho realiza las siguientes operaciones optimistas:

1. **Actualización optimista de `products`**: Descuenta stock localmente
2. **Actualización optimista de `dispatches`**: Agrega despacho temporal a la lista
3. **Operaciones en segundo plano**:
   - Descontar stock en Supabase (`almacen_central`)
   - Guardar despacho en Supabase (`dispatches`)

Si cualquiera de estas operaciones falla, se debe revertir **ambos** estados optimistas para mantener la consistencia.

---

## ✅ Estado: COMPLETADA

FASE 9.4 completada exitosamente. El rollback ahora es completo: si falla al descontar stock, se revierten tanto `products` como `dispatches`, manteniendo la consistencia entre UI y base de datos.

