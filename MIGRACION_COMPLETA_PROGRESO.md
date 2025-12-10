# 🔄 Migración Completa a Supabase - Progreso

## ✅ Completado

### 1. Autenticación ✅
- ✅ Login: Reemplazado `firebaseAuthUtils.loginUser` → `supabaseAuthUtils.loginUser`
- ✅ Registro: Reemplazado `firebaseAuthUtils.registerUser` → `supabaseAuthUtils.registerUser`
- ✅ Cambio de contraseña: Reemplazado `firebaseAuthUtils.changePassword` → `supabaseAuthUtils.changePassword`

### 2. Usuarios ✅
- ✅ Crear usuario: Reemplazado operaciones de Firestore → Supabase `users` table
- ✅ Editar usuario: Reemplazado `setDoc` → Supabase `update`
- ✅ Eliminar usuario: Reemplazado `deleteDoc` → Supabase `delete`

### 3. Productos ✅
- ✅ Crear producto: Reemplazado `addDoc` → Supabase `insert`
- ✅ Editar producto: Reemplazado `updateDoc` → Supabase `update`
- ✅ Eliminar producto: Reemplazado `deleteDoc` → Supabase `delete`
- ✅ Actualizar valores (delivery, precioPar): Reemplazado → Supabase `update`

### 4. Números ✅
- ✅ Suscripción: Reemplazado `onSnapshot` → `subscribeCollection` de Supabase
- ✅ Crear número: Reemplazado `addDoc` → Supabase `insert`
- ✅ Editar número: Reemplazado `updateDoc` → Supabase `update`
- ✅ Eliminar número: Reemplazado `deleteDoc` → Supabase `delete`

---

## ⚠️ Pendiente (Funcionalidades Críticas)

### 5. Depósitos (confirmarCobro) ⚠️
**Líneas:** ~1654-1758
- ⚠️ Lectura de ventas por cobrar: `getDoc(doc(db,'ventasporcobrar', idRow))`
- ⚠️ Crear depósito: `setDoc(doc(db,'GenerarDeposito', idRow), ...)`
- ⚠️ Consultas de ventas: `query(collection(db,'ventasporcobrar'), where(...))`
- ⚠️ Batch operations: `batch.set(doc(db,'GenerarDeposito', id), ...)`

**Acción requerida:** Reemplazar con operaciones de Supabase usando `supabaseUtils.js`

### 6. Despachos ⚠️
**Líneas:** ~2865-3500
- ⚠️ Suscripción a despachos: `onSnapshot(collection(db,'despachos'), ...)`
- ⚠️ Suscripción a cityStock: `onSnapshot(collection(db,'cityStock'), ...)`
- ⚠️ Actualizar stock al confirmar: `updateDoc(doc(db,'almacenCentral', ...), { stock: increment(...) })`
- ⚠️ Eliminar despacho: `deleteDoc(doc(db, 'despachos', ...))`
- ⚠️ Editar despacho: `updateDoc(doc(db,'despachos', ...), ...)`
- ⚠️ Crear despacho: `addDoc(collection(db,'despachos'), ...)`
- ⚠️ Confirmar despacho: Operaciones complejas con `doc(db,'despachos', ...)`, `doc(db,'cityStock', ...)`, `doc(db,'despachosHistorial', ...)`

**Acción requerida:** Reemplazar con `subscribeCollection` y operaciones de Supabase

### 7. CityStock (suscripciones específicas) ⚠️
**Líneas:** ~3764, ~5065, ~5153
- ⚠️ Suscripción individual: `onSnapshot(doc(db, 'cityStock', city), ...)`
- ⚠️ Lectura de cityStock: `getDoc(doc(db,'cityStock', ...))`

**Acción requerida:** Reemplazar con `subscribeCityStock` de `supabaseUtils.js`

### 8. Ventas (operaciones específicas) ⚠️
**Líneas:** ~1633, ~1828, ~1847, ~2297, ~5290, ~5513, ~5768, ~6083, ~6305, ~6328
- ⚠️ Confirmar entrega: `import('./firestoreUtils')` → Usar `supabaseUtils.js`
- ⚠️ Eliminar venta pendiente: `import('./firestoreUtils')` → Usar `supabaseUtils.js`
- ⚠️ Cancelar entrega confirmada: `import('./firestoreUtils')` → Usar `supabaseUtils.js`
- ⚠️ Editar venta pendiente: `import('./firestoreUtils')` → Usar `supabaseUtils.js`
- ⚠️ Editar venta confirmada: `import('./firestoreUtils')` → Usar `supabaseUtils.js`
- ⚠️ Eliminar venta de depósito: `import('./firestoreUtils')` → Usar `supabaseUtils.js`
- ⚠️ Sincronizar edición de depósito: `import('./firestoreUtils')` → Usar `supabaseUtils.js`

**Acción requerida:** Reemplazar imports de `firestoreUtils` con `supabaseUtils`

### 9. Bulk Delete ⚠️
**Líneas:** ~6119-6162
- ⚠️ Consulta: `query(collection(db,'ventasporcobrar'), where('ciudad','==', ...))`
- ⚠️ Batch delete: `batch.delete(doc(db,'ventasporcobrar', id))`

**Acción requerida:** Reemplazar con operaciones de Supabase

### 10. Edición de Depósitos ⚠️
**Líneas:** ~6238-6355
- ⚠️ Actualizar depósito: `updateDoc(doc(db, 'GenerarDeposito', ...), ...)`
- ⚠️ Eliminar depósitos: `query(collection(db,'GenerarDeposito'), where(...))` + `batch.delete`

**Acción requerida:** Reemplazar con operaciones de Supabase

---

## 📊 Estadísticas

- **Total de referencias a Firebase encontradas:** ~55
- **Migradas:** ~15 (27%)
- **Pendientes:** ~40 (73%)

---

## 🎯 Prioridad de Migración

### Alta Prioridad (Funcionalidades Críticas)
1. ✅ Autenticación - **COMPLETADO**
2. ✅ Usuarios - **COMPLETADO**
3. ✅ Productos - **COMPLETADO**
4. ✅ Números - **COMPLETADO**
5. ⚠️ Depósitos (confirmarCobro) - **PENDIENTE**
6. ⚠️ Ventas (operaciones con firestoreUtils) - **PENDIENTE**

### Media Prioridad
7. ⚠️ Despachos - **PENDIENTE**
8. ⚠️ CityStock (suscripciones específicas) - **PENDIENTE**

### Baja Prioridad
9. ⚠️ Bulk Delete - **PENDIENTE**
10. ⚠️ Edición de Depósitos - **PENDIENTE**

---

## 📝 Notas

- Las funciones de `supabaseUtils.js` ya están creadas y listas para usar
- La mayoría de las operaciones de ventas ya usan `supabaseUtils.js` indirectamente
- Necesitamos reemplazar los imports de `firestoreUtils` con `supabaseUtils`
- Las suscripciones principales ya usan `subscribeCollection` de Supabase

---

**Última actualización:** 2025-01-27



