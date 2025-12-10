-- ============================================================================
-- CRON JOB: detect-blocks (Ejecutar cada 6 horas)
-- ============================================================================
-- Este SQL crea un cron job que ejecuta la Edge Function detect-blocks
-- automáticamente cada 6 horas (ej: 0:00, 6:00, 12:00, 18:00...)
-- ============================================================================
-- FASE 5: SUBFASE 5.2 - Detección Automática de Bloqueos
-- ============================================================================

SELECT cron.schedule(
  'detect-blocks-6h',           -- Nombre del job
  '0 */6 * * *',               -- Schedule: cada 6 horas en minuto 0
  $$
  SELECT net.http_post(
    url := 'https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/detect-blocks',
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
-- SELECT * FROM cron.job WHERE jobname = 'detect-blocks-6h';
-- ============================================================================

-- ============================================================================
-- NOTAS IMPORTANTES
-- ============================================================================
-- 1. El SERVICE_ROLE_KEY usado aquí es el mismo que para process-sequences
-- 2. El cron job se ejecutará cada 6 horas en los minutos 0 (0:00, 6:00, 12:00, 18:00)
-- 3. Para desactivar temporalmente: SELECT cron.unschedule('detect-blocks-6h');
-- 4. Para reactivar: Ejecutar este script nuevamente
-- ============================================================================

