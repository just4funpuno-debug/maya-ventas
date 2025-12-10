-- ============================================================================
-- MIGRACIÓN 027: Interrupción de Pausas por Palabras Clave
-- FASE 1: Extensión de Sistema de Pausas
-- 
-- Agrega soporte para interrumpir pausas fixed_delay cuando el cliente
-- envía un mensaje con palabras clave específicas.
-- ============================================================================

-- PASO 1: Agregar campo para palabras clave de interrupción
ALTER TABLE whatsapp_sequence_messages
ADD COLUMN IF NOT EXISTS pause_interrupt_keywords JSONB DEFAULT NULL;

-- PASO 2: Agregar campo para delay opcional después de interrupción
ALTER TABLE whatsapp_sequence_messages
ADD COLUMN IF NOT EXISTS pause_delay_after_interrupt DECIMAL(10,2) DEFAULT NULL;

-- PASO 3: Agregar comentarios para documentación
COMMENT ON COLUMN whatsapp_sequence_messages.pause_interrupt_keywords IS 
  'Palabras clave que interrumpen una pausa fixed_delay. 
   Solo válido para step_type = ''pause'' y pause_type = ''fixed_delay''.
   Estructura: {"keywords": ["palabra1", "palabra2"], "match_type": "any"}
   - keywords: Array de palabras a buscar en mensajes del cliente
   - match_type: "any" (OR) o "all" (AND) - por defecto "any"
   Si el cliente envía un mensaje con alguna de estas palabras durante la pausa,
   la espera se interrumpe y se pasa al siguiente paso inmediatamente.';

COMMENT ON COLUMN whatsapp_sequence_messages.pause_delay_after_interrupt IS 
  'Delay opcional (en horas) después de que se interrumpe una pausa.
   Solo válido si pause_interrupt_keywords está configurado.
   Si se especifica, después de recibir el mensaje que interrumpe la pausa,
   se esperará este tiempo adicional antes de continuar al siguiente paso.
   Ejemplo: 1.5 = 1 hora 30 minutos';

-- PASO 4: Crear índice para optimizar búsquedas
CREATE INDEX IF NOT EXISTS idx_sequence_messages_pause_interrupt
ON whatsapp_sequence_messages(sequence_id)
WHERE step_type = 'pause' 
  AND pause_type = 'fixed_delay' 
  AND pause_interrupt_keywords IS NOT NULL;

-- PASO 5: Verificar que la migración se aplicó correctamente
DO $$
DECLARE
  total_pauses INTEGER;
  pauses_with_interrupt INTEGER;
BEGIN
  -- Contar total de pausas fixed_delay
  SELECT COUNT(*) INTO total_pauses
  FROM whatsapp_sequence_messages
  WHERE step_type = 'pause' AND pause_type = 'fixed_delay';
  
  -- Contar pausas con interrupción configurada
  SELECT COUNT(*) INTO pauses_with_interrupt
  FROM whatsapp_sequence_messages
  WHERE step_type = 'pause' 
    AND pause_type = 'fixed_delay'
    AND pause_interrupt_keywords IS NOT NULL;
  
  -- Log para verificación
  RAISE NOTICE '✅ Migración 027 completada:';
  RAISE NOTICE '   - Total de pausas fixed_delay: %', total_pauses;
  RAISE NOTICE '   - Pausas con interrupción configurada: %', pauses_with_interrupt;
  RAISE NOTICE '   - Campo pause_interrupt_keywords agregado correctamente';
  RAISE NOTICE '   - Campo pause_delay_after_interrupt agregado correctamente';
  RAISE NOTICE '   - Índice creado para optimizar búsquedas';
END $$;

