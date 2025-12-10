# 🟡 FASE 4: MANEJO DE ERRORES MEJORADO

## 📋 Objetivo

Mejorar el manejo de errores en operaciones críticas, especialmente en:
1. **Despachos**: Revertir cambios locales si fallan operaciones en Supabase
2. **Operaciones Optimistas**: Agregar rollback cuando fallan operaciones en Supabase
3. **Errores Silenciados**: Convertir `console.warn` en manejo de errores adecuado con rollback

## 🔍 Problemas Identificados

### 4.1: Errores silenciados en edición de despachos

**Ubicación:** `src/App.jsx:4306-4326`

**Problema:**
```javascript
if (error) console.warn('[editar despacho] fallo ajustar stock', sku, diff, error);
// ⚠️ Solo hace console.warn, no revierte cambios locales
```

**Impacto:** Si falla actualizar stock en Supabase, el estado local queda inconsistente.

**Solución:** Revertir cambios locales si falla la operación en Supabase.

---

### 4.2: Falta de rollback en operaciones optimistas

**Ubicación:** Múltiples lugares en `src/App.jsx`

**Problemas:**
1. **Crear despacho (línea 4336-4340)**: Actualización optimista de stock, pero si falla la inserción en Supabase, no se revierte.
2. **Editar despacho (línea 4306-4312)**: Si falla actualizar stock, no se revierte el estado local.
3. **Eliminar venta pendiente**: Stock restaurado optimistamente, pero si falla `eliminarVentaPendiente`, el stock queda inconsistente.

**Solución:** Guardar estado anterior y revertir si falla la operación en Supabase.

---

### 4.3: Errores silenciados en otras operaciones

**Ubicación:** Múltiples lugares

**Problemas:**
- `console.warn` en lugar de manejo de errores adecuado
- No se notifica al usuario de errores críticos
- No se revierten cambios optimistas

**Solución:** Implementar manejo de errores consistente con:
- Notificación al usuario
- Rollback de cambios optimistas
- Logging adecuado

---

## 📝 Subfases

### FASE 4.1: Mejorar manejo de errores en despachos

**Tareas:**
1. Revertir cambios locales si falla actualizar stock al editar despacho
2. Revertir cambios optimistas si falla crear despacho
3. Revertir cambios optimistas si falla confirmar despacho

**Archivos a modificar:**
- `src/App.jsx`: Función `submit` en `AlmacenView` (líneas 4306-4326, 4336-4400)

---

### FASE 4.2: Agregar rollback en operaciones optimistas

**Tareas:**
1. Guardar estado anterior antes de actualizaciones optimistas
2. Revertir estado si falla la operación en Supabase
3. Notificar al usuario del error

**Archivos a modificar:**
- `src/App.jsx`: 
  - Crear despacho (línea 4336-4400)
  - Editar despacho (línea 4306-4326)
  - Eliminar venta pendiente (línea 2232-2239)
  - Confirmar entrega (línea 2066-2089)

---

### FASE 4.3: Testing de manejo de errores

**Tareas:**
1. Probar rollback cuando falla actualizar stock
2. Probar rollback cuando falla crear/editar despacho
3. Probar rollback cuando falla eliminar venta pendiente
4. Verificar que el usuario recibe notificaciones de errores

---

## ✅ Checklist

- [ ] FASE 4.1: Mejorar manejo de errores en despachos
- [ ] FASE 4.2: Agregar rollback en operaciones optimistas
- [ ] FASE 4.3: Testing de manejo de errores

---

## 🚀 Empezamos con FASE 4.1


