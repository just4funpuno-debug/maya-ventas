# 🔧 Actualizar Edge Function Corregida

## Problema Encontrado

El test mostró que la función `add_to_puppeteer_queue` no se estaba llamando correctamente. He corregido los parámetros en `supabase/functions/process-sequences/index.ts`.

## Cambios Realizados

✅ Corregidos los parámetros de `add_to_puppeteer_queue`:
- Agregado `p_message_number` (requerido)
- Cambiado `p_media_url` → `p_media_path`
- Eliminado `p_media_filename` (no existe en la función SQL)
- Cambiado `p_priority: 5` → `p_priority: 'MEDIUM'` (debe ser string)

## Pasos para Actualizar

### Opción 1: Supabase Dashboard (Más Fácil) ⭐

1. **Abre Supabase Dashboard:**
   - Ve a: https://supabase.com/dashboard/project/alwxhiombhfyjyyziyxz/functions/process-sequences

2. **Ir a la pestaña "Code":**
   - Click en **"Code"** en el menú superior

3. **Reemplazar el código:**
   - Abre el archivo `supabase/functions/process-sequences/index.ts` en tu editor
   - Copia TODO el contenido (Ctrl+A, Ctrl+C)
   - Pega en el editor del Dashboard (reemplaza todo)
   - Click **"Deploy"** o **"Save"**

4. **Verificar:**
   - Deberías ver "Successfully deployed edge function"

### Opción 2: Supabase CLI

```bash
supabase functions deploy process-sequences
```

## Test Nuevamente

Después de actualizar, ejecuta el test de nuevo:

```powershell
.\test-process-sequences.ps1
```

Ahora debería funcionar sin el error de `add_to_puppeteer_queue`.

## Resultado Esperado

Después de corregir, el test debería mostrar:
- ✅ `success: true`
- ✅ Sin errores de función no encontrada
- ✅ Si hay contactos listos, debería enviar mensajes

---

**¿Listo para actualizar?** Sigue los pasos de la Opción 1 (Dashboard) que es la más fácil.


