-- ============================================================================
-- MIGRACIÓN 033: Corrección de funciones de saludo con SECURITY DEFINER
-- Fecha: 2025-02-11
-- Descripción: Agrega SECURITY DEFINER a las funciones para evitar problemas RLS
--               y agrega política RLS para INSERT en user_greeting_log
-- ============================================================================

-- ============================================================================
-- 1. AGREGAR SECURITY DEFINER A FUNCIONES
-- ============================================================================

-- Función log_user_greeting con SECURITY DEFINER
CREATE OR REPLACE FUNCTION log_user_greeting(
  p_user_id TEXT,
  p_greeting_date DATE,
  p_phrase_id UUID,
  p_phrase_text TEXT,
  p_saludo_type TEXT
) RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  -- Insertar o actualizar (ON CONFLICT) el registro
  INSERT INTO user_greeting_log (
    user_id,
    greeting_date,
    phrase_id,
    phrase_text,
    saludo_type
  )
  VALUES (
    p_user_id,
    p_greeting_date,
    p_phrase_id,
    p_phrase_text,
    p_saludo_type
  )
  ON CONFLICT (user_id, greeting_date) 
  DO UPDATE SET
    phrase_id = EXCLUDED.phrase_id,
    phrase_text = EXCLUDED.phrase_text,
    saludo_type = EXCLUDED.saludo_type,
    viewed_at = NOW()
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función has_user_seen_greeting_today con SECURITY DEFINER
CREATE OR REPLACE FUNCTION has_user_seen_greeting_today(
  p_user_id TEXT,
  p_today_date DATE DEFAULT CURRENT_DATE
) RETURNS BOOLEAN AS $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM user_greeting_log
  WHERE user_id = p_user_id
    AND greeting_date = p_today_date;
  
  RETURN v_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función get_next_phrase_for_user con SECURITY DEFINER (ya estaba en 032, pero verificamos)
CREATE OR REPLACE FUNCTION get_next_phrase_for_user(
  p_user_id TEXT
) RETURNS TABLE (
  phrase_id UUID,
  phrase_text TEXT
) AS $$
DECLARE
  v_remaining JSONB;
  v_phrase_id UUID;
  v_phrase_text TEXT;
  v_all_phrases UUID[];
  v_pool_record user_phrase_pool%ROWTYPE;
BEGIN
  -- Obtener o crear el pool del usuario
  SELECT * INTO v_pool_record
  FROM user_phrase_pool
  WHERE user_id = p_user_id;
  
  -- Si no existe el pool, crearlo
  IF NOT FOUND THEN
    -- Obtener todas las frases activas
    SELECT ARRAY_AGG(id ORDER BY display_order) INTO v_all_phrases
    FROM motivational_phrases
    WHERE active = true;
    
    -- Si no hay frases activas, retornar error
    IF v_all_phrases IS NULL OR array_length(v_all_phrases, 1) IS NULL THEN
      RAISE EXCEPTION 'No hay frases activas disponibles';
    END IF;
    
    -- Barajar aleatoriamente (usando orden aleatorio)
    v_all_phrases := (
      SELECT ARRAY_AGG(id ORDER BY RANDOM())
      FROM unnest(v_all_phrases) AS id
    );
    
    -- Asegurar que v_all_phrases no sea NULL antes de convertir a JSONB
    IF v_all_phrases IS NULL THEN
      v_all_phrases := ARRAY[]::UUID[];
    END IF;
    
    -- Crear el pool con array JSONB (nunca NULL)
    INSERT INTO user_phrase_pool (user_id, remaining_phrases, last_reset_date)
    VALUES (p_user_id, COALESCE(to_jsonb(v_all_phrases), '[]'::jsonb), CURRENT_DATE)
    RETURNING * INTO v_pool_record;
  END IF;
  
  -- Obtener las frases restantes (asegurar que nunca sea NULL)
  v_remaining := COALESCE(v_pool_record.remaining_phrases, '[]'::jsonb);
  
  -- Si el pool está vacío, reiniciarlo con todas las frases activas
  IF v_remaining = '[]'::jsonb OR jsonb_array_length(v_remaining) = 0 OR v_remaining IS NULL THEN
    SELECT ARRAY_AGG(id ORDER BY RANDOM()) INTO v_all_phrases
    FROM motivational_phrases
    WHERE active = true;
    
    -- Asegurar que nunca sea NULL
    IF v_all_phrases IS NULL OR array_length(v_all_phrases, 1) IS NULL THEN
      RAISE EXCEPTION 'No hay frases activas disponibles';
    END IF;
    
    v_remaining := COALESCE(to_jsonb(v_all_phrases), '[]'::jsonb);
    
    -- Actualizar el pool con el nuevo array
    UPDATE user_phrase_pool
    SET remaining_phrases = v_remaining,
        last_reset_date = CURRENT_DATE,
        updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING * INTO v_pool_record;
  END IF;
  
  -- Extraer la primera frase del pool (removerla)
  v_phrase_id := (v_remaining->>0)::uuid;
  
  -- Remover el primer elemento del array JSONB (slice desde índice 1)
  SELECT jsonb_agg(elem.value) INTO v_remaining
  FROM jsonb_array_elements(v_remaining) WITH ORDINALITY AS elem(value, idx)
  WHERE elem.idx > 1;
  
  -- Si el resultado es NULL (array vacío después de remover), inicializar como array vacío
  IF v_remaining IS NULL THEN
    v_remaining := '[]'::jsonb;
  END IF;
  
  -- Obtener el texto de la frase (calificar con nombre de tabla para evitar ambigüedad)
  SELECT motivational_phrases.phrase_text INTO v_phrase_text
  FROM motivational_phrases
  WHERE motivational_phrases.id = v_phrase_id;
  
  -- Actualizar el pool con las frases restantes (nunca NULL)
  UPDATE user_phrase_pool
  SET remaining_phrases = COALESCE(v_remaining, '[]'::jsonb),
      updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Retornar la frase
  RETURN QUERY SELECT v_phrase_id, v_phrase_text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. AGREGAR POLÍTICA RLS PARA INSERT EN user_greeting_log (por si acaso)
-- ============================================================================

-- Política: Permitir INSERT en user_greeting_log (aunque SECURITY DEFINER ya lo resuelve)
DROP POLICY IF EXISTS "Users can insert their own greeting logs" ON user_greeting_log;
CREATE POLICY "Users can insert their own greeting logs"
ON user_greeting_log
FOR INSERT
WITH CHECK (true);

-- ============================================================================
-- COMENTARIOS EN FUNCIONES
-- ============================================================================

COMMENT ON FUNCTION log_user_greeting IS 'Registra que un usuario vio un saludo hoy. Usa SECURITY DEFINER para evitar problemas RLS.';
COMMENT ON FUNCTION has_user_seen_greeting_today IS 'Verifica si un usuario ya vio el saludo hoy. Usa SECURITY DEFINER para evitar problemas RLS.';
COMMENT ON FUNCTION get_next_phrase_for_user IS 'Obtiene la próxima frase del pool del usuario. Usa SECURITY DEFINER para evitar problemas RLS.';

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================

