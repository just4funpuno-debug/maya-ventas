/**
 * Panel de gestión de cola de mensajes Puppeteer
 * FASE 5: SUBFASE 5.1 - Panel de Cola Puppeteer
 * FASE 3: SUBFASE 3.4 - Tabs por productos
 */

import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, Pause, Play, BarChart3, Clock, 
  AlertCircle, CheckCircle2, XCircle, Loader2 
} from 'lucide-react';
import { useToast } from '../ToastProvider';
import ConfirmModal from '../ConfirmModal';
import QueueMessageCard from './QueueMessageCard';
import {
  getQueueMessages,
  getQueueStats,
  getQueueLog,
  getBotStatus,
  pauseBot,
  resumeBot,
  removeFromQueue,
  retryMessage,
  subscribeQueue
} from '../../services/whatsapp/puppeteer-queue';
import { getAllAccounts, getProducts } from '../../services/whatsapp/accounts';
import { getUserSkus, isAdmin, getUserProducts } from '../../utils/whatsapp/user-products';

export default function PuppeteerQueuePanel({ session }) {
  const toast = useToast();
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [logMessages, setLogMessages] = useState([]);
  const [stats, setStats] = useState(null);
  const [botStatus, setBotStatus] = useState({ bot_active: true, last_heartbeat: null });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('queue'); // 'queue' o 'log'
  
  // Filtros
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    messageType: '',
    search: ''
  });

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 20;

  // Modales
  const [pauseConfirm, setPauseConfirm] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState(null);
  const [retryConfirm, setRetryConfirm] = useState(null);
  
  // Productos
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [userProducts, setUserProducts] = useState([]);

  // Obtener userSkus del session
  const userSkus = getUserSkus(session);
  const admin = isAdmin(session);

  // Cargar productos al inicio
  useEffect(() => {
    loadProducts();
  }, [session]);

  // Cargar cuentas al inicio y cuando cambie el producto seleccionado
  useEffect(() => {
    loadAccounts();
  }, [userSkus, selectedProductId]);

  // Cargar datos cuando cambia la cuenta seleccionada
  useEffect(() => {
    if (selectedAccountId) {
      loadData();
      loadBotStatus();
    }
  }, [selectedAccountId, activeTab, filters, currentPage, userSkus]);

  // Suscripción Realtime
  useEffect(() => {
    if (!selectedAccountId) return;

    const unsubscribe = subscribeQueue((payload) => {
      // Cambio en cola detectado, recargar datos
      // Recargar datos cuando hay cambios
      loadData();
      loadStats();
    });

    return () => {
      unsubscribe();
    };
  }, [selectedAccountId]);

  const loadProducts = async () => {
    try {
      const { data } = await getProducts();
      if (data) {
        setAllProducts(data);
        
        // Filtrar productos del usuario
        const filtered = getUserProducts(session, data || []);
        setUserProducts(filtered);
        
        // FASE 3: SUBFASE 3.5 - Si hay productos y no hay selección, seleccionar el primero (siempre, sin importar si es admin)
        if (filtered.length > 0 && !selectedProductId) {
          setSelectedProductId(filtered[0].id);
        }
      }
    } catch (err) {
      console.warn('[PuppeteerQueuePanel] No se pudieron cargar productos:', err);
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
      console.error('[PuppeteerQueuePanel] Error cargando cuentas:', err);
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'No se pudieron cargar las cuentas'
      });
    }
  };

  const loadData = async () => {
    if (!selectedAccountId) return;

    try {
      setLoading(true);
      
      if (activeTab === 'queue') {
        await loadQueueMessages();
      } else {
        await loadLog();
      }
      
      await loadStats();
    } catch (err) {
      console.error('[PuppeteerQueuePanel] Error cargando datos:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadQueueMessages = async () => {
    if (!selectedAccountId) return;

    try {
      const offset = (currentPage - 1) * itemsPerPage;
      // Pasar userSkus para filtrar por productos
      const { data, error } = await getQueueMessages({
        ...filters,
        userSkus: userSkus, // Pasar userSkus para filtrar por productos
        limit: itemsPerPage,
        offset
      });

      if (error) throw error;
      
      setMessages(data || []);
      // TODO: Calcular totalPages desde count
    } catch (err) {
      console.error('[PuppeteerQueuePanel] Error cargando mensajes:', err);
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'No se pudieron cargar los mensajes de la cola'
      });
    }
  };

  const loadLog = async () => {
    if (!selectedAccountId) return;

    try {
      const { data, error } = await getQueueLog({
        limit: 100,
        status: filters.status || undefined
      });

      if (error) throw error;
      
      setLogMessages(data || []);
    } catch (err) {
      console.error('[PuppeteerQueuePanel] Error cargando log:', err);
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'No se pudo cargar el log de envíos'
      });
    }
  };

  const loadStats = async () => {
    if (!selectedAccountId) return;

    try {
      // Pasar userSkus para verificar permisos
      const { data, error } = await getQueueStats(selectedAccountId, userSkus);
      if (error) throw error;
      
      setStats(data);
    } catch (err) {
      console.error('[PuppeteerQueuePanel] Error cargando estadísticas:', err);
    }
  };

  const loadBotStatus = async () => {
    if (!selectedAccountId) return;

    try {
      const { data, error } = await getBotStatus(selectedAccountId);
      if (error) throw error;
      
      setBotStatus(data || { bot_active: true, last_heartbeat: null });
    } catch (err) {
      console.error('[PuppeteerQueuePanel] Error cargando estado del bot:', err);
    }
  };

  const handlePauseBot = async () => {
    if (!selectedAccountId) return;

    try {
      const { success, error } = await pauseBot(selectedAccountId);
      if (error) throw error;

      toast.push({
        type: 'success',
        title: 'Bot pausado',
        message: 'El bot Puppeteer ha sido pausado'
      });

      setPauseConfirm(false);
      await loadBotStatus();
    } catch (err) {
      console.error('[PuppeteerQueuePanel] Error pausando bot:', err);
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'No se pudo pausar el bot'
      });
    }
  };

  const handleResumeBot = async () => {
    if (!selectedAccountId) return;

    try {
      const { success, error } = await resumeBot(selectedAccountId);
      if (error) throw error;

      toast.push({
        type: 'success',
        title: 'Bot reanudado',
        message: 'El bot Puppeteer ha sido reanudado'
      });

      await loadBotStatus();
    } catch (err) {
      console.error('[PuppeteerQueuePanel] Error reanudando bot:', err);
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'No se pudo reanudar el bot'
      });
    }
  };

  const handleRemove = async (messageId) => {
    try {
      const { success, error } = await removeFromQueue(messageId);
      if (error) throw error;

      toast.push({
        type: 'success',
        title: 'Mensaje eliminado',
        message: 'El mensaje ha sido eliminado de la cola'
      });

      setRemoveConfirm(null);
      await loadData();
    } catch (err) {
      console.error('[PuppeteerQueuePanel] Error eliminando mensaje:', err);
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'No se pudo eliminar el mensaje'
      });
    }
  };

  const handleRetry = async (messageId) => {
    try {
      const { success, error } = await retryMessage(messageId);
      if (error) throw error;

      toast.push({
        type: 'success',
        title: 'Mensaje reintentado',
        message: 'El mensaje ha sido marcado para reintento'
      });

      setRetryConfirm(null);
      await loadData();
    } catch (err) {
      console.error('[PuppeteerQueuePanel] Error reintentando mensaje:', err);
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'No se pudo reintentar el mensaje'
      });
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset a primera página
  };

  const displayMessages = activeTab === 'queue' ? messages : logMessages;
  
  // Obtener productos para mostrar en tabs
  const productsToShow = admin ? allProducts : userProducts;
  const hasMultipleProducts = productsToShow.length > 1 || admin;

  return (
    <div className="h-full flex flex-col bg-neutral-900 text-neutral-100">
      {/* Header */}
      <div className="p-4 border-b border-neutral-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Cola Puppeteer</h2>
          
          {/* Selector de cuenta */}
          {accounts.length > 0 && (
            <select
              value={selectedAccountId || ''}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm"
            >
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.display_name || acc.phone_number}
                </option>
              ))}
            </select>
          )}
        </div>
        
        {/* Tabs por productos */}
        {hasMultipleProducts && (
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

        {/* Tabs y controles */}
        <div className="flex items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('queue')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === 'queue'
                  ? 'bg-[#ea9216] text-[#313841]'
                  : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Cola ({stats?.byStatus?.pending || 0})
            </button>
            <button
              onClick={() => setActiveTab('log')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === 'log'
                  ? 'bg-[#ea9216] text-[#313841]'
                  : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Log
            </button>
          </div>

          {/* Botón pausar/reanudar bot */}
          {selectedAccountId && (
            <div className="flex items-center gap-2">
              {botStatus.bot_active ? (
                <button
                  onClick={() => setPauseConfirm(true)}
                  className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition flex items-center gap-2 text-sm"
                >
                  <Pause className="w-4 h-4" />
                  Pausar Bot
                </button>
              ) : (
                <button
                  onClick={handleResumeBot}
                  className="px-4 py-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition flex items-center gap-2 text-sm"
                >
                  <Play className="w-4 h-4" />
                  Reanudar Bot
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Estadísticas */}
      {stats && (
        <div className="p-4 border-b border-neutral-800 bg-neutral-800/30">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-neutral-200">{stats.total}</p>
              <p className="text-xs text-neutral-400">Total</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-400">{stats.byStatus.pending}</p>
              <p className="text-xs text-neutral-400">Pendientes</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-400">{stats.byStatus.processing}</p>
              <p className="text-xs text-neutral-400">Procesando</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-400">{stats.byStatus.sent}</p>
              <p className="text-xs text-neutral-400">Enviados</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-400">{stats.byStatus.failed}</p>
              <p className="text-xs text-neutral-400">Fallidos</p>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="p-4 border-b border-neutral-800 bg-neutral-800/20">
        <div className="flex flex-wrap gap-3">
          {/* Búsqueda */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Buscar por contacto..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm focus:outline-none focus:border-[#ea9216]"
              />
            </div>
          </div>

          {/* Filtro Status */}
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm"
          >
            <option value="">Todos los estados</option>
            <option value="pending">Pendiente</option>
            <option value="processing">Procesando</option>
            <option value="sent">Enviado</option>
            <option value="failed">Fallido</option>
          </select>

          {/* Filtro Prioridad */}
          <select
            value={filters.priority}
            onChange={(e) => handleFilterChange('priority', e.target.value)}
            className="px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm"
          >
            <option value="">Todas las prioridades</option>
            <option value="HIGH">Alta</option>
            <option value="MEDIUM">Media</option>
            <option value="LOW">Baja</option>
          </select>

          {/* Filtro Tipo */}
          <select
            value={filters.messageType}
            onChange={(e) => handleFilterChange('messageType', e.target.value)}
            className="px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm"
          >
            <option value="">Todos los tipos</option>
            <option value="text">Texto</option>
            <option value="image">Imagen</option>
            <option value="video">Video</option>
            <option value="audio">Audio</option>
            <option value="document">Documento</option>
          </select>
        </div>
      </div>

      {/* Lista de mensajes */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-[#ea9216]" />
          </div>
        ) : displayMessages.length === 0 ? (
          <div className="text-center py-12 text-neutral-400 text-sm">
            <div className="text-center">
              <p className="text-neutral-400 mb-1">
                No hay mensajes en la {activeTab === 'queue' ? 'cola' : 'log'}
              </p>
              {selectedProductId && (
                <p className="text-xs text-neutral-500">
                  {activeTab === 'queue' 
                    ? 'Los mensajes de este producto aparecerán aquí cuando se agreguen a la cola'
                    : 'No hay registros de envío para este producto'}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {displayMessages.map((message) => (
              <QueueMessageCard
                key={message.id}
                message={message}
                onRemove={(id) => setRemoveConfirm(id)}
                onRetry={(id) => setRetryConfirm(id)}
                isLoading={loading}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modales de confirmación */}
      <ConfirmModal
        isOpen={pauseConfirm}
        onClose={() => setPauseConfirm(false)}
        onConfirm={handlePauseBot}
        title="Pausar Bot Puppeteer"
        message="¿Estás seguro de que quieres pausar el bot? Esto detendrá el procesamiento de todos los mensajes en la cola."
        confirmText="Pausar"
        confirmColor="red"
      />

      <ConfirmModal
        isOpen={!!removeConfirm}
        onClose={() => setRemoveConfirm(null)}
        onConfirm={() => handleRemove(removeConfirm)}
        title="Eliminar Mensaje"
        message="¿Estás seguro de que quieres eliminar este mensaje de la cola?"
        confirmText="Eliminar"
        confirmColor="red"
      />

      <ConfirmModal
        isOpen={!!retryConfirm}
        onClose={() => setRetryConfirm(null)}
        onConfirm={() => handleRetry(retryConfirm)}
        title="Reintentar Mensaje"
        message="¿Quieres reintentar el envío de este mensaje?"
        confirmText="Reintentar"
        confirmColor="blue"
      />
    </div>
  );
}


