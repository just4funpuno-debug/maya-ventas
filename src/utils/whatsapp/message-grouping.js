/**
 * Utilidades para agrupar mensajes consecutivos del mismo remitente
 * FASE 1: SUBFASE 1.3 - Agrupación de Mensajes
 */

/**
 * Determina si un mensaje debe agruparse con el anterior
 * @param {Object} currentMessage - Mensaje actual
 * @param {Object} previousMessage - Mensaje anterior
 * @param {number} maxTimeDiffMinutes - Máxima diferencia de tiempo en minutos para agrupar (default: 5)
 * @returns {boolean}
 */
export function shouldGroupWithPrevious(currentMessage, previousMessage, maxTimeDiffMinutes = 5) {
  if (!previousMessage) return false;
  
  // Deben ser del mismo remitente
  if (currentMessage.is_from_me !== previousMessage.is_from_me) {
    return false;
  }
  
  // Deben estar cerca en el tiempo (dentro de maxTimeDiffMinutes)
  if (currentMessage.timestamp && previousMessage.timestamp) {
    const currentTime = new Date(currentMessage.timestamp).getTime();
    const previousTime = new Date(previousMessage.timestamp).getTime();
    const diffMinutes = (currentTime - previousTime) / (1000 * 60);
    
    if (diffMinutes > maxTimeDiffMinutes) {
      return false;
    }
  }
  
  return true;
}

/**
 * Agrupa mensajes consecutivos del mismo remitente
 * @param {Array} messages - Array de mensajes
 * @param {number} maxTimeDiffMinutes - Máxima diferencia de tiempo en minutos para agrupar
 * @returns {Array} Array de mensajes con propiedades de agrupación agregadas
 */
export function groupConsecutiveMessages(messages, maxTimeDiffMinutes = 5) {
  if (!messages || messages.length === 0) return [];
  
  return messages.map((message, index) => {
    const previousMessage = index > 0 ? messages[index - 1] : null;
    const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
    
    const isGroupedWithPrevious = shouldGroupWithPrevious(
      message, 
      previousMessage, 
      maxTimeDiffMinutes
    );
    const isGroupedWithNext = nextMessage && shouldGroupWithPrevious(
      nextMessage, 
      message, 
      maxTimeDiffMinutes
    );
    
    return {
      ...message,
      isGroupedWithPrevious,
      isGroupedWithNext,
      isFirstInGroup: !isGroupedWithPrevious,
      isLastInGroup: !isGroupedWithNext,
      showTimestamp: !isGroupedWithNext // Mostrar timestamp solo en el último del grupo
    };
  });
}


