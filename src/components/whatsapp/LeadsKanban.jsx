/**
 * Componente Kanban para Leads
 * FASE 3: SUBFASE 3.2 - Vista Kanban con drag & drop
 * 
 * Muestra leads en formato Kanban con columnas por etapa
 */

import React, { useState, useEffect } from 'react';
import { Plus, Loader2, User, Phone, DollarSign, Calendar, Edit2, MessageSquare, Zap, Users, TrendingUp, Award } from 'lucide-react';
import { useToast } from '../ToastProvider';
import { getUserSkus, isAdmin, getUserProducts } from '../../utils/whatsapp/user-products';
import { getProducts } from '../../services/whatsapp/accounts';
import { getLeadsByProduct, getLeadCountsByStage, moveLeadToStage, getLeadStatsByProduct } from '../../services/whatsapp/leads';
import { getPipelineByProduct } from '../../services/whatsapp/pipelines';
import { getSequences } from '../../services/whatsapp/sequences';
import { getAllAccounts } from '../../services/whatsapp/accounts';
import LeadDetailModal from './LeadDetailModal';
import CreateLeadModal from './CreateLeadModal';
import PipelineConfigurator from './PipelineConfigurator';
import StageFlowSelector from './StageFlowSelector';

export default function LeadsKanban({ session, sharedProductId, setSharedProductId, onSwitchToSequences }) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  // SUBFASE 2: Usar sharedProductId si está disponible, sino usar estado local
  const [localProductId, setLocalProductId] = useState(null);
  const selectedProductId = sharedProductId !== undefined && sharedProductId !== null ? sharedProductId : localProductId;
  const setSelectedProductId = setSharedProductId || setLocalProductId;
  const [allProducts, setAllProducts] = useState([]);
  const [userProducts, setUserProducts] = useState([]);
  const [stages, setStages] = useState([]);
  const [leads, setLeads] = useState([]);
  const [leadCounts, setLeadCounts] = useState({});
  const [leadStats, setLeadStats] = useState(null);
  const [showCreateLeadModal, setShowCreateLeadModal] = useState(false);
  const [showPipelineConfig, setShowPipelineConfig] = useState(false);
  const [draggedLead, setDraggedLead] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  // FASE 2: Estado para modal de selección de flujo por etapa
  const [stageFlowSelector, setStageFlowSelector] = useState(null); // { productId, stageName, currentSequenceId }
  const [sequencesMap, setSequencesMap] = useState(new Map()); // Para mostrar nombres de flujos

  const userSkus = getUserSkus(session);
  const admin = isAdmin(session);

  // Cargar productos al inicio
  useEffect(() => {
    loadProducts();
  }, [session]);

  // Cargar pipeline y leads cuando cambia el producto
  useEffect(() => {
    if (selectedProductId) {
      loadPipelineAndLeads();
    }
  }, [selectedProductId, userSkus]);

  const loadProducts = async () => {
    try {
      const { data } = await getProducts();
      if (data) {
        setAllProducts(data);
        const filtered = getUserProducts(session, data || []);
        setUserProducts(filtered);
        
        // FASE 3: SUBFASE 3.1 - Seleccionar primer producto si no hay selección (siempre, sin importar si es admin)
        if (filtered.length > 0 && !selectedProductId) {
          setSelectedProductId(filtered[0].id);
        }
      }
    } catch (err) {
      console.error('[LeadsKanban] Error cargando productos:', err);
    }
  };

  const loadPipelineAndLeads = async () => {
    if (!selectedProductId) return;

    try {
      setLoading(true);

      // Cargar pipeline para obtener etapas
      const { data: pipeline, error: pipelineError } = await getPipelineByProduct(selectedProductId);
      
      if (pipelineError) {
        console.error('[LeadsKanban] Error cargando pipeline:', pipelineError);
        toast.push({
          type: 'error',
          title: 'Error',
          message: 'No se pudo cargar las etapas'
        });
        return;
      }

      // Obtener etapas del pipeline
      if (pipeline && pipeline.stages) {
        const sortedStages = Array.isArray(pipeline.stages)
          ? pipeline.stages.sort((a, b) => (a.order || 0) - (b.order || 0))
          : [];
        setStages(sortedStages);
        // FASE 2: Cargar secuencias para mostrar nombres en los indicadores
        loadSequencesForStages(selectedProductId, sortedStages);
      } else {
        // Si no hay pipeline, usar etapas por defecto
        setStages([
          { name: 'Leads Entrantes', order: 1, color: '#3b82f6' },
          { name: 'Seguimiento', order: 2, color: '#f59e0b' },
          { name: 'Venta', order: 3, color: '#10b981' },
          { name: 'Cliente', order: 4, color: '#8b5cf6' }
        ]);
      }

      // Cargar leads
      const { data: leadsData, error: leadsError } = await getLeadsByProduct(
        selectedProductId,
        userSkus,
        { status: 'active' }
      );

      if (leadsError) {
        console.error('[LeadsKanban] Error cargando leads:', leadsError);
        toast.push({
          type: 'error',
          title: 'Error',
          message: 'No se pudieron cargar los leads'
        });
        return;
      }

      setLeads(leadsData || []);

      // Cargar contadores por etapa
      const { data: countsData, error: countsError } = await getLeadCountsByStage(
        selectedProductId,
        userSkus,
        'active'
      );

      if (!countsError && countsData) {
        const countsMap = {};
        countsData.forEach(item => {
          countsMap[item.stage] = item.count;
        });
        setLeadCounts(countsMap);
      }

      // Cargar estadísticas generales
      const { data: statsData, error: statsError } = await getLeadStatsByProduct(
        selectedProductId,
        userSkus
      );

      if (!statsError && statsData) {
        setLeadStats(statsData);
      }
    } catch (err) {
      console.error('[LeadsKanban] Error fatal:', err);
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'Error al cargar datos'
      });
    } finally {
      setLoading(false);
    }
  };

  // FASE 2: Cargar secuencias para crear mapa de nombres
  const loadSequencesForStages = async (productId, stagesList) => {
    if (!productId || !stagesList) return;
    
    try {
      // Obtener WhatsApp Account del producto
      const { data: accounts } = await getAllAccounts(userSkus);
      const productAccount = accounts?.find(acc => acc.product_id === productId);
      
      if (!productAccount?.id) {
        setSequencesMap(new Map());
        return;
      }
      
      // Obtener secuencias
      const { data: sequences } = await getSequences(productAccount.id, userSkus);
      
      if (sequences && sequences.length > 0) {
        const map = new Map();
        sequences.forEach(seq => {
          map.set(seq.id, seq);
        });
        setSequencesMap(map);
      } else {
        setSequencesMap(new Map());
      }
    } catch (err) {
      console.error('[LeadsKanban] Error cargando secuencias:', err);
      setSequencesMap(new Map());
    }
  };

  // FASE 2: Abrir modal de selección de flujo
  const handleOpenFlowSelector = (stageName, currentSequenceId) => {
    if (!selectedProductId) return;
    setStageFlowSelector({
      productId: selectedProductId,
      stageName,
      currentSequenceId: currentSequenceId || null
    });
  };

  // FASE 2: Cerrar modal y recargar
  const handleFlowSelectorSuccess = () => {
    loadPipelineAndLeads();
  };

  const productsToShow = admin ? allProducts : userProducts;
  const hasMultipleProducts = productsToShow.length > 1 || admin;

  // Agrupar leads por etapa
  const leadsByStage = {};
  stages.forEach(stage => {
    leadsByStage[stage.name] = leads.filter(lead => lead.pipeline_stage === stage.name);
  });

  // Manejar inicio de drag
  const handleDragStart = (e, lead) => {
    setDraggedLead(lead);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target);
  };

  // Manejar drag over
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Manejar drop
  const handleDrop = async (e, targetStage) => {
    e.preventDefault();
    
    if (!draggedLead || !targetStage) return;
    
    // Si el lead ya está en esta etapa, no hacer nada
    if (draggedLead.pipeline_stage === targetStage) {
      setDraggedLead(null);
      return;
    }

    try {
      // Mover lead a nueva etapa
      // FASE 1: SUBFASE 1.3 - Pasar productId para validación
      const { data, error } = await moveLeadToStage(
        draggedLead.id,
        targetStage,
        session?.user?.id || null,
        selectedProductId // Validar que el lead pertenece a este producto
      );

      if (error) {
        throw error;
      }

      toast.push({
        type: 'success',
        title: 'Éxito',
        message: `Lead movido a "${targetStage}"`
      });

      // Recargar leads y estadísticas
      await loadPipelineAndLeads();
    } catch (err) {
      console.error('[LeadsKanban] Error moviendo lead:', err);
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'No se pudo mover el lead: ' + (err.message || 'Error desconocido')
      });
    } finally {
      setDraggedLead(null);
    }
  };

  // Formatear fecha
  const formatDate = (dateString) => {
    if (!dateString) return 'Sin fecha';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Tabs de productos */}
      {hasMultipleProducts && (
        <div className="border-b border-neutral-800 bg-[#0f171e] px-6 py-3">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-neutral-800">
            {productsToShow.map(product => (
              <button
                key={product.id}
                onClick={() => setSelectedProductId(product.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                  selectedProductId === product.id
                    ? 'bg-[#e7922b] text-[#1a2430]'
                    : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                }`}
              >
                {product.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <div className="flex-1 overflow-auto p-6">
        {!selectedProductId ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-neutral-400">
              <p className="mb-2">Selecciona un producto para ver sus leads</p>
              {productsToShow.length === 0 && (
                <p className="text-sm text-neutral-500">
                  No hay productos disponibles
                </p>
              )}
            </div>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 text-[#e7922b] animate-spin" />
          </div>
        ) : (
          <>
            {/* Métricas y Botones de acción */}
            <div className="mb-6 space-y-4">
              {/* Métricas */}
              {leadStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-[#0f171e] border border-neutral-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-neutral-400" />
                        <span className="text-xs text-neutral-400">Total Leads</span>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-neutral-200">
                      {leadStats.total_leads || 0}
                    </div>
                    <div className="text-xs text-neutral-500 mt-1">
                      {leadStats.active_leads || 0} activos
                    </div>
                  </div>

                  <div className="bg-[#0f171e] border border-neutral-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-green-400" />
                        <span className="text-xs text-neutral-400">Ganados</span>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-green-400">
                      {leadStats.won_leads || 0}
                    </div>
                    <div className="text-xs text-neutral-500 mt-1">
                      {leadStats.total_leads > 0 
                        ? `${Math.round((leadStats.won_leads / leadStats.total_leads) * 100)}% tasa`
                        : '0% tasa'}
                    </div>
                  </div>

                  <div className="bg-[#0f171e] border border-neutral-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-[#e7922b]" />
                        <span className="text-xs text-neutral-400">Valor Total</span>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-[#e7922b]">
                      ${(leadStats.total_value || 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-neutral-500 mt-1">
                      Valor estimado
                    </div>
                  </div>

                  <div className="bg-[#0f171e] border border-neutral-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-yellow-400" />
                        <span className="text-xs text-neutral-400">Score Promedio</span>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-yellow-400">
                      {Math.round(leadStats.avg_lead_score || 0)}
                    </div>
                    <div className="text-xs text-neutral-500 mt-1">
                      / 100 puntos
                    </div>
                  </div>
                </div>
              )}

              {/* Header con botones */}
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-neutral-200">
                  Leads - {productsToShow.find(p => p.id === selectedProductId)?.name || 'Producto'}
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowPipelineConfig(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg transition text-sm"
                    title="Configurar Etapa"
                  >
                    <Edit2 className="w-4 h-4" />
                    Etapa
                  </button>
                  {/* SUBFASE 2: Botón Secuencias */}
                  {selectedProductId && onSwitchToSequences && (
                    <button
                      onClick={() => onSwitchToSequences(selectedProductId)}
                      className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg transition text-sm"
                      title="Ver flujos de este producto"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Flujos
                    </button>
                  )}
                  <button
                    onClick={() => setShowCreateLeadModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#e7922b] text-[#1a2430] font-semibold rounded-lg hover:bg-[#d8821b] transition"
                  >
                    <Plus className="w-4 h-4" />
                    Crear Lead
                  </button>
                </div>
              </div>
            </div>

            {/* Vista Kanban */}
            <div className="flex gap-4 overflow-x-auto pb-4">
              {stages.map((stage, index) => {
                const stageLeads = leadsByStage[stage.name] || [];
                const count = leadCounts[stage.name] || 0;

                return (
                  <div
                    key={stage.name}
                    className="flex-shrink-0 w-80 bg-[#0f171e] border border-neutral-800 rounded-xl p-4"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, stage.name)}
                  >
                    {/* Header de columna */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-neutral-200 flex items-center gap-2 flex-1 min-w-0">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: stage.color || '#3b82f6' }}
                          />
                          <span className="truncate">{stage.name}</span>
                        </h4>
                        <span className="text-xs text-neutral-400 bg-neutral-800 px-2 py-1 rounded flex-shrink-0 ml-2">
                          {count}
                        </span>
                      </div>
                      {/* FASE 2: Botón/Indicador de flujo asignado */}
                      <div className="mt-2">
                        {stage.sequence_id ? (
                          <button
                            onClick={() => handleOpenFlowSelector(stage.name, stage.sequence_id)}
                            className="w-full flex items-center justify-between gap-2 px-2 py-1.5 bg-[#e7922b]/10 hover:bg-[#e7922b]/20 border border-[#e7922b]/30 rounded-lg transition text-xs group"
                            title="Click para cambiar flujo"
                          >
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              <Zap className="w-3.5 h-3.5 text-[#e7922b] flex-shrink-0" />
                              <span className="text-[#e7922b] font-medium truncate">
                                {sequencesMap.get(stage.sequence_id)?.name || 'Flujo asignado'}
                              </span>
                            </div>
                            <Edit2 className="w-3 h-3 text-[#e7922b] opacity-0 group-hover:opacity-100 transition flex-shrink-0" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenFlowSelector(stage.name, null)}
                            className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 hover:border-[#e7922b]/50 rounded-lg transition text-xs text-neutral-400 hover:text-[#e7922b]"
                            title="Asignar flujo a esta etapa"
                          >
                            <Zap className="w-3.5 h-3.5" />
                            <span>Asignar flujo</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Leads en esta etapa */}
                    <div className="space-y-2 min-h-[200px]">
                      {stageLeads.length === 0 ? (
                        <div className="text-center py-8 text-neutral-500 text-sm border-2 border-dashed border-neutral-700 rounded-lg">
                          Arrastra leads aquí
                        </div>
                      ) : (
                        stageLeads.map(lead => (
                          <div
                            key={lead.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, lead)}
                            onClick={() => setSelectedLead(lead)}
                            className={`bg-neutral-800 border rounded-lg p-3 hover:border-[#e7922b]/50 transition cursor-move ${
                              draggedLead?.id === lead.id
                                ? 'opacity-50 border-[#e7922b]'
                                : 'border-neutral-700'
                            }`}
                          >
                            {/* Nombre del contacto */}
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <User className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                                <span className="text-sm font-medium text-neutral-200 truncate">
                                  {lead.contact_name || 'Sin nombre'}
                                </span>
                              </div>
                            </div>

                            {/* Teléfono */}
                            {lead.contact_phone && (
                              <div className="flex items-center gap-2 mb-2 text-xs text-neutral-400">
                                <Phone className="w-3 h-3" />
                                <span>{lead.contact_phone}</span>
                              </div>
                            )}

                            {/* Valor estimado */}
                            {lead.estimated_value > 0 && (
                              <div className="flex items-center gap-2 mb-2 text-xs text-[#e7922b] font-semibold">
                                <DollarSign className="w-3 h-3" />
                                <span>${lead.estimated_value.toLocaleString()}</span>
                              </div>
                            )}

                            {/* Última actividad */}
                            {lead.last_activity_at && (
                              <div className="flex items-center gap-2 text-xs text-neutral-500">
                                <Calendar className="w-3 h-3" />
                                <span>{formatDate(lead.last_activity_at)}</span>
                              </div>
                            )}

                            {/* Score (si existe) */}
                            {lead.lead_score !== undefined && lead.lead_score !== null && (
                              <div className="mt-2">
                                <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
                                  <span>Score</span>
                                  <span className="font-semibold">{lead.lead_score}/100</span>
                                </div>
                                <div className="w-full bg-neutral-700 rounded-full h-1.5">
                                  <div
                                    className="bg-[#e7922b] h-1.5 rounded-full transition-all"
                                    style={{ width: `${lead.lead_score}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Modal Crear Lead */}
      {showCreateLeadModal && (
        <CreateLeadModal
          productId={selectedProductId}
          selectedProductId={selectedProductId}
          onClose={() => setShowCreateLeadModal(false)}
          onSuccess={loadPipelineAndLeads}
          session={session}
        />
      )}

      {/* Modal Configurar Etapa */}
      {showPipelineConfig && (
        <PipelineConfigurator
          productId={selectedProductId}
          onClose={() => setShowPipelineConfig(false)}
          onUpdate={loadPipelineAndLeads}
          session={session}
        />
      )}

      {/* Modal Detalle Lead */}
      {selectedLead && (
        <LeadDetailModal
          leadId={selectedLead.id}
          productId={selectedProductId}
          onClose={() => setSelectedLead(null)}
          onUpdate={loadPipelineAndLeads}
          session={session}
        />
      )}

      {/* FASE 2: Modal de Selección de Flujo por Etapa */}
      {stageFlowSelector && (
        <StageFlowSelector
          productId={stageFlowSelector.productId}
          stageName={stageFlowSelector.stageName}
          currentSequenceId={stageFlowSelector.currentSequenceId}
          onClose={() => setStageFlowSelector(null)}
          onSuccess={handleFlowSelectorSuccess}
          session={session}
        />
      )}
    </div>
  );
}

