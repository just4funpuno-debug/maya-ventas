# 📘 Guía de Uso: OAuth para WhatsApp

## 🎯 Introducción

Esta guía explica cómo usar la funcionalidad de OAuth para conectar cuentas de WhatsApp automáticamente sin necesidad de copiar y pegar datos manualmente.

---

## 🚀 Inicio Rápido

### Paso 1: Acceder a la Configuración de WhatsApp

1. Inicia sesión en la aplicación Maya Ventas
2. Ve a **Administración** → **WhatsApp**
3. Haz clic en **"Agregar Cuenta"** o **"Nueva Cuenta"**

### Paso 2: Conectar con Meta

1. En el formulario de nueva cuenta, verás un botón **"Conectar con Meta"**
2. Haz clic en el botón
3. Se abrirá una ventana emergente de Meta (Facebook)
4. Inicia sesión con tu cuenta de Facebook que tiene acceso al WhatsApp Business Account
5. Autoriza la aplicación para acceder a tus datos de WhatsApp

### Paso 3: Completar la Configuración

1. Después de autorizar, la ventana se cerrará automáticamente
2. El formulario se llenará automáticamente con:
   - Phone Number ID
   - Business Account ID
   - Número de teléfono
   - Nombre para mostrar

3. Si tu número requiere **coexistencia** (escanear QR):
   - Se mostrará un modal con el código QR
   - Escanea el código QR con tu teléfono
   - El sistema verificará automáticamente cuando se conecte

4. Completa los campos restantes:
   - **Verify Token**: Genera uno único y guárdalo
   - **Producto Asociado** (opcional): Selecciona un producto si aplica
   - **Cuenta Activa**: Marca si quieres que esté activa inmediatamente

5. Haz clic en **"Crear Cuenta"**

---

## 🔄 Flujo Completo

```
Usuario → Click "Conectar con Meta" 
  → Ventana OAuth de Meta 
  → Usuario autoriza 
  → Edge Function procesa datos 
  → Formulario se llena automáticamente 
  → (Si necesita coexistencia) Modal QR aparece 
  → Usuario escanea QR 
  → Sistema verifica conexión 
  → Usuario completa formulario 
  → Cuenta creada ✅
```

---

## 📋 Requisitos Previos

### 1. Configuración en Meta Developer Console

- ✅ App de Meta creada
- ✅ Producto "WhatsApp" agregado
- ✅ Redirect URI configurado: `https://[PROJECT_REF].supabase.co/functions/v1/meta-oauth-callback`
- ✅ Variables de entorno configuradas en Supabase:
  - `META_APP_ID`
  - `META_APP_SECRET`
  - `META_OAUTH_REDIRECT_URI`

### 2. Permisos de Facebook

- ✅ Debes tener acceso al WhatsApp Business Account
- ✅ Debes ser administrador o tener permisos suficientes

---

## 🎨 Interfaz de Usuario

### Botón "Conectar con Meta"

- **Ubicación**: Formulario de nueva cuenta WhatsApp
- **Apariencia**: Botón azul con icono de enlace externo
- **Estado**: 
  - Normal: "Conectar con Meta"
  - Cargando: "Conectando con Meta..." (con spinner)

### Modal QR (si aplica)

- **Cuándo aparece**: Cuando el número requiere coexistencia
- **Qué muestra**: 
  - Código QR para escanear
  - Número de teléfono
  - Estado de conexión (pendiente/conectado/error)
- **Acciones**:
  - Escanear QR con tu teléfono
  - Cancelar (cierra el modal)

---

## ⚠️ Casos Especiales

### Coexistencia Requerida

Si tu número de WhatsApp ya está conectado a WhatsApp Web o a otra aplicación, necesitarás escanear un código QR para permitir la coexistencia.

**Pasos:**
1. El modal QR aparecerá automáticamente
2. Abre WhatsApp en tu teléfono
3. Ve a **Configuración** → **Dispositivos vinculados**
4. Toca **"Vincular un dispositivo"**
5. Escanea el código QR que aparece en el modal
6. El sistema verificará automáticamente cuando se conecte

### Error de Autorización

Si Meta rechaza la autorización:
- Verifica que tienes permisos en el WhatsApp Business Account
- Verifica que la App de Meta está configurada correctamente
- Intenta nuevamente

### Error de Conexión

Si hay un error al conectar:
- Verifica tu conexión a internet
- Verifica que las variables de entorno están configuradas
- Contacta al administrador del sistema

---

## 🔧 Método Manual (Alternativa)

Si prefieres o necesitas ingresar los datos manualmente:

1. En el formulario, completa los campos manualmente:
   - Phone Number ID
   - Business Account ID
   - Access Token
   - Verify Token
   - Número de teléfono
   - Nombre para mostrar

2. Haz clic en **"Crear Cuenta"**

**Nota**: El método manual y OAuth pueden coexistir. Puedes tener cuentas creadas con ambos métodos.

---

## 📊 Verificación de Cuenta Creada

Después de crear la cuenta:

1. Verifica que aparece en la lista de cuentas
2. Verifica que el estado es **"Activa"** (si lo marcaste)
3. Verifica que el **Método de Conexión** muestra:
   - **"OAuth"** si usaste OAuth
   - **"Manual"** si ingresaste datos manualmente

---

## 🆘 Solución de Problemas

### El botón "Conectar con Meta" no aparece

- Verifica que estás creando una **nueva cuenta** (no editando)
- Verifica que las variables de entorno están configuradas

### La ventana OAuth no se abre

- Verifica que tu navegador permite ventanas emergentes
- Intenta deshabilitar bloqueadores de popups

### El formulario no se llena después de OAuth

- Verifica la consola del navegador para errores
- Verifica que la Edge Function está desplegada
- Intenta refrescar la página y volver a intentar

### El modal QR no aparece cuando debería

- Verifica que el número requiere coexistencia
- Verifica la consola del navegador para errores
- Intenta crear la cuenta manualmente y configurar coexistencia después

---

## 📚 Recursos Adicionales

- [Documentación de Meta OAuth](https://developers.facebook.com/docs/facebook-login/guides/advanced/manual-flow)
- [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Coexistencia de WhatsApp](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/coexistence)

---

## ✅ Checklist de Verificación

Antes de usar OAuth, verifica:

- [ ] App de Meta creada y configurada
- [ ] Redirect URI agregado en Meta Developer Console
- [ ] Variables de entorno configuradas en Supabase
- [ ] Edge Function `meta-oauth-callback` desplegada
- [ ] Tienes permisos en el WhatsApp Business Account
- [ ] Navegador permite ventanas emergentes

---

**¿Necesitas ayuda?** Consulta la sección de [Troubleshooting](./TROUBLESHOOTING_OAUTH.md) o contacta al administrador del sistema.

