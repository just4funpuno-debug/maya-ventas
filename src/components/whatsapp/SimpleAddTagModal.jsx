/**
 * Modal simple para añadir una etiqueta
 * Solo nombre y selector de color
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Tag, ChevronDown } from 'lucide-react';
import { useToast } from '../ToastProvider';
import { createTag } from '../../services/whatsapp/tags';

// Colores predefinidos
const PREDEFINED_COLORS = [
  '#e7922b', // Color principal
  '#ff0000', // Rojo
  '#00ff00', // Verde
  '#0000ff', // Azul
  '#ffff00', // Amarillo
  '#ff00ff', // Magenta
  '#00ffff', // Cyan
  '#ff8800', // Naranja
  '#8800ff', // Púrpura
  '#0088ff', // Azul claro
  '#ff0088', // Rosa
  '#88ff00', // Lima
  '#008888', // Teal
  '#888800', // Oliva
  '#888888'  // Gris
];

export default function SimpleAddTagModal({ isOpen, onClose, accountId, productId, onTagCreated }) {
  const toast = useToast();
  const [tagName, setTagName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PREDEFINED_COLORS[0]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Resetear formulario al abrir
  React.useEffect(() => {
    if (isOpen) {
      setTagName('');
      setSelectedColor(PREDEFINED_COLORS[0]);
      setShowColorPicker(false);
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validación
    if (!tagName.trim()) {
      setError('El nombre de la etiqueta no puede quedar vacío');
      return;
    }

    if (tagName.trim().length > 50) {
      setError('El nombre no puede exceder 50 caracteres');
      return;
    }

    // FASE 3 - SUBFASE 3.3: Validar productId y accountId
    if (!productId) {
      setError('No hay producto seleccionado');
      return;
    }

    if (!accountId) {
      setError('No hay cuenta seleccionada');
      return;
    }

    try {
      setIsSubmitting(true);
      // FASE 3 - SUBFASE 3.3: Pasar productId como primer parámetro
      const { data, error: err } = await createTag(productId, accountId, tagName.trim(), selectedColor);

      if (err) {
        throw err;
      }

      toast.push({
        type: 'success',
        title: 'Éxito',
        message: 'Etiqueta creada correctamente'
      });

      // Resetear formulario
      setTagName('');
      setSelectedColor(PREDEFINED_COLORS[0]);
      setShowColorPicker(false);

      // Notificar que se creó una etiqueta
      if (onTagCreated) {
        onTagCreated();
      }

      // Cerrar modal
      onClose();
    } catch (err) {
      console.error('[SimpleAddTagModal] Error:', err);
      setError(err.message || 'Error al crear la etiqueta');
      toast.push({
        type: 'error',
        title: 'Error',
        message: err.message || 'No se pudo crear la etiqueta'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="bg-neutral-900 rounded-lg border border-neutral-800 shadow-xl w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-neutral-800">
            <h2 className="text-lg font-semibold text-neutral-200 flex items-center gap-2">
              <Tag className="w-5 h-5 text-[#e7922b]" />
              Añade una etiqueta
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-neutral-800 transition"
              disabled={isSubmitting}
            >
              <X className="w-5 h-5 text-neutral-400" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* Nombre */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Etiqueta
              </label>
              <div className="relative flex items-center gap-2">
                {/* Botón de color */}
                <button
                  type="button"
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="flex-shrink-0 w-10 h-10 rounded-lg border-2 border-neutral-700 hover:border-neutral-600 transition flex items-center justify-center"
                  style={{ backgroundColor: selectedColor }}
                  disabled={isSubmitting}
                >
                  <ChevronDown
                    className={`w-4 h-4 text-white transition-transform ${
                      showColorPicker ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Input de nombre */}
                <input
                  type="text"
                  value={tagName}
                  onChange={(e) => {
                    setTagName(e.target.value);
                    setError('');
                  }}
                  placeholder="Nombre de la etiqueta"
                  maxLength={50}
                  disabled={isSubmitting}
                  className={`flex-1 px-3 py-2 rounded-lg bg-neutral-800 border ${
                    error ? 'border-red-500' : 'border-neutral-700'
                  } text-neutral-200 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#e7922b] disabled:opacity-50`}
                  autoFocus
                />
              </div>
              {error && (
                <p className="text-xs text-red-400 mt-1">{error}</p>
              )}
            </div>

            {/* Paleta de colores (desplegable) */}
            <AnimatePresence>
              {showColorPicker && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-5 gap-2 p-3 bg-neutral-800 rounded-lg border border-neutral-700">
                    {PREDEFINED_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => {
                          setSelectedColor(color);
                          setShowColorPicker(false);
                        }}
                        disabled={isSubmitting}
                        className={`w-full aspect-square rounded-lg border-2 transition ${
                          selectedColor === color
                            ? 'border-white scale-110'
                            : 'border-neutral-700 hover:border-neutral-600'
                        } disabled:opacity-50`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Botones */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg bg-neutral-800 text-neutral-200 hover:bg-neutral-700 transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !tagName.trim()}
                className="px-4 py-2 rounded-lg bg-[#e7922b] text-white font-medium hover:bg-[#d6821b] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

