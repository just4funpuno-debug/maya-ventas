# 🔍 Análisis: Schema Actual vs OAuth Automático

## 📋 Tabla Actual: `whatsapp_accounts`

### Campos Actuales:
```sql
CREATE TABLE whatsapp_accounts (
  id UUID PRIMARY KEY,
  phone_number_id VARCHAR(50) UNIQUE NOT NULL,
  business_account_id VARCHAR(50) NOT NULL,
  access_token TEXT NOT NULL,
  verify_token VARCHAR(100) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  display_name VARCHAR(100),
  product_id UUID,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## ✅ ¿Sirve para OAuth Automático?

### **SÍ, pero necesitamos agregar campos:**

### Campos que YA tenemos (suficientes):
- ✅ `phone_number_id` - Se obtiene automáticamente
- ✅ `business_account_id` - Se obtiene automáticamente
- ✅ `access_token` - Se obtiene automáticamente
- ✅ `verify_token` - Se genera automáticamente
- ✅ `phone_number` - Se obtiene automáticamente
- ✅ `display_name` - Se obtiene automáticamente
- ✅ `product_id` - Se asigna manualmente (opcional)
- ✅ `active` - Se puede activar automáticamente

### Campos que FALTAN para OAuth:
- ❌ `meta_app_id` - ID de la App de Meta (para OAuth)
- ❌ `meta_user_id` - ID del usuario que autorizó
- ❌ `oauth_access_token` - Token de OAuth (temporal, para obtener datos)
- ❌ `oauth_refresh_token` - Token para renovar OAuth
- ❌ `oauth_expires_at` - Cuándo expira el token OAuth
- ❌ `connection_method` - 'manual' | 'oauth' (para saber cómo se conectó)
- ❌ `coexistence_status` - 'pending' | 'connected' | 'failed' (estado de coexistencia)
- ❌ `coexistence_qr_url` - URL del QR si necesita escanearse
- ❌ `coexistence_verified_at` - Cuándo se verificó coexistencia

---

## 🔧 Cambios Necesarios en Schema

### Migración: `005_whatsapp_oauth_fields.sql`

```sql
-- Agregar campos para OAuth
ALTER TABLE whatsapp_accounts
  ADD COLUMN IF NOT EXISTS meta_app_id VARCHAR(50),
  ADD COLUMN IF NOT EXISTS meta_user_id VARCHAR(50),
  ADD COLUMN IF NOT EXISTS oauth_access_token TEXT,
  ADD COLUMN IF NOT EXISTS oauth_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS oauth_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS connection_method VARCHAR(20) 
    CHECK (connection_method IN ('manual', 'oauth')) 
    DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS coexistence_status VARCHAR(20)
    CHECK (coexistence_status IN ('pending', 'connected', 'failed'))
    DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS coexistence_qr_url TEXT,
  ADD COLUMN IF NOT EXISTS coexistence_verified_at TIMESTAMPTZ;

-- Índices para búsquedas
CREATE INDEX IF NOT EXISTS idx_whatsapp_accounts_meta_app_id 
  ON whatsapp_accounts(meta_app_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_accounts_connection_method 
  ON whatsapp_accounts(connection_method);
CREATE INDEX IF NOT EXISTS idx_whatsapp_accounts_coexistence_status 
  ON whatsapp_accounts(coexistence_status);

-- Comentarios
COMMENT ON COLUMN whatsapp_accounts.meta_app_id IS 'ID de la App de Meta (para OAuth)';
COMMENT ON COLUMN whatsapp_accounts.connection_method IS 'Método de conexión: manual (formulario) o oauth (automático)';
COMMENT ON COLUMN whatsapp_accounts.coexistence_status IS 'Estado de coexistencia: pending (esperando QR), connected (conectado), failed (falló)';
```

---

## 🔄 Flujo con OAuth vs Manual

### Flujo Manual (Actual):
```
1. Usuario llena formulario
2. Copia/pega datos de Meta Developer Console
3. Guarda cuenta
4. Configura webhook manualmente
```

### Flujo OAuth (Nuevo):
```
1. Usuario hace clic "Conectar con Meta"
2. Autoriza OAuth
3. Sistema obtiene datos automáticamente
4. Si necesita coexistencia:
   - Muestra QR en modal
   - Usuario escanea
   - Sistema detecta conexión
5. Cuenta creada automáticamente
6. Webhook configurado automáticamente (opcional)
```

---

## ✅ Compatibilidad

### **Las tablas actuales SÍ sirven**, solo necesitamos:

1. **Agregar campos OAuth** (migración 005)
2. **Modificar UI** para soportar ambos métodos
3. **Edge Function** para OAuth callback
4. **Servicio** para obtener datos de Graph API

### **NO necesitamos:**
- ❌ Cambiar estructura de otras tablas
- ❌ Modificar relaciones existentes
- ❌ Cambiar lógica de contactos/mensajes
- ❌ Modificar funciones SQL existentes

---

## 📋 Resumen de Cambios

### Base de Datos:
- ✅ Agregar campos OAuth a `whatsapp_accounts`
- ✅ Mantener compatibilidad con método manual
- ✅ Agregar índices para búsquedas

### Frontend:
- ✅ Modificar `AccountForm.jsx` para soportar OAuth
- ✅ Agregar botón "Conectar con Meta"
- ✅ Modal para QR (si necesario)
- ✅ Mantener formulario manual como opción

### Backend:
- ✅ Edge Function para OAuth callback
- ✅ Servicio para Graph API
- ✅ Lógica de coexistencia automática

---

## 🎯 Conclusión

**✅ Las tablas actuales SIRVEN para OAuth**

Solo necesitamos:
1. Agregar campos OAuth (migración simple)
2. Implementar flujo OAuth
3. Mantener compatibilidad con método manual

**No hay conflictos ni cambios mayores necesarios.**

