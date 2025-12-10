-- ============================================================================
-- VERIFICACIÓN DEL CRON JOB: detect-blocks-6h
-- ============================================================================
-- Este script verifica que el cron job esté configurado correctamente
-- ============================================================================

-- 1. Verificar que el job existe y está activo
SELECT 
  jobid,
  jobname,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active,
  jobid
FROM cron.job 
WHERE jobname = 'detect-blocks-6h';

-- ============================================================================
-- 2. Verificar el historial de ejecuciones (últimas 10)
-- ============================================================================
SELECT 
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time,
  CASE 
    WHEN end_time IS NOT NULL THEN 
      EXTRACT(EPOCH FROM (end_time - start_time))::INTEGER
    ELSE NULL
  END AS duration_seconds
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'detect-blocks-6h')
ORDER BY start_time DESC
LIMIT 10;

-- ============================================================================
-- 3. Verificar estadísticas del job
-- ============================================================================
SELECT 
  COUNT(*) as total_executions,
  COUNT(CASE WHEN status = 'succeeded' THEN 1 END) as successful,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
  COUNT(CASE WHEN status = 'running' THEN 1 END) as running,
  MIN(start_time) as first_execution,
  MAX(start_time) as last_execution
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'detect-blocks-6h');

-- ============================================================================
-- RESULTADOS ESPERADOS
-- ============================================================================
-- 1. Deberías ver una fila con:
--    - jobname: 'detect-blocks-6h'
--    - schedule: '0 */6 * * *'
--    - active: true
--    - jobid: 2 (o el ID que se asignó)
--
-- 2. Si el job ya se ejecutó, verás el historial de ejecuciones
--    - status: 'succeeded' o 'failed'
--    - return_message: respuesta de la Edge Function
--
-- 3. Estadísticas generales del job
--    - total_executions: número total de ejecuciones
--    - successful: ejecuciones exitosas
--    - failed: ejecuciones fallidas
-- ============================================================================

