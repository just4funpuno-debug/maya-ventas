# ✅ Confirmación: App Maestra (Como Kommo)

## 🎯 Tu Entendimiento Correcto

**UN App de Facebook (App Maestra)**
- Todos los productos se conectan a esta misma App
- Cada producto autoriza con SU propia cuenta de Facebook/Meta Business Account
- Cada producto obtiene SUS propios tokens

**✅ Exactamente como funciona Kommo.**

---

## 📊 Estructura Correcta

### **App Maestra (Compartida):**

```
UN SOLO App de Facebook
├── App ID: 1253651046588346 (tu App actual)
├── App Secret: xxxxx
└── Redirect URI: https://.../meta-oauth-callback
```

### **Conexión por Producto:**

```
PRODUCTO 1: "Cardio Plus"
├── Meta Business Account 1 (separada)
├── Hace OAuth con App Maestra
├── Autoriza con SU cuenta de Facebook (Meta Business Account 1)
├── Obtiene tokens ÚNICOS de Producto 1
└── WhatsApp Account 1 (+591 11111111)

PRODUCTO 2: "Flex 60"
├── Meta Business Account 2 (separada)
├── Hace OAuth con App Maestra
├── Autoriza con SU cuenta de Facebook (Meta Business Account 2)
├── Obtiene tokens ÚNICOS de Producto 2
└── WhatsApp Account 2 (+591 22222222)

PRODUCTO 3: "Producto X"
├── Meta Business Account 3 (separada)
├── Hace OAuth con App Maestra
├── Autoriza con SU cuenta de Facebook (Meta Business Account 3)
├── Obtiene tokens ÚNICOS de Producto 3
└── WhatsApp Account 3 (+591 33333333)
```

---

## 🔄 Flujo de OAuth (Como Kommo)

### **PASO 1: Producto 1 quiere conectar**

```
Usuario (Producto 1):
1. Clic "Conectar con Meta"
2. Redirige a OAuth con App Maestra
   https://www.facebook.com/v18.0/dialog/oauth?
     client_id=APP_MAESTRA_ID ← Mismo para todos
     &state=PRODUCTO_1_UUID ← Identifica qué producto
```

### **PASO 2: Autorización**

```
Usuario (Producto 1):
→ Inicia sesión con SU cuenta de Facebook
→ (Meta Business Account 1)
→ Autoriza permisos para App Maestra
→ Meta redirige a callback
```

### **PASO 3: Callback y Tokens**

```
Kommo/Tu Sistema:
1. Recibe code + state (identifica Producto 1)
2. Intercambia code por access_token usando App Maestra
3. Obtiene datos de Graph API:
   - Business Account ID de Producto 1
   - Phone Numbers de Producto 1
   - Tokens ÚNICOS de Producto 1
4. Guarda en BD asociado a Producto 1
```

### **PASO 4: Producto 2 quiere conectar**

```
Usuario (Producto 2):
1. Clic "Conectar con Meta"
2. Redirige a OAuth con App Maestra (mismo App)
   https://www.facebook.com/v18.0/dialog/oauth?
     client_id=APP_MAESTRA_ID ← Mismo App
     &state=PRODUCTO_2_UUID ← Identifica Producto 2
3. Autoriza con SU cuenta (Meta Business Account 2)
4. Obtiene tokens ÚNICOS de Producto 2
```

**✅ Todos usan el mismo App, pero cada uno autoriza con SU cuenta.**

---

## 💾 Estructura en Base de Datos

### **Tabla: whatsapp_accounts**

```sql
CREATE TABLE whatsapp_accounts (
  id UUID PRIMARY KEY,
  product_id UUID NOT NULL,
  
  -- Todos usan el mismo App Maestra
  meta_app_id VARCHAR(50) DEFAULT '1253651046588346', -- App Maestra
  
  -- Pero cada uno tiene su propia cuenta de Meta
  meta_user_id VARCHAR(50), -- ID de la cuenta de Facebook del producto
  
  -- Tokens únicos por producto
  phone_number_id VARCHAR(50) UNIQUE NOT NULL,
  business_account_id VARCHAR(50) NOT NULL,
  access_token TEXT NOT NULL, -- Token ÚNICO del producto
  oauth_access_token TEXT,
  oauth_refresh_token TEXT,
  
  phone_number VARCHAR(20) NOT NULL,
  display_name VARCHAR(100),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **Ejemplo de Datos:**

```sql
-- Producto 1
INSERT INTO whatsapp_accounts VALUES (
  'uuid-account-1',
  'uuid-producto-1',
  '1253651046588346',        -- App Maestra (mismo)
  'user_meta_producto_1',    -- Meta User ID (diferente)
  'phone_id_1',              -- Phone Number ID (único)
  'business_id_1',           -- Business Account ID (único)
  'token_producto_1',        -- Access Token (único)
  ...
);

-- Producto 2
INSERT INTO whatsapp_accounts VALUES (
  'uuid-account-2',
  'uuid-producto-2',
  '1253651046588346',        -- App Maestra (mismo)
  'user_meta_producto_2',    -- Meta User ID (diferente)
  'phone_id_2',              -- Phone Number ID (único)
  'business_id_2',           -- Business Account ID (único)
  'token_producto_2',        -- Access Token (único)
  ...
);
```

**✅ `meta_app_id` es el mismo, pero `access_token` y `meta_user_id` son diferentes.**

---

## 🔒 Aislamiento y Seguridad

### **Cómo se mantiene el aislamiento:**

1. **Tokens únicos por producto:**
   - Producto 1 tiene `access_token_1`
   - Producto 2 tiene `access_token_2`
   - **No se comparten tokens**

2. **Cuentas Meta separadas:**
   - Producto 1 → Meta Business Account 1
   - Producto 2 → Meta Business Account 2
   - **Cada producto autoriza con SU cuenta**

3. **Aislamiento en BD:**
   - Todo filtrado por `product_id`
   - Cada producto solo ve sus datos

4. **Webhook identifica por `phone_number_id`:**
   - Meta envía webhook con `phone_number_id`
   - Sistema busca en BD qué `product_id` tiene ese `phone_number_id`
   - Routea mensaje al producto correcto

---

## ✅ Ventajas de App Maestra

### **1. Simplicidad:**
- ✅ Solo configuras OAuth una vez
- ✅ Mismo App para todos
- ✅ Menos mantenimiento

### **2. Aislamiento mantiene:**
- ✅ Cada producto tiene sus propios tokens
- ✅ Cada producto autoriza con SU cuenta
- ✅ Si bloquean publicidad del Producto 1, WhatsApp sigue funcionando (diferentes cuentas Meta)

### **3. Escalabilidad:**
- ✅ Fácil agregar nuevos productos
- ✅ Todos usan el mismo flujo
- ✅ Mismo webhook para todos

---

## 🎯 Comparación con Tu Estrategia de Publicidad

### **Publicidad:**
```
Cada producto tiene:
- SU propia cuenta de Facebook (Meta Business Account)
- SU propia configuración de publicidad
```

### **WhatsApp (App Maestra):**
```
Todos los productos tienen:
- Mismo App de Facebook (App Maestra)
- Pero cada uno autoriza con SU propia cuenta de Facebook
- Cada uno obtiene SUS propios tokens
```

**✅ Consistente: Cada producto tiene SU cuenta de Facebook separada.**

**La diferencia:** 
- **Publicidad:** Apps separados (si los tienes)
- **WhatsApp:** App Maestra compartida (más simple)

**Pero ambos mantienen:** Cuentas Meta separadas por producto ✅

---

## 📋 Implementación Actual

### **Ya tienes la estructura correcta:**

1. ✅ **OAuth funcionando** con App Maestra
2. ✅ **Edge Function** configurado
3. ✅ **BD** con `meta_app_id`, `meta_user_id`, `access_token` por cuenta
4. ✅ **Webhook** identifica por `phone_number_id`

**Solo necesitas asegurarte de:**
- ✅ Usar el mismo `META_APP_ID` para todos (App Maestra)
- ✅ Cada producto autoriza con SU cuenta de Facebook
- ✅ Guardar `meta_user_id` diferente por producto

---

## ✅ Confirmación Final

**SÍ, así funciona:**

1. ✅ **UN App de Facebook (App Maestra)** - Compartida por todos
2. ✅ **Cada producto autoriza con SU cuenta** de Facebook/Meta Business Account
3. ✅ **Cada producto obtiene SUS tokens únicos**
4. ✅ **Aislamiento se mantiene** porque:
   - Tokens diferentes
   - Cuentas Meta diferentes
   - Filtrado por `product_id` en BD

**✅ Exactamente como Kommo.**

---

## 🚀 Próximos Pasos

Tu sistema ya está configurado así. Solo asegúrate de:

1. ✅ **Usar el mismo `META_APP_ID`** para todos los productos
2. ✅ **Cada producto hace OAuth** con su propia cuenta de Facebook
3. ✅ **Guardar `meta_user_id`** diferente por producto (ya lo haces)

**¿Ya tienes esto configurado correctamente o necesitas algún ajuste?** 🎯


