# 🔧 Troubleshooting: OAuth para WhatsApp

## 🐛 Problemas Comunes y Soluciones

---

## ❌ Error: "No se pudo abrir la ventana de OAuth"

### Causas Posibles:
1. Bloqueador de popups activo
2. Navegador no permite ventanas emergentes
3. Error en la construcción de la URL OAuth

### Soluciones:
1. **Deshabilitar bloqueador de popups:**
   - Chrome: Configuración → Privacidad y seguridad → Configuración de sitios → Ventanas emergentes y redirecciones
   - Firefox: Configuración → Privacidad y seguridad → Permisos → Bloquear ventanas emergentes
   - Edge: Configuración → Cookies y permisos de sitio → Ventanas emergentes y redirecciones

2. **Verificar variables de entorno:**
   ```bash
   # Verificar que estas variables están configuradas:
   VITE_META_APP_ID=tu_app_id
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   ```

3. **Verificar consola del navegador:**
   - Abre DevTools (F12)
   - Ve a la pestaña "Console"
   - Busca errores relacionados con OAuth

---

## ❌ Error: "OAuth cancelado por el usuario"

### Causas Posibles:
1. Usuario cerró la ventana OAuth
2. Usuario rechazó la autorización en Meta

### Soluciones:
1. **Intentar nuevamente:**
   - Haz clic en "Conectar con Meta" nuevamente
   - Asegúrate de autorizar la aplicación en Meta

2. **Verificar permisos en Meta:**
   - Ve a Meta Developer Console
   - Verifica que la App tiene los permisos necesarios
   - Verifica que el usuario tiene acceso al WhatsApp Business Account

---

## ❌ Error: "Error al intercambiar code: [mensaje]"

### Causas Posibles:
1. Code OAuth inválido o expirado
2. Variables de entorno incorrectas
3. Edge Function no desplegada o con errores

### Soluciones:
1. **Verificar variables de entorno en Supabase:**
   - Ve a Supabase Dashboard → Settings → Edge Functions → Secrets
   - Verifica que `META_APP_ID` y `META_APP_SECRET` están configurados

2. **Verificar Edge Function:**
   - Ve a Supabase Dashboard → Edge Functions
   - Verifica que `meta-oauth-callback` está desplegada
   - Revisa los logs de la función para errores

3. **Verificar Redirect URI:**
   - Debe coincidir exactamente con el configurado en Meta Developer Console
   - Formato: `https://[PROJECT_REF].supabase.co/functions/v1/meta-oauth-callback`

---

## ❌ Error: "No se pudieron obtener los detalles del número"

### Causas Posibles:
1. Access Token inválido o expirado
2. Phone Number ID incorrecto
3. Permisos insuficientes en Meta

### Soluciones:
1. **Verificar Access Token:**
   - El token debe ser válido y no expirado
   - Verifica que tienes permisos para acceder al número

2. **Verificar Phone Number ID:**
   - Debe ser el ID correcto del número de teléfono
   - Verifica en Meta Developer Console → WhatsApp → Phone Numbers

3. **Verificar permisos:**
   - Debes ser administrador del WhatsApp Business Account
   - Verifica en Meta Business Manager

---

## ❌ El formulario no se llena después de OAuth

### Causas Posibles:
1. Error en el callback de OAuth
2. Error al procesar los datos
3. Problema de comunicación entre popup y ventana principal

### Soluciones:
1. **Verificar consola del navegador:**
   - Abre DevTools (F12)
   - Ve a la pestaña "Console"
   - Busca errores relacionados con OAuth

2. **Verificar que el popup se cerró:**
   - El popup debe cerrarse automáticamente después de OAuth
   - Si no se cierra, puede haber un error en el callback

3. **Refrescar la página:**
   - Intenta refrescar la página (F5)
   - Vuelve a intentar el flujo OAuth

---

## ❌ Modal QR no aparece cuando debería

### Causas Posibles:
1. El número no requiere coexistencia
2. Error al obtener el QR
3. Error en la verificación de coexistencia

### Soluciones:
1. **Verificar si el número requiere coexistencia:**
   - Algunos números no requieren QR si ya están configurados
   - Verifica en Meta Developer Console

2. **Verificar logs:**
   - Revisa los logs de la Edge Function
   - Busca errores relacionados con coexistencia

3. **Crear cuenta manualmente:**
   - Si el modal QR no aparece, puedes crear la cuenta manualmente
   - Configura la coexistencia después desde Meta Developer Console

---

## ❌ Error: "State inválido o expirado"

### Causas Posibles:
1. El state OAuth expiró (5 minutos)
2. El state no coincide con el guardado

### Soluciones:
1. **Intentar nuevamente:**
   - El state expira después de 5 minutos
   - Haz clic en "Conectar con Meta" nuevamente

2. **Limpiar localStorage:**
   - Abre DevTools (F12)
   - Ve a Application → Local Storage
   - Elimina las claves relacionadas con OAuth
   - Refresca la página

---

## ❌ Error: "No se puede verificar origen del mensaje"

### Causas Posibles:
1. El mensaje viene de un origen no permitido
2. Problema de CORS

### Soluciones:
1. **Verificar configuración:**
   - Verifica que `VITE_SUPABASE_URL` está configurado correctamente
   - Verifica que el Redirect URI coincide

2. **Verificar que el popup es del mismo dominio:**
   - El popup debe redirigir a `oauth-callback.html` en el mismo dominio
   - Verifica que el archivo existe en `public/oauth-callback.html`

---

## 🔍 Verificación de Configuración

### Checklist de Verificación:

1. **Meta Developer Console:**
   - [ ] App creada
   - [ ] Producto "WhatsApp" agregado
   - [ ] Redirect URI configurado
   - [ ] App ID y App Secret disponibles

2. **Supabase:**
   - [ ] Edge Function `meta-oauth-callback` desplegada
   - [ ] Variables de entorno configuradas:
     - [ ] `META_APP_ID`
     - [ ] `META_APP_SECRET`
     - [ ] `META_OAUTH_REDIRECT_URI`
   - [ ] Tabla `whatsapp_accounts` existe
   - [ ] Migración `005_whatsapp_oauth_fields.sql` ejecutada

3. **Frontend:**
   - [ ] Variables de entorno configuradas:
     - [ ] `VITE_META_APP_ID`
     - [ ] `VITE_SUPABASE_URL`
   - [ ] Archivo `public/oauth-callback.html` existe
   - [ ] Componente `AccountForm` importa las utilidades OAuth

---

## 📞 Obtener Ayuda

Si ninguno de estos pasos resuelve el problema:

1. **Revisa los logs:**
   - Consola del navegador (F12)
   - Logs de Supabase Edge Functions
   - Logs de Meta Developer Console

2. **Documenta el error:**
   - Captura de pantalla del error
   - Mensaje de error completo
   - Pasos para reproducir

3. **Contacta al administrador:**
   - Proporciona la documentación del error
   - Proporciona los logs relevantes

---

## 🔗 Recursos Útiles

- [Documentación de Meta OAuth](https://developers.facebook.com/docs/facebook-login/guides/advanced/manual-flow)
- [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Guía de Uso OAuth](./GUIA_USO_OAUTH.md)

---

**Última actualización:** 2025-01-02

