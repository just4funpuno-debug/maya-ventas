# 📋 Guía: Agregar Cuentas como Testers - Paso a Paso

## 🎯 Objetivo

Agregar las cuentas de Facebook de cada producto como Testers para que puedan autorizar la app.

---

## 📝 PASO 1: Ir a Roles de la App

1. **Ve a:** https://developers.facebook.com/
2. **Inicia sesión** con la cuenta que creó la app (Sandra Silva)
3. **Selecciona tu App:** "CARDIO VASCULAR PLUS BOLIVIA"
4. **Menú lateral izquierdo:** Ve a **"Roles"** → **"Roles"**

---

## 📝 PASO 2: Agregar Primer Tester (Producto 1)

1. En la página de Roles, busca la sección **"Testers"** o **"Evaluadores"**
2. Haz clic en el botón **"Agregar evaluadores"** o **"Add Testers"**
3. Se abrirá un campo de texto
4. Ingresa el **email** o **nombre** de la cuenta de Facebook del Producto 1
   - Ejemplo: Si el Producto 1 usa la cuenta "producto1@email.com", ingrésalo
   - O si conoces el nombre de perfil, también puedes usarlo
5. Haz clic en **"Agregar"** o **"Add"**
6. La cuenta aparecerá en la lista de Testers con estado **"Pendiente"**

---

## 📝 PASO 3: Aceptar Invitación (Desde la Cuenta del Producto 1)

1. **Cierra sesión** de Facebook Developer Console
2. **Inicia sesión** en Facebook con la cuenta del Producto 1
3. **Ve a:** https://www.facebook.com/settings?tab=business_tools
   - O busca la notificación de Facebook sobre ser tester
4. **Busca la app** "CARDIO VASCULAR PLUS BOLIVIA" en la lista
5. **Acepta** ser tester de la app
6. El estado cambiará a **"Activo"** en el Developer Console

---

## 📝 PASO 4: Repetir para Otros Productos

Repite los PASOS 2 y 3 para cada producto:
- Producto 2 → Agregar como Tester → Aceptar invitación
- Producto 3 → Agregar como Tester → Aceptar invitación
- Y así sucesivamente...

---

## 📝 PASO 5: Verificar en Developer Console

1. **Vuelve a iniciar sesión** en Facebook Developer Console con la cuenta que creó la app
2. **Ve a:** Roles → Roles → Testers
3. **Verifica** que todas las cuentas aparezcan como **"Activo"**
4. Si alguna dice "Pendiente", esa cuenta aún no ha aceptado la invitación

---

## 📝 PASO 6: Probar OAuth

1. **Ve a tu CRM**
2. **Selecciona el Producto 1**
3. **Haz clic en "Conectar con Meta"**
4. **Inicia sesión** con la cuenta de Facebook del Producto 1
5. **Debería funcionar** sin error "Función no disponible"
6. **Autoriza la app**
7. **¡Listo!** La cuenta se creará en tu BD

---

## ✅ Checklist por Producto

Para cada producto, marca cuando completes:

- [ ] Cuenta agregada como Tester en Developer Console
- [ ] Invitación aceptada desde la cuenta de Facebook del producto
- [ ] Estado muestra "Activo" en Developer Console
- [ ] OAuth probado exitosamente en el CRM

---

## 💡 Tips Útiles

1. **Si no recibes la notificación:**
   - Ve directamente a: https://www.facebook.com/settings?tab=business_tools
   - Busca la app en la lista

2. **Si la invitación expira:**
   - Vuelve a agregar la cuenta como Tester
   - La invitación se reenviará

3. **Para verificar estado:**
   - Developer Console → Roles → Roles → Testers
   - Verás el estado de cada cuenta (Pendiente/Activo)

---

## 🚀 Siguiente Paso

Una vez que todas las cuentas estén como Testers y activas:
1. Cada producto puede autorizar la app sin problemas
2. Cada producto obtendrá sus propios tokens
3. Cada producto podrá gestionar su WhatsApp Business Account

---

**¿Listo para empezar? Comienza con el Producto 1** 🚀


