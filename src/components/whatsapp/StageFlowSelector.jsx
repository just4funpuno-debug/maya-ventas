/**
 * Componente Modal para Seleccionar Flujo de una Etapa
 * FASE 1: SUBFASE 1.2 - Modal rápido para asignar flujos desde el Kanban
 * 
 * Permite seleccionar o quitar un flujo asignado a una etapa específica
 * desde el header de cada columna en el Kanban
 */

import React, { useState, useEffect } from 'react';
import { X, Zap, Loader2 } from 'lucide-react';
import { useToast } from '../ToastProvider';
import { updateStageSequence } from '../../services/whatsapp/pipelines';
import { getSequences } from '../../services/whatsapp/sequences';
import { getAllAccounts } from '../../services/whatsapp/accounts';
import { getUserSkus } from '../../utils/whatsapp/user-products';

export default function StageFlowSelector({ 
  productId, 
  stageName, 
  currentSequenceId, 
  onClose, 
  onSuccess,
  session 
}) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availableSequences, setAvailableSequences] = useState([]);
  const [selectedSequenceId, setSelectedSequenceId] = useState(currentSequenceId || '');

  const userSkus = getUserSkus(session);

  useEffect(() => {
    if (productId) {
      loadAvailableSequences();
    }
  }, [productId]);

  // Cargar secuencias disponibles para el producto
  const loadAvailableSequences = async () => {
    if (!productId) return;
    
    try {
      setLoading(true);
      
      // 1. Obtener WhatsApp Account del producto
      const { data: accounts, error: accountsError } = await getAllAccounts(userSkus);
      
      if (accountsError) {
        console.warn('[StageFlowSelector] Error cargando cuentas:', accountsError);
        setAvailableSequences([]);
        return;
      }
      
      // Buscar cuenta del producto
      const productAccount = accounts?.find(acc => acc.product_id === productId);
      
      if (!productAccount || !productAccount.id) {
        console.warn('[StageFlowSelector] No hay cuenta WhatsApp para este producto');
        setAvailableSequences([]);
        return;
      }
      
      // 2. Obtener secuencias de la cuenta
      const { data: sequences, error: sequencesError } = await getSequences(productAccount.id, userSkus);
      
      if (sequencesError) {
        console.warn('[StageFlowSelector] Error cargando secuencias:', sequencesError);
        setAvailableSequences([]);
        return;
      }
      
      // Solo secuencias activas
      const activeSequences = (sequences || []).filter(seq => seq.active !== false);
      setAvailableSequences(activeSequences);
      
    } catch (err) {
      console.error('[StageFlowSelector] Error cargando secuencias:', err);
      setAvailableSequences([]);
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'No se pudieron cargar los flujos disponibles'
      });
    } finally {
      setLoading(false);
    }
  };

  // Guardar asignación de flujo
  const handleSave = async () => {
    if (!productId || !stageName) {
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'Faltan datos requeridos'
      });
      return;
    }

    try {
      setSaving(true);
      
      // Si selectedSequenceId es vacío, quitar el flujo (null)
      const sequenceIdToSave = selectedSequenceId === '' ? null : selectedSequenceId;
      
      const { data, error } = await updateStageSequence(
        productId,
        stageName,
        sequenceIdToSave
      );

      if (error) {
        throw error;
      }

      toast.push({
        type: 'success',
        title: 'Éxito',
        message: sequenceIdToSave 
          ? 'Flujo asignado correctamente' 
          : 'Flujo removido correctamente'
      });

      if (onSuccess) {
        onSuccess();
      }
      
      onClose();
    } catch (err) {
      console.error('[StageFlowSelector] Error guardando:', err);
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'No se pudo asignar el flujo: ' + (err.message || 'Error desconocido')
      });
    } finally {
      setSaving(false);
    }
  };

  // Obtener nombre de la secuencia actual
  const getCurrentSequenceName = () => {
    if (!selectedSequenceId) return null;
    const seq = availableSequences.find(s => s.id === selectedSequenceId);
    return seq ? seq.name : null;
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0f171e] border border-neutral-800 rounded-xl w-full max-w-md shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#e7922b]" />
            <h3 className="text-lg font-semibold text-neutral-200">
              Asignar Flujo a Etapa
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-4">
          {/* Información de la etapa */}
          <div className="bg-neutral-800/50 rounded-lg p-3 border border-neutral-700">
            <p className="text-xs text-neutral-400 mb-1">Etapa</p>
            <p className="text-sm font-medium text-neutral-200">{stageName}</p>
          </div>

          {/* Selector de flujos */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Seleccionar Flujo
            </label>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-[#e7922b] animate-spin" />
                <span className="ml-2 text-sm text-neutral-400">Cargando flujos...</span>
              </div>
            ) : (
              <>
                <select
                  value={selectedSequenceId}
                  onChange={(e) => setSelectedSequenceId(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#e7922b]"
                >
                  <option value="">Sin flujo</option>
                  {availableSequences.length === 0 ? (
                    <option disabled>No hay flujos disponibles</option>
                  ) : (
                    availableSequences.map(seq => (
                      <option key={seq.id} value={seq.id}>
                        {seq.name}
                      </option>
                    ))
                  )}
                </select>
                <p className="text-xs text-neutral-500 mt-2">
                  Los leads que ingresen a esta etapa iniciarán automáticamente el flujo seleccionado
                </p>
              </>
            )}
          </div>

          {/* Flujo actual (si existe) */}
          {getCurrentSequenceName() && (
            <div className="bg-[#e7922b]/10 border border-[#e7922b]/30 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#e7922b]" />
                <span className="text-sm text-neutral-300">
                  Flujo actual: <span className="font-medium text-[#e7922b]">{getCurrentSequenceName()}</span>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-neutral-800">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-4 py-2 bg-[#e7922b] hover:bg-[#d8821b] text-[#1a2430] font-semibold rounded-lg transition text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
