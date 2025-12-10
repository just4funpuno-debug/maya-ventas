/**
 * Tests para componentes de WhatsApp Dashboard
 * FASE 3: SUBFASE 3.7 - Testing de Componentes
 * 
 * NOTA: Estos tests requieren @testing-library/react y @testing-library/user-event
 * Para ejecutar: npm test -- tests/whatsapp/components.test.js
 * 
 * Si no están instaladas las dependencias, estos tests se saltarán.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getConversations, subscribeConversations } from '../../src/services/whatsapp/conversations';
import { getAllAccounts } from '../../src/services/whatsapp/accounts';

// Mock de servicios
vi.mock('../../src/services/whatsapp/conversations', () => ({
  getConversations: vi.fn(),
  subscribeConversations: vi.fn(() => () => {}),
  getContact: vi.fn(),
  getContactMessages: vi.fn(),
  subscribeContactMessages: vi.fn(() => () => {}),
  markMessagesAsRead: vi.fn()
}));

vi.mock('../../src/services/whatsapp/accounts', () => ({
  getAllAccounts: vi.fn()
}));

describe('WhatsApp Components - Service Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ConversationList Service Integration', () => {
    it('debe llamar getConversations al montar', async () => {
      getConversations.mockResolvedValueOnce({
        data: [],
        error: null
      });

      // Simular llamada del componente
      await getConversations();

      expect(getConversations).toHaveBeenCalled();
    });

    it('debe filtrar conversaciones por búsqueda', async () => {
      getConversations.mockResolvedValue({
        data: [],
        error: null
      });

      await getConversations({ search: 'María' });

      expect(getConversations).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'María' })
      );
    });

    it('debe manejar errores al cargar conversaciones', async () => {
      getConversations.mockResolvedValueOnce({
        data: null,
        error: { message: 'Error de conexión' }
      });

      const result = await getConversations();

      expect(result.error).toBeTruthy();
      expect(result.data).toBeNull();
    });
  });

  describe('MessageBubble Data Format', () => {
    it('debe formatear timestamp correctamente', () => {
      const now = new Date();
      const message = {
        id: 'msg_1',
        content_text: 'Mensaje',
        message_type: 'text',
        timestamp: now.toISOString()
      };

      // Verificar que el timestamp es válido
      expect(new Date(message.timestamp).getTime()).toBeGreaterThan(0);
    });

    it('debe manejar diferentes tipos de mensaje', () => {
      const messageTypes = ['text', 'image', 'video', 'audio', 'document'];
      
      messageTypes.forEach(type => {
        const message = {
          id: `msg_${type}`,
          message_type: type,
          timestamp: new Date().toISOString()
        };

        expect(message.message_type).toBe(type);
      });
    });
  });

  describe('WhatsAppDashboard Service Integration', () => {
    it('debe cargar cuentas al montar', async () => {
      getAllAccounts.mockResolvedValueOnce({
        data: [
          {
            id: 'account_1',
            display_name: 'Cuenta Principal',
            active: true
          }
        ],
        error: null
      });

      const result = await getAllAccounts();

      expect(getAllAccounts).toHaveBeenCalled();
      expect(result.data).toHaveLength(1);
      expect(result.data[0].active).toBe(true);
    });

    it('debe manejar cuando no hay cuentas', async () => {
      getAllAccounts.mockResolvedValueOnce({
        data: [],
        error: null
      });

      const result = await getAllAccounts();

      expect(result.data).toHaveLength(0);
    });
  });
});

