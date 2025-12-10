# 🔧 Configuración OAuth - Paso a Paso

## ✅ PASO 1: Ya tienes App ID y App Secret

Perfecto, ya tienes:
- ✅ App ID: `[tu-app-id]`
- ✅ App Secret: `[tu-app-secret]`

---

## 📋 PASO 2: Configurar Redirect URI en Facebook

### 2.1. Encuentra tu Project ID de Supabase

**Opción A: Desde el código**
1. ¿Tienes el archivo `.env` o sabes tu URL de Supabase?
2. La URL es algo como: `https://[project-id].supabase.co`

**Opción B: Desde Supabase Dashboard**
1. Ve a: https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a **Settings** → **API**
4. Copia la **Project URL** (ej: `https://alwxhiombhfyjyyziyxz.supabase.co`)
5. Extrae el project ID: `alwxhiombhfyjyyziyxz` (la parte antes de `.supabase.co`)

### 2.2. Arma tu Redirect URI

Tu Redirect URI será:
```
https://[tu-project-id].supabase.co/functions/v1/meta-oauth-callback
```

**Ejemplo:**
```
https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/meta-oauth-callback
```

### 2.3. Agregar en Facebook

1. Ve a: https://developers.facebook.com/
2. Selecciona tu App
3. Ve a **Products** → **Facebook Login** → **Settings**
4. O ve a **Settings** → **Basic** → Busca sección **"Facebook Login"**

5. En **"Valid OAuth Redirect URIs"**, agrega:
   ```
   https://[tu-project-id].supabase.co/functions/v1/meta-oauth-callback
   ```

6. Haz clic en **"Save Changes"** (botón azul abajo)

---

## 📋 PASO 3: Configurar Variables en Supabase

### 3.1. Ir a Supabase Dashboard

1. Ve a: https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a **Edge Functions** → **Settings** (o busca **"Secrets"**)

### 3.2. Agregar Secrets

Agrega estos dos secrets:

**Secret 1: META_APP_ID**
- Name: `META_APP_ID`
- Value: `[tu-app-id]` (el que ya tienes)
- Haz clic en **"Save"**

**Secret 2: META_APP_SECRET**
- Name: `META_APP_SECRET`
- Value: `[tu-app-secret]` (el que ya tienes)
- Haz clic en **"Save"**

---

## 📋 PASO 4: Configurar Variables en Frontend

### 4.1. Encontrar o crear archivo `.env`

En la raíz de tu proyecto, busca el archivo `.env` o `.env.local`

Si no existe, créalo en la raíz del proyecto.

### 4.2. Agregar variables

Agrega estas líneas:

```env
VITE_META_APP_ID=[tu-app-id]
VITE_SUPABASE_URL=https://[tu-project-id].supabase.co
```

**Ejemplo:**
```env
VITE_META_APP_ID=1253651046588346
VITE_SUPABASE_URL=https://alwxhiombhfyjyyziyxz.supabase.co
```

### 4.3. Reiniciar servidor

**Importante:** Si tu servidor de desarrollo está corriendo:
1. Deténlo (Ctrl+C)
2. Inícialo de nuevo (`npm run dev` o similar)

---

## 📋 PASO 5: Verificar Edge Function

### 5.1. Verificar que existe

1. En Supabase Dashboard → **Edge Functions**
2. Verifica que existe: `meta-oauth-callback`
3. Si no existe, necesitamos desplegarlo

### 5.2. Si no existe, desplegarlo

```bash
# Desde la terminal, en la raíz del proyecto
supabase functions deploy meta-oauth-callback
```

O manualmente desde el Dashboard de Supabase.

---

## ✅ PASO 6: Probar

1. Ve a tu CRM
2. Ve a **⚙️ Configuración WhatsApp**
3. Haz clic en **"Nueva Cuenta"**
4. Haz clic en **"Conectar con Meta"**
5. Debería abrirse una ventana de Facebook para autorizar

---

## 🔍 Verificar cada paso

**Dime en qué paso estás y te ayudo con el siguiente:**

- [ ] ¿Tienes tu Project ID de Supabase?
- [ ] ¿Agregaste el Redirect URI en Facebook?
- [ ] ¿Configuraste los secrets en Supabase?
- [ ] ¿Agregaste variables en `.env`?
- [ ] ¿Reiniciaste el servidor?

---

**¿En qué paso necesitas ayuda primero?** 🚀


