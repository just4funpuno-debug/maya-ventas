/**
 * Componente para mostrar lista de conversaciones
 * FASE 3: SUBFASE 3.2 - Lista de Conversaciones
 * FASE 3: SUBFASE 3.2 - Integración con filtrado por productos
 * 
 * Muestra lista de contactos con última interacción, búsqueda y selección
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MessageCircle, Clock, CheckCircle2, Tag, Plus, Zap, Ban } from 'lucide-react';
import { getConversations, subscribeConversations } from '../../services/whatsapp/conversations';
import { getAllTags, getContactTags } from '../../services/whatsapp/tags';
import WindowIndicator from './WindowIndicator';
import Avatar from './Avatar';
import { getContactStatusText } from '../../services/whatsapp/contacts-status';
import SimpleAddTagModal from './SimpleAddTagModal';
import { getUserSkus } from '../../utils/whatsapp/user-products';

export default function ConversationList({ selectedContactId, onSelectContact, loading: externalLoading, accountId, session, selectedProductId, onOpenTagManager, onOpenQuickReplyManager, onOpenBlockedContacts }) {
  const [conversations, setConversations] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showTagsMenu, setShowTagsMenu] = useState(false);
  const [tags, setTags] = useState([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [showAddTagModal, setShowAddTagModal] = useState(false);
  const [conversationTags, setConversationTags] = useState({}); // { contactId: [tags] }
  const tagsMenuRef = useRef(null);

  // Obtener userSkus del session
  const userSkus = getUserSkus(session);
  
  // Si hay selectedProductId, usar solo ese producto (sobrescribe userSkus)
  // Si no hay selectedProductId, usar userSkus normal
  const effectiveUserSkus = selectedProductId ? null : userSkus;

  // Cargar conversaciones
  useEffect(() => {
    loadConversations();
  }, [search, selectedTagIds, userSkus, selectedProductId]); // Recargar cuando cambien los productos del usuario o el producto seleccionado

  // Suscripción en tiempo real
  useEffect(() => {
    const unsubscribe = subscribeConversations((payload) => {
      // Recargar conversaciones cuando hay cambios
      loadConversations();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const loadConversations = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: err } = await getConversations({
        search: search.trim() || undefined,
        tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
        userSkus: effectiveUserSkus, // Pasar userSkus para filtrar por productos
        productId: selectedProductId || undefined, // Pasar productId si hay uno seleccionado
        limit: 100
      });

      if (err) {
        throw err;
      }

      setConversations(data || []);
      
      // Cargar etiquetas para cada conversación
      if (data && data.length > 0) {
        loadTagsForConversations(data.map(c => c.id));
      }
    } catch (err) {
      console.error('[ConversationList] Error cargando conversaciones:', err);
      setError(err.message || 'Error al cargar conversaciones');
    } finally {
      setLoading(false);
    }
  };

  // Cargar etiquetas para múltiples conversaciones
  const loadTagsForConversations = async (contactIds) => {
    try {
      const tagsPromises = contactIds.map(async (contactId) => {
        const { data, error } = await getContactTags(contactId);
        if (error) {
          console.error(`[ConversationList] Error cargando etiquetas para ${contactId}:`, error);
          return { contactId, tags: [] };
        }
        return { contactId, tags: data || [] };
      });

      const results = await Promise.all(tagsPromises);
      const tagsMap = {};
      results.forEach(({ contactId, tags }) => {
        tagsMap[contactId] = tags;
      });
      setConversationTags(tagsMap);
    } catch (err) {
      console.error('[ConversationList] Error fatal cargando etiquetas:', err);
    }
  };

  // Formatear timestamp de última interacción
  const formatLastInteraction = (timestamp) => {
    if (!timestamp) return 'Nunca';

    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  // Obtener preview del último mensaje
  const getMessagePreview = (lastMessage) => {
    if (!lastMessage) return 'Sin mensajes';

    if (lastMessage.message_type === 'text') {
      return lastMessage.content_text || 'Mensaje de texto';
    } else if (lastMessage.message_type === 'image') {
      return '📷 Imagen' + (lastMessage.caption ? `: ${lastMessage.caption}` : '');
    } else if (lastMessage.message_type === 'video') {
      return '🎥 Video' + (lastMessage.caption ? `: ${lastMessage.caption}` : '');
    } else if (lastMessage.message_type === 'audio') {
      return '🎵 Audio';
    } else if (lastMessage.message_type === 'document') {
      return '📄 ' + (lastMessage.media_filename || 'Documento');
    }

    return 'Mensaje';
  };

  const filteredConversations = useMemo(() => {
    return conversations;
  }, [conversations]);

  // FASE 3 - SUBFASE 3.1: Cargar etiquetas cuando se abre el menú o cuando cambia productId
  useEffect(() => {
    if (showTagsMenu && selectedProductId) {
      loadTags();
    }
  }, [showTagsMenu, selectedProductId, accountId]);

  // FASE 3 - SUBFASE 3.1: Recargar etiquetas cuando se cierra el modal (por si se creó una nueva)
  // Esto se activa cuando el menú está abierto y el usuario vuelve
  useEffect(() => {
    if (showTagsMenu && selectedProductId) {
      // Pequeño delay para asegurar que la etiqueta se guardó
      const timer = setTimeout(() => {
        loadTags();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [showTagsMenu, selectedProductId]);

  const loadTags = async () => {
    // FASE 3 - SUBFASE 3.1: Usar productId en lugar de solo accountId
    if (!selectedProductId) return;
    
    try {
      setLoadingTags(true);
      // Pasar productId como primer parámetro, accountId como opcional
      const { data, error: err } = await getAllTags(selectedProductId, accountId || undefined);
      
      if (err) {
        console.error('[ConversationList] Error cargando etiquetas:', err);
        setTags([]);
        return;
      }
      
      setTags(data || []);
    } catch (err) {
      console.error('[ConversationList] Error fatal cargando etiquetas:', err);
      setTags([]);
    } finally {
      setLoadingTags(false);
    }
  };

  // Cerrar menú de etiquetas al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (tagsMenuRef.current && !tagsMenuRef.current.contains(event.target)) {
        setShowTagsMenu(false);
      }
    };

    if (showTagsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTagsMenu]);

  if (externalLoading || loading) {
    return (
      <div className="h-full flex items-center justify-center bg-neutral-900">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="w-10 h-10 border-4 border-[#e7922b]/20 border-t-[#e7922b] rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-neutral-400">Cargando conversaciones...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-sm text-red-400 text-center">
          {error}
          <button
            onClick={loadConversations}
            className="block mt-2 text-[#e7922b] hover:underline"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-neutral-900 overflow-hidden" style={{ height: '100%', minHeight: '100%', maxHeight: '100%' }}>
      {/* Header con búsqueda */}
      <div className="p-4 border-b border-neutral-800 flex-shrink-0 w-full space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar conversaciones..."
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#e7922b]"
          />
        </div>

        {/* Botones de filtro Etiquetas y Respuestas Rápidas */}
        {/* FASE 3 - SUBFASE 3.1: Mostrar botones solo si hay productId */}
        {selectedProductId && (
          <div className="relative flex items-center gap-2" ref={tagsMenuRef}>
            <div className="relative">
              <button
                onClick={() => setShowTagsMenu(!showTagsMenu)}
                className={`p-2 rounded-lg border transition-colors ${
                  selectedTagIds.length > 0
                    ? 'bg-[#e7922b]/10 border-[#e7922b]/40'
                    : 'bg-neutral-800 border-neutral-700 hover:bg-neutral-750 hover:border-neutral-600'
                }`}
                title={selectedTagIds.length > 0 ? `Filtros activos: ${selectedTagIds.length}` : 'Filtrar por etiquetas'}
              >
                <Tag className={`w-4 h-4 ${
                  selectedTagIds.length > 0 ? 'text-[#e7922b]' : 'text-neutral-400'
                }`} />
                {selectedTagIds.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#e7922b] text-[10px] font-semibold text-white flex items-center justify-center">
                    {selectedTagIds.length}
                  </span>
                )}
              </button>
            </div>

            {/* Botón para limpiar filtros */}
            {selectedTagIds.length > 0 && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedTagIds([])}
                className="text-xs text-neutral-400 hover:text-[#e7922b] transition-colors font-medium"
              >
                Limpiar filtros ({selectedTagIds.length})
              </motion.button>
            )}

            {/* Menú desplegable */}
            <AnimatePresence>
              {showTagsMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="absolute top-full left-0 right-0 mt-1 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto"
                >
                  <div className="p-2">
                    {/* Lista de etiquetas */}
                    {loadingTags ? (
                      <div className="text-xs text-neutral-400 text-center py-4">
                        Cargando etiquetas...
                      </div>
                    ) : tags.length === 0 ? (
                      <div className="text-xs text-neutral-400 text-center py-4">
                        No hay etiquetas creadas
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {tags.map((tag) => {
                          const isSelected = selectedTagIds.includes(tag.id);
                          return (
                            <motion.button
                              key={tag.id}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm text-left ${
                                isSelected
                                  ? 'bg-[#e7922b]/20 border border-[#e7922b]/40 text-neutral-200'
                                  : 'hover:bg-neutral-700 text-neutral-200 border border-transparent'
                              }`}
                              onClick={() => {
                                if (isSelected) {
                                  // Deseleccionar
                                  setSelectedTagIds(prev => prev.filter(id => id !== tag.id));
                                } else {
                                  // Seleccionar
                                  setSelectedTagIds(prev => [...prev, tag.id]);
                                }
                              }}
                            >
                              <span
                                className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
                                style={{ backgroundColor: tag.color }}
                              ></span>
                              <span className="flex-1 truncate">{tag.name}</span>
                              {isSelected && (
                                <motion.span
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="text-[#e7922b] text-xs font-semibold"
                                >
                                  ✓
                                </motion.span>
                              )}
                            </motion.button>
                          );
                        })}
                      </div>
                    )}

                    {/* Separador */}
                    {tags.length > 0 && (
                      <div className="border-t border-neutral-700 my-2"></div>
                    )}

                    {/* Botón añadir etiqueta */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-neutral-700 transition-colors text-sm text-neutral-200 border-t border-neutral-700 mt-1 pt-2"
                      onClick={() => {
                        setShowAddTagModal(true);
                      }}
                    >
                      <Plus className="w-4 h-4 text-[#e7922b]" />
                      <span className="text-[#e7922b] font-medium">Añadir etiqueta</span>
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Botón de Gestionar Respuestas Rápidas */}
            {onOpenQuickReplyManager && (
              <button
                onClick={onOpenQuickReplyManager}
                className="p-2 rounded-lg border bg-neutral-800 border-neutral-700 hover:bg-neutral-750 hover:border-neutral-600 transition-colors"
                title="Gestionar Respuestas Rápidas"
              >
                <Zap className="w-4 h-4 text-neutral-400 hover:text-[#e7922b] transition" />
              </button>
            )}

            {/* Botón de Contactos Bloqueados - FASE 2: SUBFASE 2.1 */}
            {onOpenBlockedContacts && (
              <button
                onClick={onOpenBlockedContacts}
                className="p-2 rounded-lg border bg-neutral-800 border-neutral-700 hover:bg-neutral-750 hover:border-neutral-600 transition-colors"
                title="Ver Contactos Bloqueados"
              >
                <Ban className="w-4 h-4 text-neutral-400 hover:text-[#e7922b] transition" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Lista de conversaciones */}
      {/* Altura fija: flex-1 ocupa el espacio restante, overflow-y-auto permite scroll cuando hay muchos chats */}
      <div className="flex-1 overflow-y-auto w-full min-w-0" style={{ minHeight: 0 }}>
        <AnimatePresence mode="wait">
          {filteredConversations.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="h-full flex items-center justify-center p-4"
            >
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: 'spring' }}
                >
                  <MessageCircle className="w-12 h-12 text-neutral-600 mx-auto mb-2" />
                </motion.div>
                <p className="text-sm text-neutral-400">
                  {search 
                    ? 'No se encontraron conversaciones con ese criterio de búsqueda' 
                    : selectedProductId
                      ? 'No hay conversaciones para este producto'
                      : 'No hay conversaciones disponibles'}
                </p>
                {selectedProductId && (
                  <p className="text-xs text-neutral-500 mt-1">
                    Intenta seleccionar otro producto o crear una cuenta para este producto
                  </p>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="divide-y divide-neutral-800"
            >
              {filteredConversations.map((conversation, index) => {
                const isSelected = selectedContactId === conversation.id;
                const hasUnread = (conversation.unread_count || 0) > 0;

                return (
                  <motion.button
                    key={conversation.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => onSelectContact && onSelectContact(conversation.id)}
                    whileHover={{ backgroundColor: 'rgba(38, 38, 38, 0.5)' }}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full p-4 text-left transition-all ${
                      isSelected ? 'bg-neutral-800 border-l-4 border-[#e7922b] shadow-md' : ''
                    }`}
                  >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <Avatar
                      profilePicUrl={conversation.profile_pic_url}
                      name={conversation.name}
                      phone={conversation.phone}
                      size="lg"
                    />

                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-neutral-200 truncate">
                            {conversation.name || conversation.phone || 'Sin nombre'}
                          </h3>
                          {/* Estado online/última vez visto */}
                          <div className="mt-0.5">
                            {conversation.is_online ? (
                              <span className="text-xs text-green-400 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                                En línea
                              </span>
                            ) : (
                              <span className="text-xs text-neutral-500">
                                {getContactStatusText(conversation)}
                              </span>
                            )}
                          </div>
                        </div>
                        {conversation.last_interaction_at && (
                          <span className="text-xs text-neutral-400 flex-shrink-0 ml-2">
                            {formatLastInteraction(conversation.last_interaction_at)}
                          </span>
                        )}
                      </div>

                      {/* Preview del último mensaje */}
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-xs truncate ${
                          hasUnread ? 'text-neutral-200 font-medium' : 'text-neutral-400'
                        }`}>
                          {getMessagePreview(conversation.lastMessage)}
                        </p>
                        {hasUnread && (
                          <span className="flex-shrink-0 px-1.5 py-0.5 rounded-full bg-[#e7922b] text-[10px] font-semibold text-white">
                            {conversation.unread_count}
                          </span>
                        )}
                      </div>

                      {/* Etiquetas del contacto */}
                      {conversationTags[conversation.id] && conversationTags[conversation.id].length > 0 && (
                        <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                          {conversationTags[conversation.id].slice(0, 2).map((tag) => (
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
                              <span className="truncate max-w-[50px]">{tag.tag_name}</span>
                            </span>
                          ))}
                          {conversationTags[conversation.id].length > 2 && (
                            <span className="text-[10px] text-neutral-400">
                              +{conversationTags[conversation.id].length - 2}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Indicador de ventana */}
                      <div className="mt-1.5">
                        <WindowIndicator contactId={conversation.id} />
                      </div>
                    </div>
                  </div>
                </motion.button>
              );
            })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modal simple para añadir etiqueta */}
      <SimpleAddTagModal
        isOpen={showAddTagModal}
        onClose={() => setShowAddTagModal(false)}
        accountId={accountId}
        productId={selectedProductId}
        onTagCreated={() => {
          // Recargar etiquetas después de crear
          if (showTagsMenu) {
            loadTags();
          }
        }}
      />
    </div>
  );
}

