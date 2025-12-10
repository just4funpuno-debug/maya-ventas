# Fase 1: Crear Tabla de Grupos en Supabase

## Objetivo
Crear la estructura de base de datos para almacenar los grupos disponibles.

## Pasos

### 1. Ejecutar el script SQL
Ejecuta el archivo `scripts/create-grupos-table.sql` en el SQL Editor de Supabase:

1. Ve a: https://supabase.com/dashboard/project/alwxhiombhfyjyyziyxz/sql/new
2. Copia y pega el contenido de `scripts/create-grupos-table.sql`
3. Haz clic en "Run" o "Ejecutar"

### 2. Verificar que se creó correctamente
Ejecuta esta consulta para verificar:

```sql
SELECT id, nombre, descripcion, activo FROM grupos ORDER BY nombre;
```

Deberías ver 3 grupos:
- Grupo A
- Grupo B
- Grupo C

### 3. Verificar Realtime
Verifica que Realtime esté habilitado:
- Ve a Database → Replication
- Busca la tabla `grupos`
- Debe estar marcada como "Enabled"

## Resultado Esperado
- ✅ Tabla `grupos` creada
- ✅ 3 grupos iniciales insertados
- ✅ RLS habilitado (todos pueden leer, solo admins pueden modificar)
- ✅ Realtime habilitado
- ✅ Índices creados

## Siguiente Fase
Una vez completada esta fase, procederemos a la **Fase 2: Crear componente selector de grupos**.


