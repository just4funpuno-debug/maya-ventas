# 📋 Instrucciones para Ejecutar Migración 009

## 🎯 Objetivo

Ejecutar la migración 009 que crea la tabla `whatsapp_quick_replies` y todas sus dependencias en Supabase.

---

## 📝 Pasos para Ejecutar

### 1. Abrir SQL Editor en Supabase

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. En el menú lateral, haz clic en **"SQL Editor"**
3. Haz clic en **"New query"** para crear una nueva consulta

### 2. Copiar el Script SQL

1. Abre el archivo `EJECUTAR_MIGRACION_009.sql` en tu editor
2. **Copia todo el contenido** del archivo (Ctrl+A, Ctrl+C)

### 3. Pegar y Ejecutar

1. **Pega el contenido** en el SQL Editor de Supabase (Ctrl+V)
2. **Revisa el script** para asegurarte de que está completo
3. Haz clic en **"Run"** o presiona **Ctrl+Enter** para ejecutar

### 4. Verificar Resultados

Después de ejecutar, deberías ver:

- ✅ Mensajes de éxito en la consola
- ✅ Sin errores en rojo
- ✅ Mensaje: "✅ Migración 009 completada: Respuestas Rápidas para WhatsApp"

---

## ✅ Verificación Post-Migración

### Verificar que la Tabla Existe

Ejecuta esta consulta en el SQL Editor:

```sql
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'whatsapp_quick_replies'
ORDER BY ordinal_position;
```

**Resultado esperado**: Deberías ver todas las columnas de la tabla.

### Verificar Índices

```sql
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'whatsapp_quick_replies';
```

**Resultado esperado**: Deberías ver 4 índices.

### Verificar Función

```sql
SELECT 
  proname,
  prosrc
FROM pg_proc
WHERE proname = 'get_quick_replies';
```

**Resultado esperado**: Deberías ver la función `get_quick_replies`.

### Verificar RLS

```sql
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'whatsapp_quick_replies';
```

**Resultado esperado**: `rowsecurity` debería ser `true`.

---

## 🧪 Test Rápido

Para verificar que todo funciona, ejecuta este test:

```sql
-- Obtener una cuenta de prueba
DO $$
DECLARE
  test_account_id UUID;
BEGIN
  -- Buscar una cuenta
  SELECT id INTO test_account_id
  FROM whatsapp_accounts
  LIMIT 1;
  
  IF test_account_id IS NULL THEN
    RAISE NOTICE '⚠️ No hay cuentas WhatsApp para probar';
    RETURN;
  END IF;
  
  -- Probar función get_quick_replies
  PERFORM * FROM get_quick_replies(test_account_id, NULL);
  
  RAISE NOTICE '✅ Función get_quick_replies funciona correctamente';
END $$;
```

---

## ⚠️ Solución de Problemas

### Error: "relation already exists"

Si la tabla ya existe, puedes:

1. **Opción 1**: Eliminar y recrear (⚠️ **CUIDADO**: Esto eliminará todos los datos)
   ```sql
   DROP TABLE IF EXISTS whatsapp_quick_replies CASCADE;
   ```
   Luego ejecuta el script completo de nuevo.

2. **Opción 2**: Verificar qué falta y ejecutar solo las partes faltantes

### Error: "constraint already exists"

Si algún constraint ya existe, puedes:

1. Eliminar el constraint específico:
   ```sql
   ALTER TABLE whatsapp_quick_replies 
   DROP CONSTRAINT IF EXISTS check_trigger_starts_with_slash;
   ```
2. Luego ejecuta solo la parte del constraint del script.

### Error: "policy already exists"

Si alguna política ya existe, puedes:

1. Eliminar la política:
   ```sql
   DROP POLICY IF EXISTS "whatsapp_quick_replies_select_all" ON whatsapp_quick_replies;
   ```
2. Luego ejecuta solo la parte de políticas del script.

---

## 📞 Soporte

Si encuentras algún error que no puedas resolver:

1. **Copia el mensaje de error completo**
2. **Toma una captura de pantalla** del SQL Editor
3. **Verifica** que tienes los permisos necesarios en Supabase

---

## ✅ Checklist de Verificación

- [ ] Script ejecutado sin errores
- [ ] Tabla `whatsapp_quick_replies` existe
- [ ] Índices creados (4 índices)
- [ ] RLS habilitado
- [ ] Políticas creadas (4 políticas)
- [ ] Función `get_quick_replies` existe
- [ ] Trigger `whatsapp_quick_replies_updated_at` existe
- [ ] CHECK constraints creados (5 constraints)
- [ ] Test rápido ejecutado exitosamente

---

**Una vez completado, avisa para continuar con SUBFASE 2.2: Servicios Backend** 🚀

