# Test Manual de process-sequences

## Comando cURL (desde el Dashboard)

```bash
curl -L -X POST 'https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/process-sequences' \
-H 'Authorization: Bearer SUPABASE_PUBLISHABLE_DEFAULT_KEY' \
-H 'apikey: SUPABASE_PUBLISHABLE_DEFAULT_KEY' \
-H 'Content-Type: application/json' \
--data '{}'
```

**Nota:** Reemplaza `SUPABASE_PUBLISHABLE_DEFAULT_KEY` con tu anon key real.

## Obtener tu Anon Key

1. En Supabase Dashboard → **Settings** → **API**
2. Copia la **"anon public"** key
3. Reemplázala en el comando

## Ejecutar Test

1. **Desde Terminal/PowerShell:**
   - Copia el comando (con tu key real)
   - Ejecuta en terminal
   - Deberías ver una respuesta JSON

2. **Desde Supabase Dashboard:**
   - Click en el botón **"Test"** (arriba a la derecha)
   - O ve a la pestaña **"Invocations"** para ver ejecuciones

3. **Verificar Logs:**
   - Ve a la pestaña **"Logs"** en el Dashboard
   - Deberías ver logs de la ejecución

## Respuesta Esperada

```json
{
  "success": true,
  "processed": 0,
  "sent": 0,
  "errors": 0,
  "details": []
}
```

Si tienes contactos con secuencias activas, verás números mayores en `processed` y `sent`.

