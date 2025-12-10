# 🔧 Agregar Cuentas de Productos como Testers

## ❌ Problema Actual

**Error:** "Función no disponible" cuando intentas autorizar con una cuenta diferente a la que creó la app.

**Causa:** La app está en modo **Development** y solo permite que cuentas con roles específicos la autoricen.

---

## ✅ Solución: Agregar Todas las Cuentas como Testers

Para que **cada producto** pueda autorizar la app con su propia cuenta de Facebook, necesitas agregar todas esas cuentas como **Testers** en la app.

---

## 📋 PASO A PASO

### **PASO 1: Ir a Roles de la App**

1. **Ve a:** https://developers.facebook.com/
2. **Inicia sesión** con la cuenta que creó la app (Sandra Silva)
3. **Selecciona tu App:** "CARDIO VASCULAR PLUS BOLIVIA"
4. **Menú lateral:** Ve a **"Roles"** → **"Roles"**

---

### **PASO 2: Agregar Testers (Una por Una)**

En la sección **"Testers"** o **"Evaluadores"**:

#### **Para Producto 1:**
1. Haz clic en **"Agregar evaluadores"** o **"Add Testers"**
2. Ingresa el **email** o **nombre** de la cuenta de Facebook del Producto 1
3. Haz clic en **"Agregar"** o **"Add"**
4. **Repite** para cada producto

#### **Para Producto 2:**
- Mismo proceso con la cuenta de Facebook del Producto 2

#### **Para Producto 3:**
- Mismo proceso con la cuenta de Facebook del Producto 3

**Y así para todos los productos que necesites conectar.**

---

### **PASO 3: Aceptar Invitaciones (IMPORTANTE)**

**Cada cuenta de Facebook debe aceptar la invitación:**

1. **Ve a la cuenta de Facebook** de cada producto (Producto 1, Producto 2, etc.)
2. **Busca la notificación** de Facebook sobre ser tester de la app
3. **O ve directamente a:** https://www.facebook.com/settings?tab=business_tools
4. **Busca la app** "CARDIO VASCULAR PLUS BOLIVIA" en la lista
5. **Acepta** ser tester de la app

**⚠️ IMPORTANTE:** Cada producto debe aceptar su propia invitación desde su cuenta de Facebook.

---

### **PASO 4: Verificar**

Después de agregar todas las cuentas:

1. **Verifica** en "Roles" que todas las cuentas aparezcan como "Testers"
2. **Cada producto** debería poder autorizar la app sin problemas

---

## 📋 Checklist

Para cada producto que quieras conectar:

- [ ] Agregar cuenta de Facebook del producto como Tester en la app
- [ ] Aceptar invitación desde la cuenta de Facebook del producto
- [ ] Probar OAuth desde esa cuenta

---

## 🔄 Flujo Completo para Cada Producto

```
1. Agregar cuenta como Tester en Facebook Developer Console
   ↓
2. Aceptar invitación desde la cuenta de Facebook del producto
   ↓
3. En tu CRM, seleccionar el producto
   ↓
4. Hacer clic en "Conectar con Meta"
   ↓
5. Iniciar sesión con la cuenta de Facebook del producto
   ↓
6. Autorizar la app (ahora funcionará sin error)
   ↓
7. OAuth exitoso → Cuenta creada en tu BD
```

---

## ⚠️ Notas Importantes

1. **No necesitas poner la app en Live Mode** - Con agregar como Testers es suficiente
2. **Cada producto mantiene sus propios tokens** - Aún con la misma app
3. **Datos aislados** - Cada producto tiene su propio WhatsApp Number ID, Business Account ID, etc.
4. **Puedes agregar más productos después** - Solo agrega como Tester y acepta invitación

---

## 🎯 Resumen

**Para solucionar el error:**
1. Agrega todas las cuentas de Facebook de los productos como **Testers** en la app
2. Cada cuenta debe **aceptar la invitación**
3. Cada producto podrá autorizar la app con su propia cuenta

**¿Listo para agregar las cuentas?** 🚀


