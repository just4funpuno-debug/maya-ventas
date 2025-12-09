/**
 * Dashboard principal tipo WhatsApp Web
 * FASE 3: SUBFASE 3.6 - Dashboard Principal
 * FASE 3: SUBFASE 3.2 - Integración con filtrado por productos
 * 
 * Integra lista de conversaciones y chat individual
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAllAccounts, getProducts } from '../../services/whatsapp/accounts';
import ConversationList from './ConversationList';
import ChatWindow from './ChatWindow';
import { useWhatsAppNotifications } from '../../hooks/useWhatsAppNotifications';
import NotificationBadge from './NotificationBadge';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';
import TagManagerModal from './TagManagerModal';
import QuickReplyManager from './QuickReplyManager';
import BlockedContactsModal from './BlockedContactsModal';
import { getUserSkus, isAdmin, getUserProducts } from '../../utils/whatsapp/user-products';

export default function WhatsAppDashboard({ session }) {
  const [selectedContactId, setSelectedContactId] = useState(null);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);
  const [showQuickReplyManager, setShowQuickReplyManager] = useState(false);
  const [showBlockedContactsModal, setShowBlockedContactsModal] = useState(false);
  const [tagsUpdateKey, setTagsUpdateKey] = useState(0); // Key para forzar recarga de etiquetas
  const [selectedProductId, setSelectedProductId] = useState(null); // Producto seleccionado en tab
  const [allProducts, setAllProducts] = useState([]); // Todos los productos disponibles
  const [userProducts, setUserProducts] = useState([]); // Productos del usuario
  const [productCounts, setProductCounts] = useState({}); // { productId: count } - Contador de conversaciones por producto
  const [isChangingProduct, setIsChangingProduct] = useState(false); // Indicador de carga al cambiar producto

  // Layout responsive
  const layout = useResponsiveLayout();

  // Notificaciones en tiempo real
  const { unreadCount, resetUnreadCount } = useWhatsAppNotifications({
    enabled: true,
    soundEnabled: false, // Cambiar a true si quieres sonido
    currentContactId: selectedContactId
  });

  // Obtener userSkus del session
  const userSkus = getUserSkus(session);
  const admin = isAdmin(session);

  // Cargar productos disponibles
  useEffect(() => {
    loadProducts();
  }, [session]);

  // Cargar cuentas disponibles
  useEffect(() => {
    loadAccounts();
  }, [userSkus, selectedProductId]); // Recargar cuando cambien los productos del usuario o el producto seleccionado

  // Actualizar contadores cuando cambian las cuentas
  useEffect(() => {
    const counts = {};
    if (admin) {
      counts['all'] = accounts.length;
    }
    accounts.forEach(acc => {
      if (acc.product_id) {
        counts[acc.product_id] = (counts[acc.product_id] || 0) + 1;
      }
    });
    setProductCounts(counts);
  }, [accounts, admin]);

  const loadProducts = async () => {
    try {
      const { data, error } = await getProducts();
      if (error) {
        console.error('[WhatsAppDashboard] Error cargando productos:', error);
        return;
      }
      
      setAllProducts(data || []);
      
      // Filtrar productos del usuario
      const filtered = getUserProducts(session, data || []);
      setUserProducts(filtered);
      
        // FASE 3: SUBFASE 3.3 - Si hay productos y no hay selección, seleccionar el primero (siempre, sin importar si es admin)
        if (filtered.length > 0 && !selectedProductId) {
          setSelectedProductId(filtered[0].id);
        }
    } catch (err) {
      console.error('[WhatsAppDashboard] Error fatal cargando productos:', err);
    }
  };

  const loadAccounts = async () => {
    try {
      setLoading(true);
      // Pasar userSkus para filtrar cuentas por productos
      const { data, error } = await getAllAccounts(userSkus);
      
      if (error) {
        console.error('[WhatsAppDashboard] Error cargando cuentas:', error);
        return;
      }

      let activeAccounts = (data || []).filter(acc => acc.active);
      
      // Calcular contadores por producto
      const counts = {};
      activeAccounts.forEach(acc => {
        if (acc.product_id) {
          counts[acc.product_id] = (counts[acc.product_id] || 0) + 1;
        }
      });
      setProductCounts(counts);
      
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
      console.error('[WhatsAppDashboard] Error fatal:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProductChange = async (productId) => {
    setIsChangingProduct(true);
    setSelectedProductId(productId);
    // El useEffect se encargará de recargar los datos
    // Simular un pequeño delay para mostrar el indicador
    setTimeout(() => {
      setIsChangingProduct(false);
    }, 300);
  };

  const handleSelectContact = (contactId) => {
    setSelectedContactId(contactId);
    setShowMobileMenu(false); // Cerrar menú en móvil al seleccionar
  };

  const handleBack = () => {
    setSelectedContactId(null);
    setShowMobileMenu(false);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-neutral-900">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-12 h-12 border-4 border-[#e7922b]/20 border-t-[#e7922b] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-neutral-400">Cargando dashboard...</p>
        </motion.div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="h-full flex items-center justify-center bg-neutral-900 p-4"
      >
        <div className="text-center max-w-md">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-16 h-16 rounded-full bg-[#e7922b]/10 flex items-center justify-center mx-auto mb-4"
          >
            <span className="text-2xl">💬</span>
          </motion.div>
          <h2 className="text-lg font-semibold text-neutral-200 mb-2">
            No hay cuentas WhatsApp configuradas
          </h2>
          <p className="text-sm text-neutral-400 mb-4">
            Configura al menos una cuenta WhatsApp para comenzar a usar el dashboard.
          </p>
        </div>
      </motion.div>
    );
  }

  // Obtener productos para mostrar en tabs
  const productsToShow = admin ? allProducts : userProducts;
  const hasMultipleProducts = productsToShow.length > 1 || admin;

  return (
    <div className="h-full w-full flex flex-col bg-neutral-900 overflow-hidden">
      {/* Header con badge de notificaciones */}
      <div className={`flex flex-col ${layout.padding} border-b border-neutral-800 bg-neutral-900/95 backdrop-blur-sm flex-shrink-0 w-full`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            {/* Botón menú hamburguesa para móvil */}
            {selectedContactId && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowMobileMenu(true)}
                className="md:hidden p-2 rounded-lg hover:bg-neutral-800 transition"
                aria-label="Abrir menú"
              >
                <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </motion.button>
            )}
            <h1 className="text-lg font-semibold text-neutral-200">Chat WhatsApp</h1>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBadge count={unreadCount} onClick={resetUnreadCount} />
          </div>
        </div>
        
        {/* Tabs por productos */}
        {hasMultipleProducts && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-neutral-800">
            {productsToShow.map(product => (
              <button
                key={product.id}
                onClick={() => handleProductChange(product.id)}
                disabled={isChangingProduct}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition flex items-center gap-2 ${
                  selectedProductId === product.id
                    ? 'bg-[#e7922b] text-[#1a2430]'
                    : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                } ${isChangingProduct ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {product.name}
                {productCounts[product.id] !== undefined && (
                  <span className={`px-1.5 py-0.5 rounded text-xs ${
                    selectedProductId === product.id
                      ? 'bg-[#1a2430]/30 text-[#1a2430]'
                      : 'bg-neutral-700 text-neutral-300'
                  }`}>
                    {productCounts[product.id]}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
        
        {/* Indicador de carga al cambiar producto */}
        {isChangingProduct && (
          <div className="absolute inset-0 bg-neutral-900/50 backdrop-blur-sm flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-neutral-800 rounded-lg p-4 flex items-center gap-3"
            >
              <div className="w-5 h-5 border-2 border-[#e7922b]/20 border-t-[#e7922b] rounded-full animate-spin"></div>
              <span className="text-sm text-neutral-300">Cargando...</span>
            </motion.div>
          </div>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden relative w-full h-full">
        {/* Overlay para móvil cuando el menú está abierto */}
        <AnimatePresence>
          {showMobileMenu && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileMenu(false)}
              className="md:hidden fixed inset-0 bg-black/50 z-40"
            />
          )}
        </AnimatePresence>

        {/* Lista de conversaciones (izquierda) */}
        {/* En desktop: siempre visible. En móvil: solo cuando no hay contacto seleccionado o cuando showMobileMenu está activo */}
        {/* Ancho y Alto FIJOS según breakpoint - NO cambian según cantidad de chats */}
        <div
          className={`${
            // En móvil: ocultar cuando hay contacto seleccionado (excepto si showMobileMenu está activo)
            // En desktop: siempre visible
            selectedContactId && !showMobileMenu && layout.isMobile ? 'hidden' : 'flex'
          } ${layout.isMobile ? 'absolute' : 'relative'} ${layout.isMobile ? 'inset-0' : ''} border-r border-neutral-800 shadow-lg bg-neutral-900 ${layout.isMobile ? 'z-50' : 'z-auto'} flex-shrink-0 h-full`}
          style={{
            width: layout.isMobile ? '100%' : layout.conversationList.width,
            minWidth: layout.isMobile ? '100%' : layout.conversationList.minWidth,
            maxWidth: layout.isMobile ? '100%' : layout.conversationList.maxWidth,
            height: '100%', // Altura fija: 100% del contenedor padre
            minHeight: '100%',
            maxHeight: '100%',
            flexShrink: 0, // No permitir que se comprima
          }}
        >
          <ConversationList
            selectedContactId={selectedContactId}
            onSelectContact={handleSelectContact}
            loading={loading}
            accountId={selectedAccountId}
            session={session}
            selectedProductId={selectedProductId}
            onOpenTagManager={() => setShowTagManager(true)}
            onOpenQuickReplyManager={() => setShowQuickReplyManager(true)}
            onOpenBlockedContacts={() => setShowBlockedContactsModal(true)}
          />
        </div>

        {/* Chat individual (derecha) */}
        {/* Ancho y Alto FIJOS - Ocupa todo el espacio restante hasta el final del lado derecho */}
        <div
          className={`${
            selectedContactId || !layout.isMobile ? 'flex' : 'hidden'
          } flex-1 w-full min-w-0 h-full`}
          style={{
            minWidth: layout.chatWindow.minWidth,
            maxWidth: layout.isDesktop && !selectedContactId ? layout.chatWindow.maxWidth : '100%',
            width: layout.isDesktop && !selectedContactId ? 'auto' : '100%', // Ocupa todo el espacio restante
            height: '100%', // Altura fija: 100% del contenedor padre
            minHeight: '100%',
            maxHeight: '100%',
            margin: layout.isDesktop && !selectedContactId ? '0 auto' : '0',
            flexShrink: 0, // No permitir que se comprima
          }}
        >
          {selectedContactId ? (
            <ChatWindow
              key={`chat-${selectedContactId}-${tagsUpdateKey}`}
              contactId={selectedContactId}
              accountId={selectedAccountId}
              session={session}
              onBack={handleBack}
              onOpenTagManager={() => setShowTagManager(true)}
            />
          ) : (
            <div className="h-full flex items-center justify-center bg-neutral-900 w-full">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-[#e7922b]/10 flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">💬</span>
                </div>
                <p className="text-sm text-neutral-400">
                  Selecciona una conversación para comenzar
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal para gestionar etiquetas */}
      <TagManagerModal
        isOpen={showTagManager}
        onClose={() => setShowTagManager(false)}
        accountId={selectedAccountId}
        productId={selectedProductId}
        contactId={selectedContactId}
        onTagsUpdated={() => {
          // Forzar recarga de etiquetas en ChatWindow
          setTagsUpdateKey(prev => prev + 1);
        }}
      />

      {/* Modal para gestionar respuestas rápidas */}
      <QuickReplyManager
        isOpen={showQuickReplyManager}
        onClose={() => setShowQuickReplyManager(false)}
        accountId={selectedAccountId}
        productId={selectedProductId}
      />

      {/* Modal para contactos bloqueados - FASE 2: SUBFASE 2.2 / FASE 3: SUBFASE 3.2 */}
      <BlockedContactsModal
        isOpen={showBlockedContactsModal}
        onClose={() => setShowBlockedContactsModal(false)}
        accountId={selectedAccountId}
        productId={selectedProductId}
      />
    </div>
  );
}

