/**
 * Componente CRM Principal
 * FASE 3: SUBFASE 3.1 - Refactorizar SequenceConfigurator → CRM
 * SUBFASE 1: Estado compartido de producto entre Leads y Secuencias
 * 
 * Componente principal del CRM con dos tabs:
 * - Leads: Gestión de leads con vista Kanban
 * - Secuencias: Gestión de secuencias de mensajes (componente original)
 */

import React, { useState, useEffect } from 'react';
import { Users, FileText, MessageSquare } from 'lucide-react';
import SequenceConfigurator from './SequenceConfigurator';
import LeadsKanban from './LeadsKanban';
import TemplateManager from './TemplateManager';
import { getAllAccounts } from '../../services/whatsapp/accounts';
import { getUserSkus, isAdmin } from '../../utils/whatsapp/user-products';
import { useToast } from '../ToastProvider';

export default function CRM({ session }) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('leads'); // 'leads' o 'sequences'
  // SUBFASE 1: Estado compartido de producto seleccionado
  const [sharedProductId, setSharedProductId] = useState(null);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [accountIdForTemplates, setAccountIdForTemplates] = useState(null);
  const [loadingAccount, setLoadingAccount] = useState(false);

  const userSkus = getUserSkus(session);
  const admin = isAdmin(session);

  // Función para cambiar a secuencias con producto seleccionado
  const switchToSequences = (productId) => {
    if (productId) {
      setSharedProductId(productId);
    }
    setActiveTab('sequences');
  };

  // Obtener accountId desde el producto seleccionado
  useEffect(() => {
    const loadAccountForProduct = async () => {
      if (!sharedProductId) {
        setAccountIdForTemplates(null);
        return;
      }

      try {
        setLoadingAccount(true);
        const { data: accounts, error } = await getAllAccounts(userSkus);
        
        if (error) {
          console.error('[CRM] Error cargando cuentas:', error);
          setAccountIdForTemplates(null);
          return;
        }

        // Buscar la cuenta que tenga el product_id seleccionado
        const accountForProduct = accounts?.find(acc => acc.product_id === sharedProductId);
        
        if (accountForProduct) {
          setAccountIdForTemplates(accountForProduct.id);
        } else {
          setAccountIdForTemplates(null);
        }
      } catch (err) {
        console.error('[CRM] Error fatal cargando cuenta:', err);
        setAccountIdForTemplates(null);
      } finally {
        setLoadingAccount(false);
      }
    };

    loadAccountForProduct();
  }, [sharedProductId, userSkus]);

  // Función para abrir TemplateManager
  const handleOpenTemplates = () => {
    if (!sharedProductId) {
      toast.push({
        type: 'warning',
        title: 'Producto requerido',
        message: 'Por favor, selecciona un producto primero para gestionar templates'
      });
      return;
    }

    if (!accountIdForTemplates) {
      toast.push({
        type: 'warning',
        title: 'Cuenta no encontrada',
        message: 'No se encontró una cuenta WhatsApp asociada a este producto. Configura una cuenta primero.'
      });
      return;
    }

    setShowTemplateManager(true);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#121f27] overflow-hidden">
      {/* Header con tabs */}
      <header className="border-b border-neutral-800 bg-[#0f171e] px-6 py-4">
        <div className="mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2 text-neutral-200">
            <Users className="w-5 h-5 text-[#f09929]" />
            CRM
          </h2>
          <p className="text-sm text-neutral-400 mt-1">
            Gestiona tus leads y flujos de mensajes
          </p>
        </div>

        {/* Tabs y botones de acción */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('leads')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === 'leads'
                ? 'bg-[#e7922b] text-[#1a2430]'
                : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
            }`}
          >
            <Users className="w-4 h-4" />
            Leads
          </button>

          <button
            onClick={() => setActiveTab('sequences')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === 'sequences'
                ? 'bg-[#e7922b] text-[#1a2430]'
                : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Secuencias
          </button>

          {/* Botón de Templates - FASE 1: SUBFASE 1.3 */}
          <button
            onClick={handleOpenTemplates}
            disabled={!sharedProductId || loadingAccount}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              !sharedProductId || loadingAccount
                ? 'bg-neutral-700 text-neutral-500 cursor-not-allowed'
                : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-[#e7922b]'
            }`}
            title={
              !sharedProductId
                ? 'Selecciona un producto primero'
                : !accountIdForTemplates
                ? 'No hay cuenta WhatsApp para este producto'
                : 'Gestionar Templates de WhatsApp'
            }
          >
            <FileText className="w-4 h-4" />
            Templates
          </button>
        </div>
      </header>

      {/* Contenido según tab activo */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'leads' ? (
          <LeadsKanban 
            session={session} 
            sharedProductId={sharedProductId}
            setSharedProductId={setSharedProductId}
            onSwitchToSequences={switchToSequences}
          />
        ) : (
          <SequenceConfigurator 
            session={session} 
            initialProductId={sharedProductId}
            onProductChange={setSharedProductId}
          />
        )}
      </div>

      {/* Modal para gestionar templates - FASE 1: SUBFASE 1.3 */}
      <TemplateManager
        isOpen={showTemplateManager}
        onClose={() => setShowTemplateManager(false)}
        accountId={accountIdForTemplates}
        productId={sharedProductId}
      />
    </div>
  );
}

