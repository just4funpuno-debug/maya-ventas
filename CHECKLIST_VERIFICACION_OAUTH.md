# ✅ Checklist de Verificación OAuth

## 📋 Pre-Configuración

### Meta Developer Console
- [ ] App de Meta creada
- [ ] Producto "WhatsApp" agregado a la App
- [ ] Producto "Facebook Login" agregado (para habilitar Redirect URIs)
- [ ] Redirect URI agregado: `https://[PROJECT_REF].supabase.co/functions/v1/meta-oauth-callback`
- [ ] App ID obtenido
- [ ] App Secret obtenido
- [ ] Permisos de WhatsApp configurados

### Supabase
- [ ] Proyecto Supabase creado
- [ ] Migración `001_whatsapp_hybrid_schema.sql` ejecutada
- [ ] Migración `005_whatsapp_oauth_fields.sql` ejecutada
- [ ] Edge Function `meta-oauth-callback` desplegada
- [ ] Variables de entorno configuradas en Supabase:
  - [ ] `META_APP_ID`
  - [ ] `META_APP_SECRET`
  - [ ] `META_OAUTH_REDIRECT_URI`

### Frontend
- [ ] Variables de entorno configuradas en `.env.local`:
  - [ ] `VITE_META_APP_ID`
  - [ ] `VITE_SUPABASE_URL`
  - [ ] `VITE_SUPABASE_ANON_KEY`
- [ ] Archivo `public/oauth-callback.html` existe
- [ ] Componente `AccountForm` importa utilidades OAuth
- [ ] Componente `QRModal` existe y funciona

---

## 🧪 Testing

### Tests Unitarios
- [ ] Tests de utilidades OAuth pasando (`tests/whatsapp/oauth.test.js`)
- [ ] Tests de Graph API pasando (`tests/whatsapp/meta-graph-api.test.js`)
- [ ] Tests de coexistencia pasando (`tests/whatsapp/coexistence-checker.test.js`)

### Tests de Integración
- [ ] Tests de flujo OAuth pasando (`tests/whatsapp/oauth-flow.test.js`)
- [ ] Tests de compatibilidad manual pasando (`tests/whatsapp/oauth-manual-compatibility.test.js`)
- [ ] Tests E2E pasando (`tests/whatsapp/oauth-e2e.test.js`)

### Tests Manuales
- [ ] Flujo OAuth completo funciona
- [ ] Formulario se llena automáticamente
- [ ] Modal QR aparece cuando es necesario
- [ ] Coexistencia se verifica correctamente
- [ ] Cuenta se crea exitosamente
- [ ] Método manual sigue funcionando

---

## 🎯 Funcionalidad

### Flujo OAuth
- [ ] Botón "Conectar con Meta" aparece en formulario de nueva cuenta
- [ ] Click en botón abre ventana OAuth de Meta
- [ ] Usuario puede autorizar la aplicación
- [ ] Callback procesa correctamente los datos
- [ ] Formulario se llena automáticamente con datos de OAuth
- [ ] State OAuth se valida correctamente
- [ ] State OAuth expira después de 5 minutos

### Coexistencia
- [ ] Modal QR aparece cuando el número requiere coexistencia
- [ ] QR se muestra correctamente
- [ ] Polling verifica estado de coexistencia
- [ ] Modal se cierra cuando coexistencia se verifica
- [ ] Estado de coexistencia se actualiza en BD

### Creación de Cuenta
- [ ] Cuenta se crea con `connection_method = 'oauth'`
- [ ] Campos OAuth se guardan correctamente:
  - [ ] `meta_app_id`
  - [ ] `meta_user_id`
  - [ ] `oauth_access_token`
  - [ ] `oauth_refresh_token`
  - [ ] `oauth_expires_at`
  - [ ] `coexistence_status`
- [ ] Cuenta aparece en la lista de cuentas
- [ ] Cuenta se puede editar después de crear

### Compatibilidad
- [ ] Método manual sigue funcionando
- [ ] Cuentas OAuth y manual pueden coexistir
- [ ] Validación funciona igual para ambos métodos
- [ ] Actualización funciona para ambos métodos

---

## 🔒 Seguridad

- [ ] State OAuth es único y aleatorio
- [ ] State OAuth expira después de 5 minutos
- [ ] State OAuth se valida antes de procesar callback
- [ ] Access Token no se expone en el frontend
- [ ] Redirect URI se valida en Edge Function
- [ ] CORS está configurado correctamente
- [ ] Variables de entorno no están expuestas en el frontend

---

## 📊 Base de Datos

- [ ] Tabla `whatsapp_accounts` tiene campos OAuth:
  - [ ] `meta_app_id`
  - [ ] `meta_user_id`
  - [ ] `oauth_access_token`
  - [ ] `oauth_refresh_token`
  - [ ] `oauth_expires_at`
  - [ ] `connection_method`
  - [ ] `coexistence_status`
  - [ ] `coexistence_qr_url`
  - [ ] `coexistence_verified_at`
- [ ] Índices creados para campos OAuth
- [ ] RLS (Row Level Security) configurado correctamente
- [ ] Datos de OAuth se guardan correctamente

---

## 🚀 Despliegue

- [ ] Edge Function desplegada en Supabase
- [ ] Variables de entorno configuradas en producción
- [ ] Redirect URI configurado en Meta Developer Console (producción)
- [ ] Archivo `oauth-callback.html` desplegado
- [ ] Frontend desplegado con variables de entorno correctas

---

## 📝 Documentación

- [ ] Guía de uso creada (`GUIA_USO_OAUTH.md`)
- [ ] Guía de troubleshooting creada (`TROUBLESHOOTING_OAUTH.md`)
- [ ] Checklist de verificación creada (este archivo)
- [ ] Documentación técnica actualizada
- [ ] README actualizado con instrucciones OAuth

---

## ✅ Verificación Final

### Flujo Completo End-to-End
1. [ ] Usuario hace click en "Conectar con Meta"
2. [ ] Ventana OAuth se abre
3. [ ] Usuario autoriza la aplicación
4. [ ] Callback procesa datos
5. [ ] Formulario se llena automáticamente
6. [ ] (Si aplica) Modal QR aparece
7. [ ] (Si aplica) Usuario escanea QR
8. [ ] (Si aplica) Coexistencia se verifica
9. [ ] Usuario completa formulario
10. [ ] Cuenta se crea exitosamente
11. [ ] Cuenta aparece en la lista
12. [ ] Cuenta funciona correctamente

---

## 🎉 Criterios de Éxito

- ✅ Todos los tests pasando
- ✅ Flujo OAuth funciona end-to-end
- ✅ Coexistencia funciona cuando es necesario
- ✅ Método manual sigue funcionando
- ✅ Documentación completa
- ✅ Sin errores en consola
- ✅ Sin errores en logs de Supabase

---

**Fecha de Verificación:** _______________

**Verificado por:** _______________

**Notas:** _______________

