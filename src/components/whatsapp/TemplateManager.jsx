/**
 * Modal para gestionar Templates de WhatsApp
 * FASE 1 - SUBFASE 1.3: Lista y Formulario Básico
 */

import React, { useState, useEffect } from 'react';
import { FileText, Plus, X, Edit2, Trash2, CheckCircle, XCircle, Clock, AlertCircle, Search, Send, RefreshCw, Cloud } from 'lucide-react';
import { useToast } from '../ToastProvider';
import ConfirmModal from '../ConfirmModal';
import { AsyncButton } from '../AsyncButton';
import {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  createTemplateInWhatsApp,
  syncTemplateStatusFromWhatsApp,
  syncAllTemplatesFromWhatsApp
} from '../../services/whatsapp/templates';
import TemplateForm from './TemplateForm';

const STATUS_COLORS = {
  draft: 'bg-neutral-600/20 text-neutral-300 border-neutral-600/30',
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  approved: 'bg-green-500/20 text-green-400 border-green-500/30',
  rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
  paused: 'bg-orange-500/20 text-orange-400 border-orange-500/30'
};

const STATUS_ICONS = {
  draft: Clock,
  pending: Clock,
  approved: CheckCircle,
  rejected: XCircle,
  paused: AlertCircle
};

const STATUS_LABELS = {
  draft: 'Borrador',
  pending: 'En Revisión',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  paused: 'Pausado'
};

const CATEGORY_LABELS = {
  MARKETING: 'Marketing',
  UTILITY: 'Utilidad',
  AUTHENTICATION: 'Autenticación'
};

export default function TemplateManager({ isOpen, onClose, accountId, productId }) {
  const toast = useToast();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [filterStatus, setFilterStatus] = useState(null);
  const [filterCategory, setFilterCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sendingToWhatsApp, setSendingToWhatsApp] = useState(null); // ID del template que se está enviando
  const [syncing, setSyncing] = useState(false);

  // Cargar templates cuando se abre el modal o cambia accountId/productId
  useEffect(() => {
    if (isOpen && accountId) {
      loadTemplates();
    }
  }, [isOpen, accountId, productId]);

  // Resetear formulario cuando se cierra el modal
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    if (!accountId) return;

    try {
      setLoading(true);
      const { data, error } = await getTemplates(accountId, productId || null, filterCategory, filterStatus);
      
      if (error) {
        throw error;
      }
      
      setTemplates(data || []);
    } catch (err) {
      console.error('[TemplateManager] Error cargando templates:', err);
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'No se pudieron cargar los templates: ' + (err.message || 'Error desconocido')
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingTemplate(null);
    setSearchQuery('');
    setFilterStatus(null);
    setFilterCategory(null);
  };

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setShowForm(true);
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setShowForm(true);
  };

  const handleSaveTemplate = async (templateData) => {
    try {
      if (editingTemplate) {
        // Actualizar template existente
        const { error } = await updateTemplate(editingTemplate.id, templateData);
        if (error) throw error;

        toast.push({
          type: 'success',
          title: 'Éxito',
          message: 'Template actualizado correctamente'
        });
      } else {
        // Crear nuevo template
        const { error } = await createTemplate({
          ...templateData,
          account_id: accountId,
          product_id: productId || null
        });
        if (error) throw error;

        toast.push({
          type: 'success',
          title: 'Éxito',
          message: 'Template creado correctamente'
        });
      }

      setShowForm(false);
      setEditingTemplate(null);
      loadTemplates();
    } catch (err) {
      console.error('[TemplateManager] Error guardando template:', err);
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'No se pudo guardar el template: ' + (err.message || 'Error desconocido')
      });
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    try {
      const { error } = await deleteTemplate(templateId);
      if (error) throw error;

      toast.push({
        type: 'success',
        title: 'Éxito',
        message: 'Template eliminado correctamente'
      });

      setDeleteConfirm(null);
      loadTemplates();
    } catch (err) {
      console.error('[TemplateManager] Error eliminando template:', err);
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'No se pudo eliminar el template: ' + (err.message || 'Error desconocido')
      });
    }
  };

  // FASE 2 - SUBFASE 2.3: Enviar template a WhatsApp
  const handleSendToWhatsApp = async (templateId) => {
    try {
      setSendingToWhatsApp(templateId);
      
      const { data, error } = await createTemplateInWhatsApp(templateId);
      
      if (error) {
        throw error;
      }

      toast.push({
        type: 'success',
        title: 'Éxito',
        message: 'Template enviado a WhatsApp. Está en revisión.'
      });

      // Recargar templates para ver el nuevo estado
      await loadTemplates();
    } catch (err) {
      console.error('[TemplateManager] Error enviando template a WhatsApp:', err);
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'No se pudo enviar el template a WhatsApp: ' + (err.message || 'Error desconocido')
      });
    } finally {
      setSendingToWhatsApp(null);
    }
  };

  // FASE 2 - SUBFASE 2.3: Sincronizar un template específico
  const handleSyncTemplate = async (templateId) => {
    try {
      setSyncing(true);
      
      const { data, error } = await syncTemplateStatusFromWhatsApp(templateId);
      
      if (error) {
        throw error;
      }

      toast.push({
        type: 'success',
        title: 'Éxito',
        message: `Estado sincronizado: ${data.wa_status === 'approved' ? 'Aprobado' : data.wa_status === 'rejected' ? 'Rechazado' : 'En revisión'}`
      });

      // Recargar templates
      await loadTemplates();
    } catch (err) {
      console.error('[TemplateManager] Error sincronizando template:', err);
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'No se pudo sincronizar el estado: ' + (err.message || 'Error desconocido')
      });
    } finally {
      setSyncing(false);
    }
  };

  // FASE 2 - SUBFASE 2.3: Sincronizar todos los templates
  const handleSyncAll = async () => {
    if (!accountId) return;

    try {
      setSyncing(true);
      
      const { data, error } = await syncAllTemplatesFromWhatsApp(accountId);
      
      if (error) {
        throw error;
      }

      toast.push({
        type: 'success',
        title: 'Sincronización completada',
        message: `${data.synced} templates sincronizados correctamente`
      });

      // Recargar templates
      await loadTemplates();
    } catch (err) {
      console.error('[TemplateManager] Error sincronizando todos:', err);
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'No se pudieron sincronizar los templates: ' + (err.message || 'Error desconocido')
      });
    } finally {
      setSyncing(false);
    }
  };

  // Filtrar templates por búsqueda
  const filteredTemplates = templates.filter(template => {
    if (searchQuery && !template.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !template.body_text?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-[#0f171e] border border-neutral-800 rounded-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-800 flex-shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-neutral-200 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#e7922b]" />
              Templates de WhatsApp
            </h3>
            <p className="text-sm text-neutral-400 mt-1">
              Gestiona tus plantillas de mensajes para WhatsApp Business API
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Botón sincronizar todos - FASE 2: SUBFASE 2.3 */}
            <button
              onClick={handleSyncAll}
              disabled={syncing || !accountId}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 disabled:bg-neutral-700 disabled:text-neutral-500 text-neutral-200 font-semibold rounded-lg transition flex items-center gap-2"
              title="Sincronizar todos los templates con WhatsApp"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              Sincronizar
            </button>
            <button
              onClick={handleCreateTemplate}
              className="px-4 py-2 bg-[#e7922b] hover:bg-[#d8821b] text-[#1a2430] font-semibold rounded-lg transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Crear Template
            </button>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-200 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filtros y búsqueda */}
        <div className="p-4 border-b border-neutral-800 flex-shrink-0 flex flex-wrap gap-3">
          {/* Búsqueda */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar templates..."
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-10 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#e7922b]"
              />
            </div>
          </div>

          {/* Filtro por categoría */}
          <select
            value={filterCategory || ''}
            onChange={(e) => {
              setFilterCategory(e.target.value || null);
              // Recargar templates con nuevo filtro
              setTimeout(() => loadTemplates(), 0);
            }}
            className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#e7922b]"
          >
            <option value="">Todas las categorías</option>
            <option value="MARKETING">Marketing</option>
            <option value="UTILITY">Utilidad</option>
            <option value="AUTHENTICATION">Autenticación</option>
          </select>

          {/* Filtro por estado */}
          <select
            value={filterStatus || ''}
            onChange={(e) => {
              setFilterStatus(e.target.value || null);
              // Recargar templates con nuevo filtro
              setTimeout(() => loadTemplates(), 0);
            }}
            className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#e7922b]"
          >
            <option value="">Todos los estados</option>
            <option value="draft">Borrador</option>
            <option value="pending">En Revisión</option>
            <option value="approved">Aprobado</option>
            <option value="rejected">Rechazado</option>
            <option value="paused">Pausado</option>
          </select>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8 text-neutral-400">
              Cargando templates...
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-8 text-neutral-400">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="mb-4">
                {searchQuery || filterStatus || filterCategory 
                  ? 'No se encontraron templates con los filtros seleccionados'
                  : 'No hay templates creados aún'}
              </p>
              {!searchQuery && !filterStatus && !filterCategory && (
                <button
                  onClick={handleCreateTemplate}
                  className="px-4 py-2 bg-[#e7922b] hover:bg-[#d8821b] text-[#1a2430] font-semibold rounded-lg transition"
                >
                  Crear Primer Template
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => {
                const StatusIcon = STATUS_ICONS[template.wa_status] || Clock;
                
                return (
                  <div
                    key={template.id}
                    className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4 hover:border-[#e7922b]/50 transition"
                  >
                    {/* Header del card */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-neutral-200 truncate mb-1">
                          {template.name}
                        </h4>
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Estado */}
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border ${STATUS_COLORS[template.wa_status] || STATUS_COLORS.draft}`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {STATUS_LABELS[template.wa_status] || 'Desconocido'}
                          </span>
                          {/* Categoría */}
                          <span className="text-xs text-neutral-400">
                            {CATEGORY_LABELS[template.category] || template.category}
                          </span>
                        </div>
                      </div>

                      {/* Acciones */}
                      <div className="flex items-center gap-1 ml-2 flex-wrap">
                        {/* Botón Enviar a WhatsApp - solo para drafts */}
                        {template.wa_status === 'draft' && (
                          <button
                            onClick={() => handleSendToWhatsApp(template.id)}
                            disabled={sendingToWhatsApp === template.id}
                            className="p-1.5 rounded bg-green-600/20 hover:bg-green-600/30 text-green-400 transition disabled:opacity-50"
                            title="Enviar a WhatsApp para revisión"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        )}
                        
                        {/* Botón Sincronizar - solo si ya fue enviado a WhatsApp */}
                        {template.wa_template_id && template.wa_status !== 'draft' && (
                          <button
                            onClick={() => handleSyncTemplate(template.id)}
                            disabled={syncing}
                            className="p-1.5 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 transition disabled:opacity-50"
                            title="Sincronizar estado con WhatsApp"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                          </button>
                        )}

                        <button
                          onClick={() => handleEditTemplate(template)}
                          disabled={template.wa_status === 'approved'}
                          className="p-1.5 rounded bg-neutral-700 hover:bg-neutral-600 text-neutral-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                          title={template.wa_status === 'approved' ? 'No se puede editar un template aprobado' : 'Editar'}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(template)}
                          className="p-1.5 rounded bg-red-600/20 hover:bg-red-600/30 text-red-400 transition"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Preview del cuerpo */}
                    <div className="mb-3">
                      <p className="text-xs text-neutral-400 line-clamp-2">
                        {template.body_text || 'Sin contenido'}
                      </p>
                    </div>

                    {/* Footer con info adicional */}
                    <div className="flex items-center justify-between text-xs text-neutral-500 mb-2">
                      <span>ID: {template.wa_template_name || 'N/A'}</span>
                      {template.language && (
                        <span>{template.language.toUpperCase()}</span>
                      )}
                    </div>

                    {/* Mensaje de rechazo si fue rechazado - FASE 2: SUBFASE 2.3 */}
                    {template.wa_status === 'rejected' && template.wa_rejection_reason && (
                      <div className="mt-2 p-2 bg-red-600/10 border border-red-600/30 rounded text-xs text-red-400">
                        <p className="font-semibold mb-1">Rechazado:</p>
                        <p className="text-red-300">{template.wa_rejection_reason}</p>
                      </div>
                    )}

                    {/* Botones si tiene */}
                    {template.buttons && template.buttons.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-neutral-700">
                        <p className="text-xs text-neutral-400 mb-1">Botones:</p>
                        <div className="flex flex-wrap gap-1">
                          {template.buttons.slice(0, 3).map((btn, idx) => (
                            <span
                              key={idx}
                              className="text-xs bg-[#e7922b]/10 text-[#e7922b] px-2 py-0.5 rounded"
                            >
                              {btn.text}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer con estadísticas */}
        <div className="p-4 border-t border-neutral-800 flex-shrink-0 flex items-center justify-between text-sm text-neutral-400">
          <span>
            {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4 text-green-400" />
              {templates.filter(t => t.wa_status === 'approved').length} aprobados
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-yellow-400" />
              {templates.filter(t => t.wa_status === 'pending').length} en revisión
            </span>
          </div>
        </div>
      </div>

      {/* Formulario de Template */}
      {showForm && (
        <TemplateForm
          template={editingTemplate}
          accountId={accountId}
          productId={productId}
          onSave={handleSaveTemplate}
          onCancel={() => {
            setShowForm(false);
            setEditingTemplate(null);
          }}
        />
      )}

      {/* Confirmación de eliminación */}
      {deleteConfirm && (
        <ConfirmModal
          isOpen={!!deleteConfirm}
          title="Eliminar Template"
          message={`¿Estás seguro de que deseas eliminar el template "${deleteConfirm.name}"?`}
          confirmText="Eliminar"
          cancelText="Cancelar"
          onConfirm={() => handleDeleteTemplate(deleteConfirm.id)}
          onCancel={() => setDeleteConfirm(null)}
          confirmButtonClass="bg-red-600 hover:bg-red-700"
        />
      )}
    </div>
  );
}

