/**
 * Componente de prueba para FASE 2
 * Permite probar todas las funcionalidades de envío de mensajes
 */

import React, { useState, useEffect } from 'react';
import { useToast } from '../ToastProvider';
import MessageSender from './MessageSender';
import WindowIndicator from './WindowIndicator';
import SendMethodBadge from './SendMethodBadge';
import { 
  sendTextMessage, 
  sendImageMessage, 
  sendVideoMessage, 
  sendAudioMessage, 
  sendDocumentMessage 
} from '../../services/whatsapp/cloud-api-sender';
import { 
  decideSendMethod, 
  sendMessageIntelligent,
  getWindow24hInfo 
} from '../../services/whatsapp/send-decision';
import { 
  isWindow24hActive, 
  getHoursRemaining, 
  isWithin72hWindow 
} from '../../utils/whatsapp/window-24h';
import { getAllAccounts } from '../../services/whatsapp/accounts';
import { supabase } from '../../supabaseClient';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function MessageSenderTest() {
  const toast = useToast();
  const [testResults, setTestResults] = useState({});
  const [running, setRunning] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [selectedContactId, setSelectedContactId] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');

  useEffect(() => {
    loadContacts();
    loadAccounts();
  }, []);

  const loadContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_contacts')
        .select('id, name, phone')
        .order('name', { ascending: true })
        .limit(50);
      
      if (error) throw error;
      setContacts(data || []);
      
      if (data && data.length > 0) {
        setSelectedContactId(data[0].id);
      }
    } catch (err) {
      console.error('[MessageSenderTest] Error cargando contactos:', err);
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'No se pudieron cargar contactos: ' + (err.message || 'Error desconocido')
      });
    }
  };

  const loadAccounts = async () => {
    try {
      const { data, error } = await getAllAccounts();
      if (error) throw error;
      setAccounts(data || []);
      
      if (data && data.length > 0) {
        const activeAccount = data.find(a => a.active) || data[0];
        if (activeAccount) {
          setSelectedAccountId(activeAccount.id);
        }
      }
    } catch (err) {
      console.error('[MessageSenderTest] Error cargando cuentas:', err);
    }
  };

  const runTest = async (testName, testFn) => {
    try {
      setTestResults(prev => ({ ...prev, [testName]: { status: 'running' } }));
      const result = await testFn();
      setTestResults(prev => ({ ...prev, [testName]: { status: 'success', result } }));
      return { success: true, result };
    } catch (err) {
      setTestResults(prev => ({ 
        ...prev, 
        [testName]: { status: 'error', error: err.message || 'Error desconocido' } 
      }));
      return { success: false, error: err.message || 'Error desconocido' };
    }
  };

  const runAllTests = async () => {
    if (!selectedContactId || !selectedAccountId) {
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'Selecciona un contacto y una cuenta primero'
      });
      return;
    }

    setRunning(true);
    setTestResults({});

    // Tests de utilidades de ventana
    await runTest('isWindow24hActive', () => 
      isWindow24hActive(selectedContactId)
    );
    
    await runTest('getHoursRemaining', () => 
      getHoursRemaining(selectedContactId)
    );
    
    await runTest('isWithin72hWindow', () => 
      isWithin72hWindow(selectedContactId)
    );

    // Tests de decisión
    await runTest('decideSendMethod', () => 
      decideSendMethod(selectedContactId)
    );

    await runTest('getWindow24hInfo', () => 
      getWindow24hInfo(selectedContactId)
    );

    // Tests de envío (solo si ventana está activa)
    const methodResult = await decideSendMethod(selectedContactId);
    if (methodResult.method === 'cloud_api') {
      await runTest('sendTextMessage (test)', async () => {
        const result = await sendTextMessage(
          selectedAccountId,
          selectedContactId,
          'Mensaje de prueba desde FASE 2',
          { skipValidation: false }
        );
        if (!result.success) {
          throw new Error(result.error?.message || 'Error al enviar');
        }
        return result;
      });
    } else {
      setTestResults(prev => ({ 
        ...prev, 
        'sendTextMessage (test)': { 
          status: 'skipped', 
          reason: 'Ventana cerrada, usaría Puppeteer' 
        } 
      }));
    }

    // Test de envío inteligente
    await runTest('sendMessageIntelligent', async () => {
      const result = await sendMessageIntelligent(
        selectedAccountId,
        selectedContactId,
        'text',
        { contentText: 'Mensaje inteligente de prueba' },
        { skipValidation: false }
      );
      if (!result.success) {
        throw new Error(result.error?.message || 'Error al enviar');
      }
      return result;
    });

    setRunning(false);
    toast.push({
      type: 'success',
      title: 'Pruebas Completadas',
      message: 'Revisa los resultados abajo'
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'running':
        return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'skipped':
        return <span className="text-xs text-yellow-400">⏭️</span>;
      default:
        return null;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'success':
        return '✅ Éxito';
      case 'error':
        return '❌ Error';
      case 'running':
        return '⏳ Ejecutando...';
      case 'skipped':
        return '⏭️ Omitido';
      default:
        return '⏸️ Pendiente';
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-200 mb-2">
            🧪 Pruebas FASE 2
          </h1>
          <p className="text-sm text-neutral-400">
            Prueba todas las funcionalidades de envío de mensajes
          </p>
        </div>
      </div>

      {/* Selectores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-lg bg-neutral-900 border border-neutral-800">
          <label className="block text-xs font-medium text-neutral-400 mb-2">
            Contacto
          </label>
          <select
            value={selectedContactId}
            onChange={(e) => setSelectedContactId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#e7922b]"
          >
            <option value="">Selecciona un contacto</option>
            {contacts.map(contact => (
              <option key={contact.id} value={contact.id}>
                {contact.name || contact.phone} ({contact.phone})
              </option>
            ))}
          </select>
        </div>

        <div className="p-4 rounded-lg bg-neutral-900 border border-neutral-800">
          <label className="block text-xs font-medium text-neutral-400 mb-2">
            Cuenta WhatsApp
          </label>
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#e7922b]"
          >
            <option value="">Selecciona una cuenta</option>
            {accounts.map(account => (
              <option key={account.id} value={account.id}>
                {account.display_name || account.phone_number} {account.active ? '✓' : '✗'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Información de ventana */}
      {selectedContactId && (
        <div className="p-4 rounded-lg bg-neutral-900 border border-neutral-800">
          <h3 className="text-sm font-semibold text-neutral-200 mb-3">
            Información de Ventana
          </h3>
          <div className="flex items-center gap-4">
            <WindowIndicator contactId={selectedContactId} />
            {selectedContactId && (
              <div className="flex items-center gap-2">
                {(() => {
                  const method = testResults['decideSendMethod']?.result?.method;
                  const reason = testResults['decideSendMethod']?.result?.reason;
                  return method ? (
                    <SendMethodBadge method={method} reason={reason} />
                  ) : null;
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Botón de pruebas */}
      <div className="flex gap-4">
        <button
          onClick={runAllTests}
          disabled={running || !selectedContactId || !selectedAccountId}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#e7922b] text-white font-medium hover:bg-[#d6821b] transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {running ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Ejecutando pruebas...</span>
            </>
          ) : (
            <>
              <span>▶️</span>
              <span>Ejecutar Todas las Pruebas</span>
            </>
          )}
        </button>

        <button
          onClick={loadContacts}
          className="px-4 py-2 rounded-lg bg-neutral-800 text-neutral-200 font-medium hover:bg-neutral-700 transition"
        >
          🔄 Recargar Contactos
        </button>
      </div>

      {/* Resultados de pruebas */}
      <div className="p-4 rounded-lg bg-neutral-900 border border-neutral-800">
        <h3 className="text-sm font-semibold text-neutral-200 mb-4">
          Resultados de Pruebas
        </h3>
        
        {Object.keys(testResults).length === 0 ? (
          <div className="text-center py-8 text-neutral-400 text-sm">
            No hay pruebas ejecutadas aún. Haz clic en "Ejecutar Todas las Pruebas" para comenzar.
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(testResults).map(([testName, result]) => (
              <div
                key={testName}
                className="p-3 rounded-lg bg-neutral-800 border border-neutral-700"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(result.status)}
                    <span className="text-sm font-medium text-neutral-200">
                      {testName}
                    </span>
                  </div>
                  <span className="text-xs text-neutral-400">
                    {getStatusText(result.status)}
                  </span>
                </div>
                
                {result.status === 'success' && result.result && (
                  <div className="mt-2 p-2 rounded bg-neutral-900 text-xs text-neutral-300 font-mono">
                    <pre>{JSON.stringify(result.result, null, 2)}</pre>
                  </div>
                )}
                
                {result.status === 'error' && result.error && (
                  <div className="mt-2 p-2 rounded bg-red-500/20 text-xs text-red-400">
                    {result.error}
                  </div>
                )}
                
                {result.status === 'skipped' && result.reason && (
                  <div className="mt-2 p-2 rounded bg-yellow-500/20 text-xs text-yellow-400">
                    {result.reason}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Componente MessageSender para pruebas manuales */}
      {selectedContactId && selectedAccountId && (
        <div className="p-4 rounded-lg bg-neutral-900 border border-neutral-800">
          <h3 className="text-sm font-semibold text-neutral-200 mb-4">
            Prueba Manual - Envío de Mensajes
          </h3>
          <MessageSender
            contactId={selectedContactId}
            accountId={selectedAccountId}
            onMessageSent={(result) => {
              toast.push({
                type: 'success',
                title: 'Mensaje Enviado',
                message: `Método: ${result.method}, ID: ${result.messageId || result.queueId}`
              });
            }}
          />
        </div>
      )}
    </div>
  );
}


