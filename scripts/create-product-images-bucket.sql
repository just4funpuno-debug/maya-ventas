-- Script para crear el bucket de imágenes de productos en Supabase Storage
-- Ejecutar en el SQL Editor de Supabase

-- 1. Crear el bucket 'product-images' si no existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true, -- Público para que las imágenes sean accesibles
  5242880, -- 5MB límite de tamaño
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Eliminar políticas existentes si existen (para evitar duplicados)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete" ON storage.objects;

-- 3. Política RLS: Permitir lectura pública (cualquiera puede ver las imágenes)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- 4. Política RLS: Permitir que usuarios autenticados suban imágenes
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images' 
  AND auth.role() = 'authenticated'
);

-- 5. Política RLS: Permitir que usuarios autenticados actualicen sus propias imágenes
CREATE POLICY "Authenticated users can update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'product-images' 
  AND auth.role() = 'authenticated'
);

-- 6. Política RLS: Permitir que usuarios autenticados eliminen imágenes
CREATE POLICY "Authenticated users can delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'product-images' 
  AND auth.role() = 'authenticated'
);

-- Verificar que el bucket se creó correctamente
SELECT * FROM storage.buckets WHERE id = 'product-images';

