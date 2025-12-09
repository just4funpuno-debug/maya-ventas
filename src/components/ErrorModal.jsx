import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

/**
 * Modal de error reutilizable
 * 
 * @param {boolean} isOpen - Si el modal está abierto
 * @param {function} onClose - Función para cerrar el modal
 * @param {string} title - Título del modal (default: "Error")
 * @param {string|ReactNode} message - Mensaje del error
 */
export default function ErrorModal({
  isOpen,
  onClose,
  title = 'Error',
  message
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-full max-w-[360px] bg-[#181f26] rounded-xl p-6 shadow-xl border border-red-700/50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="text-xs text-neutral-300 leading-relaxed mb-6">
          {message}
        </div>
        <div className="flex justify-end pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold text-white"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}


