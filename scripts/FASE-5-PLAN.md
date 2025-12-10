# 🟡 FASE 5: VALIDACIONES Y CONSISTENCIA

## 📋 Objetivo

Mejorar las validaciones y consistencia del código, especialmente:
1. Reemplazar `.single()` por `.maybeSingle()` donde puede no haber resultados
2. Mejorar validación de stock
3. Centralizar funciones duplicadas

---

## 🔍 Problemas Identificados

### 5.1: Manejo de `.single()` sin validación

**Problema:** `.single()` lanza error si hay 0 o múltiples registros, pero no siempre se maneja correctamente.

**Casos Problemáticos Identificados:**

1. **`getProductStock` (línea 28-32)**
   - Busca stock de un producto
   - Podría no existir el producto
   - **Solución:** Usar `.maybeSingle()` y manejar `null`

2. **`onAddSale` - Stock principal (línea 2315-2317)**
   - Busca stock de producto
   - Podría no existir el producto
   - **Solución:** Usar `.maybeSingle()` y manejar `null`

3. **`onAddSale` - Stock extra (línea 2344-2348)**
   - Busca stock de producto extra
   - Podría no existir el producto
   - **Solución:** Usar `.maybeSingle()` y manejar `null`

4. **`editarVentaConfirmada` - Buscar por codigo_unico (línea 451, 461)**
   - Busca ventas por codigo_unico
   - Podría no existir
   - **Solución:** Usar `.maybeSingle()` y manejar `null`

5. **`cancelarVentaConfirmada` - Buscar venta (línea 580-584)**
   - Busca venta por id
   - Podría no existir si fue eliminada
   - **Solución:** Usar `.maybeSingle()` y manejar `null`

6. **`addSale` - Validar stock ciudad (línea 6435-6440, 6456-6461)**
   - Busca stock de ciudad
   - Podría no existir registro
   - **Solución:** Usar `.maybeSingle()` y manejar `null`

**Casos que están bien (no cambiar):**
- Después de `insert()` o `update()` con `.select().single()` - siempre debería haber resultado
- Búsquedas por ID único que sabemos que existe

---

### 5.2: Validación de stock duplicada

**Problema:** La validación de stock está duplicada en múltiples lugares.

**Ubicaciones:**
- `src/App.jsx:2295-2350` - `onAddSale` (Dashboard)
- `src/App.jsx:6424-6482` - `addSale` (RegisterSaleView)

**Solución:** Extraer a función común `validateStockForSale(product, cantidad, ciudad, cityStock)`

---

### 5.3: Normalización de ciudades duplicada

**Problema:** La normalización de ciudades está en múltiples lugares.

**Ubicaciones:**
- `src/supabaseUtils.js:14-17` - `normalizeCity`
- `src/supabaseUsers.js:262-268` - `denormalizeCity`

**Solución:** Centralizar en un solo archivo de utilidades.

---

## 📝 Subfases

### FASE 5.1: Reemplazar `.single()` por `.maybeSingle()`

**Tareas:**
1. Identificar todos los casos problemáticos
2. Reemplazar `.single()` por `.maybeSingle()`
3. Agregar validación de `null` después de `.maybeSingle()`
4. Manejar casos donde no hay resultados

**Archivos a modificar:**
- `src/App.jsx`: Líneas 28-32, 2315-2317, 2344-2348, 6435-6440, 6456-6461
- `src/supabaseUtils.js`: Líneas 451, 461, 580-584

---

### FASE 5.2: Mejorar validación de stock

**Tareas:**
1. Crear función común `validateStockForSale`
2. Reemplazar validaciones duplicadas
3. Mejorar mensajes de error

**Archivos a modificar:**
- `src/App.jsx`: Líneas 2295-2350, 6424-6482
- Crear `src/utils/stockValidation.js`

---

### FASE 5.3: Centralizar normalización de ciudades

**Tareas:**
1. Crear archivo común de utilidades de ciudades
2. Mover `normalizeCity` y `denormalizeCity` a un solo lugar
3. Actualizar imports en todos los archivos

**Archivos a modificar:**
- `src/supabaseUtils.js`
- `src/supabaseUsers.js`
- Crear `src/utils/cityUtils.js`

---

### FASE 5.4: Testing de validaciones

**Tareas:**
1. Probar casos donde no hay resultados
2. Probar validaciones de stock
3. Verificar que los mensajes de error son claros

---

## ✅ Checklist

- [ ] FASE 5.1: Reemplazar `.single()` por `.maybeSingle()`
- [ ] FASE 5.2: Mejorar validación de stock
- [ ] FASE 5.3: Centralizar normalización de ciudades
- [ ] FASE 5.4: Testing de validaciones

---

## 🚀 Empezamos con FASE 5.1


