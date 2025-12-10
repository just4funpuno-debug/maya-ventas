-- Fase 1: Crear tabla de grupos en Supabase
-- Esta tabla almacenará los grupos disponibles para asignar a usuarios

-- 1. Crear tabla de grupos
CREATE TABLE IF NOT EXISTS grupos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text UNIQUE NOT NULL,
  descripcion text,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Insertar los 3 grupos iniciales
INSERT INTO grupos (nombre, descripcion, activo) VALUES
  ('Grupo A', 'Grupo A de vendedoras', true),
  ('Grupo B', 'Grupo B de vendedoras', true),
  ('Grupo C', 'Grupo C de vendedoras', true)
ON CONFLICT (nombre) DO NOTHING;

-- 3. Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_grupos_nombre ON grupos(nombre);
CREATE INDEX IF NOT EXISTS idx_grupos_activo ON grupos(activo);

-- 4. Habilitar Row Level Security (RLS)
ALTER TABLE grupos ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS: todos los autenticados pueden leer, solo admins pueden modificar
DROP POLICY IF EXISTS "grupos_select_all" ON grupos;
DROP POLICY IF EXISTS "grupos_admin_all" ON grupos;

CREATE POLICY "grupos_select_all" ON grupos 
  FOR SELECT 
  USING (auth.role() = 'authenticated');

-- Política para admins: solo usuarios con rol 'admin' en la tabla users pueden modificar
CREATE POLICY "grupos_admin_all" ON grupos 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.id = auth.uid() 
      AND u.rol = 'admin'
    )
  );

-- 6. Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION set_grupos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS grupos_updated ON grupos;
CREATE TRIGGER grupos_updated
  BEFORE UPDATE ON grupos
  FOR EACH ROW
  EXECUTE FUNCTION set_grupos_updated_at();

-- 7. Habilitar Realtime para sincronización en tiempo real
ALTER PUBLICATION supabase_realtime ADD TABLE grupos;

-- Verificación: Ver los grupos creados
SELECT id, nombre, descripcion, activo, created_at FROM grupos ORDER BY nombre;

