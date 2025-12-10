# 🚀 Guía de Despliegue: process-sequences Edge Function

**FASE 4: SUBFASE 4.3 - Cron Jobs**

Esta guía te llevará paso a paso para desplegar la Edge Function y configurar el cron job.

---

## 📋 PASO 1: Verificar Archivos

Antes de desplegar, verifica que tengas estos archivos:

```
supabase/functions/process-sequences/
  ├── index.ts          ✅ (ya creado)
  └── README.md         ✅ (ya creado)
```

---

## 📋 PASO 2: Desplegar Edge Function

Tienes **3 opciones** para desplegar:

### Opción A: Supabase Dashboard (Más Fácil) ⭐ RECOMENDADO

1. **Ir a Supabase Dashboard:**
   - Abre: https://supabase.com/dashboard
   - Selecciona tu proyecto

2. **Navegar a Edge Functions:**
   - Menú lateral → **Edge Functions**
   - O directamente: `https://supabase.com/dashboard/project/[tu-project-id]/functions`

3. **Crear Nueva Función:**
   - Click en **"Create a new function"** o **"New Function"**
   - Nombre: `process-sequences`
   - Click **"Create function"**

4. **Copiar Código:**
   - Abre el archivo `supabase/functions/process-sequences/index.ts`
   - Copia TODO el contenido (Ctrl+A, Ctrl+C)
   - Pega en el editor de Supabase Dashboard
   - Click **"Deploy"** o **"Save"**

5. **Verificar Despliegue:**
   - Deberías ver un mensaje de éxito
   - La función aparecerá en la lista con estado "Active"

### Opción B: Supabase CLI (Para Desarrolladores)

1. **Instalar Supabase CLI** (si no lo tienes):
   ```bash
   npm install -g supabase
   ```

2. **Login en Supabase:**
   ```bash
   supabase login
   ```

3. **Linkear Proyecto:**
   ```bash
   supabase link --project-ref [tu-project-ref]
   ```

4. **Desplegar Función:**
   ```bash
   supabase functions deploy process-sequences
   ```

### Opción C: Copiar Manualmente desde Archivo

Si prefieres, puedes:
1. Abrir `supabase/functions/process-sequences/index.ts` en tu editor
2. Copiar todo el contenido
3. Ir a Supabase Dashboard → Edge Functions → Create Function
4. Pegar el código y desplegar

---

## 📋 PASO 3: Verificar que la Función Funciona

### Test Manual (POST Request)

1. **Obtener URL de tu función:**
   - En Supabase Dashboard → Edge Functions → `process-sequences`
   - Copia la URL: `https://[project-ref].supabase.co/functions/v1/process-sequences`

2. **Obtener Anon Key:**
   - Supabase Dashboard → Settings → API
   - Copia **"anon public"** key

3. **Ejecutar Test:**
   
   **Opción A: Usando curl (Terminal/PowerShell)**
   ```bash
   curl -X POST https://[project-ref].supabase.co/functions/v1/process-sequences \
     -H "Authorization: Bearer [tu-anon-key]" \
     -H "Content-Type: application/json"
   ```

   **Opción B: Usando Postman/Insomnia**
   - Method: `POST`
   - URL: `https://[project-ref].supabase.co/functions/v1/process-sequences`
   - Headers:
     - `Authorization: Bearer [tu-anon-key]`
     - `Content-Type: application/json`
   - Click "Send"

   **Opción C: Usando JavaScript (Browser Console)**
   ```javascript
   fetch('https://[project-ref].supabase.co/functions/v1/process-sequences', {
     method: 'POST',
     headers: {
       'Authorization': 'Bearer [tu-anon-key]',
       'Content-Type': 'application/json'
     }
   })
   .then(r => r.json())
   .then(console.log);
   ```

4. **Verificar Respuesta:**
   Deberías recibir algo como:
   ```json
   {
     "success": true,
     "processed": 0,
     "sent": 0,
     "errors": 0,
     "details": []
   }
   ```

5. **Verificar Logs:**
   - En Supabase Dashboard → Edge Functions → `process-sequences` → **Logs**
   - Deberías ver logs de la ejecución

---

## 📋 PASO 4: Configurar Cron Job

Tienes **3 opciones** para configurar el cron:

### Opción A: Supabase Scheduled Functions ⭐ RECOMENDADO

**Nota:** Esta funcionalidad puede estar en Beta. Si no está disponible, usa Opción B o C.

1. **Ir a Database → Cron Jobs:**
   - Supabase Dashboard → **Database** → **Cron Jobs**
   - O directamente: `https://supabase.com/dashboard/project/[project-id]/database/cron`

2. **Crear Nuevo Cron Job:**
   - Click **"New Cron Job"** o **"Create Cron Job"**
   - Configurar:
     - **Name:** `process-sequences-hourly`
     - **Schedule:** `0 * * * *` (cada hora en el minuto 0)
     - **Function:** `process-sequences`
     - **Enabled:** ✅ (activado)
   - Click **"Create"** o **"Save"**

3. **Verificar:**
   - El cron aparecerá en la lista
   - Se ejecutará automáticamente cada hora

### Opción B: pg_cron (PostgreSQL) ⭐ ALTERNATIVA RECOMENDADA

1. **Habilitar pg_cron** (si no está habilitado):
   - Supabase Dashboard → Database → Extensions
   - Buscar **"pg_cron"**
   - Click **"Enable"**

2. **Ir a SQL Editor:**
   - Supabase Dashboard → **SQL Editor**
   - Click **"New Query"**

3. **Ejecutar SQL:**
   
   **Primero, obtener tu Service Role Key:**
   - Supabase Dashboard → Settings → API
   - Copia **"service_role"** key (⚠️ MANTÉN ESTA KEY SECRETA)

   **Luego, ejecuta este SQL** (reemplaza `[project-ref]` y `[service-role-key]`):
   ```sql
   -- Crear cron job para ejecutar process-sequences cada hora
   SELECT cron.schedule(
     'process-sequences-hourly',           -- Nombre del job
     '0 * * * *',                          -- Schedule: cada hora en minuto 0
     $$
     SELECT net.http_post(
       url := 'https://[project-ref].supabase.co/functions/v1/process-sequences',
       headers := jsonb_build_object(
         'Authorization', 'Bearer [service-role-key]',
         'Content-Type', 'application/json'
       ),
       body := '{}'::jsonb
     ) AS request_id;
     $$
   );
   ```

   **Ejemplo con valores reales:**
   ```sql
   SELECT cron.schedule(
     'process-sequences-hourly',
     '0 * * * *',
     $$
     SELECT net.http_post(
       url := 'https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/process-sequences',
       headers := jsonb_build_object(
         'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
         'Content-Type', 'application/json'
       ),
       body := '{}'::jsonb
     ) AS request_id;
     $$
   );
   ```

4. **Verificar que se creó:**
   ```sql
   -- Ver todos los cron jobs
   SELECT * FROM cron.job;
   ```

5. **Verificar ejecución:**
   ```sql
   -- Ver historial de ejecuciones
   SELECT * FROM cron.job_run_details 
   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-sequences-hourly')
   ORDER BY start_time DESC
   LIMIT 10;
   ```

### Opción C: Vercel Cron (Si el proyecto está en Vercel)

1. **Crear archivo `vercel.json`** en la raíz del proyecto:
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

2. **Crear API Route** `api/process-sequences.js`:
   ```javascript
   export default async function handler(req, res) {
     const response = await fetch(
       `https://[project-ref].supabase.co/functions/v1/process-sequences`,
       {
         method: 'POST',
         headers: {
           'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
           'Content-Type': 'application/json'
         }
       }
     );
     
     const data = await response.json();
     res.status(200).json(data);
   }
   ```

3. **Desplegar en Vercel:**
   - Vercel detectará automáticamente el cron
   - Se ejecutará cada hora

---

## 📋 PASO 5: Verificar que el Cron Funciona

### Verificar Ejecución Automática

1. **Esperar 1 hora** (o cambiar temporalmente el schedule a cada minuto para test)

2. **Verificar Logs:**
   - Supabase Dashboard → Edge Functions → `process-sequences` → **Logs**
   - Deberías ver ejecuciones automáticas cada hora

3. **Verificar en Base de Datos:**
   - Si usaste pg_cron, ejecuta:
     ```sql
     SELECT * FROM cron.job_run_details 
     WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-sequences-hourly')
     ORDER BY start_time DESC
     LIMIT 5;
     ```

### Test Rápido (Cambiar Schedule Temporalmente)

Si quieres probar sin esperar 1 hora:

1. **Para pg_cron:**
   ```sql
   -- Eliminar job actual
   SELECT cron.unschedule('process-sequences-hourly');
   
   -- Crear nuevo con schedule cada minuto (solo para test)
   SELECT cron.schedule(
     'process-sequences-test',
     '* * * * *',  -- Cada minuto
     $$
     SELECT net.http_post(
       url := 'https://[project-ref].supabase.co/functions/v1/process-sequences',
       headers := jsonb_build_object(
         'Authorization', 'Bearer [service-role-key]',
         'Content-Type', 'application/json'
       ),
       body := '{}'::jsonb
     ) AS request_id;
     $$
   );
   
   -- Esperar 2-3 minutos y verificar logs
   -- Luego eliminar y crear el definitivo cada hora
   SELECT cron.unschedule('process-sequences-test');
   ```

---

## 📋 PASO 6: Monitoreo y Mantenimiento

### Ver Logs

- **Supabase Dashboard** → Edge Functions → `process-sequences` → **Logs**
- Filtra por fecha/hora para ver ejecuciones recientes

### Verificar Métricas

La función retorna métricas en cada ejecución:
- `processed`: Cuántos contactos se evaluaron
- `sent`: Cuántos mensajes se enviaron
- `errors`: Cuántos errores hubo
- `details`: Detalles de cada contacto procesado

### Ajustar Frecuencia

Si necesitas cambiar la frecuencia:

**Para pg_cron:**
```sql
-- Eliminar job actual
SELECT cron.unschedule('process-sequences-hourly');

-- Crear nuevo con diferente schedule
-- Cada 30 minutos: '*/30 * * * *'
-- Cada 2 horas: '0 */2 * * *'
-- Cada día a las 9 AM: '0 9 * * *'
```

---

## ⚠️ Troubleshooting

### Error: "Function not found"
- Verifica que la función esté desplegada
- Verifica que el nombre sea exactamente `process-sequences`

### Error: "Unauthorized"
- Verifica que estés usando la key correcta (anon key para manual, service role para cron)
- Verifica que la key no haya expirado

### Error: "Timeout"
- La función puede tardar si hay muchos contactos
- Considera procesar en batches si tienes >1000 contactos

### Cron no se ejecuta
- Verifica que pg_cron esté habilitado
- Verifica que el schedule sea correcto
- Verifica logs de cron: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;`

---

## ✅ Checklist Final

- [ ] Edge Function desplegada
- [ ] Test manual exitoso
- [ ] Cron job configurado
- [ ] Verificación de ejecución automática
- [ ] Logs funcionando correctamente
- [ ] Métricas verificadas

---

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs en Supabase Dashboard
2. Verifica que todas las variables de entorno estén configuradas
3. Verifica que las tablas de BD existan y tengan datos de prueba

---

**¡Listo!** 🎉 Tu cron job debería estar funcionando y procesando secuencias automáticamente cada hora.


