# ✅ TEST FASE 1.2: Verificar Código JavaScript Actualizado

## Objetivo
Verificar que el código JavaScript usa correctamente la función SQL transaccional.

---

## 📋 CHECKLIST DE VERIFICACIÓN

### 1. Verificar que el código fue actualizado

- [ ] Abre `src/supabaseUtils.js`
- [ ] Localiza la función `registrarVentaPendiente` (línea ~232)
- [ ] Verifica que:
  - ✅ Ya NO llama a `discountCityStock` manualmente
  - ✅ Usa `supabase.rpc('registrar_venta_pendiente_atomica', params)`
  - ✅ Los parámetros están correctamente mapeados

### 2. Verificar compilación

- [ ] Abre la consola del terminal
- [ ] Ejecuta: `npm run dev` (o el comando que uses)
- [ ] Verifica que NO hay errores de compilación
- [ ] Si hay errores, corrígelos antes de continuar

### 3. Test Manual en la Aplicación

#### Test 3.1: Registrar venta normal
1. Abre la aplicación en el navegador
2. Ve a **"Registrar Venta"**
3. Selecciona una ciudad
4. Selecciona un producto con stock disponible
5. Registra una venta de 1 unidad
6. **Verifica:**
   - ✅ La venta aparece en la lista de ventas pendientes
   - ✅ El stock se descontó correctamente
   - ✅ No hay errores en la consola del navegador (F12)

#### Test 3.2: Registrar venta con producto adicional
1. Ve a **"Registrar Venta"**
2. Selecciona una ciudad
3. Selecciona un producto principal
4. Selecciona un producto adicional
5. Registra la venta
6. **Verifica:**
   - ✅ La venta se registró correctamente
   - ✅ El stock del producto principal se descontó
   - ✅ El stock del producto adicional se descontó
   - ✅ Ambos stocks se actualizaron sin refrescar (F5)

#### Test 3.3: Intentar registrar venta sin stock
1. Ve a **"Registrar Venta"**
2. Selecciona una ciudad
3. Selecciona un producto con stock 0 (o muy bajo)
4. Intenta registrar una venta de más unidades de las disponibles
5. **Verifica:**
   - ✅ Muestra error: "Stock insuficiente"
   - ✅ El stock NO se descontó
   - ✅ La venta NO se registró
   - ✅ El mensaje de error es claro

#### Test 3.4: Simular error de red (opcional)
1. Abre **DevTools** (F12) → **Network**
2. Configura throttling a "Slow 3G" o "Offline"
3. Intenta registrar una venta
4. **Verifica:**
   - ✅ Si falla, muestra un error claro
   - ✅ El stock NO se descontó (verifica en Supabase si es necesario)
   - ✅ La venta NO se registró

### 4. Verificar en Supabase

Ejecuta este query en Supabase SQL Editor:

```sql
-- Verificar que no hay inconsistencias
SELECT 
  cs.ciudad,
  cs.sku,
  cs.cantidad as stock_actual,
  COUNT(v.id) as ventas_pendientes,
  COALESCE(SUM(v.cantidad), 0) as total_vendido
FROM city_stock cs
LEFT JOIN ventas v ON v.ciudad = cs.ciudad 
  AND v.sku = cs.sku 
  AND v.estado_entrega = 'pendiente'
  AND v.deleted_from_pending_at IS NULL
GROUP BY cs.ciudad, cs.sku, cs.cantidad
HAVING cs.cantidad < 0  -- Stock negativo = error
   OR (cs.cantidad + COALESCE(SUM(v.cantidad), 0)) < 0; -- Más vendido que disponible
```

**Resultado esperado:** 0 filas (no hay inconsistencias)

---

## ✅ CRITERIOS DE ÉXITO

- [ ] El código compila sin errores
- [ ] Se puede registrar una venta normal
- [ ] Se puede registrar una venta con producto adicional
- [ ] Rechaza correctamente ventas sin stock
- [ ] No hay inconsistencias en Supabase
- [ ] No hay errores en la consola del navegador

---

## 🎯 SIGUIENTE PASO

Si todos los tests pasan, continúa con:
**FASE 1.3: Testing Completo**

---

**¿Todos los tests pasaron? Comparte los resultados antes de continuar.**


