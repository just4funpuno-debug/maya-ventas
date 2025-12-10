/**
 * Tests para servicio de Decisión Inteligente
 * FASE 2: Testing de SUBFASE 2.3
 * 
 * Ejecutar con: npm test -- tests/whatsapp/send-decision.test.js
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  decideSendMethod,
  addToPuppeteerQueue,
  sendMessageIntelligent,
  getWindow24hInfo
} from '../../src/services/whatsapp/send-decision';
import { supabase } from '../../src/supabaseClient';

// Mock de supabaseClient
vi.mock('../../src/supabaseClient', () => {
  const mockSupabase = {
    from: vi.fn(() => mockSupabase),
    select: vi.fn(() => mockSupabase),
    eq: vi.fn(() => mockSupabase),
    single: vi.fn(() => ({ data: null, error: null })),
    rpc: vi.fn(() => ({ data: null, error: null }))
  };
  
  return {
    supabase: mockSupabase
  };
});

// Mock de cloud-api-sender
vi.mock('../../src/services/whatsapp/cloud-api-sender', () => ({
  sendTextMessage: vi.fn(),
  sendImageMessage: vi.fn(),
  sendVideoMessage: vi.fn(),
  sendAudioMessage: vi.fn(),
  sendDocumentMessage: vi.fn()
}));

describe('Send Decision', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabase.from.mockReturnValue(supabase);
    supabase.select.mockReturnValue(supabase);
    supabase.eq.mockReturnValue(supabase);
  });

  describe('decideSendMethod', () => {
    it('debe decidir Cloud API cuando ventana está activa', async () => {
      supabase.rpc.mockResolvedValueOnce({
        data: {
          method: 'cloud_api',
          reason: 'window_24h_active',
          cost: 0
        },
        error: null
      });

      const result = await decideSendMethod('contact_123');

      expect(result.method).toBe('cloud_api');
      expect(result.reason).toBe('window_24h_active');
      expect(result.cost).toBe(0);
      expect(result.error).toBeNull();
    });

    it('debe decidir Puppeteer cuando ventana está cerrada', async () => {
      supabase.rpc.mockResolvedValueOnce({
        data: {
          method: 'puppeteer',
          reason: 'window_closed',
          cost: 0
        },
        error: null
      });

      const result = await decideSendMethod('contact_123');

      expect(result.method).toBe('puppeteer');
      expect(result.reason).toBe('window_closed');
      expect(result.cost).toBe(0);
    });

    it('debe manejar errores de BD', async () => {
      supabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' }
      });

      const result = await decideSendMethod('contact_123');

      expect(result.method).toBeNull();
      expect(result.error).toBeTruthy();
    });

    it('debe validar contactId requerido', async () => {
      const result = await decideSendMethod(null);

      expect(result.method).toBeNull();
      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('requerido');
    });
  });

  describe('addToPuppeteerQueue', () => {
    it('debe agregar mensaje a cola exitosamente', async () => {
      supabase.rpc.mockResolvedValueOnce({
        data: { id: 'queue_123' },
        error: null
      });

      const result = await addToPuppeteerQueue(
        'contact_123',
        'text',
        { contentText: 'Hola mundo' }
      );

      expect(result.success).toBe(true);
      expect(result.queueId).toBe('queue_123');
      expect(result.error).toBeNull();
    });

    it('debe validar parámetros requeridos', async () => {
      const result1 = await addToPuppeteerQueue(null, 'text', {});
      expect(result1.success).toBe(false);

      const result2 = await addToPuppeteerQueue('contact_123', null, {});
      expect(result2.success).toBe(false);
    });

    it('debe manejar errores de BD', async () => {
      supabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' }
      });

      const result = await addToPuppeteerQueue('contact_123', 'text', { contentText: 'Hola' });

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  describe('sendMessageIntelligent', () => {
    it('debe usar Cloud API cuando se decide cloud_api', async () => {
      const { sendTextMessage } = await import('../../src/services/whatsapp/cloud-api-sender');
      
      supabase.rpc.mockResolvedValueOnce({
        data: {
          method: 'cloud_api',
          reason: 'window_24h_active',
          cost: 0
        },
        error: null
      });

      sendTextMessage.mockResolvedValueOnce({
        success: true,
        messageId: 'msg_123',
        whatsappMessageId: 'whatsapp_msg_123',
        error: null
      });

      const result = await sendMessageIntelligent(
        'account_123',
        'contact_123',
        'text',
        { contentText: 'Hola mundo' }
      );

      expect(result.success).toBe(true);
      expect(result.method).toBe('cloud_api');
      expect(result.messageId).toBe('msg_123');
      expect(sendTextMessage).toHaveBeenCalled();
    });

    it('debe usar Puppeteer cuando se decide puppeteer', async () => {
      supabase.rpc.mockResolvedValueOnce({
        data: {
          method: 'puppeteer',
          reason: 'window_closed',
          cost: 0
        },
        error: null
      });

      supabase.rpc.mockResolvedValueOnce({
        data: { id: 'queue_123' },
        error: null
      });

      const result = await sendMessageIntelligent(
        'account_123',
        'contact_123',
        'text',
        { contentText: 'Hola mundo' }
      );

      expect(result.success).toBe(true);
      expect(result.method).toBe('puppeteer');
      expect(result.queueId).toBe('queue_123');
    });

    it('debe forzar Cloud API cuando se especifica forceMethod', async () => {
      const { sendTextMessage } = await import('../../src/services/whatsapp/cloud-api-sender');
      
      sendTextMessage.mockResolvedValueOnce({
        success: true,
        messageId: 'msg_123',
        whatsappMessageId: 'whatsapp_msg_123',
        error: null
      });

      const result = await sendMessageIntelligent(
        'account_123',
        'contact_123',
        'text',
        { contentText: 'Hola mundo' },
        { forceMethod: 'cloud_api' }
      );

      expect(result.method).toBe('cloud_api');
      expect(sendTextMessage).toHaveBeenCalled();
      // No debe llamar a decideSendMethod
      expect(supabase.rpc).not.toHaveBeenCalledWith('decide_send_method', expect.anything());
    });

    it('debe forzar Puppeteer cuando se especifica forceMethod', async () => {
      supabase.rpc.mockResolvedValueOnce({
        data: { id: 'queue_123' },
        error: null
      });

      const result = await sendMessageIntelligent(
        'account_123',
        'contact_123',
        'text',
        { contentText: 'Hola mundo' },
        { forceMethod: 'puppeteer' }
      );

      expect(result.method).toBe('puppeteer');
      expect(result.queueId).toBe('queue_123');
    });

    it('debe manejar todos los tipos de mensaje con Cloud API', async () => {
      const {
        sendTextMessage,
        sendImageMessage,
        sendVideoMessage,
        sendAudioMessage,
        sendDocumentMessage
      } = await import('../../src/services/whatsapp/cloud-api-sender');

      supabase.rpc.mockResolvedValue({
        data: { method: 'cloud_api', reason: 'window_24h_active', cost: 0 },
        error: null
      });

      sendTextMessage.mockResolvedValue({ success: true, messageId: 'msg_1', error: null });
      sendImageMessage.mockResolvedValue({ success: true, messageId: 'msg_2', error: null });
      sendVideoMessage.mockResolvedValue({ success: true, messageId: 'msg_3', error: null });
      sendAudioMessage.mockResolvedValue({ success: true, messageId: 'msg_4', error: null });
      sendDocumentMessage.mockResolvedValue({ success: true, messageId: 'msg_5', error: null });

      const imageFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const videoFile = new File(['test'], 'test.mp4', { type: 'video/mp4' });
      const audioFile = new File(['test'], 'test.mp3', { type: 'audio/mpeg' });
      const docFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });

      await sendMessageIntelligent('account_123', 'contact_123', 'text', { contentText: 'Hola' });
      await sendMessageIntelligent('account_123', 'contact_123', 'image', { mediaFile: imageFile });
      await sendMessageIntelligent('account_123', 'contact_123', 'video', { mediaFile: videoFile });
      await sendMessageIntelligent('account_123', 'contact_123', 'audio', { mediaFile: audioFile });
      await sendMessageIntelligent('account_123', 'contact_123', 'document', { mediaFile: docFile });

      expect(sendTextMessage).toHaveBeenCalled();
      expect(sendImageMessage).toHaveBeenCalled();
      expect(sendVideoMessage).toHaveBeenCalled();
      expect(sendAudioMessage).toHaveBeenCalled();
      expect(sendDocumentMessage).toHaveBeenCalled();
    });
  });

  describe('getWindow24hInfo', () => {
    it('debe obtener información de ventana 24h', async () => {
      const futureDate = new Date(Date.now() + 3600000).toISOString();
      supabase.rpc.mockResolvedValueOnce({
        data: {
          window_active: true,
          window_expires_at: futureDate
        },
        error: null
      });

      const result = await getWindow24hInfo('contact_123');

      expect(result.isActive).toBe(true);
      expect(result.expiresAt).toBe(futureDate);
      expect(result.hoursRemaining).toBeGreaterThan(0);
      expect(result.error).toBeNull();
    });

    it('debe retornar horas restantes correctamente', async () => {
      const futureDate = new Date(Date.now() + 2 * 3600000).toISOString(); // 2 horas
      supabase.rpc.mockResolvedValueOnce({
        data: {
          window_active: true,
          window_expires_at: futureDate
        },
        error: null
      });

      const result = await getWindow24hInfo('contact_123');

      expect(result.hoursRemaining).toBeGreaterThan(1);
      expect(result.hoursRemaining).toBeLessThan(3);
    });

    it('debe manejar errores', async () => {
      supabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' }
      });

      const result = await getWindow24hInfo('contact_123');

      expect(result.isActive).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });
});


