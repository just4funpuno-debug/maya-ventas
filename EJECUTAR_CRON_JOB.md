# ⏰ Ejecutar SQL del Cron Job

## SQL Listo para Ejecutar

He creado el archivo `SQL_CRON_JOB_COMPLETO.sql` con tu service_role key ya incluida.

## Pasos para Ejecutar:

1. **Ir a SQL Editor:**
   - Supabase Dashboard → **SQL Editor**
   - O directamente: https://supabase.com/dashboard/project/alwxhiombhfyjyyziyxz/sql/new

2. **Crear nueva query:**
   - Click en **"New Query"** o **"+"**

3. **Copiar y pegar el SQL:**
   - Abre el archivo `SQL_CRON_JOB_COMPLETO.sql`
   - Copia TODO el contenido (desde `SELECT cron.schedule(` hasta `);`)
   - Pega en el editor de SQL

4. **Ejecutar:**
   - Click en **"Run"** o presiona `Ctrl+Enter`
   - Deberías ver un mensaje de éxito

5. **Verificar:**
   - Ejecuta este SQL para verificar que se creó:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'process-sequences-hourly';
   ```
   - Deberías ver una fila con los detalles del cron job

## Schedule (Horario)

El cron está configurado para ejecutarse:
- **Cada hora en el minuto 0** (ej: 1:00, 2:00, 3:00, 4:00...)

## Ver Ejecuciones (Después de 1 hora)

Para ver el historial de ejecuciones:

```sql
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-sequences-hourly')
ORDER BY start_time DESC
LIMIT 10;
```

---

**¿Listo para ejecutar el SQL?** Copia el contenido de `SQL_CRON_JOB_COMPLETO.sql` y ejecútalo en SQL Editor.


