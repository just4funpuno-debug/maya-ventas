# 🔐 Edge Function: Meta OAuth Callback

## 📋 Descripción

Edge Function que procesa el callback de OAuth de Meta cuando un usuario autoriza la conexión de su cuenta de WhatsApp.

**URL:** `https://[project-ref].supabase.co/functions/v1/meta-oauth-callback`

---

## 🔄 Flujo

1. Usuario hace clic "Conectar con Meta" en la app
2. Se redirige a Meta OAuth para autorizar
3. Meta redirige aquí con `?code=XXX&state=YYY`
4. Edge Function:
   - Valida `state` (seguridad)
   - Intercambia `code` por `access_token`
   - Obtiene datos de Graph API
   - Crea cuenta en BD
   - Retorna respuesta

---

## 📋 Subfases de Implementación

- ✅ **SUBFASE 3.1:** Estructura Base y Validación
- ⏳ **SUBFASE 3.2:** Intercambiar Code por Access Token
- ⏳ **SUBFASE 3.3:** Obtener Datos de Graph API
- ⏳ **SUBFASE 3.4:** Generar Tokens
- ⏳ **SUBFASE 3.5:** Proceso de Coexistencia
- ⏳ **SUBFASE 3.6:** Crear Cuenta en BD
- ⏳ **SUBFASE 3.7:** Respuestas y Errores

---

## 🔐 Variables de Entorno Requeridas

Estas variables deben estar configuradas en Supabase Edge Functions Secrets:

- `META_APP_ID` - ID de la App de Meta
- `META_APP_SECRET` - Secret de la App de Meta
- `META_OAUTH_REDIRECT_URI` - URI de redirección OAuth

---

## 🧪 Testing

Ver `FASE_3_TESTING_PLAN.md` para detalles de testing por subfase.

---

## 📚 Documentación

- `FASE_3_PLAN_DETALLADO_SUBFASES.md` - Plan completo
- `FASE_3_TESTING_PLAN.md` - Plan de testing
- `FASE_3_PROGRESO.md` - Estado actual

---

**Última actualización:** 2025-12-02

