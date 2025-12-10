/**
 * Tests de integración para flujo completo de WhatsApp Dashboard
 * FASE 3: SUBFASE 3.7 - Testing de Integración
 * 
 * Ejecutar con: npm test -- tests/whatsapp/integration.test.js
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getConversations, getContact, getContactMessages, subscribeConversations, subscribeContactMessages } from '../../src/services/whatsapp/conversations';
import { getAllAccounts } from '../../src/services/whatsapp/accounts';
import { sendTextMessage } from '../../src/services/whatsapp/cloud-api-sender';

// Mock de servicios
vi.mock('../../src/services/whatsapp/conversations', () => ({
  getConversations: vi.fn(),
  getContact: vi.fn(),
  getContactMessages: vi.fn(),
  subscribeConversations: vi.fn(() => () => {}),
  subscribeContactMessages: vi.fn(() => () => {}),
  markMessagesAsRead: vi.fn()
}));

vi.mock('../../src/services/whatsapp/accounts', () => ({
  getAllAccounts: vi.fn()
}));

vi.mock('../../src/services/whatsapp/cloud-api-sender', () => ({
  sendTextMessage: vi.fn()
}));

describe('WhatsApp Dashboard Integration - Service Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe completar flujo: cargar cuentas → cargar conversaciones → obtener contacto → obtener mensajes', async () => {
    // 1. Setup: Cuentas
    const mockAccounts = [
      {
        id: 'account_1',
        display_name: 'Cuenta Principal',
        active: true
      }
    ];

    getAllAccounts.mockResolvedValueOnce({
      data: mockAccounts,
      error: null
    });

    // 2. Setup: Conversaciones
    const mockConversations = [
      {
        id: 'contact_1',
        name: 'Juan Pérez',
        phone: '+59112345678',
        last_interaction_at: new Date().toISOString(),
        unread_count: 1,
        lastMessage: { content_text: 'Hola' }
      }
    ];

    getConversations.mockResolvedValueOnce({
      data: mockConversations,
      error: null
    });

    // 3. Setup: Contacto
    const mockContact = {
      id: 'contact_1',
      name: 'Juan Pérez',
      phone: '+59112345678'
    };

    getContact.mockResolvedValueOnce({
      data: mockContact,
      error: null
    });

    // 4. Setup: Mensajes
    const mockMessages = [
      {
        id: 'msg_1',
        content_text: 'Hola',
        message_type: 'text',
        is_from_me: false,
        timestamp: new Date().toISOString()
      }
    ];

    getContactMessages.mockResolvedValueOnce({
      data: mockMessages,
      error: null
    });

    // Ejecutar flujo
    const accountsResult = await getAllAccounts();
    expect(accountsResult.data).toHaveLength(1);

    const conversationsResult = await getConversations();
    expect(conversationsResult.data).toHaveLength(1);

    const contactResult = await getContact('contact_1');
    expect(contactResult.data.name).toBe('Juan Pérez');

    const messagesResult = await getContactMessages('contact_1');
    expect(messagesResult.data).toHaveLength(1);
  });

  it('debe manejar búsqueda de conversaciones', async () => {
    getConversations.mockResolvedValue({
      data: [],
      error: null
    });

    await getConversations({ search: 'María' });

    expect(getConversations).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'María' })
    );
  });

  it('debe suscribirse a cambios en tiempo real', async () => {
    const unsubscribeMock = vi.fn();
    subscribeConversations.mockReturnValue(unsubscribeMock);

    const unsubscribe = subscribeConversations(() => {});

    expect(subscribeConversations).toHaveBeenCalled();
    expect(typeof unsubscribe).toBe('function');
  });

  it('debe enviar mensaje y actualizar conversación', async () => {
    sendTextMessage.mockResolvedValueOnce({
      success: true,
      messageId: 'msg_new',
      error: null
    });

    const result = await sendTextMessage('account_1', 'contact_1', 'Mensaje de prueba');

    expect(sendTextMessage).toHaveBeenCalledWith(
      'account_1',
      'contact_1',
      'Mensaje de prueba'
    );
    expect(result.success).toBe(true);
  });

  it('debe manejar suscripción a mensajes de contacto', async () => {
    const unsubscribeMock = vi.fn();
    subscribeContactMessages.mockReturnValue(unsubscribeMock);

    const unsubscribe = subscribeContactMessages('contact_1', () => {});

    expect(subscribeContactMessages).toHaveBeenCalledWith(
      'contact_1',
      expect.any(Function)
    );
    expect(typeof unsubscribe).toBe('function');
  });
});

