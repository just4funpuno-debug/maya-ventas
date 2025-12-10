-- ============================================================================
-- VERIFICACIÓN SIMPLE DEL CRON JOB: detect-blocks-6h
-- ============================================================================
-- Esta consulta verifica que el job existe y está activo
-- ============================================================================

SELECT 
  jobid,
  jobname,
  schedule,
  active,
  database,
  username
FROM cron.job 
WHERE jobname = 'detect-blocks-6h';

-- ============================================================================
-- RESULTADO ESPERADO:
-- ============================================================================
-- Deberías ver UNA fila con:
--   - jobid: 2 (o el ID que se asignó)
--   - jobname: 'detect-blocks-6h'
--   - schedule: '0 */6 * * *'
--   - active: true
--   - database: 'postgres' (o el nombre de tu base de datos)
--   - username: 'postgres' (o el usuario configurado)
-- ============================================================================


