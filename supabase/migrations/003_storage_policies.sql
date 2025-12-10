-- ============================================================================
-- POLÍTICAS DE STORAGE PARA WHATSAPP-MEDIA
-- Fecha: 2025-01-30
-- Descripción: Políticas de acceso al bucket whatsapp-media
-- 
-- ⚠️ IMPORTANTE: Este archivo debe ejecutarse con SERVICE_ROLE key
-- o desde Supabase Dashboard > Storage > whatsapp-media > Policies
-- ============================================================================

-- Asegurarse de que el bucket existe antes de crear políticas
-- Si el bucket no existe, crearlo desde Dashboard > Storage

-- Política 1: Lectura pública de archivos
DROP POLICY IF EXISTS "whatsapp_media_public_read" ON storage.objects;

CREATE POLICY "whatsapp_media_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'whatsapp-media');

COMMENT ON POLICY "whatsapp_media_public_read" ON storage.objects IS 
'Permite lectura pública de archivos en bucket whatsapp-media (para URLs de mensajes)';

-- Política 2: Inserción (solo service_role o authenticated)
DROP POLICY IF EXISTS "whatsapp_media_insert" ON storage.objects;

CREATE POLICY "whatsapp_media_insert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'whatsapp-media' AND
  (auth.role() = 'service_role' OR auth.role() = 'authenticated')
);

COMMENT ON POLICY "whatsapp_media_insert" ON storage.objects IS 
'Permite inserción de archivos en whatsapp-media solo para service_role o authenticated users';

-- Política 3: Actualización (solo service_role o authenticated)
DROP POLICY IF EXISTS "whatsapp_media_update" ON storage.objects;

CREATE POLICY "whatsapp_media_update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'whatsapp-media' AND
  (auth.role() = 'service_role' OR auth.role() = 'authenticated')
);

COMMENT ON POLICY "whatsapp_media_update" ON storage.objects IS 
'Permite actualización de archivos en whatsapp-media solo para service_role o authenticated users';

-- Política 4: Eliminación (solo service_role o authenticated)
DROP POLICY IF EXISTS "whatsapp_media_delete" ON storage.objects;

CREATE POLICY "whatsapp_media_delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'whatsapp-media' AND
  (auth.role() = 'service_role' OR auth.role() = 'authenticated')
);

COMMENT ON POLICY "whatsapp_media_delete" ON storage.objects IS 
'Permite eliminación de archivos en whatsapp-media solo para service_role o authenticated users';

-- Verificación
DO $$
DECLARE
  v_policy_count INT;
BEGIN
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname LIKE 'whatsapp_media%';
  
  IF v_policy_count >= 4 THEN
    RAISE NOTICE '✅ Políticas de Storage creadas correctamente (%/4)', v_policy_count;
  ELSE
    RAISE WARNING '⚠️ Solo se encontraron %/4 políticas de Storage', v_policy_count;
  END IF;
END $$;

