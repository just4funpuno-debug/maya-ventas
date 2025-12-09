/**
 * Modal de detalle de lead
 * FASE 3: SUBFASE 3.4 - Modal de detalle de lead
 * 
 * Muestra información completa del lead, actividades, y permite editar
 */

import React, { useState, useEffect } from 'react';
import { X, User, Phone, DollarSign, Calendar, MessageSquare, Edit, Save, XCircle, Plus, FileText, Package, Zap, Play, Pause, Square, Loader2 } from 'lucide-react';
import { useToast } from '../ToastProvider';
import { 
  getLeadById, 
  getLeadActivities, 
  addLeadActivity, 
  updateLead,
  assignSequenceToLead,
  getLeadSequence,
  pauseLeadSequence,
  resumeLeadSequence,
  stopLeadSequence
} from '../../services/whatsapp/leads';
import { getSequences } from '../../services/whatsapp/sequences';
import { getUserSkus } from '../../utils/whatsapp/user-products';
import SalesHistory from './SalesHistory';
import { getContactSales } from '../../services/whatsapp/sales-integration';

export default function LeadDetailModal({ leadId, productId, onClose, onUpdate, session }) {
  const toast = useToast();
  const [lead, setLead] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    estimated_value: 0,
    notes: '',
    lead_score: 0
  });
  const [newActivity, setNewActivity] = useState({
    type: 'note',
    content: ''
  });
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [sales, setSales] = useState([]);
  const [salesLoading, setSalesLoading] = useState(false);
  
  // FASE 2: Estados para gestión de secuencias
  const [leadSequence, setLeadSequence] = useState(null);
  const [loadingSequence, setLoadingSequence] = useState(false);
  const [showSequenceSelector, setShowSequenceSelector] = useState(false);
  const [availableSequences, setAvailableSequences] = useState([]);
  const [selectingSequence, setSelectingSequence] = useState(false);

  const userSkus = getUserSkus(session);

  useEffect(() => {
    if (leadId) {
      loadLead();
      loadActivities();
    }
  }, [leadId]);

  useEffect(() => {
    if (lead && lead.contact_id) {
      loadSales();
    }
  }, [lead?.contact_id]);

  // FASE 2: Cargar información de secuencia cuando se carga el lead
  useEffect(() => {
    if (lead && lead.id) {
      loadLeadSequence();
    } else {
      // Resetear estado de secuencia si no hay lead
      setLeadSequence(null);
      setLoadingSequence(false);
    }
  }, [lead?.id]);

  // FASE 2: Cargar secuencias disponibles cuando se abre el selector
  useEffect(() => {
    if (showSequenceSelector && lead?.account_id) {
      loadAvailableSequences();
    }
  }, [showSequenceSelector, lead?.account_id]);

  const loadLead = async () => {
    try {
      setLoading(true);
      const { data, error } = await getLeadById(leadId, userSkus);
      
      if (error) {
        throw error;
      }

      if (data) {
        setLead(data);
        setFormData({
          estimated_value: data.estimated_value || 0,
          notes: data.notes || '',
          lead_score: data.lead_score || 0
        });
      }
    } catch (err) {
      console.error('[LeadDetailModal] Error cargando lead:', err);
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'No se pudo cargar el lead'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadActivities = async () => {
    try {
      const { data, error } = await getLeadActivities(leadId);
      
      if (error) {
        console.error('[LeadDetailModal] Error cargando actividades:', error);
        return;
      }

      setActivities(data || []);
    } catch (err) {
      console.error('[LeadDetailModal] Error fatal cargando actividades:', err);
    }
  };

  const loadSales = async () => {
    if (!lead?.contact_id) return;

    try {
      setSalesLoading(true);
      const { data, error } = await getContactSales(lead.contact_id);
      
      if (error) {
        console.error('[LeadDetailModal] Error cargando ventas:', error);
        return;
      }

      setSales(data || []);
    } catch (err) {
      console.error('[LeadDetailModal] Error fatal cargando ventas:', err);
    } finally {
      setSalesLoading(false);
    }
  };

  // Calcular total de ventas
  const totalSalesValue = sales.reduce((sum, sale) => sum + (parseFloat(sale.total) || 0), 0);

  // FASE 2: Cargar información de secuencia del lead
  const loadLeadSequence = async () => {
    if (!lead?.id) {
      setLeadSequence(null);
      setLoadingSequence(false);
      return;
    }
    
    try {
      setLoadingSequence(true);
      const { data, error } = await getLeadSequence(lead.id);
      if (error) {
        // Si hay error, no mostrar secuencia pero sí permitir asignar una nueva
        console.error('[LeadDetailModal] Error cargando secuencia:', error);
        setLeadSequence(null);
        return;
      }
      // data puede ser null si no hay secuencia asignada (esto es normal)
      setLeadSequence(data);
    } catch (err) {
      console.error('[LeadDetailModal] Error fatal cargando secuencia:', err);
      setLeadSequence(null);
    } finally {
      setLoadingSequence(false);
    }
  };

  // FASE 2: Cargar secuencias disponibles para asignar
  const loadAvailableSequences = async () => {
    if (!lead?.account_id) return;

    try {
      const { data, error } = await getSequences(lead.account_id, userSkus);
      if (error) {
        toast.push({
          type: 'error',
          title: 'Error',
          message: 'No se pudieron cargar los flujos'
        });
        return;
      }
      // Filtrar solo secuencias activas
      setAvailableSequences((data || []).filter(s => s.active));
    } catch (err) {
      console.error('[LeadDetailModal] Error cargando secuencias:', err);
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'Error al cargar flujos disponibles'
      });
    }
  };

  // FASE 2: Asignar secuencia al lead
  const handleAssignSequence = async (sequenceId) => {
    try {
      setSelectingSequence(true);
      const { success, error } = await assignSequenceToLead(
        lead.id, 
        sequenceId, 
        session?.user?.id
      );

      if (!success) {
        throw error;
      }

      toast.push({
        type: 'success',
        title: 'Éxito',
        message: 'Flujo asignado correctamente'
      });

      setShowSequenceSelector(false);
      await loadLeadSequence();
      await loadLead(); // Recargar lead para actualizar actividades
    } catch (err) {
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'No se pudo asignar el flujo: ' + (err.message || 'Error desconocido')
      });
    } finally {
      setSelectingSequence(false);
    }
  };

  // FASE 2: Pausar secuencia
  const handlePauseSequence = async () => {
    try {
      const { success, error } = await pauseLeadSequence(lead.id, session?.user?.id);
      if (!success) throw error;
      
      toast.push({
        type: 'success',
        title: 'Éxito',
        message: 'Flujo pausado'
      });
      
      await loadLeadSequence();
      await loadLead();
    } catch (err) {
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'No se pudo pausar el flujo: ' + (err.message || 'Error desconocido')
      });
    }
  };

  // FASE 2: Retomar secuencia
  const handleResumeSequence = async () => {
    try {
      const { success, error } = await resumeLeadSequence(lead.id, session?.user?.id);
      if (!success) throw error;
      
      toast.push({
        type: 'success',
        title: 'Éxito',
        message: 'Flujo retomado'
      });
      
      await loadLeadSequence();
      await loadLead();
    } catch (err) {
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'No se pudo retomar el flujo: ' + (err.message || 'Error desconocido')
      });
    }
  };

  // FASE 2: Detener secuencia
  const handleStopSequence = async () => {
    if (!confirm('¿Estás seguro de que deseas detener el flujo? Esto no se puede deshacer.')) {
      return;
    }

    try {
      const { success, error } = await stopLeadSequence(lead.id, session?.user?.id);
      if (!success) throw error;
      
      toast.push({
        type: 'success',
        title: 'Éxito',
        message: 'Flujo detenido'
      });
      
      await loadLeadSequence();
      await loadLead();
    } catch (err) {
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'No se pudo detener el flujo: ' + (err.message || 'Error desconocido')
      });
    }
  };

  const handleSave = async () => {
    try {
      const { data, error } = await updateLead(leadId, {
        estimated_value: parseFloat(formData.estimated_value) || 0,
        notes: formData.notes || null,
        lead_score: parseInt(formData.lead_score) || 0
      });

      if (error) {
        throw error;
      }

      toast.push({
        type: 'success',
        title: 'Éxito',
        message: 'Lead actualizado correctamente'
      });

      setEditing(false);
      await loadLead();
      if (lead?.contact_id) {
        await loadSales();
      }
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('[LeadDetailModal] Error guardando:', err);
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'No se pudo actualizar el lead: ' + (err.message || 'Error desconocido')
      });
    }
  };

  const handleAddActivity = async () => {
    if (!newActivity.content.trim()) {
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'El contenido de la actividad es requerido'
      });
      return;
    }

    try {
      const { data, error } = await addLeadActivity(leadId, {
        type: newActivity.type,
        content: newActivity.content.trim(),
        user_id: session?.user?.id || null
      });

      if (error) {
        throw error;
      }

      toast.push({
        type: 'success',
        title: 'Éxito',
        message: 'Actividad agregada correctamente'
      });

      setNewActivity({ type: 'note', content: '' });
      setShowAddActivity(false);
      loadActivities();
      loadLead(); // Recargar para actualizar last_activity_at
    } catch (err) {
      console.error('[LeadDetailModal] Error agregando actividad:', err);
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'No se pudo agregar la actividad: ' + (err.message || 'Error desconocido')
      });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Sin fecha';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'message':
        return <MessageSquare className="w-4 h-4" />;
      case 'note':
        return <FileText className="w-4 h-4" />;
      case 'stage_change':
        return <Calendar className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getActivityTypeLabel = (type) => {
    switch (type) {
      case 'message':
        return 'Mensaje';
      case 'note':
        return 'Nota';
      case 'stage_change':
        return 'Cambio de Etapa';
      case 'call':
        return 'Llamada';
      case 'task':
        return 'Tarea';
      case 'meeting':
        return 'Reunión';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-[#0f171e] border border-neutral-800 rounded-xl p-6 w-full max-w-2xl">
          <div className="text-center text-neutral-400">Cargando...</div>
        </div>
      </div>
    );
  }

  if (!lead) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-[#0f171e] border border-neutral-800 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-800">
          <div>
            <h3 className="text-lg font-semibold text-neutral-200 flex items-center gap-2">
              <User className="w-5 h-5 text-[#e7922b]" />
              Detalle del Lead
            </h3>
            <p className="text-sm text-neutral-400 mt-1">
              {lead.contact_name || 'Sin nombre'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg transition text-sm"
              >
                <Edit className="w-4 h-4" />
                Editar
              </button>
            ) : (
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-3 py-1.5 bg-[#e7922b] hover:bg-[#d8821b] text-[#1a2430] rounded-lg transition text-sm font-semibold"
              >
                <Save className="w-4 h-4" />
                Guardar
              </button>
            )}
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Información del Contacto */}
          <div>
            <h4 className="text-sm font-semibold text-neutral-300 mb-3">Información del Contacto</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-sm text-neutral-200">
                <User className="w-4 h-4 text-neutral-400" />
                <span>{lead.contact_name || 'Sin nombre'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-neutral-200">
                <Phone className="w-4 h-4 text-neutral-400" />
                <span>{lead.contact_phone || 'Sin teléfono'}</span>
              </div>
            </div>
          </div>

          {/* Información del Lead */}
          <div>
            <h4 className="text-sm font-semibold text-neutral-300 mb-3">Información del Lead</h4>
            <div className="space-y-4">
              {/* Valor Estimado */}
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">
                  Valor Estimado
                </label>
                {editing ? (
                  <input
                    type="number"
                    value={formData.estimated_value}
                    onChange={(e) => setFormData(prev => ({ ...prev, estimated_value: e.target.value }))}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#e7922b]"
                    placeholder="0"
                    min="0"
                    step="0.01"
                  />
                ) : (
                  <div className="flex items-center gap-2 text-sm text-[#e7922b] font-semibold">
                    <DollarSign className="w-4 h-4" />
                    <span>${(lead.estimated_value || 0).toLocaleString()}</span>
                  </div>
                )}
                {/* Mostrar total de ventas reales si hay ventas */}
                {!editing && totalSalesValue > 0 && (
                  <div className="mt-2 text-xs text-neutral-400">
                    Ventas reales: <span className="text-green-400 font-semibold">${totalSalesValue.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Lead Score */}
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">
                  Lead Score
                </label>
                {editing ? (
                  <div>
                    <input
                      type="number"
                      value={formData.lead_score}
                      onChange={(e) => setFormData(prev => ({ ...prev, lead_score: e.target.value }))}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#e7922b]"
                      placeholder="0"
                      min="0"
                      max="100"
                    />
                    <div className="mt-2 w-full bg-neutral-700 rounded-full h-2">
                      <div
                        className="bg-[#e7922b] h-2 rounded-full transition-all"
                        style={{ width: `${formData.lead_score || 0}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
                      <span>Score</span>
                      <span className="font-semibold text-neutral-200">{lead.lead_score || 0}/100</span>
                    </div>
                    <div className="w-full bg-neutral-700 rounded-full h-2">
                      <div
                        className="bg-[#e7922b] h-2 rounded-full transition-all"
                        style={{ width: `${lead.lead_score || 0}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Etapa Actual */}
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">
                  Etapa Actual
                </label>
                <div className="text-sm text-neutral-200 bg-neutral-800 px-3 py-2 rounded-lg">
                  {lead.pipeline_stage || 'Sin etapa'}
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">
                  Notas
                </label>
                {editing ? (
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={4}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#e7922b] resize-none"
                    placeholder="Agrega notas sobre este lead..."
                  />
                ) : (
                  <div className="text-sm text-neutral-200 bg-neutral-800 px-3 py-2 rounded-lg min-h-[80px] whitespace-pre-wrap">
                    {lead.notes || 'Sin notas'}
                  </div>
                )}
              </div>

              {/* Fechas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">
                    Creado
                  </label>
                  <div className="flex items-center gap-2 text-xs text-neutral-400">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(lead.created_at)}</span>
                  </div>
                </div>
                {lead.last_activity_at && (
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1">
                      Última Actividad
                    </label>
                    <div className="flex items-center gap-2 text-xs text-neutral-400">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(lead.last_activity_at)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* FASE 2: Sección de Secuencia Automática */}
          <div>
            <h4 className="text-sm font-semibold text-neutral-300 mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#e7922b]" />
              Flujo Automático
            </h4>
            <div className="bg-[#0f171e] border border-neutral-800 rounded-lg p-4">
              {loadingSequence ? (
                <div className="text-center py-4 text-neutral-400 text-sm flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Cargando información de flujo...
                </div>
              ) : leadSequence && leadSequence.sequence ? (
                <div className="space-y-3">
                  {/* Info de secuencia activa */}
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-neutral-200">
                        {leadSequence.sequence.name}
                      </p>
                      <p className="text-xs text-neutral-400 mt-1">
                        Mensaje {leadSequence.position + 1} de {leadSequence.sequence.total_messages || 'N/A'}
                        {leadSequence.started_at && (
                          <> · Iniciada {formatDate(leadSequence.started_at)}</>
                        )}
                      </p>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      leadSequence.active 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {leadSequence.active ? 'Activa' : 'Pausada'}
                    </div>
                  </div>

                  {/* Barra de progreso */}
                  {leadSequence.sequence.total_messages && (
                    <div className="w-full bg-neutral-800 rounded-full h-2">
                      <div 
                        className="bg-[#e7922b] h-2 rounded-full transition-all"
                        style={{ 
                          width: `${Math.min(
                            ((leadSequence.position + 1) / leadSequence.sequence.total_messages) * 100, 
                            100
                          )}%` 
                        }}
                      />
                    </div>
                  )}

                  {/* Botones de acción */}
                  <div className="flex gap-2">
                    {leadSequence.active ? (
                      <>
                        <button
                          onClick={handlePauseSequence}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg transition text-sm"
                        >
                          <Pause className="w-4 h-4" />
                          Pausar
                        </button>
                        <button
                          onClick={handleStopSequence}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition text-sm"
                        >
                          <Square className="w-4 h-4" />
                          Detener
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={handleResumeSequence}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#e7922b] hover:bg-[#d6821b] text-white rounded-lg transition text-sm"
                        >
                          <Play className="w-4 h-4" />
                          Retomar
                        </button>
                        <button
                          onClick={handleStopSequence}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition text-sm"
                        >
                          <Square className="w-4 h-4" />
                          Detener
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-neutral-400">
                    No hay flujo asignado. Asigna uno para enviar mensajes automáticos.
                  </p>
                  
                  {!showSequenceSelector ? (
                    <button
                      type="button"
                      onClick={() => {
                        console.log('[LeadDetailModal] Clic en Asignar Secuencia');
                        setShowSequenceSelector(true);
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#e7922b] hover:bg-[#d6821b] text-white rounded-lg transition text-sm font-medium"
                    >
                      <Zap className="w-4 h-4" />
                      Asignar Flujo
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-neutral-200">
                          Seleccionar flujo:
                        </h4>
                        <button
                          onClick={() => setShowSequenceSelector(false)}
                          className="text-xs text-neutral-400 hover:text-neutral-300"
                        >
                          Cancelar
                        </button>
                      </div>

                      {availableSequences.length === 0 ? (
                        <p className="text-sm text-neutral-400 text-center py-4">
                          No hay flujos activos disponibles
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {availableSequences.map(sequence => (
                            <button
                              key={sequence.id}
                              onClick={() => handleAssignSequence(sequence.id)}
                              disabled={selectingSequence}
                              className="w-full text-left px-3 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition text-sm disabled:opacity-50"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-neutral-200">{sequence.name}</p>
                                  <p className="text-xs text-neutral-400">
                                    {sequence.total_messages || 0} mensajes
                                  </p>
                                </div>
                                {selectingSequence && (
                                  <Loader2 className="w-4 h-4 text-[#e7922b] animate-spin" />
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Historial de Ventas */}
          {lead.contact_id && (
            <div>
              <h4 className="text-sm font-semibold text-neutral-300 mb-3 flex items-center gap-2">
                <Package className="w-4 h-4 text-[#e7922b]" />
                Historial de Ventas
              </h4>
              <SalesHistory contactId={lead.contact_id} />
            </div>
          )}

          {/* Actividades */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-neutral-300">Actividades</h4>
              {!showAddActivity && (
                <button
                  onClick={() => setShowAddActivity(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg transition text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Agregar Actividad
                </button>
              )}
            </div>

            {/* Formulario de nueva actividad */}
            {showAddActivity && (
              <div className="mb-4 p-4 bg-neutral-800 rounded-lg border border-neutral-700">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1">
                      Tipo de Actividad
                    </label>
                    <select
                      value={newActivity.type}
                      onChange={(e) => setNewActivity(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#e7922b]"
                    >
                      <option value="note">Nota</option>
                      <option value="message">Mensaje</option>
                      <option value="call">Llamada</option>
                      <option value="task">Tarea</option>
                      <option value="meeting">Reunión</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1">
                      Contenido
                    </label>
                    <textarea
                      value={newActivity.content}
                      onChange={(e) => setNewActivity(prev => ({ ...prev, content: e.target.value }))}
                      rows={3}
                      className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#e7922b] resize-none"
                      placeholder="Describe la actividad..."
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddActivity}
                      className="flex-1 px-3 py-1.5 bg-[#e7922b] hover:bg-[#d8821b] text-[#1a2430] rounded-lg transition text-sm font-semibold"
                    >
                      Agregar
                    </button>
                    <button
                      onClick={() => {
                        setShowAddActivity(false);
                        setNewActivity({ type: 'note', content: '' });
                      }}
                      className="px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 rounded-lg transition text-sm"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Lista de actividades */}
            <div className="space-y-2">
              {activities.length === 0 ? (
                <div className="text-center py-8 text-neutral-500 text-sm">
                  No hay actividades registradas
                </div>
              ) : (
                activities.map(activity => (
                  <div
                    key={activity.id}
                    className="bg-neutral-800 border border-neutral-700 rounded-lg p-3"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="text-[#e7922b]">
                          {getActivityIcon(activity.type)}
                        </div>
                        <span className="text-xs font-medium text-neutral-300">
                          {getActivityTypeLabel(activity.type)}
                        </span>
                      </div>
                      <span className="text-xs text-neutral-500">
                        {formatDate(activity.created_at)}
                      </span>
                    </div>
                    {activity.content && (
                      <p className="text-sm text-neutral-200 mt-2 whitespace-pre-wrap">
                        {activity.content}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

