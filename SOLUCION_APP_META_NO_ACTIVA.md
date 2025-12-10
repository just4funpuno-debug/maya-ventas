# 🔧 Solución: "La app no está activa" en Meta

## 🔴 Problema

Al hacer clic en "Conectar con Meta", aparece el error:
> **"La app no está activa"**
> 
> "No se puede acceder a esta app en este momento y su desarrollador ya está al tanto del problema. Podrás iniciar sesión cuando se reactive."

## ✅ Solución: Activar la App en Meta Developer Console

### Paso 1: Ir a Meta Developer Console

1. Ve a: https://developers.facebook.com/apps/
2. Inicia sesión con tu cuenta de Facebook
3. Selecciona tu App: **"CARDIO VASCULAR PLUS BOLIVIA"** (App ID: 1253651046588346)

### Paso 2: Verificar Estado de la App

1. En el menú lateral izquierdo, ve a **"Configuración"** → **"Básica"**
2. Busca la sección **"Estado de la app"** o **"App Status"**
3. Verifica que la app esté en modo **"En desarrollo"** o **"En vivo"**

### Paso 3: Activar la App (si está inactiva)

Si la app está **inactiva** o **deshabilitada**:

1. Ve a **"Configuración"** → **"Básica"**
2. Busca **"Estado de la app"**
3. Si está deshabilitada, haz clic en **"Activar"** o **"Enable"**
4. Acepta los términos y condiciones si se solicitan

### Paso 4: Verificar Productos Agregados

La app necesita tener estos productos agregados:

1. Ve a **"Productos"** en el menú lateral
2. Verifica que tengas agregados:
   - ✅ **WhatsApp** (requerido para OAuth de WhatsApp)
   - ✅ **Facebook Login** (requerido para habilitar OAuth)

Si falta alguno:
- Haz clic en **"+ Agregar producto"**
- Busca y agrega **"WhatsApp"**
- Busca y agrega **"Facebook Login"**

### Paso 5: Verificar Modo de la App

1. Ve a **"Configuración"** → **"Básica"**
2. Busca **"Modo de la app"** o **"App Mode"**
3. Debe estar en:
   - **"En desarrollo"** (Development) - Para pruebas
   - **"En vivo"** (Live) - Para producción

### Paso 6: Verificar Usuarios de Prueba (si está en modo desarrollo)

Si la app está en **"En desarrollo"**:

1. Ve a **"Roles"** → **"Roles"** en el menú lateral
2. Verifica que tu cuenta de Facebook esté agregada como:
   - **Administrador** o
   - **Desarrollador** o
   - **Usuario de prueba**

Si no estás agregado:
- Haz clic en **"Agregar personas"**
- Agrega tu cuenta de Facebook como **"Administrador"**

### Paso 7: Verificar Configuración de OAuth

1. Ve a **"Productos"** → **"Facebook Login"** → **"Configuración"**
2. Verifica que **"Valid OAuth Redirect URIs"** tenga:
   ```
   https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/meta-oauth-callback
   ```
3. Si falta, agrégalo y guarda

### Paso 8: Verificar Permisos de WhatsApp

1. Ve a **"Productos"** → **"WhatsApp"** → **"Configuración"**
2. Verifica que tengas acceso a un **WhatsApp Business Account**
3. Si no tienes, necesitas crear uno o solicitar acceso

---

## 🔍 Verificación Rápida

### Checklist:

- [ ] App está activa (no deshabilitada)
- [ ] Producto "WhatsApp" agregado
- [ ] Producto "Facebook Login" agregado
- [ ] Redirect URI configurado en Facebook Login
- [ ] Tu cuenta está como Administrador/Desarrollador
- [ ] App está en modo "En desarrollo" o "En vivo"
- [ ] Tienes acceso a WhatsApp Business Account

---

## ⚠️ Problemas Comunes

### "La app está en modo desarrollo pero no puedo acceder"

**Solución:** Agrega tu cuenta como Administrador o Usuario de prueba en **"Roles"** → **"Roles"**.

### "No veo la opción de activar la app"

**Solución:** 
- Verifica que seas Administrador de la app
- Algunas apps requieren verificación de negocio para activarse
- Contacta al administrador de la app si no eres el dueño

### "La app está activa pero sigue dando error"

**Solución:**
1. Espera 5-10 minutos (puede haber delay en la propagación)
2. Limpia caché del navegador (Ctrl+Shift+Delete)
3. Intenta en modo incógnito
4. Verifica que el Redirect URI esté exactamente como se muestra arriba

---

## 📞 Si el Problema Persiste

1. **Verifica los logs de Meta:**
   - Ve a **"Herramientas"** → **"Registro de actividad"**
   - Busca errores relacionados con OAuth

2. **Verifica el estado del servicio:**
   - Ve a: https://developers.facebook.com/status/
   - Verifica que no haya problemas con los servicios de Meta

3. **Contacta soporte de Meta:**
   - Si la app está activa pero sigue fallando
   - Puede ser un problema de permisos o configuración

---

## ✅ Después de Activar

Una vez que la app esté activa:

1. Espera 2-5 minutos para que los cambios se propaguen
2. Refresca el navegador en tu aplicación
3. Intenta hacer clic en **"Conectar con Meta"** nuevamente
4. Debería abrirse la ventana de autorización de Facebook correctamente

---

**¿Necesitas ayuda con algún paso específico?** Puedo guiarte paso a paso.


