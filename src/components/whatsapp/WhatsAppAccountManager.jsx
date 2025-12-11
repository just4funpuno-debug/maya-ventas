/**
 * Gestor principal de cuentas WhatsApp
 * SUBFASE 1.4: Componente principal que orquesta AccountForm y AccountList
 * FASE 3: SUBFASE 3.3 - Tabs por productos
 */

import React, { useState, useEffect } from 'react';
import { MessageSquare, Plus, X } from 'lucide-react';
import { useToast } from '../ToastProvider';
import ConfirmModal from '../ConfirmModal';
import AccountForm from './AccountForm';
import AccountList from './AccountList';
import {
  getAllAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  toggleAccountActive,
  subscribeAccounts,
  getProducts
} from '../../services/whatsapp/accounts';
import { getUserSkus, isAdmin, getUserProducts } from '../../utils/whatsapp/user-products';

export default function WhatsAppAccountManager({ session }) {
  const toast = useToast();
  const [accounts, setAccounts] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [selectedProductId, setSelectedProductId] = useState(null); // Producto seleccionado en tab
  const [userProducts, setUserProducts] = useState([]); // Productos del usuario

  // Obtener userSkus del session
  const userSkus = getUserSkus(session);
  const admin = isAdmin(session);

  // Cargar datos iniciales
  useEffect(() => {
    loadProducts();
  }, [session]);

  useEffect(() => {
    loadAccounts();
  }, [userSkus, selectedProductId]); // Recargar cuando cambien los productos del usuario o el producto seleccionado

  // Suscripción en tiempo real
  useEffect(() => {
    const unsubscribe = subscribeAccounts((payload) => {
      // Actualizar lista cuando hay cambios
      loadAccounts();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const loadProducts = async () => {
    try {
      const { data } = await getProducts();
      if (data) {
        setProducts(data);
        
        // Filtrar productos del usuario
        const filtered = getUserProducts(session, data || []);
        setUserProducts(filtered);
        
        // FASE 3: SUBFASE 3.4 - Si hay productos y no hay selección, seleccionar el primero (siempre, sin importar si es admin)
        if (filtered.length > 0 && !selectedProductId) {
          setSelectedProductId(filtered[0].id);
        }
      }
    } catch (err) {
      console.warn('[WhatsAppAccountManager] No se pudieron cargar productos:', err);
      // No es crítico, continuar sin productos
    }
  };

  const loadAccounts = async () => {
    try {
      setLoading(true);
      // Pasar userSkus para filtrar cuentas por productos
      const { data, error } = await getAllAccounts(userSkus);
      
      if (error) {
        throw error;
      }
      
      let filteredAccounts = data || [];
      
      // Si hay un producto seleccionado, filtrar también por product_id
      if (selectedProductId) {
        filteredAccounts = filteredAccounts.filter(acc => acc.product_id === selectedProductId);
      }
      
      setAccounts(filteredAccounts);
    } catch (err) {
      console.error('[WhatsAppAccountManager] Error cargando cuentas:', err);
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'No se pudieron cargar las cuentas: ' + (err.message || 'Error desconocido')
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingAccount(null);
    setShowForm(true);
  };

  const handleEdit = (account) => {
    setEditingAccount(account);
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingAccount(null);
  };

  const handleSubmit = async (formData) => {
    try {
      setIsSubmitting(true);

      if (editingAccount) {
        // Actualizar
        const { data, error } = await updateAccount(editingAccount.id, formData);
        
        if (error) {
          throw error;
        }
        
        toast.push({
          type: 'success',
          title: 'Éxito',
          message: 'Cuenta actualizada correctamente'
        });
      } else {
        // Crear
        const { data, error } = await createAccount(formData);
        
        if (error) {
          throw error;
        }
        
        toast.push({
          type: 'success',
          title: 'Éxito',
          message: 'Cuenta creada correctamente'
        });
      }
      
      // Cerrar formulario y recargar
      setShowForm(false);
      setEditingAccount(null);
      await loadAccounts();
    } catch (err) {
      console.error('[WhatsAppAccountManager] Error guardando cuenta:', err);
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'Error al guardar cuenta: ' + (err.message || 'Error desconocido')
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (account) => {
    setDeleteConfirm(account);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;

    try {
      setIsSubmitting(true);
      const { success, error } = await deleteAccount(deleteConfirm.id);
      
      if (error) {
        throw error;
      }
      
      toast.push({
        type: 'success',
        title: 'Éxito',
        message: 'Cuenta eliminada correctamente'
      });
      
      setDeleteConfirm(null);
      await loadAccounts();
    } catch (err) {
      console.error('[WhatsAppAccountManager] Error eliminando cuenta:', err);
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'Error al eliminar cuenta: ' + (err.message || 'Error desconocido')
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (accountId, active) => {
    try {
      setIsSubmitting(true);
      const { data, error } = await toggleAccountActive(accountId, active);
      
      if (error) {
        throw error;
      }
      
      toast.push({
        type: 'success',
        title: 'Éxito',
        message: `Cuenta ${active ? 'activada' : 'desactivada'} correctamente`
      });
      
      await loadAccounts();
    } catch (err) {
      console.error('[WhatsAppAccountManager] Error cambiando estado:', err);
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'Error al cambiar estado: ' + (err.message || 'Error desconocido')
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Obtener productos para mostrar en tabs
  const productsToShow = admin ? products : userProducts;
  const hasMultipleProducts = productsToShow.length > 1 || admin;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#e7922b]/20">
              <MessageSquare className="w-5 h-5 text-[#e7922b]" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-neutral-200">
                Gestión de Cuentas WhatsApp
              </h1>
              <p className="text-xs text-neutral-400">
                Configura y gestiona tus números de WhatsApp Business
              </p>
            </div>
          </div>
          
          {!showForm && (
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#e7922b] text-sm font-medium text-white hover:bg-[#d6821b] transition"
            >
              <Plus className="w-4 h-4" />
              Nueva Cuenta
            </button>
          )}
        </div>
        
        {/* Tabs por productos */}
        {hasMultipleProducts && (
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
        )}
      </div>

      {/* Formulario (si está visible) */}
      {showForm && (
        <div className="mb-6 p-6 rounded-lg bg-neutral-900 border border-neutral-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-neutral-200">
              {editingAccount ? 'Editar Cuenta' : 'Nueva Cuenta WhatsApp'}
            </h2>
            <button
              onClick={handleCancelForm}
              className="text-neutral-400 hover:text-neutral-200 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <AccountForm
            account={editingAccount}
            products={products}
            onSubmit={handleSubmit}
            onCancel={handleCancelForm}
            isLoading={isSubmitting}
          />
        </div>
      )}

      {/* Lista de cuentas */}
      <div className="p-6 rounded-lg bg-neutral-900 border border-neutral-800">
        <h2 className="text-sm font-semibold text-neutral-200 mb-4">
          Cuentas Configuradas ({accounts.length})
        </h2>
        
        {loading ? (
          <div className="text-center py-8 text-neutral-400 text-sm">
            Cargando cuentas...
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-neutral-400 mb-2">
              {selectedProductId
                ? 'No hay cuentas para este producto'
                : 'No hay cuentas configuradas'}
            </div>
            {selectedProductId && (
              <p className="text-xs text-neutral-500">
                Crea una nueva cuenta y asígnala a este producto
              </p>
            )}
          </div>
        ) : (
          <AccountList
            accounts={accounts}
            onEdit={handleEdit}
            onDelete={handleDeleteClick}
            onToggleActive={handleToggleActive}
            isLoading={isSubmitting}
          />
        )}
      </div>

      {/* Modal de confirmación de eliminación */}
      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteConfirm}
        title="Eliminar Cuenta WhatsApp"
        message={
          deleteConfirm
            ? `¿Estás seguro de que deseas eliminar la cuenta "${deleteConfirm.display_name || deleteConfirm.phone_number}"? Esta acción no se puede deshacer.`
            : ''
        }
        confirmText="Eliminar"
        cancelText="Cancelar"
        confirmColor="red"
        isLoading={isSubmitting}
      />
    </div>
  );
}

