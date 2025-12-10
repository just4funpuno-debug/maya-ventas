# ⏰ Configurar Cron Job - Paso a Paso

## Paso 1: Habilitar pg_cron

1. **Ir a Database → Extensions:**
   - Supabase Dashboard → **Database** → **Extensions**
   - O directamente: https://supabase.com/dashboard/project/alwxhiombhfyjyyziyxz/database/extensions

2. **Buscar "pg_cron":**
   - En la lista de extensiones, busca **"pg_cron"**
   - Si está **deshabilitado**, click en **"Enable"**
   - Si ya está **habilitado**, continúa al Paso 2

## Paso 2: Obtener Service Role Key

1. **Ir a Settings → API:**
   - Supabase Dashboard → **Settings** → **API**
   - O directamente: https://supabase.com/dashboard/project/alwxhiombhfyjyyziyxz/settings/api

2. **Copiar Service Role Key:**
   - Busca **"service_role"** key (es la segunda, con el ícono de ojo)
   - ⚠️ **IMPORTANTE:** Esta key tiene permisos completos, manténla SECRETA
   - Click en el ícono de **copiar** (📋)
   - **Guárdala temporalmente** (la necesitarás para el SQL)

## Paso 3: Ejecutar SQL en SQL Editor

1. **Ir a SQL Editor:**
   - Supabase Dashboard → **SQL Editor**
   - O directamente: https://supabase.com/dashboard/project/alwxhiombhfyjyyziyxz/sql/new

2. **Crear nueva query:**
   - Click en **"New Query"** o **"+"**

3. **Pegar y modificar este SQL:**
   
   ```sql
   SELECT cron.schedule(
     'process-sequences-hourly',
     '0 * * * *',  -- Cada hora en el minuto 0
     $$
     SELECT net.http_post(
       url := 'https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/process-sequences',
       headers := jsonb_build_object(
         'Authorization', 'Bearer TU_SERVICE_ROLE_KEY_AQUI',
         'Content-Type', 'application/json'
       ),
       body := '{}'::jsonb
     ) AS request_id;
     $$
   );
   ```

4. **Reemplazar `TU_SERVICE_ROLE_KEY_AQUI`:**
   - Pega tu service_role key donde dice `TU_SERVICE_ROLE_KEY_AQUI`
   - Debería quedar algo como: `'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'`

5. **Ejecutar:**
   - Click en **"Run"** o presiona `Ctrl+Enter`
   - Deberías ver un mensaje de éxito

## Paso 4: Verificar que se Creó

Ejecuta este SQL para verificar:

```sql
SELECT * FROM cron.job WHERE jobname = 'process-sequences-hourly';
```

Deberías ver una fila con los detalles del cron job.

## Paso 5: Ver Ejecuciones (Opcional)

Para ver el historial de ejecuciones:

```sql
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-sequences-hourly')
ORDER BY start_time DESC
LIMIT 10;
```

## Schedule (Horario)

El cron está configurado para ejecutarse:
- **`'0 * * * *'`** = Cada hora en el minuto 0 (ej: 1:00, 2:00, 3:00...)

Si quieres cambiar la frecuencia:
- Cada 30 minutos: `'*/30 * * * *'`
- Cada 2 horas: `'0 */2 * * *'`
- Cada día a las 9 AM: `'0 9 * * *'`

---

**¿Listo para empezar?** Te guío paso a paso.


