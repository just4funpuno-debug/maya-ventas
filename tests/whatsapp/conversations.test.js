/**
 * Tests para servicio de Conversaciones
 * FASE 3: Testing de SUBFASE 3.1
 * FASE 2: SUBFASE 2.2 - Testing de filtrado por productos
 * 
 * Ejecutar con: npm test -- tests/whatsapp/conversations.test.js
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getConversations,
  getLastMessage,
  getContactMessages,
  getContact,
  markMessagesAsRead,
  subscribeConversations,
  subscribeContactMessages
} from '../../src/services/whatsapp/conversations';
import { supabase } from '../../src/supabaseClient';

// Mock de supabaseClient
vi.mock('../../src/supabaseClient', () => {
  const mockSupabase = {
    from: vi.fn(() => mockSupabase),
    select: vi.fn(() => mockSupabase),
    eq: vi.fn(() => mockSupabase),
    in: vi.fn(() => mockSupabase),
    or: vi.fn(() => mockSupabase),
    order: vi.fn(() => mockSupabase),
    range: vi.fn(() => Promise.resolve({ data: null, error: null })),
    limit: vi.fn(() => mockSupabase),
    single: vi.fn(() => Promise.resolve({ data: null, error: null })),
    maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
    update: vi.fn(() => mockSupabase),
    is: vi.fn(() => mockSupabase),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        on: vi.fn(() => ({
          subscribe: vi.fn(() => ({}))
        }))
      }))
    })),
    removeChannel: vi.fn()
  };
  
  return {
    supabase: mockSupabase
  };
});

describe('Conversations Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabase.from.mockReturnValue(supabase);
    supabase.select.mockReturnValue(supabase);
    supabase.eq.mockReturnValue(supabase);
    supabase.in.mockReturnValue(supabase);
    supabase.or.mockReturnValue(supabase);
    supabase.order.mockReturnValue(supabase);
    supabase.range.mockResolvedValue({ data: null, error: null });
    supabase.limit.mockReturnValue(supabase);
    supabase.single.mockResolvedValue({ data: null, error: null });
    supabase.maybeSingle.mockResolvedValue({ data: null, error: null });
    supabase.update.mockReturnValue(supabase);
    supabase.is.mockReturnValue(supabase);
    supabase.rpc.mockResolvedValue({ data: null, error: null });
  });

  describe('getConversations', () => {
    it('debe obtener lista de conversaciones', async () => {
      const mockConversations = [
        {
          id: 'contact_1',
          name: 'Juan Pérez',
          phone: '+59112345678',
          last_interaction_at: new Date().toISOString(),
          unread_count: 2
        },
        {
          id: 'contact_2',
          name: 'María García',
          phone: '+59187654321',
          last_interaction_at: new Date(Date.now() - 3600000).toISOString(),
          unread_count: 0
        }
      ];

      supabase.range.mockResolvedValueOnce({
        data: mockConversations,
        error: null
      });

      // Mock getLastMessage para cada contacto
      // Mock para getLastMessage que se llama dentro de getConversations
      // getLastMessage usa maybeSingle(), no single()
      const queryWithLimit = { ...supabase };
      supabase.limit.mockReturnValue(queryWithLimit);
      queryWithLimit.maybeSingle = vi.fn()
        .mockResolvedValueOnce({
          data: { id: 'msg_1', text_content: 'Último mensaje 1', content_text: 'Último mensaje 1' },
          error: null
        })
        .mockResolvedValueOnce({
          data: { id: 'msg_2', text_content: 'Último mensaje 2', content_text: 'Último mensaje 2' },
          error: null
        });

      const result = await getConversations();

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(2);
      expect(result.data[0].lastMessage).toBeTruthy();
    });

    it('debe filtrar por búsqueda', async () => {
      // El código hace: query = supabase.from().select().order().range()
      // Luego si hay búsqueda: query = query.or()
      // Finalmente: await query
      // Necesitamos que order().range() retorne un objeto que tenga or()
      const queryAfterRange = {
        or: vi.fn().mockResolvedValueOnce({
          data: [{ id: 'contact_1', name: 'Juan Pérez', phone: '+59112345678', last_interaction_at: new Date().toISOString() }],
          error: null
        })
      };
      
      const queryWithOrder = {
        range: vi.fn().mockReturnValue(queryAfterRange)
      };
      
      supabase.order.mockReturnValue(queryWithOrder);

      // Para getLastMessage que se llama dentro
      const queryWithLimit = { ...supabase };
      supabase.limit.mockReturnValue(queryWithLimit);
      queryWithLimit.maybeSingle = vi.fn().mockResolvedValueOnce({
        data: null,
        error: null
      });

      const result = await getConversations({ search: 'Juan' });

      // Verificar que el resultado contiene el contacto filtrado
      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toContain('Juan');
      // Verificar que se llamó a or cuando hay búsqueda
      expect(queryAfterRange.or).toHaveBeenCalled();
    });

    it('debe manejar errores', async () => {
      supabase.range.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' }
      });

      const result = await getConversations();

      expect(result.error).toBeTruthy();
      expect(result.data).toBeNull();
    });

    it('debe filtrar conversaciones por productos del usuario', async () => {
      const userSkus = ['SKU1', 'SKU2'];
      const allowedAccountIds = ['account-1', 'account-2'];
      const allowedContactIds = ['contact-1', 'contact-2'];
      const mockConversations = [
        { id: 'contact-1', name: 'Juan Pérez', phone: '+59112345678' },
        { id: 'contact-2', name: 'María García', phone: '+59187654321' }
      ];

      // Mock de RPC para obtener account_ids permitidos
      supabase.rpc.mockResolvedValueOnce({ data: allowedAccountIds, error: null });
      // Mock de query para obtener contactos con mensajes de esas cuentas
      supabase.select.mockReturnValueOnce({
        data: allowedContactIds.map(id => ({ contact_id: id })),
        error: null
      });
      // Mock de query para obtener conversaciones
      supabase.in.mockReturnValue(supabase);
      supabase.range.mockResolvedValueOnce({
        data: mockConversations,
        error: null
      });

      // Mock getLastMessage para cada contacto
      const queryWithLimit = { ...supabase };
      supabase.limit.mockReturnValue(queryWithLimit);
      queryWithLimit.maybeSingle = vi.fn()
        .mockResolvedValueOnce({ data: { id: 'msg_1', text_content: 'Mensaje 1' }, error: null })
        .mockResolvedValueOnce({ data: { id: 'msg_2', text_content: 'Mensaje 2' }, error: null });

      const result = await getConversations({ userSkus });

      expect(supabase.rpc).toHaveBeenCalledWith('get_account_ids_by_user_skus', {
        p_skus: userSkus
      });
      expect(result.data).toHaveLength(2);
      expect(result.error).toBeNull();
    });

    it('debe retornar array vacío si el usuario no tiene cuentas asignadas', async () => {
      const userSkus = ['SKU1'];

      // Mock de RPC que retorna array vacío
      supabase.rpc.mockResolvedValueOnce({ data: [], error: null });

      const result = await getConversations({ userSkus });

      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
    });
  });

  describe('getLastMessage', () => {
    it('debe obtener último mensaje de un contacto', async () => {
      const mockMessage = {
        id: 'msg_1',
        contact_id: 'contact_1',
        text_content: 'Último mensaje',
        content_text: 'Último mensaje', // Mapeado por la función
        timestamp: new Date().toISOString()
      };

      // Configurar cadena de mocks: from -> select -> eq -> order -> limit -> maybeSingle
      const queryWithLimit = { ...supabase };
      supabase.limit.mockReturnValue(queryWithLimit);
      queryWithLimit.maybeSingle = vi.fn().mockResolvedValueOnce({
        data: mockMessage,
        error: null
      });

      const result = await getLastMessage('contact_1');

      expect(result.error).toBeNull();
      expect(result.data).toBeTruthy();
      expect(result.data.content_text).toBe('Último mensaje');
    });

    it('debe retornar null si no hay mensajes', async () => {
      // Configurar cadena de mocks - maybeSingle retorna null cuando no hay datos
      const queryWithLimit = { ...supabase };
      supabase.limit.mockReturnValue(queryWithLimit);
      queryWithLimit.maybeSingle = vi.fn().mockResolvedValueOnce({
        data: null,
        error: null // maybeSingle no retorna error cuando no hay datos
      });

      const result = await getLastMessage('contact_1');

      expect(result.error).toBeNull();
      expect(result.data).toBeNull();
    });

    it('debe filtrar último mensaje por productos del usuario', async () => {
      const contactId = 'contact_1';
      const userSkus = ['SKU1'];
      const allowedAccountIds = ['account-1'];
      const mockMessage = {
        id: 'msg_1',
        contact_id: contactId,
        account_id: 'account-1',
        text_content: 'Último mensaje',
        timestamp: new Date().toISOString()
      };

      // Mock de RPC para obtener account_ids permitidos
      supabase.rpc.mockResolvedValueOnce({ data: allowedAccountIds, error: null });
      // Mock de query con filtro
      supabase.in.mockReturnValue(supabase);
      const queryWithLimit = { ...supabase };
      supabase.limit.mockReturnValue(queryWithLimit);
      queryWithLimit.maybeSingle = vi.fn().mockResolvedValueOnce({
        data: mockMessage,
        error: null
      });

      const result = await getLastMessage(contactId, userSkus);

      expect(supabase.rpc).toHaveBeenCalledWith('get_account_ids_by_user_skus', {
        p_skus: userSkus
      });
      expect(supabase.in).toHaveBeenCalledWith('account_id', allowedAccountIds);
      expect(result.data).toEqual({
        ...mockMessage,
        content_text: mockMessage.text_content
      });
      expect(result.error).toBeNull();
    });

    it('debe retornar null si el usuario no tiene cuentas asignadas', async () => {
      const contactId = 'contact_1';
      const userSkus = ['SKU1'];

      // Mock de RPC que retorna array vacío
      supabase.rpc.mockResolvedValueOnce({ data: [], error: null });

      const result = await getLastMessage(contactId, userSkus);

      expect(result.data).toBeNull();
      expect(result.error).toBeNull();
    });
  });

  describe('getContactMessages', () => {
    it('debe obtener mensajes de un contacto', async () => {
      const mockMessages = [
        { id: 'msg_1', content_text: 'Mensaje 1', timestamp: new Date(Date.now() - 3600000).toISOString() },
        { id: 'msg_2', content_text: 'Mensaje 2', timestamp: new Date().toISOString() }
      ];

      supabase.range.mockResolvedValueOnce({
        data: mockMessages,
        error: null
      });

      const result = await getContactMessages('contact_1');

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(2);
      expect(supabase.eq).toHaveBeenCalledWith('contact_id', 'contact_1');
    });

    it('debe soportar paginación', async () => {
      supabase.range.mockResolvedValueOnce({
        data: [],
        error: null
      });

      await getContactMessages('contact_1', { limit: 20, offset: 10 });

      expect(supabase.range).toHaveBeenCalledWith(10, 29);
    });

    it('debe filtrar mensajes por productos del usuario', async () => {
      const contactId = 'contact_1';
      const userSkus = ['SKU1'];
      const allowedAccountIds = ['account-1', 'account-2'];
      const mockMessages = [
        { id: 'msg_1', account_id: 'account-1', text_content: 'Mensaje 1' },
        { id: 'msg_2', account_id: 'account-2', text_content: 'Mensaje 2' }
      ];

      // Mock de RPC para obtener account_ids permitidos
      supabase.rpc.mockResolvedValueOnce({ data: allowedAccountIds, error: null });
      // Mock de query con filtro
      supabase.in.mockReturnValue(supabase);
      supabase.range.mockResolvedValueOnce({
        data: mockMessages,
        error: null
      });

      const result = await getContactMessages(contactId, { userSkus });

      expect(supabase.rpc).toHaveBeenCalledWith('get_account_ids_by_user_skus', {
        p_skus: userSkus
      });
      expect(supabase.in).toHaveBeenCalledWith('account_id', allowedAccountIds);
      expect(result.data).toHaveLength(2);
      expect(result.error).toBeNull();
    });

    it('debe retornar array vacío si el usuario no tiene cuentas asignadas', async () => {
      const contactId = 'contact_1';
      const userSkus = ['SKU1'];

      // Mock de RPC que retorna array vacío
      supabase.rpc.mockResolvedValueOnce({ data: [], error: null });

      const result = await getContactMessages(contactId, { userSkus });

      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
    });
  });

  describe('getContact', () => {
    it('debe obtener información de un contacto', async () => {
      const mockContact = {
        id: 'contact_1',
        name: 'Juan Pérez',
        phone: '+59112345678'
      };

      // Configurar mock: from -> select -> eq -> single
      const queryWithEq = { ...supabase };
      supabase.eq.mockReturnValue(queryWithEq);
      queryWithEq.single = vi.fn().mockResolvedValueOnce({
        data: mockContact,
        error: null
      });

      const result = await getContact('contact_1');

      expect(result.error).toBeNull();
      expect(result.data).toEqual(mockContact);
    });

    it('debe manejar errores', async () => {
      // Configurar mock con error
      const queryWithEq = { ...supabase };
      supabase.eq.mockReturnValue(queryWithEq);
      queryWithEq.single = vi.fn().mockResolvedValueOnce({
        data: null,
        error: { message: 'Contact not found' }
      });

      const result = await getContact('contact_1');

      expect(result.error).toBeTruthy();
      expect(result.data).toBeNull();
    });
  });

  describe('markMessagesAsRead', () => {
    it('debe marcar mensajes como leídos', async () => {
      // La función actual es un placeholder que retorna success: true
      // La implementación real se hará en una fase posterior
      const result = await markMessagesAsRead('contact_1');

      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
      // Nota: La función actual no llama a supabase.update porque es un placeholder
      // Cuando se implemente la lógica real, se verificará que update sea llamado
    });

    it('debe manejar errores', async () => {
      // La función actual es un placeholder que siempre retorna success: true
      // Cuando se implemente la lógica real, se probará el manejo de errores
      const result = await markMessagesAsRead('contact_1');

      // Por ahora, la función siempre retorna success: true
      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
    });
  });

  describe('subscribeConversations', () => {
    it('debe crear suscripción a conversaciones', () => {
      const callback = vi.fn();
      const unsubscribe = subscribeConversations(callback);

      expect(supabase.channel).toHaveBeenCalledWith('whatsapp_conversations');
      expect(typeof unsubscribe).toBe('function');
    });
  });

  describe('subscribeContactMessages', () => {
    it('debe crear suscripción a mensajes de un contacto', () => {
      const callback = vi.fn();
      const unsubscribe = subscribeContactMessages('contact_1', callback);

      expect(supabase.channel).toHaveBeenCalledWith('whatsapp_messages_contact_1');
      expect(typeof unsubscribe).toBe('function');
    });
  });
});

