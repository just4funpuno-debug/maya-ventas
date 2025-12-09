/**
 * Card para mostrar un contacto bloqueado o sospechoso
 * FASE 5: SUBFASE 5.3 - Panel de Posibles Bloqueos
 */

import React, { useState } from 'react';
import { 
  User, Phone, AlertTriangle, CheckCircle2, Trash2, 
  MessageSquare, X, Edit3, Save
} from 'lucide-react';
import { AsyncButton } from '../AsyncButton';

export default function BlockedContactCard({
  contact,
  isBlocked = false,
  onReactivate,
  onDelete,
  onAddNote,
  isLoading = false
}) {
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState('');

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

  const getProbabilityColor = (probability) => {
    if (probability >= 80) return 'text-red-400 bg-red-400/10 border-red-400/20';
    if (probability >= 50) return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
    return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    
    const result = await onAddNote(contact.id, noteText.trim());
    if (result.success) {
      setShowNoteModal(false);
      setNoteText('');
    }
  };

  return (
    <>
      <div className={`p-4 rounded-lg border bg-neutral-800/50 border-neutral-700 hover:border-neutral-600 transition ${
        isBlocked ? 'border-red-500/30' : 'border-yellow-500/30'
      }`}>
        <div className="flex items-start justify-between gap-4">
          {/* Información del contacto */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg ${
                isBlocked ? 'bg-red-500/10' : 'bg-yellow-500/10'
              }`}>
                {isBlocked ? (
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold text-lg">
                  {contact.name || 'Sin nombre'}
                </h3>
                <div className="flex items-center gap-2 text-neutral-400 text-sm mt-1">
                  <Phone className="w-4 h-4" />
                  <span>{contact.phone}</span>
                </div>
              </div>
            </div>

            {/* Métricas */}
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="p-2 rounded bg-neutral-900/50">
                <div className="text-xs text-neutral-400 mb-1">Probabilidad</div>
                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-sm font-semibold ${
                  getProbabilityColor(contact.block_probability || 0)
                }`}>
                  {contact.block_probability || 0}%
                </div>
              </div>
              <div className="p-2 rounded bg-neutral-900/50">
                <div className="text-xs text-neutral-400 mb-1">Sin entregar</div>
                <div className="text-white font-semibold">
                  {contact.consecutive_undelivered || 0} mensajes
                </div>
              </div>
            </div>

            {/* Última interacción */}
            {contact.last_interaction_at && (
              <div className="mt-3 text-xs text-neutral-400">
                Última interacción: {formatDate(contact.last_interaction_at)}
              </div>
            )}

            {/* Notas */}
            {contact.notes && (
              <div className="mt-3 p-2 rounded bg-neutral-900/30 border border-neutral-700">
                <div className="text-xs text-neutral-400 mb-1">Notas:</div>
                <div className="text-sm text-neutral-300 whitespace-pre-wrap">
                  {contact.notes}
                </div>
              </div>
            )}
          </div>

          {/* Acciones */}
          <div className="flex flex-col gap-2">
            {isBlocked && (
              <AsyncButton
                onClick={() => onReactivate(contact.id)}
                disabled={isLoading}
                className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Reactivar
              </AsyncButton>
            )}
            <AsyncButton
              onClick={() => setShowNoteModal(true)}
              disabled={isLoading}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              Nota
            </AsyncButton>
            <AsyncButton
              onClick={() => onDelete(contact.id)}
              disabled={isLoading}
              className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar
            </AsyncButton>
          </div>
        </div>
      </div>

      {/* Modal de Nota */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-neutral-800 rounded-lg p-6 w-full max-w-md border border-neutral-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-lg">Agregar Nota</h3>
              <button
                onClick={() => {
                  setShowNoteModal(false);
                  setNoteText('');
                }}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Escribe una nota sobre este contacto..."
              className="w-full p-3 rounded-lg bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-500 resize-none"
              rows={4}
            />
            <div className="flex gap-2 mt-4">
              <AsyncButton
                onClick={handleAddNote}
                disabled={!noteText.trim() || isLoading}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                Guardar
              </AsyncButton>
              <button
                onClick={() => {
                  setShowNoteModal(false);
                  setNoteText('');
                }}
                className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


