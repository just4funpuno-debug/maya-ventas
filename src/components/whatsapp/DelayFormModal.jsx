/**
 * Modal simple para agregar solo un delay/pausa entre mensajes
 */

import React, { useState } from 'react';
import { X, Clock } from 'lucide-react';

export default function DelayFormModal({ onSave, onCancel }) {
  const [delayTime, setDelayTime] = useState('01:00'); // Formato HH:MM
  const [errors, setErrors] = useState({});

  // Convertir HH:MM a horas decimales
  const convertToDecimalHours = (timeString) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours + (minutes / 60);
  };

  // Validar formato HH:MM
  const validateTimeFormat = (timeString) => {
    const timeRegex = /^([0-9]|[0-1][0-9]|2[0-3]):([0-5][0-9])$/;
    return timeRegex.test(timeString);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validar formato
    if (!validateTimeFormat(delayTime)) {
      setErrors({ delayTime: 'Formato inválido. Use HH:MM (ej: 01:45, 24:02)' });
      return;
    }

    // Convertir a horas decimales y guardar
    const decimalHours = convertToDecimalHours(delayTime);
    onSave(decimalHours);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#0f171e] border border-neutral-800 rounded-lg w-full max-w-md mx-4 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#e7922b]" />
            <h3 className="text-lg font-semibold text-neutral-200">
              Agregar Pausa
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Tiempo de pausa <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={delayTime}
              onChange={(e) => {
                let value = e.target.value;
                
                // Permitir solo números y dos puntos
                value = value.replace(/[^\d:]/g, '');
                
                // Limitar formato HH:MM
                if (value.length > 5) {
                  value = value.slice(0, 5);
                }
                
                // Auto-formatear con dos puntos
                if (value.length === 2 && !value.includes(':')) {
                  value = value + ':';
                }
                
                // Validar horas (00-23)
                if (value.includes(':')) {
                  const [hours, minutes] = value.split(':');
                  if (hours && parseInt(hours) > 23) {
                    value = '23:' + (minutes || '');
                  }
                  // Validar minutos (00-59)
                  if (minutes && minutes.length === 2 && parseInt(minutes) > 59) {
                    value = hours + ':59';
                  }
                }
                
                setDelayTime(value);
                if (errors.delayTime) {
                  setErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.delayTime;
                    return newErrors;
                  });
                }
              }}
              onBlur={(e) => {
                // Asegurar formato completo HH:MM
                let value = e.target.value;
                if (value && !value.includes(':')) {
                  // Si solo hay números, formatear como HH:MM
                  if (value.length <= 2) {
                    value = value.padStart(2, '0') + ':00';
                  } else if (value.length === 3) {
                    value = value.slice(0, 2) + ':' + value.slice(2) + '0';
                  } else if (value.length === 4) {
                    value = value.slice(0, 2) + ':' + value.slice(2);
                  }
                } else if (value.includes(':')) {
                  const [hours, minutes] = value.split(':');
                  const formattedHours = hours.padStart(2, '0');
                  const formattedMinutes = (minutes || '').padEnd(2, '0').slice(0, 2);
                  value = formattedHours + ':' + formattedMinutes;
                }
                setDelayTime(value || '00:00');
              }}
              className={`w-full bg-neutral-800 border ${
                errors.delayTime ? 'border-red-500' : 'border-neutral-700'
              } rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#e7922b] font-mono`}
              placeholder="HH:MM (ej: 01:45, 24:02)"
              autoFocus
              maxLength={5}
            />
            {errors.delayTime && (
              <p className="text-xs text-red-400 mt-1">{errors.delayTime}</p>
            )}
            <p className="text-xs text-neutral-500 mt-2">
              Formato: HH:MM (horas:minutos). Ej: 01:45 = 1 hora 45 minutos, 24:02 = 24 horas 2 minutos
            </p>
          </div>

          {/* Footer */}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#e7922b] hover:bg-[#d6821f] text-[#1a2430] font-semibold rounded-lg transition"
            >
              Agregar Pausa
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

