/**
 * Componente para mostrar mensaje citado (Reply)
 * FASE 3: SUBFASE 3.2 - Respuesta a Mensajes
 */

import React from 'react';
import { Image, Video, Music, FileText } from 'lucide-react';

export default function QuotedMessage({ quotedMessage, isFromMe }) {
  if (!quotedMessage) return null;

  const getMessagePreview = () => {
    if (quotedMessage.message_type === 'text') {
      return quotedMessage.content_text || quotedMessage.text_content || 'Mensaje de texto';
    } else if (quotedMessage.message_type === 'image') {
      return quotedMessage.caption || quotedMessage.media_caption || 'Imagen';
    } else if (quotedMessage.message_type === 'video') {
      return quotedMessage.caption || quotedMessage.media_caption || 'Video';
    } else if (quotedMessage.message_type === 'audio') {
      return 'Audio';
    } else if (quotedMessage.message_type === 'document') {
      return quotedMessage.media_filename || quotedMessage.caption || 'Documento';
    }
    return 'Mensaje';
  };

  const getMessageIcon = () => {
    switch (quotedMessage.message_type) {
      case 'image':
        return <Image className="w-3 h-3" />;
      case 'video':
        return <Video className="w-3 h-3" />;
      case 'audio':
        return <Music className="w-3 h-3" />;
      case 'document':
        return <FileText className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const preview = getMessagePreview();
  const icon = getMessageIcon();
  const isLongText = preview.length > 50;

  return (
    <div className={`mb-2 px-2 py-1.5 rounded border-l-4 ${
      isFromMe
        ? 'bg-white/10 border-white/30'
        : 'bg-neutral-700/50 border-neutral-500'
    }`}>
      <div className="flex items-start gap-2">
        {icon && (
          <div className={`mt-0.5 ${isFromMe ? 'text-white/70' : 'text-neutral-400'}`}>
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-medium mb-0.5 ${
            isFromMe ? 'text-white/90' : 'text-neutral-300'
          }`}>
            {quotedMessage.is_from_me ? 'Tú' : 'Cliente'}
          </p>
          <p className={`text-xs truncate ${
            isFromMe ? 'text-white/70' : 'text-neutral-400'
          }`}>
            {isLongText ? `${preview.substring(0, 50)}...` : preview}
          </p>
        </div>
      </div>
    </div>
  );
}


