/**
 * Editor de mensajes de una secuencia
 * FASE 4: SUBFASE 4.1 - Editor de Mensajes de Secuencia
 * 
 * Permite agregar, editar, eliminar y reordenar mensajes de una secuencia
 */

import React, { useState, useEffect } from 'react';
import { X, Plus, Edit, Trash2, ChevronUp, ChevronDown, Clock, Image, Video, Music, FileText, Send, MessageSquare, Calendar, CheckCircle, XCircle, Pause, ArrowRightCircle, GitBranch } from 'lucide-react';
import { useToast } from '../ToastProvider';
import ConfirmModal from '../ConfirmModal';
import SequenceMessageForm from './SequenceMessageForm';
import StepTypeSelector from './StepTypeSelector';
import PauseStepForm from './PauseStepForm';
import StageChangeStepForm from './StageChangeStepForm';
import ConditionStepForm from './ConditionStepForm';
import {
  getSequenceMessages,
  addSequenceMessage,
  updateSequenceMessage,
  deleteSequenceMessage,
  reorderSequenceMessages
} from '../../services/whatsapp/sequences';

const MESSAGE_TYPE_ICONS = {
  text: Send,
  image: Image,
  video: Video,
  audio: Music,
  document: FileText
};

const MESSAGE_TYPE_LABELS = {
  text: 'Texto',
  image: 'Imagen',
  video: 'Video',
  audio: 'Audio',
  document: 'Documento'
};

export default function SequenceMessageEditor({ sequence, onClose, onUpdate }) {
  const toast = useToast();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMessageForm, setShowMessageForm] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showStepTypeSelector, setShowStepTypeSelector] = useState(false); // FASE 2: Selector de tipo de paso
  const [showPauseForm, setShowPauseForm] = useState(false); // FASE 3: Formulario de pausa
  const [editingPause, setEditingPause] = useState(null); // FASE 3: Pausa en edición
  const [showStageChangeForm, setShowStageChangeForm] = useState(false); // FASE 4: Formulario de cambio de etapa
  const [editingStageChange, setEditingStageChange] = useState(null); // FASE 4: Cambio de etapa en edición
  const [showConditionForm, setShowConditionForm] = useState(false); // Formulario de condición
  const [editingCondition, setEditingCondition] = useState(null); // Condición en edición

  useEffect(() => {
    if (sequence) {
      loadMessages();
    }
  }, [sequence]);

  const loadMessages = async () => {
    if (!sequence?.id) return;

    try {
      setLoading(true);
      const { data, error } = await getSequenceMessages(sequence.id);
      
      if (error) throw error;
      
      setMessages(data || []);
    } catch (err) {
      console.error('[SequenceMessageEditor] Error cargando mensajes:', err);
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'No se pudieron cargar los mensajes'
      });
    } finally {
      setLoading(false);
    }
  };

  // FASE 2: Cambiar a "Agregar Paso" - mostrar selector primero
  const handleAddStep = () => {
    setShowStepTypeSelector(true);
  };

  // FASE 2: Manejar selección de tipo de paso
  const handleStepTypeSelected = (stepType) => {
    setEditingMessage(null);
    
    switch (stepType) {
      case 'message':
        setShowMessageForm(true);
        break;
      case 'pause':
        // FASE 3: Mostrar formulario de pausa
        setEditingPause(null);
        setShowPauseForm(true);
        break;
      case 'condition':
        // Mostrar formulario de condición
        setEditingCondition(null);
        setShowConditionForm(true);
        break;
      case 'stage_change':
        // FASE 4: Mostrar formulario de cambio de etapa
        setEditingStageChange(null);
        setShowStageChangeForm(true);
        break;
      default:
        console.warn('[SequenceMessageEditor] Tipo de paso desconocido:', stepType);
    }
  };

  // Mantener función original para compatibilidad (edición de mensajes)
  const handleAddMessage = () => {
    setEditingMessage(null);
    setShowMessageForm(true);
  };

  // FASE 3: Función para guardar pausa independiente
  const handleSavePause = async (pauseData) => {
    try {
      if (editingPause) {
        // Actualizar pausa existente
        const { error } = await updateSequenceMessage(editingPause.id, pauseData);
        if (error) throw error;

        toast.push({
          type: 'success',
          title: 'Éxito',
          message: 'Pausa actualizada correctamente'
        });
      } else {
        // Agregar nueva pausa
        const { error } = await addSequenceMessage(sequence.id, pauseData);
        if (error) throw error;

        toast.push({
          type: 'success',
          title: 'Éxito',
          message: 'Pausa agregada correctamente'
        });
      }

      setShowPauseForm(false);
      setEditingPause(null);
      loadMessages();
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('[SequenceMessageEditor] Error guardando pausa:', err);
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'No se pudo guardar la pausa: ' + (err.message || 'Error desconocido')
      });
    }
  };

  // Función para guardar condición
  const handleSaveCondition = async (conditionData) => {
    try {
      if (editingCondition) {
        // Actualizar condición existente
        const { error } = await updateSequenceMessage(editingCondition.id, conditionData);
        if (error) throw error;

        toast.push({
          type: 'success',
          title: 'Éxito',
          message: 'Condición actualizada correctamente'
        });
      } else {
        // Agregar nueva condición
        const { error } = await addSequenceMessage(sequence.id, conditionData);
        if (error) throw error;

        toast.push({
          type: 'success',
          title: 'Éxito',
          message: 'Condición agregada correctamente'
        });
      }

      setShowConditionForm(false);
      setEditingCondition(null);
      loadMessages();
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('[SequenceMessageEditor] Error guardando condición:', err);
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'No se pudo guardar la condición: ' + (err.message || 'Error desconocido')
      });
    }
  };

  // FASE 4: Función para guardar cambio de etapa
  const handleSaveStageChange = async (stageChangeData) => {
    try {
      if (editingStageChange) {
        // Actualizar cambio de etapa existente
        const { error } = await updateSequenceMessage(editingStageChange.id, stageChangeData);
        if (error) throw error;

        toast.push({
          type: 'success',
          title: 'Éxito',
          message: 'Cambio de etapa actualizado correctamente'
        });
      } else {
        // Agregar nuevo cambio de etapa
        const { error } = await addSequenceMessage(sequence.id, stageChangeData);
        if (error) throw error;

        toast.push({
          type: 'success',
          title: 'Éxito',
          message: 'Cambio de etapa agregado correctamente'
        });
      }

      setShowStageChangeForm(false);
      setEditingStageChange(null);
      loadMessages();
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('[SequenceMessageEditor] Error guardando cambio de etapa:', err);
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'No se pudo guardar el cambio de etapa: ' + (err.message || 'Error desconocido')
      });
    }
  };

  const handleEditMessage = (message) => {
    // Detectar tipo de paso y abrir formulario correspondiente
    if (message.step_type === 'pause') {
      setEditingPause(message);
      setShowPauseForm(true);
    } else if (message.step_type === 'stage_change') {
      // Mostrar formulario de cambio de etapa
      setEditingStageChange(message);
      setShowStageChangeForm(true);
    } else if (message.step_type === 'condition') {
      // Mostrar formulario de condición
      setEditingCondition(message);
      setShowConditionForm(true);
    } else {
      // Mensaje normal
      setEditingMessage(message);
      setShowMessageForm(true);
    }
  };

  const handleSaveMessage = async (messageData) => {
    try {
      if (editingMessage) {
        // Actualizar mensaje existente
        const { error } = await updateSequenceMessage(editingMessage.id, messageData);
        if (error) throw error;

        toast.push({
          type: 'success',
          title: 'Éxito',
          message: 'Mensaje actualizado correctamente'
        });
      } else {
        // Agregar nuevo mensaje
        const { error } = await addSequenceMessage(sequence.id, messageData);
        if (error) throw error;

        toast.push({
          type: 'success',
          title: 'Éxito',
          message: 'Mensaje agregado correctamente'
        });
      }

      setShowMessageForm(false);
      setEditingMessage(null);
      loadMessages();
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('[SequenceMessageEditor] Error guardando mensaje:', err);
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'No se pudo guardar el mensaje: ' + (err.message || 'Error desconocido')
      });
    }
  };

  const handleDeleteMessage = async () => {
    if (!deleteConfirm) return;

    try {
      const { error } = await deleteSequenceMessage(deleteConfirm.id);
      if (error) throw error;

      toast.push({
        type: 'success',
        title: 'Éxito',
        message: 'Mensaje eliminado correctamente'
      });

      setDeleteConfirm(null);
      loadMessages();
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('[SequenceMessageEditor] Error eliminando mensaje:', err);
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'No se pudo eliminar el mensaje: ' + (err.message || 'Error desconocido')
      });
    }
  };

  const handleMoveUp = async (message) => {
    const currentIndex = messages.findIndex(m => m.id === message.id);
    if (currentIndex <= 0) return;

    const newOrder = messages.map((m, idx) => ({
      id: m.id,
      order_position: idx === currentIndex
        ? messages[currentIndex - 1].order_position
        : idx === currentIndex - 1
        ? messages[currentIndex].order_position
        : m.order_position
    }));

    try {
      const { error } = await reorderSequenceMessages(sequence.id, newOrder);
      if (error) throw error;

      loadMessages();
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('[SequenceMessageEditor] Error reordenando:', err);
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'No se pudo reordenar el mensaje'
      });
    }
  };

  const handleMoveDown = async (message) => {
    const currentIndex = messages.findIndex(m => m.id === message.id);
    if (currentIndex >= messages.length - 1) return;

    const newOrder = messages.map((m, idx) => ({
      id: m.id,
      order_position: idx === currentIndex
        ? messages[currentIndex + 1].order_position
        : idx === currentIndex + 1
        ? messages[currentIndex].order_position
        : m.order_position
    }));

    try {
      const { error } = await reorderSequenceMessages(sequence.id, newOrder);
      if (error) throw error;

      loadMessages();
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('[SequenceMessageEditor] Error reordenando:', err);
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'No se pudo reordenar el mensaje'
      });
    }
  };

  const getMessagePreview = (message) => {
    if (message.message_type === 'text') {
      return message.content_text || '(Sin texto)';
    } else if (message.message_type === 'image') {
      return `📷 Imagen${message.caption ? `: ${message.caption}` : ''}`;
    } else if (message.message_type === 'video') {
      return `🎥 Video${message.caption ? `: ${message.caption}` : ''}`;
    } else if (message.message_type === 'audio') {
      return '🎵 Audio';
    } else if (message.message_type === 'document') {
      return `📄 ${message.media_filename || 'Documento'}`;
    }
    return 'Mensaje';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-[#0f171e] border border-neutral-800 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-800">
          <div>
            <h3 className="text-lg font-semibold text-neutral-200">
              {sequence?.name || 'Flujo'}
            </h3>
            <p className="text-sm text-neutral-400 mt-1">
              {sequence?.description || 'Sin descripción'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8 text-neutral-400">
              Cargando mensajes...
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-neutral-400">
              <p className="mb-4">No hay pasos en este flujo.</p>
            <button
              onClick={handleAddStep}
              className="px-4 py-2 bg-[#e7922b] text-[#1a2430] font-semibold rounded-lg hover:bg-[#d8821b] transition"
            >
              <Plus className="w-4 h-4 inline mr-2" />
              Agregar Primer Paso
            </button>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message, index) => {
                // Detectar tipo de paso
                const isPauseStep = message.step_type === 'pause';
                const isStageChangeStep = message.step_type === 'stage_change';
                const isConditionStep = message.step_type === 'condition';
                const isMessageStep = message.step_type === 'message' || !message.step_type; // Compatibilidad con registros antiguos
                const isDelayMessage = message.content_text === '⏸️ Pausa'; // Pausas antiguas (compatibilidad)
                
                // Icono según tipo de paso
                const Icon = isPauseStep 
                  ? Pause 
                  : isStageChangeStep 
                    ? ArrowRightCircle
                    : isConditionStep
                      ? GitBranch
                      : (MESSAGE_TYPE_ICONS[message.message_type] || Send);
                
                const canMoveUp = index > 0;
                const canMoveDown = index < messages.length - 1;

                return (
                  <React.Fragment key={message.id}>
                  <div
                    className={`${isPauseStep || isDelayMessage ? 'bg-yellow-500/10 border-yellow-500/30' : isStageChangeStep ? 'bg-green-500/10 border-green-500/30' : isConditionStep ? 'bg-purple-500/10 border-purple-500/30' : 'bg-neutral-800/50 border-neutral-700'} border rounded-lg p-4 hover:border-[#e7922b]/50 transition`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Número de paso */}
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        isPauseStep ? 'bg-yellow-500/20' : isStageChangeStep ? 'bg-green-500/20' : isConditionStep ? 'bg-purple-500/20' : 'bg-[#e7922b]/20'
                      }`}>
                        <span className={`text-sm font-semibold ${
                          isPauseStep ? 'text-yellow-400' : isStageChangeStep ? 'text-green-400' : isConditionStep ? 'text-purple-400' : 'text-[#e7922b]'
                        }`}>
                          {index + 1}
                        </span>
                      </div>

                      {/* Contenido */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className={`w-4 h-4 ${
                            isPauseStep ? 'text-yellow-400' : isStageChangeStep ? 'text-green-400' : isConditionStep ? 'text-purple-400' : 'text-[#e7922b]'
                          }`} />
                          <span className="text-sm font-semibold text-neutral-200">
                            {isPauseStep ? 'Pausa' : isStageChangeStep ? 'Cambiar Etapa' : isConditionStep ? 'Condición' : (MESSAGE_TYPE_LABELS[message.message_type] || 'Mensaje')}
                          </span>
                          {/* Mostrar información de pausa - FASE 2: SUBFASE 2.2 */}
                          {message.pause_type === 'fixed_delay' && message.delay_hours_from_previous > 0 && (
                            <div className="flex items-center gap-1 text-xs text-neutral-400">
                              <Clock className="w-3 h-3" />
                              <span>+{message.delay_hours_from_previous}h</span>
                            </div>
                          )}
                          {message.pause_type === 'until_message' && (
                            <div className="flex items-center gap-1 text-xs text-blue-400">
                              <MessageSquare className="w-3 h-3" />
                              <span>Esperar respuesta</span>
                            </div>
                          )}
                          {message.pause_type === 'until_days_without_response' && (
                            <div className="flex items-center gap-1 text-xs text-orange-400">
                              <Calendar className="w-3 h-3" />
                              <span>{message.days_without_response || 'X'} días sin respuesta</span>
                            </div>
                          )}
                          {/* Indicador de condición - FASE 3: SUBFASE 3.2 */}
                          {message.condition_type === 'if_responded' && (
                            <div className="flex items-center gap-1 text-xs text-green-400">
                              <CheckCircle className="w-3 h-3" />
                              <span>Solo si respondió</span>
                            </div>
                          )}
                          {message.condition_type === 'if_not_responded' && (
                            <div className="flex items-center gap-1 text-xs text-red-400">
                              <XCircle className="w-3 h-3" />
                              <span>Solo si NO respondió</span>
                            </div>
                          )}
                        </div>

                        {/* FASE 3: Mostrar contenido según tipo de paso */}
                        {isPauseStep || isDelayMessage ? (() => {
                          // Mostrar información de pausa
                          const totalHours = message.delay_hours_from_previous || 0;
                          const hours = Math.floor(totalHours);
                          const minutes = Math.round((totalHours - hours) * 60);
                          const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                          
                          if (message.pause_type === 'fixed_delay' && totalHours > 0) {
                            return (
                              <div className="flex items-center gap-2 text-sm text-neutral-300">
                                <Clock className="w-4 h-4 text-yellow-400" />
                                <span>Pausa de {formattedTime} ({totalHours.toFixed(2)} horas)</span>
                              </div>
                            );
                          } else if (message.pause_type === 'until_message') {
                            return (
                              <div className="flex items-center gap-2 text-sm text-neutral-300">
                                <MessageSquare className="w-4 h-4 text-blue-400" />
                                <span>Esperar hasta recibir mensaje del cliente</span>
                              </div>
                            );
                          } else if (message.pause_type === 'until_days_without_response') {
                            return (
                              <div className="flex items-center gap-2 text-sm text-neutral-300">
                                <Calendar className="w-4 h-4 text-orange-400" />
                                <span>Esperar {message.days_without_response || 'X'} días sin respuesta</span>
                              </div>
                            );
                          } else {
                            return (
                              <div className="flex items-center gap-2 text-sm text-neutral-400 italic">
                                <Pause className="w-4 h-4" />
                                <span>Pausa configurada</span>
                              </div>
                            );
                          }
                        })() : isStageChangeStep ? (
                          <div className="flex items-center gap-2 text-sm text-neutral-300">
                            <ArrowRightCircle className="w-4 h-4 text-green-400" />
                            <span>Cambiar a etapa: <strong>{message.target_stage_name || 'Sin especificar'}</strong></span>
                          </div>
                        ) : isConditionStep ? (
                          <div className="space-y-2 text-sm text-neutral-300">
                            <div className="flex items-center gap-2">
                              <GitBranch className="w-4 h-4 text-purple-400" />
                              <span>
                                {message.condition_type === 'if_message_contains' && 'Si mensaje contiene keywords'}
                                {message.condition_type === 'if_responded' && 'Si el cliente respondió'}
                                {message.condition_type === 'if_not_responded' && 'Si el cliente NO respondió'}
                              </span>
                            </div>
                            {message.condition_keywords && message.condition_keywords.keywords && (
                              <div className="ml-6 flex flex-wrap gap-1">
                                {message.condition_keywords.keywords.map((kw, idx) => (
                                  <span key={idx} className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">
                                    {kw}
                                  </span>
                                ))}
                              </div>
                            )}
                            {(message.next_message_if_true || message.next_message_if_false) && (
                              <div className="ml-6 text-xs text-neutral-400">
                                {message.next_message_if_true && '✅ Verdadero → Paso seleccionado'}
                                {message.next_message_if_false && '❌ Falso → Paso seleccionado'}
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-neutral-300 mb-2">
                            {getMessagePreview(message)}
                          </p>
                        )}

                        {message.media_size_kb && (
                          <p className="text-xs text-neutral-500">
                            Tamaño: {message.media_size_kb} KB
                          </p>
                        )}
                      </div>

                      {/* Acciones */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleMoveUp(message)}
                          disabled={!canMoveUp}
                          className={`p-1.5 rounded ${
                            canMoveUp
                              ? 'bg-neutral-700 hover:bg-neutral-600 text-neutral-200'
                              : 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
                          } transition`}
                          title="Mover arriba"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleMoveDown(message)}
                          disabled={!canMoveDown}
                          className={`p-1.5 rounded ${
                            canMoveDown
                              ? 'bg-neutral-700 hover:bg-neutral-600 text-neutral-200'
                              : 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
                          } transition`}
                          title="Mover abajo"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditMessage(message)}
                          className="p-1.5 rounded bg-neutral-700 hover:bg-neutral-600 text-neutral-200 transition"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(message)}
                          className="p-1.5 rounded bg-red-600/20 hover:bg-red-600/30 text-red-400 transition"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-neutral-800 flex justify-between items-center">
          <div className="text-sm text-neutral-400">
            {messages.length} paso{messages.length !== 1 ? 's' : ''} en el flujo
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg transition"
            >
              Cerrar
            </button>
            <button
              onClick={handleAddStep}
              className="px-4 py-2 bg-[#e7922b] text-[#1a2430] font-semibold rounded-lg hover:bg-[#d8821b] transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Agregar Paso
            </button>
          </div>
        </div>
      </div>

      {/* Modal de formulario de mensaje */}
      {showMessageForm && (
        <SequenceMessageForm
          message={editingMessage}
          availableMessages={messages} // FASE 4: SUBFASE 4.2 - Pasar mensajes disponibles para ramificaciones
          accountId={sequence?.account_id || null} // FASE 3: SUBFASE 3.2 - Pasar accountId para cargar templates
          onSave={handleSaveMessage}
          onCancel={() => {
            setShowMessageForm(false);
            setEditingMessage(null);
          }}
        />
      )}

      {/* Modal de confirmación de eliminación */}
      {deleteConfirm && (
        <ConfirmModal
          isOpen={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={handleDeleteMessage}
          title="Eliminar Mensaje"
          message="¿Estás seguro de que deseas eliminar este mensaje de la secuencia?"
          confirmText="Eliminar"
          cancelText="Cancelar"
          confirmColor="red"
        />
      )}

      {/* FASE 2: Selector de tipo de paso */}
      <StepTypeSelector
        isOpen={showStepTypeSelector}
        onClose={() => setShowStepTypeSelector(false)}
        onSelect={handleStepTypeSelected}
      />

      {/* FASE 3: Formulario de pausa independiente */}
      {showPauseForm && (
        <PauseStepForm
          pause={editingPause}
          onSave={handleSavePause}
          onCancel={() => {
            setShowPauseForm(false);
            setEditingPause(null);
          }}
        />
      )}

      {/* FASE 4: Formulario de cambio de etapa */}
      {showStageChangeForm && (
        <StageChangeStepForm
          stageChange={editingStageChange}
          sequence={sequence}
          onSave={handleSaveStageChange}
          onCancel={() => {
            setShowStageChangeForm(false);
            setEditingStageChange(null);
          }}
        />
      )}

      {/* Formulario de Condición */}
      {showConditionForm && (
        <ConditionStepForm
          condition={editingCondition}
          availableSteps={messages}
          onSave={handleSaveCondition}
          onCancel={() => {
            setShowConditionForm(false);
            setEditingCondition(null);
          }}
        />
      )}
    </div>
  );
}

