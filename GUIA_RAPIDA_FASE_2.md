# ⚡ Guía Rápida: FASE 2 OAuth

## 🎯 Resumen Ejecutivo

Configurar OAuth en Meta Developer Console en 4 pasos simples.

---

## 📋 Pasos Rápidos

### 1️⃣ Obtener App ID y Secret
```
Meta Developer Console → Settings → Basic
- Copiar App ID
- Mostrar y copiar App Secret
```

### 2️⃣ Configurar Redirect URI
```
Meta Developer Console → Settings → Basic → Valid OAuth Redirect URIs
Agregar: https://[TU-PROJECT-REF].supabase.co/functions/v1/meta-oauth-callback
```

### 3️⃣ Verificar Permisos
```
Meta Developer Console → App Review
Verificar/solicitar:
- whatsapp_business_management
- whatsapp_business_messaging
- business_management
```

### 4️⃣ Variables de Entorno en Supabase
```
Supabase Dashboard → Settings → Edge Functions → Secrets
Agregar:
- META_APP_ID = [tu app id]
- META_APP_SECRET = [tu app secret]
- META_OAUTH_REDIRECT_URI = https://[project-ref].supabase.co/functions/v1/meta-oauth-callback
```

---

## ✅ Checklist

- [ ] App ID copiado
- [ ] App Secret copiado
- [ ] Redirect URI agregado en Meta
- [ ] Permisos verificados
- [ ] Variables agregadas en Supabase

---

**Tiempo estimado:** 30 minutos

**Guía completa:** Ver `FASE_2_OAUTH_CONFIG_META.md`

