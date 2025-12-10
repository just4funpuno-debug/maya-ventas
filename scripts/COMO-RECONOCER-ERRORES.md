# 🔍 CÓMO RECONOCER Y VERIFICAR ERRORES EN LA APLICACIÓN

**Guía práctica para identificar cada error mencionado en la revisión**

---

## 📋 ÍNDICE

1. [Errores Críticos](#errores-críticos)
2. [Problemas de Consistencia](#problemas-de-consistencia)
3. [Race Conditions](#race-conditions)
4. [Manejo de Errores](#manejo-de-errores)
5. [Cómo Verificar Cada Problema](#verificación)

---

## 🚨 ERRORES CRÍTICOS

### 1. **FALTA DE TRANSACCIONES ATÓMICAS** ⚠️ CRÍTICO

#### **¿Dónde se manifiesta?**
- **Menú:** "Registrar Venta" o "Dashboard" → Registrar nueva venta
- **Síntoma:** Stock descontado pero venta no registrada

#### **Cómo reconocerlo:**
1. **En la interfaz:**
   - Ve al menú "Ventas" → Selecciona una ciudad
   - Observa el stock de un producto (ej: "CARDIO PLUS" tiene 10 unidades)
   - Ve a "Registrar Venta" → Registra una venta de 2 unidades
   - Si hay un error de red o conexión lenta durante el registro:
     - El stock se descontará (verás 8 unidades en lugar de 10)
     - Pero la venta NO aparecerá en la lista de ventas pendientes
     - **Resultado:** Stock perdido sin venta registrada

2. **En la consola del navegador (F12):**
   ```
   [registrarVentaPendiente] venta: {...}
   [discountCityStock] el_alto - CARDIO: 10 -> 8 (descontado 2)
   Error: Failed to insert venta
   ```
   - Verás que el stock se descontó pero la venta falló

3. **Cómo verificar manualmente:**
   - Abre la consola del navegador (F12)
   - Ve a "Network" (Red)
   - Filtra por "supabase"
   - Registra una venta
   - Si ves:
     - ✅ `POST /rest/v1/city_stock` (200 OK) - Stock descontado
     - ❌ `POST /rest/v1/ventas` (Error) - Venta falló
   - **Entonces:** El error está presente

#### **Dónde verificar en Supabase:**
```sql
-- Verificar stock descontado sin venta
SELECT cs.ciudad, cs.sku, cs.cantidad, COUNT(v.id) as ventas_pendientes
FROM city_stock cs
LEFT JOIN ventas v ON v.ciudad = cs.ciudad AND v.sku = cs.sku 
  AND v.estado_entrega = 'pendiente'
WHERE cs.cantidad < (
  SELECT SUM(cantidad) 
  FROM ventas 
  WHERE ciudad = cs.ciudad AND sku = cs.sku AND estado_entrega = 'pendiente'
);
```

---

### 2. **RACE CONDITION EN OPERACIONES DE STOCK** ⚠️ CRÍTICO

#### **¿Dónde se manifiesta?**
- **Menú:** "Ventas" → Múltiples usuarios registrando ventas simultáneamente
- **Síntoma:** Stock descontado dos veces para una sola venta

#### **Cómo reconocerlo:**
1. **En la interfaz:**
   - Abre la aplicación en **2 navegadores diferentes** (o 2 pestañas con usuarios distintos)
   - Ambos usuarios van a "Registrar Venta" → Misma ciudad, mismo producto
   - Producto tiene 10 unidades de stock
   - **Usuario A** registra venta de 3 unidades (debería quedar 7)
   - **Usuario B** registra venta de 2 unidades (debería quedar 5)
   - **Resultado esperado:** Stock final = 5
   - **Resultado con error:** Stock final = 4 o menos (doble descuento)

2. **En la consola del navegador:**
   - Abre consola en ambos navegadores
   - Observa los logs:
   ```
   [Usuario A] [discountCityStock] leyendo stock: 10
   [Usuario B] [discountCityStock] leyendo stock: 10  ← Ambos leen 10
   [Usuario A] [discountCityStock] actualizando a: 7
   [Usuario B] [discountCityStock] actualizando a: 8  ← Ambos calculan mal
   ```
   - **Resultado:** Stock final incorrecto

3. **Cómo verificar manualmente:**
   - Ve a "Ventas" → Selecciona una ciudad
   - Anota el stock actual de un producto
   - Registra una venta de 1 unidad
   - **Inmediatamente** (sin esperar) registra otra venta de 1 unidad
   - Verifica el stock final:
     - Si tenía 10 y vendiste 2, debería quedar 8
     - Si quedó 9 o menos, hay race condition

#### **Dónde verificar en Supabase:**
```sql
-- Verificar inconsistencias de stock
SELECT 
  cs.ciudad,
  cs.sku,
  cs.cantidad as stock_actual,
  (SELECT SUM(cantidad) FROM ventas 
   WHERE ciudad = cs.ciudad 
   AND sku = cs.sku 
   AND estado_entrega = 'pendiente') as ventas_pendientes,
  (cs.cantidad + (SELECT SUM(cantidad) FROM ventas 
                  WHERE ciudad = cs.ciudad 
                  AND sku = cs.sku 
                  AND estado_entrega = 'pendiente')) as stock_esperado
FROM city_stock cs
WHERE cs.cantidad < 0  -- Stock negativo = error
   OR (SELECT SUM(cantidad) FROM ventas 
       WHERE ciudad = cs.ciudad 
       AND sku = cs.sku 
       AND estado_entrega = 'pendiente') > cs.cantidad + 100; -- Gran diferencia
```

---

### 3. **ERROR EN ACTUALIZACIÓN OPTIMISTA DE STOCK** ⚠️ MEDIO

#### **¿Dónde se manifiesta?**
- **Menú:** "Ventas" → Al registrar una venta con producto adicional
- **Síntoma:** Stock del producto principal se actualiza, pero el adicional no

#### **Cómo reconocerlo:**
1. **En la interfaz:**
   - Ve a "Ventas" → Selecciona una ciudad
   - Observa el stock de dos productos (ej: "CARDIO PLUS" y "VITA LEGS")
   - Registra una venta con:
     - Producto principal: "CARDIO PLUS" (2 unidades)
     - Producto adicional: "VITA LEGS" (1 unidad)
   - **Resultado esperado:** Ambos stocks se actualizan inmediatamente
   - **Resultado con error:** Solo "CARDIO PLUS" se actualiza, "VITA LEGS" no cambia hasta F5

2. **En la consola del navegador:**
   - Abre consola (F12)
   - Registra venta con producto adicional
   - Busca logs:
   ```
   [CityStock] Actualizando stock optimista para CARDIO PLUS: 10 -> 8 ✅
   [CityStock] Actualizando stock optimista para VITA LEGS: ... ❌ (no aparece)
   ```

#### **Cómo verificar:**
- Ya está corregido en el código actual
- Si aún ocurre, verifica que el stock adicional se actualice sin refrescar (F5)

---

### 4. **FALTA DE ROLLBACK EN EDICIÓN DE VENTAS** ⚠️ CRÍTICO

#### **¿Dónde se manifiesta?**
- **Menú:** "Ventas" → Editar una venta pendiente
- **Síntoma:** Stock inconsistente después de editar

#### **Cómo reconocerlo:**
1. **En la interfaz:**
   - Ve a "Ventas" → Selecciona una ciudad
   - Registra una venta de "CARDIO PLUS" (3 unidades)
   - Stock inicial: 10 → Stock después: 7 ✅
   - Edita la venta y cambia la cantidad a 5 unidades
   - Si hay un error durante la edición:
     - El stock se restauró (10) y se descontó (5) = 5 ✅
     - Pero la venta NO se actualizó (sigue con 3 unidades) ❌
     - **Resultado:** Stock = 5, pero venta dice 3 (inconsistencia)

2. **En la consola del navegador:**
   ```
   [editarVentaPendiente] Restaurando stock anterior: 3 unidades
   [restoreCityStock] el_alto - CARDIO: 7 -> 10 ✅
   [discountCityStock] el_alto - CARDIO: 10 -> 5 ✅
   Error: Failed to update venta ❌
   ```
   - Stock ajustado pero venta no actualizada

3. **Cómo verificar manualmente:**
   - Edita una venta pendiente
   - Cambia la cantidad
   - Simula un error (desconecta internet antes de guardar)
   - Verifica en Supabase:
     ```sql
     -- Verificar inconsistencias
     SELECT 
       v.id,
       v.cantidad as cantidad_venta,
       cs.cantidad as stock_actual,
       (SELECT SUM(cantidad) FROM ventas 
        WHERE ciudad = v.ciudad 
        AND sku = v.sku 
        AND estado_entrega = 'pendiente'
        AND id != v.id) as otras_ventas,
       (10 - cs.cantidad - (SELECT SUM(cantidad) FROM ventas 
                            WHERE ciudad = v.ciudad 
                            AND sku = v.sku 
                            AND estado_entrega = 'pendiente'
                            AND id != v.id)) as diferencia
     FROM ventas v
     JOIN city_stock cs ON cs.ciudad = v.ciudad AND cs.sku = v.sku
     WHERE v.estado_entrega = 'pendiente'
     AND ABS((10 - cs.cantidad - (SELECT SUM(cantidad) FROM ventas 
                                  WHERE ciudad = v.ciudad 
                                  AND sku = v.sku 
                                  AND estado_entrega = 'pendiente'
                                  AND id != v.id)) - v.cantidad) > 0.1;
     ```

---

## ⚠️ PROBLEMAS DE CONSISTENCIA

### 5. **Manejo de `.single()` sin validación**

#### **¿Dónde se manifiesta?**
- **Menú:** Cualquier operación que lee stock de ciudad
- **Síntoma:** Error "More than one row returned" o "No rows returned"

#### **Cómo reconocerlo:**
1. **En la interfaz:**
   - Error en consola del navegador:
   ```
   Error: More than one row returned by a query that expected only one row
   ```
   - O:
   ```
   Error: No rows returned by a query that expected one row
   ```

2. **Dónde ocurre:**
   - Al registrar una venta
   - Al editar una venta
   - Al confirmar un despacho

3. **Cómo verificar en Supabase:**
   ```sql
   -- Verificar registros duplicados en city_stock
   SELECT ciudad, sku, COUNT(*) as duplicados
   FROM city_stock
   GROUP BY ciudad, sku
   HAVING COUNT(*) > 1;
   
   -- Verificar registros faltantes
   SELECT DISTINCT v.ciudad, v.sku
   FROM ventas v
   WHERE v.estado_entrega = 'pendiente'
   AND NOT EXISTS (
     SELECT 1 FROM city_stock cs 
     WHERE cs.ciudad = v.ciudad AND cs.sku = v.sku
   );
   ```

---

### 6. **Validación de stock inconsistente**

#### **¿Dónde se manifiesta?**
- **Menú:** "Registrar Venta"
- **Síntoma:** Permite registrar venta aunque no hay stock suficiente

#### **Cómo reconocerlo:**
1. **En la interfaz:**
   - Ve a "Registrar Venta"
   - Selecciona un producto con stock bajo (ej: 2 unidades)
   - Intenta registrar venta de 3 unidades
   - **Resultado esperado:** Error "Stock insuficiente"
   - **Resultado con error:** Permite registrar (si otro usuario vendió entre validación y registro)

2. **Cómo verificar:**
   - Abre 2 navegadores
   - Ambos ven stock = 2
   - Usuario A valida stock (2) → OK
   - Usuario B vende 2 unidades → Stock = 0
   - Usuario A registra venta de 2 → Debería fallar pero puede pasar

---

## 🔄 RACE CONDITIONS

### 7. **Operaciones de stock no atómicas**

#### **¿Dónde se manifiesta?**
- **Menú:** "Despacho de Productos" → Confirmar despacho
- **Síntoma:** Stock central descontado múltiples veces

#### **Cómo reconocerlo:**
1. **En la interfaz:**
   - Ve a "Despacho de Productos"
   - Crea un despacho de 5 unidades de "CARDIO PLUS"
   - Stock central inicial: 100
   - Confirma el despacho
   - **Resultado esperado:** Stock central = 95
   - **Resultado con error:** Si hay múltiples confirmaciones simultáneas, stock puede quedar en 90 o menos

2. **Cómo verificar en Supabase:**
   ```sql
   -- Verificar stock central vs despachos confirmados
   SELECT 
     ac.sku,
     ac.stock as stock_actual,
     (SELECT SUM((items->>'cantidad')::integer) 
      FROM dispatches 
      WHERE status = 'confirmado'
      AND items @> jsonb_build_array(jsonb_build_object('sku', ac.sku))) as total_despachado,
     (100 - ac.stock) as stock_descontado,
     ABS((100 - ac.stock) - (SELECT SUM((items->>'cantidad')::integer) 
                             FROM dispatches 
                             WHERE status = 'confirmado'
                             AND items @> jsonb_build_array(jsonb_build_object('sku', ac.sku)))) as diferencia
   FROM almacen_central ac
   WHERE ABS((100 - ac.stock) - (SELECT SUM((items->>'cantidad')::integer) 
                                FROM dispatches 
                                WHERE status = 'confirmado'
                                AND items @> jsonb_build_array(jsonb_build_object('sku', ac.sku)))) > 1;
   ```

---

## 🛡️ MANEJO DE ERRORES

### 9. **Errores silenciados en operaciones críticas**

#### **¿Dónde se manifiesta?**
- **Menú:** "Despacho de Productos" → Editar despacho
- **Síntoma:** Stock local actualizado pero Supabase no

#### **Cómo reconocerlo:**
1. **En la interfaz:**
   - Ve a "Despacho de Productos"
   - Edita un despacho pendiente
   - Cambia las cantidades
   - Si hay un error de red:
     - El stock local se actualiza (optimistic update)
     - Pero Supabase no se actualiza
     - **Resultado:** Stock local incorrecto, Supabase correcto

2. **En la consola del navegador:**
   ```
   [editar despacho] fallo ajustar stock CARDIO, diff: 2, error: Network error
   ```
   - Solo `console.warn`, no revierte cambios locales

3. **Cómo verificar:**
   - Edita un despacho
   - Abre consola (F12)
   - Busca warnings que no revierten cambios
   - Refresca la página (F5)
   - Si el stock cambia, hay inconsistencia

---

## 📊 RESUMEN: DÓNDE VERIFICAR CADA ERROR

| Error | Menú | Cómo Verificarlo |
|-------|------|------------------|
| 1. Transacciones atómicas | Registrar Venta | Registrar venta con conexión lenta, verificar stock |
| 2. Race condition stock | Registrar Venta (2 usuarios) | Dos usuarios vendiendo simultáneamente |
| 3. Optimistic update | Ventas | Registrar venta con producto adicional, ver actualización |
| 4. Rollback edición | Ventas → Editar | Editar venta, simular error |
| 5. `.single()` error | Cualquier menú | Ver errores en consola del navegador |
| 6. Validación stock | Registrar Venta | Validar con stock bajo, otro usuario vende |
| 7. Stock no atómico | Despacho Productos | Confirmar despacho simultáneamente |
| 9. Errores silenciados | Despacho Productos | Editar despacho, verificar consola |

---

## 🔧 HERRAMIENTAS PARA VERIFICAR

### 1. **Consola del Navegador (F12)**
- **Network:** Ver requests a Supabase
- **Console:** Ver logs y errores
- **Application → Local Storage:** Ver estado local

### 2. **Supabase Dashboard**
- **Table Editor:** Ver datos directamente
- **SQL Editor:** Ejecutar queries de verificación
- **Logs:** Ver errores del servidor

### 3. **Queries SQL de Verificación**
- Ver archivo: `scripts/verificar-inconsistencias.sql` (crear si no existe)

---

## ✅ CHECKLIST DE VERIFICACIÓN

Usa este checklist para verificar cada error:

- [ ] **Error 1:** Registrar venta con conexión lenta → Verificar stock
- [ ] **Error 2:** Dos usuarios vendiendo simultáneamente → Verificar stock final
- [ ] **Error 3:** Registrar venta con adicional → Verificar ambos stocks
- [ ] **Error 4:** Editar venta y simular error → Verificar consistencia
- [ ] **Error 5:** Buscar errores `.single()` en consola
- [ ] **Error 6:** Validar stock con otro usuario vendiendo
- [ ] **Error 7:** Confirmar despacho simultáneamente
- [ ] **Error 9:** Editar despacho y verificar consola

---

**¿Quieres que cree scripts SQL específicos para verificar cada error automáticamente?**


