# 📱 Guía Completa: WhatsApp API Cloud por Coexistencia - Vinculación al CRM

**Fecha:** 2025-01-30  
**Versión:** 1.0  
**Proyecto:** Maya Ventas - CRM WhatsApp

---

## 🎯 ¿Qué es Coexistencia en WhatsApp API Cloud?

**Coexistencia** permite usar el **mismo número de WhatsApp** simultáneamente para:

1. ✅ **WhatsApp Business App** (en tu celular) - Envíos manuales
2. ✅ **WhatsApp Cloud API** (automático) - Envíos automáticos gratis en ventanas activas
3. ✅ **Puppeteer Bot** (automático) - Envíos cuando Cloud API no es gratis

**Todo funciona con el mismo número, sin conflictos.**

---

## 🏗️ Arquitectura de la Integración

### Flujo General

```
┌─────────────────────────────────────────────────────────────┐
│                    Usuario en el CRM                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ WhatsApp > Configuración > Gestión de Cuentas         │  │
│  │                                                         │  │
│  │  Opción 1: Conectar con Meta (OAuth) ⭐               │  │
│  │  Opción 2: Configuración Manual                       │  │
│  └───────────────────────────────────────────────────────┘  │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              Meta Developer Console (OAuth)                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 1. Usuario autoriza aplicación                        │  │
│  │ 2. OAuth callback a Edge Function                    │  │
│  │ 3. Verificación de coexistencia                      │  │
│  └───────────────────────────────────────────────────────┘  │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│        Supabase Edge Function: meta-oauth-callback          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 1. Recibe código OAuth                                │  │
│  │ 2. Intercambia por Access Token                       │  │
│  │ 3. Obtiene datos del número (Graph API)              │  │
│  │ 4. Verifica coexistencia (code_verification_status)   │  │
│  │ 5. Guarda en whatsapp_accounts                        │  │
│  └───────────────────────────────────────────────────────┘  │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              Base de Datos: whatsapp_accounts               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ - phone_number_id                                     │  │
│  │ - business_account_id                                 │  │
│  │ - access_token                                        │  │
│  │ - coexistence_status: pending/connected/failed        │  │
│  │ - connection_method: oauth/manual                     │  │
│  └───────────────────────────────────────────────────────┘  │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│            CRM: Componentes y Servicios                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ AccountForm  │  │ WhatsAppDash │  │   Chat       │      │
│  │              │  │ board        │  │   Window     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Componentes del Sistema

### 1. **Frontend - Componentes React**

#### `src/components/whatsapp/AccountForm.jsx`
**Propósito:** Formulario para crear/editar cuentas WhatsApp

**Funcionalidades:**
- Botón "Conectar con Meta" (OAuth)
- Campos manuales (Phone Number ID, Business Account ID, Access Token, etc.)
- Modal QR para verificación de coexistencia
- Validación de campos

**Flujo OAuth:**
```javascript
1. Usuario hace click en "Conectar con Meta"
2. Se genera state único para OAuth
3. Se abre popup con URL de autorización de Meta
4. Usuario autoriza en Meta
5. Callback vuelve a Edge Function
6. Edge Function procesa y retorna datos
7. AccountForm recibe datos y llena formulario
8. Si necesita coexistencia, muestra modal QR
9. Polling verifica estado de coexistencia
10. Cuando está conectado, guarda en BD
```

#### `src/components/whatsapp/WhatsAppAccountManager.jsx`
**Propósito:** Gestor principal de cuentas

**Funcionalidades:**
- Lista todas las cuentas configuradas
- Filtrado por productos
- CRUD completo de cuentas
- Suscripción en tiempo real (Supabase Realtime)

#### `src/components/whatsapp/QRModal.jsx`
**Propósito:** Modal para mostrar QR de coexistencia

**Funcionalidades:**
- Muestra QR code si es necesario
- Instrucciones para escanear
- Polling para verificar estado
- Indicadores de estado (pending/connected/failed)

---

### 2. **Backend - Edge Functions**

#### `supabase/functions/meta-oauth-callback/index.ts`
**Propósito:** Maneja el callback de OAuth de Meta

**Proceso:**
```typescript
1. Recibe código OAuth y state
2. Valida state (seguridad)
3. Intercambia código por Access Token
4. Obtiene Permanent Access Token (System User)
5. Obtiene Business Account ID
6. Obtiene Phone Numbers
7. Obtiene detalles del Phone Number (incluyendo code_verification_status)
8. Verifica coexistencia:
   - code_verification_status === 'VERIFIED' → connected
   - code_verification_status !== 'VERIFIED' → pending
9. Genera Verify Token automáticamente
10. Guarda en whatsapp_accounts con todos los datos
11. Retorna datos al frontend
```

**Campos que guarda:**
- `phone_number_id` - ID del número de teléfono
- `business_account_id` - ID de la cuenta de negocio
- `access_token` - Token permanente de acceso
- `verify_token` - Token para webhook (generado automáticamente)
- `phone_number` - Número legible (ej: +591 12345678)
- `display_name` - Nombre para mostrar
- `connection_method` - 'oauth' o 'manual'
- `coexistence_status` - 'pending', 'connected', o 'failed'
- `meta_app_id` - ID de la app de Meta
- `meta_user_id` - ID del usuario que autorizó

---

### 3. **Servicios - Funciones JavaScript**

#### `src/services/whatsapp/meta-graph-api.js`
**Propósito:** Interacción con Meta Graph API

**Funciones clave:**

**`getPhoneNumberDetails(phoneNumberId, accessToken)`**
```javascript
// Obtiene detalles del número incluyendo estado de verificación
// Campo crítico: code_verification_status
// Valores posibles:
//   - 'VERIFIED' → Coexistencia activa
//   - Otro valor → Necesita verificación
```

**`checkCoexistenceStatus(phoneNumberId, accessToken)`**
```javascript
// Verifica estado de coexistencia
// Retorna:
//   {
//     status: 'connected' | 'pending' | 'failed',
//     needs_action: boolean,
//     verification_status: string
//   }
```

**`getWhatsAppAccountData(accessToken)`**
```javascript
// Función de conveniencia que obtiene todos los datos necesarios:
// 1. User Info
// 2. Business Accounts
// 3. Phone Numbers
// 4. Phone Number Details (incluyendo coexistencia)
```

#### `src/services/whatsapp/coexistence-checker.js`
**Propósito:** Verificación y polling de coexistencia

**Funciones:**

**`checkCoexistenceStatus(phoneNumberId, accessToken)`**
- Verifica estado actual de coexistencia
- Usa `getPhoneNumberDetails` internamente
- Verifica campo `code_verification_status`

**`startCoexistenceVerification(phoneNumberId, accessToken, onStatusChange, options)`**
- Inicia polling periódico
- Verifica cada 5 segundos (configurable)
- Máximo 60 intentos (5 minutos)
- Notifica cambios de estado via callback
- Retorna función para cancelar polling

---

### 4. **Base de Datos - Esquema**

#### Tabla: `whatsapp_accounts`

```sql
CREATE TABLE whatsapp_accounts (
  id UUID PRIMARY KEY,
  
  -- Datos básicos
  phone_number_id VARCHAR(50) UNIQUE NOT NULL,
  business_account_id VARCHAR(50) NOT NULL,
  access_token TEXT NOT NULL,
  verify_token VARCHAR(100) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  display_name VARCHAR(100),
  product_id UUID, -- Referencia a products (opcional)
  active BOOLEAN DEFAULT true,
  
  -- OAuth y Coexistencia
  meta_app_id VARCHAR(50),
  meta_user_id VARCHAR(50),
  oauth_access_token TEXT,
  oauth_refresh_token TEXT,
  oauth_expires_at TIMESTAMPTZ,
  connection_method VARCHAR(20) CHECK (connection_method IN ('manual', 'oauth')),
  coexistence_status VARCHAR(20) CHECK (coexistence_status IN ('pending', 'connected', 'failed')),
  coexistence_qr_url TEXT,
  coexistence_verified_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Campos clave para coexistencia:**
- `coexistence_status`: Estado actual ('pending', 'connected', 'failed')
- `code_verification_status` (en Meta): Se obtiene via Graph API, no se guarda directamente
- `connection_method`: Cómo se conectó ('oauth' o 'manual')

---

## 🔄 Flujo Completo de Vinculación

### Opción 1: OAuth (Recomendado) ⭐

```
┌─────────────────────────────────────────────────────────────┐
│ PASO 1: Usuario inicia conexión                             │
└─────────────────────────────────────────────────────────────┘
Usuario hace click en "Conectar con Meta" en AccountForm

┌─────────────────────────────────────────────────────────────┐
│ PASO 2: Frontend prepara OAuth                              │
└─────────────────────────────────────────────────────────────┘
- Genera state único
- Construye URL de autorización
- Abre popup con URL de Meta
- Guarda state en localStorage/sessionStorage

┌─────────────────────────────────────────────────────────────┐
│ PASO 3: Usuario autoriza en Meta                            │
└─────────────────────────────────────────────────────────────┘
Meta muestra pantalla de autorización
Usuario autoriza permisos necesarios

┌─────────────────────────────────────────────────────────────┐
│ PASO 4: Callback a Edge Function                            │
└─────────────────────────────────────────────────────────────┘
Meta redirige a: /functions/v1/meta-oauth-callback
Edge Function recibe:
  - code (código OAuth)
  - state (validación de seguridad)

┌─────────────────────────────────────────────────────────────┐
│ PASO 5: Edge Function procesa                               │
└─────────────────────────────────────────────────────────────┘
1. Valida state
2. Intercambia code por Access Token
3. Obtiene Permanent Access Token (System User)
4. Consulta Graph API:
   - Business Accounts
   - Phone Numbers
   - Phone Number Details (code_verification_status)
5. Verifica coexistencia:
   - Si code_verification_status === 'VERIFIED' → connected
   - Si no → pending
6. Genera Verify Token
7. Guarda en whatsapp_accounts

┌─────────────────────────────────────────────────────────────┐
│ PASO 6: Edge Function retorna datos                         │
└─────────────────────────────────────────────────────────────┘
Retorna JSON con:
  - phone_number_id
  - business_account_id
  - phone_number
  - display_name
  - coexistence_status
  - coexistence_needs_action

┌─────────────────────────────────────────────────────────────┐
│ PASO 7: Frontend recibe y procesa                           │
└─────────────────────────────────────────────────────────────┘
AccountForm recibe datos:
- Si coexistence_status === 'connected':
  → Llena formulario directamente
  → Usuario puede guardar
  
- Si coexistence_status === 'pending':
  → Muestra modal QR
  → Inicia polling para verificar coexistencia
  → Cuando cambia a 'connected', cierra modal
  → Llena formulario

┌─────────────────────────────────────────────────────────────┐
│ PASO 8: Usuario guarda cuenta                               │
└─────────────────────────────────────────────────────────────┘
Usuario completa campos opcionales (product_id, display_name)
Hace click en "Crear Cuenta"
AccountForm valida y llama a createAccount()
Cuenta se guarda en BD (si no se guardó ya en Edge Function)
```

### Opción 2: Manual

```
1. Usuario completa formulario manualmente:
   - Phone Number ID
   - Business Account ID
   - Access Token
   - Verify Token (generado por usuario)
   - Phone Number
   - Display Name

2. Usuario hace click en "Crear Cuenta"

3. AccountForm valida campos

4. Se guarda en whatsapp_accounts con:
   - connection_method = 'manual'
   - coexistence_status = 'pending' (por defecto)

5. Usuario puede verificar coexistencia después desde Meta Developer Console
```

---

## 🔍 Verificación de Coexistencia

### ¿Cómo se verifica?

**Método:** Consulta Graph API con campo `code_verification_status`

**Endpoint:**
```
GET https://graph.facebook.com/v21.0/{phone-number-id}?fields=code_verification_status&access_token={access_token}
```

**Respuesta:**
```json
{
  "code_verification_status": "VERIFIED"  // o "NOT_VERIFIED"
}
```

**Interpretación:**
- `VERIFIED` → Coexistencia activa ✅
- `NOT_VERIFIED` → Necesita verificación ⚠️

### ¿Dónde se verifica?

1. **En Edge Function** (`meta-oauth-callback`):
   - Al recibir callback OAuth
   - Antes de guardar en BD
   - Guarda `coexistence_status` en BD

2. **En Frontend** (`AccountForm`):
   - Si OAuth retorna `pending`
   - Muestra modal QR
   - Inicia polling cada 5 segundos
   - Usa `checkCoexistenceStatus()` de `coexistence-checker.js`

3. **En Servicios** (`meta-graph-api.js`):
   - `getPhoneNumberDetails()` obtiene `code_verification_status`
   - `checkCoexistenceStatus()` interpreta y retorna estado

---

## ✅ Checklist de Verificación

### Verificar que la integración funciona:

#### 1. **Verificar Estructura de BD**
```sql
-- Verificar que existe tabla whatsapp_accounts
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'whatsapp_accounts';

-- Verificar campos de coexistencia
SELECT 
  phone_number_id,
  phone_number,
  coexistence_status,
  connection_method,
  created_at
FROM whatsapp_accounts;
```

#### 2. **Verificar Edge Function desplegada**
```bash
# Verificar que existe
supabase functions list

# Verificar logs
supabase functions logs meta-oauth-callback
```

#### 3. **Verificar Variables de Entorno**
```env
# Frontend (.env.local)
VITE_META_APP_ID=tu_app_id
VITE_META_OAUTH_REDIRECT_URI=https://tu-proyecto.supabase.co/functions/v1/meta-oauth-callback

# Edge Function (Supabase Secrets)
META_APP_ID=tu_app_id
META_APP_SECRET=tu_app_secret
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
```

#### 4. **Verificar OAuth en Meta Developer Console**
- ✅ App creada
- ✅ WhatsApp agregado como producto
- ✅ OAuth redirect URI configurado
- ✅ Permisos necesarios solicitados:
  - `whatsapp_business_management`
  - `whatsapp_business_messaging`

#### 5. **Probar Flujo Completo**
1. ✅ Ir a "Gestión de Cuentas WhatsApp"
2. ✅ Click en "Nueva Cuenta"
3. ✅ Click en "Conectar con Meta"
4. ✅ Autorizar en Meta
5. ✅ Verificar que datos se llenan automáticamente
6. ✅ Verificar estado de coexistencia
7. ✅ Si es `pending`, verificar modal QR aparece
8. ✅ Guardar cuenta
9. ✅ Verificar que aparece en lista

---

## 🐛 Troubleshooting

### Problema: OAuth no funciona

**Síntomas:**
- Popup se cierra inmediatamente
- Error en console
- No se recibe callback

**Soluciones:**
1. Verificar `VITE_META_APP_ID` está configurado
2. Verificar `VITE_META_OAUTH_REDIRECT_URI` es correcto
3. Verificar redirect URI está en Meta Developer Console
4. Verificar Edge Function está desplegada
5. Revisar logs de Edge Function

### Problema: Coexistencia siempre "pending"

**Síntomas:**
- `coexistence_status` siempre es 'pending'
- Modal QR nunca se cierra

**Soluciones:**
1. Verificar número en Meta Developer Console:
   - Ir a WhatsApp > Phone Numbers
   - Verificar que número está "Connected"
   - Si no, hacer "Add phone number" > "Use existing number"
   - Escanear QR o ingresar código
2. Verificar `access_token` es válido
3. Verificar permisos en Graph API
4. Consultar directamente Graph API:
   ```bash
   curl "https://graph.facebook.com/v21.0/{phone-number-id}?fields=code_verification_status&access_token={access_token}"
   ```

### Problema: Datos no se guardan en BD

**Síntomas:**
- OAuth funciona pero cuenta no aparece
- Error al guardar

**Soluciones:**
1. Verificar `SUPABASE_SERVICE_ROLE_KEY` en Edge Function
2. Verificar RLS policies permiten insertar
3. Revisar logs de Edge Function
4. Verificar estructura de tabla coincide con migraciones

### Problema: Polling nunca detecta conexión

**Síntomas:**
- Modal QR queda esperando
- Polling continúa indefinidamente

**Soluciones:**
1. Verificar `access_token` usado en polling es válido
2. Verificar Graph API responde correctamente
3. Verificar número realmente está conectado en Meta
4. Aumentar tiempo de polling si es necesario
5. Cancelar polling manualmente y verificar estado en Meta Developer Console

---

## 📚 Referencias

### Documentación Externa
- [WhatsApp Cloud API - Coexistencia](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/coexistence)
- [Meta Graph API - Phone Numbers](https://developers.facebook.com/docs/graph-api/reference/phone-number/)
- [OAuth 2.0 - Meta](https://developers.facebook.com/docs/facebook-login/guides/advanced/manual-flow)

### Documentación Interna
- `COEXISTENCIA_WHATSAPP_SETUP.md` - Guía de configuración manual
- `GUIA_COEXISTENCIA_SIMPLE.md` - Guía simple sin OAuth
- `WHATSAPP_CRM_README.md` - Documentación general del CRM

---

## 🔐 Seguridad

### Tokens y Credenciales

**Access Token:**
- ⚠️ **NUNCA** exponer en frontend
- ✅ Solo usar en Edge Functions (backend)
- ✅ Usar Permanent Access Token (System User)
- ✅ Renovar cuando expire

**Verify Token:**
- ✅ Generar aleatoriamente (crypto)
- ✅ Guardar en BD
- ✅ Usar para validar webhook de Meta

**OAuth State:**
- ✅ Generar aleatoriamente por sesión
- ✅ Validar en callback
- ✅ Limpiar después de usar

### Mejores Prácticas

1. ✅ Usar HTTPS siempre
2. ✅ Validar todos los inputs
3. ✅ Usar RLS policies en Supabase
4. ✅ Limitar permisos de OAuth al mínimo necesario
5. ✅ Rotar tokens periódicamente
6. ✅ Logging seguro (no loggear tokens completos)

---

## 📝 Notas Importantes

1. **Coexistencia se configura desde Meta Developer Console:**
   - No se puede activar programáticamente
   - Usuario debe escanear QR o ingresar código manualmente
   - El sistema solo **verifica** el estado

2. **code_verification_status:**
   - Campo de solo lectura
   - Solo Meta puede cambiarlo
   - Se actualiza cuando usuario escanea QR en Meta Developer Console

3. **Polling de coexistencia:**
   - Solo necesario si estado es 'pending'
   - Se puede cancelar manualmente
   - Máximo 5 minutos (60 intentos × 5 segundos)

4. **Múltiples cuentas:**
   - Se pueden tener múltiples números
   - Cada uno se gestiona independientemente
   - Se pueden asociar a productos diferentes

---

**Última actualización:** 2025-01-30  
**Mantenedor:** Equipo de Desarrollo Maya Ventas


