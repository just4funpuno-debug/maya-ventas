/**
 * Hook para manejar notificaciones de WhatsApp en tiempo real
 * FASE 7.2: SUBFASE 7.2.3 - Notificaciones en Tiempo Real
 */

import { useEffect, useRef, useState } from 'react';
import { subscribeConversations, subscribeContactMessages } from '../services/whatsapp/conversations';
import { useToast } from '../components/ToastProvider';

/**
 * Hook para notificaciones de WhatsApp
 * @param {Object} options - Opciones de configuración
 * @param {boolean} options.enabled - Si las notificaciones están habilitadas
 * @param {boolean} options.soundEnabled - Si el sonido está habilitado
 * @param {string} options.currentContactId - ID del contacto actual (para no notificar si está abierto)
 * @returns {Object} - { unreadCount, showNotification }
 */
export function useWhatsAppNotifications(options = {}) {
  const {
    enabled = true,
    soundEnabled = false,
    currentContactId = null
  } = options;

  const toast = useToast();
  const [unreadCount, setUnreadCount] = useState(0);
  const lastNotifiedMessageId = useRef(new Set());
  const soundRef = useRef(null);

  // Cargar sonido de notificación (opcional)
  useEffect(() => {
    if (soundEnabled) {
      // Crear audio element para sonido de notificación
      // Puedes agregar un archivo de sonido en public/notification.mp3
      soundRef.current = new Audio('/notification.mp3');
      soundRef.current.volume = 0.5;
    }
  }, [soundEnabled]);

  // Suscripción a nuevas conversaciones
  useEffect(() => {
    if (!enabled) return;

    const unsubscribe = subscribeConversations((payload) => {
      // Detectar nuevos mensajes
      if (payload.eventType === 'INSERT' && payload.new) {
        const newMessage = payload.new;
        
        // Solo notificar si no es del contacto actual
        if (currentContactId && newMessage.contact_id === currentContactId) {
          return;
        }

        // Evitar notificar el mismo mensaje múltiples veces
        if (lastNotifiedMessageId.current.has(newMessage.id)) {
          return;
        }

        lastNotifiedMessageId.current.add(newMessage.id);

        // Limpiar IDs antiguos (mantener solo los últimos 100)
        if (lastNotifiedMessageId.current.size > 100) {
          const idsArray = Array.from(lastNotifiedMessageId.current);
          lastNotifiedMessageId.current = new Set(idsArray.slice(-50));
        }

        // Mostrar notificación
        showNotification(newMessage);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [enabled, currentContactId]);

  // Suscripción a mensajes de contactos específicos
  useEffect(() => {
    if (!enabled || !currentContactId) return;

    const unsubscribe = subscribeContactMessages(currentContactId, (payload) => {
      if (payload.eventType === 'INSERT' && payload.new) {
        const newMessage = payload.new;
        
        // Solo notificar mensajes del cliente (no los nuestros)
        if (newMessage.is_from_me) {
          return;
        }

        // Evitar notificar el mismo mensaje múltiples veces
        if (lastNotifiedMessageId.current.has(newMessage.id)) {
          return;
        }

        lastNotifiedMessageId.current.add(newMessage.id);
        showNotification(newMessage, true); // true = mensaje del contacto actual
      }
    });

    return () => {
      unsubscribe();
    };
  }, [enabled, currentContactId]);

  const showNotification = (message, isFromCurrentContact = false) => {
    if (!enabled) return;

    // Obtener información del mensaje
    let title = 'Nuevo mensaje';
    let messageText = '';

    if (message.message_type === 'text') {
      messageText = message.content_text || 'Mensaje de texto';
    } else if (message.message_type === 'image') {
      messageText = '📷 Imagen' + (message.caption ? `: ${message.caption}` : '');
    } else if (message.message_type === 'video') {
      messageText = '🎥 Video' + (message.caption ? `: ${message.caption}` : '');
    } else if (message.message_type === 'audio') {
      messageText = '🎵 Audio';
    } else if (message.message_type === 'document') {
      messageText = '📄 ' + (message.media_filename || 'Documento');
    } else {
      messageText = 'Nuevo mensaje';
    }

    // Truncar mensaje si es muy largo
    if (messageText.length > 100) {
      messageText = messageText.substring(0, 100) + '...';
    }

    // Mostrar toast
    toast.push({
      type: 'info',
      title: isFromCurrentContact ? 'Mensaje recibido' : title,
      message: messageText,
      timeout: 5000
    });

    // Reproducir sonido si está habilitado
    if (soundEnabled && soundRef.current) {
      soundRef.current.play().catch(err => {
        console.warn('[useWhatsAppNotifications] Error reproduciendo sonido:', err);
      });
    }

    // Actualizar contador de no leídos
    if (!isFromCurrentContact) {
      setUnreadCount(prev => prev + 1);
    }
  };

  const resetUnreadCount = () => {
    setUnreadCount(0);
  };

  return {
    unreadCount,
    resetUnreadCount,
    showNotification
  };
}


