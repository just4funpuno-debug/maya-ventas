/**
 * Componente para burbuja de mensaje
 * FASE 3: SUBFASE 3.4 - Burbujas de Mensajes
 * 
 * Muestra mensajes de texto, imagen, video, audio y documento
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, CheckCheck, Clock, Image, Video, Music, FileText, Reply, Forward } from 'lucide-react';
import QuotedMessage from './QuotedMessage';
import { getMessageById } from '../../services/whatsapp/conversations';

export default function MessageBubble({ message, isFromMe, showTimestamp = true, onReply, onForward, quotedMessage = null }) {
  const [quotedMsg, setQuotedMsg] = useState(quotedMessage);
  // Formatear timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return '';

    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isYesterday = date.toDateString() === new Date(now - 86400000).toDateString();

    if (isToday) {
      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } else if (isYesterday) {
      return `Ayer ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('es-ES', { 
        day: 'numeric', 
        month: 'short',
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
  };

  // Obtener icono según tipo de mensaje
  const getMessageIcon = (messageType) => {
    switch (messageType) {
      case 'image':
        return <Image className="w-4 h-4" />;
      case 'video':
        return <Video className="w-4 h-4" />;
      case 'audio':
        return <Music className="w-4 h-4" />;
      case 'document':
        return <FileText className="w-4 h-4" />;
      default:
        return null;
    }
  };

  // Obtener componente de estado
  const getStatusIcon = (status, isFromMe) => {
    if (!isFromMe) return null;

    switch (status) {
      case 'sent':
        return <Check className="w-3.5 h-3.5 text-neutral-400" />;
      case 'delivered':
        return <CheckCheck className="w-3.5 h-3.5 text-neutral-400" />;
      case 'read':
        return <CheckCheck className="w-3.5 h-3.5 text-blue-400" />;
      case 'failed':
        return <Clock className="w-3.5 h-3.5 text-red-400" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-neutral-400" />;
    }
  };

  // Cargar mensaje citado si existe reply_to_message_id
  useEffect(() => {
    if (message.reply_to_message_id && !quotedMsg) {
      loadQuotedMessage();
    }
  }, [message.reply_to_message_id]);

  const loadQuotedMessage = async () => {
    try {
      const { data, error } = await getMessageById(message.reply_to_message_id);
      if (!error && data) {
        setQuotedMsg(data);
      }
    } catch (err) {
      console.error('[MessageBubble] Error cargando mensaje citado:', err);
    }
  };

  const handleReply = () => {
    if (onReply) {
      onReply(message);
    }
  };

  const handleForward = () => {
    if (onForward) {
      onForward(message);
    }
  };

  const bubbleClass = isFromMe
    ? 'bg-[#e7922b] text-white ml-auto'
    : 'bg-neutral-800 text-neutral-200 mr-auto';

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex ${isFromMe ? 'justify-end' : 'justify-start'}`}
    >
      <motion.div
        whileHover={{ scale: 1.02 }}
        className={`max-w-[70%] rounded-lg px-3 py-2 shadow-sm ${bubbleClass} relative group`}
      >
        {/* Botones de acción - solo mostrar en hover */}
        <div className="absolute -left-20 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onReply && (
            <button
              onClick={handleReply}
              className="p-1.5 rounded-full bg-neutral-700 hover:bg-neutral-600 transition"
              title="Responder"
            >
              <Reply className="w-3.5 h-3.5 text-neutral-300" />
            </button>
          )}
          {onForward && (
            <button
              onClick={handleForward}
              className="p-1.5 rounded-full bg-neutral-700 hover:bg-neutral-600 transition"
              title="Reenviar"
            >
              <Forward className="w-3.5 h-3.5 text-neutral-300" />
            </button>
          )}
        </div>

        {/* Mensaje citado (Reply) */}
        {quotedMsg && (
          <QuotedMessage quotedMessage={quotedMsg} isFromMe={isFromMe} />
        )}

        {/* Mensaje de texto */}
        {message.message_type === 'text' && (
          <div>
            <p className="text-sm whitespace-pre-wrap break-words">
              {message.content_text || ''}
            </p>
          </div>
        )}

        {/* Mensaje de imagen */}
        {message.message_type === 'image' && (
          <div>
            {message.media_url && (
              <img
                src={message.media_url}
                alt={message.caption || 'Imagen'}
                className="max-w-full rounded-lg mb-1"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
            {message.caption && (
              <p className="text-sm whitespace-pre-wrap break-words mt-1">
                {message.caption}
              </p>
            )}
          </div>
        )}

        {/* Mensaje de video */}
        {message.message_type === 'video' && (
          <div>
            {message.media_url && (
              <video
                src={message.media_url}
                controls
                className="max-w-full rounded-lg mb-1"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
            {message.caption && (
              <p className="text-sm whitespace-pre-wrap break-words mt-1">
                {message.caption}
              </p>
            )}
          </div>
        )}

        {/* Mensaje de audio */}
        {message.message_type === 'audio' && (
          <div className="flex items-center gap-2">
            <Music className="w-5 h-5" />
            {message.media_url ? (
              <audio
                src={message.media_url}
                controls
                className="flex-1"
              />
            ) : (
              <span className="text-sm">Audio</span>
            )}
          </div>
        )}

        {/* Mensaje de documento */}
        {message.message_type === 'document' && (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-5 h-5" />
              <span className="text-sm font-medium">
                {message.media_filename || 'Documento'}
              </span>
            </div>
            {message.caption && (
              <p className="text-sm whitespace-pre-wrap break-words">
                {message.caption}
              </p>
            )}
            {message.media_url && (
              <a
                href={message.media_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs underline mt-1 inline-block"
              >
                Descargar
              </a>
            )}
          </div>
        )}

        {/* Footer con timestamp y estado - solo mostrar si showTimestamp es true */}
        {showTimestamp && (
          <div className={`flex items-center gap-1.5 mt-1.5 ${
            isFromMe ? 'justify-end' : 'justify-start'
          }`}>
            <span className={`text-xs font-medium ${
              isFromMe 
                ? 'text-white/80' 
                : 'text-neutral-400'
            }`}>
              {formatTime(message.timestamp)}
            </span>
            {getStatusIcon(message.status, isFromMe)}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

