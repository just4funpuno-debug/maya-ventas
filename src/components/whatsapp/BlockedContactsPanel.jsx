/**
 * Panel de gestión de contactos bloqueados y sospechosos
 * FASE 5: SUBFASE 5.3 - Panel de Posibles Bloqueos
 * FASE 3: SUBFASE 3.4 - Tabs por productos
 */

import React, { useState, useEffect } from 'react';
import { 
  Search, AlertTriangle, Users, BarChart3, 
  RefreshCw, CheckCircle2, XCircle
} from 'lucide-react';
import { useToast } from '../ToastProvider';
import ConfirmModal from '../ConfirmModal';
import BlockedContactCard from './BlockedContactCard';
import {
  getBlockedContacts,
  getSuspiciousContacts,
  getBlockingStats,
  reactivateContact,
  deleteContact,
  addContactNote
} from '../../services/whatsapp/blocked-contacts';
import { getAllAccounts, getProducts } from '../../services/whatsapp/accounts';
import { getUserSkus, isAdmin, getUserProducts } from '../../utils/whatsapp/user-products';

export default function BlockedContactsPanel({ session, initialProductId = null, hideProductTabs = false, hideHeader = false }) {
  const toast = useToast();
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [blockedContacts, setBlockedContacts] = useState([]);
  const [suspiciousContacts, setSuspiciousContacts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('blocked'); // 'blocked' o 'suspicious'
  
  // Filtros
  const [search, setSearch] = useState('');

  // Modales
  const [reactivateConfirm, setReactivateConfirm] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  
  // Productos
  const [selectedProductId, setSelectedProductId] = useState(initialProductId);
  const [allProducts, setAllProducts] = useState([]);
  const [userProducts, setUserProducts] = useState([]);

  // Obtener userSkus del session
  const userSkus = getUserSkus(session);
  const admin = isAdmin(session);

  // Actualizar selectedProductId cuando cambia initialProductId
  useEffect(() => {
    if (initialProductId) {
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

  // Cargar datos cuando cambia la cuenta seleccionada o filtros
  useEffect(() => {
    if (selectedAccountId) {
      loadData();
      loadStats();
    }
  }, [selectedAccountId, search, activeTab, userSkus]);

  const loadProducts = async () => {
    try {
      const { data } = await getProducts();
      if (data) {
        setAllProducts(data);
        
        // Filtrar productos del usuario
        const filtered = getUserProducts(session, data || []);
        setUserProducts(filtered);
        
        // FASE 3: SUBFASE 3.6 - Si hay productos y no hay selección, seleccionar el primero (siempre, sin importar si es admin)
        // Si se pasó initialProductId, usarlo; sino, usar el primero disponible
        if (filtered.length > 0 && !selectedProductId) {
          const productToSelect = initialProductId || filtered[0].id;
          setSelectedProductId(productToSelect);
        } else if (initialProductId && !selectedProductId) {
          // Si hay initialProductId pero aún no está seleccionado, establecerlo
          setSelectedProductId(initialProductId);
        }
      }
    } catch (err) {
      console.warn('[BlockedContactsPanel] No se pudieron cargar productos:', err);
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
      
      if (activeAccounts.length > 0 && !selectedAccountId) {
        setSelectedAccountId(activeAccounts[0].id);
      } else if (activeAccounts.length === 0) {
        // Si no hay cuentas después del filtro, limpiar selección
        setSelectedAccountId(null);
      }
    } catch (err) {
      console.error('[BlockedContactsPanel] Error cargando cuentas:', err);
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'No se pudieron cargar las cuentas'
      });
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const options = {
        accountId: selectedAccountId,
        search: search.trim() || undefined,
        userSkus: userSkus, // Pasar userSkus para filtrar por productos
        limit: 100
      };

      if (activeTab === 'blocked') {
        const { data, error } = await getBlockedContacts(options);
        if (error) throw error;
        setBlockedContacts(data || []);
      } else {
        const { data, error } = await getSuspiciousContacts(options);
        if (error) throw error;
        setSuspiciousContacts(data || []);
      }
    } catch (err) {
      console.error('[BlockedContactsPanel] Error cargando contactos:', err);
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'No se pudieron cargar los contactos'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Pasar userSkus para verificar permisos
      const { data, error } = await getBlockingStats(selectedAccountId, userSkus);
      if (error) throw error;
      setStats(data);
    } catch (err) {
      console.error('[BlockedContactsPanel] Error cargando estadísticas:', err);
    }
  };

  const handleReactivate = async (contactId) => {
    try {
      const { success, error } = await reactivateContact(contactId);
      if (error) throw error;

      toast.push({
        type: 'success',
        title: 'Éxito',
        message: 'Contacto reactivado correctamente'
      });

      setReactivateConfirm(null);
      loadData();
      loadStats();
    } catch (err) {
      console.error('[BlockedContactsPanel] Error reactivando contacto:', err);
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'No se pudo reactivar el contacto'
      });
    }
  };

  const handleDelete = async (contactId) => {
    try {
      const { success, error } = await deleteContact(contactId);
      if (error) throw error;

      toast.push({
        type: 'success',
        title: 'Éxito',
        message: 'Contacto eliminado correctamente'
      });

      setDeleteConfirm(null);
      loadData();
      loadStats();
    } catch (err) {
      console.error('[BlockedContactsPanel] Error eliminando contacto:', err);
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'No se pudo eliminar el contacto'
      });
    }
  };

  const handleAddNote = async (contactId, note) => {
    try {
      const { success, error } = await addContactNote(contactId, note);
      if (error) throw error;

      toast.push({
        type: 'success',
        title: 'Éxito',
        message: 'Nota agregada correctamente'
      });

      loadData();
      return { success: true };
    } catch (err) {
      console.error('[BlockedContactsPanel] Error agregando nota:', err);
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'No se pudo agregar la nota'
      });
      return { success: false };
    }
  };

  const currentContacts = activeTab === 'blocked' ? blockedContacts : suspiciousContacts;
  
  // Obtener productos para mostrar en tabs
  const productsToShow = admin ? allProducts : userProducts;
  const hasMultipleProducts = productsToShow.length > 1 || admin;

  return (
    <div className="h-full flex flex-col bg-neutral-900 text-white">
      {/* Header - Ocultar si hideHeader es true */}
      {!hideHeader && (
      <div className="p-4 border-b border-neutral-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-yellow-400" />
              Contactos Bloqueados
            </h1>
            <p className="text-neutral-400 text-sm mt-1">
              Gestiona contactos bloqueados y sospechosos
            </p>
          </div>
          <button
            onClick={() => {
              loadData();
              loadStats();
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </button>
        </div>
        
        {/* Tabs por productos - Ocultar si hideProductTabs es true */}
        {hasMultipleProducts && !hideProductTabs && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-neutral-800">
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

        {/* Selector de cuenta */}
        {accounts.length > 0 && (
          <div className="mb-4">
            <label className="text-sm text-neutral-400 mb-2 block">Cuenta WhatsApp:</label>
            <select
              value={selectedAccountId || ''}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white"
            >
              {accounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.display_name || account.phone_number} ({account.phone_number})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Estadísticas */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 mt-4">
            <div className="p-3 rounded-lg bg-neutral-800/50 border border-neutral-700">
              <div className="text-xs text-neutral-400 mb-1">Total</div>
              <div className="text-2xl font-bold text-white">{stats.total}</div>
            </div>
            <div className="p-3 rounded-lg bg-red-900/20 border border-red-500/30">
              <div className="text-xs text-red-400 mb-1">Bloqueados</div>
              <div className="text-2xl font-bold text-red-400">{stats.blocked}</div>
            </div>
            <div className="p-3 rounded-lg bg-yellow-900/20 border border-yellow-500/30">
              <div className="text-xs text-yellow-400 mb-1">Sospechosos</div>
              <div className="text-2xl font-bold text-yellow-400">{stats.suspicious}</div>
            </div>
            <div className="p-3 rounded-lg bg-green-900/20 border border-green-500/30">
              <div className="text-xs text-green-400 mb-1">Activos</div>
              <div className="text-2xl font-bold text-green-400">{stats.active}</div>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Tabs y Búsqueda */}
      <div className="p-4 border-b border-neutral-800">
        <div className="flex items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('blocked')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                activeTab === 'blocked'
                  ? 'bg-red-600 text-white'
                  : 'bg-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              <XCircle className="w-4 h-4 inline mr-2" />
              Bloqueados ({blockedContacts.length})
            </button>
            <button
              onClick={() => setActiveTab('suspicious')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                activeTab === 'suspicious'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              <AlertTriangle className="w-4 h-4 inline mr-2" />
              Sospechosos ({suspiciousContacts.length})
            </button>
          </div>

          {/* Búsqueda */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Buscar por nombre o teléfono..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Lista de contactos */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-neutral-400">Cargando...</div>
          </div>
        ) : currentContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-neutral-400">
            <Users className="w-12 h-12 mb-4 opacity-50" />
            <p>
              {activeTab === 'blocked'
                ? selectedProductId
                  ? 'No hay contactos bloqueados para este producto'
                  : 'No hay contactos bloqueados'
                : selectedProductId
                  ? 'No hay contactos sospechosos para este producto'
                  : 'No hay contactos sospechosos'}
              {selectedProductId && (
                <p className="text-xs text-neutral-500 mt-1">
                  Los contactos bloqueados de este producto aparecerán aquí
                </p>
              )}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {currentContacts.map(contact => (
              <BlockedContactCard
                key={contact.id}
                contact={contact}
                isBlocked={activeTab === 'blocked'}
                onReactivate={(id) => setReactivateConfirm(id)}
                onDelete={(id) => setDeleteConfirm(id)}
                onAddNote={handleAddNote}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modales de confirmación */}
      {reactivateConfirm && (
        <ConfirmModal
          isOpen={!!reactivateConfirm}
          onClose={() => setReactivateConfirm(null)}
          onConfirm={() => handleReactivate(reactivateConfirm)}
          title="Reactivar Contacto"
          message="¿Estás seguro de que deseas reactivar este contacto? Se marcará como no bloqueado y se reanudarán los flujos."
          confirmText="Reactivar"
          confirmColor="green"
        />
      )}

      {deleteConfirm && (
        <ConfirmModal
          isOpen={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={() => handleDelete(deleteConfirm)}
          title="Eliminar Contacto"
          message="¿Estás seguro de que deseas eliminar este contacto? Esta acción no se puede deshacer."
          confirmText="Eliminar"
          confirmColor="red"
        />
      )}
    </div>
  );
}


