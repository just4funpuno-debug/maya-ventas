-- Script para actualizar la política de grupos para que solo admins puedan modificar
-- Ejecuta este script DESPUÉS de que la tabla users esté creada y funcionando

-- Eliminar política temporal
DROP POLICY IF EXISTS "grupos_admin_all" ON grupos;

-- Crear política que verifica rol admin en users
CREATE POLICY "grupos_admin_all" ON grupos 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.id = auth.uid() 
      AND u.rol = 'admin'
    )
  );


