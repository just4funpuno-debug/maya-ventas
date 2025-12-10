-- Script para agregar campos faltantes a la tabla mis_numeros
-- NOTA: Este script es para la tabla ANTES del renombrado a mis_numeros
-- Si ya ejecutaste rename-numbers-to-mis-numeros.sql, usa el script actualizado

-- Agregar columna telefonia si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'mis_numeros' AND column_name = 'telefonia'
  ) THEN
    ALTER TABLE mis_numeros ADD COLUMN telefonia text;
  END IF;
END $$;

-- Agregar columna nombre_otro si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'mis_numeros' AND column_name = 'nombre_otro'
  ) THEN
    ALTER TABLE mis_numeros ADD COLUMN nombre_otro text;
  END IF;
END $$;

-- Migrar datos existentes: si hay datos en 'email' pero no en 'telefonia', copiar
UPDATE mis_numeros 
SET telefonia = email 
WHERE telefonia IS NULL AND email IS NOT NULL;

-- Comentarios para documentación
COMMENT ON COLUMN mis_numeros.telefonia IS 'Línea telefónica (Entel, Tigo, Viva, etc.)';
COMMENT ON COLUMN mis_numeros.nombre_otro IS 'Nombre del producto cuando sku=''otros''';

