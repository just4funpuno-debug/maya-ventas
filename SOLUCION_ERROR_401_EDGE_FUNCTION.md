# 🔧 Solución: Error 401 en Edge Function

## ❌ Problema Identificado

El error 401 "Missing authorization header" ocurre porque **Supabase está bloqueando el acceso** a la Edge Function antes de que el código se ejecute.

**URL del error:**
```
GET | 401 | https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/meta-oauth-callback?code=...&state=...
```

---

## ✅ Solución

### **OPCIÓN 1: Configurar Función como Pública en Supabase Dashboard**

1. **Ve a:** Supabase Dashboard → Edge Functions → `meta-oauth-callback`
2. **Pestaña "Details"** o **"Settings"**
3. **Busca:** "Authentication" o "Security"
4. **Configura:** "Public" o "Allow unauthenticated requests"
5. **Guarda** los cambios

---

### **OPCIÓN 2: Verificar Configuración de Proyecto**

A veces el problema está en la configuración del proyecto:

1. **Ve a:** Supabase Dashboard → Settings → API
2. **Busca:** "Edge Functions" o "Function Settings"
3. **Verifica** si hay restricciones de acceso

---

### **OPCIÓN 3: Crear Archivo de Configuración**

Algunas versiones de Supabase requieren un archivo de configuración:

1. **Crea archivo:** `supabase/functions/meta-oauth-callback/.env` (si existe)
2. **O verifica:** `supabase/config.toml` para configuraciones de Edge Functions

---

## 🔍 Verificar Después de Cambios

Después de hacer los cambios:

1. **Prueba el OAuth de nuevo**
2. **Revisa la pestaña "Invocations"**
3. **Debería aparecer como 200 o 302** (redirect) en lugar de 401

---

## 📋 Si Ninguna Opción Funciona

Si ninguna opción funciona, puede ser necesario:

1. **Contactar soporte de Supabase** para verificar configuración del proyecto
2. **O usar un proxy/endpoint público** que redirija a la Edge Function con headers de autenticación

---

**¿Puedes buscar en la pestaña "Details" o "Settings" de la función si hay una opción para hacerla pública?** 🚀


