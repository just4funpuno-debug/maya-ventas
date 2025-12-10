# 🔧 Configurar FRONTEND_URL en Supabase

## ❌ Problema

La Edge Function está redirigiendo a `facebook.com/oauth-callback.html` en lugar de tu frontend porque no detecta correctamente la URL.

---

## ✅ Solución: Configurar Variable de Entorno

### **PASO 1: Ir a Supabase Dashboard**

1. **Ve a:** https://supabase.com/dashboard
2. **Selecciona tu proyecto**
3. **Ve a:** Edge Functions → `meta-oauth-callback` → **"Details"** o **"Settings"**
4. **Busca:** "Environment Variables" o "Secrets"

---

### **PASO 2: Agregar Variable FRONTEND_URL**

1. **Haz clic en "Add Secret"** o **"Agregar variable"**
2. **Nombre:** `FRONTEND_URL`
3. **Valor:** 
   - **Para producción:** `https://www.mayalife.shop`
   - **Para desarrollo local:** `http://localhost:5173`

4. **Haz clic en "Save"** o **"Guardar"**

---

## 🔄 Alternativa: Código Ya Actualizado

Ya actualicé el código para usar `https://www.mayalife.shop` como valor por defecto si no encuentra la variable de entorno.

**Pero es mejor configurar la variable de entorno** para tener control total.

---

## 📋 Verificar

Después de configurar:

1. **Redesplega la función** (o espera a que se actualice automáticamente)
2. **Prueba el OAuth de nuevo**
3. **Debería redirigir** a `https://www.mayalife.shop/oauth-callback.html`

---

**¿Puedes configurar la variable FRONTEND_URL en Supabase?** 🚀


