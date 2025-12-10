# 🔧 Solución: Error "La aplicación no está activa"

## ❌ Error Encontrado

**Mensaje:** "La aplicación no está activa"
**Causa:** La app de Facebook está en modo "Development" o necesita configuración adicional.

---

## 🔍 Soluciones Paso a Paso

### **SOLUCIÓN 1: Agregar Usuarios como Testers (Más Rápido)**

Si la app está en modo **"Development"**, necesitas agregar usuarios como testers:

#### **PASO 1: Ir a Facebook Developer Console**

1. Ve a: https://developers.facebook.com/
2. Inicia sesión con la cuenta que creó la app
3. Selecciona tu App: **"Maya Life WhatsApp"** (o el nombre de tu app)

---

#### **PASO 2: Agregar Roles**

1. En el menú lateral izquierdo, ve a **Roles** > **Roles**
2. En la sección **"Testers"**, haz clic en **"Add Testers"**
3. Agrega las cuentas de Facebook que quieres que puedan usar la app:
   - La cuenta del **Producto 1**
   - La cuenta del **Producto 2**
   - Cualquier otra cuenta que necesite autorizar

---

#### **PASO 3: Aceptar Invitación (Importante)**

1. **Cada cuenta agregada recibirá una notificación** en Facebook
2. Esa cuenta debe:
   - Ir a la notificación
   - Aceptar ser tester de la app
   - O ir directamente a: https://www.facebook.com/settings?tab=business_tools

---

### **SOLUCIÓN 2: Cambiar App a Modo "Live" (Requiere Revisión)**

Si quieres que cualquier usuario pueda usar la app sin ser tester:

#### **PASO 1: Cambiar a Modo Live**

1. En Facebook Developer Console, ve a **App Review** > **Permissions and Features**
2. Solicita revisión para los permisos necesarios:
   - `whatsapp_business_management`
   - `whatsapp_business_messaging`
   - `business_management`

**⚠️ Nota:** Este proceso puede tardar varios días y requiere documentación.

---

### **SOLUCIÓN 3: Verificar Estado de la App**

1. Ve a **Settings** > **Basic**
2. Verifica que:
   - ✅ App está en modo **"Development"** o **"Live"**
   - ✅ App ID está correcto: `1253651046588346`
   - ✅ App Secret está configurado

---

## 🎯 Solución Rápida (Recomendada)

**Para desarrollo/testing, usa la Solución 1:**

1. ✅ Agregar cuentas como Testers (5 minutos)
2. ✅ Aceptar invitación
3. ✅ Probar OAuth de nuevo

**Pasos detallados:**

### **1. Agregar Testers:**

```
Facebook Developer Console
→ Tu App
→ Roles > Roles
→ Add Testers
→ Ingresa emails o nombres de Facebook de las cuentas
→ Enviar invitaciones
```

### **2. Aceptar Invitación (desde cada cuenta):**

```
Cada cuenta agregada:
→ Recibe notificación en Facebook
→ O va a: facebook.com/settings?tab=business_tools
→ Busca la app en "Apps and websites"
→ Acepta ser tester
```

### **3. Probar OAuth de nuevo:**

```
Después de aceptar:
→ Cerrar sesión y volver a iniciar con la cuenta del tester
→ Intentar OAuth de nuevo
→ Debería funcionar
```

---

## ⚠️ Notas Importantes

### **Si agregas múltiples cuentas:**

- ✅ Agrega todas las cuentas de Facebook que usarás (Producto 1, Producto 2, etc.)
- ✅ Cada cuenta debe aceptar la invitación individualmente
- ✅ Puedes agregar hasta 50 testers sin revisión

### **Si la app está en modo Live:**

- ✅ No necesitas agregar testers
- ✅ Cualquier usuario puede autorizar
- ⚠️ Pero requiere revisión de Facebook para los permisos

---

## 🔄 Verificar que Funcionó

Después de agregar testers y aceptar invitaciones:

1. **Cierra sesión** en Facebook
2. **Abre de nuevo** el OAuth desde tu CRM
3. **Inicia sesión** con la cuenta que agregaste como tester
4. **Debería funcionar** sin el error

---

## 📋 Checklist de Solución

- [ ] Ir a Facebook Developer Console
- [ ] Roles > Roles
- [ ] Agregar cuentas como Testers
- [ ] Cada cuenta acepta invitación
- [ ] Probar OAuth de nuevo

---

## 🚀 Siguiente Paso

**Después de solucionar:**

1. ✅ Probar OAuth con la cuenta del Producto 1
2. ✅ Verificar que el formulario se llena automáticamente
3. ✅ Conectar el primer producto

**¿Necesitas ayuda con algún paso específico?** 💪


