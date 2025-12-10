# 🏢 Cómo Kommo Conecta MúLTIPLES Clientes con Coexistencia

## 🎯 Pregunta Específica

**¿Cómo Kommo logra que cientos/miles de clientes diferentes, cada uno con su propio número de WhatsApp, se conecten a través de la WhatsApp Cloud API usando coexistencia?**

---

## 📊 Arquitectura Multi-Tenant de Kommo

### **Estructura General:**

```
KOMMO (Plataforma SaaS)
│
├── Cliente 1: "Empresa A"
│   ├── Meta Business Account 1
│   ├── Facebook App 1 (o App compartido)
│   ├── WhatsApp Number: +591 11111111
│   ├── Access Token 1
│   └── Webhook → kommo.com/webhooks/whatsapp?client=1
│
├── Cliente 2: "Empresa B"
│   ├── Meta Business Account 2
│   ├── Facebook App 2 (o App compartido)
│   ├── WhatsApp Number: +591 22222222
│   ├── Access Token 2
│   └── Webhook → kommo.com/webhooks/whatsapp?client=2
│
└── Cliente 3: "Empresa C"
    ├── Meta Business Account 3
    ├── Facebook App 3 (o App compartido)
    ├── WhatsApp Number: +591 33333333
    ├── Access Token 3
    └── Webhook → kommo.com/webhooks/whatsapp?client=3
```

**Cada cliente tiene su propio ecosistema completamente aislado.**

---

## 🔐 OPCIÓN 1: App de Facebook Compartido (Más Común)

### **Estructura:**

```
UN SOLO App de Facebook (de Kommo)
│
├── Cliente 1 autoriza con SU cuenta → Obtiene tokens
├── Cliente 2 autoriza con SU cuenta → Obtiene tokens
└── Cliente 3 autoriza con SU cuenta → Obtiene tokens
```

### **Cómo Funciona:**

1. **Kommo crea UN App de Facebook:**
   - App ID: `kommo_whatsapp_app_123456`
   - App Secret: `kommo_secret_xxxxx`
   - Redirect URI: `kommo.com/oauth/callback`

2. **Cada cliente hace OAuth:**
   ```
   Cliente 1:
   → Autoriza con SU cuenta de Facebook (Meta Business Account 1)
   → Kommo obtiene tokens de ACCESO A SU CUENTA
   → Kommo guarda tokens en BD asociados a Cliente 1
   
   Cliente 2:
   → Autoriza con SU cuenta de Facebook (Meta Business Account 2)
   → Kommo obtiene tokens de ACCESO A SU CUENTA
   → Kommo guarda tokens en BD asociados a Cliente 2
   ```

3. **Kommo almacena en BD:**
   ```sql
   -- Tabla: clients_whatsapp
   client_id | phone_number_id | access_token | business_account_id | meta_user_id
   1         | 123...          | token_1      | 456...             | user_meta_1
   2         | 789...          | token_2      | 012...             | user_meta_2
   3         | 345...          | token_3      | 678...             | user_meta_3
   ```

**✅ Todos usan el mismo App, pero cada uno autoriza con SU propia cuenta.**

---

## 🌐 OPCIÓN 2: Apps Separados por Cliente

### **Estructura:**

```
App 1 (Cliente 1)
App 2 (Cliente 2)
App 3 (Cliente 3)
```

### **Cuándo se usa:**

- Clientes enterprise que requieren máximo aislamiento
- Requisitos de seguridad específicos
- Múltiples apps de Kommo (p.ej., Kommo USA, Kommo Europe)

**⚠️ Más complejo, menos común para clientes pequeños.**

---

## 🔄 Flujo de Conexión para Cada Cliente

### **PASO 1: Cliente inicia conexión**

```
Cliente → Kommo Dashboard
       → WhatsApp → Conectar cuenta
       → Clic "Conectar con WhatsApp"
```

### **PASO 2: OAuth de Meta**

```
Kommo redirige a Meta OAuth:
https://www.facebook.com/v18.0/dialog/oauth?
  client_id=KOMMO_APP_ID (mismo para todos)
  &redirect_uri=kommo.com/oauth/callback
  &state=CLIENT_1_UUID (identifica qué cliente)
  &scope=whatsapp_business_management,whatsapp_business_messaging
```

**El `state` contiene el ID del cliente para saber a quién pertenece la autorización.**

### **PASO 3: Cliente autoriza**

```
Cliente → Inicia sesión con SU cuenta de Facebook
       → Ve permisos solicitados
       → Clic "Autorizar"
```

### **PASO 4: Kommo procesa callback**

```
Meta redirige a:
kommo.com/oauth/callback?code=XXX&state=CLIENT_1_UUID

Kommo:
1. Valida state → Identifica Cliente 1
2. Intercambia code por access_token (para Cliente 1)
3. Obtiene Business Account ID (de Cliente 1)
4. Obtiene Phone Numbers (de Cliente 1)
5. Guarda en BD asociado a Cliente 1
```

### **PASO 5: Configuración de Coexistencia**

```
Kommo verifica si el número necesita coexistencia:
→ Llama a Graph API con access_token del Cliente 1
→ Verifica estado de coexistencia
→ Si no está activa, inicia proceso:
   - Genera QR o código
   - Muestra al Cliente 1
   - Cliente 1 escanea/conecta desde WhatsApp Business
   - Kommo verifica conexión
```

**✅ Coexistencia configurada individualmente para cada cliente.**

---

## 📨 Gestión de Webhooks Multi-Cliente

### **Problema:**

**Meta solo permite UN webhook URL por App de Facebook.**

### **Solución de Kommo:**

#### **Opción A: Webhook Compartido (Más Común)**

```
1. UN webhook URL para todos:
   kommo.com/webhooks/whatsapp

2. Webhook recibe mensaje con:
   {
     "object": "whatsapp_business_account",
     "entry": [{
       "changes": [{
         "value": {
           "messages": [...],
           "metadata": {
             "phone_number_id": "123..." ← Identifica cliente
           }
         }
       }]
     }]
   }

3. Kommo busca en BD:
   SELECT client_id FROM clients_whatsapp 
   WHERE phone_number_id = '123...'
   
4. Routea mensaje al Cliente correcto
```

**✅ El `phone_number_id` en el webhook identifica a qué cliente pertenece.**

---

#### **Opción B: Webhook con parámetros (Si múltiples Apps)**

```
Si cada cliente tiene su App:
- webhook?client=1
- webhook?client=2
- webhook?client=3

Meta configura webhook diferente por App
```

---

## 🔑 Gestión de Access Tokens

### **Kommo almacena:**

```sql
-- Tabla: whatsapp_access_tokens
CREATE TABLE whatsapp_access_tokens (
  id UUID PRIMARY KEY,
  client_id UUID NOT NULL,
  phone_number_id VARCHAR(50) NOT NULL,
  access_token TEXT NOT NULL, -- Encriptado
  token_type VARCHAR(20), -- 'user_access_token' o 'system_user_token'
  expires_at TIMESTAMPTZ, -- NULL si es permanente
  refresh_token TEXT, -- Si está disponible
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- Índices para búsqueda rápida
CREATE INDEX idx_tokens_client ON whatsapp_access_tokens(client_id);
CREATE INDEX idx_tokens_phone ON whatsapp_access_tokens(phone_number_id);
```

### **Cuándo usa cada token:**

1. **Enviar mensajes:**
   ```javascript
   // Kommo busca token del cliente
   const token = await getAccessToken(clientId, phoneNumberId);
   
   // Usa token para enviar
   fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
     headers: {
       'Authorization': `Bearer ${token}`
     }
   });
   ```

2. **Recibir webhooks:**
   ```javascript
   // Webhook identifica cliente por phone_number_id
   const clientId = await getClientByPhoneNumberId(phoneNumberId);
   
   // Procesa mensaje para ese cliente
   await processMessageForClient(clientId, message);
   ```

---

## 🔄 Renovación Automática de Tokens

### **Kommo tiene workers que:**

1. **Verifican tokens expirados:**
   ```javascript
   // Cada hora
   cron('0 * * * *', async () => {
     const expiringTokens = await getTokensExpiringSoon();
     
     for (const token of expiringTokens) {
       // Renovar token usando refresh_token
       const newToken = await refreshAccessToken(token.refresh_token);
       
       // Actualizar en BD
       await updateToken(token.id, newToken);
     }
   });
   ```

2. **Notifican si no se puede renovar:**
   ```
   Token expirado → Notificar al cliente
                 → Cliente debe re-autorizar
                 → OAuth de nuevo
   ```

---

## 📊 Base de Datos Multi-Cliente

### **Estructura típica:**

```sql
-- Clientes
CREATE TABLE clients (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255),
  subscription_plan VARCHAR(50),
  created_at TIMESTAMPTZ
);

-- Cuentas WhatsApp de cada cliente
CREATE TABLE client_whatsapp_accounts (
  id UUID PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  phone_number_id VARCHAR(50) UNIQUE NOT NULL,
  business_account_id VARCHAR(50) NOT NULL,
  access_token TEXT NOT NULL, -- Encriptado
  phone_number VARCHAR(20) NOT NULL,
  display_name VARCHAR(100),
  coexistence_status VARCHAR(20),
  created_at TIMESTAMPTZ
);

-- Mensajes (aislados por cliente)
CREATE TABLE whatsapp_messages (
  id UUID PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  account_id UUID REFERENCES client_whatsapp_accounts(id),
  contact_id UUID,
  message_id VARCHAR(100),
  content TEXT,
  direction VARCHAR(20), -- 'inbound' o 'outbound'
  created_at TIMESTAMPTZ
);

-- Secuencias (por cliente)
CREATE TABLE whatsapp_sequences (
  id UUID PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  account_id UUID REFERENCES client_whatsapp_accounts(id),
  name VARCHAR(255),
  created_at TIMESTAMPTZ
);
```

**✅ Todo está aislado por `client_id`.**

---

## 🔒 Seguridad y Aislamiento

### **Kommo garantiza:**

1. **Aislamiento de datos:**
   - Cada query incluye `WHERE client_id = ?`
   - Tokens encriptados en BD
   - Webhooks validan origen (Meta)

2. **Aislamiento de tokens:**
   - Cada cliente tiene SU access_token
   - Tokens NO se comparten entre clientes
   - Si un token se compromete, solo afecta a ese cliente

3. **Aislamiento de webhooks:**
   - Webhook identifica cliente por `phone_number_id`
   - Mensajes se routean solo al cliente correcto

---

## 🎯 Resumen: Cómo Kommo lo Hace

### **1. UN App de Facebook (o pocos):**
   - Todos los clientes usan el mismo App
   - Cada cliente autoriza con SU cuenta

### **2. OAuth por cliente:**
   - Cada cliente hace OAuth independientemente
   - Kommo obtiene tokens únicos por cliente
   - Tokens guardados en BD asociados al cliente

### **3. Webhook compartido:**
   - UN webhook URL para todos
   - `phone_number_id` identifica al cliente
   - Kommo routea mensajes correctamente

### **4. BD multi-tenant:**
   - Todo aislado por `client_id`
   - Cada cliente tiene sus propios:
     - Números
     - Tokens
     - Mensajes
     - Secuencias

### **5. Coexistencia individual:**
   - Cada cliente configura coexistencia con SU número
   - QR/código generado por cliente
   - Verificación independiente

---

## 💡 Para tu Sistema

### **Ya tienes la base:**

✅ Multi-tenant (productos = clientes)  
✅ OAuth funcionando  
✅ Webhooks configurados  
✅ BD con aislamiento por producto/account  

### **Puedes mejorar:**

1. **Refresh tokens automáticos:**
   - Workers que renueven tokens expirados

2. **Webhook routing optimizado:**
   - Cache de `phone_number_id` → `account_id`

3. **Gestión de múltiples Apps:**
   - Si implementas Apps por producto (como discutimos)

---

## ✅ Conclusión

**Kommo conecta múltiples clientes así:**

1. **UN App de Facebook** (o pocos)
2. **OAuth individual** → Cada cliente autoriza con SU cuenta
3. **Tokens únicos** → Guardados en BD por cliente
4. **Webhook compartido** → `phone_number_id` identifica cliente
5. **BD multi-tenant** → Todo aislado por `client_id`
6. **Coexistencia individual** → Cada cliente configura la suya

**Tu sistema puede hacer lo mismo siguiendo esta arquitectura.** 🚀

**¿Quieres que implementemos alguna mejora específica basada en esto?** 💪


