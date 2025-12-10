# 🚀 FASE 4: Servicio Graph API - Plan Detallado

## 📋 Objetivo

Crear servicio para interactuar con Meta Graph API que encapsule todas las llamadas y pueda ser usado desde el frontend o desde Edge Functions.

---

## ✅ Funciones Implementadas

### 1. `exchangeCodeForToken(code, redirectUri)`
- ✅ Intercambiar code de OAuth por access_token
- ✅ Validación de parámetros
- ✅ Manejo de errores
- ✅ Usa variables de entorno

### 2. `getUserInfo(accessToken)`
- ✅ Obtener información del usuario de Meta
- ✅ Retorna id, name, email
- ✅ Manejo de errores

### 3. `getBusinessAccounts(accessToken)`
- ✅ Obtener Business Accounts del usuario
- ✅ Validación de respuesta
- ✅ Manejo de errores

### 4. `getPhoneNumbers(businessAccountId, accessToken)`
- ✅ Obtener Phone Numbers de un Business Account
- ✅ Validación de parámetros
- ✅ Manejo de errores

### 5. `getPhoneNumberDetails(phoneNumberId, accessToken)`
- ✅ Obtener detalles de un Phone Number
- ✅ Incluye: display_phone_number, verified_name, code_verification_status, quality_rating
- ✅ Manejo de errores

### 6. `checkCoexistenceStatus(phoneNumberId, accessToken)`
- ✅ Verificar estado de coexistencia
- ✅ Determina si está 'connected' o 'pending'
- ✅ Retorna información útil

### 7. `getWhatsAppAccountData(accessToken)` (Función de conveniencia)
- ✅ Obtiene todos los datos necesarios en una sola llamada
- ✅ Combina: user info, business accounts, phone numbers, detalles, coexistencia
- ✅ Útil para simplificar el flujo

---

## 🔧 Características

### Manejo de Errores
- ✅ Validación de parámetros
- ✅ Manejo de errores de Graph API
- ✅ Mensajes descriptivos
- ✅ Códigos de estado HTTP

### Variables de Entorno
- ✅ `VITE_META_APP_ID` o `META_APP_ID`
- ✅ `VITE_META_APP_SECRET` o `META_APP_SECRET`
- ✅ `VITE_META_OAUTH_REDIRECT_URI` o `META_OAUTH_REDIRECT_URI`

### Estructura de Respuesta
Todas las funciones retornan:
```javascript
{
  data: Object | Array | null,
  error: {
    error: boolean,
    message: string,
    status: number,
    details?: string
  } | null
}
```

---

## 📝 Próximos Pasos

### Testing
- [ ] Crear tests unitarios
- [ ] Probar cada función individualmente
- [ ] Probar manejo de errores
- [ ] Probar validación de parámetros

### Integración
- [ ] Usar en Edge Function (opcional, ya está implementado allí)
- [ ] Usar en frontend para refrescar datos
- [ ] Integrar con FASE 5 (UI Botón)

---

## ✅ Checklist FASE 4

- [x] Crear `src/services/whatsapp/meta-graph-api.js`
- [x] Implementar `exchangeCodeForToken`
- [x] Implementar `getUserInfo`
- [x] Implementar `getBusinessAccounts`
- [x] Implementar `getPhoneNumbers`
- [x] Implementar `getPhoneNumberDetails`
- [x] Implementar `checkCoexistenceStatus`
- [x] Implementar `getWhatsAppAccountData` (función de conveniencia)
- [x] Manejo de errores
- [x] Validación de respuestas
- [ ] Crear tests ⏳
- [ ] Documentación de uso ⏳

---

**Estado:** ✅ **Código implementado** - Pendiente testing y documentación

