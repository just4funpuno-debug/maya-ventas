/**
 * Formulario para agregar/editar un paso de cambio de etapa
 * FASE 4: Formulario de Cambio de Etapa
 * 
 * Permite configurar un cambio automático de etapa como elemento independiente del flujo
 */

import React, { useState, useEffect } from 'react';
import { X, ArrowRightCircle, Info, AlertCircle, Zap } from 'lucide-react';
import { useToast } from '../ToastProvider';
import { getPipelineStages } from '../../services/whatsapp/pipelines';
import { getAccountById } from '../../services/whatsapp/accounts';
import { getSequenceById } from '../../services/whatsapp/sequences';

export default function StageChangeStepForm({ stageChange = null, sequence = null, onSave, onCancel }) {
  const toast = useToast();
  const [selectedStage, setSelectedStage] = useState('');
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productId, setProductId] = useState(null);
  const [errors, setErrors] = useState({});
  const [stagesWithSequence, setStagesWithSequence] = useState(new Map()); // Map de etapa → secuencia

  // Obtener productId desde la secuencia
  useEffect(() => {
    const loadProductId = async () => {
      if (!sequence || !sequence.account_id) {
        toast.push({
          type: 'error',
          title: 'Error',
          message: 'No se pudo obtener la información del producto. La secuencia no tiene cuenta asociada.'
        });
        setLoading(false);
        return;
      }

      try {
        // Obtener la cuenta para obtener el product_id
        const { data: account, error: accountError } = await getAccountById(sequence.account_id);
        
        if (accountError || !account) {
          throw accountError || new Error('Cuenta no encontrada');
        }

        if (!account.product_id) {
          toast.push({
            type: 'warning',
            title: 'Advertencia',
            message: 'La cuenta no tiene producto asociado. No se pueden cargar las etapas.'
          });
          setLoading(false);
          return;
        }

        setProductId(account.product_id);
      } catch (err) {
        console.error('[StageChangeStepForm] Error obteniendo product_id:', err);
        toast.push({
          type: 'error',
          title: 'Error',
          message: 'No se pudo obtener la información del producto: ' + (err.message || 'Error desconocido')
        });
        setLoading(false);
      }
    };

    loadProductId();
  }, [sequence]);

  // Cargar etapas cuando tengamos el productId
  useEffect(() => {
    const loadStages = async () => {
      if (!productId) return;

      try {
        setLoading(true);
        const { data: pipelineStages, error } = await getPipelineStages(productId);

        if (error) {
          throw error;
        }

        if (!pipelineStages || pipelineStages.length === 0) {
          toast.push({
            type: 'info',
            title: 'Sin etapas',
            message: 'Este producto no tiene etapas configuradas. Configúralas primero en el CRM.'
          });
          setStages([]);
          setLoading(false);
          return;
        }

        setStages(pipelineStages || []);

        // Crear mapa de etapas con sus secuencias para mostrar información
        const map = new Map();
        pipelineStages.forEach(stage => {
          if (stage.sequence_id) {
            map.set(stage.name, stage.sequence_id);
          }
        });
        setStagesWithSequence(map);

        // Si estamos editando, establecer la etapa seleccionada
        if (stageChange && stageChange.target_stage_name) {
          setSelectedStage(stageChange.target_stage_name);
        }

        setLoading(false);
      } catch (err) {
        console.error('[StageChangeStepForm] Error cargando etapas:', err);
        toast.push({
          type: 'error',
          title: 'Error',
          message: 'No se pudieron cargar las etapas: ' + (err.message || 'Error desconocido')
        });
        setStages([]);
        setLoading(false);
      }
    };

    loadStages();
  }, [productId, stageChange]);

  const handleSubmit = async () => {
    const newErrors = {};

    if (!selectedStage || selectedStage.trim() === '') {
      newErrors.stage = 'Debes seleccionar una etapa destino';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const stageChangeData = {
        step_type: 'stage_change',
        message_type: null, // Los cambios de etapa no tienen message_type
        content_text: null,
        media_url: null,
        caption: null,
        delay_hours_from_previous: 0, // Cambio inmediato
        pause_type: null,
        days_without_response: null,
        target_stage_name: selectedStage.trim(),
        condition_type: 'none',
        next_message_if_true: null,
        next_message_if_false: null,
      };

      onSave(stageChangeData);
    } catch (err) {
      console.error('[StageChangeStepForm] Error guardando cambio de etapa:', err);
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'No se pudo guardar el cambio de etapa: ' + (err.message || 'Error desconocido')
      });
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
        <div className="bg-[#0f171e] border border-neutral-800 rounded-xl p-6 w-full max-w-md">
          <div className="flex items-center justify-center gap-3 text-neutral-400">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#e7922b]"></div>
            <span>Cargando etapas disponibles...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-[#0f171e] border border-neutral-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-neutral-200">
            {stageChange ? 'Editar Cambio de Etapa' : 'Nuevo Cambio de Etapa'}
          </h3>
          <button
            onClick={onCancel}
            className="text-neutral-400 hover:text-neutral-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Información */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-neutral-300">
                  Cuando el flujo llegue a este paso, moverá automáticamente el lead o contacto a la etapa seleccionada.
                  Si la etapa tiene un flujo asignado, se detendrá el flujo actual y se iniciará el nuevo.
                </p>
              </div>
            </div>
          </div>

          {/* Selector de Etapa */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Etapa Destino <span className="text-red-400">*</span>
            </label>
            {stages.length === 0 ? (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-neutral-300 mb-2">
                      Este producto no tiene etapas configuradas. Debes configurar las etapas primero en el CRM.
                    </p>
                    <p className="text-xs text-neutral-400">
                      Ve a CRM → Etapa para configurar las etapas del pipeline.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <select
                  value={selectedStage}
                  onChange={(e) => {
                    setSelectedStage(e.target.value);
                    if (errors.stage) {
                      setErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.stage;
                        return newErrors;
                      });
                    }
                  }}
                  className={`w-full bg-neutral-800 border ${
                    errors.stage ? 'border-red-500' : 'border-neutral-700'
                  } rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#e7922b]`}
                >
                  <option value="">Selecciona una etapa...</option>
                  {stages.map((stage) => (
                    <option key={stage.name} value={stage.name}>
                      {stage.name}
                    </option>
                  ))}
                </select>
                {errors.stage && (
                  <p className="text-xs text-red-400 mt-1">{errors.stage}</p>
                )}

                {/* Información sobre flujo asignado a la etapa */}
                {selectedStage && stagesWithSequence.has(selectedStage) && (
                  <div className="mt-3 bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-green-400" />
                      <p className="text-xs text-neutral-300">
                        Esta etapa tiene un flujo asignado. Al mover el lead a esta etapa, se iniciará automáticamente ese flujo.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
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
              disabled={!selectedStage || stages.length === 0}
              className="flex-1 px-4 py-2 bg-[#e7922b] text-[#1a2430] font-semibold rounded-lg hover:bg-[#d8821b] transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowRightCircle className="w-4 h-4" />
              {stageChange ? 'Actualizar Cambio de Etapa' : 'Agregar Cambio de Etapa'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}



