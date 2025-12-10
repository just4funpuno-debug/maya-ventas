-- ============================================================================
-- SCRIPT DE VERIFICACIÓN: Frases Motivacionales en Supabase
-- ============================================================================
-- Este script verifica si las frases ya están almacenadas en Supabase
-- Ejecuta este script en el SQL Editor de Supabase
-- ============================================================================

-- 1. Contar frases totales (activas e inactivas)
SELECT 
  COUNT(*) as total_frases,
  COUNT(*) FILTER (WHERE active = true) as frases_activas,
  COUNT(*) FILTER (WHERE active = false) as frases_inactivas
FROM motivational_phrases;

-- 2. Mostrar todas las frases activas
SELECT 
  id,
  phrase_text,
  active,
  display_order,
  created_at
FROM motivational_phrases
WHERE active = true
ORDER BY display_order, created_at
LIMIT 100;

-- 3. Verificar si hay exactamente 50 frases (35 personales + 15 ventas)
SELECT 
  CASE 
    WHEN COUNT(*) = 50 THEN '✅ CORRECTO: Hay 50 frases'
    WHEN COUNT(*) > 50 THEN '⚠️ ADVERTENCIA: Hay más de 50 frases (' || COUNT(*) || ')'
    WHEN COUNT(*) > 0 THEN '⚠️ INCOMPLETO: Solo hay ' || COUNT(*) || ' frases (deberían ser 50)'
    ELSE '❌ ERROR: No hay frases en Supabase'
  END as estado,
  COUNT(*) as cantidad_frases
FROM motivational_phrases
WHERE active = true;

-- 4. Mostrar resumen por tipo (basado en contenido)
SELECT 
  CASE 
    WHEN phrase_text LIKE '%venta%' OR phrase_text LIKE '%cliente%' OR phrase_text LIKE '%vende%' OR phrase_text LIKE '%llamada%' OR phrase_text LIKE '%objeción%' OR phrase_text LIKE '%seguimiento%' OR phrase_text LIKE '%cierre%' OR phrase_text LIKE '%confianza%' OR phrase_text LIKE '%relación%' OR phrase_text LIKE '%script%' THEN 'Ventas'
    ELSE 'Personal'
  END as tipo,
  COUNT(*) as cantidad
FROM motivational_phrases
WHERE active = true
GROUP BY 
  CASE 
    WHEN phrase_text LIKE '%venta%' OR phrase_text LIKE '%cliente%' OR phrase_text LIKE '%vende%' OR phrase_text LIKE '%llamada%' OR phrase_text LIKE '%objeción%' OR phrase_text LIKE '%seguimiento%' OR phrase_text LIKE '%cierre%' OR phrase_text LIKE '%confianza%' OR phrase_text LIKE '%relación%' OR phrase_text LIKE '%script%' THEN 'Ventas'
    ELSE 'Personal'
  END;

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================


