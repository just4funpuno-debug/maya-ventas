/**
 * Componente para enviar mensajes via WhatsApp
 * SUBFASE 2.4: Componente principal de envío
 */

import React, { useState, useEffect, useRef } from 'react';
import { Send, Image, Video, Music, FileText, X, Loader2, Plus } from 'lucide-react';
import { useToast } from '../ToastProvider';
import { sendMessageIntelligent, decideSendMethod } from '../../services/whatsapp/send-decision';
import WindowIndicator from './WindowIndicator';
import SendMethodBadge from './SendMethodBadge';
import { getAllAccounts } from '../../services/whatsapp/accounts';
import QuotedMessage from './QuotedMessage';
import { EmojiPickerButton } from './EmojiPicker';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';
import { searchQuickReplies } from '../../services/whatsapp/quick-replies';
import { sendQuickReply } from '../../services/whatsapp/quick-reply-sender';
import QuickReplyDropdown from './QuickReplyDropdown';

const MESSAGE_TYPES = {
  text: { label: 'Texto', icon: Send },
  image: { label: 'Imagen', icon: Image },
  video: { label: 'Video', icon: Video },
  audio: { label: 'Audio', icon: Music },
  document: { label: 'Documento', icon: FileText }
};

export default function MessageSender({ contactId, accountId, productId, onMessageSent, replyToMessage = null, onCancelReply }) {
  const toast = useToast();
  const layout = useResponsiveLayout();
  const [messageType, setMessageType] = useState('text');
  const [messageText, setMessageText] = useState('');
  const [caption, setCaption] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [filename, setFilename] = useState('');
  const [sending, setSending] = useState(false);
  const [sendMethod, setSendMethod] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState(accountId || '');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [fileDialogOpen, setFileDialogOpen] = useState(false);
  const [showQuickReplyDropdown, setShowQuickReplyDropdown] = useState(false);
  const [quickReplies, setQuickReplies] = useState([]);
  const [quickReplySearchTerm, setQuickReplySearchTerm] = useState('');
  const [selectedQuickReplyIndex, setSelectedQuickReplyIndex] = useState(0);
  const [loadingQuickReplies, setLoadingQuickReplies] = useState(false);
  const textareaRef = useRef(null);
  const attachMenuRef = useRef(null);
  const quickReplyDropdownRef = useRef(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    if (accountId) {
      setSelectedAccountId(accountId);
    }
  }, [accountId]);

  useEffect(() => {
    if (contactId && selectedAccountId) {
      updateSendMethod();
    }
  }, [contactId, selectedAccountId, messageType]);

  // Cargar respuestas rápidas cuando cambia la cuenta o se abre el componente
  useEffect(() => {
    if (selectedAccountId && messageType === 'text') {
      loadQuickReplies();
    }
  }, [selectedAccountId, messageType]);

  // Detectar "/" en el texto y mostrar dropdown
  useEffect(() => {
    if (messageType !== 'text') {
      setShowQuickReplyDropdown(false);
      setQuickReplySearchTerm('');
      return;
    }

    // Detectar si el usuario está escribiendo "/" al inicio de la línea actual
    const lines = messageText.split('\n');
    const currentLine = lines[lines.length - 1] || '';
    
    // Verificar si la línea actual empieza con "/" y no tiene espacio antes
    if (currentLine.startsWith('/') && !currentLine.substring(1).includes(' ')) {
      const searchTerm = currentLine.substring(1);
      setQuickReplySearchTerm(searchTerm);
      
      if (selectedAccountId && quickReplies.length > 0) {
        setShowQuickReplyDropdown(true);
        setSelectedQuickReplyIndex(0);
      } else {
        setShowQuickReplyDropdown(false);
      }
    } else {
      setShowQuickReplyDropdown(false);
      setQuickReplySearchTerm('');
    }
  }, [messageText, messageType, selectedAccountId, quickReplies]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        quickReplyDropdownRef.current &&
        !quickReplyDropdownRef.current.contains(event.target) &&
        textareaRef.current &&
        !textareaRef.current.contains(event.target)
      ) {
        setShowQuickReplyDropdown(false);
      }
    };

    if (showQuickReplyDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showQuickReplyDropdown]);

  // Cerrar menú de adjuntar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(event.target)) {
        setShowAttachMenu(false);
      }
    };

    if (showAttachMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showAttachMenu]);

  // Ajustar altura del textarea dinámicamente
  useEffect(() => {
    if (textareaRef.current && messageType === 'text') {
      const textarea = textareaRef.current;
      
      // Resetear altura para recalcular
      textarea.style.height = 'auto';
      
      // Calcular altura de una línea
      const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight, 10) || 20;
      const padding = parseInt(window.getComputedStyle(textarea).paddingTop, 10) + 
                      parseInt(window.getComputedStyle(textarea).paddingBottom, 10);
      
      // Calcular número de líneas
      const scrollHeight = textarea.scrollHeight;
      const lines = Math.floor((scrollHeight - padding) / lineHeight) || 1;
      
      // Máximo 5 líneas
      const maxLines = 5;
      const minLines = 1;
      
      if (lines <= maxLines) {
        // Ajustar altura según número de líneas
        textarea.style.height = `${lineHeight * lines + padding}px`;
        textarea.style.overflowY = 'hidden';
      } else {
        // Más de 5 líneas: altura fija con scroll
        textarea.style.height = `${lineHeight * maxLines + padding}px`;
        textarea.style.overflowY = 'auto';
      }
    }
  }, [messageText, messageType]);

  const loadAccounts = async () => {
    try {
      const { data, error } = await getAllAccounts();
      if (error) {
        console.error('[MessageSender] Error cargando cuentas:', error);
        return;
      }
      setAccounts(data || []);
      
      // Si no hay accountId seleccionado, usar la primera activa
      if (!selectedAccountId && data && data.length > 0) {
        const activeAccount = data.find(a => a.active) || data[0];
        if (activeAccount) {
          setSelectedAccountId(activeAccount.id);
        }
      }
    } catch (err) {
      console.error('[MessageSender] Error:', err);
    }
  };

  const updateSendMethod = async () => {
    if (!contactId) return;

    try {
      const { method, reason } = await decideSendMethod(contactId);
      setSendMethod({ method, reason });
    } catch (err) {
      console.error('[MessageSender] Error obteniendo método:', err);
    }
  };

  const loadQuickReplies = async () => {
    // FASE 3 - SUBFASE 3.4: Usar productId en lugar de solo accountId
    if (!productId) {
      setQuickReplies([]);
      return;
    }

    try {
      setLoadingQuickReplies(true);
      // FASE 3 - SUBFASE 3.4: Pasar productId como primer parámetro
      const { data, error } = await searchQuickReplies(productId, '', selectedAccountId || undefined);
      
      if (error) {
        console.error('[MessageSender] Error cargando respuestas rápidas:', error);
        setQuickReplies([]);
        return;
      }
      
      setQuickReplies(data || []);
    } catch (err) {
      console.error('[MessageSender] Error fatal cargando respuestas rápidas:', err);
      setQuickReplies([]);
    } finally {
      setLoadingQuickReplies(false);
    }
  };

  // Filtrar respuestas rápidas según el término de búsqueda
  const filteredQuickReplies = React.useMemo(() => {
    if (quickReplies.length === 0) return [];

    if (!quickReplySearchTerm) {
      return quickReplies.slice(0, 10); // Mostrar máximo 10
    }

    const searchLower = quickReplySearchTerm.toLowerCase();
    const filtered = quickReplies.filter(reply => {
      // Buscar en trigger (sin el "/")
      const triggerWithoutSlash = reply.trigger.substring(1).toLowerCase();
      return (
        triggerWithoutSlash.startsWith(searchLower) ||
        triggerWithoutSlash.includes(searchLower) ||
        reply.name.toLowerCase().includes(searchLower)
      );
    });

    // Ordenar: primero las que empiezan con el término, luego las que lo contienen
    return filtered
      .sort((a, b) => {
        const aTrigger = a.trigger.substring(1).toLowerCase();
        const bTrigger = b.trigger.substring(1).toLowerCase();
        const aStarts = aTrigger.startsWith(searchLower);
        const bStarts = bTrigger.startsWith(searchLower);
        
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return 0;
      })
      .slice(0, 10);
  }, [quickReplies, quickReplySearchTerm]);

  // Manejar selección de respuesta rápida
  const handleSelectQuickReply = async (reply) => {
    if (!contactId || !selectedAccountId) {
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'Selecciona un contacto y una cuenta'
      });
      return;
    }

    try {
      setSending(true);
      setShowQuickReplyDropdown(false);

      // Limpiar el texto (incluyendo el "/...")
      // Mantener las líneas anteriores si las hay
      const lines = messageText.split('\n');
      lines.pop(); // Eliminar la línea actual con "/..."
      setMessageText(lines.join('\n'));

      // Enviar respuesta rápida
      const result = await sendQuickReply(selectedAccountId, contactId, reply.id, {
        replyToMessageId: replyToMessage?.wa_message_id || replyToMessage?.id,
        replyToMessageUuid: replyToMessage?.id
      });

      if (!result.success) {
        throw new Error(result.error?.message || 'Error al enviar respuesta rápida');
      }

      toast.push({
        type: 'success',
        title: 'Éxito',
        message: 'Respuesta rápida enviada correctamente'
      });

      // Limpiar mensaje a responder
      if (onCancelReply) {
        onCancelReply();
      }

      // Notificar al componente padre
      if (onMessageSent) {
        onMessageSent(result);
      }

      // Actualizar método de envío
      await updateSendMethod();
    } catch (err) {
      console.error('[MessageSender] Error enviando respuesta rápida:', err);
      toast.push({
        type: 'error',
        title: 'Error',
        message: err.message || 'Error al enviar respuesta rápida'
      });
    } finally {
      setSending(false);
    }
  };

  // Manejar navegación con teclado en el dropdown
  const handleKeyDown = (e) => {
    // Si hay dropdown visible, manejar navegación
    if (showQuickReplyDropdown && filteredQuickReplies.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedQuickReplyIndex(prev => 
          prev < filteredQuickReplies.length - 1 ? prev + 1 : prev
        );
        return;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedQuickReplyIndex(prev => prev > 0 ? prev - 1 : 0);
        return;
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        // Seleccionar respuesta rápida actual
        if (filteredQuickReplies[selectedQuickReplyIndex]) {
          handleSelectQuickReply(filteredQuickReplies[selectedQuickReplyIndex]);
        }
        return;
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowQuickReplyDropdown(false);
        // Limpiar el "/" del texto
        const lines = messageText.split('\n');
        lines[lines.length - 1] = '';
        setMessageText(lines.join('\n'));
        return;
      }
    }

    // Si no hay dropdown, manejar Enter normalmente
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (messageText.trim() && !sending) {
        handleSend();
      }
    }
  };


  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    
    // Cerrar el diálogo siempre
    setFileDialogOpen(false);
    
    // Si el usuario canceló (no seleccionó archivo), mantener como texto
    if (!file) {
      return;
    }

    setMediaFile(file);
    setFilename(file.name);

    // Detectar tipo de archivo y cambiar el tipo de mensaje
    if (file.type.startsWith('image/')) {
      setMessageType('image');
    } else if (file.type.startsWith('video/')) {
      setMessageType('video');
    } else if (file.type.startsWith('audio/')) {
      setMessageType('audio');
    } else {
      setMessageType('document');
    }

    // Cerrar menú de adjuntar después de seleccionar archivo
    setShowAttachMenu(false);
  };

  const handleAttachType = (type) => {
    // Cerrar el menú primero
    setShowAttachMenu(false);
    
    // Marcar que el diálogo de archivo está abierto
    setFileDialogOpen(true);
    
    // Abrir el explorador de archivos inmediatamente
    // Los inputs están siempre disponibles en el DOM (fuera del menú)
    requestAnimationFrame(() => {
      const fileInput = document.getElementById(`file-input-${type}`);
      if (fileInput) {
        // Resetear el valor para permitir seleccionar el mismo archivo nuevamente
        fileInput.value = '';
        // Abrir el explorador de archivos
        fileInput.click();
      } else {
        console.error(`[handleAttachType] Input file-input-${type} no encontrado`);
        setFileDialogOpen(false);
      }
    });
  };

  const handleRemoveFile = () => {
    setMediaFile(null);
    setFilename('');
    if (messageType !== 'text') {
      setMessageType('text');
    }
  };

  const handleSend = async () => {
    if (!contactId) {
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'No hay contacto seleccionado'
      });
      return;
    }

    if (!selectedAccountId) {
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'Selecciona una cuenta WhatsApp'
      });
      return;
    }

    if (messageType === 'text' && !messageText.trim()) {
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'Escribe un mensaje'
      });
      return;
    }

    if (messageType !== 'text' && !mediaFile) {
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'Selecciona un archivo'
      });
      return;
    }

    try {
      setSending(true);

      const messageData = {
        contentText: messageType === 'text' ? messageText : null,
        mediaFile: messageType !== 'text' ? mediaFile : null,
        mediaFilename: messageType !== 'text' ? filename : null,
        caption: (messageType === 'image' || messageType === 'video' || messageType === 'document') ? caption : null,
        filename: messageType === 'document' ? filename : null
      };

      // Agregar replyToMessageId si existe
      // Para WhatsApp API necesitamos el wa_message_id (WhatsApp ID)
      // Para nuestra BD guardamos el UUID (id) del mensaje
      const options = {};
      if (replyToMessage) {
        // Usar wa_message_id si existe, sino usar id (para compatibilidad)
        options.replyToMessageId = replyToMessage.wa_message_id || replyToMessage.id;
        // También guardar el UUID de nuestra BD para la relación en BD
        options.replyToMessageUuid = replyToMessage.id; // UUID de nuestra BD
      }

      const result = await sendMessageIntelligent(
        selectedAccountId,
        contactId,
        messageType,
        messageData,
        options
      );

      if (!result.success) {
        throw new Error(result.error?.message || 'Error al enviar mensaje');
      }

      toast.push({
        type: 'success',
        title: 'Éxito',
        message: result.method === 'cloud_api'
          ? 'Mensaje enviado via Cloud API'
          : 'Mensaje agregado a cola Puppeteer'
      });

      // Limpiar formulario
      setMessageText('');
      setCaption('');
      setMediaFile(null);
      setFilename('');
      setMessageType('text');
      
      // Limpiar mensaje a responder
      if (onCancelReply) {
        onCancelReply();
      }

      // Notificar al componente padre
      if (onMessageSent) {
        onMessageSent(result);
      }

      // Actualizar método de envío
      await updateSendMethod();
    } catch (err) {
      console.error('[MessageSender] Error enviando mensaje:', err);
      toast.push({
        type: 'error',
        title: 'Error',
        message: err.message || 'Error al enviar mensaje'
      });
    } finally {
      setSending(false);
    }
  };

  const activeAccounts = accounts.filter(a => a.active);

  return (
    <div className={`${layout.padding} rounded-lg bg-neutral-900 border border-neutral-800`}>
      {/* Selector de cuenta */}
      {accounts.length > 0 && (
        <div className="mb-4">
          <label className="block text-xs font-medium text-neutral-400 mb-2">
            Cuenta WhatsApp
          </label>
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#e7922b]"
            disabled={sending}
          >
            {activeAccounts.length === 0 ? (
              <option value="">No hay cuentas activas</option>
            ) : (
              <>
                <option value="">Selecciona una cuenta</option>
                {activeAccounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.display_name || account.phone_number}
                  </option>
                ))}
              </>
            )}
          </select>
        </div>
      )}

      {/* Mensaje citado (Reply) */}
      {replyToMessage && (
        <div className="mb-4 p-3 rounded-lg bg-neutral-800 border border-neutral-700 relative">
          <button
            onClick={onCancelReply}
            className="absolute top-2 right-2 p-1 rounded hover:bg-neutral-700 transition"
            title="Cancelar respuesta"
          >
            <X className="w-3.5 h-3.5 text-neutral-400" />
          </button>
          <p className="text-xs text-neutral-400 mb-1.5">Respondiendo a:</p>
          <QuotedMessage quotedMessage={replyToMessage} isFromMe={false} />
        </div>
      )}

      {/* Información de ventana y método */}
      {contactId && (
        <div className="mb-4 flex items-center justify-between">
          <WindowIndicator contactId={contactId} />
          {sendMethod && (
            <SendMethodBadge method={sendMethod.method} reason={sendMethod.reason} />
          )}
        </div>
      )}


      {/* Input de texto */}
      {messageType === 'text' && (
        <div className="mb-4 relative">
          <div className="flex items-end gap-2">
            {/* Botones de acción: "+" y emoji juntos */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Botón de adjuntar */}
              <div className="relative" ref={attachMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowAttachMenu(!showAttachMenu)}
                  disabled={sending}
                  className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-400 hover:text-neutral-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Adjuntar archivo"
                >
                  <Plus className="w-5 h-5" />
                </button>

                {/* Menú de adjuntar */}
                {showAttachMenu && (
                  <div className="absolute bottom-full left-0 mb-2 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl p-2 min-w-[180px] z-50">
                    <button
                      type="button"
                      onClick={() => handleAttachType('image')}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-700 transition text-left"
                    >
                      <Image className="w-5 h-5 text-blue-400" />
                      <span className="text-sm text-neutral-200">Imagen</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAttachType('video')}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-700 transition text-left"
                    >
                      <Video className="w-5 h-5 text-purple-400" />
                      <span className="text-sm text-neutral-200">Video</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAttachType('audio')}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-700 transition text-left"
                    >
                      <Music className="w-5 h-5 text-green-400" />
                      <span className="text-sm text-neutral-200">Audio</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAttachType('document')}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-700 transition text-left"
                    >
                      <FileText className="w-5 h-5 text-orange-400" />
                      <span className="text-sm text-neutral-200">Documento</span>
                    </button>
                  </div>
                )}

                {/* Inputs de archivo ocultos - siempre disponibles fuera del menú */}
                <input
                  id="file-input-image"
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={sending}
                />
                <input
                  id="file-input-video"
                  type="file"
                  className="hidden"
                  accept="video/*"
                  onChange={handleFileChange}
                  disabled={sending}
                />
                <input
                  id="file-input-audio"
                  type="file"
                  className="hidden"
                  accept="audio/*"
                  onChange={handleFileChange}
                  disabled={sending}
                />
                <input
                  id="file-input-document"
                  type="file"
                  className="hidden"
                  accept="*/*"
                  onChange={handleFileChange}
                  disabled={sending}
                />
              </div>

              {/* Botón de emojis */}
              <EmojiPickerButton
                onEmojiSelect={(emoji) => {
                  setMessageText(prev => prev + emoji);
                }}
                isOpen={showEmojiPicker}
                onToggle={() => setShowEmojiPicker(!showEmojiPicker)}
              />
            </div>

            {/* Campo de texto */}
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribe tu mensaje... (Enter para enviar, Shift+Enter para nueva línea, / para respuestas rápidas)"
                rows={1}
                disabled={sending}
                className={`w-full ${layout.isMobile ? 'px-2 py-1.5 text-xs' : 'px-3 py-2 text-sm'} rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-200 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#e7922b] resize-none disabled:opacity-50 transition-all duration-150`}
                style={{
                  minHeight: '40px',
                  maxHeight: 'none', // Se controla dinámicamente
                  overflowY: 'hidden' // Se cambia a 'auto' cuando hay más de 5 líneas
                }}
              />

              {/* Dropdown de respuestas rápidas */}
              {showQuickReplyDropdown && filteredQuickReplies.length > 0 && (
                <div 
                  ref={quickReplyDropdownRef} 
                  className="absolute bottom-full left-0 mb-2"
                  style={{
                    zIndex: 1000
                  }}
                >
                  <QuickReplyDropdown
                    quickReplies={filteredQuickReplies}
                    searchTerm={quickReplySearchTerm}
                    selectedIndex={selectedQuickReplyIndex}
                    onSelect={handleSelectQuickReply}
                    position={{
                      top: 0,
                      left: 0
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Selector de archivo */}
      {/* Solo mostrar el área de selección si no hay archivo Y el diálogo no está abierto */}
      {messageType !== 'text' && !fileDialogOpen && (
        <div className="mb-4">
          {!mediaFile ? (
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-neutral-700 rounded-lg cursor-pointer hover:border-[#e7922b] transition">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {messageType === 'image' && <Image className="w-8 h-8 text-neutral-400 mb-2" />}
                {messageType === 'video' && <Video className="w-8 h-8 text-neutral-400 mb-2" />}
                {messageType === 'audio' && <Music className="w-8 h-8 text-neutral-400 mb-2" />}
                {messageType === 'document' && <FileText className="w-8 h-8 text-neutral-400 mb-2" />}
                <p className="text-sm text-neutral-400">
                  Haz clic para seleccionar archivo
                </p>
              </div>
              <input
                type="file"
                className="hidden"
                accept={
                  messageType === 'image' ? 'image/*' :
                  messageType === 'video' ? 'video/*' :
                  messageType === 'audio' ? 'audio/*' :
                  '*/*'
                }
                onChange={handleFileChange}
                disabled={sending}
              />
            </label>
          ) : (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-neutral-800 border border-neutral-700">
              <div className="flex-1">
                <p className="text-sm text-neutral-200 font-medium">{filename}</p>
                <p className="text-xs text-neutral-400">
                  {(mediaFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                type="button"
                onClick={handleRemoveFile}
                disabled={sending}
                className="p-1.5 rounded hover:bg-neutral-700 transition disabled:opacity-50"
              >
                <X className="w-4 h-4 text-neutral-400" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Caption (para imagen, video, documento) */}
      {(messageType === 'image' || messageType === 'video' || messageType === 'document') && mediaFile && (
        <div className="mb-4">
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Caption (opcional)..."
            rows={2}
            disabled={sending}
            className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#e7922b] resize-none disabled:opacity-50"
          />
        </div>
      )}

      {/* Filename (solo para documentos) */}
      {messageType === 'document' && mediaFile && (
        <div className="mb-4">
          <input
            type="text"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            placeholder="Nombre del archivo..."
            disabled={sending}
            className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#e7922b] disabled:opacity-50"
          />
        </div>
      )}

      {/* Botón de envío solo para tipos de mensaje que no son texto */}
      {messageType !== 'text' && (
        <button
          onClick={handleSend}
          disabled={sending || !selectedAccountId || !mediaFile}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#e7922b] text-white font-medium hover:bg-[#d6821b] transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Enviando...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Enviar Mensaje</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}

