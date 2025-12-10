# 🔧 Solucionar Error 401 "Missing authorization header"

## ❌ Problema

Error 401 cuando Facebook redirige a la Edge Function después del OAuth:
```json
{
  "code": 401,
  "message": "Missing authorization header"
}
```

---

## 🔍 Causa

Las Edge Functions de Supabase pueden requerir autorización cuando se acceden directamente. Sin embargo, para callbacks de OAuth, deben ser accesibles públicamente.

---

## ✅ Soluciones

### **SOLUCIÓN 1: Verificar que la Edge Function esté Desplegada Correctamente**

1. **Ve a:** Supabase Dashboard → Edge Functions
2. **Busca:** `meta-oauth-callback`
3. **Verifica:**
   - ✅ La función está desplegada
   - ✅ No hay errores de sintaxis
   - ✅ Las variables de entorno están configuradas

---

### **SOLUCIÓN 2: Verificar Variables de Entorno en Supabase**

La Edge Function necesita estas variables:

1. **Ve a:** Supabase Dashboard → Edge Functions → `meta-oauth-callback` → Settings
2. **Verifica que estén configuradas:**
   - `META_APP_ID`
   - `META_APP_SECRET`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `FRONTEND_URL` (opcional)

---

### **SOLUCIÓN 3: Verificar Logs de la Edge Function**

1. **Ve a:** Supabase Dashboard → Edge Functions → `meta-oauth-callback` → Logs
2. **Busca errores** relacionados con:
   - Missing credentials
   - Authorization errors
   - Variables de entorno faltantes

---

### **SOLUCIÓN 4: Redesplegar la Edge Function**

A veces un redeploy resuelve problemas de configuración:

1. **Verifica el código** local de la Edge Function
2. **Redesplega** desde el Dashboard o CLI
3. **Verifica** que el deployment fue exitoso

---

## 🔍 Verificar URL del Callback

El error puede estar en la URL del callback configurada en Facebook:

1. **Ve a:** Facebook Developer Console → Tu App → Productos → Facebook Login → Configuración
2. **Verifica "URI de redireccionamiento de OAuth válidos":**
   ```
   https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/meta-oauth-callback
   ```
3. **Debe coincidir exactamente** con la URL que Facebook usa para redirigir

---

## 📋 Checklist

- [ ] Edge Function desplegada correctamente
- [ ] Variables de entorno configuradas
- [ ] Logs revisados para errores específicos
- [ ] URL del callback verificada en Facebook
- [ ] Edge Function redesplegada (si es necesario)

---

## 🚀 Próximos Pasos

1. **Revisa los logs** de la Edge Function primero
2. **Verifica las variables de entorno**
3. **Si todo está bien, redesplega la función**
4. **Prueba el OAuth de nuevo**

---

**¿Puedes revisar los logs de la Edge Function y decirme qué errores específicos aparecen?** 🚀


