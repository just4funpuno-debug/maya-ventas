# 🔧 FASE 3.2: Actualizar Código JavaScript

## Objetivo
Actualizar la función `editarVentaPendiente` en `src/supabaseUtils.js` para usar la función SQL transaccional creada en FASE 3.1.

---

## ✅ Cambios Realizados

### `editarVentaPendiente`
**ANTES:**
- Restauraba stock anterior (2 operaciones)
- Descontaba stock nuevo (2 operaciones)
- Actualizaba venta (1 operación)
- **Problema:** Si falla la actualización, el stock queda inconsistente

**DESPUÉS:**
- Usa `supabase.rpc('editar_venta_pendiente_atomica', ...)`
- Operación atómica en PostgreSQL
- Si falla cualquier paso, todo se revierte automáticamente
- **Ventaja:** Garantiza consistencia (todo o nada)

---

## 📋 Verificación

### 1. Verificar Compilación

- [ ] Ejecuta: `npm run dev`
- [ ] Verifica que NO hay errores de compilación
- [ ] Si hay errores, compártelos

### 2. Verificar en la Aplicación

#### Test 2.1: Editar venta exitosamente
1. Abre la aplicación en el navegador
2. Ve a **"Ventas"** o **"Registrar Venta"**
3. Crea una venta pendiente
4. Edita la venta (cambia cantidad, SKU, ciudad, etc.)
5. **Verifica:**
   - ✅ La venta se actualiza correctamente
   - ✅ El stock se ajusta correctamente
   - ✅ No hay errores en la consola del navegador (F12)
   - ✅ Los logs muestran: `[editarVentaPendiente] Venta editada y stock ajustado de forma atómica`

#### Test 2.2: Intentar editar con stock insuficiente
1. Crea una venta pendiente
2. Intenta editar aumentando la cantidad más allá del stock disponible
3. **Verifica:**
   - ✅ Muestra error: "Stock insuficiente"
   - ✅ El stock NO se ajustó
   - ✅ La venta NO se actualizó
   - ✅ El mensaje de error es claro

#### Test 2.3: Cambiar ciudad y SKU
1. Crea una venta pendiente en una ciudad con un producto
2. Edita la venta para cambiar a otra ciudad y otro producto
3. **Verifica:**
   - ✅ El stock se restaura en la ciudad anterior
   - ✅ El stock se descuenta en la ciudad nueva
   - ✅ La venta se actualiza correctamente
   - ✅ No hay inconsistencias

---

## ✅ Criterios de Éxito FASE 3.2

- [ ] La app compila sin errores
- [ ] Se puede editar una venta correctamente
- [ ] Rechaza correctamente ediciones con stock insuficiente
- [ ] Maneja correctamente cambios de ciudad y SKU
- [ ] No hay errores en la consola del navegador
- [ ] Los logs muestran que se usa la función SQL transaccional

---

## 🎯 Siguiente Paso

Si todos los tests pasan, continúa con:
**FASE 3.3: Testing de rollback**

---

**¿La aplicación funciona correctamente? Ejecuta los tests y comparte los resultados antes de continuar.**


