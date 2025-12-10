-- Script para agregar la columna 'imagen' a la tabla products
-- Ejecutar en el SQL Editor de Supabase

-- Agregar columna 'imagen' si no existe
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS imagen text;

-- Migrar datos existentes de imagen_url a imagen (si imagen_url tiene datos e imagen está vacía)
UPDATE products 
SET imagen = imagen_url 
WHERE imagen_url IS NOT NULL 
  AND imagen IS NULL;

-- Comentario: La columna 'imagen' será la principal para almacenar URLs de imágenes
-- 'imagen_url' e 'imagen_id' se mantienen para compatibilidad con código legacy si es necesario


