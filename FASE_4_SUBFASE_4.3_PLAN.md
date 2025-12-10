# SUBFASE 4.3: CRON JOBS PARA PROCESAMIENTO AUTOMÁTICO

**Objetivo:** Implementar Edge Function que procese secuencias automáticamente cada hora

## Tareas:

1. **Edge Function de Procesamiento**
   - `supabase/functions/process-sequences/index.ts`
     - Obtener todos los contactos con secuencias activas
     - Para cada contacto, evaluar si debe enviarse siguiente mensaje
     - Integrar `decideSendMethod()` para decidir método
     - Enviar via Cloud API o agregar a Puppeteer
     - Actualizar estados y contadores
     - Logging detallado

2. **Configuración de Cron**
   - Configurar Supabase Cron (pg_cron) o usar Supabase Scheduled Functions
   - Ejecutar cada 1 hora
   - Manejo de errores y reintentos

3. **Monitoreo y Logs**
   - Agregar logs estructurados
   - Métricas de procesamiento

## Archivos a crear:
- `supabase/functions/process-sequences/index.ts`
- `supabase/functions/process-sequences/README.md`

## Testing:
- Test manual: ejecutar Edge Function manualmente
- Verificar que procesa contactos correctamente
- Verificar que decide método correcto (Cloud API vs Puppeteer)
- Verificar que actualiza BD correctamente


