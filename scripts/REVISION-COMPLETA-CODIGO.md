# 🔍 REVISIÓN COMPLETA DEL CÓDIGO - MAYA VENTAS

**Fecha:** 2025-01-30  
**Revisión:** Análisis exhaustivo de flujos, código, errores y mejoras

---

## 📋 ÍNDICE

1. [Errores Críticos Encontrados](#errores-críticos)
2. [Problemas de Consistencia de Datos](#problemas-de-consistencia)
3. [Race Conditions y Concurrencia](#race-conditions)
4. [Manejo de Errores](#manejo-de-errores)
5. [Código Duplicado](#código-duplicado)
6. [Optimizaciones de Performance](#optimizaciones)
7. [Mejoras de UX](#mejoras-ux)
8. [Sugerencias de Funcionalidades](#sugerencias)

---

## 🚨 ERRORES CRÍTICOS ENCONTRADOS

### 1. **FALTA DE TRANSACCIONES ATÓMICAS** ⚠️ CRÍTICO

**Ubicación:** `src/supabaseUtils.js:232-294` - `registrarVentaPendiente`

**Problema:**
```javascript
// Línea 237-240: Se descuenta stock PRIMERO
await discountCityStock(venta.ciudad, venta.sku, Number(venta.cantidad));
if (venta.skuExtra && venta.cantidadExtra) {
  await discountCityStock(venta.ciudad, venta.skuExtra, Number(venta.cantidadExtra));
}

// Línea 278-285: Luego se inserta la venta
const { data, error } = await supabase.from('ventas').insert(ventaData)...
if (error) throw error; // Si falla aquí, el stock ya fue descontado
```

**Impacto:** Si el insert de la venta falla, el stock queda descontado sin venta registrada. Esto causa **pérdida de stock**.

**Solución Recomendada:**
- Usar una función SQL en Supabase que haga ambas operaciones en una transacción
- O implementar rollback manual restaurando el stock si falla el insert

**Código Sugerido:**
```sql
CREATE OR REPLACE FUNCTION registrar_venta_pendiente_atomica(
  p_venta_data jsonb
) RETURNS uuid AS $$
DECLARE
  v_venta_id uuid;
  v_ciudad text;
  v_sku text;
  v_cantidad integer;
BEGIN
  -- Extraer datos
  v_ciudad := normalize_city(p_venta_data->>'ciudad');
  v_sku := p_venta_data->>'sku';
  v_cantidad := (p_venta_data->>'cantidad')::integer;
  
  -- Insertar venta
  INSERT INTO ventas (...)
  VALUES (...)
  RETURNING id INTO v_venta_id;
  
  -- Descontar stock (atómico)
  UPDATE city_stock 
  SET cantidad = cantidad - v_cantidad
  WHERE ciudad = v_ciudad AND sku = v_sku AND cantidad >= v_cantidad;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stock insuficiente';
  END IF;
  
  RETURN v_venta_id;
END;
$$ LANGUAGE plpgsql;
```

---

### 2. **RACE CONDITION EN OPERACIONES DE STOCK** ⚠️ CRÍTICO

**Ubicación:** `src/supabaseUtils.js:31-76` - `discountCityStock`

**Problema:**
```javascript
// Línea 41-46: Lee stock actual
const { data: existing } = await supabase
  .from('city_stock')
  .select('id, cantidad')
  .eq('ciudad', ciudadNormalizada)
  .eq('sku', sku)
  .single(); // ⚠️ Puede fallar si hay 0 o múltiples registros

// Línea 48: Calcula nueva cantidad
let nuevaCantidad = Math.max(0, (existing?.cantidad || 0) - cantidad);

// Línea 52-55: Actualiza (sin verificar que el stock no cambió)
const { error } = await supabase
  .from('city_stock')
  .update({ cantidad: nuevaCantidad })
  .eq('id', existing.id);
```

**Impacto:** Si dos usuarios descuentan stock simultáneamente, ambos leen el mismo valor inicial y ambos descuentan, causando **doble descuento**.

**Solución Recomendada:**
- Usar `UPDATE ... SET cantidad = cantidad - $1 WHERE cantidad >= $1` (operación atómica)
- O usar `SELECT ... FOR UPDATE` en una transacción

---

### 3. **ERROR EN ACTUALIZACIÓN OPTIMISTA DE STOCK** ⚠️ MEDIO

**Ubicación:** `src/App.jsx:4861-4863` - `CityStock` component

**Problema:**
```javascript
if (sale.skuExtra && sale.cantidadExtra) {
  const currentStock = optimisticStock[sale.skuExtra] || 0;
  optimisticStock[sale.sale.skuExtra] = Math.max(0, currentStock - Number(sale.cantidadExtra || 0));
  // ⚠️ sale.sale.skuExtra debería ser sale.skuExtra
}
```

**Impacto:** El stock extra no se descuenta correctamente en la actualización optimista.

**Solución:** Ya corregido en el código actual.

---

### 4. **FALTA DE ROLLBACK EN EDICIÓN DE VENTAS** ⚠️ CRÍTICO

**Ubicación:** `src/supabaseUtils.js:363-412` - `editarVentaPendiente`

**Problema:**
```javascript
// Línea 365-370: Restaura stock anterior y descuenta stock nuevo
await restoreCityStock(...); // Si esto falla, ¿qué pasa?
await discountCityStock(...); // Si esto falla, el stock anterior ya fue restaurado
// Línea 399-406: Actualiza la venta
// Si esto falla, el stock queda inconsistente
```

**Impacto:** Si falla la actualización de la venta después de ajustar el stock, el stock queda inconsistente.

**Solución Recomendada:**
- Implementar rollback manual si falla la actualización
- O usar una función SQL transaccional

---

## ⚠️ PROBLEMAS DE CONSISTENCIA DE DATOS

### 5. **Manejo de `.single()` sin validación**

**Ubicación:** Múltiples lugares en `supabaseUtils.js`

**Problema:** `.single()` lanza error si hay 0 o múltiples registros, pero no siempre se maneja correctamente.

**Ejemplo:**
```javascript
const { data: existing } = await supabase
  .from('city_stock')
  .select('id, cantidad')
  .eq('ciudad', ciudadNormalizada)
  .eq('sku', sku)
  .single(); // ⚠️ Si no existe, lanza error
```

**Solución:** Usar `.maybeSingle()` o manejar el error explícitamente.

---

### 6. **Validación de stock inconsistente**

**Ubicación:** `src/App.jsx:6263-6313` - `addSale` en `RegisterSaleView`

**Problema:** Se valida stock leyendo de Supabase, pero entre la validación y el registro puede cambiar.

**Solución Recomendada:**
- Usar validación con `WHERE cantidad >= $cantidad` en el UPDATE
- O usar locks de fila en PostgreSQL

---

## 🔄 RACE CONDITIONS Y CONCURRENCIA

### 7. **Operaciones de stock no atómicas**

**Problema:** Todas las operaciones de stock (descontar, restaurar) son read-modify-write, no atómicas.

**Solución Recomendada:**
```sql
-- En lugar de:
SELECT cantidad FROM city_stock WHERE ...;
UPDATE city_stock SET cantidad = nueva_cantidad WHERE ...;

-- Usar:
UPDATE city_stock 
SET cantidad = cantidad - $1 
WHERE ciudad = $2 AND sku = $3 AND cantidad >= $1;
```

---

### 8. **Falta de locks en edición de ventas**

**Ubicación:** `src/supabaseUtils.js:467-567` - `editarVentaConfirmada`

**Problema:** Hay un `_editInFlight` Set, pero solo previene ediciones duplicadas del mismo cliente, no de múltiples usuarios.

**Solución Recomendada:**
- Usar `updated_at` como optimistic lock
- O usar `SELECT ... FOR UPDATE` en PostgreSQL

---

## 🛡️ MANEJO DE ERRORES

### 9. **Errores silenciados en operaciones críticas**

**Ubicación:** `src/App.jsx:4306-4312` - Edición de despachos

**Problema:**
```javascript
if (error) console.warn('[editar despacho] fallo ajustar stock', sku, diff, error);
// ⚠️ Solo hace console.warn, no revierte cambios locales
```

**Impacto:** Si falla actualizar stock en Supabase, el estado local queda inconsistente.

**Solución:** Revertir cambios locales si falla la operación en Supabase.

---

### 10. **Falta de manejo de errores en operaciones asíncronas**

**Ubicación:** Múltiples lugares

**Problema:** Muchas operaciones asíncronas no tienen `.catch()` o manejo de errores adecuado.

**Ejemplo:**
```javascript
// src/App.jsx:2232-2239
eliminarVentaPendiente(sale.id, sale).then(()=>{
  // Si esto falla, el stock no se restaura
}).catch(err => {
  alert('Error al cancelar el pedido en Firestore: ' + (err?.message || err));
  // ⚠️ Pero el stock ya fue restaurado optimistamente
});
```

---

## 📝 CÓDIGO DUPLICADO

### 11. **Normalización de ciudades duplicada**

**Ubicación:** 
- `src/supabaseUtils.js:14-17` - `normalizeCity`
- `src/supabaseUsers.js:262-268` - `denormalizeCity`
- Múltiples lugares con lógica similar

**Solución:** Centralizar en un solo lugar.

---

### 12. **Validación de stock duplicada**

**Ubicación:**
- `src/App.jsx:2295-2350` - `onAddSale` (Dashboard)
- `src/App.jsx:6255-6313` - `addSale` (RegisterSaleView)

**Solución:** Extraer a función común.

---

## ⚡ OPTIMIZACIONES DE PERFORMANCE

### 13. **Múltiples queries en lugar de batch**

**Ubicación:** `src/App.jsx:4306-4312` - Edición de despachos

**Problema:**
```javascript
// Actualiza stock uno por uno
for (const sku of new Set([...Object.keys(oldMap), ...Object.keys(newMap)])) {
  const { error } = await supabase
    .from('almacen_central')
    .update({ stock: ... })
    .eq('id', meta.id);
}
```

**Solución:** Usar `rpc()` con función SQL que actualice múltiples productos en una transacción.

---

### 14. **Re-renders innecesarios**

**Ubicación:** `src/App.jsx` - Múltiples `useEffect` sin dependencias optimizadas

**Problema:** Algunos `useEffect` se ejecutan en cada render.

**Solución:** Revisar dependencias y usar `useMemo` donde corresponda.

---

### 15. **Queries N+1 en "Generar Depósito"**

**Ubicación:** `src/App.jsx:747-823` - FASE 2 de procesamiento de depósitos

**Problema:** Se consultan ventas en chunks, pero podría optimizarse con una sola query.

**Solución:** Usar `IN` con todos los IDs de una vez (Supabase soporta hasta 1000).

---

## 🎨 MEJORAS DE UX

### 16. **Falta de feedback visual en operaciones largas**

**Problema:** Algunas operaciones (migraciones, generación de depósitos) no muestran progreso claro.

**Solución:** Agregar indicadores de progreso más visibles.

---

### 17. **Mensajes de error poco claros**

**Problema:** Algunos errores muestran mensajes técnicos en lugar de mensajes amigables.

**Ejemplo:**
```javascript
alert('Error al cancelar el pedido en Firestore: ' + (err?.message || err));
// ⚠️ "Firestore" no es relevante para el usuario
```

**Solución:** Traducir errores a mensajes amigables.

---

### 18. **Validaciones de formularios inconsistentes**

**Problema:** Algunos formularios validan en submit, otros en onChange.

**Solución:** Estandarizar validación en tiempo real donde sea posible.

---

## 💡 SUGERENCIAS DE FUNCIONALIDADES

### 19. **Auditoría de cambios**

**Sugerencia:** Implementar tabla de auditoría para rastrear:
- Cambios en stock
- Ediciones de ventas
- Eliminaciones

**Beneficio:** Permite detectar inconsistencias y rastrear problemas.

---

### 20. **Sincronización de datos offline**

**Sugerencia:** Implementar cola de operaciones pendientes para cuando hay problemas de conexión.

**Beneficio:** Mejora la experiencia en conexiones inestables.

---

### 21. **Validación de stock en tiempo real**

**Sugerencia:** Mostrar advertencia si el stock cambió entre validación y registro.

**Beneficio:** Previene ventas con stock insuficiente.

---

### 22. **Exportación de reportes**

**Sugerencia:** Agregar exportación a Excel/CSV de:
- Ventas por período
- Stock por ciudad
- Depósitos generados

**Beneficio:** Facilita análisis externos.

---

### 23. **Notificaciones push**

**Sugerencia:** Notificar cuando:
- Stock bajo
- Nueva venta pendiente
- Depósito generado

**Beneficio:** Mejora la reactividad del equipo.

---

## 🔧 MEJORAS TÉCNICAS SUGERIDAS

### 24. **Usar funciones SQL para operaciones críticas**

**Sugerencia:** Crear funciones PostgreSQL para:
- `registrar_venta_pendiente(venta_data)` - Transacción atómica
- `descontar_stock_ciudad(ciudad, sku, cantidad)` - Operación atómica
- `editar_venta_pendiente(...)` - Transacción con rollback

**Beneficio:** Garantiza consistencia y atomicidad.

---

### 25. **Implementar retry logic**

**Sugerencia:** Para operaciones críticas, implementar retry automático con backoff exponencial.

**Beneficio:** Mejora la resiliencia ante errores temporales de red.

---

### 26. **Cache de productos**

**Sugerencia:** Cachear productos en memoria con invalidación inteligente.

**Beneficio:** Reduce queries a Supabase.

---

### 27. **Lazy loading de imágenes**

**Problema:** Todas las imágenes se cargan inmediatamente.

**Solución:** Usar `loading="lazy"` y placeholders.

---

## 📊 RESUMEN DE PRIORIDADES

### 🔴 CRÍTICO (Arreglar inmediatamente)
1. Transacciones atómicas en `registrarVentaPendiente`
2. Race conditions en operaciones de stock
3. Rollback en `editarVentaPendiente`
4. Manejo de errores en operaciones críticas

### 🟡 ALTO (Arreglar pronto)
5. Validación de stock con locks
6. Batch updates en lugar de loops
7. Manejo de `.single()` con `.maybeSingle()`
8. Mensajes de error amigables

### 🟢 MEDIO (Mejoras)
9. Código duplicado
10. Optimizaciones de performance
11. Auditoría de cambios
12. Exportación de reportes

---

## ✅ CÓDIGO QUE ESTÁ BIEN

1. **Optimistic updates:** Bien implementados en la mayoría de lugares
2. **Estructura de componentes:** Bien organizada
3. **Manejo de estados:** Uso correcto de hooks de React
4. **Normalización de datos:** Bien implementada en `supabaseUsers.js`
5. **Suscripciones en tiempo real:** Bien configuradas

---

## 🎯 RECOMENDACIONES FINALES

1. **Priorizar:** Arreglar problemas críticos de transacciones primero
2. **Testing:** Agregar tests para operaciones de stock concurrentes
3. **Documentación:** Documentar flujos críticos (stock, ventas, depósitos)
4. **Monitoreo:** Agregar logging estructurado para operaciones críticas
5. **Backup:** Implementar backups automáticos de datos críticos

---

**¿Quieres que implemente alguna de estas correcciones ahora?**

