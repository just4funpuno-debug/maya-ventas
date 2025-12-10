# 🔧 FASE 3: Rollback en Edición de Ventas

## Objetivo
Implementar rollback automático en `editarVentaPendiente` para garantizar que si falla la actualización de la venta, el stock se revierte correctamente.

---

## 🎯 Problema Actual

**Ubicación:** `src/supabaseUtils.js:363-412` - `editarVentaPendiente`

**Problema:**
```javascript
// 1. Restaura stock anterior
await restoreCityStock(...);
// 2. Descuenta stock nuevo
await discountCityStock(...);
// 3. Actualiza la venta
await supabase.from('ventas').update(...);
// Si esto falla, el stock queda inconsistente
```

**Impacto:** Si falla la actualización de la venta después de ajustar el stock, el stock queda inconsistente (stock anterior restaurado pero stock nuevo no descontado, o viceversa).

---

## ✅ Solución Propuesta

### Opción A: Función SQL Transaccional (Recomendada)
Crear una función SQL que haga todo en una transacción atómica:
- Restaurar stock anterior
- Descontar stock nuevo
- Actualizar venta
- Todo o nada

### Opción B: Rollback Manual
Implementar rollback manual en JavaScript:
- Guardar estado anterior
- Intentar operaciones
- Si falla, revertir todo

---

## 📋 Subfases

### FASE 3.1: Crear función SQL transaccional para edición
- Crear `editar_venta_pendiente_atomica` en PostgreSQL
- Manejar cambios de ciudad, SKU, cantidad
- Manejar producto adicional
- Garantizar atomicidad

### FASE 3.2: Actualizar código JavaScript
- Reemplazar `editarVentaPendiente` para usar la función SQL
- Mantener compatibilidad con código existente
- Agregar actualización optimista si es necesario

### FASE 3.3: Testing de rollback
- Test: Editar venta exitosamente
- Test: Simular fallo en actualización (verificar rollback)
- Test: Cambiar ciudad, SKU, cantidad
- Test: Cambiar producto adicional

---

## 🎯 Siguiente Paso

**¿Continuamos con FASE 3.1: Crear función SQL transaccional para edición?**


