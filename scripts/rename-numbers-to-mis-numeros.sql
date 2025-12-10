-- Script para renombrar la tabla numbers a mis_numeros
-- Ejecutar en Supabase SQL Editor

-- 1. Renombrar la tabla
ALTER TABLE numbers RENAME TO mis_numeros;

-- 2. Actualizar políticas RLS (eliminar las antiguas y crear nuevas con el nuevo nombre)
DROP POLICY IF EXISTS "open_select_numbers" ON mis_numeros;
DROP POLICY IF EXISTS "open_modify_numbers" ON mis_numeros;

CREATE POLICY "open_select_numbers" ON mis_numeros FOR SELECT USING (true);
CREATE POLICY "open_modify_numbers" ON mis_numeros FOR ALL USING (true) WITH CHECK (true);

-- 3. Actualizar Realtime (si está habilitado)
-- Nota: Si ya habías ejecutado enable-realtime-numbers.sql, esto actualiza la publicación
-- Eliminar 'numbers' de la publicación si existe (manejo seguro de errores)
DO $$
BEGIN
  -- Intentar eliminar 'numbers' de la publicación (puede fallar si no existe, pero es seguro)
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE numbers;
  EXCEPTION WHEN OTHERS THEN
    -- Si la tabla no está en la publicación, simplemente continuar
    NULL;
  END;
  
  -- Agregar 'mis_numeros' a la publicación
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE mis_numeros;
  EXCEPTION WHEN duplicate_object THEN
    -- Si ya está en la publicación, no hacer nada
    NULL;
  END;
END $$;

-- 4. Verificar que el cambio se aplicó correctamente
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mis_numeros';

