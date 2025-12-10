# 📋 Plan de Migración Final - Por Fases

## 🎯 Objetivo
Completar la migración de todas las funcionalidades pendientes a Supabase, fase por fase, con testing después de cada fase.

---

## 📊 Fases de Migración

### **Fase 1: CityStock - Suscripciones Específicas** ⚠️
**Prioridad:** Media  
**Complejidad:** Baja  
**Impacto:** Funcionalidad de lectura de stock por ciudad

**Tareas:**
1. Reemplazar `onSnapshot(doc(db, 'cityStock', city), ...)` con `subscribeCityStock`
2. Reemplazar `getDoc(doc(db,'cityStock', ...))` con consultas Supabase
3. Testing: Verificar que las suscripciones funcionan correctamente

**Archivos afectados:**
- `src/App.jsx` (líneas ~3764, ~5065, ~5153)

---

### **Fase 2: Despachos - Suscripciones y Operaciones** ⚠️
**Prioridad:** Media  
**Complejidad:** Media  
**Impacto:** Funcionalidad de gestión de despachos

**Tareas:**
1. Reemplazar `onSnapshot(collection(db,'despachos'), ...)` con `subscribeCollection`
2. Reemplazar `onSnapshot(collection(db,'cityStock'), ...)` con `subscribeCollection`
3. Reemplazar operaciones de escritura (`updateDoc`, `deleteDoc`, `addDoc`) con Supabase
4. Migrar función de confirmar despacho
5. Testing: Verificar creación, edición, eliminación y confirmación de despachos

**Archivos afectados:**
- `src/App.jsx` (líneas ~2865-3500)

---

### **Fase 3: Depósitos - confirmarCobro** ⚠️
**Prioridad:** Alta  
**Complejidad:** Alta  
**Impacto:** Funcionalidad crítica de generación de depósitos

**Tareas:**
1. Reemplazar `getDoc(doc(db,'ventasporcobrar', ...))` con consultas Supabase
2. Reemplazar `setDoc(doc(db,'GenerarDeposito', ...))` con `insert` en Supabase
3. Reemplazar `query(collection(db,'ventasporcobrar'), ...)` con consultas Supabase
4. Reemplazar `writeBatch` con operaciones individuales de Supabase
5. Testing: Verificar que la generación de depósitos funciona correctamente

**Archivos afectados:**
- `src/App.jsx` (líneas ~1660-1798)

---

### **Fase 4: Bulk Delete y Edición de Depósitos** ⚠️
**Prioridad:** Baja  
**Complejidad:** Media  
**Impacto:** Funcionalidades secundarias

**Tareas:**
1. Migrar bulk delete de ventas por cobrar
2. Migrar edición de depósitos
3. Migrar eliminación de depósitos
4. Testing: Verificar que las operaciones funcionan correctamente

**Archivos afectados:**
- `src/App.jsx` (líneas ~6119-6162, ~6238-6355)

---

### **Fase 5: Limpieza Final y Testing Completo** ✅
**Prioridad:** Alta  
**Complejidad:** Baja  
**Impacto:** Verificar que todo funciona

**Tareas:**
1. Marcar archivos Firebase como obsoletos
2. Verificar que no queden referencias a Firebase
3. Testing completo de todas las funcionalidades
4. Documentación final

---

## 🧪 Plan de Testing

### Testing por Fase:
1. **Fase 1:** Probar suscripciones de CityStock
2. **Fase 2:** Probar operaciones de Despachos
3. **Fase 3:** Probar generación de Depósitos
4. **Fase 4:** Probar Bulk Delete y Edición de Depósitos
5. **Fase 5:** Testing completo end-to-end

### Testing Final:
- ✅ Login/Logout
- ✅ Crear/Editar/Eliminar usuarios
- ✅ Crear/Editar/Eliminar productos
- ✅ Crear/Editar/Eliminar números
- ✅ Registrar venta pendiente
- ✅ Confirmar entrega de venta
- ✅ Editar venta
- ✅ Cancelar venta
- ✅ Generar depósito
- ✅ Crear/Editar/Eliminar despacho
- ✅ Confirmar despacho
- ✅ Ver stock por ciudad
- ✅ Bulk delete

---

**Iniciando Fase 1...**



