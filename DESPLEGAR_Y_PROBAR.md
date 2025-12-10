# 🚀 Desplegar y Probar Edge Function

## ✅ Token Configurado

El Access Token ya está configurado y verificado.

---

## 📋 PASO 1: Desplegar Manualmente (2 minutos)

Como la API de Supabase requiere configuración adicional, vamos a desplegar manualmente desde el Dashboard:

### 1.1 Ir a Edge Functions

**URL directa:**
```
https://supabase.com/dashboard/project/alwxhiombhfyjyyziyxz/functions
```

### 1.2 Crear Función

1. Haz clic en **"Create a new function"**
2. **Nombre:** `meta-oauth-callback`
3. Haz clic en **"Create function"**

### 1.3 Copiar Código

1. **Abre este archivo en tu editor:**
   ```
   supabase/functions/meta-oauth-callback/index.ts
   ```

2. **Selecciona TODO** (Ctrl+A)

3. **Copia** (Ctrl+C)

4. **Vuelve al Dashboard**

5. **Pega el código** en el editor (Ctrl+V)

6. **Haz clic en "Deploy"**

---

## ✅ PASO 2: Probar Automáticamente

Una vez desplegado, ejecuta:

```bash
npm run test:oauth-callback
```

Este script probará automáticamente:
- ✅ GET Request
- ✅ POST con Code y State
- ✅ POST sin Code (error esperado)
- ✅ POST sin State (error esperado)
- ✅ POST con Error de OAuth
- ✅ OPTIONS Request (CORS)

---

## 🔄 Flujo de Trabajo

1. **Despliega manualmente** (una vez, 2 minutos)
2. **Ejecuta tests:** `npm run test:oauth-callback`
3. **Si hay errores:** Corrijo el código
4. **Vuelve a desplegar** (copia/pega el código actualizado)
5. **Vuelve a probar:** `npm run test:oauth-callback`
6. **Repite hasta que todo funcione**

---

**¿Ya desplegaste la función? Ejecuta `npm run test:oauth-callback` para probarla.**

