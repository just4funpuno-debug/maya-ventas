-- ============================================================================
-- VERIFICACIÓN RÁPIDA: Frases Motivacionales en Supabase
-- ============================================================================
-- Ejecuta este script en el SQL Editor de Supabase Dashboard
-- ============================================================================

-- RESULTADO ESPERADO: 50 frases activas (35 personales + 15 ventas)

SELECT 
  CASE 
    WHEN COUNT(*) FILTER (WHERE active = true) = 50 THEN 
      '✅ CORRECTO: Hay 50 frases activas'
    WHEN COUNT(*) FILTER (WHERE active = true) > 50 THEN 
      '⚠️ ADVERTENCIA: Hay ' || COUNT(*) FILTER (WHERE active = true) || ' frases activas (más de las esperadas)'
    WHEN COUNT(*) FILTER (WHERE active = true) > 0 THEN 
      '⚠️ INCOMPLETO: Solo hay ' || COUNT(*) FILTER (WHERE active = true) || ' frases activas (deberían ser 50)'
    ELSE 
      '❌ ERROR: No hay frases activas en Supabase'
  END as estado,
  COUNT(*) FILTER (WHERE active = true) as frases_activas,
  COUNT(*) FILTER (WHERE active = false) as frases_inactivas,
  COUNT(*) as total_frases
FROM motivational_phrases;

-- Mostrar las primeras 10 frases activas como ejemplo
SELECT 
  display_order,
  phrase_text,
  active,
  created_at
FROM motivational_phrases
WHERE active = true
ORDER BY display_order, created_at
LIMIT 10;

