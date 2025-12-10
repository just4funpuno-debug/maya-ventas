# 🔐 Obtener Access Token de Supabase

## 🎯 Objetivo

Obtener el Access Token necesario para desplegar Edge Functions automáticamente.

---

## ✅ PASO 1: Obtener Access Token

1. **Ve a:** https://supabase.com/dashboard/account/tokens
2. **Haz clic en "Generate new token"** o **"Generar nuevo token"**
3. **Nombre del token:** `Edge Functions Deploy` (o el que prefieras)
4. **Copia el token** que se genera
   - ⚠️ **IMPORTANTE:** Solo se muestra una vez, guárdalo bien

---

## ✅ PASO 2: Agregar a `.env.local`

1. **Abre `.env.local`** en la raíz del proyecto
   - Si no existe, créalo
2. **Agrega esta línea:**
   ```
   SUPABASE_ACCESS_TOKEN=tu_token_aqui
   ```
3. **Reemplaza `tu_token_aqui`** con el token que copiaste
4. **Guarda el archivo**

---

## ✅ PASO 3: Verificar

Ejecuta:

```bash
npm run verify:supabase-auth
```

**Si funciona:** Verás "✅ Token válido!"

**Si falla:** Revisa que el token esté correcto en `.env.local`

---

## 🚀 Después de Configurar

Una vez configurado, podré:
- ✅ Desplegar Edge Functions automáticamente
- ✅ Probar funciones automáticamente
- ✅ Iterar rápidamente (desplegar → probar → corregir)

---

## 📋 Comandos Disponibles

```bash
# Verificar autenticación
npm run verify:supabase-auth

# Desplegar función
npm run deploy:oauth-callback

# Probar función
npm run test:oauth-callback
```

---

**¿Ya obtuviste el Access Token? Agrégalo a `.env.local` y ejecuta `npm run verify:supabase-auth`**

