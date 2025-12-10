# Configurar Cron Job para Detección de Bloqueos

## Descripción

Este documento explica cómo configurar el cron job que ejecuta automáticamente la detección de bloqueos cada 6 horas.

**FASE 5: SUBFASE 5.2 - Detección Automática de Bloqueos**

## Requisitos Previos

1. ✅ Edge Function `detect-blocks` desplegada
2. ✅ Extensión `pg_cron` habilitada en Supabase
3. ✅ Extensión `pg_net` habilitada en Supabase
4. ✅ `SERVICE_ROLE_KEY` disponible

## Pasos para Configurar

### 1. Verificar Extensiones

Asegúrate de que las extensiones necesarias estén habilitadas:

```sql
-- Verificar extensiones
SELECT * FROM pg_extension WHERE extname IN ('pg_cron', 'pg_net');
```

Si no están habilitadas, habilítalas desde el Dashboard de Supabase:
- Ve a **Database** → **Extensions**
- Busca `pg_cron` y `pg_net`
- Haz clic en **Enable** para cada una

### 2. Ejecutar SQL del Cron Job

1. Ve al **SQL Editor** en el Dashboard de Supabase
2. Abre el archivo `SQL_CRON_DETECT_BLOCKS.sql`
3. Copia y pega el contenido completo
4. Haz clic en **Run** o presiona `Ctrl+Enter`

### 3. Verificar que se Creó Correctamente

Ejecuta esta consulta para verificar:

```sql
SELECT * FROM cron.job WHERE jobname = 'detect-blocks-6h';
```

Deberías ver:
- `jobname`: `detect-blocks-6h`
- `schedule`: `0 */6 * * *`
- `active`: `true`

### 4. Verificar Ejecuciones

Para ver el historial de ejecuciones:

```sql
SELECT 
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'detect-blocks-6h')
ORDER BY start_time DESC
LIMIT 10;
```

## Horarios de Ejecución

El cron job se ejecuta cada 6 horas en los minutos 0:
- **00:00** (medianoche)
- **06:00** (6 AM)
- **12:00** (mediodía)
- **18:00** (6 PM)

## Desactivar Temporalmente

Si necesitas desactivar el cron job temporalmente:

```sql
SELECT cron.unschedule('detect-blocks-6h');
```

## Reactivar

Para reactivar el cron job:

```sql
-- Ejecutar nuevamente el SQL_CRON_DETECT_BLOCKS.sql
```

O manualmente:

```sql
SELECT cron.schedule(
  'detect-blocks-6h',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/detect-blocks',
    headers := jsonb_build_object(
      'Authorization', 'Bearer [TU_SERVICE_ROLE_KEY]',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

## Probar Manualmente

Puedes probar la Edge Function manualmente antes de configurar el cron:

```bash
curl -X POST https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/detect-blocks \
  -H "Authorization: Bearer [TU_SERVICE_ROLE_KEY]" \
  -H "Content-Type: application/json"
```

O desde PowerShell:

```powershell
$headers = @{
    "Authorization" = "Bearer [TU_SERVICE_ROLE_KEY]"
    "Content-Type" = "application/json"
}

Invoke-RestMethod -Uri "https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/detect-blocks" `
    -Method Post `
    -Headers $headers `
    -Body '{}'
```

## Respuesta Esperada

La función retorna un JSON con:

```json
{
  "success": true,
  "checked": 10,
  "blocked": 2,
  "probable": 3,
  "errors": 0,
  "details": [
    {
      "contactId": "uuid",
      "phone": "+1234567890",
      "isBlocked": true,
      "probability": 85,
      "consecutiveUndelivered": 5
    }
  ]
}
```

## Troubleshooting

### El cron job no se ejecuta

1. Verifica que `pg_cron` esté habilitado
2. Verifica que el job esté activo: `SELECT * FROM cron.job WHERE jobname = 'detect-blocks-6h';`
3. Revisa los logs de ejecución: `SELECT * FROM cron.job_run_details WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'detect-blocks-6h');`

### Error de autenticación

Verifica que el `SERVICE_ROLE_KEY` en el SQL sea correcto. Puedes obtenerlo desde:
- **Settings** → **API** → **service_role key**

### La función retorna errores

Revisa los logs de la Edge Function en:
- **Edge Functions** → **detect-blocks** → **Logs**

## Notas Finales

- El cron job procesa hasta 50 contactos por ejecución
- Solo verifica mensajes enviados hace más de 72 horas
- Los contactos bloqueados tienen sus secuencias pausadas automáticamente
- Se crean registros en `whatsapp_delivery_issues` para seguimiento


