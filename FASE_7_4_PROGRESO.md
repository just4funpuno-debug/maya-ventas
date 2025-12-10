# 📊 FASE 7.4: Componentes y App.jsx - Progreso

## ✅ Completado

### Subfase 7.4.1: Actualizar App.jsx - Imports y Funciones Helper ✅

**Archivo:** `src/App.jsx`

**Cambios realizados:**
1. ✅ Reemplazados imports de Firebase:
   - `import { collection, onSnapshot, ... } from "firebase/firestore"` → `import { supabase } from "./supabaseClient"`
   - `import { registrarVentaPendiente } from "./firestoreUtils"` → `import { registrarVentaPendiente, discountCityStock, restoreCityStock, adjustCityStock, subscribeCityStock } from "./supabaseUtils"`
   - Eliminado `import { db } from "./firebase"`

2. ✅ Actualizadas funciones helper:
   - `transferToCity()` - Usa `supabase` y `restoreCityStock()`
   - `discountFromCityStock()` - Usa `discountCityStock()`
   - `registerSaleAndDiscount()` - Usa `registrarVentaPendiente()`
   - `editPendingSale()` - Usa `supabaseUtils.editarVentaPendiente()`
   - `deletePendingSale()` - Usa `supabaseUtils.eliminarVentaPendiente()`
   - `restoreCityStockFromSale()` - Usa `restoreCityStock()`
   - `updateCityStock()` - Usa `adjustCityStock()`

---

## ⏳ Pendiente

### Subfase 7.4.2: Actualizar App.jsx - Suscripciones a Firebase

**Líneas a actualizar (aproximadas):**

1. **Líneas 466-540:** Suscripción a `VentasSinConfirmar` y `ventashistorico`
   - Reemplazar `onSnapshot(collection(db, 'VentasSinConfirmar'))` → Supabase Realtime
   - Reemplazar `onSnapshot(collection(db, 'ventashistorico'))` → Supabase Realtime

2. **Líneas 543-565:** Suscripción a `ventasporcobrar` para KPI
   - Reemplazar `onSnapshot(collection(db, 'ventasporcobrar'))` → Supabase Realtime

3. **Líneas 638-670:** Suscripción a `GenerarDeposito`
   - Reemplazar `onSnapshot(collection(db, 'GenerarDeposito'))` → Supabase Realtime

4. **Líneas 724-727:** Suscripción a `almacenCentral` (productos)
   - Reemplazar `subscribeCollection('almacenCentral')` → Supabase Realtime

5. **Líneas 730-734:** Suscripción a `cityStock`
   - Reemplazar `subscribeCollection('cityStock')` → `subscribeCityStock()`

6. **Líneas 736-742:** Suscripción a `despachos` y `despachosHistorial`
   - Reemplazar `subscribeCollection('despachos')` → Supabase Realtime
   - Reemplazar `subscribeCollection('despachosHistorial')` → Supabase Realtime

7. **Líneas 758-769:** Suscripción a `users`
   - Reemplazar `onSnapshot(collection(db, 'users'))` → Supabase Realtime

8. **Líneas 3936-3955:** Suscripción a `numbers` en `MisNumerosView`
   - Reemplazar `onSnapshot(collection(db, 'numbers'))` → Supabase Realtime

---

### Subfase 7.4.3: Actualizar SalesPage.jsx

**Archivo:** `src/features/sales/SalesPage.jsx`

**Cambios necesarios:**
1. Reemplazar `import { collection, onSnapshot, query, orderBy } from "firebase/firestore"`
2. Reemplazar `import { db } from "../../firebase"`
3. Actualizar suscripción a `ventasporcobrar`
4. Actualizar suscripción a productos

---

### Subfase 7.4.4: Actualizar firestoreUsers.js

**Archivo:** `src/firestoreUsers.js`

**Cambios necesarios:**
1. Crear `supabaseUsers.js` o actualizar directamente
2. Reemplazar `subscribeCollection()` para usar Supabase Realtime

---

### Subfase 7.4.5: Limpieza

**Archivos a marcar como obsoletos:**
1. `src/firebaseAuthUtils.js` - Reemplazado por `supabaseAuthUtils.js`
2. `src/firestoreUtils.js` - Reemplazado por `supabaseUtils.js`
3. `src/firebase.js` - Mantener temporalmente para compatibilidad

---

## 📝 Notas Importantes

1. **Normalización de datos:** Las suscripciones de Supabase retornan datos en formato diferente a Firebase. Necesitamos adaptar la normalización.

2. **Timestamps:** Firebase usa `serverTimestamp()` y objetos `Timestamp`, mientras que Supabase usa `timestamptz` (ISO strings).

3. **Estructura de datos:**
   - Firebase: `VentasSinConfirmar` → Supabase: `sales` con `estado_entrega='pendiente'`
   - Firebase: `ventasporcobrar` → Supabase: `sales` con `deleted_from_pending_at IS NULL`
   - Firebase: `ventashistorico` → Supabase: `sales` con `estado_entrega IN ('confirmado', 'entregada', 'cancelado')`

4. **Realtime:** Supabase Realtime usa `postgres_changes` en lugar de `onSnapshot`.

---

## 🎯 Próximos Pasos

1. **Crear helper para suscripciones:** Función genérica para suscribirse a tablas de Supabase
2. **Actualizar suscripciones una por una:** Empezar con las más críticas
3. **Probar cada suscripción:** Verificar que los datos se cargan correctamente
4. **Actualizar normalización:** Adaptar la lógica de normalización de timestamps

---

**Estado:** 🔄 En progreso (20% completado)



