-- ============================================================================
-- MIGRACIÓN 003: CONFIGURACIÓN DE STORAGE Y REALTIME
-- Fecha: 2025-01-30
-- Descripción: Configura bucket de Storage para media de WhatsApp y
--               habilita Realtime en tablas críticas
-- ============================================================================

-- ============================================================================
-- 1. CREAR BUCKET PARA MEDIA DE WHATSAPP
-- ============================================================================

-- Nota: La creación de buckets debe hacerse desde la UI de Supabase o via API
-- Este script solo crea las políticas de acceso
-- Para crear el bucket manualmente:
-- 1. Ir a Supabase Dashboard > Storage
-- 2. Crear bucket "whatsapp-media"
-- 3. Configurar como público (opcional, según necesidades)

-- Verificar si el bucket existe (solo para referencia, no se puede crear via SQL)
DO $$
BEGIN
  -- El bucket debe crearse manualmente desde la UI de Supabase
  RAISE NOTICE '⚠️ IMPORTANTE: Crear bucket "whatsapp-media" manualmente desde Supabase Dashboard > Storage';
  RAISE NOTICE '   Configuración recomendada:';
  RAISE NOTICE '   - Nombre: whatsapp-media';
  RAISE NOTICE '   - Público: Sí (para acceso a media)';
  RAISE NOTICE '   - File size limit: 10MB';
  RAISE NOTICE '   - Allowed MIME types: image/*, video/*, audio/*, application/pdf';
END $$;

-- ============================================================================
-- 2. POLÍTICAS DE ACCESO AL BUCKET
-- ============================================================================

-- ⚠️ IMPORTANTE: Las políticas de Storage requieren permisos de service_role
-- Si este script falla con "must be owner of relation objects", ejecutar
-- las políticas manualmente desde Supabase Dashboard > Storage > Policies
-- o usar la API de Supabase con service_role key

-- Intentar crear políticas (puede fallar si no hay permisos suficientes)
DO $$
BEGIN
  -- Política: Permitir lectura pública de archivos en whatsapp-media
  BEGIN
    BEGIN
      EXECUTE 'DROP POLICY IF EXISTS "whatsapp_media_public_read" ON storage.objects';
    EXCEPTION WHEN OTHERS THEN
      -- Ignorar error si no existe o no hay permisos
    END;
    
    EXECUTE 'CREATE POLICY "whatsapp_media_public_read"
      ON storage.objects FOR SELECT
      USING (bucket_id = ''whatsapp-media'')';
    RAISE NOTICE '✅ Política whatsapp_media_public_read creada';
  EXCEPTION WHEN insufficient_privilege OR OTHERS THEN
    RAISE WARNING '⚠️ No se pudo crear política whatsapp_media_public_read: %. Crear manualmente desde Dashboard', SQLERRM;
  END;

  -- Política: Permitir inserción solo con service role o authenticated users
  BEGIN
    BEGIN
      EXECUTE 'DROP POLICY IF EXISTS "whatsapp_media_insert" ON storage.objects';
    EXCEPTION WHEN OTHERS THEN
      -- Ignorar error si no existe o no hay permisos
    END;
    
    EXECUTE 'CREATE POLICY "whatsapp_media_insert"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = ''whatsapp-media'' AND
        (auth.role() = ''service_role'' OR auth.role() = ''authenticated'')
      )';
    RAISE NOTICE '✅ Política whatsapp_media_insert creada';
  EXCEPTION WHEN insufficient_privilege OR OTHERS THEN
    RAISE WARNING '⚠️ No se pudo crear política whatsapp_media_insert: %. Crear manualmente desde Dashboard', SQLERRM;
  END;

  -- Política: Permitir actualización solo con service role o authenticated users
  BEGIN
    BEGIN
      EXECUTE 'DROP POLICY IF EXISTS "whatsapp_media_update" ON storage.objects';
    EXCEPTION WHEN OTHERS THEN
      -- Ignorar error si no existe o no hay permisos
    END;
    
    EXECUTE 'CREATE POLICY "whatsapp_media_update"
      ON storage.objects FOR UPDATE
      USING (
        bucket_id = ''whatsapp-media'' AND
        (auth.role() = ''service_role'' OR auth.role() = ''authenticated'')
      )';
    RAISE NOTICE '✅ Política whatsapp_media_update creada';
  EXCEPTION WHEN insufficient_privilege OR OTHERS THEN
    RAISE WARNING '⚠️ No se pudo crear política whatsapp_media_update: %. Crear manualmente desde Dashboard', SQLERRM;
  END;

  -- Política: Permitir eliminación solo con service role o authenticated users
  BEGIN
    BEGIN
      EXECUTE 'DROP POLICY IF EXISTS "whatsapp_media_delete" ON storage.objects';
    EXCEPTION WHEN OTHERS THEN
      -- Ignorar error si no existe o no hay permisos
    END;
    
    EXECUTE 'CREATE POLICY "whatsapp_media_delete"
      ON storage.objects FOR DELETE
      USING (
        bucket_id = ''whatsapp-media'' AND
        (auth.role() = ''service_role'' OR auth.role() = ''authenticated'')
      )';
    RAISE NOTICE '✅ Política whatsapp_media_delete creada';
  EXCEPTION WHEN insufficient_privilege OR OTHERS THEN
    RAISE WARNING '⚠️ No se pudo crear política whatsapp_media_delete: %. Crear manualmente desde Dashboard', SQLERRM;
  END;
END $$;

-- Instrucciones para crear políticas manualmente si fallaron
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '📋 INSTRUCCIONES PARA CREAR POLÍTICAS MANUALMENTE:';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Si las políticas no se crearon automáticamente:';
  RAISE NOTICE '1. Ir a Supabase Dashboard > Storage > whatsapp-media > Policies';
  RAISE NOTICE '2. Crear las siguientes políticas:';
  RAISE NOTICE '';
  RAISE NOTICE 'POLÍTICA 1: whatsapp_media_public_read';
  RAISE NOTICE '  - Operation: SELECT';
  RAISE NOTICE '  - Target roles: public';
  RAISE NOTICE '  - USING expression: bucket_id = ''whatsapp-media''';
  RAISE NOTICE '';
  RAISE NOTICE 'POLÍTICA 2: whatsapp_media_insert';
  RAISE NOTICE '  - Operation: INSERT';
  RAISE NOTICE '  - Target roles: authenticated, service_role';
  RAISE NOTICE '  - WITH CHECK: bucket_id = ''whatsapp-media'' AND (auth.role() = ''service_role'' OR auth.role() = ''authenticated'')';
  RAISE NOTICE '';
  RAISE NOTICE 'POLÍTICA 3: whatsapp_media_update';
  RAISE NOTICE '  - Operation: UPDATE';
  RAISE NOTICE '  - Target roles: authenticated, service_role';
  RAISE NOTICE '  - USING: bucket_id = ''whatsapp-media'' AND (auth.role() = ''service_role'' OR auth.role() = ''authenticated'')';
  RAISE NOTICE '';
  RAISE NOTICE 'POLÍTICA 4: whatsapp_media_delete';
  RAISE NOTICE '  - Operation: DELETE';
  RAISE NOTICE '  - Target roles: authenticated, service_role';
  RAISE NOTICE '  - USING: bucket_id = ''whatsapp-media'' AND (auth.role() = ''service_role'' OR auth.role() = ''authenticated'')';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

-- ============================================================================
-- 3. HABILITAR REALTIME EN TABLAS CRÍTICAS
-- ============================================================================

-- Nota: Realtime se habilita desde la UI de Supabase o via API
-- Este script solo documenta qué tablas deben tener Realtime habilitado
-- Para habilitar Realtime:
-- 1. Ir a Supabase Dashboard > Database > Replication
-- 2. Habilitar Realtime para cada tabla

DO $$
BEGIN
  RAISE NOTICE '⚠️ IMPORTANTE: Habilitar Realtime manualmente desde Supabase Dashboard > Database > Replication';
  RAISE NOTICE '   Tablas que deben tener Realtime habilitado:';
  RAISE NOTICE '   1. whatsapp_contacts - Para actualizar lista de conversaciones en tiempo real';
  RAISE NOTICE '   2. whatsapp_messages - Para mostrar mensajes nuevos en tiempo real';
  RAISE NOTICE '   3. puppeteer_queue - Para mostrar estado de cola en tiempo real';
  RAISE NOTICE '   4. whatsapp_delivery_issues - Para alertas de bloqueos en tiempo real';
END $$;

-- ============================================================================
-- 4. FUNCIÓN AUXILIAR: OBTENER URL PÚBLICA DE ARCHIVO
-- ============================================================================

CREATE OR REPLACE FUNCTION get_whatsapp_media_url(
  p_file_path TEXT,
  p_bucket_name TEXT DEFAULT 'whatsapp-media'
)
RETURNS TEXT AS $$
DECLARE
  v_public_url TEXT;
BEGIN
  -- Construir URL pública del archivo
  -- Formato: https://[project-ref].supabase.co/storage/v1/object/public/[bucket]/[path]
  -- Nota: En producción, obtener project_ref desde variables de entorno o configuración
  
  -- Por ahora, retornar path relativo que se completará en el frontend
  v_public_url := format('/storage/v1/object/public/%s/%s', p_bucket_name, p_file_path);
  
  RETURN v_public_url;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_whatsapp_media_url IS 
'Genera URL pública para archivos en bucket whatsapp-media. En producción, completar con dominio de Supabase';

-- ============================================================================
-- 5. FUNCIÓN AUXILIAR: VALIDAR TIPO DE ARCHIVO
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_whatsapp_media_type(
  p_file_name TEXT,
  p_expected_type VARCHAR(20)
)
RETURNS BOOLEAN AS $$
DECLARE
  v_extension TEXT;
  v_is_valid BOOLEAN;
BEGIN
  -- Extraer extensión del archivo
  v_extension := LOWER(SUBSTRING(p_file_name FROM '\.([^.]+)$'));
  
  -- Validar según tipo esperado
  CASE p_expected_type
    WHEN 'image' THEN
      v_is_valid := v_extension IN ('jpg', 'jpeg', 'png', 'gif', 'webp');
    WHEN 'video' THEN
      v_is_valid := v_extension IN ('mp4', 'mov', 'avi', 'webm');
    WHEN 'audio' THEN
      v_is_valid := v_extension IN ('mp3', 'ogg', 'wav', 'm4a');
    WHEN 'document' THEN
      v_is_valid := v_extension IN ('pdf', 'doc', 'docx', 'txt');
    ELSE
      v_is_valid := false;
  END CASE;
  
  RETURN v_is_valid;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_whatsapp_media_type IS 
'Valida que la extensión del archivo coincida con el tipo de mensaje esperado';

-- ============================================================================
-- 6. VERIFICACIÓN DE CONFIGURACIÓN
-- ============================================================================

-- Verificar que las políticas se crearon correctamente
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

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================

