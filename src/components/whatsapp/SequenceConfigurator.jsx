/**
 * Configurador de secuencias de mensajes WhatsApp
 * FASE 4: SUBFASE 4.1 - Configurador de Secuencias
 * FASE 3: SUBFASE 3.3 - Tabs por productos
 * 
 * Permite crear, editar y gestionar secuencias de mensajes
 */

import React, { useState, useEffect } from 'react';
import { MessageSquare, Plus, Edit, Trash2, X, Check, Clock } from 'lucide-react';
import { useToast } from '../ToastProvider';
import ConfirmModal from '../ConfirmModal';
import SequenceMessageEditor from './SequenceMessageEditor';
import {
  getSequences,
  createSequence,
  updateSequence,
  deleteSequence,
  getSequenceWithMessages
} from '../../services/whatsapp/sequences';
import { getAllAccounts, getProducts } from '../../services/whatsapp/accounts';
import { getUserSkus, isAdmin, getUserProducts } from '../../utils/whatsapp/user-products';

export default function SequenceConfigurator({ session, initialProductId, onProductChange }) {
  const toast = useToast();
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [sequences, setSequences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSequence, setEditingSequence] = useState(null);
  const [viewingSequence, setViewingSequence] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  // SUBFASE 3: Usar initialProductId si está disponible
  const [selectedProductId, setSelectedProductId] = useState(initialProductId || null); // Producto seleccionado en tab
  const [allProducts, setAllProducts] = useState([]); // Todos los productos disponibles
  const [userProducts, setUserProducts] = useState([]); // Productos del usuario
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    active: true
  });
  const [formErrors, setFormErrors] = useState({});

  // Obtener userSkus del session
  const userSkus = getUserSkus(session);
  const admin = isAdmin(session);

  // SUBFASE 3: Sincronizar con initialProductId cuando cambia
  useEffect(() => {
    if (initialProductId !== undefined && initialProductId !== selectedProductId) {
      setSelectedProductId(initialProductId);
    }
  }, [initialProductId]);

  // Cargar productos al inicio
  useEffect(() => {
    loadProducts();
  }, [session]);

  // Cargar cuentas al inicio y cuando cambie el producto seleccionado
  useEffect(() => {
    loadAccounts();
  }, [userSkus, selectedProductId]);

  // Cargar secuencias cuando cambia la cuenta seleccionada
  useEffect(() => {
    if (selectedAccountId) {
      loadSequences();
    } else {
      setSequences([]);
    }
  }, [selectedAccountId, userSkus]);

  const loadProducts = async () => {
    try {
      const { data } = await getProducts();
      if (data) {
        setAllProducts(data);
        
        // Filtrar productos del usuario
        const filtered = getUserProducts(session, data || []);
        setUserProducts(filtered);
        
        // FASE 3: SUBFASE 3.2 - Si hay productos y no hay selección, seleccionar el primero (siempre, sin importar si es admin)
        // No sobrescribir si hay initialProductId
        if (filtered.length > 0 && !selectedProductId && !initialProductId) {
          setSelectedProductId(filtered[0].id);
        }
      }
    } catch (err) {
      console.warn('[SequenceConfigurator] No se pudieron cargar productos:', err);
    }
  };

  const loadAccounts = async () => {
    try {
      // Pasar userSkus para filtrar cuentas por productos
      const { data, error } = await getAllAccounts(userSkus);
      if (error) throw error;
      
      let activeAccounts = (data || []).filter(acc => acc.active);
      
      // Si hay un producto seleccionado, filtrar también por product_id
      if (selectedProductId) {
        activeAccounts = activeAccounts.filter(acc => acc.product_id === selectedProductId);
      }
      
      setAccounts(activeAccounts);
      
      // Seleccionar primera cuenta activa si existe
      if (activeAccounts.length > 0 && !selectedAccountId) {
        setSelectedAccountId(activeAccounts[0].id);
      } else if (activeAccounts.length === 0) {
        // Si no hay cuentas después del filtro, limpiar selección
        setSelectedAccountId(null);
      }
    } catch (err) {
      console.error('[SequenceConfigurator] Error cargando cuentas:', err);
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'No se pudieron cargar las cuentas'
      });
    }
  };

  const loadSequences = async () => {
    if (!selectedAccountId) return;

    try {
      setLoading(true);
      // Pasar userSkus para verificar permisos
      const { data, error } = await getSequences(selectedAccountId, userSkus);
      
      if (error) {
        // Si es error de permisos, mostrar mensaje pero no error crítico
        if (error.code === 'PERMISSION_DENIED') {
          setSequences([]);
          return;
        }
        throw error;
      }
      
      setSequences(data || []);
    } catch (err) {
      console.error('[SequenceConfigurator] Error cargando secuencias:', err);
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'No se pudieron cargar los flujos'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNewSequence = () => {
    setFormData({ name: '', description: '', active: true });
    setFormErrors({});
    setEditingSequence(null);
    setShowForm(true);
  };

  const handleEditSequence = async (sequence) => {
    try {
      const { data, error } = await getSequenceWithMessages(sequence.id);
      if (error) throw error;
      
      setFormData({
        name: data.name || '',
        description: data.description || '',
        active: data.active !== undefined ? data.active : true
      });
      setFormErrors({});
      setEditingSequence(data);
      setShowForm(true);
    } catch (err) {
      console.error('[SequenceConfigurator] Error cargando secuencia:', err);
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'No se pudo cargar el flujo'
      });
    }
  };

  const handleViewSequence = async (sequence) => {
    try {
      const { data, error } = await getSequenceWithMessages(sequence.id);
      if (error) throw error;
      setViewingSequence(data);
    } catch (err) {
      console.error('[SequenceConfigurator] Error cargando secuencia:', err);
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'No se pudo cargar el flujo'
      });
    }
  };

  const handleSaveSequence = async () => {
    // Validar
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = 'El nombre es requerido';
    }
    if (!selectedAccountId) {
      errors.account = 'Debes seleccionar una cuenta';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      if (editingSequence) {
        // Actualizar
        const { error } = await updateSequence(editingSequence.id, {
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          active: formData.active
        });

        if (error) throw error;

        toast.push({
          type: 'success',
          title: 'Éxito',
          message: 'Flujo actualizado correctamente'
        });
      } else {
        // Crear
        const { error } = await createSequence({
          account_id: selectedAccountId,
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          active: formData.active
        });

        if (error) throw error;

        toast.push({
          type: 'success',
          title: 'Éxito',
          message: 'Flujo creado correctamente'
        });
      }

      setShowForm(false);
      setEditingSequence(null);
      setFormData({ name: '', description: '', active: true });
      loadSequences();
    } catch (err) {
      console.error('[SequenceConfigurator] Error guardando secuencia:', err);
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'No se pudo guardar el flujo: ' + (err.message || 'Error desconocido')
      });
    }
  };

  const handleDeleteSequence = async () => {
    if (!deleteConfirm) return;

    try {
      const { error } = await deleteSequence(deleteConfirm.id);
      if (error) throw error;

      toast.push({
        type: 'success',
        title: 'Éxito',
        message: 'Flujo eliminado correctamente'
      });

      setDeleteConfirm(null);
      loadSequences();
    } catch (err) {
      console.error('[SequenceConfigurator] Error eliminando secuencia:', err);
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'No se pudo eliminar el flujo: ' + (err.message || 'Error desconocido')
      });
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingSequence(null);
    setFormData({ name: '', description: '', active: true });
    setFormErrors({});
  };

  // Obtener productos para mostrar en tabs
  const productsToShow = admin ? allProducts : userProducts;
  const hasMultipleProducts = productsToShow.length > 1 || admin;

  return (
    <div className="flex-1 p-6 bg-[#121f27] overflow-auto">
      <header className="mb-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#f09929]" />
            Flujos de Mensajes
          </h2>
          <p className="text-sm text-neutral-400 mt-1">
            Crea y gestiona flujos automáticos de mensajes para tus contactos
          </p>
        </div>
        
        {/* Tabs por productos */}
        {hasMultipleProducts && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-neutral-800">
            {productsToShow.map(product => (
              <button
                key={product.id}
                onClick={() => {
                  setSelectedProductId(product.id);
                  // SUBFASE 3: Notificar cambio al padre
                  if (onProductChange) onProductChange(product.id);
                }}
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
        )}
      </header>

      {/* Selector de cuenta */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-neutral-300 mb-2">
          Cuenta WhatsApp
        </label>
        <select
          value={selectedAccountId || ''}
          onChange={(e) => setSelectedAccountId(e.target.value)}
          className="w-full md:w-auto min-w-[300px] bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#e7922b]"
        >
          <option value="">Selecciona una cuenta</option>
          {accounts.map(acc => (
            <option key={acc.id} value={acc.id}>
              {acc.display_name || acc.phone_number}
            </option>
          ))}
        </select>
      </div>

      {/* Botón Nueva Secuencia */}
      {selectedAccountId && (
        <div className="mb-6">
          <button
            onClick={handleNewSequence}
            className="flex items-center gap-2 px-4 py-2 bg-[#e7922b] text-[#1a2430] font-semibold rounded-lg hover:bg-[#d8821b] transition"
          >
            <Plus className="w-4 h-4" />
            Nuevo Flujo
          </button>
        </div>
      )}

      {/* Lista de secuencias */}
      {loading ? (
        <div className="text-center py-8 text-neutral-400">
          Cargando flujos...
        </div>
      ) : sequences.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-neutral-400 mb-2">
            {selectedAccountId
              ? selectedProductId
                ? 'No hay flujos para este producto. Crea uno nuevo para comenzar.'
                : 'No hay flujos creados. Crea uno nuevo para comenzar.'
              : 'Selecciona una cuenta para ver sus flujos.'}
          </div>
          {selectedAccountId && selectedProductId && (
            <p className="text-xs text-neutral-500">
              Asegúrate de que la cuenta seleccionada pertenece a este producto
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sequences.map(sequence => (
            <div
              key={sequence.id}
              className="bg-[#0f171e] border border-neutral-800 rounded-xl p-4 hover:border-[#e7922b]/50 transition"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-neutral-200 mb-1">
                    {sequence.name}
                  </h3>
                  {sequence.description && (
                    <p className="text-xs text-neutral-400 line-clamp-2">
                      {sequence.description}
                    </p>
                  )}
                </div>
                <div className={`px-2 py-1 rounded text-[10px] font-semibold ${
                  sequence.active
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-neutral-700 text-neutral-400'
                }`}>
                  {sequence.active ? 'Activa' : 'Inactiva'}
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-neutral-500 mb-4">
                <MessageSquare className="w-3 h-3" />
                <span>{sequence.total_messages || 0} mensajes</span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleViewSequence(sequence)}
                  className="flex-1 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs rounded-lg transition"
                >
                  Ver/Editar
                </button>
                <button
                  onClick={() => handleEditSequence(sequence)}
                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg transition"
                  title="Editar"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteConfirm(sequence)}
                  className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition"
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de formulario */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-[#0f171e] border border-neutral-800 rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-neutral-200">
                {editingSequence ? 'Editar Flujo' : 'Nuevo Flujo'}
              </h3>
              <button
                onClick={handleCancel}
                className="text-neutral-400 hover:text-neutral-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">
                  Nombre <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, name: e.target.value }));
                    if (formErrors.name) {
                      setFormErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.name;
                        return newErrors;
                      });
                    }
                  }}
                  className={`w-full bg-neutral-800 border ${
                    formErrors.name ? 'border-red-500' : 'border-neutral-700'
                  } rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#e7922b]`}
                  placeholder="Ej: Flujo de Bienvenida"
                />
                {formErrors.name && (
                  <p className="text-xs text-red-400 mt-1">{formErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#e7922b] resize-none"
                  placeholder="Describe el propósito de este flujo..."
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                  className="w-4 h-4 rounded bg-neutral-800 border-neutral-700 text-[#e7922b] focus:ring-[#e7922b]"
                />
                <label htmlFor="active" className="text-sm text-neutral-300">
                  Flujo activo
                </label>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleCancel}
                  className="flex-1 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveSequence}
                  className="flex-1 px-4 py-2 bg-[#e7922b] text-[#1a2430] font-semibold rounded-lg hover:bg-[#d8821b] transition"
                >
                  {editingSequence ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de vista/edición de mensajes */}
      {viewingSequence && (
        <SequenceMessageEditor
          sequence={viewingSequence}
          onClose={() => setViewingSequence(null)}
          onUpdate={loadSequences}
        />
      )}

      {/* Modal de confirmación de eliminación */}
      {deleteConfirm && (
        <ConfirmModal
          isOpen={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={handleDeleteSequence}
          title="Eliminar Flujo"
          message={`¿Estás seguro de que deseas eliminar el flujo "${deleteConfirm.name}"? Esta acción no se puede deshacer.`}
          confirmText="Eliminar"
          cancelText="Cancelar"
          confirmColor="red"
        />
      )}
    </div>
  );
}


