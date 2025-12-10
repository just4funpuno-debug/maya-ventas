# 🔄 Flujo OAuth Meta - Detallado Técnico

## 🎯 Flujo Completo Paso a Paso

### 1. Usuario en la App

```
Usuario → WhatsApp > Administración > WhatsApp
Usuario → Clic en "Nueva Cuenta"
Usuario → Ve botón "Conectar con Meta" (nuevo)
Usuario → Clic en "Conectar con Meta"
```

### 2. Redirección a Meta OAuth

```
App → Abre ventana/popup:
https://www.facebook.com/v18.0/dialog/oauth?
  client_id=META_APP_ID
  &redirect_uri=https://[project-ref].supabase.co/functions/v1/meta-oauth-callback
  &scope=whatsapp_business_management,whatsapp_business_messaging,business_management
  &response_type=code
  &state=uuid_generado_para_seguridad
```

### 3. Usuario Autoriza

```
Meta → Muestra pantalla de login (si no está logueado)
Meta → Muestra permisos solicitados
Usuario → Clic "Autorizar"
Meta → Redirige a callback con `code`
```

### 4. Edge Function Procesa

```
Callback recibe:
- code: código de autorización
- state: UUID para verificar

Edge Function:
1. Valida state
2. Intercambia code por access_token
3. Usa access_token para obtener:
   - Business Account ID
   - Phone Numbers (lista)
   - Genera Access Token permanente
4. Si necesita coexistencia:
   - Inicia proceso de vinculación
   - Retorna QR o código
5. Crea cuenta en BD automáticamente
6. Retorna datos a la app
```

### 5. App Recibe Datos

```
App recibe:
- account_id (UUID de la cuenta creada)
- phone_number_id
- business_account_id
- access_token (encriptado en BD)
- verify_token (generado automáticamente)
- phone_number
- display_name

App muestra:
- ✅ "Cuenta conectada exitosamente"
- O modal con QR (si necesita escanear)
```

---

## 🔧 Implementación Técnica

### Archivo 1: `src/components/whatsapp/MetaConnectButton.jsx`

```jsx
export default function MetaConnectButton({ onSuccess, onError }) {
  const handleConnect = () => {
    // Generar state para seguridad
    const state = crypto.randomUUID();
    localStorage.setItem('meta_oauth_state', state);
    
    // Construir URL OAuth
    const clientId = import.meta.env.VITE_META_APP_ID;
    const redirectUri = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/meta-oauth-callback`;
    const scope = 'whatsapp_business_management,whatsapp_business_messaging,business_management';
    
    const oauthUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code&state=${state}`;
    
    // Abrir en popup o redirigir
    window.open(oauthUrl, 'Meta OAuth', 'width=600,height=700');
    
    // Escuchar mensaje del popup
    window.addEventListener('message', handleOAuthCallback);
  };
  
  return (
    <button onClick={handleConnect}>
      Conectar con Meta
    </button>
  );
}
```

### Archivo 2: `supabase/functions/meta-oauth-callback/index.ts`

```typescript
// 1. Recibir code y state
// 2. Intercambiar code por access_token
// 3. Obtener Business Account ID
// 4. Obtener Phone Numbers
// 5. Generar Access Token permanente
// 6. Crear cuenta en BD
// 7. Retornar datos o QR
```

### Archivo 3: `src/services/whatsapp/meta-oauth.js`

```javascript
// Funciones para:
// - Iniciar OAuth
// - Procesar callback
// - Obtener datos de Graph API
// - Crear cuenta automáticamente
```

---

## 📋 Datos que se Obtienen Automáticamente

### Desde Graph API:

1. **Business Account ID:**
   ```
   GET /v18.0/me/businesses
   ```

2. **Phone Numbers:**
   ```
   GET /v18.0/{business-account-id}/phone_numbers
   ```

3. **Phone Number ID:**
   - Del primer número conectado

4. **Access Token Permanente:**
   - Generar usando System User
   - O usar el token de OAuth (temporal)

5. **Verify Token:**
   - Generar automáticamente: `maya_whatsapp_${Date.now()}`

---

## 🔐 Seguridad

### State Parameter:
- Generar UUID único
- Guardar en localStorage
- Verificar en callback

### Tokens:
- Access Token se guarda encriptado en BD
- O usar Supabase Vault
- Nunca exponer en frontend

---

## ✅ Ventajas del Nuevo Flujo

1. **Más rápido:** 2 clics vs 10+ pasos manuales
2. **Menos errores:** No copiar/pegar
3. **Mejor UX:** Todo desde la app
4. **Automático:** Datos siempre actualizados
5. **Profesional:** Como integraciones modernas

---

## ⚠️ Consideraciones

### QR para Coexistencia:

Si Meta requiere QR para coexistencia:
- Mostramos modal con QR en la app
- Usuario escanea desde WhatsApp Business
- Detectamos cuando está conectado
- Continuamos automáticamente

### Permisos:

Usuario debe tener:
- Permisos de administrador en la App de Meta
- O ser dueño de la cuenta de negocio

---

## 🚀 ¿Procedemos?

Si confirmas, implementaré:
1. ✅ Botón "Conectar con Meta"
2. ✅ Edge Function para OAuth
3. ✅ Obtención automática de datos
4. ✅ Modal de QR (si necesario)
5. ✅ Creación automática de cuenta

**Tiempo estimado:** 8-12 horas de desarrollo

---

**¿Confirmas que procedamos con esta implementación?**

