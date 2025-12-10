# 🧹 FASE 7.1: LIMPIEZA DE CÓDIGO HUÉRFANO

**Prioridad:** ALTA  
**Objetivo:** Eliminar código obsoleto, no usado o duplicado para mejorar mantenibilidad

---

## 📋 SUBFASES

### FASE 7.1.1: Verificar y Eliminar Archivos Obsoletos
**Objetivo:** Eliminar archivos marcados como obsoletos que ya no se usan

#### Tareas:
1. Verificar que `src/eliminarVentaConfirmada.js` no se importa en ningún lugar
2. Eliminar `src/eliminarVentaConfirmada.js`
3. Verificar referencias a funciones obsoletas en `firestoreUtils.js`
4. Documentar funciones que aún se usan vs. las que no

#### Testing:
- ✅ Verificar que la aplicación compila sin errores
- ✅ Verificar que no hay imports rotos
- ✅ Verificar que todas las funcionalidades siguen funcionando

---

### FASE 7.1.2: Verificar Funciones Helper No Usadas
**Objetivo:** Identificar y eliminar o documentar funciones helper que no se usan

#### Tareas:
1. Verificar uso de funciones helper en `App.jsx` (líneas 59-99):
   - `discountFromCityStock`
   - `registerSaleAndDiscount`
   - `editPendingSale`
   - `deletePendingSale`
   - `restoreCityStockFromSale`
2. Si no se usan directamente, verificar si son documentación
3. Eliminar si son código muerto, o documentar si son helpers de referencia

#### Testing:
- ✅ Verificar que la aplicación funciona correctamente
- ✅ Verificar que no se rompen referencias

---

### FASE 7.1.3: Verificar Funciones Duplicadas en firestoreUtils.js
**Objetivo:** Identificar funciones de Firebase que ya tienen equivalente en Supabase

#### Tareas:
1. Revisar `src/firestoreUtils.js`:
   - `editarVentaConfirmada` - ¿Se usa? (ya existe en `supabaseUtils.js`)
   - Otras funciones de Firebase que puedan estar obsoletas
2. Verificar si estas funciones se importan en algún lugar
3. Si no se usan, marcarlas como obsoletas o eliminarlas

#### Testing:
- ✅ Verificar que no hay imports rotos
- ✅ Verificar que todas las funcionalidades siguen funcionando
- ✅ Verificar que las funciones de Supabase funcionan correctamente

---

### FASE 7.1.4: Testing Completo de FASE 7.1
**Objetivo:** Verificar que toda la limpieza no rompió funcionalidades

#### Testing:
1. **Compilación:**
   - ✅ La aplicación compila sin errores
   - ✅ No hay warnings de imports no usados

2. **Funcionalidades críticas:**
   - ✅ Login funciona
   - ✅ Registrar venta funciona
   - ✅ Editar venta funciona
   - ✅ Eliminar venta funciona
   - ✅ Despachos funcionan
   - ✅ Dashboard funciona

3. **Verificación de código:**
   - ✅ No hay archivos obsoletos
   - ✅ No hay funciones no usadas (o están documentadas)
   - ✅ No hay imports rotos

---

## 📊 CRITERIOS DE ÉXITO

### FASE 7.1.1
- ✅ `src/eliminarVentaConfirmada.js` eliminado
- ✅ Aplicación compila sin errores
- ✅ No hay imports rotos

### FASE 7.1.2
- ✅ Funciones helper verificadas
- ✅ Código muerto eliminado o documentado
- ✅ Aplicación funciona correctamente

### FASE 7.1.3
- ✅ Funciones duplicadas identificadas
- ✅ Funciones obsoletas marcadas o eliminadas
- ✅ No hay referencias rotas

### FASE 7.1.4
- ✅ Todos los tests pasan
- ✅ Funcionalidades críticas verificadas
- ✅ Código limpio y sin duplicación

---

## 🎯 RESULTADO ESPERADO

Al finalizar FASE 7.1:
- ✅ Código más limpio y mantenible
- ✅ Sin archivos obsoletos
- ✅ Sin funciones no usadas
- ✅ Documentación clara de helpers
- ✅ Aplicación funcionando correctamente

---

**¿Proceder con FASE 7.1.1?**


