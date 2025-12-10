# 🚀 SUBFASE 3.2: Intercambiar Code por Access Token

## 📋 Objetivo

Implementar la lógica para intercambiar el `code` de OAuth por un `access_token` usando la API de Meta.

---

## ✅ Implementación

### 1. Variables de Entorno Requeridas

- `META_APP_ID` - ID de la App de Meta
- `META_APP_SECRET` - Secret de la App de Meta
- `META_OAUTH_REDIRECT_URI` - URI de redirección (opcional, se genera automáticamente)

### 2. Endpoint de Meta

```
GET https://graph.facebook.com/v18.0/oauth/access_token
```

**Parámetros:**
- `client_id` - META_APP_ID
- `client_secret` - META_APP_SECRET
- `redirect_uri` - META_OAUTH_REDIRECT_URI (debe coincidir con el configurado)
- `code` - El code recibido del callback

### 3. Respuesta Esperada

```json
{
  "access_token": "EAAxxx...",
  "token_type": "bearer",
  "expires_in": 5183944
}
```

### 4. Manejo de Errores

- ✅ Validar que existan las credenciales
- ✅ Manejar errores de la API de Meta
- ✅ Validar que la respuesta contenga `access_token`
- ✅ Logging para debugging

---

## 🧪 Testing

### Tests Actualizados

- **Test 2:** Ahora verifica que se intenta intercambiar el token
- **Nota:** Puede fallar si las credenciales no están configuradas (esperado)

### Próximos Tests

Después de configurar las variables de entorno:
1. Test con code real de Meta
2. Verificar que se obtiene access_token
3. Verificar que el token tiene el formato correcto

---

## 📝 Próximos Pasos

**SUBFASE 3.3:** Obtener Datos de Graph API
- Usar el `access_token` obtenido
- Llamar a Graph API para obtener Business Account ID
- Obtener lista de Phone Numbers
- Extraer Phone Number ID

---

## ✅ Checklist SUBFASE 3.2

- [x] Obtener variables de entorno
- [x] Implementar intercambio de code por access_token
- [x] Manejar errores de Meta API
- [x] Validar respuesta
- [x] Logging para debugging
- [x] Tests actualizados
- [ ] Variables de entorno configuradas en Supabase
- [ ] Testing con credenciales reales

---

**Estado:** ✅ **Código implementado** - Pendiente configurar variables de entorno

