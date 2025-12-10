-- Agregar columna productos a la tabla users
-- Esta columna almacena un array de SKUs de productos asignados a cada vendedora

-- 1. Agregar columna productos como array de texto
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS productos text[] DEFAULT '{}';

-- 2. Crear índice para búsquedas rápidas (opcional, útil si necesitas buscar usuarios por producto)
CREATE INDEX IF NOT EXISTS idx_users_productos ON users USING GIN (productos);

-- 3. Comentario para documentar la columna
COMMENT ON COLUMN users.productos IS 'Array de SKUs de productos asignados a la vendedora. Si está vacío o es admin, puede ver todos los productos.';

-- 4. Verificación: Ver usuarios con productos asignados
SELECT id, username, nombre, apellidos, rol, productos FROM users WHERE array_length(productos, 1) > 0;

