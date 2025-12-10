# 🧪 FASE 1.3: Testing Completo

## Objetivo
Realizar pruebas exhaustivas para garantizar que la corrección funciona correctamente en todos los escenarios.

---

## 📋 TESTS A REALIZAR

### Test 1: Transacción Atómica - Éxito
**Objetivo:** Verificar que cuando todo funciona, la venta se registra y el stock se descuenta **inmediatamente** (sin F5).

**Pasos:**
1. Ve a "Registrar Venta"
2. Selecciona ciudad: "EL ALTO"
3. Selecciona producto: "CARDIO PLUS" (anota stock inicial en la tarjeta del producto)
4. Registra venta de 2 unidades
5. **Verifica INMEDIATAMENTE (sin F5):**
   - ✅ El stock en la tarjeta del producto se actualiza (stock inicial - 2)
   - ✅ El stock en el formulario se actualiza
   - ✅ La venta aparece en lista de ventas pendientes
   - ✅ No aparece notificación de éxito (solo si hay error)
6. **Verifica en Supabase:**
   - ✅ `ventas` tiene 1 registro nuevo
   - ✅ `city_stock` tiene cantidad correcta

**Query de verificación:**
```sql
-- Verificar venta registrada
SELECT id, ciudad, sku, cantidad, estado_entrega
FROM ventas
WHERE estado_entrega = 'pendiente'
ORDER BY created_at DESC
LIMIT 1;

-- Verificar stock descontado
SELECT ciudad, sku, cantidad
FROM city_stock
WHERE ciudad = 'el_alto' AND sku = 'CARDIO';
```

---

### Test 2: Transacción Atómica - Fallo de Stock
**Objetivo:** Verificar que si no hay stock suficiente, nada se registra.

**Pasos:**
1. Ve a "Registrar Venta"
2. Selecciona ciudad: "EL ALTO"
3. Selecciona producto con stock bajo (ej: 1 unidad)
4. Intenta registrar venta de 5 unidades
5. **Verifica:**
   - ✅ Muestra error: "Stock insuficiente"
   - ✅ NO se registró ninguna venta
   - ✅ El stock NO se descontó
   - ✅ En Supabase: No hay nueva venta
   - ✅ En Supabase: Stock sigue igual

**Query de verificación:**
```sql
-- Contar ventas pendientes (no debería aumentar)
SELECT COUNT(*) as total_ventas_pendientes
FROM ventas
WHERE estado_entrega = 'pendiente';

-- Verificar stock (no debería cambiar)
SELECT ciudad, sku, cantidad
FROM city_stock
WHERE ciudad = 'el_alto' AND sku = 'CARDIO';
```

---

### Test 3: Transacción Atómica - Producto Adicional
**Objetivo:** Verificar que funciona con producto adicional y ambos stocks se actualizan **inmediatamente**.

**Pasos:**
1. Ve a "Registrar Venta"
2. Selecciona ciudad: "EL ALTO"
3. Selecciona producto principal: "CARDIO PLUS" (anota stock en tarjeta)
4. Selecciona producto adicional: "VITA LEGS" (anota stock en tarjeta)
5. Registra venta: 2 unidades principal + 1 unidad adicional
6. **Verifica INMEDIATAMENTE (sin F5):**
   - ✅ Stock principal se descontó en la tarjeta (stock inicial - 2)
   - ✅ Stock adicional se descontó en la tarjeta (stock inicial - 1)
   - ✅ Ambos stocks se actualizaron en el formulario
   - ✅ Venta se registró con ambos productos
7. **Verifica en Supabase:**
   - ✅ Todo correcto

**Query de verificación:**
```sql
-- Verificar venta con productos adicionales
SELECT id, sku, cantidad, sku_extra, cantidad_extra
FROM ventas
WHERE estado_entrega = 'pendiente'
ORDER BY created_at DESC
LIMIT 1;

-- Verificar ambos stocks
SELECT ciudad, sku, cantidad
FROM city_stock
WHERE ciudad = 'el_alto' AND sku IN ('CARDIO', 'VITA')
ORDER BY sku;
```

---

### Test 4: Transacción Atómica - Fallo de Producto Adicional
**Objetivo:** Verificar que si el producto adicional no tiene stock, se revierte todo.

**Pasos:**
1. Ve a "Registrar Venta"
2. Selecciona ciudad: "EL ALTO"
3. Selecciona producto principal: "CARDIO PLUS" (stock: 10)
4. Selecciona producto adicional: "VITA LEGS" (stock: 0)
5. Intenta registrar venta: 2 unidades principal + 1 unidad adicional
6. **Verifica:**
   - ✅ Muestra error: "Stock insuficiente para producto extra"
   - ✅ NO se registró ninguna venta
   - ✅ Stock principal NO se descontó (sigue en 10)
   - ✅ Stock adicional NO se descontó (sigue en 0)
   - ✅ En Supabase: No hay nueva venta

**Query de verificación:**
```sql
-- Verificar que no se creó venta
SELECT COUNT(*) as ventas_creadas
FROM ventas
WHERE created_at > NOW() - INTERVAL '5 minutes'
AND estado_entrega = 'pendiente';

-- Verificar que stocks no cambiaron
SELECT ciudad, sku, cantidad
FROM city_stock
WHERE ciudad = 'el_alto' AND sku IN ('CARDIO', 'VITA')
ORDER BY sku;
```

---

### Test 5: Múltiples Ventas Simultáneas
**Objetivo:** Verificar que funciona correctamente con múltiples usuarios.

**Pasos:**
1. Abre la aplicación en **2 navegadores diferentes**
2. Ambos usuarios van a "Registrar Venta"
3. Ambos seleccionan: ciudad "EL ALTO", producto "CARDIO PLUS"
4. Usuario A registra venta de 2 unidades
5. Usuario B registra venta de 3 unidades (inmediatamente después)
6. **Verifica:**
   - ✅ Ambas ventas se registraron
   - ✅ Stock se descontó correctamente (total: 5 unidades)
   - ✅ No hay doble descuento
   - ✅ En Supabase: 2 ventas registradas, stock correcto

**Query de verificación:**
```sql
-- Verificar ventas registradas
SELECT id, cantidad, created_at
FROM ventas
WHERE ciudad = 'el_alto' 
AND sku = 'CARDIO'
AND estado_entrega = 'pendiente'
AND created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at;

-- Verificar stock final
SELECT ciudad, sku, cantidad
FROM city_stock
WHERE ciudad = 'el_alto' AND sku = 'CARDIO';
```

---

### Test 6: Verificar Consistencia General
**Objetivo:** Verificar que no hay inconsistencias en toda la base de datos.

**Pasos:**
1. Ejecuta el script de verificación completo en Supabase SQL Editor:
   - Archivo: `scripts/test-fase-1-3-verificacion.sql`

**Resultado esperado:** 
- ✅ Todos los tests deben mostrar "✅ PASÓ"
- ✅ El resumen final debe mostrar "✅ TODOS LOS TESTS PASARON"
- ✅ 0 inconsistencias en todas las consultas

---

## ✅ CRITERIOS DE ÉXITO FINAL

- [ ] Todos los tests pasan
- [ ] **El stock se actualiza inmediatamente sin F5** (actualización optimista)
- [ ] No hay inconsistencias en Supabase (ejecutar `test-fase-1-3-verificacion.sql`)
- [ ] No hay errores en la consola del navegador (F12)
- [ ] La aplicación funciona normalmente
- [ ] El stock se maneja correctamente en todos los casos
- [ ] No aparecen notificaciones de éxito innecesarias (solo errores)

---

## 📊 REPORTE DE TESTING

Completa este reporte después de los tests:

```
FASE 1.3 - REPORTE DE TESTING
=============================

Test 1: Transacción Atómica - Éxito
[ ] PASÓ  [ ] FALLÓ
Notas: ________________________________

Test 2: Transacción Atómica - Fallo de Stock
[ ] PASÓ  [ ] FALLÓ
Notas: ________________________________

Test 3: Transacción Atómica - Producto Adicional
[ ] PASÓ  [ ] FALLÓ
Notas: ________________________________

Test 4: Transacción Atómica - Fallo de Producto Adicional
[ ] PASÓ  [ ] FALLÓ
Notas: ________________________________

Test 5: Múltiples Ventas Simultáneas
[ ] PASÓ  [ ] FALLÓ
Notas: ________________________________

Test 6: Verificar Consistencia General
[ ] PASÓ  [ ] FALLÓ
Notas: ________________________________

RESULTADO FINAL: [ ] TODOS PASARON  [ ] HAY FALLOS
```

---

## 🎯 SIGUIENTE FASE

Si todos los tests pasan, continúa con:
**FASE 2: Race Conditions en Stock**

---

**¿Todos los tests pasaron? Comparte el reporte antes de continuar.**

