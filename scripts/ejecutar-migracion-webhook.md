# 📝 Ejecutar Migración SQL del Webhook

## Método 1: Desde Supabase Dashboard (Más Fácil) ✅

1. **Abre tu proyecto en Supabase Dashboard**
   - Ve a: https://supabase.com/dashboard
   - Selecciona tu proyecto

2. **Abre SQL Editor**
   - En el menú lateral izquierdo, haz clic en **SQL Editor**
   - O ve directamente a: https://supabase.com/dashboard/project/[TU_PROJECT_REF]/sql/new

3. **Crea una nueva query**
   - Haz clic en **New Query** (botón verde en la parte superior)

4. **Copia y pega el siguiente SQL:**

```sql
-- ============================================================================
-- MIGRACIÓN 004: FUNCIONES SQL AUXILIARES PARA WEBHOOK
-- Fecha: 2025-01-30
-- Descripción: Funciones SQL para procesamiento de webhooks
-- ============================================================================

-- ============================================================================
-- 1. INCREMENTAR CONTADOR DE CONTACTO
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_contact_counter(
  p_contact_id UUID,
  p_counter VARCHAR(50)
)
RETURNS BOOLEAN AS $$
BEGIN
  IF p_counter = 'total_messages_delivered' THEN
    UPDATE whatsapp_contacts
    SET total_messages_delivered = total_messages_delivered + 1
    WHERE id = p_contact_id;
  ELSIF p_counter = 'total_messages_read' THEN
    UPDATE whatsapp_contacts
    SET total_messages_read = total_messages_read + 1
    WHERE id = p_contact_id;
  ELSIF p_counter = 'total_messages_sent' THEN
    UPDATE whatsapp_contacts
    SET total_messages_sent = total_messages_sent + 1
    WHERE id = p_contact_id;
  ELSE
    RAISE EXCEPTION 'Contador desconocido: %', p_counter;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION increment_contact_counter IS 'Incrementa un contador específico del contacto (total_messages_delivered, total_messages_read, total_messages_sent)';
```

5. **Ejecuta la query**
   - Haz clic en **Run** (botón azul)
   - O presiona `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)

6. **Verifica el resultado**
   - Deberías ver: `Success. No rows returned`
   - Si hay errores, revísalos y corrígelos

7. **Verifica que la función se creó**
   - Ejecuta esta query para verificar:

```sql
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'increment_contact_counter';
```

Deberías ver una fila con `increment_contact_counter` y tipo `FUNCTION`.

---

## Método 2: Desde Terminal (si tienes Supabase CLI)

```bash
# Si estás linkeado al proyecto
supabase db push

# O ejecutar migración específica
supabase migration up
```

---

## ✅ Verificación

Después de ejecutar, verifica que la función existe:

```sql
-- Probar la función (debería retornar true)
SELECT increment_contact_counter(
  '00000000-0000-0000-0000-000000000000'::UUID,
  'total_messages_sent'
);
```

**Nota:** Esto dará error si el contacto no existe, pero confirma que la función está creada.

---

**Listo!** Ahora puedes continuar con el despliegue de la Edge Function.

