/**
 * Modal para mostrar contactos bloqueados desde el chat
 * FASE 1: SUBFASE 1.1 - Modal wrapper para BlockedContactsPanel
 * 
 * Muestra el panel de contactos bloqueados filtrado por producto en un modal
 */

import React from 'react';
import { X, AlertTriangle } from 'lucide-react';
import BlockedContactsPanel from './BlockedContactsPanel';

export default function BlockedContactsModal({ isOpen, onClose, productId, session, productName }) {
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
          className="bg-neutral-900 rounded-lg border border-neutral-800 shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-neutral-800 flex-shrink-0">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              <div>
                <h2 className="text-lg font-semibold text-neutral-200">
                  Contactos Bloqueados
                </h2>
                {productName && (
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Producto: {productName}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-neutral-800 transition"
            >
              <X className="w-5 h-5 text-neutral-400" />
            </button>
          </div>

          {/* Content - Panel adaptado para modal */}
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            <BlockedContactsPanelContent 
              productId={productId}
              session={session}
            />
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Contenido del panel adaptado para modal
 * FASE 1: SUBFASE 1.2 - Renderizar contenido del panel dentro del modal
 */
function BlockedContactsPanelContent({ productId, session }) {
  return (
    <div className="flex-1 overflow-hidden h-full">
      <BlockedContactsPanel 
        session={session}
        initialProductId={productId}
        hideProductTabs={true}
        hideHeader={true}
      />
    </div>
  );
}

