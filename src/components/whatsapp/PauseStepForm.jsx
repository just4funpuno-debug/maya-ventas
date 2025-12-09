/**
 * Formulario para agregar/editar una pausa independiente
 * FASE 3: Formulario de Pausa Independiente
 * 
 * Permite configurar una pausa como elemento independiente del flujo
 * (no como parte de un mensaje)
 */

import React, { useState, useEffect } from 'react';
import { X, Clock, MessageSquare, Calendar, AlertCircle, Zap } from 'lucide-react';
import { useToast } from '../ToastProvider';

export default function PauseStepForm({ pause = null, onSave, onCancel }) {
  const toast = useToast();
  const [pauseType, setPauseType] = useState('fixed_delay');
  const [delayTime, setDelayTime] = useState('01:00'); // Formato HH:MM
  const [daysWithoutResponse, setDaysWithoutResponse] = useState(null);
  const [enableInterrupt, setEnableInterrupt] = useState(false); // FASE 2: Habilitar interrupción
  const [interruptType, setInterruptType] = useState('any_message'); // FASE 2: 'any_message' o 'keywords'
  const [interruptKeywords, setInterruptKeywords] = useState([]); // FASE 2: Palabras clave (solo si interruptType === 'keywords')
  const [currentKeyword, setCurrentKeyword] = useState(''); // FASE 2: Input temporal
  const [delayAfterInterrupt, setDelayAfterInterrupt] = useState(''); // FASE 2: Delay después de interrupción
  const [errors, setErrors] = useState({});

  // Funciones de conversión HH:MM ↔ horas decimales
  const convertToDecimalHours = (timeString) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours + (minutes / 60);
  };

  const convertToTimeFormat = (decimalHours) => {
    if (!decimalHours || decimalHours === 0) return '00:00';
    const hours = Math.floor(decimalHours);
    const minutes = Math.round((decimalHours - hours) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const validateTimeFormat = (timeString) => {
    // Permitir formato HH:MM con cualquier cantidad de horas (ej: 48:00, 168:30, 999:59)
    const timeRegex = /^(\d{1,3}):([0-5][0-9])$/;
    if (!timeRegex.test(timeString)) return false;
    const [hours, minutes] = timeString.split(':').map(Number);
    return minutes >= 0 && minutes <= 59 && hours >= 0 && hours <= 999;
  };

  // Si es edición, cargar datos de la pausa
  useEffect(() => {
    if (pause) {
      setPauseType(pause.pause_type || 'fixed_delay');
      if (pause.delay_hours_from_previous) {
        setDelayTime(convertToTimeFormat(pause.delay_hours_from_previous));
      }
      setDaysWithoutResponse(pause.days_without_response || null);
      
      // FASE 2: Cargar datos de interrupción si existen
      if (pause.pause_interrupt_keywords) {
        setEnableInterrupt(true);
        // Determinar tipo: si tiene keywords específicas es 'keywords', sino es 'any_message'
        if (pause.pause_interrupt_keywords.keywords && pause.pause_interrupt_keywords.keywords.length > 0) {
          setInterruptType('keywords');
          setInterruptKeywords(pause.pause_interrupt_keywords.keywords || []);
        } else {
          setInterruptType('any_message');
        }
      }
      if (pause.pause_delay_after_interrupt) {
        setDelayAfterInterrupt(convertToTimeFormat(pause.pause_delay_after_interrupt));
      }
    }
  }, [pause]);

  const handleSubmit = async () => {
    const newErrors = {};

    // Validar según tipo de pausa
    if (pauseType === 'fixed_delay') {
      if (!validateTimeFormat(delayTime)) {
        newErrors.delayTime = 'Formato inválido. Use HH:MM (ej: 01:45, 48:00)';
      }
    }

    if (pauseType === 'until_days_without_response') {
      if (!daysWithoutResponse || daysWithoutResponse < 1) {
        newErrors.daysWithoutResponse = 'Debes especificar al menos 1 día';
      }
    }

    // FASE 2: Validar interrupción
    if (pauseType === 'fixed_delay' && enableInterrupt) {
      // Solo validar keywords si el tipo es 'keywords'
      if (interruptType === 'keywords' && interruptKeywords.length === 0) {
        newErrors.interruptKeywords = 'Debes agregar al menos una palabra clave';
      }
      
      if (delayAfterInterrupt && !validateTimeFormat(delayAfterInterrupt)) {
        newErrors.delayAfterInterrupt = 'Formato inválido. Use HH:MM (ej: 01:00, 00:30)';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      // Preparar datos de la pausa
      const pauseData = {
        step_type: 'pause',
        message_type: null, // Las pausas no tienen tipo de mensaje
        content_text: null,
        media_url: null,
        media_filename: null,
        media_size_kb: null,
        caption: null,
        delay_hours_from_previous: pauseType === 'fixed_delay' ? convertToDecimalHours(delayTime) : 0,
        pause_type: pauseType,
        days_without_response: pauseType === 'until_days_without_response' && daysWithoutResponse
          ? parseInt(daysWithoutResponse)
          : null,
        // FASE 2: Campos de interrupción (solo para fixed_delay)
        pause_interrupt_keywords: pauseType === 'fixed_delay' && enableInterrupt
          ? (interruptType === 'keywords' && interruptKeywords.length > 0
              ? {
                  keywords: interruptKeywords,
                  match_type: 'any', // Por defecto OR
                  interrupt_type: 'keywords'
                }
              : interruptType === 'any_message'
                ? {
                    keywords: [], // Array vacío indica "cualquier respuesta"
                    match_type: 'any',
                    interrupt_type: 'any_message'
                  }
                : null)
          : null,
        pause_delay_after_interrupt: pauseType === 'fixed_delay' && enableInterrupt && delayAfterInterrupt
          ? convertToDecimalHours(delayAfterInterrupt)
          : null,
        condition_type: 'none', // Las pausas no tienen condiciones
        next_message_if_true: null,
        next_message_if_false: null
      };

      onSave(pauseData);
    } catch (err) {
      console.error('[PauseStepForm] Error guardando:', err);
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'No se pudo guardar la pausa: ' + (err.message || 'Error desconocido')
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-[#0f171e] border border-neutral-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-neutral-200">
              {pause ? 'Editar Pausa' : 'Nueva Pausa'}
            </h3>
            <p className="text-sm text-neutral-400 mt-1">
              Configura una pausa independiente en el flujo
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-neutral-400 hover:text-neutral-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Tipo de Pausa */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Tipo de Pausa <span className="text-red-400">*</span>
            </label>
            <select
              value={pauseType}
              onChange={(e) => {
                setPauseType(e.target.value);
                if (e.target.value !== 'until_days_without_response') {
                  setDaysWithoutResponse(null);
                }
                // FASE 2: Limpiar campos de interrupción si no es fixed_delay
                if (e.target.value !== 'fixed_delay') {
                  setEnableInterrupt(false);
                  setInterruptType('any_message');
                  setInterruptKeywords([]);
                  setCurrentKeyword('');
                  setDelayAfterInterrupt('');
                }
                setErrors({});
              }}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#e7922b]"
            >
              <option value="fixed_delay">Delay fijo (horas desde paso anterior)</option>
              <option value="until_message">Pausar hasta recibir mensaje del cliente</option>
              <option value="until_days_without_response">Pausar hasta X días sin respuesta</option>
            </select>
            <div className="mt-2 space-y-1">
              {pauseType === 'fixed_delay' && (
                <p className="text-xs text-neutral-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  La pausa esperará X horas desde el paso anterior antes de continuar
                </p>
              )}
              {pauseType === 'until_message' && (
                <p className="text-xs text-neutral-500 flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  La pausa esperará hasta que el cliente responda antes de continuar
                </p>
              )}
              {pauseType === 'until_days_without_response' && (
                <p className="text-xs text-neutral-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  La pausa esperará X días sin respuesta del cliente antes de continuar
                </p>
              )}
            </div>
          </div>

          {/* Delay fijo (solo para fixed_delay) */}
          {pauseType === 'fixed_delay' && (
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Tiempo de Pausa (HH:MM) <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={delayTime}
                onChange={(e) => {
                  let value = e.target.value;
                  
                  // Permitir solo números y dos puntos
                  value = value.replace(/[^\d:]/g, '');
                  
                  // Limitar formato HH:MM (permitir hasta 999 horas)
                  if (value.length > 7) {
                    value = value.slice(0, 7);
                  }
                  
                  // Auto-formatear con dos puntos
                  if (value.length >= 2 && !value.includes(':')) {
                    if (value.length >= 3) {
                      value = value.slice(0, 2) + ':' + value.slice(2);
                    }
                  }
                  
                  // Validar minutos (00-59)
                  if (value.includes(':')) {
                    const [hours, minutes] = value.split(':');
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
                  let value = e.target.value;
                  if (value && !value.includes(':')) {
                    if (value.length <= 2) {
                      value = value.padStart(2, '0') + ':00';
                    } else if (value.length === 3) {
                      value = value.slice(0, 2) + ':' + value.slice(2) + '0';
                    } else if (value.length === 4) {
                      value = value.slice(0, 2) + ':' + value.slice(2);
                    } else if (value.length >= 5) {
                      const minutes = value.slice(-2);
                      const hours = value.slice(0, -2);
                      value = hours + ':' + minutes;
                    }
                  } else if (value.includes(':')) {
                    const [hours, minutes] = value.split(':');
                    const formattedHours = hours || '0';
                    const formattedMinutes = (minutes || '').padEnd(2, '0').slice(0, 2);
                    value = formattedHours + ':' + formattedMinutes;
                  }
                  setDelayTime(value || '00:00');
                }}
                className={`w-full bg-neutral-800 border ${
                  errors.delayTime ? 'border-red-500' : 'border-neutral-700'
                } rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#e7922b] font-mono`}
                placeholder="HH:MM (ej: 01:45, 48:00, 168:30)"
                maxLength={7}
              />
              {errors.delayTime && (
                <p className="text-xs text-red-400 mt-1">{errors.delayTime}</p>
              )}
              <p className="text-xs text-neutral-500 mt-1">
                Tiempo en formato HH:MM. Ej: 01:45 = 1 hora 45 minutos, 48:00 = 2 días, 168:30 = 1 semana 30 minutos
              </p>
            </div>
          )}

          {/* Días sin respuesta (solo para until_days_without_response) */}
          {pauseType === 'until_days_without_response' && (
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Días sin respuesta requeridos <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                value={daysWithoutResponse || ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? null : Math.max(1, parseInt(e.target.value) || 1);
                  setDaysWithoutResponse(value);
                  if (errors.daysWithoutResponse) {
                    setErrors(prev => {
                      const newErrors = { ...prev };
                      delete newErrors.daysWithoutResponse;
                      return newErrors;
                    });
                  }
                }}
                min="1"
                step="1"
                className={`w-full bg-neutral-800 border ${
                  errors.daysWithoutResponse ? 'border-red-500' : 'border-neutral-700'
                } rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#e7922b]`}
                placeholder="Ej: 3"
              />
              {errors.daysWithoutResponse && (
                <p className="text-xs text-red-400 mt-1">{errors.daysWithoutResponse}</p>
              )}
              <p className="text-xs text-neutral-500 mt-1">
                La pausa esperará esta cantidad de días sin respuesta del cliente antes de continuar
              </p>
            </div>
          )}

          {/* FASE 2: Interrupción (solo para fixed_delay) */}
          {pauseType === 'fixed_delay' && (
            <div className="border-t border-neutral-800 pt-4">
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center gap-2 text-sm font-medium text-neutral-300">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  Interrumpir pausa si llega mensaje
                </label>
                {/* Toggle Switch tipo cápsula */}
                <button
                  type="button"
                  onClick={() => {
                    const newValue = !enableInterrupt;
                    setEnableInterrupt(newValue);
                    if (!newValue) {
                      setInterruptType('any_message');
                      setInterruptKeywords([]);
                      setCurrentKeyword('');
                      setDelayAfterInterrupt('');
                    }
                    if (errors.interruptKeywords || errors.delayAfterInterrupt) {
                      setErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.interruptKeywords;
                        delete newErrors.delayAfterInterrupt;
                        return newErrors;
                      });
                    }
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#e7922b] focus:ring-offset-2 focus:ring-offset-[#0f171e] ${
                    enableInterrupt ? 'bg-[#e7922b]' : 'bg-neutral-600'
                  }`}
                  role="switch"
                  aria-checked={enableInterrupt}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      enableInterrupt ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                  <span className="sr-only">Interrumpir pausa</span>
                </button>
              </div>
              
              {enableInterrupt && (
                <div className="space-y-4 bg-neutral-800/50 rounded-lg p-4 mt-3">
                  {/* Selector de tipo de interrupción */}
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-2">
                      Tipo de interrupción
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setInterruptType('any_message');
                          setInterruptKeywords([]);
                          setCurrentKeyword('');
                          if (errors.interruptKeywords) {
                            setErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors.interruptKeywords;
                              return newErrors;
                            });
                          }
                        }}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                          interruptType === 'any_message'
                            ? 'bg-[#e7922b] text-[#1a2430]'
                            : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                        }`}
                      >
                        Cualquier respuesta
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setInterruptType('keywords');
                        }}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                          interruptType === 'keywords'
                            ? 'bg-[#e7922b] text-[#1a2430]'
                            : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                        }`}
                      >
                        Palabras clave específicas
                      </button>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">
                      {interruptType === 'any_message'
                        ? 'La pausa se interrumpirá con cualquier mensaje del cliente'
                        : 'La pausa se interrumpirá solo si el cliente envía un mensaje con las palabras clave especificadas'}
                    </p>
                  </div>

                  {/* Campo de keywords (solo si interruptType === 'keywords') */}
                  {interruptType === 'keywords' && (
                    <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-2">
                      Palabras clave (separadas por comas) <span className="text-red-400">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={currentKeyword}
                        onChange={(e) => setCurrentKeyword(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && currentKeyword.trim()) {
                            e.preventDefault();
                            if (!interruptKeywords.includes(currentKeyword.trim().toLowerCase())) {
                              setInterruptKeywords([...interruptKeywords, currentKeyword.trim().toLowerCase()]);
                            }
                            setCurrentKeyword('');
                            if (errors.interruptKeywords) {
                              setErrors(prev => {
                                const newErrors = { ...prev };
                                delete newErrors.interruptKeywords;
                                return newErrors;
                              });
                            }
                          }
                        }}
                        placeholder="Escribe y presiona Enter para agregar"
                        className={`flex-1 bg-neutral-700 border ${
                          errors.interruptKeywords ? 'border-red-500' : 'border-neutral-600'
                        } rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#e7922b]`}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (currentKeyword.trim()) {
                            if (!interruptKeywords.includes(currentKeyword.trim().toLowerCase())) {
                              setInterruptKeywords([...interruptKeywords, currentKeyword.trim().toLowerCase()]);
                            }
                            setCurrentKeyword('');
                            if (errors.interruptKeywords) {
                              setErrors(prev => {
                                const newErrors = { ...prev };
                                delete newErrors.interruptKeywords;
                                return newErrors;
                              });
                            }
                          }
                        }}
                        className="px-4 py-2 bg-[#e7922b] text-[#1a2430] font-medium rounded-lg hover:bg-[#d8821b] transition text-sm"
                      >
                        Agregar
                      </button>
                    </div>
                    {errors.interruptKeywords && (
                      <p className="text-xs text-red-400 mt-1">{errors.interruptKeywords}</p>
                    )}
                    <p className="text-xs text-neutral-500 mt-1">
                      Si el cliente envía un mensaje con alguna de estas palabras, la pausa se interrumpirá
                    </p>
                    
                    {/* Lista de keywords agregadas */}
                    {interruptKeywords.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {interruptKeywords.map((keyword, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-[#e7922b]/20 text-[#e7922b] rounded text-xs"
                          >
                            {keyword}
                            <button
                              type="button"
                              onClick={() => {
                                setInterruptKeywords(interruptKeywords.filter((_, i) => i !== index));
                              }}
                              className="hover:text-red-400 transition"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  )}
                  
                  {/* Delay opcional después de interrupción */}
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-2">
                      Delay después de interrupción (HH:MM) - Opcional
                    </label>
                    <input
                      type="text"
                      value={delayAfterInterrupt}
                      onChange={(e) => {
                        let value = e.target.value;
                        value = value.replace(/[^\d:]/g, '');
                        if (value.length > 7) {
                          value = value.slice(0, 7);
                        }
                        if (value.length >= 2 && !value.includes(':')) {
                          if (value.length >= 3) {
                            value = value.slice(0, 2) + ':' + value.slice(2);
                          }
                        }
                        if (value.includes(':')) {
                          const [hours, minutes] = value.split(':');
                          if (minutes && minutes.length === 2 && parseInt(minutes) > 59) {
                            value = hours + ':59';
                          }
                        }
                        setDelayAfterInterrupt(value);
                        if (errors.delayAfterInterrupt) {
                          setErrors(prev => {
                            const newErrors = { ...prev };
                            delete newErrors.delayAfterInterrupt;
                            return newErrors;
                          });
                        }
                      }}
                      onBlur={(e) => {
                        let value = e.target.value;
                        if (value && !value.includes(':')) {
                          if (value.length <= 2) {
                            value = value.padStart(2, '0') + ':00';
                          } else if (value.length === 3) {
                            value = value.slice(0, 2) + ':' + value.slice(2) + '0';
                          } else if (value.length === 4) {
                            value = value.slice(0, 2) + ':' + value.slice(2);
                          }
                        } else if (value.includes(':')) {
                          const [hours, minutes] = value.split(':');
                          const formattedHours = hours || '0';
                          const formattedMinutes = (minutes || '').padEnd(2, '0').slice(0, 2);
                          value = formattedHours + ':' + formattedMinutes;
                        }
                        setDelayAfterInterrupt(value || '');
                      }}
                      className={`w-full bg-neutral-700 border ${
                        errors.delayAfterInterrupt ? 'border-red-500' : 'border-neutral-600'
                      } rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#e7922b] font-mono`}
                      placeholder="HH:MM (ej: 01:00, 00:30)"
                      maxLength={7}
                    />
                    {errors.delayAfterInterrupt && (
                      <p className="text-xs text-red-400 mt-1">{errors.delayAfterInterrupt}</p>
                    )}
                    <p className="text-xs text-neutral-500 mt-1">
                      Si se especifica, esperará este tiempo después de recibir el mensaje que interrumpe
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Información adicional */}
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-neutral-300">
                <p className="font-medium text-yellow-400 mb-1">Nota sobre pausas consecutivas</p>
                <p className="text-neutral-400">
                  Si agregas múltiples pausas consecutivas, sus tiempos se sumarán automáticamente. 
                  Ejemplo: Pausa 1h + Pausa 2h = 3h total de espera.
                </p>
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-2 pt-4">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 px-4 py-2 bg-[#e7922b] text-[#1a2430] font-semibold rounded-lg hover:bg-[#d8821b] transition flex items-center justify-center gap-2"
            >
              <Clock className="w-4 h-4" />
              {pause ? 'Actualizar' : 'Agregar'} Pausa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


