/**
 * Utilidades para formatear fechas en el chat WhatsApp
 * FASE 1: SUBFASE 1.1 - Separadores de Fecha
 */

/**
 * Verifica si dos fechas están en el mismo día
 * @param {Date|string} date1 - Primera fecha
 * @param {Date|string} date2 - Segunda fecha
 * @returns {boolean}
 */
export function isSameDay(date1, date2) {
  if (!date1 || !date2) return false;
  
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * Obtiene la fecha del día (sin hora) para comparación
 * @param {Date|string} date - Fecha
 * @returns {Date} Fecha con hora 00:00:00
 */
export function getDateOnly(date) {
  if (!date) return null;
  
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Formatea la fecha para mostrar en el separador
 * @param {Date|string} date - Fecha a formatear
 * @returns {string} "Hoy", "Ayer", o fecha formateada
 */
export function formatDateSeparator(date) {
  if (!date) return '';
  
  const messageDate = getDateOnly(date);
  const today = getDateOnly(new Date());
  const yesterday = getDateOnly(new Date());
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (isSameDay(messageDate, today)) {
    return 'Hoy';
  } else if (isSameDay(messageDate, yesterday)) {
    return 'Ayer';
  } else {
    // Formatear fecha específica: "15 de enero" o "15/01/2024"
    const d = new Date(date);
    const day = d.getDate();
    const month = d.toLocaleDateString('es-ES', { month: 'long' });
    const year = d.getFullYear();
    const currentYear = new Date().getFullYear();
    
    // Si es del año actual, no mostrar el año
    if (year === currentYear) {
      return `${day} de ${month}`;
    } else {
      return `${day} de ${month} de ${year}`;
    }
  }
}

/**
 * Agrupa mensajes por fecha
 * @param {Array} messages - Array de mensajes
 * @returns {Array} Array de objetos { date: string, messages: Array }
 */
export function groupMessagesByDate(messages) {
  if (!messages || messages.length === 0) return [];
  
  const groups = [];
  let currentGroup = null;
  
  messages.forEach((message) => {
    const messageDate = getDateOnly(message.timestamp);
    
    if (!currentGroup || !isSameDay(messageDate, currentGroup.date)) {
      // Nuevo grupo de fecha
      currentGroup = {
        date: messageDate,
        dateLabel: formatDateSeparator(message.timestamp),
        messages: []
      };
      groups.push(currentGroup);
    }
    
    currentGroup.messages.push(message);
  });
  
  return groups;
}
