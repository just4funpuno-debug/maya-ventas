# 🚀 SUBFASE 3.6: Crear Cuenta en Base de Datos - Implementación

## 📋 Objetivo

Conectar a Supabase y crear/actualizar la cuenta de WhatsApp en la base de datos con todos los datos obtenidos de OAuth.

---

## ✅ Implementación

### 1. Cliente de Supabase

- ✅ Función `getSupabaseClient()` para obtener cliente con service_role key
- ✅ Usa `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` de variables de entorno
- ✅ Configuración para Edge Functions (no persistir sesión)

### 2. Verificación de Cuenta Existente

- ✅ Verificar si ya existe una cuenta con el mismo `phone_number_id`
- ✅ Si existe → Actualizar
- ✅ Si no existe → Crear nueva

### 3. Datos a Guardar

- ✅ **Campos básicos:**
  - `phone_number_id`
  - `business_account_id`
  - `access_token` (permanente de OAuth)
  - `verify_token` (generado automáticamente)
  - `phone_number`
  - `display_name`

- ✅ **Campos OAuth:**
  - `connection_method = 'oauth'`
  - `meta_app_id`
  - `meta_user_id` (obtenido de Graph API `/me`)
  - `oauth_access_token`
  - `oauth_expires_at`

- ✅ **Campos de coexistencia:**
  - `coexistence_status`
  - `coexistence_qr_url`
  - `coexistence_verified_at`

- ✅ **Otros:**
  - `active = true`

### 4. Manejo de Errores

- ✅ Validar que Supabase client se crea correctamente
- ✅ Manejar errores de inserción/actualización
- ✅ Retornar errores descriptivos

### 5. Obtener Meta User ID

- ✅ Llamar a Graph API `/me` para obtener `meta_user_id`
- ✅ Si falla, continuar sin él (no crítico)

---

## 🔐 Seguridad

- ✅ Usar `SUPABASE_SERVICE_ROLE_KEY` para operaciones de BD
- ✅ No exponer tokens completos en respuestas
- ✅ Validar datos antes de insertar

---

## 📝 Próximos Pasos

**SUBFASE 3.7:** Retornar Respuesta y Manejo de Errores
- Retornar respuesta JSON con datos de cuenta creada
- O retornar QR si necesita coexistencia
- Manejo robusto de errores
- Logging para debugging
- CORS headers

---

## ✅ Checklist SUBFASE 3.6

- [x] Conectar a Supabase
- [x] Verificar cuenta existente
- [x] Insertar/actualizar en `whatsapp_accounts`
- [x] Guardar `connection_method = 'oauth'`
- [x] Guardar `meta_user_id` y `meta_app_id`
- [x] Guardar estado de coexistencia
- [x] Manejar errores de BD
- [x] Obtener Meta User ID de Graph API
- [ ] Redesplegar función ⏳
- [ ] Testing ⏳

---

**Estado:** ✅ **Código implementado** - Pendiente redesplegar

