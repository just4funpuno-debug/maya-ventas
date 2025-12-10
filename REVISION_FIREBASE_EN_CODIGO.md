# 🔍 Revisión: Referencias a Firebase en el Código

## ⚠️ Estado Actual

**Fecha:** 2025-01-27  
**Estado:** ❌ **AÚN HAY REFERENCIAS A FIREBASE EN EL CÓDIGO**

---

## 📊 Resumen de Referencias

### ✅ Archivos que YA usan Supabase
1. ✅ `src/supabaseClient.js` - Cliente Supabase
2. ✅ `src/supabaseAuthUtils.js` - Autenticación Supabase
3. ✅ `src/supabaseUtils.js` - Utilidades de datos Supabase
4. ✅ `src/supabaseUsers.js` - Utilidades de usuarios Supabase
5. ✅ `src/features/sales/SalesPage.jsx` - Usa `subscribeCollection` de Supabase

### ⚠️ Archivos que AÚN usan Firebase

#### 1. `src/firebase.js` - Configuración de Firebase
- **Estado:** ⚠️ **AÚN EXISTE** pero no debería usarse
- **Uso:** Exporta `db` y `auth` de Firebase
- **Acción:** Este archivo puede mantenerse para compatibilidad temporal, pero debería estar obsoleto

#### 2. `src/firestoreUsers.js` - Utilidades de Firestore
- **Estado:** ⚠️ **MARCADO COMO OBSOLETO**
- **Uso:** Tiene warnings pero aún tiene código funcional
- **Acción:** Ya está marcado como obsoleto, no se usa activamente

#### 3. `src/firebaseAuthUtils.js` - Autenticación Firebase
- **Estado:** ⚠️ **AÚN EXISTE** pero debería estar obsoleto
- **Uso:** Funciones de autenticación con Firebase
- **Acción:** Debería estar obsoleto, reemplazado por `supabaseAuthUtils.js`

#### 4. `src/App.jsx` - **ARCHIVO PRINCIPAL CON MÚLTIPLES REFERENCIAS**
- **Estado:** ❌ **AÚN USA FIREBASE EN VARIAS PARTES**

---

## 🔍 Referencias a Firebase en `App.jsx`

### 1. **Autenticación** (Líneas ~1072, ~1211-1216)
```javascript
// Línea ~1072: changePassword
const { changePassword } = await import('./firebaseAuthUtils');

// Líneas ~1211-1216: loginUser y lectura de usuario
const { loginUser } = await import("./firebaseAuthUtils");
const { db } = await import("./firebase");
const { doc, getDoc } = await import("firebase/firestore");
const userDoc = await getDoc(doc(db, "users", user.uid));
```
**Acción:** Reemplazar con `supabaseAuthUtils.js`

### 2. **Gestión de Depósitos** (Líneas ~1654-1758)
```javascript
// Lectura de ventas por cobrar
const ds = await getDoc(doc(db,'ventasporcobrar', idRow));

// Crear/actualizar depósitos
await setDoc(doc(db,'GenerarDeposito', idRow), ...);

// Consultas de ventas por cobrar
const qv = query(collection(db,'ventasporcobrar'), where('ciudad','==', cv));
```
**Acción:** Reemplazar con `supabaseUtils.js` y `supabaseClient.js`

### 3. **Gestión de Usuarios** (Líneas ~2354-2435)
```javascript
// Registro de usuario
const { registerUser } = await import('./firebaseAuthUtils');
const { doc, setDoc } = await import('firebase/firestore');
await setDoc(doc(db,'users', userId), extra, { merge: true });

// Edición de usuario
await setDoc(doc(db,'users', editData.id), payload, { merge: true });

// Eliminación de usuario
await deleteDoc(doc(db,'users', target.id));
```
**Acción:** Reemplazar con `supabaseAuthUtils.js` y operaciones directas de Supabase

### 4. **Gestión de Productos** (Líneas ~1869-2865)
```javascript
// Lectura de productos
const snap = await getDoc(doc(db, 'almacenCentral', product.id));

// Actualización de productos
await updateDoc(doc(db, 'almacenCentral', editingId), data);

// Creación de productos
await addDoc(collection(db, 'almacenCentral'), data);

// Eliminación de productos
await deleteDoc(doc(db, 'almacenCentral', pendingDeleteProduct.id));

// Actualización de stock
await updateDoc(doc(db, 'almacenCentral', id), { stock: ... });
```
**Acción:** Reemplazar con `supabaseClient.js` y operaciones directas de Supabase

### 5. **Gestión de Despachos** (Líneas ~2865-3303)
```javascript
// Suscripción a despachos
unsub = onSnapshot(collection(db,'despachos'), snap => { ... });

// Suscripción a cityStock
unsub = onSnapshot(collection(db,'cityStock'), snap => { ... });

// Actualización de stock al confirmar despacho
await updateDoc(doc(db,'almacenCentral', meta.id), { stock: increment(...) });

// Eliminación de despacho
await deleteDoc(doc(db, 'despachos', confirmDelete.id));

// Edición de despacho
await updateDoc(doc(db,'despachos', editId), { fecha, ciudad, items: newItems });
```
**Acción:** Reemplazar con `subscribeCollection` de Supabase y `supabaseUtils.js`

### 6. **Gestión de Números** (Líneas ~3920-4019)
```javascript
// Suscripción a numbers
const q = query(collection(db,'numbers'), orderBy('caduca','asc'));
unsub = onSnapshot(q, snap => { ... });

// Creación/actualización de números
await updateDoc(doc(db,'numbers', editingId), { ... });
await addDoc(collection(db,'numbers'), { ... });

// Eliminación de números
await deleteDoc(doc(db,'numbers', id));
```
**Acción:** Reemplazar con `subscribeCollection` de Supabase y operaciones directas

### 7. **Gestión de CityStock** (Líneas ~3764-5065)
```javascript
// Suscripción a cityStock
unsub = onSnapshot(doc(db, 'cityStock', city), snap => { ... });

// Lectura de cityStock
const citySnap = await getDoc(doc(db,'cityStock', payload.ciudad));
```
**Acción:** Reemplazar con `subscribeCityStock` de `supabaseUtils.js`

### 8. **Gestión de Depósitos (confirmarCobro)** (Líneas ~5662-5730)
```javascript
// Lectura de ventas por cobrar
const srcRef = doc(db,'ventasporcobrar', sourceId);
const snap = await getDoc(srcRef);

// Crear depósito
const destRef = doc(collection(db,'GenerarDeposito'), sourceId);
await setDoc(destRef, sourceData);

// Eliminar de ventas por cobrar
await deleteDoc(srcRef);
```
**Acción:** Reemplazar con `supabaseUtils.js`

### 9. **Bulk Delete de Ventas** (Líneas ~6119-6162)
```javascript
// Consulta de ventas por cobrar
const q = query(collection(db,'ventasporcobrar'), where('ciudad','==', active.city));
const docs = await getDocs(q);

// Eliminación en batch
chunk.forEach(id=> batch.delete(doc(db,'ventasporcobrar', id)) );
```
**Acción:** Reemplazar con operaciones de Supabase

### 10. **Edición de Depósitos** (Líneas ~6238-6309)
```javascript
// Actualización de depósito
await updateDoc(refDeposito, { ...confirmEditModal.newRow, updatedAt: serverTimestamp() });

// Eliminación de depósitos
const q = query(collection(db,'GenerarDeposito'), where('ciudad','==', ciudad));
const docs = await getDocs(q);
chunk.forEach(id=> batch.delete(doc(db,'GenerarDeposito', id)) );
```
**Acción:** Reemplazar con operaciones de Supabase

---

## 📋 Plan de Acción

### Prioridad Alta (Funcionalidades Críticas)
1. ✅ **Autenticación** - Reemplazar `firebaseAuthUtils` con `supabaseAuthUtils`
2. ✅ **Suscripciones principales** - Ya están usando `subscribeCollection` de Supabase
3. ⚠️ **Gestión de Depósitos** - Reemplazar operaciones de Firebase
4. ⚠️ **Gestión de Usuarios** - Reemplazar operaciones de Firebase

### Prioridad Media
5. ⚠️ **Gestión de Productos** - Reemplazar operaciones de Firebase
6. ⚠️ **Gestión de Despachos** - Reemplazar suscripciones y operaciones
7. ⚠️ **Gestión de Números** - Reemplazar suscripciones y operaciones

### Prioridad Baja
8. ⚠️ **Gestión de CityStock** - Ya tiene `subscribeCityStock` pero hay referencias directas
9. ⚠️ **Bulk Delete** - Funcionalidad secundaria

---

## ✅ Conclusión

**Estado Actual:** El código **AÚN TIENE MÚLTIPLES REFERENCIAS A FIREBASE**, especialmente en:
- Operaciones de escritura (crear, actualizar, eliminar)
- Algunas suscripciones específicas (numbers, cityStock individual)
- Operaciones de batch

**Impacto:** 
- Las suscripciones principales ya usan Supabase ✅
- Las operaciones de escritura aún usan Firebase ❌
- Esto significa que **los datos se leen de Supabase pero se escriben en Firebase**

**Recomendación:** 
- **URGENTE:** Reemplazar todas las operaciones de escritura con Supabase
- El sistema actual está en un estado híbrido que puede causar inconsistencias

---

**Última actualización:** 2025-01-27



