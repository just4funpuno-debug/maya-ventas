-- ============================================================================
-- MIGRACIÓN 029: Frases Motivacionales en Supabase
-- FASE 1: Schema y Base de Datos
-- Fecha: 2025-01-31
-- Descripción: Crea tablas para gestionar frases motivacionales y su estado
-- ============================================================================

-- ============================================================================
-- 1. TABLA DE FRASES MOTIVACIONALES
-- ============================================================================
-- Almacena todas las frases motivacionales que se muestran en el saludo diario
-- Solo admin puede gestionar estas frases

CREATE TABLE IF NOT EXISTS motivational_phrases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phrase_text TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Orden para mantener el orden original (opcional)
  display_order INT DEFAULT 0
);

-- Índice para búsquedas rápidas de frases activas
CREATE INDEX IF NOT EXISTS idx_motivational_phrases_active 
ON motivational_phrases(active, display_order);

COMMENT ON TABLE motivational_phrases IS 'Frases motivacionales para el saludo diario de usuarios';
COMMENT ON COLUMN motivational_phrases.phrase_text IS 'Texto de la frase motivacional';
COMMENT ON COLUMN motivational_phrases.active IS 'Si la frase está activa (visible en el saludo)';
COMMENT ON COLUMN motivational_phrases.display_order IS 'Orden de visualización (opcional)';

-- ============================================================================
-- 2. TABLA DE LOG DE SALUDOS MOSTRADOS
-- ============================================================================
-- Rastrea qué frases se mostraron a cada usuario y cuándo
-- Permite controlar "visto: true/false" y evitar mostrar el mismo saludo dos veces en un día

CREATE TABLE IF NOT EXISTS user_greeting_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL, -- ID del usuario (de la tabla users)
  greeting_date DATE NOT NULL, -- Fecha en la que se mostró el saludo
  phrase_id UUID REFERENCES motivational_phrases(id) ON DELETE SET NULL,
  phrase_text TEXT NOT NULL, -- Texto de la frase mostrada (copia por si se elimina la frase)
  saludo_type TEXT NOT NULL CHECK (saludo_type IN ('Buenos días', 'Buenas tardes', 'Buenas noches')),
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Un usuario solo puede tener un saludo registrado por día
  UNIQUE(user_id, greeting_date)
);

-- Índice para búsquedas por usuario y fecha
CREATE INDEX IF NOT EXISTS idx_user_greeting_log_user_date 
ON user_greeting_log(user_id, greeting_date DESC);

-- Índice para búsquedas por frase
CREATE INDEX IF NOT EXISTS idx_user_greeting_log_phrase 
ON user_greeting_log(phrase_id) 
WHERE phrase_id IS NOT NULL;

COMMENT ON TABLE user_greeting_log IS 'Registro de saludos mostrados a cada usuario';
COMMENT ON COLUMN user_greeting_log.user_id IS 'ID del usuario que recibió el saludo';
COMMENT ON COLUMN user_greeting_log.greeting_date IS 'Fecha en la que se mostró el saludo (sin hora)';
COMMENT ON COLUMN user_greeting_log.phrase_id IS 'ID de la frase mostrada (puede ser NULL si la frase fue eliminada)';
COMMENT ON COLUMN user_greeting_log.phrase_text IS 'Texto de la frase mostrada (copia para referencia histórica)';
COMMENT ON COLUMN user_greeting_log.saludo_type IS 'Tipo de saludo: Buenos días, Buenas tardes, Buenas noches';
COMMENT ON COLUMN user_greeting_log.viewed_at IS 'Fecha/hora exacta en que el usuario vio el saludo';

-- ============================================================================
-- 3. TABLA DE POOL DE FRASES POR USUARIO
-- ============================================================================
-- Mantiene el pool de frases restantes para cada usuario
-- Permite evitar repetir frases hasta completar el ciclo completo

CREATE TABLE IF NOT EXISTS user_phrase_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE, -- Un pool por usuario
  remaining_phrases JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array de IDs de frases restantes
  last_reset_date DATE, -- Fecha en que se reinició el pool
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para búsquedas por usuario
CREATE INDEX IF NOT EXISTS idx_user_phrase_pool_user 
ON user_phrase_pool(user_id);

COMMENT ON TABLE user_phrase_pool IS 'Pool de frases restantes por usuario (para evitar repeticiones)';
COMMENT ON COLUMN user_phrase_pool.user_id IS 'ID del usuario';
COMMENT ON COLUMN user_phrase_pool.remaining_phrases IS 'Array JSONB con IDs de frases que aún no se han mostrado a este usuario';
COMMENT ON COLUMN user_phrase_pool.last_reset_date IS 'Fecha en que se reinició el pool (cuando se agotaron todas las frases)';

-- ============================================================================
-- 4. FUNCIÓN PARA INSERTAR FRASE POR DEFECTO
-- ============================================================================
-- Función helper para insertar frases con display_order automático

CREATE OR REPLACE FUNCTION insert_motivational_phrase(
  p_phrase_text TEXT,
  p_active BOOLEAN DEFAULT true
) RETURNS UUID AS $$
DECLARE
  v_order INT;
  v_id UUID;
BEGIN
  -- Obtener el siguiente orden disponible
  SELECT COALESCE(MAX(display_order), -1) + 1 INTO v_order
  FROM motivational_phrases;
  
  -- Insertar la frase
  INSERT INTO motivational_phrases (phrase_text, active, display_order)
  VALUES (p_phrase_text, p_active, v_order)
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. FUNCIÓN PARA OBTENER PRÓXIMA FRASE DEL POOL
-- ============================================================================
-- Obtiene una frase aleatoria del pool del usuario, reiniciando el pool si está vacío

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
    v_pool_record.last_reset_date := CURRENT_DATE;
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
  
  -- Obtener el texto de la frase
  SELECT phrase_text INTO v_phrase_text
  FROM motivational_phrases
  WHERE id = v_phrase_id;
  
  -- Actualizar el pool con las frases restantes
  UPDATE user_phrase_pool
  SET remaining_phrases = v_remaining,
      updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Retornar la frase
  RETURN QUERY SELECT v_phrase_id, v_phrase_text;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. FUNCIÓN PARA REGISTRAR SALUDO MOSTRADO
-- ============================================================================
-- Registra que un usuario vio un saludo en una fecha específica

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
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. FUNCIÓN PARA VERIFICAR SI SE MOSTRÓ HOY
-- ============================================================================
-- Verifica si ya se mostró un saludo al usuario hoy

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
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. POLÍTICAS RLS (Row Level Security)
-- ============================================================================

-- Habilitar RLS
ALTER TABLE motivational_phrases ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_greeting_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_phrase_pool ENABLE ROW LEVEL SECURITY;

-- Política: Todos pueden leer frases activas
CREATE POLICY "Anyone can read active phrases"
ON motivational_phrases
FOR SELECT
USING (active = true);

-- Política: Solo admin puede gestionar frases (INSERT, UPDATE, DELETE)
-- Nota: Esto requiere que el usuario tenga rol 'admin' en la tabla users
-- Por ahora permitimos a todos insertar/actualizar/eliminar, pero se puede restringir después

-- Política: Usuarios solo pueden leer sus propios logs
CREATE POLICY "Users can read their own greeting logs"
ON user_greeting_log
FOR SELECT
USING (true); -- Por ahora permitimos lectura general, se puede restringir después

-- Política: Usuarios solo pueden leer/actualizar su propio pool
CREATE POLICY "Users can manage their own phrase pool"
ON user_phrase_pool
FOR ALL
USING (true); -- Por ahora permitimos acceso general, se puede restringir después

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================

