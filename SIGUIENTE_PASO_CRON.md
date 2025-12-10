# ⏰ Siguiente Paso: Configurar Cron Job

Tu Edge Function está desplegada ✅. Ahora configuremos el cron para que se ejecute automáticamente cada hora.

## Opción Recomendada: pg_cron

### Paso 1: Habilitar pg_cron

1. En Supabase Dashboard → **Database** → **Extensions**
2. Buscar **"pg_cron"**
3. Click en **"Enable"** (si no está habilitado)

### Paso 2: Obtener Service Role Key

1. Supabase Dashboard → **Settings** → **API**
2. Copia la **"service_role"** key (⚠️ MANTÉN ESTA KEY SECRETA)
3. Esta key tiene permisos completos, no la compartas

### Paso 3: Ejecutar SQL en SQL Editor

1. Supabase Dashboard → **SQL Editor**
2. Click **"New Query"**
3. Copia y pega este SQL (reemplaza `[service-role-key]` con tu key real):

```sql
SELECT cron.schedule(
  'process-sequences-hourly',
  '0 * * * *',  -- Cada hora en el minuto 0
  $$
  SELECT net.http_post(
    url := 'https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/process-sequences',
    headers := jsonb_build_object(
      'Authorization', 'Bearer [service-role-key]',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

4. **Ejemplo con valores reales** (reemplaza `TU_SERVICE_ROLE_KEY`):
```sql
SELECT cron.schedule(
  'process-sequences-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/process-sequences',
    headers := jsonb_build_object(
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.TU_SERVICE_ROLE_KEY',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

5. Click **"Run"** o presiona `Ctrl+Enter`

### Paso 4: Verificar que se Creó

Ejecuta este SQL para verificar:

```sql
SELECT * FROM cron.job WHERE jobname = 'process-sequences-hourly';
```

Deberías ver una fila con los detalles del cron job.

### Paso 5: Ver Ejecuciones (Opcional)

Para ver el historial de ejecuciones:

```sql
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-sequences-hourly')
ORDER BY start_time DESC
LIMIT 10;
```

## Test Rápido (Opcional)

Si quieres probar sin esperar 1 hora, puedes crear un cron temporal que se ejecute cada minuto:

```sql
-- Eliminar el job cada hora (si ya lo creaste)
SELECT cron.unschedule('process-sequences-hourly');

-- Crear uno de prueba cada minuto
SELECT cron.schedule(
  'process-sequences-test',
  '* * * * *',  -- Cada minuto
  $$
  SELECT net.http_post(
    url := 'https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/process-sequences',
    headers := jsonb_build_object(
      'Authorization', 'Bearer [service-role-key]',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Esperar 2-3 minutos y verificar logs
-- Luego eliminar el test y crear el definitivo cada hora
SELECT cron.unschedule('process-sequences-test');
```

## Verificar que Funciona

1. **Esperar 1 hora** (o usar el test de 1 minuto)
2. **Ver Logs:**
   - Edge Functions → `process-sequences` → **Logs**
   - Deberías ver ejecuciones automáticas
3. **Ver en BD:**
   - Ejecuta el SQL de "Ver Ejecuciones" arriba

## ✅ Checklist

- [ ] pg_cron habilitado
- [ ] Service role key obtenida
- [ ] SQL ejecutado exitosamente
- [ ] Cron job verificado con `SELECT * FROM cron.job`
- [ ] Logs verificados después de 1 hora (o test de 1 minuto)

---

**¡Listo!** Tu cron job debería estar funcionando y ejecutándose automáticamente cada hora. 🎉


