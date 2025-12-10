-- ============================================================================
-- MIGRACIÓN 032: Corrección de ambigüedad en get_next_phrase_for_user
-- Fecha: 2025-02-01
-- Descripción: Corrige error SQL "column reference phrase_text is ambiguous"
-- ============================================================================

-- Reemplazar la función para corregir la ambigüedad en phrase_text
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
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================

