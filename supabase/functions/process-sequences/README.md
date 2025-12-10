# Edge Function: process-sequences

**FASE 4: SUBFASE 4.3 - Cron Jobs para Procesamiento Automático**

## Descripción

Esta Edge Function procesa automáticamente las secuencias de mensajes de WhatsApp, evaluando cuándo enviar el siguiente mensaje y decidiendo entre Cloud API y Puppeteer según las ventanas de mensajería activas.

## Funcionalidad

1. **Obtiene todas las cuentas WhatsApp activas**
2. **Para cada cuenta, obtiene contactos con secuencias activas**
3. **Evalúa cada contacto** para determinar si debe enviarse el siguiente mensaje:
   - Verifica si el cliente respondió (pausa automática)
   - Verifica si la secuencia está activa
   - Calcula si es momento de enviar según delays configurados
4. **Decide método de envío** (Cloud API vs Puppeteer):
   - Cloud API si ventana 24h está activa
   - Cloud API si ventana 72h (Free Entry Point) está activa
   - Puppeteer si no hay ventanas activas
5. **Envía el mensaje** y actualiza contadores y posición

## Uso

### Ejecución Manual

```bash
curl -X POST https://[project-ref].supabase.co/functions/v1/process-sequences \
  -H "Authorization: Bearer [anon-key]" \
  -H "Content-Type: application/json"
```

### Configuración de Cron

#### Opción 1: Supabase Scheduled Functions (Recomendado)

1. Ir a Supabase Dashboard → Database → Cron Jobs
2. Crear nuevo cron job:
   - **Schedule:** `0 * * * *` (cada hora)
   - **Function:** `process-sequences`
   - **Enabled:** true

#### Opción 2: pg_cron (PostgreSQL)

```sql
-- Ejecutar en Supabase SQL Editor
SELECT cron.schedule(
  'process-sequences-hourly',
  '0 * * * *', -- Cada hora
  $$
  SELECT net.http_post(
    url := 'https://[project-ref].supabase.co/functions/v1/process-sequences',
    headers := jsonb_build_object(
      'Authorization', 'Bearer [service-role-key]',
      'Content-Type', 'application/json'
    )
  ) AS request_id;
  $$
);
```

#### Opción 3: Vercel Cron (si el proyecto está en Vercel)

Agregar a `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/process-sequences",
      "schedule": "0 * * * *"
    }
  ]
}
```

## Respuesta

La función retorna un objeto JSON con:

```json
{
  "success": true,
  "processed": 10,
  "sent": 8,
  "errors": 2,
  "details": [
    {
      "contactId": "uuid",
      "success": true,
      "method": "cloud_api"
    },
    {
      "contactId": "uuid",
      "success": false,
      "method": "puppeteer",
      "error": "Error message"
    }
  ]
}
```

## Variables de Entorno

La función requiere estas variables de entorno (configuradas automáticamente en Supabase):

- `SUPABASE_URL`: URL del proyecto Supabase
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key para acceso completo a BD

## Logs

La función genera logs estructurados:

- `[process-sequences] Procesados: X, Enviados: Y, Errores: Z`
- `[evaluateContactSequence] Error fatal: ...`
- `[processSequenceMessage] Error fatal: ...`
- `[sendViaCloudAPI] Error: ...`
- `[sendViaPuppeteer] Error: ...`

Ver logs en: Supabase Dashboard → Edge Functions → process-sequences → Logs

## Manejo de Errores

- Si falla Cloud API, automáticamente hace fallback a Puppeteer
- Si un contacto tiene error, continúa con el siguiente
- Si una cuenta tiene error, continúa con la siguiente cuenta
- Los errores se registran en `result.details` pero no detienen el procesamiento

## Testing

### Test Manual

1. Crear una secuencia con mensajes
2. Asignar secuencia a un contacto
3. Ejecutar la función manualmente
4. Verificar que el mensaje se envió correctamente
5. Verificar que se actualizó `sequence_position`

### Test de Cron

1. Configurar cron para ejecutar cada minuto (temporalmente)
2. Verificar que se ejecuta automáticamente
3. Verificar logs en Supabase Dashboard
4. Cambiar de vuelta a cada hora

## Notas

- La función procesa todas las cuentas y contactos en una sola ejecución
- Para proyectos grandes (>1000 contactos), considerar procesamiento en batch
- El procesamiento es secuencial para evitar sobrecarga
- Los mensajes se envían inmediatamente si es momento (no se encolan)


