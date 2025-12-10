# Instrucciones: Agregar Columna productos a users

## Objetivo
Agregar la columna `productos` (array de SKUs) a la tabla `users` para poder asignar productos específicos a cada vendedora.

## Pasos

### 1. Ejecutar el script SQL
Ejecuta el archivo `scripts/add-productos-column-to-users.sql` en el SQL Editor de Supabase:

1. Ve a: https://supabase.com/dashboard/project/alwxhiombhfyjyyziyxz/sql/new
2. Copia y pega el contenido de `scripts/add-productos-column-to-users.sql`
3. Haz clic en "Run" o "Ejecutar"

### 2. Verificar que se agregó correctamente
Ejecuta esta consulta para verificar:

```sql
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'productos';
```

Deberías ver:
- `column_name`: productos
- `data_type`: ARRAY
- `column_default`: '{}'

### 3. Probar la funcionalidad
1. Ve al menú "Usuarios" en localhost
2. Crea o edita un usuario vendedora
3. Asigna algunos productos usando los checkboxes
4. Guarda los cambios
5. Verifica que los productos se guardan correctamente

## Funcionalidad

- **Si una vendedora tiene productos asignados**: Solo puede ver/vender esos productos
- **Si una vendedora NO tiene productos asignados (array vacío)**: Puede ver/vender todos los productos
- **Si es admin**: Siempre puede ver/vender todos los productos

## Notas

- La columna es de tipo `text[]` (array de texto) en PostgreSQL
- Se crea un índice GIN para búsquedas rápidas
- El valor por defecto es un array vacío `'{}'`


