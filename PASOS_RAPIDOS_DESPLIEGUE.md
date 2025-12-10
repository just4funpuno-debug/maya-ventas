# ⚡ Pasos Rápidos de Despliegue

## 1️⃣ Desplegar Edge Function

1. Ir a: https://supabase.com/dashboard → Tu Proyecto → **Edge Functions**
2. Click **"Create a new function"**
3. Nombre: `process-sequences`
4. Copiar contenido de `supabase/functions/process-sequences/index.ts`
5. Pegar y click **"Deploy"**

## 2️⃣ Test Manual

```bash
curl -X POST https://[project-ref].supabase.co/functions/v1/process-sequences \
  -H "Authorization: Bearer [tu-anon-key]" \
  -H "Content-Type: application/json"
```

## 3️⃣ Configurar Cron (pg_cron)

1. **Habilitar pg_cron:**
   - Database → Extensions → Buscar "pg_cron" → Enable

2. **Ejecutar en SQL Editor:**
   ```sql
   SELECT cron.schedule(
     'process-sequences-hourly',
     '0 * * * *',
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

3. **Reemplazar:**
   - `[project-ref]`: Tu project ref (ej: `alwxhiombhfyjyyziyxz`)
   - `[service-role-key]`: Service role key de Settings → API

## 4️⃣ Verificar

- Ver logs: Edge Functions → process-sequences → Logs
- Ver cron: SQL Editor → `SELECT * FROM cron.job;`

---

**¡Listo!** Se ejecutará cada hora automáticamente.


