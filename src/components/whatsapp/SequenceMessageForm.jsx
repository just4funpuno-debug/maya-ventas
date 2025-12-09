/**
 * Formulario para agregar/editar un mensaje de secuencia
 * FASE 4: SUBFASE 4.1 - Formulario de Mensaje de Secuencia
 * 
 * Permite configurar tipo, contenido y validar tamaños de media
 * Las pausas se agregan como pasos independientes usando "Agregar Paso" → "Pausa"
 */

import React, { useState, useEffect } from 'react';
import { X, Upload, Image, Video, Music, FileText, Send, AlertCircle, CheckCircle, XCircle, Search, Plus, Trash2, FileCode } from 'lucide-react';
import { useToast } from '../ToastProvider';
import { uploadMediaToWhatsAppStorage } from '../../services/whatsapp/storage';
import { getTemplates } from '../../services/whatsapp/templates';

const MESSAGE_TYPES = [
  { value: 'text', label: 'Texto', icon: Send },
  { value: 'image', label: 'Imagen', icon: Image },
  { value: 'video', label: 'Video', icon: Video },
  { value: 'audio', label: 'Audio', icon: Music },
  { value: 'document', label: 'Documento', icon: FileText }
];

const MAX_SIZES = {
  image: 300, // KB
  video: 10240, // KB (10 MB)
  audio: 10240, // KB (10 MB)
  document: 10240 // KB (10 MB)
};

export default function SequenceMessageForm({ message = null, availableMessages = [], accountId = null, onSave, onCancel }) {
  const toast = useToast();
  const [messageType, setMessageType] = useState('text');
  const [contentText, setContentText] = useState('');
  const [caption, setCaption] = useState('');
  const [conditionType, setConditionType] = useState('none'); // FASE 3: SUBFASE 3.2
  const [nextMessageIfTrue, setNextMessageIfTrue] = useState(null); // FASE 4: SUBFASE 4.2
  const [nextMessageIfFalse, setNextMessageIfFalse] = useState(null); // FASE 4: SUBFASE 4.2
  // FASE 1: SUBFASE 3.1 - Palabras clave para condiciones
  const [keywords, setKeywords] = useState([]); // Array de palabras clave
  const [currentKeyword, setCurrentKeyword] = useState(''); // Input temporal
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState({});
  
  // FASE 3: SUBFASE 3.2 - Templates
  const [useTemplate, setUseTemplate] = useState(false); // Toggle entre template y mensaje personalizado
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // FASE 3: SUBFASE 3.2 - Cargar templates cuando se abre el formulario
  useEffect(() => {
    const loadTemplates = async () => {
      if (!accountId) return;
      
      try {
        setLoadingTemplates(true);
        const { data, error } = await getTemplates(accountId, null, null, 'approved'); // Solo templates aprobados
        
        if (error) {
          console.error('[SequenceMessageForm] Error cargando templates:', error);
          return;
        }
        
        setTemplates(data || []);
      } catch (err) {
        console.error('[SequenceMessageForm] Error cargando templates:', err);
      } finally {
        setLoadingTemplates(false);
      }
    };
    
    loadTemplates();
  }, [accountId]);

  // Si es edición, cargar datos del mensaje
  useEffect(() => {
    if (message) {
      // FASE 3: SUBFASE 3.2 - Verificar si usa template
      const hasTemplate = !!message.template_id;
      setUseTemplate(hasTemplate);
      setSelectedTemplateId(message.template_id || null);
      
      setMessageType(message.message_type || 'text');
      setContentText(message.content_text || '');
      setCaption(message.caption || '');
      const loadedConditionType = message.condition_type || 'none';
      setConditionType(loadedConditionType); // FASE 3: SUBFASE 3.2
      setNextMessageIfTrue(message.next_message_if_true || null); // FASE 4: SUBFASE 4.2
      setNextMessageIfFalse(message.next_message_if_false || null); // FASE 4: SUBFASE 4.2
      // FASE 1: SUBFASE 3.1 - Cargar keywords si existen
      if (message.condition_keywords && message.condition_keywords.keywords) {
        setKeywords(message.condition_keywords.keywords || []);
      } else {
        setKeywords([]);
      }
      if (message.media_url) {
        setMediaPreview(message.media_url);
      }
    } else {
      // Resetear todo si no hay mensaje
      setUseTemplate(false);
      setSelectedTemplateId(null);
      setKeywords([]);
      setCurrentKeyword('');
    }
  }, [message]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamaño según tipo
    const fileSizeKB = file.size / 1024;
    const maxSize = MAX_SIZES[messageType];
    
    if (maxSize && fileSizeKB > maxSize) {
      setErrors({
        media: `El archivo es demasiado grande. Máximo: ${maxSize} KB (${(maxSize / 1024).toFixed(1)} MB)`
      });
      return;
    }

    setMediaFile(file);
    setErrors({});

    // Crear preview
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setMediaPreview(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setMediaPreview(null);
    }
  };

  const handleSubmit = async () => {
    const newErrors = {};

    // FASE 3: SUBFASE 3.2 - Validar template si se usa
    if (useTemplate) {
      if (!selectedTemplateId) {
        newErrors.template = 'Debes seleccionar un template';
      }
    } else {
      // Validar según tipo solo si no se usa template
      if (messageType === 'text') {
        if (!contentText.trim()) {
          newErrors.contentText = 'El texto es requerido';
        }
      } else {
        if (!mediaFile && !message?.media_url) {
          newErrors.media = 'Debes seleccionar un archivo de media';
        }
      }
    }

    // FASE 1: SUBFASE 3.1 - Validar keywords si condition_type es 'if_message_contains'
    if (conditionType === 'if_message_contains') {
      if (!keywords || keywords.length === 0) {
        newErrors.keywords = 'Debes agregar al menos una palabra clave';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setUploading(true);

      let mediaUrl = message?.media_url || null;
      let mediaFilename = message?.media_filename || null;
      let mediaSizeKB = message?.media_size_kb || null;

      // Si hay un archivo nuevo, subirlo
      if (mediaFile) {
        const uploadResult = await uploadMediaToWhatsAppStorage(mediaFile, messageType);
        mediaUrl = uploadResult.url;
        mediaFilename = mediaFile.name;
        mediaSizeKB = Math.round(mediaFile.size / 1024);
      }

      // Preparar datos del mensaje
      const messageData = {
        step_type: 'message', // FASE 3: Siempre 'message' para este formulario
        // FASE 3: SUBFASE 3.2 - Si se usa template, no enviar campos de contenido personalizado
        template_id: useTemplate ? selectedTemplateId : null,
        message_type: useTemplate ? null : messageType, // Si usa template, message_type puede ser null
        content_text: useTemplate ? null : (messageType === 'text' ? contentText.trim() : null),
        media_url: useTemplate ? null : mediaUrl,
        media_filename: useTemplate ? null : mediaFilename,
        media_size_kb: useTemplate ? null : mediaSizeKB,
        caption: useTemplate ? null : ((messageType === 'image' || messageType === 'video') && caption.trim()
          ? caption.trim()
          : null),
        delay_hours_from_previous: 0, // Los mensajes no tienen delay (las pausas son pasos independientes)
        pause_type: null, // Los mensajes no tienen pause_type
        days_without_response: null, // Los mensajes no usan days_without_response
        condition_type: conditionType, // FASE 3: SUBFASE 3.2
        next_message_if_true: conditionType !== 'none' && nextMessageIfTrue ? nextMessageIfTrue : null, // FASE 4: SUBFASE 4.2
        next_message_if_false: conditionType !== 'none' && nextMessageIfFalse ? nextMessageIfFalse : null, // FASE 4: SUBFASE 4.2
        // FASE 1: SUBFASE 3.1 - Palabras clave para condiciones
        condition_keywords: conditionType === 'if_message_contains' && keywords.length > 0 
          ? {
              keywords: keywords.filter(kw => kw.trim().length > 0),
              match_type: 'any', // OR por defecto
              case_sensitive: false // Siempre ignorar mayúsculas/tildes
            }
          : null
      };

      onSave(messageData);
    } catch (err) {
      console.error('[SequenceMessageForm] Error guardando:', err);
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'No se pudo guardar el mensaje: ' + (err.message || 'Error desconocido')
      });
    } finally {
      setUploading(false);
    }
  };

  // FASE 1: SUBFASE 3.1 - Manejar agregar keyword
  const handleAddKeyword = () => {
    const trimmed = currentKeyword.trim();
    if (!trimmed) return;

    // Evitar duplicados (case-insensitive)
    const normalized = trimmed.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const isDuplicate = keywords.some(kw => 
      kw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === normalized
    );

    if (isDuplicate) {
      toast.push({
        type: 'error',
        title: 'Palabra duplicada',
        message: `"${trimmed}" ya está en la lista`
      });
      setCurrentKeyword('');
      return;
    }

    setKeywords([...keywords, trimmed]);
    setCurrentKeyword('');
    setErrors({ ...errors, keywords: null });
  };

  // FASE 1: SUBFASE 3.1 - Manejar eliminar keyword
  const handleRemoveKeyword = (index) => {
    setKeywords(keywords.filter((_, i) => i !== index));
    setErrors({ ...errors, keywords: null });
  };

  const handleTypeChange = (newType) => {
    setMessageType(newType);
    setMediaFile(null);
    setMediaPreview(null);
    setErrors({});
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-[#0f171e] border border-neutral-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-neutral-200">
            {message ? 'Editar Mensaje' : 'Nuevo Mensaje'}
          </h3>
          <button
            onClick={onCancel}
            className="text-neutral-400 hover:text-neutral-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* FASE 3: SUBFASE 3.2 - Selector: Template vs Mensaje Personalizado */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Tipo de Contenido
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setUseTemplate(false);
                  setSelectedTemplateId(null);
                  setErrors({ ...errors, template: null });
                }}
                className={`p-4 rounded-lg border-2 transition ${
                  !useTemplate
                    ? 'border-[#e7922b] bg-[#e7922b]/10 text-[#e7922b]'
                    : 'border-neutral-700 bg-neutral-800 text-neutral-400 hover:border-neutral-600'
                }`}
              >
                <Send className="w-5 h-5 mx-auto mb-2" />
                <div className="text-sm font-medium">Mensaje Personalizado</div>
                <div className="text-xs text-neutral-500 mt-1">Crea tu propio mensaje</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setUseTemplate(true);
                  setErrors({ ...errors, contentText: null, media: null });
                }}
                disabled={!accountId || templates.length === 0}
                className={`p-4 rounded-lg border-2 transition ${
                  useTemplate
                    ? 'border-[#e7922b] bg-[#e7922b]/10 text-[#e7922b]'
                    : 'border-neutral-700 bg-neutral-800 text-neutral-400 hover:border-neutral-600'
                } ${(!accountId || templates.length === 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <FileCode className="w-5 h-5 mx-auto mb-2" />
                <div className="text-sm font-medium">Template de WhatsApp</div>
                <div className="text-xs text-neutral-500 mt-1">
                  {!accountId 
                    ? 'No hay cuenta configurada' 
                    : templates.length === 0 
                    ? 'No hay templates aprobados' 
                    : `${templates.length} template${templates.length !== 1 ? 's' : ''} disponible${templates.length !== 1 ? 's' : ''}`
                  }
                </div>
              </button>
            </div>
          </div>

          {/* FASE 3: SUBFASE 3.2 - Selector de Template */}
          {useTemplate && (
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Seleccionar Template <span className="text-red-400">*</span>
              </label>
              {loadingTemplates ? (
                <div className="text-center py-4 text-neutral-400">
                  Cargando templates...
                </div>
              ) : templates.length === 0 ? (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-sm text-yellow-400">
                  No hay templates aprobados disponibles. Crea y aprueba templates en la sección de Templates.
                </div>
              ) : (
                <select
                  value={selectedTemplateId || ''}
                  onChange={(e) => {
                    setSelectedTemplateId(e.target.value || null);
                    if (errors.template) {
                      setErrors({ ...errors, template: null });
                    }
                  }}
                  className={`w-full bg-neutral-800 border ${
                    errors.template ? 'border-red-500' : 'border-neutral-700'
                  } rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#e7922b]`}
                >
                  <option value="">Selecciona un template...</option>
                  {templates.map(template => (
                    <option key={template.id} value={template.id}>
                      {template.name} ({template.category})
                    </option>
                  ))}
                </select>
              )}
              {errors.template && (
                <p className="text-xs text-red-400 mt-1">{errors.template}</p>
              )}
              {selectedTemplateId && (
                <div className="mt-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <p className="text-xs text-green-400">
                    ✓ Template seleccionado. El mensaje se enviará usando este template de WhatsApp Business API.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Tipo de mensaje - Solo si no usa template */}
          {!useTemplate && (
            <>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Tipo de Mensaje <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {MESSAGE_TYPES.map(type => {
                    const Icon = type.icon;
                    const isSelected = messageType === type.value;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => handleTypeChange(type.value)}
                        className={`p-3 rounded-lg border-2 transition ${
                          isSelected
                            ? 'border-[#e7922b] bg-[#e7922b]/10 text-[#e7922b]'
                            : 'border-neutral-700 bg-neutral-800 text-neutral-400 hover:border-neutral-600'
                        }`}
                      >
                        <Icon className="w-5 h-5 mx-auto mb-1" />
                        <div className="text-xs font-medium">{type.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Contenido de texto */}
              {messageType === 'text' && (
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Texto del Mensaje <span className="text-red-400">*</span>
              </label>
              <textarea
                value={contentText}
                onChange={(e) => {
                  setContentText(e.target.value);
                  if (errors.contentText) {
                    setErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors.contentText;
                      return newErrors;
                    });
                  }
                }}
                rows={6}
                className={`w-full bg-neutral-800 border ${
                  errors.contentText ? 'border-red-500' : 'border-neutral-700'
                } rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#e7922b] resize-none`}
                placeholder="Escribe el mensaje de texto..."
              />
              {errors.contentText && (
                <p className="text-xs text-red-400 mt-1">{errors.contentText}</p>
              )}
            </div>
          )}

          {/* Media */}
          {messageType !== 'text' && (
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Archivo {MESSAGE_TYPES.find(t => t.value === messageType)?.label}{' '}
                <span className="text-red-400">*</span>
              </label>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <label className="flex-1 cursor-pointer">
                    <input
                      type="file"
                      onChange={handleFileChange}
                      accept={
                        messageType === 'image'
                          ? 'image/*'
                          : messageType === 'video'
                          ? 'video/*'
                          : messageType === 'audio'
                          ? 'audio/*'
                          : '*/*'
                      }
                      className="hidden"
                    />
                    <div className="flex items-center justify-center gap-2 px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg hover:border-[#e7922b] transition">
                      <Upload className="w-4 h-4 text-neutral-400" />
                      <span className="text-sm text-neutral-300">
                        {mediaFile ? mediaFile.name : 'Seleccionar archivo'}
                      </span>
                    </div>
                  </label>
                </div>

                {errors.media && (
                  <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.media}</span>
                  </div>
                )}

                {mediaFile && (
                  <div className="text-xs text-neutral-400">
                    Tamaño: {(mediaFile.size / 1024).toFixed(1)} KB / Máximo: {MAX_SIZES[messageType]} KB
                  </div>
                )}

                {mediaPreview && (
                  <div className="border border-neutral-700 rounded-lg p-2 bg-neutral-800/50">
                    {messageType === 'image' ? (
                      <img
                        src={mediaPreview}
                        alt="Preview"
                        className="max-w-full max-h-48 mx-auto rounded"
                      />
                    ) : (
                      <div className="text-center py-4 text-neutral-400">
                        {message?.media_filename || mediaFile?.name || 'Archivo seleccionado'}
                      </div>
                    )}
                  </div>
                )}

                {/* Mostrar media existente si es edición */}
                {message?.media_url && !mediaFile && (
                  <div className="border border-neutral-700 rounded-lg p-2 bg-neutral-800/50">
                    {messageType === 'image' ? (
                      <img
                        src={message.media_url}
                        alt="Media actual"
                        className="max-w-full max-h-48 mx-auto rounded"
                      />
                    ) : (
                      <div className="text-center py-4 text-neutral-400">
                        {message.media_filename || 'Archivo actual'}
                      </div>
                    )}
                    <p className="text-xs text-neutral-500 text-center mt-2">
                      Archivo actual (selecciona uno nuevo para reemplazar)
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

              {/* Caption (solo para imagen y video) */}
              {(messageType === 'image' || messageType === 'video') && (
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Caption (opcional)
                  </label>
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    rows={3}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#e7922b] resize-none"
                    placeholder="Texto que aparecerá junto al media..."
                  />
                </div>
              )}
            </>
          )}

          {/* Condición - FASE 3: SUBFASE 3.2 */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Condición de Envío
            </label>
            <select
              value={conditionType}
              onChange={(e) => {
                const newConditionType = e.target.value;
                setConditionType(newConditionType);
                // Si se cambia a 'none', limpiar ramificaciones
                if (newConditionType === 'none') {
                  setNextMessageIfTrue(null);
                  setNextMessageIfFalse(null);
                }
                // FASE 1: SUBFASE 3.1 - Limpiar keywords si no es 'if_message_contains'
                if (newConditionType !== 'if_message_contains') {
                  setKeywords([]);
                  setCurrentKeyword('');
                  setErrors({ ...errors, keywords: null });
                }
              }}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#e7922b]"
            >
              <option value="none">Siempre enviar (sin condición)</option>
              <option value="if_responded">Solo si el cliente respondió</option>
              <option value="if_not_responded">Solo si el cliente NO respondió</option>
              <option value="if_message_contains">Si el mensaje contiene palabras clave</option>
            </select>
            <div className="mt-2 space-y-1">
              {conditionType === 'none' && (
                <p className="text-xs text-neutral-500 flex items-center gap-1">
                  <Send className="w-3 h-3" />
                  El mensaje se enviará siempre, sin importar si el cliente respondió o no
                </p>
              )}
              {conditionType === 'if_responded' && (
                <p className="text-xs text-neutral-500 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  El mensaje se enviará solo si el cliente respondió después de iniciar la secuencia
                </p>
              )}
              {conditionType === 'if_not_responded' && (
                <p className="text-xs text-neutral-500 flex items-center gap-1">
                  <XCircle className="w-3 h-3" />
                  El mensaje se enviará solo si el cliente NO ha respondido después de iniciar la secuencia
                </p>
              )}
              {conditionType === 'if_message_contains' && (
                <p className="text-xs text-neutral-500 flex items-center gap-1">
                  <Search className="w-3 h-3" />
                  El mensaje se enviará solo si el último mensaje del cliente contiene alguna de las palabras clave configuradas
                </p>
              )}
            </div>
          </div>

          {/* FASE 1: SUBFASE 3.1 - Configuración de palabras clave */}
          {conditionType === 'if_message_contains' && (
            <div className="space-y-3 border-t border-neutral-700 pt-4">
              <div className="flex items-center gap-2 mb-2">
                <Search className="w-4 h-4 text-[#e7922b]" />
                <h4 className="text-sm font-semibold text-neutral-200">Palabras Clave</h4>
              </div>
              <p className="text-xs text-neutral-400 mb-3">
                Agrega palabras clave que buscar en el último mensaje del cliente. El trigger se activará si el mensaje contiene <span className="text-[#e7922b] font-medium">cualquiera</span> de estas palabras (sin importar mayúsculas, minúsculas o tildes).
              </p>
              
              {/* Input para agregar keywords */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={currentKeyword}
                  onChange={(e) => setCurrentKeyword(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddKeyword();
                    }
                  }}
                  placeholder="Escribe una palabra clave y presiona Enter o +"
                  className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#e7922b]"
                />
                <button
                  type="button"
                  onClick={handleAddKeyword}
                  className="px-3 py-2 bg-[#e7922b] hover:bg-[#d8821b] text-[#1a2430] font-semibold rounded-lg transition flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Agregar
                </button>
              </div>

              {errors.keywords && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.keywords}
                </p>
              )}

              {/* Lista de keywords */}
              {keywords.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-neutral-400">Palabras clave configuradas:</p>
                  <div className="flex flex-wrap gap-2">
                    {keywords.map((keyword, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 bg-[#e7922b]/10 border border-[#e7922b]/30 rounded-lg px-3 py-1.5"
                      >
                        <span className="text-sm text-[#e7922b] font-medium">{keyword}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveKeyword(index)}
                          className="text-[#e7922b] hover:text-red-400 transition"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {keywords.length === 0 && (
                <p className="text-xs text-neutral-500 italic">
                  No hay palabras clave agregadas. Agrega al menos una para activar esta condición.
                </p>
              )}
            </div>
          )}

          {/* Ramificaciones - FASE 4: SUBFASE 4.2 */}
          {conditionType !== 'none' && (
            <div className="space-y-4 border-t border-neutral-700 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-6 bg-[#e7922b] rounded"></div>
                <h4 className="text-sm font-semibold text-neutral-200">Ramificaciones</h4>
              </div>
              <p className="text-xs text-neutral-400 mb-4">
                Si configuras ramificaciones, el flujo saltará al mensaje seleccionado según el resultado de la condición.
                Si no configuras ramificación, continuará con el siguiente mensaje en orden.
              </p>

              {/* Si condición es verdadera */}
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Si condición es <span className="text-green-400">verdadera</span>, ir a:
                </label>
                <select
                  value={nextMessageIfTrue || ''}
                  onChange={(e) => setNextMessageIfTrue(e.target.value || null)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#e7922b]"
                >
                  <option value="">Continuar secuencia normal (siguiente mensaje)</option>
                  {availableMessages
                    .filter(msg => !message || msg.id !== message.id) // Excluir el mensaje actual si es edición
                    .map(msg => (
                      <option key={msg.id} value={msg.id}>
                        Mensaje {msg.message_number || msg.order_position || 'N/A'}: {msg.content_text ? (msg.content_text.substring(0, 50) + (msg.content_text.length > 50 ? '...' : '')) : `[${msg.message_type}]`}
                      </option>
                    ))}
                </select>
                <p className="text-xs text-neutral-500 mt-1">
                  Mensaje al que saltar si la condición se cumple
                </p>
              </div>

              {/* Si condición es falsa */}
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Si condición es <span className="text-red-400">falsa</span>, ir a:
                </label>
                <select
                  value={nextMessageIfFalse || ''}
                  onChange={(e) => setNextMessageIfFalse(e.target.value || null)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#e7922b]"
                >
                  <option value="">Continuar secuencia normal (siguiente mensaje)</option>
                  {availableMessages
                    .filter(msg => !message || msg.id !== message.id) // Excluir el mensaje actual si es edición
                    .map(msg => (
                      <option key={msg.id} value={msg.id}>
                        Mensaje {msg.message_number || msg.order_position || 'N/A'}: {msg.content_text ? (msg.content_text.substring(0, 50) + (msg.content_text.length > 50 ? '...' : '')) : `[${msg.message_type}]`}
                      </option>
                    ))}
                </select>
                <p className="text-xs text-neutral-500 mt-1">
                  Mensaje al que saltar si la condición no se cumple
                </p>
              </div>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-2 pt-4">
            <button
              onClick={onCancel}
              disabled={uploading}
              className="flex-1 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg transition disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={uploading}
              className="flex-1 px-4 py-2 bg-[#e7922b] text-[#1a2430] font-semibold rounded-lg hover:bg-[#d8821b] transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#1a2430] border-t-transparent rounded-full animate-spin" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  {message ? 'Actualizar' : 'Agregar'} Mensaje
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


