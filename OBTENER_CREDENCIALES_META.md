# 🔐 Obtener Credenciales de Meta para Configurar

## 📋 Objetivo

Obtener `META_APP_ID` y `META_APP_SECRET` de Meta Developer Console para configurar las variables de entorno.

---

## ✅ PASO 1: Ir a Meta Developer Console

1. **Ve a:** https://developers.facebook.com/
2. **Inicia sesión** con tu cuenta de Facebook
3. **Selecciona tu App** de WhatsApp Business
   - Si no tienes una, créala primero

---

## ✅ PASO 2: Obtener App ID

1. **En el menú lateral:** Haz clic en **"Settings"** > **"Basic"**
2. **Busca la sección:** "App ID"
3. **Copia el App ID** (ejemplo: `1234567890123456`)
4. **Guárdalo** - Lo necesitarás

---

## ✅ PASO 3: Obtener App Secret

1. **En la misma página:** Busca la sección **"App Secret"**
2. **Haz clic en "Show"** (mostrar)
3. **Ingresa tu contraseña de Facebook** si te lo pide
4. **Copia el App Secret** (ejemplo: `abc123def456ghi789jkl012mno345pq`)
5. **⚠️ IMPORTANTE:** Guárdalo bien, solo se muestra una vez

---

## ✅ PASO 4: Agregar a .env.local

1. **Abre `.env.local`** en la raíz del proyecto
2. **Agrega estas líneas:**
   ```
   META_APP_ID=tu_app_id_aqui
   META_APP_SECRET=tu_app_secret_aqui
   ```
3. **Reemplaza** `tu_app_id_aqui` y `tu_app_secret_aqui` con los valores que copiaste
4. **Guarda el archivo**

---

## ✅ PASO 5: Configurar Automáticamente

Una vez que agregues las credenciales a `.env.local`, ejecuta:

```bash
node scripts/configure-meta-env.js
```

Este script intentará configurar las variables en Supabase automáticamente.

**Si no funciona automáticamente**, te mostrará instrucciones para configurarlas manualmente desde el Dashboard.

---

## 📝 Notas Importantes

- ⚠️ **App Secret es sensible:** No lo compartas ni lo subas a Git
- ✅ **Las variables se aplican después de redesplegar** la función
- ✅ **Redirect URI se genera automáticamente** si no lo configuras

---

**¿Ya obtuviste las credenciales? Agrégalas a `.env.local` y ejecuta el script de configuración.**

