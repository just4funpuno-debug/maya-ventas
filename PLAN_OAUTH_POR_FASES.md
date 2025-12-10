# 🚀 Plan OAuth Meta - Por Fases

## 🎯 Objetivo

Implementar conexión automática de cuentas WhatsApp usando OAuth de Meta, eliminando la necesidad de copiar/pegar datos manualmente.

---

## 📋 FASE 0: Preparación y Análisis (COMPLETADA)

- ✅ Analizar schema actual
- ✅ Identificar campos necesarios
- ✅ Planificar migración
- ✅ Documentar flujo OAuth

**Resultado:** Schema actual es compatible, solo necesitamos agregar campos OAuth.

---

## 📋 FASE 1: Migración de Base de Datos (1-2 horas)

### Objetivo:
Agregar campos necesarios para OAuth en `whatsapp_accounts`.

### Tareas:
- [ ] Crear migración `005_whatsapp_oauth_fields.sql`
- [ ] Agregar campos:
  - `meta_app_id`
  - `meta_user_id`
  - `oauth_access_token`
  - `oauth_refresh_token`
  - `oauth_expires_at`
  - `connection_method`
  - `coexistence_status`
  - `coexistence_qr_url`
  - `coexistence_verified_at`
- [ ] Agregar índices
- [ ] Agregar comentarios
- [ ] Ejecutar migración
- [ ] Verificar cambios

### Archivos:
- `supabase/migrations/005_whatsapp_oauth_fields.sql`
- `scripts/test-oauth-fields.sql` (verificación)

### Criterios de Éxito:
- ✅ Migración ejecutada sin errores
- ✅ Campos agregados correctamente
- ✅ Índices creados
- ✅ Compatibilidad con datos existentes mantenida

---

## 📋 FASE 2: Configuración Meta Developer Console (30 min)

### Objetivo:
Configurar OAuth en Meta Developer Console.

### Tareas:
- [ ] Obtener App ID y App Secret
- [ ] Configurar OAuth Redirect URI:
  - `https://[project-ref].supabase.co/functions/v1/meta-oauth-callback`
- [ ] Configurar permisos:
  - `whatsapp_business_management`
  - `whatsapp_business_messaging`
  - `business_management`
- [ ] Agregar variables de entorno:
  - `META_APP_ID`
  - `META_APP_SECRET`
  - `META_OAUTH_REDIRECT_URI`

### Archivos:
- `.env.local` (actualizar)
- `CONFIGURAR_OAUTH_META.md` (documentación)

### Criterios de Éxito:
- ✅ OAuth configurado en Meta
- ✅ Redirect URI agregado
- ✅ Permisos configurados
- ✅ Variables de entorno listas

---

## 📋 FASE 3: Edge Function OAuth Callback (3-4 horas)

### Objetivo:
Crear Edge Function que procesa el callback de OAuth.

### Tareas:
- [ ] Crear `supabase/functions/meta-oauth-callback/index.ts`
- [ ] Implementar:
  - Recibir `code` y `state`
  - Validar `state` (seguridad)
  - Intercambiar `code` por `access_token`
  - Obtener Business Account ID
  - Obtener Phone Numbers
  - Generar Access Token permanente
  - Iniciar proceso de coexistencia (si necesario)
  - Crear cuenta en BD
  - Retornar datos o QR
- [ ] Manejo de errores
- [ ] Logging

### Archivos:
- `supabase/functions/meta-oauth-callback/index.ts`
- `supabase/functions/meta-oauth-callback/README.md`

### Criterios de Éxito:
- ✅ Edge Function desplegada
- ✅ Callback procesa correctamente
- ✅ Obtiene datos de Graph API
- ✅ Crea cuenta en BD
- ✅ Maneja errores correctamente

---

## 📋 FASE 4: Servicio Graph API (2-3 horas)

### Objetivo:
Crear servicio para interactuar con Meta Graph API.

### Tareas:
- [ ] Crear `src/services/whatsapp/meta-graph-api.js`
- [ ] Implementar funciones:
  - `exchangeCodeForToken(code)`
  - `getBusinessAccounts(accessToken)`
  - `getPhoneNumbers(businessAccountId, accessToken)`
  - `generatePermanentToken(businessAccountId, accessToken)`
  - `initiateCoexistence(phoneNumberId, accessToken)`
- [ ] Manejo de errores
- [ ] Validación de respuestas

### Archivos:
- `src/services/whatsapp/meta-graph-api.js`
- `src/services/whatsapp/meta-graph-api.test.js` (tests)

### Criterios de Éxito:
- ✅ Servicio obtiene datos correctamente
- ✅ Maneja errores de API
- ✅ Valida respuestas
- ✅ Tests pasando

---

## 📋 FASE 5: UI - Botón Conectar con Meta (2-3 horas)

### Objetivo:
Agregar botón "Conectar con Meta" en el formulario.

### Tareas:
- [ ] Modificar `AccountForm.jsx`
- [ ] Agregar botón "Conectar con Meta"
- [ ] Implementar `handleConnectMeta()`:
  - Generar `state` (UUID)
  - Construir URL OAuth
  - Abrir popup o redirigir
  - Escuchar callback
- [ ] Mostrar loading durante proceso
- [ ] Manejar errores

### Archivos:
- `src/components/whatsapp/AccountForm.jsx` (modificar)
- `src/components/whatsapp/MetaConnectButton.jsx` (nuevo, opcional)

### Criterios de Éxito:
- ✅ Botón visible y funcional
- ✅ Abre OAuth correctamente
- ✅ Procesa callback
- ✅ Muestra estados (loading, success, error)

---

## 📋 FASE 6: Modal QR para Coexistencia (2-3 horas)

### Objetivo:
Mostrar QR en modal si Meta requiere escanear para coexistencia.

### Tareas:
- [ ] Crear `src/components/whatsapp/QRModal.jsx`
- [ ] Integrar con flujo OAuth
- [ ] Mostrar QR cuando sea necesario
- [ ] Detectar cuando se escaneó
- [ ] Continuar proceso automáticamente
- [ ] Manejar timeout (si no se escanea)

### Archivos:
- `src/components/whatsapp/QRModal.jsx`
- `src/services/whatsapp/coexistence-checker.js` (verificar estado)

### Criterios de Éxito:
- ✅ Modal muestra QR correctamente
- ✅ Detecta cuando se escaneó
- ✅ Continúa proceso automáticamente
- ✅ Maneja timeout

---

## 📋 FASE 7: Integración y Testing (2-3 horas)

### Objetivo:
Integrar todo y probar flujo completo.

### Tareas:
- [ ] Probar flujo completo OAuth
- [ ] Probar con coexistencia (QR)
- [ ] Probar sin coexistencia (código)
- [ ] Verificar datos en BD
- [ ] Probar método manual (compatibilidad)
- [ ] Tests E2E
- [ ] Documentación

### Archivos:
- `tests/whatsapp/oauth-flow.test.js`
- `GUIA_USO_OAUTH.md` (documentación)

### Criterios de Éxito:
- ✅ Flujo completo funciona
- ✅ Coexistencia funciona
- ✅ Método manual sigue funcionando
- ✅ Tests pasando
- ✅ Documentación completa

---

## 📊 Resumen de Fases

| Fase | Descripción | Tiempo | Prioridad |
|------|-------------|--------|-----------|
| 0 | Preparación | ✅ | ✅ |
| 1 | Migración BD | 1-2h | 🔥 Crítica |
| 2 | Config Meta | 30min | 🔥 Crítica |
| 3 | Edge Function | 3-4h | 🔥 Crítica |
| 4 | Graph API Service | 2-3h | 🔥 Crítica |
| 5 | UI Botón | 2-3h | ⚡ Importante |
| 6 | Modal QR | 2-3h | ⚡ Importante |
| 7 | Testing | 2-3h | ⚡ Importante |

**Tiempo Total:** 13-19 horas (2-3 días)

---

## 🎯 Orden de Implementación Recomendado

1. **FASE 1** - Migración BD (base)
2. **FASE 2** - Config Meta (necesario para testing)
3. **FASE 3** - Edge Function (core)
4. **FASE 4** - Graph API Service (depende de FASE 3)
5. **FASE 5** - UI Botón (depende de FASE 3 y 4)
6. **FASE 6** - Modal QR (depende de FASE 5)
7. **FASE 7** - Testing (todo integrado)

---

## ✅ Checklist Pre-Implementación

- [ ] Schema analizado ✅
- [ ] Plan de fases definido ✅
- [ ] Variables de entorno identificadas
- [ ] Permisos Meta identificados
- [ ] Flujo OAuth documentado

---

**¿Listo para comenzar FASE 1?**

