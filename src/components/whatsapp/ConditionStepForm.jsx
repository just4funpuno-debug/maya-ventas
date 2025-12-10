/**
 * Formulario para agregar/editar un paso de condición
 * 
 * Permite configurar una condición como elemento independiente del flujo
 * que evalúa keywords y ramifica a diferentes pasos según el resultado
 */

import React, { useState, useEffect } from 'react';
import { X, Search, Plus, Trash2, AlertCircle, CheckCircle, XCircle, GitBranch } from 'lucide-react';
import { useToast } from '../ToastProvider';

export default function ConditionStepForm({ condition = null, availableSteps = [], onSave, onCancel }) {
  const toast = useToast();
  const [conditionType, setConditionType] = useState('if_message_contains');
  const [keywords, setKeywords] = useState([]);
  const [currentKeyword, setCurrentKeyword] = useState('');
  const [nextMessageIfTrue, setNextMessageIfTrue] = useState(null);
  const [nextMessageIfFalse, setNextMessageIfFalse] = useState(null);
  const [errors, setErrors] = useState({});

  // Si es edición, cargar datos de la condición
  useEffect(() => {
    if (condition) {
      setConditionType(condition.condition_type || 'if_message_contains');
      if (condition.condition_keywords && condition.condition_keywords.keywords) {
        setKeywords(condition.condition_keywords.keywords || []);
      } else {
        setKeywords([]);
      }
      setNextMessageIfTrue(condition.next_message_if_true || null);
      setNextMessageIfFalse(condition.next_message_if_false || null);
    } else {
      setKeywords([]);
      setCurrentKeyword('');
    }
  }, [condition]);

  // Manejar agregar keyword
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

  // Manejar eliminar keyword
  const handleRemoveKeyword = (index) => {
    setKeywords(keywords.filter((_, i) => i !== index));
    setErrors({ ...errors, keywords: null });
  };

  // Filtrar pasos disponibles (excluir el paso actual si es edición)
  const availableStepsForBranches = availableSteps.filter(step => 
    !condition || step.id !== condition.id
  );

  const handleSubmit = () => {
    const newErrors = {};

    // Validar keywords si es condición de mensaje
    if (conditionType === 'if_message_contains') {
      if (!keywords || keywords.length === 0) {
        newErrors.keywords = 'Debes agregar al menos una palabra clave';
      }
    }

    // Validar que haya al menos una ramificación configurada
    if (!nextMessageIfTrue && !nextMessageIfFalse) {
      newErrors.branches = 'Debes configurar al menos una ramificación (Si es verdadera O Si es falsa)';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Preparar datos de la condición
    const conditionData = {
      step_type: 'condition',
      message_type: null, // Pasos de condición no tienen tipo de mensaje
      content_text: null,
      media_url: null,
      media_filename: null,
      media_size_kb: null,
      caption: null,
      delay_hours_from_previous: 0, // Condiciones no tienen delay
      pause_type: null,
      days_without_response: null,
      target_stage_name: null,
      condition_type: conditionType,
      condition_keywords: conditionType === 'if_message_contains' && keywords.length > 0 
        ? {
            keywords: keywords.filter(kw => kw.trim().length > 0),
            match_type: 'any', // OR por defecto
            case_sensitive: false // Siempre ignorar mayúsculas/tildes
          }
        : null,
      next_message_if_true: nextMessageIfTrue || null,
      next_message_if_false: nextMessageIfFalse || null
    };

    onSave(conditionData);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-[#0f171e] border border-neutral-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-neutral-200">
            {condition ? 'Editar Condición' : 'Nueva Condición'}
          </h3>
          <button
            onClick={onCancel}
            className="text-neutral-400 hover:text-neutral-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Tipo de condición */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Tipo de Condición <span className="text-red-400">*</span>
            </label>
            <select
              value={conditionType}
              onChange={(e) => {
                const newConditionType = e.target.value;
                setConditionType(newConditionType);
                // Limpiar keywords si cambia a otra condición
                if (newConditionType !== 'if_message_contains') {
                  setKeywords([]);
                  setCurrentKeyword('');
                  setErrors({ ...errors, keywords: null });
                }
              }}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#e7922b]"
            >
              <option value="if_message_contains">Si el mensaje contiene palabras clave</option>
              <option value="if_responded">Si el cliente respondió</option>
              <option value="if_not_responded">Si el cliente NO respondió</option>
            </select>
            <div className="mt-2 space-y-1">
              {conditionType === 'if_message_contains' && (
                <p className="text-xs text-neutral-500 flex items-center gap-1">
                  <Search className="w-3 h-3" />
                  Evalúa si el último mensaje del cliente contiene alguna palabra clave
                </p>
              )}
              {conditionType === 'if_responded' && (
                <p className="text-xs text-neutral-500 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Evalúa si el cliente respondió después de iniciar la secuencia
                </p>
              )}
              {conditionType === 'if_not_responded' && (
                <p className="text-xs text-neutral-500 flex items-center gap-1">
                  <XCircle className="w-3 h-3" />
                  Evalúa si el cliente NO ha respondido después de iniciar la secuencia
                </p>
              )}
            </div>
          </div>

          {/* Configuración de palabras clave (solo para if_message_contains) */}
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

          {/* Ramificaciones */}
          <div className="space-y-4 border-t border-neutral-700 pt-4">
            <div className="flex items-center gap-2 mb-3">
              <GitBranch className="w-4 h-4 text-[#e7922b]" />
              <h4 className="text-sm font-semibold text-neutral-200">Ramificaciones</h4>
            </div>
            <p className="text-xs text-neutral-400 mb-4">
              Configura a dónde debe saltar el flujo según el resultado de la condición. <span className="text-[#e7922b] font-medium">Debes configurar al menos una ramificación.</span>
            </p>

            {errors.branches && (
              <p className="text-xs text-red-400 flex items-center gap-1 mb-2">
                <AlertCircle className="w-3 h-3" />
                {errors.branches}
              </p>
            )}

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
                <option value="">-- Seleccionar paso --</option>
                {availableStepsForBranches.map(step => {
                  let stepLabel = '';
                  if (step.step_type === 'message') {
                    stepLabel = `Mensaje ${step.message_number || step.order_position}: ${step.content_text ? (step.content_text.substring(0, 50) + (step.content_text.length > 50 ? '...' : '')) : `[${step.message_type}]`}`;
                  } else if (step.step_type === 'pause') {
                    stepLabel = `Pausa ${step.message_number || step.order_position}`;
                  } else if (step.step_type === 'stage_change') {
                    stepLabel = `Cambiar Etapa ${step.message_number || step.order_position}: ${step.target_stage_name || 'N/A'}`;
                  } else if (step.step_type === 'condition') {
                    stepLabel = `Condición ${step.message_number || step.order_position}`;
                  } else {
                    stepLabel = `Paso ${step.message_number || step.order_position}`;
                  }
                  return (
                    <option key={step.id} value={step.id}>
                      {stepLabel}
                    </option>
                  );
                })}
              </select>
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
                <option value="">-- Seleccionar paso --</option>
                {availableStepsForBranches.map(step => {
                  let stepLabel = '';
                  if (step.step_type === 'message') {
                    stepLabel = `Mensaje ${step.message_number || step.order_position}: ${step.content_text ? (step.content_text.substring(0, 50) + (step.content_text.length > 50 ? '...' : '')) : `[${step.message_type}]`}`;
                  } else if (step.step_type === 'pause') {
                    stepLabel = `Pausa ${step.message_number || step.order_position}`;
                  } else if (step.step_type === 'stage_change') {
                    stepLabel = `Cambiar Etapa ${step.message_number || step.order_position}: ${step.target_stage_name || 'N/A'}`;
                  } else if (step.step_type === 'condition') {
                    stepLabel = `Condición ${step.message_number || step.order_position}`;
                  } else {
                    stepLabel = `Paso ${step.message_number || step.order_position}`;
                  }
                  return (
                    <option key={step.id} value={step.id}>
                      {stepLabel}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>

        {/* Botones */}
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
            {condition ? 'Actualizar' : 'Crear'} Condición
          </button>
        </div>
      </div>
    </div>
  );
}


