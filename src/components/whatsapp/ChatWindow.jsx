/**
 * Componente para ventana de chat individual
 * FASE 3: SUBFASE 3.3 - Chat Individual
 * FASE 3: SUBFASE 3.2 - Integración con filtrado por productos
 * 
 * Muestra mensajes de un contacto y permite enviar nuevos mensajes
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Phone, Video, MoreVertical, Tag, UserPlus } from 'lucide-react';
import { getContact, getContactMessages, subscribeContactMessages, markMessagesAsRead } from '../../services/whatsapp/conversations';
import MessageBubble from './MessageBubble';
import MessageSender from './MessageSender';
import WindowIndicator from './WindowIndicator';
import SendMethodBadge from './SendMethodBadge';
import SalesHistory from './SalesHistory';
import Avatar from './Avatar';
import ForwardMessageModal from './ForwardMessageModal';
import { groupMessagesByDate } from '../../utils/whatsapp/date-formatters';
import { groupConsecutiveMessages } from '../../utils/whatsapp/message-grouping';
import { subscribeContactStatus, getContactStatusText } from '../../services/whatsapp/contacts-status';
import { sendMessageIntelligent } from '../../services/whatsapp/send-decision';
import { getContact as getContactService } from '../../services/whatsapp/conversations';
import { getContactTags } from '../../services/whatsapp/tags';
import { useToast } from '../ToastProvider';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';
import { getUserSkus } from '../../utils/whatsapp/user-products';
import { getAccountById } from '../../services/whatsapp/accounts';
import { contactHasLead } from '../../services/whatsapp/leads';
import CreateLeadModal from './CreateLeadModal';

export default function ChatWindow({ contactId, onBack, accountId, session, onOpenTagManager }) {
  const toast = useToast();
  const layout = useResponsiveLayout();
  const [contact, setContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [contactStatus, setContactStatus] = useState({ is_online: false, last_seen_at: null });
  const [replyToMessage, setReplyToMessage] = useState(null); // Mensaje al que se está respondiendo
  const [forwardMessage, setForwardMessage] = useState(null); // Mensaje a reenviar
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [contactTags, setContactTags] = useState([]); // Etiquetas del contacto
  const [showCreateLeadModal, setShowCreateLeadModal] = useState(false);
  const [accountProductId, setAccountProductId] = useState(null);
  const [hasLead, setHasLead] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // Obtener userSkus del session
  const userSkus = getUserSkus(session);

  // Cargar contacto y mensajes
  useEffect(() => {
    if (contactId) {
      loadContact();
      loadMessages();
      markAsRead();
      loadContactTags();
      loadAccountProduct();
    }
  }, [contactId, accountId, userSkus]); // Recargar cuando cambien los productos del usuario

  // Verificar si tiene lead cuando cambia el producto de la cuenta
  useEffect(() => {
    if (contactId && accountProductId) {
      checkLeadStatus();
    }
  }, [contactId, accountProductId]);

  // Cargar etiquetas del contacto
  const loadContactTags = async () => {
    if (!contactId) return;
    
    try {
      const { data, error } = await getContactTags(contactId);
      if (error) {
        console.error('[ChatWindow] Error cargando etiquetas:', error);
        return;
      }
      setContactTags(data || []);
    } catch (err) {
      console.error('[ChatWindow] Error fatal cargando etiquetas:', err);
    }
  };

  // Cargar product_id de la cuenta
  const loadAccountProduct = async () => {
    if (!accountId) return;

    try {
      const { data, error } = await getAccountById(accountId, userSkus);
      if (error) {
        console.error('[ChatWindow] Error cargando cuenta:', error);
        return;
      }
      if (data && data.product_id) {
        setAccountProductId(data.product_id);
      }
    } catch (err) {
      console.error('[ChatWindow] Error fatal cargando cuenta:', err);
    }
  };

  // Verificar si el contacto tiene lead
  const checkLeadStatus = async () => {
    if (!contactId || !accountProductId) return;

    try {
      const { hasLead: hasLeadResult, error } = await contactHasLead(contactId, accountProductId);
      if (error) {
        console.error('[ChatWindow] Error verificando lead:', error);
        return;
      }
      setHasLead(hasLeadResult);
    } catch (err) {
      console.error('[ChatWindow] Error fatal verificando lead:', err);
    }
  };

  // Suscripción en tiempo real a mensajes
  useEffect(() => {
    if (!contactId) return;

    const unsubscribe = subscribeContactMessages(contactId, (payload) => {
      if (payload.eventType === 'INSERT') {
        // Nuevo mensaje recibido
        const newMessage = payload.new;
        setMessages(prev => {
          // Evitar duplicados
          if (prev.some(m => m.id === newMessage.id)) {
            return prev;
          }
          return [...prev, newMessage];
        });
        // Marcar como leído si es mensaje del cliente
        if (!newMessage.is_from_me) {
          markAsRead();
        }
      } else if (payload.eventType === 'UPDATE') {
        // Mensaje actualizado (estado, etc.)
        const updatedMessage = payload.new;
        setMessages(prev => prev.map(m => 
          m.id === updatedMessage.id ? updatedMessage : m
        ));
      }
    });

    return () => {
      unsubscribe();
    };
  }, [contactId]);

  // Suscripción en tiempo real al estado del contacto
  useEffect(() => {
    if (!contactId || !contact) return;

    // Inicializar estado desde el contacto
    setContactStatus({
      is_online: contact.is_online || false,
      last_seen_at: contact.last_seen_at || null
    });

    const unsubscribeStatus = subscribeContactStatus(contactId, (updatedContact) => {
      setContactStatus({
        is_online: updatedContact.is_online || false,
        last_seen_at: updatedContact.last_seen_at || null
      });
      // También actualizar el contacto completo
      setContact(prev => ({ ...prev, ...updatedContact }));
    });

    return () => {
      unsubscribeStatus();
    };
  }, [contactId, contact]);

  // Scroll automático al final
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadContact = async () => {
    try {
      const { data, error: err } = await getContact(contactId);
      if (err) throw err;
      setContact(data);
    } catch (err) {
      console.error('[ChatWindow] Error cargando contacto:', err);
      setError(err.message || 'Error al cargar contacto');
    }
  };

  const loadMessages = async (offset = 0) => {
    try {
      if (offset === 0) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const { data, error: err } = await getContactMessages(contactId, {
        limit: 50,
        offset,
        userSkus: userSkus // Pasar userSkus para filtrar por productos
      });

      if (err) throw err;

      if (offset === 0) {
        setMessages(data || []);
      } else {
        setMessages(prev => [...(data || []), ...prev]);
      }

      setHasMore((data || []).length === 50);
    } catch (err) {
      console.error('[ChatWindow] Error cargando mensajes:', err);
      setError(err.message || 'Error al cargar mensajes');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const markAsRead = async () => {
    try {
      await markMessagesAsRead(contactId);
    } catch (err) {
      console.warn('[ChatWindow] Error marcando como leído:', err);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMoreMessages = () => {
    if (!loadingMore && hasMore) {
      loadMessages(messages.length);
    }
  };

  const handleMessageSent = (result) => {
    // El mensaje se agregará automáticamente via suscripción en tiempo real
    // Pero podemos recargar para asegurarnos
    if (result.success) {
      loadMessages(0);
      // Limpiar mensaje a responder después de enviar
      setReplyToMessage(null);
    }
  };

  const handleReplyToMessage = (message) => {
    setReplyToMessage(message);
    // Scroll al final para ver el input con el mensaje citado
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleForwardMessage = (message) => {
    setForwardMessage(message);
    setShowForwardModal(true);
  };

  const handleForwardToContacts = async (contactIds) => {
    if (!forwardMessage || contactIds.length === 0) return;

    try {
      // Obtener el contacto original del mensaje para obtener su número de teléfono
      const { data: originalContact, error: contactError } = await getContactService(forwardMessage.contact_id);
      
      if (contactError || !originalContact) {
        throw new Error('No se pudo obtener el contacto original');
      }

      // Formatear número de teléfono (solo dígitos)
      const originalPhone = originalContact.phone.replace(/\D/g, '');
      
      // WhatsApp message ID del mensaje original
      const originalMessageId = forwardMessage.wa_message_id || forwardMessage.id;

      if (!originalMessageId) {
        throw new Error('El mensaje no tiene ID de WhatsApp');
      }

      // Reenviar a cada contacto
      let successCount = 0;
      let errorCount = 0;

      for (const targetContactId of contactIds) {
        try {
          // Preparar datos del mensaje según su tipo
          let messageData = {};
          
          if (forwardMessage.message_type === 'text') {
            messageData = {
              contentText: forwardMessage.content_text || forwardMessage.text_content || ''
            };
          } else {
            // Para media, usar la URL directamente (WhatsApp puede reenviar desde URL)
            messageData = {
              mediaFile: forwardMessage.media_url || null,
              mediaFilename: forwardMessage.media_filename || null,
              caption: forwardMessage.caption || forwardMessage.media_caption || null,
              filename: forwardMessage.media_filename || null
            };
          }

          // Opciones con forwardContext
          // Nota: WhatsApp requiere wa_message_id para forward, si no existe, no podemos hacer forward nativo
          const options = {};
          if (originalMessageId && originalMessageId !== forwardMessage.id) {
            // Solo agregar forwardContext si tenemos el WhatsApp message ID
            options.forwardContext = {
              from: originalPhone, // Número de teléfono del contacto original
              id: originalMessageId // WhatsApp message ID
            };
          }

          const result = await sendMessageIntelligent(
            accountId,
            targetContactId,
            forwardMessage.message_type || 'text',
            messageData,
            options
          );

          if (result.success) {
            successCount++;
          } else {
            errorCount++;
            console.error(`[handleForwardToContacts] Error reenviando a ${targetContactId}:`, result.error);
          }
        } catch (err) {
          errorCount++;
          console.error(`[handleForwardToContacts] Error reenviando a ${targetContactId}:`, err);
        }
      }

      // Mostrar resultado
      if (successCount > 0) {
        toast.push({
          type: 'success',
          title: 'Éxito',
          message: `Mensaje reenviado a ${successCount} contacto${successCount > 1 ? 's' : ''}`
        });
      }

      if (errorCount > 0) {
        toast.push({
          type: 'error',
          title: 'Error',
          message: `Error al reenviar a ${errorCount} contacto${errorCount > 1 ? 's' : ''}`
        });
      }

      // Cerrar modal
      setShowForwardModal(false);
      setForwardMessage(null);
    } catch (err) {
      console.error('[handleForwardToContacts] Error:', err);
      toast.push({
        type: 'error',
        title: 'Error',
        message: err.message || 'Error al reenviar mensaje'
      });
    }
  };

  // Agrupar mensajes por fecha y luego por remitente consecutivo
  const messagesByDate = useMemo(() => {
    const dateGroups = groupMessagesByDate(messages);
    
    // Agrupar mensajes consecutivos dentro de cada grupo de fecha
    return dateGroups.map(group => ({
      ...group,
      messages: groupConsecutiveMessages(group.messages)
    }));
  }, [messages]);

  if (!contactId) {
    return (
      <div className="h-full flex items-center justify-center bg-neutral-900">
        <div className="text-center">
          <p className="text-sm text-neutral-400">Selecciona una conversación</p>
        </div>
      </div>
    );
  }

  if (loading && !contact) {
    return (
      <div className="h-full flex items-center justify-center bg-neutral-900">
        <div className="text-sm text-neutral-400">Cargando conversación...</div>
      </div>
    );
  }

  if (error && !contact) {
    return (
      <div className="h-full flex items-center justify-center bg-neutral-900 p-4">
        <div className="text-center">
          <p className="text-sm text-red-400 mb-2">{error}</p>
          <button
            onClick={() => {
              setError(null);
              loadContact();
              loadMessages();
            }}
            className="text-sm text-[#e7922b] hover:underline"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-neutral-900" style={{ height: '100%', minHeight: '100%', maxHeight: '100%', width: '100%', minWidth: '100%', maxWidth: '100%' }}>
      {/* Header del chat */}
      <div className={`flex items-center justify-between ${layout.padding} border-b border-neutral-800 bg-neutral-900 flex-shrink-0`}>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-lg hover:bg-neutral-800 transition flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5 text-neutral-400" />
            </button>
          )}
          
          {/* Avatar */}
          <Avatar
            profilePicUrl={contact?.profile_pic_url}
            name={contact?.name}
            phone={contact?.phone}
            size="md"
          />

          {/* Información del contacto */}
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-neutral-200 truncate">
              {contact?.name || contact?.phone || 'Sin nombre'}
            </h2>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {contactStatus.is_online ? (
                <span className="text-xs text-green-400 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                  En línea
                </span>
              ) : (
                <span className="text-xs text-neutral-400">
                  {getContactStatusText({ ...contact, ...contactStatus })}
                </span>
              )}
              {/* Badges de etiquetas */}
              {contactTags.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  {contactTags.slice(0, 3).map((tag) => (
                    <span
                      key={tag.tag_id}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-neutral-200 border"
                      style={{
                        backgroundColor: `${tag.tag_color}20`,
                        borderColor: tag.tag_color,
                        color: tag.tag_color
                      }}
                      title={tag.tag_name}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: tag.tag_color }}
                      ></span>
                      <span className="truncate max-w-[60px]">{tag.tag_name}</span>
                    </span>
                  ))}
                  {contactTags.length > 3 && (
                    <span className="text-[10px] text-neutral-400">
                      +{contactTags.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className={`flex items-center gap-2 flex-shrink-0 ${layout.isMobile ? 'gap-1' : ''}`}>
          {!layout.isMobile && (
            <>
              <button className="p-2 rounded-lg hover:bg-neutral-800 transition">
                <Phone className="w-5 h-5 text-neutral-400" />
              </button>
              <button className="p-2 rounded-lg hover:bg-neutral-800 transition">
                <Video className="w-5 h-5 text-neutral-400" />
              </button>
            </>
          )}
          {onOpenTagManager && (
            <button
              onClick={onOpenTagManager}
              className="p-2 rounded-lg hover:bg-neutral-800 transition"
              title="Gestionar Etiquetas"
            >
              <Tag className="w-5 h-5 text-neutral-400 hover:text-[#e7922b] transition" />
            </button>
          )}
          {accountProductId && !hasLead && (
            <button
              onClick={() => setShowCreateLeadModal(true)}
              className="p-2 rounded-lg hover:bg-neutral-800 transition"
              title="Crear Lead"
            >
              <UserPlus className="w-5 h-5 text-neutral-400 hover:text-[#e7922b] transition" />
            </button>
          )}
          {hasLead && (
            <button
              className="p-2 rounded-lg opacity-50 cursor-not-allowed"
              title="Este contacto ya tiene un lead activo"
            >
              <UserPlus className="w-5 h-5 text-green-400" />
            </button>
          )}
          <button className="p-2 rounded-lg hover:bg-neutral-800 transition">
            <MoreVertical className="w-5 h-5 text-neutral-400" />
          </button>
        </div>
      </div>

      {/* Historial de ventas */}
      {contactId && !layout.isMobile && (
        <div className={`${layout.padding} pt-4 border-b border-neutral-800 flex-shrink-0`}>
          <SalesHistory contactId={contactId} />
        </div>
      )}

      {/* Área de mensajes con fondo con patrón */}
      <div
        ref={messagesContainerRef}
        className={`flex-1 overflow-y-auto ${layout.padding} space-y-2 relative`}
        style={{
          backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)`,
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0',
          backgroundColor: '#0a0a0a' // Fondo base oscuro con patrón sutil
        }}
        onScroll={(e) => {
          // Cargar más mensajes al hacer scroll hacia arriba
          if (e.target.scrollTop === 0 && hasMore && !loadingMore) {
            loadMoreMessages();
          }
        }}
      >
        {loadingMore && (
          <div className="text-center py-2">
            <div className="text-xs text-neutral-400">Cargando más mensajes...</div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <div className="text-sm text-neutral-400">Cargando mensajes...</div>
          </div>
        ) : messages.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-8"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="w-16 h-16 rounded-full bg-[#e7922b]/10 flex items-center justify-center mx-auto mb-4"
            >
              <span className="text-2xl">💬</span>
            </motion.div>
            <p className="text-sm text-neutral-400">No hay mensajes aún</p>
            <p className="text-xs text-neutral-500 mt-1">Envía el primer mensaje</p>
          </motion.div>
        ) : (
          <AnimatePresence initial={false}>
            {messagesByDate.map((dateGroup, groupIndex) => (
              <React.Fragment key={`date-${dateGroup.date?.getTime() || groupIndex}`}>
                {/* Separador de fecha */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-center py-2"
                >
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-800/50 border border-neutral-700/50">
                    <span className="text-xs font-medium text-neutral-400">
                      {dateGroup.dateLabel}
                    </span>
                  </div>
                </motion.div>

                {/* Mensajes del grupo de fecha */}
                {dateGroup.messages.map((message, messageIndex) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ 
                      delay: (groupIndex * 0.1) + (messageIndex * 0.02), 
                      duration: 0.2 
                    }}
                    className={message.isGroupedWithPrevious ? 'mt-0.5' : 'mt-2'}
                  >
                    <MessageBubble
                      message={message}
                      isFromMe={message.is_from_me}
                      showTimestamp={message.showTimestamp !== false}
                      onReply={handleReplyToMessage}
                      onForward={handleForwardMessage}
                    />
                  </motion.div>
                ))}
              </React.Fragment>
            ))}
          </AnimatePresence>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Componente de envío */}
      <div className={`border-t border-neutral-800 bg-neutral-900 flex-shrink-0 ${layout.isMobile ? layout.padding : ''}`}>
        <MessageSender
          contactId={contactId}
          accountId={accountId}
          productId={selectedProductId}
          onMessageSent={handleMessageSent}
          replyToMessage={replyToMessage}
          onCancelReply={() => setReplyToMessage(null)}
        />
      </div>

      {/* Modal de reenvío */}
      <ForwardMessageModal
        message={forwardMessage}
        isOpen={showForwardModal}
        onClose={() => {
          setShowForwardModal(false);
          setForwardMessage(null);
        }}
        onForward={handleForwardToContacts}
      />

      {/* Modal Crear Lead */}
      {showCreateLeadModal && accountProductId && contactId && accountId && (
        <CreateLeadModal
          productId={accountProductId}
          selectedProductId={accountProductId}
          onClose={() => {
            setShowCreateLeadModal(false);
            checkLeadStatus(); // Verificar de nuevo después de cerrar
          }}
          onSuccess={() => {
            setShowCreateLeadModal(false);
            checkLeadStatus(); // Actualizar estado después de crear
            toast.push({
              type: 'success',
              title: 'Éxito',
              message: 'Lead creado correctamente'
            });
          }}
          session={session}
          preSelectedContactId={contactId}
          preSelectedAccountId={accountId}
        />
      )}
    </div>
  );
}

