/**
 * Modal para gestionar respuestas rápidas
 * FASE 2: SUBFASE 2.3 - UI - Gestor de Respuestas Rápidas
 */

import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Plus, X, Edit2, Trash2, Upload, FileImage, Music, Type } from 'lucide-react';
import { useToast } from '../ToastProvider';
import ConfirmModal from '../ConfirmModal';
import { AsyncButton } from '../AsyncButton';
import {
  getAllQuickReplies,
  createQuickReply,
  updateQuickReply,
  deleteQuickReply,
  uploadQuickReplyMedia
} from '../../services/whatsapp/quick-replies';

const REPLY_TYPES = [
  { value: 'text', label: 'Solo Texto', icon: Type },
  { value: 'image', label: 'Solo Imagen', icon: FileImage },
  { value: 'image_text', label: 'Imagen + Texto', icon: FileImage },
  { value: 'audio', label: 'Solo Audio', icon: Music },
  { value: 'audio_text', label: 'Audio + Texto', icon: Music }
];

export default function QuickReplyManager({ isOpen, onClose, accountId, productId }) {
  const toast = useToast();
  const [quickReplies, setQuickReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingReply, setEditingReply] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [formData, setFormData] = useState({
    trigger: '',
    type: 'text',
    content_text: '',
    media_path: null,
    media_type: null
  });
  const [formErrors, setFormErrors] = useState({});
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaPreview, setMediaPreview] = useState(null);
  const fileInputRef = useRef(null);

  // FASE 3 - SUBFASE 3.4: Cargar respuestas rápidas cuando se abre el modal o cambia productId
  useEffect(() => {
    if (isOpen && productId) {
      loadQuickReplies();
    }
  }, [isOpen, productId]);

  // Resetear formulario cuando se cierra el modal
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const loadQuickReplies = async () => {
    // FASE 3 - SUBFASE 3.4: Usar productId en lugar de solo accountId
    if (!productId) return;

    try {
      setLoading(true);
      // FASE 3 - SUBFASE 3.4: Pasar productId como primer parámetro, accountId como opcional
      const { data, error } = await getAllQuickReplies(productId, accountId || undefined);
      
      if (error) {
        throw error;
      }
      
      setQuickReplies(data || []);
    } catch (err) {
      console.error('[QuickReplyManager] Error cargando respuestas rápidas:', err);
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'No se pudieron cargar las respuestas rápidas: ' + (err.message || 'Error desconocido')
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      trigger: '',
      type: 'text',
      content_text: '',
      media_path: null,
      media_type: null
    });
    setFormErrors({});
    setEditingReply(null);
    setShowForm(false);
    setMediaPreview(null);
  };

  // Generar nombre automáticamente desde el trigger o el contenido del texto
  const generateName = () => {
    // Si hay contenido de texto, usar las primeras palabras (máximo 50 caracteres)
    if (formData.content_text && formData.content_text.trim()) {
      const text = formData.content_text.trim();
      if (text.length <= 50) {
        return text;
      }
      // Tomar primeras 50 caracteres y cortar en la última palabra completa
      const truncated = text.substring(0, 50);
      const lastSpace = truncated.lastIndexOf(' ');
      return lastSpace > 0 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
    }
    
    // Si no hay texto pero hay trigger, usar el trigger (sin el "/") capitalizado
    if (formData.trigger && formData.trigger.trim()) {
      const triggerWithoutSlash = formData.trigger.replace(/^\//, '').trim();
      if (triggerWithoutSlash) {
        // Capitalizar primera letra y reemplazar guiones/guiones bajos con espacios
        const formatted = triggerWithoutSlash
          .replace(/[-_]/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
        return formatted;
      }
    }
    
    // Fallback según tipo
    const typeLabel = REPLY_TYPES.find(t => t.value === formData.type)?.label || 'Respuesta';
    return `${typeLabel} Rápida`;
  };

  const handleCreate = () => {
    setEditingReply(null);
    resetForm();
    setShowForm(true);
  };

  const handleEdit = (reply) => {
    setEditingReply(reply);
    setFormData({
      trigger: reply.trigger,
      type: reply.type,
      content_text: reply.content_text || '',
      media_path: reply.media_path || null,
      media_type: reply.media_type || null
    });
    setFormErrors({});
    setShowForm(true);
    // Cargar preview de media si existe
    if (reply.media_path) {
      loadMediaPreview(reply.media_path, reply.media_type);
    }
  };

  const handleCancelForm = () => {
    resetForm();
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.trigger.trim()) {
      errors.trigger = 'El trigger es requerido';
    } else if (!formData.trigger.startsWith('/')) {
      errors.trigger = 'El trigger debe empezar con "/"';
    }
    
    if (!formData.type) {
      errors.type = 'El tipo es requerido';
    }
    
    // Validar campos según tipo
    if (['text', 'image_text', 'audio_text'].includes(formData.type) && !formData.content_text.trim()) {
      errors.content_text = 'El texto es requerido para este tipo';
    }
    
    if (['image', 'image_text', 'audio', 'audio_text'].includes(formData.type)) {
      if (!formData.media_path && !mediaPreview) {
        errors.media = 'El archivo de media es requerido para este tipo';
      }
      if (!formData.media_type) {
        errors.media_type = 'El tipo de media es requerido';
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const selectedType = formData.type;
    let mediaType = null;

    // Determinar tipo de media según el tipo de respuesta
    if (['image', 'image_text'].includes(selectedType)) {
      mediaType = 'image';
    } else if (['audio', 'audio_text'].includes(selectedType)) {
      mediaType = 'audio';
    }

    if (!mediaType) {
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'Tipo de media no válido para este tipo de respuesta'
      });
      return;
    }

    try {
      setUploadingMedia(true);
      
      // Subir archivo
      const { url, path, error } = await uploadQuickReplyMedia(file, mediaType);
      
      if (error) {
        throw error;
      }

      setFormData(prev => ({
        ...prev,
        media_path: path,
        media_type: mediaType
      }));

      // Crear preview
      if (mediaType === 'image') {
        setMediaPreview(url);
      } else {
        setMediaPreview({ type: 'audio', name: file.name });
      }

      toast.push({
        type: 'success',
        title: 'Éxito',
        message: 'Archivo subido correctamente'
      });
    } catch (err) {
      console.error('[QuickReplyManager] Error subiendo archivo:', err);
      toast.push({
        type: 'error',
        title: 'Error',
        message: err.message || 'Error al subir el archivo'
      });
    } finally {
      setUploadingMedia(false);
      // Limpiar input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const loadMediaPreview = async (mediaPath, mediaType) => {
    try {
      // Obtener URL pública desde Storage
      const { supabase } = await import('../../supabaseClient');
      const { data } = supabase.storage
        .from('whatsapp-media')
        .getPublicUrl(mediaPath);

      if (mediaType === 'image') {
        setMediaPreview(data?.publicUrl || null);
      } else {
        setMediaPreview({ type: 'audio', name: mediaPath.split('/').pop() });
      }
    } catch (err) {
      console.error('[QuickReplyManager] Error cargando preview:', err);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // Generar nombre automáticamente
      const name = generateName();
      const formDataWithName = {
        ...formData,
        name
      };
      
      let result;
      
      if (editingReply) {
        result = await updateQuickReply(editingReply.id, formDataWithName);
      } else {
        result = await createQuickReply(accountId, formDataWithName);
      }

      if (result.error) {
        throw result.error;
      }

      toast.push({
        type: 'success',
        title: 'Éxito',
        message: `Respuesta rápida ${editingReply ? 'actualizada' : 'creada'} correctamente`
      });
      
      await loadQuickReplies();
      handleCancelForm();
    } catch (err) {
      console.error('[QuickReplyManager] Error al guardar:', err);
      toast.push({
        type: 'error',
        title: 'Error',
        message: err.message || 'Error al guardar la respuesta rápida'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (replyId) => {
    setIsSubmitting(true);
    try {
      const { success, error } = await deleteQuickReply(replyId);
      
      if (error || !success) {
        throw error || new Error('Error al eliminar');
      }
      
      toast.push({
        type: 'success',
        title: 'Éxito',
        message: 'Respuesta rápida eliminada correctamente'
      });
      
      await loadQuickReplies();
      setDeleteConfirm(null);
    } catch (err) {
      console.error('[QuickReplyManager] Error eliminando:', err);
      toast.push({
        type: 'error',
        title: 'Error',
        message: err.message || 'No se pudo eliminar la respuesta rápida'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTypeChange = (newType) => {
    setFormData(prev => ({
      ...prev,
      type: newType,
      // Limpiar campos no aplicables
      content_text: ['text', 'image_text', 'audio_text'].includes(newType) ? prev.content_text : '',
      media_path: ['image', 'image_text', 'audio', 'audio_text'].includes(newType) ? prev.media_path : null,
      media_type: ['image', 'image_text', 'audio', 'audio_text'].includes(newType) ? prev.media_type : null
    }));
    setMediaPreview(null);
    setFormErrors({});
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Modal */}
        <div
          className="bg-neutral-900 rounded-lg border border-neutral-800 shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-neutral-800 flex-shrink-0">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#e7922b]" />
              <h2 className="text-lg font-semibold text-neutral-200">
                Gestionar Respuestas Rápidas
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-neutral-800 transition"
              disabled={isSubmitting}
            >
              <X className="w-5 h-5 text-neutral-400" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {!accountId ? (
              <div className="text-center py-12 text-neutral-400 text-sm">
                <p>Selecciona una cuenta WhatsApp primero</p>
              </div>
            ) : (
              <>
                {/* Botón crear - Primero */}
                <div className="mb-6">
                  <AsyncButton
                    onClick={handleCreate}
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#e7922b] text-white font-medium hover:bg-[#d6821b] transition disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Nueva Respuesta Rápida</span>
                  </AsyncButton>
                </div>

                {/* Formulario (si está visible) */}
                {showForm && (
                  <div className="mb-6 p-4 rounded-lg bg-neutral-800 border border-neutral-700">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-neutral-200">
                        {editingReply ? 'Editar Respuesta Rápida' : 'Nueva Respuesta Rápida'}
                      </h3>
                      <button
                        onClick={handleCancelForm}
                        className="p-1 rounded hover:bg-neutral-700 transition"
                        disabled={isSubmitting}
                      >
                        <X className="w-4 h-4 text-neutral-400" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      {/* Trigger */}
                      <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">
                          Trigger <span className="text-red-400">*</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-neutral-400">/</span>
                          <input
                            type="text"
                            value={formData.trigger.replace(/^\//, '')}
                            onChange={(e) => {
                              const value = e.target.value.replace(/^\//, ''); // Remover "/" si se agrega manualmente
                              setFormData(prev => ({ ...prev, trigger: '/' + value }));
                              if (formErrors.trigger) {
                                setFormErrors(prev => ({ ...prev, trigger: null }));
                              }
                            }}
                            placeholder="saludo"
                            disabled={isSubmitting}
                            className={`flex-1 px-3 py-2 rounded-lg bg-neutral-900 border ${
                              formErrors.trigger ? 'border-red-500' : 'border-neutral-700'
                            } text-neutral-200 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#e7922b] disabled:opacity-50`}
                          />
                          <span className="text-xs text-neutral-500">(ej: /saludo)</span>
                        </div>
                        {formErrors.trigger && (
                          <p className="text-xs text-red-400 mt-1">{formErrors.trigger}</p>
                        )}
                      </div>

                      {/* Tipo */}
                      <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">
                          Tipo <span className="text-red-400">*</span>
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                          {REPLY_TYPES.map(typeOption => {
                            const Icon = typeOption.icon;
                            const isSelected = formData.type === typeOption.value;
                            return (
                              <button
                                key={typeOption.value}
                                type="button"
                                onClick={() => handleTypeChange(typeOption.value)}
                                disabled={isSubmitting}
                                className={`p-3 rounded-lg border-2 transition ${
                                  isSelected
                                    ? 'border-[#e7922b] bg-[#e7922b]/10'
                                    : 'border-neutral-700 hover:border-neutral-600 bg-neutral-900'
                                } disabled:opacity-50`}
                              >
                                <Icon className={`w-5 h-5 mx-auto mb-1 ${isSelected ? 'text-[#e7922b]' : 'text-neutral-400'}`} />
                                <p className={`text-xs text-center ${isSelected ? 'text-[#e7922b] font-medium' : 'text-neutral-400'}`}>
                                  {typeOption.label}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                        {formErrors.type && (
                          <p className="text-xs text-red-400 mt-1">{formErrors.type}</p>
                        )}
                      </div>

                      {/* Texto (si aplica) */}
                      {['text', 'image_text', 'audio_text'].includes(formData.type) && (
                        <div>
                          <label className="block text-sm font-medium text-neutral-300 mb-2">
                            Texto <span className="text-red-400">*</span>
                          </label>
                          <textarea
                            value={formData.content_text}
                            onChange={(e) => {
                              setFormData(prev => ({ ...prev, content_text: e.target.value }));
                              if (formErrors.content_text) {
                                setFormErrors(prev => ({ ...prev, content_text: null }));
                              }
                            }}
                            placeholder="Escribe el texto de la respuesta..."
                            rows={4}
                            disabled={isSubmitting}
                            className={`w-full px-3 py-2 rounded-lg bg-neutral-900 border ${
                              formErrors.content_text ? 'border-red-500' : 'border-neutral-700'
                            } text-neutral-200 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#e7922b] disabled:opacity-50 resize-none`}
                          />
                          {formErrors.content_text && (
                            <p className="text-xs text-red-400 mt-1">{formErrors.content_text}</p>
                          )}
                        </div>
                      )}

                      {/* Media (si aplica) */}
                      {['image', 'image_text', 'audio', 'audio_text'].includes(formData.type) && (
                        <div>
                          <label className="block text-sm font-medium text-neutral-300 mb-2">
                            Archivo de Media <span className="text-red-400">*</span>
                          </label>
                          
                          {/* Preview */}
                          {mediaPreview && (
                            <div className="mb-3 p-3 rounded-lg bg-neutral-900 border border-neutral-700">
                              {formData.media_type === 'image' && typeof mediaPreview === 'string' ? (
                                <img
                                  src={mediaPreview}
                                  alt="Preview"
                                  className="max-w-full max-h-48 rounded-lg mx-auto"
                                />
                              ) : (
                                <div className="flex items-center gap-2 text-neutral-400">
                                  <Music className="w-5 h-5" />
                                  <span className="text-sm">
                                    {typeof mediaPreview === 'object' ? mediaPreview.name : 'Archivo de audio'}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept={formData.media_type === 'image' ? 'image/*' : 'audio/*'}
                              onChange={handleFileSelect}
                              disabled={isSubmitting || uploadingMedia}
                              className="hidden"
                              id="media-upload"
                            />
                            <label
                              htmlFor="media-upload"
                              className={`flex items-center gap-2 px-4 py-2 rounded-lg border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 transition cursor-pointer disabled:opacity-50 ${
                                uploadingMedia ? 'cursor-wait' : ''
                              }`}
                            >
                              <Upload className="w-4 h-4 text-neutral-400" />
                              <span className="text-sm text-neutral-200">
                                {uploadingMedia ? 'Subiendo...' : formData.media_path ? 'Cambiar archivo' : 'Subir archivo'}
                              </span>
                            </label>
                            {formData.media_path && (
                              <span className="text-xs text-neutral-400">
                                {formData.media_path.split('/').pop()}
                              </span>
                            )}
                          </div>
                          {formErrors.media && (
                            <p className="text-xs text-red-400 mt-1">{formErrors.media}</p>
                          )}
                          <p className="text-xs text-neutral-500 mt-1">
                            {formData.media_type === 'image' 
                              ? 'Máximo 5 MB. Formatos: JPG, PNG, WEBP, GIF'
                              : 'Máximo 16 MB. Formatos: MP3, OGG, WAV, AAC'}
                          </p>
                        </div>
                      )}

                      {/* Botones */}
                      <div className="flex gap-2 justify-end pt-2">
                        <button
                          onClick={handleCancelForm}
                          disabled={isSubmitting}
                          className="px-4 py-2 rounded-lg bg-neutral-700 text-neutral-200 hover:bg-neutral-600 transition disabled:opacity-50"
                        >
                          Cancelar
                        </button>
                        <AsyncButton
                          onClick={handleSubmit}
                          disabled={isSubmitting}
                          className="px-4 py-2 rounded-lg bg-[#e7922b] text-white font-medium hover:bg-[#d6821b] transition disabled:opacity-50"
                        >
                          {editingReply ? 'Actualizar' : 'Crear'}
                        </AsyncButton>
                      </div>
                    </div>
                  </div>
                )}

                {/* Lista de respuestas rápidas */}
                {loading ? (
                  <div className="text-center py-12 text-neutral-400 text-sm">
                    <p>Cargando respuestas rápidas...</p>
                  </div>
                ) : quickReplies.length === 0 ? (
                  <div className="text-center py-12 text-neutral-400 text-sm">
                    <MessageSquare className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
                    <p>No hay respuestas rápidas creadas</p>
                    <p className="text-xs mt-1 text-neutral-500">
                      Crea tu primera respuesta rápida para comenzar
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {quickReplies.map(reply => {
                      const TypeIcon = REPLY_TYPES.find(t => t.value === reply.type)?.icon || Type;
                      return (
                        <div
                          key={reply.id}
                          className="p-4 rounded-lg bg-neutral-800 border border-neutral-700 hover:border-neutral-600 transition"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <TypeIcon className="w-4 h-4 text-[#e7922b] flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-sm font-semibold text-neutral-200 truncate">
                                    {reply.name}
                                  </h3>
                                  <p className="text-xs text-[#e7922b] font-mono">
                                    {reply.trigger}
                                  </p>
                                </div>
                              </div>
                              <p className="text-xs text-neutral-500 mb-2">
                                Tipo: {REPLY_TYPES.find(t => t.value === reply.type)?.label || reply.type}
                              </p>
                              {reply.content_text && (
                                <p className="text-xs text-neutral-400 line-clamp-2 mb-2">
                                  {reply.content_text}
                                </p>
                              )}
                              {reply.media_path && (
                                <p className="text-xs text-neutral-500">
                                  Media: {reply.media_path.split('/').pop()}
                                </p>
                              )}
                              <p className="text-xs text-neutral-500 mt-1">
                                Creado: {new Date(reply.created_at).toLocaleDateString('es-BO')}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                onClick={() => handleEdit(reply)}
                                disabled={isSubmitting}
                                className="p-2 rounded-lg hover:bg-neutral-700 transition disabled:opacity-50"
                                title="Editar respuesta rápida"
                              >
                                <Edit2 className="w-4 h-4 text-neutral-400" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(reply)}
                                disabled={isSubmitting}
                                className="p-2 rounded-lg hover:bg-neutral-700 transition disabled:opacity-50"
                                title="Eliminar respuesta rápida"
                              >
                                <Trash2 className="w-4 h-4 text-red-400" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal de confirmación de eliminación */}
      {deleteConfirm && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={() => handleDelete(deleteConfirm.id)}
          title="Eliminar Respuesta Rápida"
          message={`¿Estás seguro de que deseas eliminar la respuesta rápida "${deleteConfirm.name}" (${deleteConfirm.trigger})? Esta acción no se puede deshacer.`}
          confirmText="Eliminar"
          cancelText="Cancelar"
          confirmClass="bg-red-600 hover:bg-red-700"
          isLoading={isSubmitting}
        />
      )}
    </>
  );
}

