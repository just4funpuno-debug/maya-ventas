# 🚀 Poner la App en Modo Live (Como Kommo)

## 🎯 Objetivo

Hacer que **cualquier cuenta de Facebook** pueda autorizar tu app sin necesidad de agregarlas como testers, exactamente como funciona Kommo.

---

## ❌ Problema Actual

**App en modo Development:**
- Solo permite que cuentas con roles (Admin, Developer, Tester) autoricen
- Por eso funciona con la cuenta que creó la app, pero no con otras

**Necesitamos:**
- App en modo **Live** (público)
- Permisos públicos configurados
- Cualquier cuenta puede autorizar

---

## ✅ Solución: Cambiar App a Modo Live

### **PASO 1: Verificar Requisitos de la App**

Antes de ponerla en Live, asegúrate de que la app tenga:

- ✅ **App Icon** (ícono de 1024x1024) - Ya lo tienes
- ✅ **Privacy Policy URL** - Ya la tienes: https://www.mayalife.shop/privacy-policy.html
- ✅ **Category** - Ya la seleccionaste: "Negocios y páginas"
- ✅ **App Domains** configurados
- ✅ **OAuth Redirect URIs** configurados

---

### **PASO 2: Ir a Configuración de la App**

1. **Ve a:** https://developers.facebook.com/
2. **Inicia sesión** con la cuenta que creó la app
3. **Selecciona tu App:** "CARDIO VASCULAR PLUS BOLIVIA"
4. **Menú lateral:** Ve a **"Configuración"** → **"Configuración básica"**

---

### **PASO 3: Configurar App Domains (Si falta)**

1. En **"Dominios de la aplicación"** o **"App Domains"**
2. Agrega: `mayalife.shop` (tu dominio)
3. También agrega: `alwxhiombhfyjyyziyxz.supabase.co` (para Edge Functions)

---

### **PASO 4: Verificar OAuth Redirect URIs**

1. **Menú lateral:** Ve a **"Configuración"** → **"Básico"** → **"Configuración de Facebook Login"** (o busca "OAuth Redirect URIs")
2. **Verifica que esté configurado:**
   ```
   https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/meta-oauth-callback
   ```
3. Si no está, agrégalo

---

### **PASO 5: Cambiar a Modo Live**

**⚠️ IMPORTANTE:** Antes de poner en Live, Facebook puede requerir:

1. **Revisión de permisos** para algunos permisos avanzados
2. **Para WhatsApp Business API:** Puede requerir revisión específica
3. **Para permisos básicos:** Puede funcionar sin revisión completa

#### **Opciones:**

**Opción A: Activar App (Sin Revisión Completa)**
- Ve a **"Configuración"** → **"Básico"**
- Busca el toggle **"Modo de aplicación"** o **"App Mode"**
- Cambia de **"Development"** a **"Live"**
- Facebook puede pedirte completar algunos campos

**Opción B: Usar App Review (Solo para Permisos Avanzados)**
- Si necesitas permisos avanzados, ve a **"App Review"**
- Pero para OAuth básico con WhatsApp Business, puede no ser necesario

---

### **PASO 6: Configurar Permisos Públicos**

1. **Menú lateral:** Ve a **"Permisos y características"** o **"App Review"**
2. **Verifica los permisos que usas:**
   - `whatsapp_business_management`
   - `whatsapp_business_messaging`
   - `business_management`
3. **Para cada permiso:**
   - Si está en modo **"Development"**, puede requerir revisión para público
   - Pero para **uso interno** (tu propia app), puede funcionar en Live sin revisión completa

---

### **PASO 7: Probar con Otra Cuenta**

1. **Cierra sesión** de Facebook completamente
2. **Abre tu CRM** en modo incógnito (o otro navegador)
3. **Haz clic en "Conectar con Meta"**
4. **Inicia sesión** con una cuenta diferente (Producto 1)
5. **Debería funcionar** sin error

---

## ⚠️ Notas Importantes

### **Permisos de WhatsApp Business API:**

Facebook puede requerir:
- **Revisión de App** para algunos permisos
- **Verificación de negocio** para WhatsApp Business
- **Para uso interno:** Puede funcionar sin revisión completa

### **Si Facebook pide Revisión:**

Para OAuth básico y permisos estándar de WhatsApp Business:
- Puedes explicar que es para **uso interno**
- Puedes mostrar tu política de privacidad
- Puedes mostrar que es una app de gestión propia

---

## 🎯 Resumen

**Para que funcione como Kommo:**

1. ✅ Verificar que la app tenga todos los campos requeridos
2. ✅ Configurar App Domains y OAuth Redirect URIs
3. ✅ Cambiar modo de **Development** a **Live**
4. ✅ Configurar permisos públicos (puede requerir revisión)
5. ✅ Probar con cualquier cuenta de Facebook

**¿Quieres que revisemos juntos la configuración de la app para ponerla en Live?** 🚀


