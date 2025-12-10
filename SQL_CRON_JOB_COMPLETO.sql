-- ============================================================================
-- CRON JOB: process-sequences (Ejecutar cada hora)
-- ============================================================================
-- Este SQL crea un cron job que ejecuta la Edge Function process-sequences
-- automáticamente cada hora en el minuto 0 (ej: 1:00, 2:00, 3:00...)
-- ============================================================================

SELECT cron.schedule(
  'process-sequences-hourly',           -- Nombre del job
  '0 * * * *',                          -- Schedule: cada hora en minuto 0
  $$
  SELECT net.http_post(
    url := 'https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/process-sequences',
    headers := jsonb_build_object(
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsd3hoaW9tYmhmeWp5eXppeXh6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDM1NzI1NiwiZXhwIjoyMDc5OTMzMjU2fQ.R5X9mP_wKEpNEhrAdgRoObqlKWRgEoJD7ArjDyfMLT0',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- ============================================================================
-- VERIFICAR QUE SE CREÓ CORRECTAMENTE
-- ============================================================================
-- Ejecuta esto después para verificar:
-- SELECT * FROM cron.job WHERE jobname = 'process-sequences-hourly';
-- ============================================================================


