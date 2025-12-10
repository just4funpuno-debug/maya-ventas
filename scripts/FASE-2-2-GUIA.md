# 🔧 FASE 2.2: Actualizar Código JavaScript

## Objetivo
Actualizar las funciones `discountCityStock` y `restoreCityStock` en `src/supabaseUtils.js` para usar las funciones SQL atómicas creadas en FASE 2.1.

---

## ✅ Cambios Realizados

### 1. `discountCityStock`
**ANTES:**
- Leía stock actual (SELECT)
- Calculaba nueva cantidad (JavaScript)
- Actualizaba stock (UPDATE)
- **Problema:** Race condition entre SELECT y UPDATE

**DESPUÉS:**
- Usa `supabase.rpc('descontar_stock_ciudad_atomico', ...)`
- Operación atómica en PostgreSQL
- Retorna el nuevo stock
- **Ventaja:** Elimina race conditions

### 2. `restoreCityStock`
**ANTES:**
- Leía stock actual (SELECT)
- Calculaba nueva cantidad (JavaScript)
- Actualizaba stock (UPDATE o INSERT)
- **Problema:** Race condition entre SELECT y UPDATE

**DESPUÉS:**
- Usa `supabase.rpc('restaurar_stock_ciudad_atomico', ...)`
- Operación atómica en PostgreSQL
- Retorna el nuevo stock
- **Ventaja:** Elimina race conditions

---

## 📋 Verificación

### 1. Verificar Compilación

- [ ] Ejecuta: `npm run dev`
- [ ] Verifica que NO hay errores de compilación
- [ ] Si hay errores, compártelos

### 2. Verificar en la Aplicación

#### Test 2.1: Descontar stock
1. Abre la aplicación en el navegador
2. Ve a cualquier menú que use stock (ej: "Despacho de Productos")
3. Descuenta stock de una ciudad
4. **Verifica:**
   - ✅ El stock se actualiza correctamente
   - ✅ No hay errores en la consola del navegador (F12)
   - ✅ Los logs muestran: `[discountCityStock] ... nuevo stock: X`

#### Test 2.2: Restaurar stock
1. Restaura stock de una ciudad (ej: eliminar una venta pendiente)
2. **Verifica:**
   - ✅ El stock se actualiza correctamente
   - ✅ No hay errores en la consola del navegador (F12)
   - ✅ Los logs muestran: `[restoreCityStock] ... nuevo stock: X`

#### Test 2.3: Múltiples operaciones simultáneas
1. Abre la aplicación en **2 navegadores diferentes**
2. Ambos usuarios realizan operaciones de stock en la misma ciudad/producto
3. **Verifica:**
   - ✅ No hay inconsistencias
   - ✅ El stock se actualiza correctamente en ambos navegadores
   - ✅ No hay errores de race condition

---

## ✅ Criterios de Éxito FASE 2.2

- [ ] La app compila sin errores
- [ ] Se puede descontar stock correctamente
- [ ] Se puede restaurar stock correctamente
- [ ] No hay errores en la consola del navegador
- [ ] Los logs muestran el nuevo stock retornado por las funciones SQL

---

## 🎯 Siguiente Paso

Si todos los tests pasan, continúa con:
**FASE 2.3: Testing con múltiples usuarios**

---

**¿La aplicación funciona correctamente? Ejecuta los tests y comparte los resultados antes de continuar.**


