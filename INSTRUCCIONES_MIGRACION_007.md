# Instrucciones para Ejecutar Migración 007

## Error Actual
```
column whatsapp_contacts.is_online does not exist
```

Este error ocurre porque la migración `007_whatsapp_ui_improvements.sql` aún no se ha ejecutado en la base de datos.

## Solución: Ejecutar Migración Manualmente

### Opción 1: Desde Supabase Dashboard (Recomendado)

1. **Abre Supabase Dashboard**
   - Ve a tu proyecto en [supabase.com](https://supabase.com)
   - Navega a **SQL Editor** en el menú lateral

2. **Ejecuta el Script SQL**
   - Abre el archivo `EJECUTAR_MIGRACION_007.sql` en este proyecto
   - Copia todo el contenido del archivo
   - Pega el contenido en el SQL Editor de Supabase
   - Haz clic en **Run** o presiona `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)

3. **Verificar Ejecución**
   - Deberías ver mensajes de éxito
   - Al final del script verás las columnas que se agregaron

### Opción 2: Desde Supabase CLI (Si lo tienes instalado)

```bash
# Desde la raíz del proyecto
supabase db push
```

O ejecutar directamente:

```bash
supabase db execute -f supabase/migrations/007_whatsapp_ui_improvements.sql
```

## Verificación

Después de ejecutar la migración, verifica que las columnas existen:

```sql
-- Verificar columnas en whatsapp_contacts
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'whatsapp_contacts' 
  AND column_name IN ('is_online', 'last_seen_at', 'is_pinned', 'is_archived');

-- Verificar columnas en whatsapp_messages
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'whatsapp_messages' 
  AND column_name IN ('reply_to_message_id', 'is_deleted', 'deleted_at');
```

## Columnas que se Agregarán

### whatsapp_contacts
- `is_online` (BOOLEAN) - Indica si el contacto está en línea
- `last_seen_at` (TIMESTAMPTZ) - Última vez que el contacto fue visto
- `is_pinned` (BOOLEAN) - Indica si la conversación está fijada
- `is_archived` (BOOLEAN) - Indica si la conversación está archivada

### whatsapp_messages
- `reply_to_message_id` (UUID) - ID del mensaje al que se está respondiendo
- `is_deleted` (BOOLEAN) - Indica si el mensaje fue eliminado (soft delete)
- `deleted_at` (TIMESTAMPTZ) - Fecha en que el mensaje fue eliminado

## Nota Importante

- Todas las columnas son opcionales (NULL permitido)
- Los valores por defecto son `FALSE` para booleanos y `NULL` para timestamps
- No se perderán datos existentes
- La migración es segura de ejecutar múltiples veces (usa `IF NOT EXISTS`)


