# 🔧 Solución: Errores de Supabase en Vercel

## ❌ Problema Actual

En Vercel aparecen errores:
```
GET https://vpdfyvgeenrkrrnenlib.supabase.co/rest/v1/... net::ERR_NAME_NOT_RESOLVED
```

**Causa**: El código intenta usar Supabase pero:
1. La URL no se puede resolver (no existe o está mal configurada)
2. Hay variables de entorno en Vercel que apuntan a una URL incorrecta

## ✅ Solución: Eliminar Variables de Supabase en Vercel

Como **vamos a seguir trabajando con Supabase en localhost** y usar **Firebase en Vercel**, necesitas:

### Paso 1: Ir a Vercel Dashboard

1. Ve a: https://vercel.com/dashboard
2. Selecciona tu proyecto: **"maya-ventas"**
3. Ve a: **Settings** → **Environment Variables**

### Paso 2: Verificar Variables Existentes

Busca estas variables (si existen):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Paso 3: ELIMINAR las Variables

1. Si encuentras `VITE_SUPABASE_URL` → **ELIMÍNALA** (click en el icono de basura)
2. Si encuentras `VITE_SUPABASE_ANON_KEY` → **ELIMÍNALA** (click en el icono de basura)

### Paso 4: Redesplegar

Después de eliminar las variables:
1. Ve a la pestaña **"Deployments"**
2. Haz click en los 3 puntos (⋯) del último deployment
3. Selecciona **"Redeploy"**

O simplemente haz un nuevo push:
```bash
git commit --allow-empty -m "Redeploy sin variables Supabase"
git push
```

## ✅ Resultado Esperado

Después de eliminar las variables:
- ❌ **NO** habrá más intentos de conexión a Supabase
- ✅ El código usará Firebase automáticamente
- ✅ Los errores `ERR_NAME_NOT_RESOLVED` desaparecerán

## 📍 Variables Necesarias

### En Localhost (`.env.local`):
```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key
```

**Dónde obtener:**
- Ve a: https://app.supabase.com
- Selecciona tu proyecto
- Settings → API
- Copia "Project URL" y "anon public" key

### En Vercel (NO necesitas nada):
- ❌ **NO** configures variables de Supabase
- ✅ El código detectará que no hay Supabase y usará Firebase automáticamente

## 🔍 Cómo Verificar

Después del redeploy, abre la consola del navegador en Vercel:

**Antes (con error):**
```
GET https://vpdfyvgeenrkrrnenlib.supabase.co/rest/v1/... ERR_NAME_NOT_RESOLVED
```

**Después (correcto):**
```
ℹ️  Producción: Variables de Supabase no configuradas. El código usará Firebase automáticamente para datos.
[Supabase Dummy] Llamada a tabla 'users' ignorada - usar Firebase en producción
```

## ⚠️ Nota Importante

Si necesitas usar Supabase también en producción (Vercel), entonces:
1. **NO elimines** las variables
2. **Verifica** que la URL sea correcta y accesible
3. Configura las variables con los valores correctos de tu proyecto Supabase

Pero como dijiste "vamos a seguir trabajando con supabase" solo en localhost, la solución es **eliminar las variables en Vercel**.

---

**Fecha**: 2025-01-27
**Estado**: Solución documentada - Pendiente eliminación de variables en Vercel

