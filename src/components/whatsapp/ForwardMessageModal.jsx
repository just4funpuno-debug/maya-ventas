/**
 * Modal para reenviar mensaje a múltiples contactos
 * FASE 3: SUBFASE 3.3 - Reenvío de Mensajes
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Search, Check } from 'lucide-react';
import { getConversations } from '../../services/whatsapp/conversations';

export default function ForwardMessageModal({ message, isOpen, onClose, onForward }) {
  const [contacts, setContacts] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadContacts();
      setSelectedContacts([]);
      setSearchQuery('');
    }
  }, [isOpen]);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const { data, error } = await getConversations();
      if (error) {
        console.error('[ForwardMessageModal] Error cargando contactos:', error);
        return;
      }
      setContacts(data || []);
    } catch (err) {
      console.error('[ForwardMessageModal] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleContact = (contactId) => {
    setSelectedContacts(prev => {
      if (prev.includes(contactId)) {
        return prev.filter(id => id !== contactId);
      } else {
        return [...prev, contactId];
      }
    });
  };

  const handleForward = () => {
    if (selectedContacts.length === 0) return;
    
    if (onForward) {
      onForward(selectedContacts);
    }
    onClose();
  };

  const filteredContacts = contacts.filter(contact => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      contact.name?.toLowerCase().includes(query) ||
      contact.phone?.toLowerCase().includes(query)
    );
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-neutral-900 rounded-lg shadow-xl border border-neutral-800 max-h-[80vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <h2 className="text-lg font-semibold text-neutral-200">Reenviar mensaje</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5 text-neutral-400" />
          </button>
        </div>

        {/* Búsqueda */}
        <div className="p-4 border-b border-neutral-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar contacto..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#e7922b]"
            />
          </div>
        </div>

        {/* Lista de contactos */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="text-sm text-neutral-400">Cargando contactos...</div>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-sm text-neutral-400">No se encontraron contactos</div>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredContacts.map(contact => {
                const isSelected = selectedContacts.includes(contact.id);
                return (
                  <button
                    key={contact.id}
                    onClick={() => toggleContact(contact.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition ${
                      isSelected
                        ? 'bg-[#e7922b]/20 border border-[#e7922b]'
                        : 'hover:bg-neutral-800 border border-transparent'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      isSelected
                        ? 'bg-[#e7922b] border-[#e7922b]'
                        : 'border-neutral-600'
                    }`}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium text-neutral-200 truncate">
                        {contact.name || contact.phone || 'Sin nombre'}
                      </p>
                      {contact.name && (
                        <p className="text-xs text-neutral-400 truncate">{contact.phone}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-800 flex items-center justify-between">
          <div className="text-sm text-neutral-400">
            {selectedContacts.length > 0
              ? `${selectedContacts.length} contacto${selectedContacts.length > 1 ? 's' : ''} seleccionado${selectedContacts.length > 1 ? 's' : ''}`
              : 'Selecciona contactos'}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-neutral-800 text-neutral-200 text-sm font-medium hover:bg-neutral-700 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleForward}
              disabled={selectedContacts.length === 0}
              className="px-4 py-2 rounded-lg bg-[#e7922b] text-white text-sm font-medium hover:bg-[#d6821b] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reenviar
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

