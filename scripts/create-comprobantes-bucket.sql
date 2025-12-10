-- =====================================================
-- Crear bucket para comprobantes en Supabase Storage
-- =====================================================
-- Este script crea el bucket 'comprobantes' para almacenar
-- imágenes y PDFs de comprobantes de pago
-- =====================================================

-- 1. Crear bucket 'comprobantes' si no existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'comprobantes',
  'comprobantes',
  true, -- Público para acceso directo
  2097152, -- 2MB límite (igual que Cloudinary)
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Eliminar políticas antiguas si existen
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload comprobantes" ON storage.objects;
DROP POLICY IF EXISTS "Public can view comprobantes" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete comprobantes" ON storage.objects;

-- 3. Crear políticas RLS para el bucket comprobantes

-- Política: Cualquiera puede ver comprobantes (público)
CREATE POLICY "Public can view comprobantes"
ON storage.objects FOR SELECT
USING (bucket_id = 'comprobantes');

-- Política: Usuarios autenticados pueden subir comprobantes
CREATE POLICY "Authenticated users can upload comprobantes"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'comprobantes' 
  AND auth.role() = 'authenticated'
);

-- Política: Usuarios autenticados pueden actualizar sus comprobantes
CREATE POLICY "Authenticated users can update comprobantes"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'comprobantes' 
  AND auth.role() = 'authenticated'
);

-- Política: Usuarios autenticados pueden eliminar comprobantes
CREATE POLICY "Authenticated users can delete comprobantes"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'comprobantes' 
  AND auth.role() = 'authenticated'
);

-- 4. Verificar que el bucket fue creado
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id = 'comprobantes';


