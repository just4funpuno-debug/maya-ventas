/**
 * Gestor de etiquetas para contactos WhatsApp
 * FASE 1: SUBFASE 1.3 - UI - Gestor de Etiquetas
 */

import React, { useState, useEffect } from 'react';
import { Tag, Plus, X, Edit2, Trash2, Check } from 'lucide-react';
import { useToast } from '../ToastProvider';
import ConfirmModal from '../ConfirmModal';
import { AsyncButton } from '../AsyncButton';
import {
  getAllTags,
  createTag,
  updateTag,
  deleteTag
} from '../../services/whatsapp/tags';
import { getAllAccounts } from '../../services/whatsapp/accounts';

// Colores predefinidos para etiquetas
const PREDEFINED_COLORS = [
  '#e7922b', // Color principal de la app
  '#ff0000', // Rojo
  '#00ff00', // Verde
  '#0000ff', // Azul
  '#ffff00', // Amarillo
  '#ff00ff', // Magenta
  '#00ffff', // Cyan
  '#ff8800', // Naranja
  '#8800ff', // Púrpura
  '#0088ff', // Azul claro
  '#ff0088', // Rosa
  '#88ff00', // Lima
  '#008888', // Teal
  '#888800', // Oliva
  '#888888'  // Gris
];

export default function TagManager() {
  const toast = useToast();
  const [tags, setTags] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingTag, setEditingTag] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    color: PREDEFINED_COLORS[0]
  });
  const [formErrors, setFormErrors] = useState({});

  // Cargar cuentas al montar
  useEffect(() => {
    loadAccounts();
  }, []);

  // Cargar etiquetas cuando cambia la cuenta seleccionada
  useEffect(() => {
    if (selectedAccountId) {
      loadTags();
    } else {
      setTags([]);
    }
  }, [selectedAccountId]);

  const loadAccounts = async () => {
    try {
      const { data, error } = await getAllAccounts();
      if (error) {
        throw error;
      }
      setAccounts(data || []);
      // Seleccionar primera cuenta activa por defecto
      const activeAccount = (data || []).find(acc => acc.active);
      if (activeAccount) {
        setSelectedAccountId(activeAccount.id);
      }
    } catch (err) {
      console.error('[TagManager] Error cargando cuentas:', err);
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'No se pudieron cargar las cuentas WhatsApp'
      });
    }
  };

  const loadTags = async () => {
    if (!selectedAccountId) return;

    try {
      setLoading(true);
      const { data, error } = await getAllTags(selectedAccountId);
      
      if (error) {
        throw error;
      }
      
      setTags(data || []);
    } catch (err) {
      console.error('[TagManager] Error cargando etiquetas:', err);
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'No se pudieron cargar las etiquetas: ' + (err.message || 'Error desconocido')
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingTag(null);
    setFormData({
      name: '',
      color: PREDEFINED_COLORS[0]
    });
    setFormErrors({});
    setShowForm(true);
  };

  const handleEdit = (tag) => {
    setEditingTag(tag);
    setFormData({
      name: tag.name,
      color: tag.color
    });
    setFormErrors({});
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingTag(null);
    setFormData({
      name: '',
      color: PREDEFINED_COLORS[0]
    });
    setFormErrors({});
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) {
      errors.name = 'El nombre es requerido';
    } else if (formData.name.length > 50) {
      errors.name = 'El nombre no puede exceder 50 caracteres';
    }
    
    if (!formData.color || !/^#[0-9A-Fa-f]{6}$/.test(formData.color)) {
      errors.color = 'Color inválido';
    }
    
    return errors;
  };

  const handleSubmit = async () => {
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setIsSubmitting(true);
      
      if (editingTag) {
        // Actualizar etiqueta existente
        const { data, error } = await updateTag(editingTag.id, {
          name: formData.name.trim(),
          color: formData.color
        });
        
        if (error) {
          throw error;
        }
        
        toast.push({
          type: 'success',
          title: 'Éxito',
          message: 'Etiqueta actualizada correctamente'
        });
      } else {
        // Crear nueva etiqueta
        const { data, error } = await createTag(
          selectedAccountId,
          formData.name.trim(),
          formData.color
        );
        
        if (error) {
          throw error;
        }
        
        toast.push({
          type: 'success',
          title: 'Éxito',
          message: 'Etiqueta creada correctamente'
        });
      }
      
      // Recargar lista y cerrar formulario
      await loadTags();
      handleCancelForm();
    } catch (err) {
      console.error('[TagManager] Error guardando etiqueta:', err);
      toast.push({
        type: 'error',
        title: 'Error',
        message: err.message || 'No se pudo guardar la etiqueta'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (tagId) => {
    try {
      setIsSubmitting(true);
      const { success, error } = await deleteTag(tagId);
      
      if (error) {
        throw error;
      }
      
      toast.push({
        type: 'success',
        title: 'Éxito',
        message: 'Etiqueta eliminada correctamente'
      });
      
      await loadTags();
      setDeleteConfirm(null);
    } catch (err) {
      console.error('[TagManager] Error eliminando etiqueta:', err);
      toast.push({
        type: 'error',
        title: 'Error',
        message: err.message || 'No se pudo eliminar la etiqueta'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedAccount = accounts.find(acc => acc.id === selectedAccountId);

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <header className="mb-6">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Tag className="w-5 h-5 text-[#e7922b]" />
          Gestor de Etiquetas
        </h2>
        <p className="text-sm text-neutral-400 mt-1">
          Crea y gestiona etiquetas para categorizar tus contactos WhatsApp
        </p>
      </header>

      {/* Selector de cuenta */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-neutral-300 mb-2">
          Cuenta WhatsApp
        </label>
        <select
          value={selectedAccountId}
          onChange={(e) => setSelectedAccountId(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#e7922b]"
          disabled={loading || accounts.length === 0}
        >
          <option value="">Selecciona una cuenta...</option>
          {accounts.map(account => (
            <option key={account.id} value={account.id}>
              {account.display_name || account.phone_number || account.id}
            </option>
          ))}
        </select>
        {accounts.length === 0 && (
          <p className="text-xs text-neutral-500 mt-1">
            No hay cuentas WhatsApp disponibles. Crea una cuenta primero.
          </p>
        )}
      </div>

      {!selectedAccountId ? (
        <div className="text-center py-12 text-neutral-400 text-sm">
          <p>Selecciona una cuenta WhatsApp para gestionar sus etiquetas</p>
        </div>
      ) : (
        <>
          {/* Botón crear */}
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-medium text-neutral-300">
                Etiquetas de {selectedAccount?.display_name || selectedAccount?.phone_number}
              </h3>
              <p className="text-xs text-neutral-500 mt-1">
                {tags.length} etiqueta{tags.length !== 1 ? 's' : ''} creada{tags.length !== 1 ? 's' : ''}
              </p>
            </div>
            <AsyncButton
              onClick={handleCreate}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#e7922b] text-white font-medium hover:bg-[#d6821b] transition disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Etiqueta</span>
            </AsyncButton>
          </div>

          {/* Formulario (si está visible) */}
          {showForm && (
            <div className="mb-6 p-4 rounded-lg bg-neutral-800 border border-neutral-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-neutral-200">
                  {editingTag ? 'Editar Etiqueta' : 'Nueva Etiqueta'}
                </h3>
                <button
                  onClick={handleCancelForm}
                  className="p-1 rounded hover:bg-neutral-700 transition"
                  disabled={isSubmitting}
                >
                  <X className="w-4 h-4 text-neutral-400" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Nombre */}
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Nombre de la Etiqueta
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, name: e.target.value }));
                      if (formErrors.name) {
                        setFormErrors(prev => ({ ...prev, name: null }));
                      }
                    }}
                    placeholder="Ej: Cliente VIP, Pendiente, etc."
                    maxLength={50}
                    disabled={isSubmitting}
                    className={`w-full px-3 py-2 rounded-lg bg-neutral-900 border ${
                      formErrors.name ? 'border-red-500' : 'border-neutral-700'
                    } text-neutral-200 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#e7922b] disabled:opacity-50`}
                  />
                  {formErrors.name && (
                    <p className="text-xs text-red-400 mt-1">{formErrors.name}</p>
                  )}
                  <p className="text-xs text-neutral-500 mt-1">
                    {formData.name.length}/50 caracteres
                  </p>
                </div>

                {/* Color */}
                <div>
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Color
                  </label>
                  <div className="grid grid-cols-5 gap-2 mb-2">
                    {PREDEFINED_COLORS.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, color }));
                          if (formErrors.color) {
                            setFormErrors(prev => ({ ...prev, color: null }));
                          }
                        }}
                        disabled={isSubmitting}
                        className={`w-full aspect-square rounded-lg border-2 transition ${
                          formData.color === color
                            ? 'border-white scale-110'
                            : 'border-neutral-700 hover:border-neutral-600'
                        } disabled:opacity-50`}
                        style={{ backgroundColor: color }}
                        title={color}
                      >
                        {formData.color === color && (
                          <Check className="w-4 h-4 text-white m-auto" />
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={formData.color}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value.length <= 7 && /^#[0-9A-Fa-f]*$/.test(value)) {
                          setFormData(prev => ({ ...prev, color: value }));
                          if (formErrors.color) {
                            setFormErrors(prev => ({ ...prev, color: null }));
                          }
                        }
                      }}
                      placeholder="#e7922b"
                      disabled={isSubmitting}
                      className={`flex-1 px-3 py-2 rounded-lg bg-neutral-900 border ${
                        formErrors.color ? 'border-red-500' : 'border-neutral-700'
                      } text-neutral-200 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#e7922b] disabled:opacity-50 font-mono text-sm`}
                    />
                    <div
                      className="w-12 h-10 rounded-lg border border-neutral-700"
                      style={{ backgroundColor: formData.color }}
                    />
                  </div>
                  {formErrors.color && (
                    <p className="text-xs text-red-400 mt-1">{formErrors.color}</p>
                  )}
                </div>

                {/* Botones */}
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={handleCancelForm}
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-lg bg-neutral-700 text-neutral-200 hover:bg-neutral-600 transition disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <AsyncButton
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-lg bg-[#e7922b] text-white font-medium hover:bg-[#d6821b] transition disabled:opacity-50"
                  >
                    {editingTag ? 'Actualizar' : 'Crear'}
                  </AsyncButton>
                </div>
              </div>
            </div>
          )}

          {/* Lista de etiquetas */}
          {loading ? (
            <div className="text-center py-12 text-neutral-400 text-sm">
              <p>Cargando etiquetas...</p>
            </div>
          ) : tags.length === 0 ? (
            <div className="text-center py-12 text-neutral-400 text-sm">
              <Tag className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
              <p>No hay etiquetas creadas</p>
              <p className="text-xs mt-1 text-neutral-500">
                Crea tu primera etiqueta para comenzar a categorizar contactos
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {tags.map(tag => (
                <div
                  key={tag.id}
                  className="p-4 rounded-lg bg-neutral-800 border border-neutral-700 hover:border-neutral-600 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: tag.color }}
                        />
                        <h3 className="text-sm font-semibold text-neutral-200 truncate">
                          {tag.name}
                        </h3>
                      </div>
                      <p className="text-xs text-neutral-500 font-mono">
                        {tag.color}
                      </p>
                      <p className="text-xs text-neutral-500 mt-1">
                        Creado: {new Date(tag.created_at).toLocaleDateString('es-BO')}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleEdit(tag)}
                        disabled={isSubmitting}
                        className="p-2 rounded-lg hover:bg-neutral-700 transition disabled:opacity-50"
                        title="Editar etiqueta"
                      >
                        <Edit2 className="w-4 h-4 text-neutral-400" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(tag)}
                        disabled={isSubmitting}
                        className="p-2 rounded-lg hover:bg-neutral-700 transition disabled:opacity-50"
                        title="Eliminar etiqueta"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal de confirmación de eliminación */}
      {deleteConfirm && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={() => handleDelete(deleteConfirm.id)}
          title="Eliminar Etiqueta"
          message={`¿Estás seguro de que deseas eliminar la etiqueta "${deleteConfirm.name}"? Esta acción no se puede deshacer.`}
          confirmText="Eliminar"
          cancelText="Cancelar"
          confirmClass="bg-red-600 hover:bg-red-700"
          isLoading={isSubmitting}
        />
      )}
    </div>
  );
}


