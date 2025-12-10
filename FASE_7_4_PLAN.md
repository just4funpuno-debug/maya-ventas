# 📋 FASE 7.4: Componentes y App.jsx - Plan de Subfases

## 🎯 Estrategia: Migración por Prioridad

**Total de archivos a actualizar:** 6 archivos

---

## 📊 Priorización de Archivos

### 🔴 **CRÍTICOS (Primero):**

1. **`src/App.jsx`** - Componente principal
   - Múltiples suscripciones a Firebase
   - Usa `firestoreUtils`
   - Lógica de autenticación
   - Estado global

2. **`src/features/sales/SalesPage.jsx`** - Página de ventas
   - Suscripción a `ventasporcobrar`
   - Suscripción a productos

### 🟡 **IMPORTANTES (Segundo):**

3. **`src/firestoreUsers.js`** - Funciones de usuarios
   - Suscripciones a usuarios
   - Funciones helper

4. **`src/eliminarVentaConfirmada.js`** - Script de eliminación
   - Usa Firebase directamente

### 🟢 **SECUNDARIOS (Tercero):**

5. **`src/firebaseAuthUtils.js`** - Ya obsoleto (reemplazado por `supabaseAuthUtils.js`)
   - Marcar como obsoleto o eliminar

6. **`src/firestoreUtils.js`** - Ya obsoleto (reemplazado por `supabaseUtils.js`)
   - Marcar como obsoleto o eliminar

---

## 🔄 Orden de Implementación

### **Subfase 7.4.1: Actualizar App.jsx (Crítico)**
- Reemplazar imports de Firebase
- Actualizar suscripciones a Supabase Realtime
- Actualizar imports de `firestoreUtils` → `supabaseUtils`
- Actualizar imports de `firebaseAuthUtils` → `supabaseAuthUtils`
- Adaptar lógica de estado

### **Subfase 7.4.2: Actualizar SalesPage.jsx**
- Reemplazar suscripción a `ventasporcobrar`
- Reemplazar suscripción a productos
- Adaptar normalización de datos

### **Subfase 7.4.3: Actualizar firestoreUsers.js**
- Crear `supabaseUsers.js` o actualizar directamente
- Reemplazar suscripciones

### **Subfase 7.4.4: Actualizar eliminarVentaConfirmada.js**
- Reemplazar queries de Firebase
- Usar `supabaseUtils`

### **Subfase 7.4.5: Limpieza**
- Marcar archivos obsoletos
- Actualizar documentación

---

**¿Empezamos con la Subfase 7.4.1 (App.jsx)?**



