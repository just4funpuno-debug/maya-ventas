-- Script para agregar columna precio_par a almacen_central
-- Esta columna almacenará el precio por par de productos

-- Agregar columna precio_par si no existe
ALTER TABLE almacen_central 
ADD COLUMN IF NOT EXISTS precio_par numeric(12,2) DEFAULT 0;

-- Verificar que la columna se agregó correctamente
SELECT 
  'Verificación Columna precio_par' as verificacion,
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'almacen_central'
  AND column_name = 'precio_par';

-- Resumen
SELECT 
  'Columna precio_par agregada' as resumen,
  COUNT(*) as total_productos,
  'Listo para usar' as estado
FROM almacen_central;


