# 🧪 FASE 5.4: Testing de Validaciones

## 📋 Objetivo

Validar que todas las mejoras implementadas en FASE 5 funcionan correctamente:
1. **FASE 5.1**: `.maybeSingle()` maneja correctamente casos sin resultados
2. **FASE 5.2**: Validación de stock funciona correctamente
3. **FASE 5.3**: Normalización de ciudades funciona correctamente

---

## 🧪 Tests a Implementar

### Test 1: Normalización de Ciudades

**Objetivo:** Verificar que `normalizeCity` y `denormalizeCity` funcionan correctamente.

**Casos a probar:**
- `normalizeCity("EL ALTO")` → `"el_alto"`
- `normalizeCity("La Paz")` → `"la_paz"`
- `normalizeCity("SANTA CRUZ")` → `"santa_cruz"`
- `normalizeCity(null)` → `null`
- `normalizeCity("")` → `null`
- `denormalizeCity("el_alto")` → `"EL ALTO"`
- `denormalizeCity("la_paz")` → `"LA PAZ"`
- `denormalizeCity(null)` → `null`
- Round-trip: `denormalizeCity(normalizeCity("EL ALTO"))` → `"EL ALTO"`

**Tipo:** Unit test (JavaScript)

---

### Test 2: Validación de Stock - Stock Central

**Objetivo:** Verificar que `validateStockForSale` valida correctamente stock del almacén central.

**Casos a probar:**
- ✅ Stock suficiente: producto con stock 10, cantidad 5 → válido
- ❌ Stock insuficiente: producto con stock 3, cantidad 5 → error
- ❌ Stock cero: producto con stock 0, cantidad 1 → error
- ✅ Producto sintético: siempre válido (sin validación de stock)
- ✅ Producto extra con stock suficiente
- ❌ Producto extra con stock insuficiente

**Tipo:** Unit test (JavaScript con mocks de Supabase)

---

### Test 3: Validación de Stock - Stock Ciudad

**Objetivo:** Verificar que `validateStockForSale` valida correctamente stock de la ciudad.

**Casos a probar:**
- ✅ Stock suficiente: ciudad con stock 10, cantidad 5 → válido
- ❌ Stock insuficiente: ciudad con stock 3, cantidad 5 → error
- ❌ Stock cero: ciudad con stock 0, cantidad 1 → error
- ❌ Sin registro de stock: ciudad sin registro → error
- ✅ Producto sintético: siempre válido
- ✅ Producto extra con stock suficiente
- ❌ Producto extra con stock insuficiente

**Tipo:** Unit test (JavaScript con mocks de Supabase)

---

### Test 4: Manejo de `.maybeSingle()` - Casos sin Resultados

**Objetivo:** Verificar que las funciones manejan correctamente casos donde no hay resultados.

**Funciones a probar:**
- `transferToCity`: Producto no encontrado
- `onAddSale`: Producto no encontrado en almacén central
- `addSale`: Registro de city_stock no encontrado
- `loginUser`: Usuario no encontrado en tabla users
- `editarVentaConfirmada`: Venta no encontrada por codigo_unico
- `cancelarVentaConfirmada`: Venta no encontrada

**Tipo:** Integration test (requiere base de datos de prueba)

---

### Test 5: Manejo de Errores de Red

**Objetivo:** Verificar que las funciones manejan correctamente errores de red.

**Casos a probar:**
- Error al consultar `almacen_central`
- Error al consultar `city_stock`
- Error al consultar `ventas`
- Error al consultar `users`

**Tipo:** Unit test (JavaScript con mocks de errores)

---

## 📝 Estrategia de Testing

### Tests Unitarios (JavaScript)

Para funciones puras o funciones con dependencias mockeables:
- `normalizeCity` / `denormalizeCity`
- `validateStockForSale` (con mocks de Supabase)

### Tests de Integración

Para funciones que requieren base de datos real:
- Tests de `.maybeSingle()` con casos sin resultados
- Tests de validación de stock con datos reales

### Tests Manuales

Para casos complejos o que requieren interacción del usuario:
- Flujo completo de registro de venta
- Flujo completo de edición de venta
- Flujo completo de login

---

## 🎯 Prioridad de Tests

1. **ALTA**: Tests de normalización de ciudades (fácil, crítico)
2. **ALTA**: Tests de validación de stock (importante para integridad)
3. **MEDIA**: Tests de `.maybeSingle()` (requiere setup de BD)
4. **BAJA**: Tests de errores de red (ya cubiertos parcialmente)

---

## ✅ Checklist de Implementación

- [ ] Crear archivo de tests para `cityUtils.js`
- [ ] Crear archivo de tests para `stockValidation.js`
- [ ] Crear tests de integración para `.maybeSingle()`
- [ ] Documentar resultados de tests
- [ ] Verificar que todos los tests pasan

---

## 📝 Notas

- Los tests unitarios pueden ejecutarse sin base de datos
- Los tests de integración requieren una base de datos de prueba
- Considerar usar Vitest o Jest para los tests
- Los tests manuales pueden documentarse como casos de uso


