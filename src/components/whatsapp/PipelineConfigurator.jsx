/**
 * Configurador de Pipelines
 * FASE 4: SUBFASE 4.1 - Configurador de pipelines
 * 
 * Permite editar nombres, colores, agregar/quitar etapas del pipeline
 */

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Edit2, GripVertical, Palette, Zap } from 'lucide-react';
import { useToast } from '../ToastProvider';
import { getPipelineByProduct, updatePipeline, restoreDefaultPipeline } from '../../services/whatsapp/pipelines';
import { getUserSkus, isAdmin, getUserProducts } from '../../utils/whatsapp/user-products';
import { getProducts } from '../../services/whatsapp/accounts';
import { getSequences } from '../../services/whatsapp/sequences';
import { getAllAccounts } from '../../services/whatsapp/accounts';

export default function PipelineConfigurator({ productId, onClose, onUpdate, session }) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pipeline, setPipeline] = useState(null);
  const [stages, setStages] = useState([]);
  const [editingStage, setEditingStage] = useState(null);
  const [newStageName, setNewStageName] = useState('');
  const [newStageColor, setNewStageColor] = useState('#3b82f6');
  // FASE 3: SUBFASE 3.1 - Secuencias disponibles para este producto
  const [availableSequences, setAvailableSequences] = useState([]);
  const [loadingSequences, setLoadingSequences] = useState(false);
  const [sequencesMap, setSequencesMap] = useState(new Map()); // Map para buscar secuencia por ID

  const userSkus = getUserSkus(session);

  useEffect(() => {
    if (productId) {
      loadPipeline();
      loadAvailableSequences();
    }
  }, [productId]);

  // FASE 3: SUBFASE 3.1 - Cargar secuencias disponibles para el producto
  const loadAvailableSequences = async () => {
    if (!productId) return;
    
    try {
      setLoadingSequences(true);
      
      // 1. Obtener WhatsApp Account del producto
      const { data: accounts, error: accountsError } = await getAllAccounts(userSkus);
      
      if (accountsError) {
        console.warn('[PipelineConfigurator] Error cargando cuentas:', accountsError);
        setAvailableSequences([]);
        return;
      }
      
      // Buscar cuenta del producto
      const productAccount = accounts?.find(acc => acc.product_id === productId);
      
      if (!productAccount || !productAccount.id) {
        console.warn('[PipelineConfigurator] No hay cuenta WhatsApp para este producto');
        setAvailableSequences([]);
        return;
      }
      
      // 2. Obtener secuencias de la cuenta
      const { data: sequences, error: sequencesError } = await getSequences(productAccount.id, userSkus);
      
      if (sequencesError) {
        console.warn('[PipelineConfigurator] Error cargando secuencias:', sequencesError);
        setAvailableSequences([]);
        return;
      }
      
      // Solo secuencias activas
      const activeSequences = (sequences || []).filter(seq => seq.active !== false);
      setAvailableSequences(activeSequences);
      
      // Crear mapa para búsqueda rápida
      const map = new Map();
      (sequences || []).forEach(seq => {
        map.set(seq.id, seq);
      });
      setSequencesMap(map);
      
    } catch (err) {
      console.error('[PipelineConfigurator] Error cargando secuencias:', err);
      setAvailableSequences([]);
      setSequencesMap(new Map());
    } finally {
      setLoadingSequences(false);
    }
  };

  const loadPipeline = async () => {
    try {
      setLoading(true);
      const { data, error } = await getPipelineByProduct(productId);

      if (error) {
        throw error;
      }

      if (data && data.stages) {
        setPipeline(data);
        // Ordenar etapas por order
        const sortedStages = Array.isArray(data.stages)
          ? data.stages.sort((a, b) => (a.order || 0) - (b.order || 0))
          : [];
        setStages(sortedStages);
      } else {
        // Si no hay pipeline, crear uno por defecto
        const defaultStages = [
          { name: 'Leads Entrantes', order: 1, color: '#3b82f6', sequence_id: null },
          { name: 'Seguimiento', order: 2, color: '#f59e0b', sequence_id: null },
          { name: 'Venta', order: 3, color: '#10b981', sequence_id: null },
          { name: 'Cliente', order: 4, color: '#8b5cf6', sequence_id: null }
        ];
        setStages(defaultStages);
      }
    } catch (err) {
      console.error('[PipelineConfigurator] Error cargando pipeline:', err);
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'No se pudo cargar las etapas'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!pipeline) {
      // Si no hay pipeline, no podemos guardar
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'No hay etapas para actualizar'
      });
      return;
    }

    if (stages.length === 0) {
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'Debe haber al menos una etapa'
      });
      return;
    }

    try {
      setSaving(true);
      const { data, error } = await updatePipeline(pipeline.id, {
        stages: stages
      });

      if (error) {
        throw error;
      }

      toast.push({
        type: 'success',
        title: 'Éxito',
        message: 'Etapas actualizadas correctamente'
      });

      if (onUpdate) onUpdate();
      onClose();
    } catch (err) {
      console.error('[PipelineConfigurator] Error guardando:', err);
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'No se pudo actualizar las etapas: ' + (err.message || 'Error desconocido')
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRestoreDefault = async () => {
    if (!window.confirm('¿Estás seguro de que deseas restaurar las etapas por defecto? Se perderán todos los cambios.')) {
      return;
    }

    try {
      setSaving(true);
      const { data, error } = await restoreDefaultPipeline(productId);

      if (error) {
        throw error;
      }

      toast.push({
        type: 'success',
        title: 'Éxito',
        message: 'Etapas restauradas correctamente'
      });

      loadPipeline();
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('[PipelineConfigurator] Error restaurando:', err);
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'No se pudo restaurar las etapas: ' + (err.message || 'Error desconocido')
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddStage = () => {
    if (!newStageName.trim()) {
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'El nombre de la etapa es requerido'
      });
      return;
    }

    // Verificar que no exista una etapa con el mismo nombre
    if (stages.some(s => s.name.toLowerCase() === newStageName.trim().toLowerCase())) {
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'Ya existe una etapa con ese nombre'
      });
      return;
    }

    const newOrder = stages.length > 0 ? Math.max(...stages.map(s => s.order || 0)) + 1 : 1;
    const newStage = {
      name: newStageName.trim(),
      order: newOrder,
      color: newStageColor,
      sequence_id: null // FASE 3: SUBFASE 3.1 - Sin secuencia por defecto
    };

    setStages([...stages, newStage]);
    setNewStageName('');
    setNewStageColor('#3b82f6');
  };

  // FASE 2: Función para verificar si es etapa protegida
  const isProtectedStage = (stageName) => {
    return stageName === 'Leads Entrantes' || 
           stageName.toLowerCase().includes('entrantes');
  };

  const handleDeleteStage = (index) => {
    const stage = stages[index];
    
    // FASE 2: Proteger etapa "Leads Entrantes"
    if (isProtectedStage(stage.name)) {
      toast.push({
        type: 'warning',
        title: 'Etapa protegida',
        message: 'No se puede eliminar la etapa "Leads Entrantes"'
      });
      return;
    }
    
    if (stages.length <= 1) {
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'Debe haber al menos una etapa'
      });
      return;
    }

    if (!window.confirm(`¿Estás seguro de que deseas eliminar la etapa "${stage.name}"?`)) {
      return;
    }

    const updatedStages = stages.filter((_, i) => i !== index);
    // Reordenar
    const reorderedStages = updatedStages.map((stage, i) => ({
      ...stage,
      order: i + 1
    }));
    setStages(reorderedStages);
  };

  const handleUpdateStage = (index, updates) => {
    const updatedStages = [...stages];
    updatedStages[index] = {
      ...updatedStages[index],
      ...updates
    };
    setStages(updatedStages);
    setEditingStage(null);
  };

  const handleMoveStage = (index, direction) => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === stages.length - 1)
    ) {
      return;
    }

    const updatedStages = [...stages];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [updatedStages[index], updatedStages[newIndex]] = [updatedStages[newIndex], updatedStages[index]];

    // Reordenar
    const reorderedStages = updatedStages.map((stage, i) => ({
      ...stage,
      order: i + 1
    }));

    setStages(reorderedStages);
  };

  const predefinedColors = [
    '#3b82f6', // Azul
    '#f59e0b', // Naranja
    '#10b981', // Verde
    '#8b5cf6', // Morado
    '#ef4444', // Rojo
    '#ec4899', // Rosa
    '#06b6d4', // Cyan
    '#f97316', // Naranja oscuro
    '#84cc16', // Verde lima
    '#6366f1'  // Índigo
  ];

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-[#0f171e] border border-neutral-800 rounded-xl p-6 w-full max-w-2xl">
          <div className="text-center text-neutral-400">Cargando etapas...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-[#0f171e] border border-neutral-800 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-800">
          <div>
            <h3 className="text-lg font-semibold text-neutral-200 flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-[#e7922b]" />
              Configurar Etapa
            </h3>
            <p className="text-sm text-neutral-400 mt-1">
              Edita las etapas de leads
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Etapas existentes */}
          <div>
            <h4 className="text-sm font-semibold text-neutral-300 mb-4">Etapas</h4>
            <div className="space-y-2">
              {stages.map((stage, index) => (
                <div
                  key={index}
                  className="bg-neutral-800 border border-neutral-700 rounded-lg p-4"
                >
                  {editingStage === index ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-neutral-400 mb-1 flex items-center gap-2">
                          Nombre
                          {isProtectedStage(stage.name) && (
                            <span className="text-xs text-blue-400 flex items-center gap-1">
                              🔒 Etapa protegida
                            </span>
                          )}
                        </label>
                        <input
                          type="text"
                          value={stage.name}
                          onChange={(e) => {
                            // FASE 2: Prevenir cambios en etapa protegida
                            if (isProtectedStage(stage.name)) {
                              toast.push({
                                type: 'warning',
                                title: 'Etapa protegida',
                                message: 'No se puede cambiar el nombre de la etapa "Leads Entrantes"'
                              });
                              return;
                            }
                            const updated = [...stages];
                            updated[index].name = e.target.value;
                            setStages(updated);
                          }}
                          disabled={isProtectedStage(stage.name)}
                          className={`w-full bg-neutral-700 border border-neutral-600 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#e7922b] ${
                            isProtectedStage(stage.name) ? 'opacity-60 cursor-not-allowed' : ''
                          }`}
                          autoFocus={!isProtectedStage(stage.name)}
                        />
                        {isProtectedStage(stage.name) && (
                          <p className="text-xs text-neutral-500 mt-1">
                            Esta etapa es obligatoria y no se puede modificar
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-400 mb-2">
                          Color
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={stage.color || '#3b82f6'}
                            onChange={(e) => {
                              const updated = [...stages];
                              updated[index].color = e.target.value;
                              setStages(updated);
                            }}
                            className="w-12 h-10 rounded-lg border border-neutral-600 cursor-pointer"
                          />
                          <div className="flex gap-1 flex-wrap">
                            {predefinedColors.map(color => (
                              <button
                                key={color}
                                onClick={() => {
                                  const updated = [...stages];
                                  updated[index].color = color;
                                  setStages(updated);
                                }}
                                className={`w-8 h-8 rounded-lg border-2 transition ${
                                  stage.color === color
                                    ? 'border-[#e7922b] scale-110'
                                    : 'border-neutral-600 hover:border-neutral-500'
                                }`}
                                style={{ backgroundColor: color }}
                                title={color}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      {/* FASE 3: SUBFASE 3.1 - Selector de secuencia por etapa */}
                      <div>
                        <label className="block text-xs font-medium text-neutral-400 mb-1 flex items-center gap-2">
                          <Zap className="w-3 h-3 text-[#e7922b]" />
                          Flujo Automático (Opcional)
                        </label>
                        <select
                          value={stage.sequence_id || ''}
                          onChange={(e) => {
                            const updated = [...stages];
                            updated[index].sequence_id = e.target.value || null;
                            setStages(updated);
                          }}
                          className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#e7922b]"
                        >
                          <option value="">Sin flujo</option>
                          {loadingSequences ? (
                            <option disabled>Cargando flujos...</option>
                          ) : availableSequences.length === 0 ? (
                            <option disabled>No hay flujos disponibles</option>
                          ) : (
                            availableSequences.map(seq => (
                              <option key={seq.id} value={seq.id}>
                                {seq.name} {seq.active === false ? '(Inactiva)' : ''}
                              </option>
                            ))
                          )}
                        </select>
                        <p className="text-xs text-neutral-500 mt-1">
                          Al mover un lead a esta etapa, se iniciará automáticamente este flujo
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingStage(null)}
                          className="flex-1 px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded-lg transition text-sm"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={() => {
                            setEditingStage(null);
                            loadPipeline(); // Restaurar
                          }}
                          className="px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded-lg transition text-sm"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <GripVertical className="w-5 h-5 text-neutral-500 cursor-move" />
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: stage.color || '#3b82f6' }}
                        />
                        <div>
                          <div className="text-sm font-medium text-neutral-200 flex items-center gap-2">
                            {stage.name}
                            {isProtectedStage(stage.name) && (
                              <span className="text-xs text-blue-400" title="Etapa protegida">
                                🔒
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-neutral-400">
                            Orden: {stage.order}
                            {stage.sequence_id && (
                              <span className="ml-2 text-[#e7922b] flex items-center gap-1">
                                <Zap className="w-3 h-3" />
                                {sequencesMap.get(stage.sequence_id)?.name || 'Flujo asignado'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleMoveStage(index, 'up')}
                          disabled={index === 0}
                          className="px-2 py-1 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded transition text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Mover arriba"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => handleMoveStage(index, 'down')}
                          disabled={index === stages.length - 1}
                          className="px-2 py-1 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded transition text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Mover abajo"
                        >
                          ↓
                        </button>
                        <button
                          onClick={() => setEditingStage(index)}
                          className="px-2 py-1 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded transition text-xs"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteStage(index)}
                          disabled={stages.length <= 1 || isProtectedStage(stage.name)}
                          className="px-2 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded transition text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                          title={isProtectedStage(stage.name) ? 'No se puede eliminar la etapa protegida' : 'Eliminar'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Agregar nueva etapa */}
          <div className="border-t border-neutral-800 pt-6">
            <h4 className="text-sm font-semibold text-neutral-300 mb-4">Agregar Nueva Etapa</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">
                  Nombre de la Etapa
                </label>
                <input
                  type="text"
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddStage();
                    }
                  }}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#e7922b]"
                  placeholder="Ej: Calificación"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-2">
                  Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newStageColor}
                    onChange={(e) => setNewStageColor(e.target.value)}
                    className="w-12 h-10 rounded-lg border border-neutral-600 cursor-pointer"
                  />
                  <div className="flex gap-1 flex-wrap">
                    {predefinedColors.map(color => (
                      <button
                        key={color}
                        onClick={() => setNewStageColor(color)}
                        className={`w-8 h-8 rounded-lg border-2 transition ${
                          newStageColor === color
                            ? 'border-[#e7922b] scale-110'
                            : 'border-neutral-600 hover:border-neutral-500'
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={handleAddStage}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg transition text-sm"
              >
                <Plus className="w-4 h-4" />
                Agregar Etapa
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-neutral-800">
          <button
            onClick={handleRestoreDefault}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg transition text-sm"
            disabled={saving}
          >
            Restaurar por Defecto
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg transition text-sm"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !pipeline}
              className="flex items-center gap-2 px-4 py-2 bg-[#e7922b] hover:bg-[#d8821b] text-[#1a2430] font-semibold rounded-lg transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

