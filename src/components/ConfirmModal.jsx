import React from 'react';
import { X } from 'lucide-react';

/**
 * Modal de confirmación reutilizable
 * 
 * @param {boolean} isOpen - Si el modal está abierto
 * @param {function} onClose - Función para cerrar el modal
 * @param {function} onConfirm - Función a ejecutar al confirmar
 * @param {string} title - Título del modal
 * @param {string|ReactNode} message - Mensaje del modal
 * @param {string} confirmText - Texto del botón de confirmar (default: "Confirmar")
 * @param {string} cancelText - Texto del botón de cancelar (default: "Cancelar")
 * @param {string} confirmColor - Color del botón de confirmar (default: "red")
 * @param {boolean} isLoading - Si la operación está en progreso
 */
export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  confirmColor = 'red',
  isLoading = false
}) {
  if (!isOpen) return null;

  const colorClasses = {
    red: 'bg-red-600 hover:bg-red-500',
    orange: 'bg-[#e7922b] hover:bg-[#d6821b]',
    blue: 'bg-blue-600 hover:bg-blue-500',
    green: 'bg-green-600 hover:bg-green-500'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={!isLoading ? onClose : undefined} />
      <div className="relative z-10 w-full max-w-[360px] bg-[#181f26] rounded-xl p-6 shadow-xl border border-neutral-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[#e7922b] flex items-center gap-2">
            {title}
          </h3>
          {!isLoading && (
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-200 transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="text-xs text-neutral-300 leading-relaxed mb-6">
          {message}
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-3 py-2 rounded-xl bg-neutral-700 text-xs disabled:opacity-40"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed ${colorClasses[confirmColor] || colorClasses.red} text-white`}
          >
            {isLoading ? 'Procesando...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}


