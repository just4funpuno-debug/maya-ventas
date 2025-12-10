/**
 * Tests para servicio Cloud API Sender
 * FASE 2: Testing de SUBFASE 2.1 y 2.2
 * 
 * Ejecutar con: npm test -- tests/whatsapp/cloud-api-sender.test.js
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  sendTextMessage,
  sendImageMessage,
  sendVideoMessage,
  sendAudioMessage,
  sendDocumentMessage
} from '../../src/services/whatsapp/cloud-api-sender';
import { supabase } from '../../src/supabaseClient';

// Mock de supabaseClient
vi.mock('../../src/supabaseClient', () => {
  const mockSupabase = {
    from: vi.fn(() => mockSupabase),
    select: vi.fn(() => mockSupabase),
    eq: vi.fn(() => mockSupabase),
    single: vi.fn(() => ({ data: null, error: null })),
    maybeSingle: vi.fn(() => ({ data: null, error: null })),
    insert: vi.fn(() => mockSupabase),
    rpc: vi.fn(() => ({ data: null, error: null }))
  };
  
  return {
    supabase: mockSupabase
  };
});

// Mock de fetch global
global.fetch = vi.fn();

describe('Cloud API Sender', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch.mockClear();
    
    // Mock por defecto de supabase
    supabase.from.mockReturnValue(supabase);
    supabase.select.mockReturnValue(supabase);
    supabase.eq.mockReturnValue(supabase);
    supabase.insert.mockReturnValue({
      select: vi.fn(() => ({
        single: vi.fn(() => ({ data: { id: 'msg_123' }, error: null }))
      }))
    });
    supabase.rpc.mockReturnValue({ data: null, error: null });
  });

  describe('sendTextMessage', () => {
    it('debe enviar mensaje de texto exitosamente', async () => {
      // Mock: Obtener cuenta (primera llamada a single)
      supabase.single
        .mockReturnValueOnce({
          data: {
            id: 'account_123',
            phone_number_id: 'phone_123',
            access_token: 'token_123',
            active: true
          },
          error: null
        })
        // Mock: Verificar ventana 72h (segunda llamada a single)
        .mockReturnValueOnce({
          data: { created_at: new Date().toISOString() },
          error: null
        })
        // Mock: Obtener contacto (tercera llamada a single)
        .mockReturnValueOnce({
          data: { phone: '+59112345678' },
          error: null
        });

      // Mock: Verificar ventana 24h
      supabase.rpc.mockReturnValueOnce({
        data: { window_active: true, window_expires_at: new Date(Date.now() + 3600000).toISOString() },
        error: null
      });

      // 7. saveMessage
      supabase.insert.mockReturnValue({
        select: vi.fn(() => ({
          single: vi.fn(() => ({ data: { id: 'msg_123' }, error: null }))
        }))
      });

      // Mock: Respuesta de WhatsApp API
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          messages: [{ id: 'whatsapp_msg_123' }]
        })
      });

      const result = await sendTextMessage('account_123', 'contact_123', 'Hola mundo');

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg_123');
      expect(result.whatsappMessageId).toBe('whatsapp_msg_123');
      expect(result.error).toBeNull();
    });

    it('debe rechazar envío si ventana 24h está cerrada y fuera de 72h', async () => {
      // Mock: Obtener cuenta
      supabase.single.mockReturnValueOnce({
        data: {
          id: 'account_123',
          phone_number_id: 'phone_123',
          access_token: 'token_123',
          active: true
        },
        error: null
      });

      // Mock: Ventana 24h cerrada
      supabase.rpc.mockReturnValueOnce({
        data: { window_active: false, window_expires_at: null },
        error: null
      });

      // Mock: Fuera de ventana 72h (más de 72 horas)
      supabase.single.mockReturnValueOnce({
        data: { created_at: new Date(Date.now() - 73 * 3600000).toISOString() },
        error: null
      });

      const result = await sendTextMessage('account_123', 'contact_123', 'Hola mundo');

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('WINDOW_CLOSED');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('debe permitir envío si ventana 24h está activa', async () => {
      // Mock: Obtener cuenta (primera llamada)
      supabase.single
        .mockReturnValueOnce({
          data: {
            id: 'account_123',
            phone_number_id: 'phone_123',
            access_token: 'token_123',
            active: true
          },
          error: null
        })
        // Mock: Verificar ventana 72h (segunda llamada)
        .mockReturnValueOnce({
          data: { created_at: new Date().toISOString() },
          error: null
        })
        // Mock: Obtener contacto (tercera llamada)
        .mockReturnValueOnce({
          data: { phone: '+59112345678' },
          error: null
        });

      // Mock: Ventana 24h activa
      supabase.rpc.mockReturnValueOnce({
        data: { window_active: true, window_expires_at: new Date(Date.now() + 3600000).toISOString() },
        error: null
      });

      // 7. saveMessage
      supabase.insert.mockReturnValue({
        select: vi.fn(() => ({
          single: vi.fn(() => ({ data: { id: 'msg_123' }, error: null }))
        }))
      });

      // Mock: Respuesta de WhatsApp API
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          messages: [{ id: 'whatsapp_msg_123' }]
        })
      });

      const result = await sendTextMessage('account_123', 'contact_123', 'Hola mundo');

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalled();
    });

    it('debe permitir envío si contacto está dentro de ventana 72h', async () => {
      // Mock: Obtener cuenta
      supabase.single.mockReturnValueOnce({
        data: {
          id: 'account_123',
          phone_number_id: 'phone_123',
          access_token: 'token_123',
          active: true
        },
        error: null
      });

      // Mock: Ventana 24h cerrada
      supabase.rpc.mockReturnValueOnce({
        data: { window_active: false, window_expires_at: null },
        error: null
      });

      // Mock: Dentro de ventana 72h (menos de 72 horas)
      supabase.single.mockReturnValueOnce({
        data: { created_at: new Date(Date.now() - 24 * 3600000).toISOString() },
        error: null
      });

      // Mock: Obtener contacto
      supabase.single.mockReturnValueOnce({
        data: { phone: '+59112345678' },
        error: null
      });

      // 7. saveMessage
      supabase.insert.mockReturnValue({
        select: vi.fn(() => ({
          single: vi.fn(() => ({ data: { id: 'msg_123' }, error: null }))
        }))
      });

      // Mock: Respuesta de WhatsApp API
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          messages: [{ id: 'whatsapp_msg_123' }]
        })
      });

      const result = await sendTextMessage('account_123', 'contact_123', 'Hola mundo');

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalled();
    });

    it('debe manejar error de API de WhatsApp', async () => {
      // Mock: Obtener cuenta (primera llamada)
      supabase.single
        .mockReturnValueOnce({
          data: {
            id: 'account_123',
            phone_number_id: 'phone_123',
            access_token: 'token_123',
            active: true
          },
          error: null
        })
        // Mock: Verificar ventana 72h (segunda llamada)
        .mockReturnValueOnce({
          data: { created_at: new Date().toISOString() },
          error: null
        })
        // Mock: Obtener contacto (tercera llamada)
        .mockReturnValueOnce({
          data: { phone: '+59112345678' },
          error: null
        });

      // Mock: Ventana activa
      supabase.rpc.mockReturnValueOnce({
        data: { window_active: true, window_expires_at: new Date(Date.now() + 3600000).toISOString() },
        error: null
      });

      // Mock: Error de API
      global.fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: {
            message: 'Invalid phone number',
            code: 131047
          }
        })
      });

      const result = await sendTextMessage('account_123', 'contact_123', 'Hola mundo');

      expect(result.success).toBe(false);
      // El código puede ser el código numérico de WhatsApp o 'API_ERROR'
      expect(result.error.code).toBeTruthy();
      expect(result.error.message).toContain('Invalid phone number');
    });

    it('debe validar parámetros requeridos', async () => {
      const result1 = await sendTextMessage(null, 'contact_123', 'Hola');
      expect(result1.success).toBe(false);
      expect(result1.error.message).toContain('requeridos');

      const result2 = await sendTextMessage('account_123', null, 'Hola');
      expect(result2.success).toBe(false);

      const result3 = await sendTextMessage('account_123', 'contact_123', '');
      expect(result3.success).toBe(false);
    });
  });

  describe('sendImageMessage', () => {
    it('debe enviar imagen exitosamente', async () => {
      // Orden de llamadas en sendImageMessage:
      // 1. checkWindow24h -> supabase.rpc('calculate_window_24h')
      // 2. check72hWindow -> supabase.single (obtiene contacto para created_at)
      // 3. Obtener contacto -> supabase.single (obtiene phone)
      // 4. uploadMediaToWhatsApp:
      //    - getAccount -> supabase.single
      // 5. getAccount (después de upload) -> supabase.single
      // 6. saveMessage -> supabase.insert
      // 7. updateContactInteraction -> supabase.rpc('update_contact_interaction')

      supabase.single
        // 2. check72hWindow (obtiene contacto para created_at)
        .mockReturnValueOnce({
          data: { created_at: new Date().toISOString() },
          error: null
        })
        // 3. Obtener contacto (obtiene phone)
        .mockReturnValueOnce({
          data: { phone: '+59112345678' },
          error: null
        })
        // 4. getAccount (uploadMediaToWhatsApp)
        .mockReturnValueOnce({
          data: {
            id: 'account_123',
            phone_number_id: 'phone_123',
            access_token: 'token_123',
            active: true
          },
          error: null
        })
        // 5. getAccount (después de upload)
        .mockReturnValueOnce({
          data: {
            id: 'account_123',
            phone_number_id: 'phone_123',
            access_token: 'token_123',
            active: true
          },
          error: null
        });

      // 1. checkWindow24h
      supabase.rpc
        .mockReturnValueOnce({
          data: { window_active: true, window_expires_at: new Date(Date.now() + 3600000).toISOString() },
          error: null
        })
        // 7. updateContactInteraction
        .mockReturnValueOnce({ data: null, error: null });

      // Mock: Subir media
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'media_123' })
      });

      // Mock: Enviar mensaje
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          messages: [{ id: 'whatsapp_msg_123' }]
        })
      });

      // 7. saveMessage
      supabase.insert.mockReturnValue({
        select: vi.fn(() => ({
          single: vi.fn(() => ({ data: { id: 'msg_123' }, error: null }))
        }))
      });

      const imageFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const result = await sendImageMessage('account_123', 'contact_123', imageFile, 'Mi imagen');

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg_123');
      expect(global.fetch).toHaveBeenCalledTimes(2); // Upload + Send
    });
  });

  describe('sendVideoMessage', () => {
    it('debe enviar video exitosamente', async () => {
      supabase.single
        // check72hWindow
        .mockReturnValueOnce({
          data: { created_at: new Date().toISOString() },
          error: null
        })
        // Obtener contacto
        .mockReturnValueOnce({
          data: { phone: '+59112345678' },
          error: null
        })
        // getAccount (uploadMediaToWhatsApp)
        .mockReturnValueOnce({
          data: {
            id: 'account_123',
            phone_number_id: 'phone_123',
            access_token: 'token_123',
            active: true
          },
          error: null
        })
        // getAccount (después de upload)
        .mockReturnValueOnce({
          data: {
            id: 'account_123',
            phone_number_id: 'phone_123',
            access_token: 'token_123',
            active: true
          },
          error: null
        });

      supabase.rpc
        // checkWindow24h
        .mockReturnValueOnce({
          data: { window_active: true, window_expires_at: new Date(Date.now() + 3600000).toISOString() },
          error: null
        })
        // updateContactInteraction
        .mockReturnValueOnce({ data: null, error: null });

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'media_123' })
      });
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          messages: [{ id: 'whatsapp_msg_123' }]
        })
      });

      supabase.insert.mockReturnValue({
        select: vi.fn(() => ({
          single: vi.fn(() => ({ data: { id: 'msg_123' }, error: null }))
        }))
      });
      // Mock: Actualizar interacción
      supabase.rpc.mockReturnValueOnce({ data: true, error: null });

      const videoFile = new File(['test'], 'test.mp4', { type: 'video/mp4' });
      const result = await sendVideoMessage('account_123', 'contact_123', videoFile, 'Mi video');

      expect(result.success).toBe(true);
    });
  });

  describe('sendAudioMessage', () => {
    it('debe enviar audio exitosamente', async () => {
      supabase.single
        // check72hWindow
        .mockReturnValueOnce({
          data: { created_at: new Date().toISOString() },
          error: null
        })
        // Obtener contacto
        .mockReturnValueOnce({
          data: { phone: '+59112345678' },
          error: null
        })
        // getAccount (uploadMediaToWhatsApp)
        .mockReturnValueOnce({
          data: {
            id: 'account_123',
            phone_number_id: 'phone_123',
            access_token: 'token_123',
            active: true
          },
          error: null
        })
        // getAccount (después de upload)
        .mockReturnValueOnce({
          data: {
            id: 'account_123',
            phone_number_id: 'phone_123',
            access_token: 'token_123',
            active: true
          },
          error: null
        });

      supabase.rpc
        // checkWindow24h
        .mockReturnValueOnce({
          data: { window_active: true, window_expires_at: new Date(Date.now() + 3600000).toISOString() },
          error: null
        })
        // updateContactInteraction
        .mockReturnValueOnce({ data: null, error: null });

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'media_123' })
      });
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          messages: [{ id: 'whatsapp_msg_123' }]
        })
      });

      supabase.insert.mockReturnValue({
        select: vi.fn(() => ({
          single: vi.fn(() => ({ data: { id: 'msg_123' }, error: null }))
        }))
      });
      // Mock: Actualizar interacción
      supabase.rpc.mockReturnValueOnce({ data: true, error: null });

      const audioFile = new File(['test'], 'test.mp3', { type: 'audio/mpeg' });
      const result = await sendAudioMessage('account_123', 'contact_123', audioFile);

      expect(result.success).toBe(true);
    });
  });

  describe('sendDocumentMessage', () => {
    it('debe enviar documento exitosamente', async () => {
      supabase.single
        // check72hWindow
        .mockReturnValueOnce({
          data: { created_at: new Date().toISOString() },
          error: null
        })
        // Obtener contacto
        .mockReturnValueOnce({
          data: { phone: '+59112345678' },
          error: null
        })
        // getAccount (uploadMediaToWhatsApp)
        .mockReturnValueOnce({
          data: {
            id: 'account_123',
            phone_number_id: 'phone_123',
            access_token: 'token_123',
            active: true
          },
          error: null
        })
        // getAccount (después de upload)
        .mockReturnValueOnce({
          data: {
            id: 'account_123',
            phone_number_id: 'phone_123',
            access_token: 'token_123',
            active: true
          },
          error: null
        });

      supabase.rpc
        // checkWindow24h
        .mockReturnValueOnce({
          data: { window_active: true, window_expires_at: new Date(Date.now() + 3600000).toISOString() },
          error: null
        })
        // updateContactInteraction
        .mockReturnValueOnce({ data: null, error: null });

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'media_123' })
      });
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          messages: [{ id: 'whatsapp_msg_123' }]
        })
      });

      supabase.insert.mockReturnValue({
        select: vi.fn(() => ({
          single: vi.fn(() => ({ data: { id: 'msg_123' }, error: null }))
        }))
      });
      // Mock: Actualizar interacción
      supabase.rpc.mockReturnValueOnce({ data: true, error: null });

      const docFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const result = await sendDocumentMessage('account_123', 'contact_123', docFile, 'documento.pdf', 'Mi documento');

      expect(result.success).toBe(true);
    });
  });
});

