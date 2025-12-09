/**
 * Modal para crear lead manualmente
 * FASE 3: SUBFASE 3.5 - Botón Crear Lead
 * 
 * Permite crear un lead manualmente seleccionando contacto, cuenta y producto
 */

import React, { useState, useEffect } from 'react';
import { X, User, Phone, DollarSign, Search } from 'lucide-react';
import { useToast } from '../ToastProvider';
import { createLead, createLeadFromContact } from '../../services/whatsapp/leads';
import { getAllAccounts } from '../../services/whatsapp/accounts';
import { getConversations } from '../../services/whatsapp/conversations';
import { getUserSkus } from '../../utils/whatsapp/user-products';

export default function CreateLeadModal({ productId, onClose, onSuccess, session, selectedProductId, preSelectedContactId = null, preSelectedAccountId = null }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [searchContact, setSearchContact] = useState('');
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [formData, setFormData] = useState({
    estimated_value: 0,
    notes: '',
    lead_score: 0
  });

  const userSkus = getUserSkus(session);

  useEffect(() => {
    loadAccounts();
    loadContacts();
    
    // Si hay cuenta pre-seleccionada, seleccionarla automáticamente
    if (preSelectedAccountId) {
      setSelectedAccountId(preSelectedAccountId);
    }
  }, [selectedProductId, userSkus, preSelectedAccountId]);

  // Pre-seleccionar contacto cuando se carguen los contactos
  useEffect(() => {
    if (preSelectedContactId && contacts.length > 0) {
      const contact = contacts.find(c => c.id === preSelectedContactId);
      if (contact) {
        setSelectedContact(contact);
      }
    }
  }, [preSelectedContactId, contacts]);

  useEffect(() => {
    if (searchContact.trim()) {
      const filtered = contacts.filter(contact => {
        const name = (contact.name || '').toLowerCase();
        const phone = (contact.phone || '').toLowerCase();
        const search = searchContact.toLowerCase();
        return name.includes(search) || phone.includes(search);
      });
      setFilteredContacts(filtered);
    } else {
      setFilteredContacts(contacts.slice(0, 10)); // Mostrar primeros 10
    }
  }, [searchContact, contacts]);

  const loadAccounts = async () => {
    try {
      const { data, error } = await getAllAccounts(userSkus);
      if (error) {
        console.error('[CreateLeadModal] Error cargando cuentas:', error);
        return;
      }

      let activeAccounts = (data || []).filter(acc => acc.active);
      
      // Filtrar por producto si hay uno seleccionado
      if (selectedProductId) {
        activeAccounts = activeAccounts.filter(acc => acc.product_id === selectedProductId);
      }

      setAccounts(activeAccounts);
      
      // Seleccionar primera cuenta si existe
      if (activeAccounts.length > 0 && !selectedAccountId) {
        setSelectedAccountId(activeAccounts[0].id);
      }
    } catch (err) {
      console.error('[CreateLeadModal] Error fatal cargando cuentas:', err);
    }
  };

  const loadContacts = async () => {
    try {
      const { data, error } = await getConversations({
        userSkus: userSkus,
        productId: selectedProductId || undefined,
        limit: 100
      });

      if (error) {
        console.error('[CreateLeadModal] Error cargando contactos:', error);
        return;
      }

      // Extraer contactos únicos de las conversaciones
      const uniqueContacts = [];
      const contactMap = new Map();

      (data || []).forEach(conv => {
        if (conv.id && !contactMap.has(conv.id)) {
          contactMap.set(conv.id, {
            id: conv.id,
            name: conv.name || 'Sin nombre',
            phone: conv.phone || 'Sin teléfono',
            account_id: conv.account_id
          });
        }
      });

      setContacts(Array.from(contactMap.values()));
      setFilteredContacts(Array.from(contactMap.values()).slice(0, 10));
    } catch (err) {
      console.error('[CreateLeadModal] Error fatal cargando contactos:', err);
    }
  };

  const handleCreateLead = async () => {
    if (!selectedContact) {
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'Debes seleccionar un contacto'
      });
      return;
    }

    if (!selectedAccountId) {
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'Debes seleccionar una cuenta WhatsApp'
      });
      return;
    }

    if (!selectedProductId) {
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'Debes seleccionar un producto'
      });
      return;
    }

    try {
      setLoading(true);

      // Crear lead desde contacto
      const { data, error } = await createLead({
        contact_id: selectedContact.id,
        account_id: selectedAccountId,
        product_id: selectedProductId,
        pipeline_stage: 'entrantes',
        source: 'manual',
        estimated_value: parseFloat(formData.estimated_value) || 0,
        notes: formData.notes.trim() || null,
        lead_score: parseInt(formData.lead_score) || 0
      });

      if (error) {
        // Si es error de duplicado, informar pero no fallar
        if (error.code === 'DUPLICATE_LEAD') {
          toast.push({
            type: 'warning',
            title: 'Lead ya existe',
            message: 'Este contacto ya tiene un lead activo para este producto'
          });
          if (onSuccess) onSuccess();
          onClose();
          return;
        }
        throw error;
      }

      toast.push({
        type: 'success',
        title: 'Éxito',
        message: 'Lead creado correctamente'
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('[CreateLeadModal] Error creando lead:', err);
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'No se pudo crear el lead: ' + (err.message || 'Error desconocido')
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-[#0f171e] border border-neutral-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-800">
          <h3 className="text-lg font-semibold text-neutral-200 flex items-center gap-2">
            <User className="w-5 h-5 text-[#e7922b]" />
            Crear Lead
          </h3>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Selección de Contacto */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Contacto <span className="text-red-400">*</span>
            </label>
            
            {/* Búsqueda */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                value={searchContact}
                onChange={(e) => setSearchContact(e.target.value)}
                placeholder="Buscar contacto por nombre o teléfono..."
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg pl-10 pr-4 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#e7922b]"
              />
            </div>

            {/* Lista de contactos */}
            <div className="max-h-48 overflow-y-auto border border-neutral-700 rounded-lg">
              {filteredContacts.length === 0 ? (
                <div className="text-center py-8 text-neutral-500 text-sm">
                  No se encontraron contactos
                </div>
              ) : (
                filteredContacts.map(contact => (
                  <button
                    key={contact.id}
                    onClick={() => setSelectedContact(contact)}
                    className={`w-full text-left p-3 hover:bg-neutral-800 transition ${
                      selectedContact?.id === contact.id
                        ? 'bg-neutral-800 border-l-2 border-[#e7922b]'
                        : 'border-l-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-neutral-200">
                          {contact.name}
                        </div>
                        <div className="text-xs text-neutral-400 flex items-center gap-1 mt-1">
                          <Phone className="w-3 h-3" />
                          {contact.phone}
                        </div>
                      </div>
                      {selectedContact?.id === contact.id && (
                        <div className="w-2 h-2 bg-[#e7922b] rounded-full" />
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Selección de Cuenta */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Cuenta WhatsApp <span className="text-red-400">*</span>
            </label>
            <select
              value={selectedAccountId || ''}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#e7922b]"
            >
              <option value="">Selecciona una cuenta</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.display_name || acc.phone_number}
                </option>
              ))}
            </select>
          </div>

          {/* Valor Estimado */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Valor Estimado
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="number"
                value={formData.estimated_value}
                onChange={(e) => setFormData(prev => ({ ...prev, estimated_value: e.target.value }))}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg pl-10 pr-4 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#e7922b]"
                placeholder="0"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* Lead Score */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Lead Score (0-100)
            </label>
            <input
              type="number"
              value={formData.lead_score}
              onChange={(e) => setFormData(prev => ({ ...prev, lead_score: e.target.value }))}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#e7922b]"
              placeholder="0"
              min="0"
              max="100"
            />
            <div className="mt-2 w-full bg-neutral-700 rounded-full h-2">
              <div
                className="bg-[#e7922b] h-2 rounded-full transition-all"
                style={{ width: `${formData.lead_score || 0}%` }}
              />
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Notas
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={4}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#e7922b] resize-none"
              placeholder="Agrega notas sobre este lead..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-neutral-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg transition text-sm"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            onClick={handleCreateLead}
            disabled={loading || !selectedContact || !selectedAccountId}
            className="px-4 py-2 bg-[#e7922b] hover:bg-[#d8821b] text-[#1a2430] font-semibold rounded-lg transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creando...' : 'Crear Lead'}
          </button>
        </div>
      </div>
    </div>
  );
}

