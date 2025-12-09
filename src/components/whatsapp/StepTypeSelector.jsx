/**
 * Selector de tipo de paso para flujos flexibles
 * FASE 2: Selector de Tipo de Paso
 * 
 * Permite elegir qué tipo de paso agregar al flujo:
 * - message: Mensaje (texto, imagen, video, etc.)
 * - pause: Pausa independiente
 * - stage_change: Cambio automático de etapa
 */

import React from 'react';
import { X, MessageSquare, Pause, ArrowRightCircle, GitBranch, Send, Image, Video, Music, FileText } from 'lucide-react';

const STEP_TYPES = [
  {
    value: 'message',
    label: 'Mensaje',
    description: 'Enviar un mensaje (texto, imagen, video, audio o documento)',
    icon: MessageSquare,
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30',
    iconColor: 'text-blue-400'
  },
  {
    value: 'pause',
    label: 'Pausa',
    description: 'Agregar una pausa con delay configurable',
    icon: Pause,
    color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30',
    iconColor: 'text-yellow-400'
  },
  {
    value: 'condition',
    label: 'Condición',
    description: 'Evaluar condición (keywords, respuesta) y ramificar el flujo',
    icon: GitBranch,
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/30 hover:bg-purple-500/30',
    iconColor: 'text-purple-400'
  },
  {
    value: 'stage_change',
    label: 'Cambiar Etapa',
    description: 'Cambiar automáticamente el lead a otra etapa del pipeline',
    icon: ArrowRightCircle,
    color: 'bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30',
    iconColor: 'text-green-400'
  }
];

export default function StepTypeSelector({ isOpen, onClose, onSelect }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-[#0f171e] border border-neutral-800 rounded-xl p-6 w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-neutral-200">
              Agregar Paso al Flujo
            </h3>
            <p className="text-sm text-neutral-400 mt-1">
              Selecciona el tipo de paso que deseas agregar
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Opciones */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {STEP_TYPES.map((stepType) => {
            const Icon = stepType.icon;
            return (
              <button
                key={stepType.value}
                onClick={() => {
                  onSelect(stepType.value);
                  onClose();
                }}
                className={`p-6 rounded-lg border-2 transition-all text-left ${stepType.color}`}
              >
                <div className="flex flex-col items-start gap-3">
                  <div className="p-3 rounded-lg bg-neutral-900/50">
                    <Icon className={`w-6 h-6 ${stepType.iconColor}`} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-neutral-200 mb-1">
                      {stepType.label}
                    </h4>
                    <p className="text-xs text-neutral-400">
                      {stepType.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t border-neutral-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg transition"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}


