/**
 * Formulario para crear/editar Template de WhatsApp
 * FASE 1 - SUBFASE 1.3: Formulario Básico
 */

import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, AlertCircle, FileText, Hash, Upload, Image, Video, File } from 'lucide-react';
import { useToast } from '../ToastProvider';
import { supabase } from '../../supabaseClient';

export default function TemplateForm({ template = null, accountId, productId, onSave, onCancel }) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('MARKETING');
  const [language, setLanguage] = useState('es');
  const [headerType, setHeaderType] = useState('NONE');
  const [headerText, setHeaderText] = useState('');
  const [headerMediaUrl, setHeaderMediaUrl] = useState('');
  const [headerMediaFile, setHeaderMediaFile] = useState(null);
  const [uploadingHeaderMedia, setUploadingHeaderMedia] = useState(false);
  const [headerMediaPreview, setHeaderMediaPreview] = useState(null);
  const headerFileInputRef = useRef(null);
  const [bodyText, setBodyText] = useState('');
  const [footerText, setFooterText] = useState('');
  const [buttons, setButtons] = useState([]);
  const [currentButtonText, setCurrentButtonText] = useState('');
  const [errors, setErrors] = useState({});

  // Si es edición, cargar datos del template
  useEffect(() => {
    if (template) {
      setName(template.name || '');
      setCategory(template.category || 'MARKETING');
      setLanguage(template.language || 'es');
      setHeaderType(template.header_type || 'NONE');
      setHeaderText(template.header_text || '');
      setHeaderMediaUrl(template.header_media_url || '');
      setBodyText(template.body_text || '');
      setFooterText(template.footer_text || '');
      setButtons(template.buttons || []);
      
      // Cargar preview si hay media
      if (template.header_media_url && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(template.header_type)) {
        setHeaderMediaPreview(template.header_media_url);
      }
    }
  }, [template]);


  // Función para manejar subida de archivo del encabezado
  const handleHeaderFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tamaño según tipo
    const maxSize = headerType === 'IMAGE' ? 1 * 1024 * 1024 : 5 * 1024 * 1024; // 1MB para imágenes, 5MB para otros
    if (file.size > maxSize) {
      toast.push({
        type: 'error',
        title: 'Archivo muy grande',
        message: `El archivo no puede exceder ${maxSize / (1024 * 1024)}MB`
      });
      return;
    }

    try {
      setUploadingHeaderMedia(true);
      
      // Subir a Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `template-headers/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { data, error: uploadError } = await supabase.storage
        .from('whatsapp-media')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from('whatsapp-media')
        .getPublicUrl(fileName);

      setHeaderMediaUrl(urlData.publicUrl);
      setHeaderMediaFile(file);
      
      // Crear preview si es imagen
      if (headerType === 'IMAGE') {
        setHeaderMediaPreview(urlData.publicUrl);
      }

      toast.push({
        type: 'success',
        title: 'Éxito',
        message: 'Archivo subido correctamente'
      });
    } catch (err) {
      console.error('[TemplateForm] Error subiendo archivo:', err);
      toast.push({
        type: 'error',
        title: 'Error',
        message: err.message || 'Error al subir el archivo'
      });
    } finally {
      setUploadingHeaderMedia(false);
      if (headerFileInputRef.current) {
        headerFileInputRef.current.value = '';
      }
    }
  };

  const handleAddButton = () => {
    const trimmed = currentButtonText.trim();
    if (!trimmed) return;

    if (buttons.length >= 3) {
      toast.push({
        type: 'error',
        title: 'Límite alcanzado',
        message: 'Máximo 3 botones permitidos'
      });
      return;
    }

    if (trimmed.length > 20) {
      toast.push({
        type: 'error',
        title: 'Texto muy largo',
        message: 'El texto del botón no puede exceder 20 caracteres'
      });
      return;
    }

    // Verificar duplicados
    if (buttons.some(btn => btn.text.toLowerCase() === trimmed.toLowerCase())) {
      toast.push({
        type: 'error',
        title: 'Botón duplicado',
        message: `"${trimmed}" ya está en la lista`
      });
      return;
    }

    setButtons([...buttons, { type: 'QUICK_REPLY', text: trimmed }]);
    setCurrentButtonText('');
    setErrors({ ...errors, buttons: null });
  };

  const handleRemoveButton = (index) => {
    setButtons(buttons.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    const newErrors = {};

    // Validar nombre
    if (!name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }

    // Validar cuerpo
    if (!bodyText.trim()) {
      newErrors.bodyText = 'El cuerpo del mensaje es requerido';
    } else if (bodyText.length > 1024) {
      newErrors.bodyText = `El cuerpo no puede exceder 1024 caracteres (actual: ${bodyText.length})`;
    }

    // Validar encabezado
    if (headerType === 'TEXT') {
      if (!headerText.trim()) {
        newErrors.headerText = 'El texto del encabezado es requerido cuando el tipo es TEXT';
      } else if (headerText.length > 60) {
        newErrors.headerText = `El encabezado no puede exceder 60 caracteres (actual: ${headerText.length})`;
      }
    }

    if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType)) {
      if (!headerMediaUrl && !headerMediaFile) {
        newErrors.headerMedia = `Debes subir un archivo ${headerType === 'IMAGE' ? 'de imagen' : headerType === 'VIDEO' ? 'de video' : 'documento'}`;
      }
    }

    // Validar pie de página
    if (footerText && footerText.length > 60) {
      newErrors.footerText = `El pie de página no puede exceder 60 caracteres (actual: ${footerText.length})`;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Preparar datos del template
    const templateData = {
      name: name.trim(),
      category,
      language,
      header_type: headerType,
      header_text: headerType === 'TEXT' ? headerText.trim() : null,
      header_media_url: ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType) ? headerMediaUrl : null,
      body_text: bodyText.trim(),
      footer_text: footerText.trim() || null,
      buttons: buttons.length > 0 ? buttons : []
    };

    onSave(templateData);
  };


  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-[#0f171e] border border-neutral-800 rounded-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-neutral-200">
            {template ? 'Editar Template' : 'Nuevo Template'}
          </h3>
          <button
            onClick={onCancel}
            className="text-neutral-400 hover:text-neutral-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Información básica */}
          <div className="grid grid-cols-2 gap-4">
            {/* Nombre */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Nombre del Template <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Bienvenida, Confirmación de pedido..."
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#e7922b]"
              />
              {errors.name && (
                <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.name}
                </p>
              )}
            </div>

            {/* Categoría */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Categoría <span className="text-red-400">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#e7922b]"
              >
                <option value="MARKETING">Marketing</option>
                <option value="UTILITY">Utilidad</option>
                <option value="AUTHENTICATION">Autenticación</option>
              </select>
              <p className="text-xs text-neutral-500 mt-1">
                {category === 'MARKETING' && 'Para mensajes promocionales'}
                {category === 'UTILITY' && 'Para mensajes transaccionales'}
                {category === 'AUTHENTICATION' && 'Para códigos OTP y verificación'}
              </p>
            </div>

            {/* Idioma */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Idioma <span className="text-red-400">*</span>
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#e7922b]"
              >
                <option value="es">Español (es)</option>
                <option value="en">English (en)</option>
                <option value="pt">Português (pt)</option>
              </select>
            </div>
          </div>

          {/* Encabezado */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Encabezado (Opcional)
            </label>
            <select
              value={headerType}
              onChange={(e) => {
                setHeaderType(e.target.value);
                if (e.target.value !== 'TEXT') {
                  setHeaderText('');
                }
                if (!['IMAGE', 'VIDEO', 'DOCUMENT'].includes(e.target.value)) {
                  setHeaderMediaUrl('');
                  setHeaderMediaFile(null);
                  setHeaderMediaPreview(null);
                }
                setErrors({ ...errors, headerText: null, headerMedia: null });
              }}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#e7922b]"
            >
              <option value="NONE">Sin encabezado</option>
              <option value="TEXT">Texto</option>
              <option value="IMAGE">Imagen</option>
              <option value="VIDEO">Video</option>
              <option value="DOCUMENT">Documento</option>
            </select>

            {headerType === 'TEXT' && (
              <div className="mt-2">
                <input
                  type="text"
                  value={headerText}
                  onChange={(e) => setHeaderText(e.target.value)}
                  placeholder="Texto del encabezado (máx 60 caracteres)"
                  maxLength={60}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#e7922b]"
                />
                <p className="text-xs text-neutral-500 mt-1">
                  {headerText.length}/60 caracteres
                </p>
                {errors.headerText && (
                  <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.headerText}
                  </p>
                )}
              </div>
            )}

            {/* Subida de archivo para IMAGE, VIDEO, DOCUMENT */}
            {['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType) && (
              <div className="mt-2">
                <input
                  ref={headerFileInputRef}
                  type="file"
                  accept={
                    headerType === 'IMAGE' ? 'image/*' :
                    headerType === 'VIDEO' ? 'video/*' :
                    'application/pdf,.doc,.docx'
                  }
                  onChange={handleHeaderFileSelect}
                  disabled={uploadingHeaderMedia}
                  className="hidden"
                  id="header-media-upload"
                />
                
                <label
                  htmlFor="header-media-upload"
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 transition cursor-pointer disabled:opacity-50 ${
                    uploadingHeaderMedia ? 'cursor-wait opacity-50' : ''
                  }`}
                >
                  {headerType === 'IMAGE' && <Image className="w-4 h-4 text-neutral-400" />}
                  {headerType === 'VIDEO' && <Video className="w-4 h-4 text-neutral-400" />}
                  {headerType === 'DOCUMENT' && <File className="w-4 h-4 text-neutral-400" />}
                  <Upload className="w-4 h-4 text-neutral-400" />
                  <span className="text-sm text-neutral-200">
                    {uploadingHeaderMedia 
                      ? 'Subiendo...' 
                      : headerMediaUrl || headerMediaFile
                        ? 'Cambiar archivo' 
                        : `Subir ${headerType === 'IMAGE' ? 'imagen' : headerType === 'VIDEO' ? 'video' : 'documento'}`}
                  </span>
                </label>

                {/* Preview de imagen */}
                {headerMediaPreview && headerType === 'IMAGE' && (
                  <div className="mt-2">
                    <img
                      src={headerMediaPreview}
                      alt="Preview"
                      className="max-w-full h-32 object-contain rounded-lg border border-neutral-700"
                    />
                  </div>
                )}

                {/* Mostrar nombre del archivo */}
                {(headerMediaFile || headerMediaUrl) && (
                  <p className="text-xs text-neutral-400 mt-2">
                    {headerMediaFile?.name || headerMediaUrl.split('/').pop()}
                  </p>
                )}

                {errors.headerMedia && (
                  <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.headerMedia}
                  </p>
                )}

                <p className="text-xs text-neutral-500 mt-1">
                  {headerType === 'IMAGE' && 'Formatos: JPG, PNG, GIF. Recomendado: máximo 1MB'}
                  {headerType === 'VIDEO' && 'Formatos: MP4, MOV. Recomendado: máximo 5MB'}
                  {headerType === 'DOCUMENT' && 'Formatos: PDF, DOC, DOCX. Recomendado: máximo 5MB'}
                </p>
              </div>
            )}
          </div>

          {/* Cuerpo */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Cuerpo del Mensaje <span className="text-red-400">*</span>
            </label>
            <textarea
              id="body-text"
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              placeholder="Escribe el mensaje aquí..."
              rows={6}
              maxLength={1024}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#e7922b]"
            />
            <div className="flex items-center justify-end mt-1">
              <p className="text-xs text-neutral-500">
                {bodyText.length}/1024 caracteres
              </p>
            </div>
            {errors.bodyText && (
              <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.bodyText}
              </p>
            )}
          </div>

          {/* Pie de página */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Pie de Página (Opcional)
            </label>
            <input
              type="text"
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              placeholder="Texto del pie de página (máx 60 caracteres)"
              maxLength={60}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#e7922b]"
            />
            <p className="text-xs text-neutral-500 mt-1">
              {footerText.length}/60 caracteres
            </p>
            {errors.footerText && (
              <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.footerText}
              </p>
            )}
          </div>

          {/* Botones */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Botones de Respuesta Rápida (Opcional)
            </label>
            <p className="text-xs text-neutral-400 mb-3">
              Agrega hasta 3 botones que el cliente puede presionar para responder rápidamente.
            </p>

            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={currentButtonText}
                onChange={(e) => setCurrentButtonText(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddButton();
                  }
                }}
                placeholder="Texto del botón (máx 20 caracteres)"
                maxLength={20}
                className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#e7922b]"
              />
              <button
                type="button"
                onClick={handleAddButton}
                disabled={buttons.length >= 3}
                className="px-3 py-2 bg-[#e7922b] hover:bg-[#d8821b] disabled:bg-neutral-700 disabled:text-neutral-500 text-[#1a2430] font-semibold rounded-lg transition flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Agregar
              </button>
            </div>

            {buttons.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {buttons.map((button, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 bg-[#e7922b]/10 border border-[#e7922b]/30 rounded-lg px-3 py-1.5"
                  >
                    <span className="text-sm text-[#e7922b] font-medium">{button.text}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveButton(index)}
                      className="text-[#e7922b] hover:text-red-400 transition"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {buttons.length === 0 && (
              <p className="text-xs text-neutral-500 italic">
                No hay botones agregados. Los botones son opcionales.
              </p>
            )}
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-neutral-800">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-[#e7922b] hover:bg-[#d8821b] text-[#1a2430] font-semibold rounded-lg transition"
          >
            {template ? 'Actualizar' : 'Crear'} Template
          </button>
        </div>
      </div>
    </div>
  );
}

