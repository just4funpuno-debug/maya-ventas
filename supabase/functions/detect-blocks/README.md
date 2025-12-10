# Edge Function: detect-blocks

## Descripción

Edge Function para detectar bloqueos automáticamente verificando el status de mensajes enviados hace más de 72 horas.

**FASE 5: SUBFASE 5.2 - Detección Automática de Bloqueos**

## Funcionalidad

1. **Obtiene contactos con mensajes antiguos**: Busca contactos que tienen mensajes enviados hace más de 72 horas con status "sent"
2. **Verifica status en WhatsApp API**: Para cada mensaje, consulta la API de WhatsApp para verificar si fue entregado
3. **Calcula probabilidad de bloqueo**: Basado en mensajes consecutivos sin entregar
4. **Actualiza estado**: Marca contactos como bloqueados si probabilidad > 80%
5. **Pausa secuencias**: Automáticamente pausa secuencias de contactos bloqueados
6. **Registra issues**: Crea registros en `whatsapp_delivery_issues` para seguimiento

## Uso

### Ejecución Manual

```bash
curl -X POST https://[PROJECT_REF].supabase.co/functions/v1/detect-blocks \
  -H "Authorization: Bearer [ANON_KEY]" \
  -H "Content-Type: application/json"
```

### Respuesta

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

## Configuración de Cron

Ejecutar cada 6 horas usando `pg_cron`:

```sql
SELECT cron.schedule(
  'detect-blocks-6h',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://[PROJECT_REF].supabase.co/functions/v1/detect-blocks',
    headers := jsonb_build_object(
      'Authorization', 'Bearer [SERVICE_ROLE_KEY]',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

## Variables de Entorno

- `SUPABASE_URL`: URL del proyecto Supabase
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key para acceso completo

## Lógica de Detección

### Probabilidad de Bloqueo

- **0-49%**: Baja probabilidad, no se registra
- **50-79%**: Probable bloqueo, se registra en `whatsapp_delivery_issues`
- **80-100%**: Bloqueo confirmado, se marca `is_blocked = true` y se pausan secuencias

### Factores Considerados

1. **Mensajes consecutivos sin entregar**: 
   - 1 mensaje: +10%
   - 2 mensajes: +20%
   - 3 mensajes: +40%
   - 5+ mensajes: +60%

2. **Tasa de entrega general**: 
   - < 50%: +30%
   - < 70%: +15%

3. **Tiempo desde última entrega**:
   - > 7 días: +20%
   - > 3 días: +10%

## Límites

- Máximo 50 contactos por ejecución
- Máximo 10 mensajes verificados por contacto
- Solo verifica mensajes de Cloud API (con `wa_message_id`)

## Notas

- La función solo verifica mensajes enviados hace más de 72 horas
- Solo procesa mensajes de Cloud API (no Puppeteer)
- Los contactos bloqueados tienen sus secuencias pausadas automáticamente
- Se crea un registro en `whatsapp_delivery_issues` solo si no existe uno no resuelto


