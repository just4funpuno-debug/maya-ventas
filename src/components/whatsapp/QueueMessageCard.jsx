/**
 * Card para mostrar un mensaje en la cola de Puppeteer
 * FASE 5: SUBFASE 5.1 - Panel de Cola Puppeteer
 */

import React from 'react';
import { Trash2, RotateCw, Clock, CheckCircle2, XCircle, Loader2, MessageSquare, Image, Video, FileText, Music } from 'lucide-react';
import { AsyncButton } from '../AsyncButton';

const STATUS_COLORS = {
  pending: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  processing: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  sent: 'text-green-400 bg-green-400/10 border-green-400/20',
  failed: 'text-red-400 bg-red-400/10 border-red-400/20'
};

const STATUS_ICONS = {
  pending: Clock,
  processing: Loader2,
  sent: CheckCircle2,
  failed: XCircle
};

const PRIORITY_COLORS = {
  HIGH: 'text-red-400 bg-red-400/10',
  MEDIUM: 'text-yellow-400 bg-yellow-400/10',
  LOW: 'text-blue-400 bg-blue-400/10'
};

const MESSAGE_TYPE_ICONS = {
  text: MessageSquare,
  image: Image,
  video: Video,
  audio: Music,
  document: FileText
};

export default function QueueMessageCard({
  message,
  onRemove,
  onRetry,
  isLoading = false
}) {
  const StatusIcon = STATUS_ICONS[message.status] || Clock;
  const MessageIcon = MESSAGE_TYPE_ICONS[message.message_type] || MessageSquare;
  const contact = message.whatsapp_contacts || {};

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('es-BO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pendiente',
      processing: 'Procesando',
      sent: 'Enviado',
      failed: 'Fallido'
    };
    return labels[status] || status;
  };

  const getPriorityLabel = (priority) => {
    const labels = {
      HIGH: 'Alta',
      MEDIUM: 'Media',
      LOW: 'Baja'
    };
    return labels[priority] || priority;
  };

  return (
    <div className="p-4 rounded-lg border bg-neutral-800/50 border-neutral-700 hover:border-neutral-600 transition">
      <div className="flex items-start justify-between gap-4">
        {/* Información principal */}
        <div className="flex-1 min-w-0">
          {/* Header con status y prioridad */}
          <div className="flex items-center gap-2 mb-2">
            <div className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${STATUS_COLORS[message.status] || STATUS_COLORS.pending}`}>
              <StatusIcon className={`w-3 h-3 ${message.status === 'processing' ? 'animate-spin' : ''}`} />
              {getStatusLabel(message.status)}
            </div>
            
            {message.priority && (
              <div className={`px-2 py-1 rounded text-xs font-medium ${PRIORITY_COLORS[message.priority] || PRIORITY_COLORS.MEDIUM}`}>
                {getPriorityLabel(message.priority)}
              </div>
            )}

            <div className="flex items-center gap-1 text-xs text-neutral-400">
              <MessageIcon className="w-3 h-3" />
              <span className="capitalize">{message.message_type}</span>
            </div>
          </div>

          {/* Contacto */}
          <div className="mb-2">
            <p className="text-sm font-semibold text-neutral-200">
              {contact.name || contact.phone || 'Contacto desconocido'}
            </p>
            {contact.phone && contact.name && (
              <p className="text-xs text-neutral-400">{contact.phone}</p>
            )}
          </div>

          {/* Contenido del mensaje */}
          <div className="mb-2">
            {message.message_type === 'text' && message.content_text && (
              <p className="text-sm text-neutral-300 line-clamp-2">
                {message.content_text}
              </p>
            )}
            
            {['image', 'video', 'audio', 'document'].includes(message.message_type) && (
              <div className="text-xs text-neutral-400">
                {message.media_path && (
                  <p className="truncate">Archivo: {message.media_path.split('/').pop()}</p>
                )}
                {message.media_size_kb && (
                  <p>Tamaño: {message.media_size_kb} KB</p>
                )}
                {message.caption && (
                  <p className="text-neutral-300 mt-1">Caption: {message.caption}</p>
                )}
              </div>
            )}
          </div>

          {/* Información adicional */}
          <div className="flex flex-wrap gap-3 text-xs text-neutral-500">
            {message.added_at && (
              <span>Agregado: {formatDate(message.added_at)}</span>
            )}
            {message.scheduled_for && (
              <span>Programado: {formatDate(message.scheduled_for)}</span>
            )}
            {message.processed_at && (
              <span>Procesado: {formatDate(message.processed_at)}</span>
            )}
            {message.attempts > 0 && (
              <span>Intentos: {message.attempts}</span>
            )}
            {message.message_number && (
              <span>Mensaje #{message.message_number}</span>
            )}
          </div>

          {/* Error message */}
          {message.error_message && (
            <div className="mt-2 p-2 rounded bg-red-400/10 border border-red-400/20">
              <p className="text-xs text-red-400">
                <strong>Error:</strong> {message.error_message}
              </p>
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {message.status === 'failed' && (
            <AsyncButton
              onClick={() => onRetry(message.id)}
              disabled={isLoading}
              className="p-2 rounded-lg hover:bg-neutral-700 transition text-blue-400 hover:text-blue-300"
              title="Reintentar mensaje"
            >
              <RotateCw className="w-4 h-4" />
            </AsyncButton>
          )}
          
          <AsyncButton
            onClick={() => onRemove(message.id)}
            disabled={isLoading}
            className="p-2 rounded-lg hover:bg-neutral-700 transition text-red-400 hover:text-red-300"
            title="Eliminar de la cola"
          >
            <Trash2 className="w-4 h-4" />
          </AsyncButton>
        </div>
      </div>
    </div>
  );
}


