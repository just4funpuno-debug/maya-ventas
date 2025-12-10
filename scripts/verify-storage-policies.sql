-- Script para verificar las políticas RLS del bucket product-images
-- Ejecutar en el SQL Editor de Supabase

-- Verificar políticas existentes
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname IN (
    'Public Access',
    'Authenticated users can upload',
    'Authenticated users can update',
    'Authenticated users can delete'
  )
ORDER BY policyname;


