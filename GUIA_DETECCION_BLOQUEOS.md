# Guía: Detección Automática de Bloqueos

## Descripción

El sistema detecta automáticamente contactos bloqueados o con problemas de entrega, verificando el estado de los mensajes enviados y calculando la probabilidad de bloqueo.

## Cómo Funciona

### 1. Detección Automática

El sistema ejecuta automáticamente cada **6 horas** (00:00, 06:00, 12:00, 18:00) para:
- Verificar el estado de mensajes enviados hace más de 72 horas
- Calcular la probabilidad de bloqueo (0-100%)
- Marcar contactos como bloqueados si la probabilidad es ≥ 80%
- Pausar automáticamente las secuencias de contactos bloqueados

### 2. Cálculo de Probabilidad

La probabilidad se calcula basándose en:
- **Mensajes consecutivos sin entregar**: Cuántos mensajes seguidos no se entregaron
- **Días sin entregar**: Cuántos días han pasado sin entrega exitosa
- **Estado en WhatsApp API**: Estado real del mensaje en WhatsApp

**Rangos:**
- **0-49%**: Contacto activo (sin problemas)
- **50-79%**: Contacto sospechoso (revisar manualmente)
- **80-100%**: Contacto bloqueado (marcado automáticamente)

### 3. Acciones Automáticas

Cuando se detecta un bloqueo (≥ 80%):
- Se marca el contacto como `is_blocked = true`
- Se pausa automáticamente la secuencia activa
- Se registra un issue en `whatsapp_delivery_issues`
- Se actualiza la probabilidad de bloqueo

## Verificación Manual

### Verificar Estado de un Mensaje

1. Ve al panel **"💬 Chat WhatsApp"**
2. Selecciona el contacto
3. Revisa el estado de los mensajes enviados
4. Los mensajes con estado "undelivered" indican problemas

### Verificar Contactos Bloqueados

1. Ve al panel **"🚫 Contactos Bloqueados"**
2. Revisa la lista de contactos bloqueados
3. Cada contacto muestra:
   - Probabilidad de bloqueo
   - Mensajes consecutivos sin entregar
   - Última interacción
   - Issues de entrega

## Gestión de Contactos Bloqueados

### Reactivar un Contacto

Si un contacto fue marcado incorrectamente como bloqueado:

1. Ve al panel **"🚫 Contactos Bloqueados"**
2. Selecciona el contacto bloqueado
3. Haz clic en **"Reactivar"**
4. Confirma la acción
5. El contacto será marcado como activo y las secuencias se reanudarán

### Agregar Nota

Para documentar información sobre un contacto:

1. Selecciona el contacto
2. Haz clic en **"Nota"**
3. Escribe la nota en el modal
4. La nota se guardará con timestamp automático

### Eliminar Contacto

Si un contacto ya no es relevante:

1. Selecciona el contacto
2. Haz clic en **"Eliminar"**
3. Confirma la acción
4. ⚠️ **Advertencia**: Esta acción no se puede deshacer

## Estadísticas de Bloqueo

El panel muestra estadísticas en tiempo real:
- **Total**: Número total de contactos
- **Bloqueados**: Contactos marcados como bloqueados
- **Sospechosos**: Contactos con probabilidad 50-79%
- **Activos**: Contactos sin problemas
- **Promedio de probabilidad**: Promedio de probabilidad de bloqueo

## Troubleshooting

### Un contacto está bloqueado pero no debería estarlo

1. Verifica el estado de los mensajes en WhatsApp
2. Si los mensajes se están entregando, reactiva el contacto
3. Revisa los issues de entrega para entender por qué se marcó como bloqueado

### La detección no está funcionando

1. Verifica que el cron job esté activo:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'detect-blocks-6h';
   ```
2. Verifica las ejecuciones recientes:
   ```sql
   SELECT * FROM cron.job_run_details 
   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'detect-blocks-6h')
   ORDER BY start_time DESC LIMIT 5;
   ```
3. Revisa los logs de la Edge Function `detect-blocks`

### Muchos contactos están siendo bloqueados incorrectamente

1. Revisa la configuración de la Edge Function
2. Verifica los umbrales de probabilidad
3. Ajusta los criterios de detección si es necesario
4. Considera reactivar contactos en lote

## Configuración

### Ajustar Frecuencia de Detección

Por defecto, la detección se ejecuta cada 6 horas. Para cambiar:

1. Ve a Supabase Dashboard → Database → Extensions → pg_cron
2. Elimina el cron job existente:
   ```sql
   SELECT cron.unschedule('detect-blocks-6h');
   ```
3. Crea un nuevo cron job con la frecuencia deseada:
   ```sql
   SELECT cron.schedule(
     'detect-blocks-6h',
     '0 */4 * * *',  -- Cada 4 horas
     $$SELECT net.http_post(...)$$
   );
   ```

### Ajustar Umbrales de Probabilidad

Los umbrales están definidos en la Edge Function `detect-blocks`:
- **Bloqueado**: ≥ 80%
- **Sospechoso**: 50-79%

Para cambiar, edita `supabase/functions/detect-blocks/index.ts` y despliega nuevamente.

## Mejores Prácticas

1. **Revisar contactos sospechosos regularmente**: Identifica problemas antes de que se conviertan en bloqueos
2. **Reactivar contactos cuando sea apropiado**: No todos los bloqueos son permanentes
3. **Documentar con notas**: Agrega notas explicativas cuando reactives contactos
4. **Monitorear estadísticas**: Revisa las estadísticas para identificar tendencias
5. **No eliminar contactos innecesariamente**: Los datos históricos son valiosos

## Notas Técnicas

- La detección verifica mensajes enviados hace más de 72 horas
- Solo se verifican mensajes enviados vía Cloud API (no Puppeteer)
- Los contactos bloqueados tienen sus secuencias pausadas automáticamente
- Los issues se registran en `whatsapp_delivery_issues` para auditoría


