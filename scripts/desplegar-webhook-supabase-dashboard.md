# 🚀 Desplegar Webhook desde Supabase Dashboard

Si no puedes usar Supabase CLI, puedes desplegar la Edge Function directamente desde el Dashboard.

## 📋 PASO 1: Preparar los Archivos

Los archivos ya están creados en:
- `supabase/functions/whatsapp-webhook/index.ts`
- `supabase/functions/whatsapp-webhook/types.ts`
- `supabase/functions/whatsapp-webhook/utils.ts`

## 📋 PASO 2: Desplegar desde Dashboard

### Opción A: Usar Supabase Dashboard (Recomendado si no tienes CLI)

1. **Ve a Supabase Dashboard**
   - https://supabase.com/dashboard
   - Selecciona tu proyecto

2. **Ve a Edge Functions**
   - En el menú lateral, ve a **Edge Functions**
   - O directamente: https://supabase.com/dashboard/project/[TU_PROJECT_REF]/functions

3. **Crea nueva función**
   - Haz clic en **Create a new function**
   - Nombre: `whatsapp-webhook`

4. **Copia el código**
   - Abre `supabase/functions/whatsapp-webhook/index.ts`
   - Copia TODO el contenido
   - Pégalo en el editor del Dashboard

5. **Guarda y despliega**
   - Haz clic en **Deploy**

### Opción B: Usar Supabase CLI (si lo instalaste)

```bash
# Login
supabase login

# Linkear proyecto
supabase link --project-ref TU_PROJECT_REF

# Desplegar
supabase functions deploy whatsapp-webhook
```

## 📋 PASO 3: Obtener URL del Webhook

Después del despliegue, la URL será:

```
https://TU_PROJECT_REF.supabase.co/functions/v1/whatsapp-webhook
```

**Para obtener TU_PROJECT_REF:**
1. Ve a **Settings** > **General** en Supabase Dashboard
2. Copia el **Reference ID**

## 📋 PASO 4: Configurar Variables de Entorno

Las variables de entorno (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) se configuran automáticamente en Supabase. No necesitas hacer nada.

## ✅ Verificación

Para verificar que la función está desplegada:

1. Ve a **Edge Functions** en el Dashboard
2. Deberías ver `whatsapp-webhook` en la lista
3. Haz clic en ella para ver logs y detalles

---

**Listo!** Ahora puedes configurar el webhook en Meta Developer Console.

