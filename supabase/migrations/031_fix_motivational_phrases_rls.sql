-- ============================================================================
-- MIGRACIÓN 031: Corrección de políticas RLS para motivational_phrases
-- Fecha: 2025-01-31
-- Descripción: Agrega políticas RLS para INSERT, UPDATE y DELETE que faltaban
-- ============================================================================

-- Eliminar políticas existentes si existen (para evitar conflictos)
DROP POLICY IF EXISTS "Anyone can read active phrases" ON motivational_phrases;
DROP POLICY IF EXISTS "Anyone can insert phrases" ON motivational_phrases;
DROP POLICY IF EXISTS "Anyone can update phrases" ON motivational_phrases;
DROP POLICY IF EXISTS "Anyone can delete phrases" ON motivational_phrases;

-- Política: Todos pueden leer frases activas
CREATE POLICY "Anyone can read active phrases"
ON motivational_phrases
FOR SELECT
USING (active = true);

-- Política: Todos pueden leer todas las frases (incluye inactivas)
-- Esto es necesario para que la función getAllPhrasesIncludingInactive funcione
CREATE POLICY "Anyone can read all phrases"
ON motivational_phrases
FOR SELECT
USING (true);

-- Política: Todos pueden insertar frases
-- Por ahora permitimos a todos insertar, se puede restringir después si es necesario
CREATE POLICY "Anyone can insert phrases"
ON motivational_phrases
FOR INSERT
WITH CHECK (true);

-- Política: Todos pueden actualizar frases
-- Por ahora permitimos a todos actualizar, se puede restringir después si es necesario
CREATE POLICY "Anyone can update phrases"
ON motivational_phrases
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Política: Todos pueden eliminar frases
-- Por ahora permitimos a todos eliminar, se puede restringir después si es necesario
CREATE POLICY "Anyone can delete phrases"
ON motivational_phrases
FOR DELETE
USING (true);

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================

