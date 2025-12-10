# 🔐 Configurar Secrets - Alternativas

## ❌ Si NO encuentras "Environment Variables"

No te preocupes, hay varias formas de configurar los secrets. Probemos estas opciones:

---

## ✅ OPCIÓN 1: Desde la Función Directamente

1. **Ve a la función:**
   ```
   https://supabase.com/dashboard/project/alwxhiombhfyjyyziyxz/functions/meta-oauth-callback
   ```

2. **Busca en la página de la función:**
   - Pestaña **"Settings"** o **"Configuration"**
   - Sección **"Secrets"** o **"Environment Variables"**
   - O busca un botón **"Manage Secrets"**

---

## ✅ OPCIÓN 2: Desde Settings General

1. **Ve a:**
   ```
   https://supabase.com/dashboard/project/alwxhiombhfyjyyziyxz/settings/general
   ```

2. **Busca:**
   - **"Edge Functions"** en el menú lateral
   - **"Secrets"** o **"Environment Variables"**
   - O ve a: Settings > API > Secrets

---

## ✅ OPCIÓN 3: Usar la CLI de Supabase (Si tienes acceso)

Si tienes Supabase CLI instalado o puedes instalarlo:

```bash
# Instalar Supabase CLI (si no lo tienes)
npm install -g supabase

# Login
supabase login

# Linkear proyecto
supabase link --project-ref alwxhiombhfyjyyziyxz

# Configurar secrets
supabase secrets set META_APP_ID=1253651046588346
supabase secrets set META_APP_SECRET=6927430dc02034242b7235f1fa86818c
supabase secrets set META_OAUTH_REDIRECT_URI=https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/meta-oauth-callback
```

---

## ✅ OPCIÓN 4: Configurar en el Código (Temporal)

Si no encuentras dónde configurar los secrets, podemos hardcodearlos temporalmente en el código (solo para pruebas):

1. **Abre:** `supabase/functions/meta-oauth-callback/index.ts`
2. **Busca estas líneas:**
   ```typescript
   const META_APP_ID = Deno.env.get('META_APP_ID');
   const META_APP_SECRET = Deno.env.get('META_APP_SECRET');
   ```

3. **Reemplázalas temporalmente por:**
   ```typescript
   const META_APP_ID = Deno.env.get('META_APP_ID') || '1253651046588346';
   const META_APP_SECRET = Deno.env.get('META_APP_SECRET') || '6927430dc02034242b7235f1fa86818c';
   ```

4. **Redespliega la función**

⚠️ **NOTA:** Esto es solo para pruebas. Después debemos moverlos a secrets por seguridad.

---

## ✅ OPCIÓN 5: Verificar en la Documentación de Supabase

1. **Ve a:** https://supabase.com/docs/guides/functions/secrets
2. **Sigue las instrucciones** de la documentación oficial

---

## 🎯 ¿Qué Opción Prefieres?

1. **Opción 1-2:** Buscar en diferentes lugares del Dashboard
2. **Opción 3:** Usar CLI (requiere instalación)
3. **Opción 4:** Hardcodear temporalmente (solo para pruebas)
4. **Opción 5:** Revisar documentación oficial

---

**¿Cuál opción quieres probar primero? O dime qué ves en el Dashboard y te guío específicamente.**

