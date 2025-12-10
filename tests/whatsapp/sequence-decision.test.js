/**
 * Tests unitarios para el procesamiento de mensajes de secuencia con decisión híbrida
 * FASE 4: SUBFASE 4.2 - Tests de Sequence Decision
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { processSequenceMessage } from '../../src/services/whatsapp/sequence-decision';
import { supabase } from '../../src/supabaseClient';

// Mock del módulo supabaseClient
vi.mock('../../src/supabaseClient', () => {
  // Objeto especial para update().eq()
  const updateChain = {
    eq: vi.fn(() => Promise.resolve({ error: null }))
  };
  
  const mockSupabase = {
    from: vi.fn(() => mockSupabase),
    select: vi.fn(() => mockSupabase),
    insert: vi.fn(() => Promise.resolve({ error: null })),
    update: vi.fn(() => updateChain), // Retorna objeto especial para update().eq()
    eq: vi.fn(() => mockSupabase), // Para select().eq().single()
    single: vi.fn(() => Promise.resolve({ data: null, error: null })),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null }))
  };
  
  return {
    supabase: mockSupabase
  };
});

// Mock de send-decision.js
vi.mock('../../src/services/whatsapp/send-decision', () => ({
  decideSendMethod: vi.fn(),
  addToPuppeteerQueue: vi.fn()
}));

// Mock de cloud-api-sender.js
vi.mock('../../src/services/whatsapp/cloud-api-sender', () => ({
  sendTextMessage: vi.fn(),
  sendImageMessage: vi.fn(),
  sendVideoMessage: vi.fn(),
  sendAudioMessage: vi.fn(),
  sendDocumentMessage: vi.fn()
}));

import { decideSendMethod, addToPuppeteerQueue } from '../../src/services/whatsapp/send-decision';
import { sendTextMessage, sendImageMessage } from '../../src/services/whatsapp/cloud-api-sender';

// Mock de fetch para descargar media
global.fetch = vi.fn();

describe('Sequence Decision', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabase.from.mockReturnValue(supabase);
  });

  describe('processSequenceMessage', () => {
    it('debe procesar mensaje de texto via Cloud API cuando método es cloud_api', async () => {
      const mockContact = {
        id: '1',
        account_id: 'acc1',
        whatsapp_accounts: null // El código hace join pero no lo usa directamente
      };

      const mockMessageData = {
        message_type: 'text',
        content_text: 'Hola',
        order_position: 1
      };

      // processSequenceMessage obtiene contacto con select('*, account_id, whatsapp_accounts(*)')
      supabase.single.mockResolvedValueOnce({
        data: mockContact,
        error: null
      });

      decideSendMethod.mockResolvedValueOnce({
        method: 'cloud_api',
        reason: 'window_24h_active',
        error: null
      });

      // sendTextMessage se llama con (accountId, contactId, content_text || '')
      sendTextMessage.mockResolvedValueOnce({
        success: true,
        messageId: 'msg1',
        whatsappMessageId: 'wa_msg1',
        error: null
      });

      // updateContactAfterSend obtiene contacto con select('messages_sent_via_cloud_api, messages_sent_via_puppeteer, sequence_position, account_id')
      // Primero necesita from().select().eq().single() para obtener el contacto
      supabase.single.mockResolvedValueOnce({
        data: { 
          messages_sent_via_cloud_api: 0, 
          messages_sent_via_puppeteer: 0, 
          sequence_position: 0,
          account_id: 'acc1'
        },
        error: null
      });

      // updateContactAfterSend hace from().update().eq() que retorna promesa
      // update() retorna updateChain, y updateChain.eq() retorna promesa
      // No necesitamos mockear nada más porque updateChain ya está configurado

      const result = await processSequenceMessage('1', mockMessageData);

      expect(result.success).toBe(true);
      expect(result.method).toBe('cloud_api');
      expect(result.messageId).toBe('msg1');
      // sendTextMessage se llama con (accountId, contactId, content_text || '')
      expect(sendTextMessage).toHaveBeenCalledWith('acc1', '1', 'Hola');
      expect(sendTextMessage).toHaveBeenCalledTimes(1);
    });

    it('debe procesar mensaje via Puppeteer cuando método es puppeteer', async () => {
      const mockContact = {
        id: '1',
        account_id: 'acc1'
      };

      const mockMessageData = {
        message_type: 'text',
        content_text: 'Hola',
        order_position: 1
      };

      supabase.single.mockResolvedValueOnce({
        data: mockContact,
        error: null
      });

      decideSendMethod.mockResolvedValueOnce({
        method: 'puppeteer',
        reason: 'window_closed',
        error: null
      });

      addToPuppeteerQueue.mockResolvedValueOnce({
        success: true,
        queueId: 'queue1',
        error: null
      });

      // Mock para updateContactAfterSend (Puppeteer inserta mensaje)
      // Primero obtiene contacto con from().select().eq().single()
      supabase.single.mockResolvedValueOnce({
        data: { 
          messages_sent_via_cloud_api: 0, 
          messages_sent_via_puppeteer: 0, 
          sequence_position: 0,
          account_id: 'acc1'
        },
        error: null
      });

      // updateContactAfterSend hace from().update().eq() 
      // update() retorna updateChain, y updateChain.eq() ya está configurado para retornar promesa

      // updateContactAfterSend hace from().insert() para Puppeteer
      supabase.insert.mockResolvedValueOnce({
        error: null
      });

      const result = await processSequenceMessage('1', mockMessageData);

      expect(result.success).toBe(true);
      expect(result.method).toBe('puppeteer');
      expect(result.queueId).toBe('queue1');
      expect(addToPuppeteerQueue).toHaveBeenCalled();
    });

    it('debe hacer fallback a Puppeteer si Cloud API falla', async () => {
      const mockContact = {
        id: '1',
        account_id: 'acc1'
      };

      const mockMessageData = {
        message_type: 'text',
        content_text: 'Hola',
        order_position: 1
      };

      supabase.single.mockResolvedValueOnce({
        data: mockContact,
        error: null
      });

      decideSendMethod.mockResolvedValueOnce({
        method: 'cloud_api',
        reason: 'window_24h_active',
        error: null
      });

      sendTextMessage.mockResolvedValueOnce({
        success: false,
        messageId: null,
        error: { message: 'API Error' }
      });

      addToPuppeteerQueue.mockResolvedValueOnce({
        success: true,
        queueId: 'queue1',
        error: null
      });

      // Mock para updateContactAfterSend (Puppeteer - fallback)
      // Primero obtiene contacto con from().select().eq().single()
      supabase.single.mockResolvedValueOnce({
        data: { 
          messages_sent_via_cloud_api: 0, 
          messages_sent_via_puppeteer: 0, 
          sequence_position: 0,
          account_id: 'acc1'
        },
        error: null
      });

      // updateContactAfterSend hace from().update().eq() 
      // update() retorna updateChain, y updateChain.eq() ya está configurado para retornar promesa

      // updateContactAfterSend hace from().insert() para Puppeteer
      supabase.insert.mockResolvedValueOnce({
        error: null
      });

      const result = await processSequenceMessage('1', mockMessageData);

      expect(result.success).toBe(true);
      expect(result.method).toBe('puppeteer');
      expect(addToPuppeteerQueue).toHaveBeenCalled();
    });

    it('debe manejar error cuando contacto no existe', async () => {
      // processSequenceMessage obtiene contacto con select('*, account_id, whatsapp_accounts(*)')
      supabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Contacto no encontrado' }
      });

      const result = await processSequenceMessage('1', {
        message_type: 'text',
        content_text: 'Hola'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.message).toContain('Contacto no encontrado');
    });

    it('debe manejar error cuando no hay cuenta asociada', async () => {
      // processSequenceMessage obtiene contacto con select('*, account_id, whatsapp_accounts(*)')
      supabase.single.mockResolvedValueOnce({
        data: { id: '1', account_id: null, whatsapp_accounts: null },
        error: null
      });

      const result = await processSequenceMessage('1', {
        message_type: 'text',
        content_text: 'Hola'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.message).toContain('sin cuenta asociada');
    });
  });
});

