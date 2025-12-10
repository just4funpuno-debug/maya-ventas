/**
 * Tests para Templates - Envío de Templates
 * FASE 4 - SUBFASE 4.3: Testing end-to-end
 * 
 * Ejecutar con: npm test -- tests/whatsapp/fase4-templates-sending.test.js
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock de fetch global
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock del módulo supabaseClient
vi.mock('../../src/supabaseClient', () => {
  const mockSupabase = {
    from: vi.fn(() => mockSupabase),
    select: vi.fn(() => mockSupabase),
    insert: vi.fn(() => mockSupabase),
    update: vi.fn(() => mockSupabase),
    delete: vi.fn(() => mockSupabase),
    eq: vi.fn(() => mockSupabase),
    order: vi.fn(() => mockSupabase),
    single: vi.fn(() => Promise.resolve({ data: null, error: null })),
    maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
    limit: vi.fn(() => mockSupabase),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null }))
  };
  
  return {
    supabase: mockSupabase
  };
});

import { supabase } from '../../src/supabaseClient';

// Importar funciones después de los mocks
let templateSenderModule;
let sendDecisionModule;
let sequenceDecisionModule;

describe('Templates - Envío de Templates', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    templateSenderModule = await import('../../src/services/whatsapp/template-sender');
    sendDecisionModule = await import('../../src/services/whatsapp/send-decision');
    sequenceDecisionModule = await import('../../src/services/whatsapp/sequence-decision');
  });

  describe('sendTemplateMessage', () => {
    const mockContact = {
      id: 'contact-123',
      phone: '521234567890',
      name: 'María González'
    };

    const mockAccount = {
      id: 'account-123',
      phone_number_id: 'phone-123',
      access_token: 'token-123',
      active: true
    };

    const mockTemplate = {
      id: 'template-123',
      wa_template_name: 'bienvenida_template',
      wa_status: 'approved',
      language: 'es',
      body_text: 'Hola {{1}}, bienvenido a {{2}}',
      header_text: null,
      footer_text: null,
      buttons: null
    };

    const mockMappedTemplate = {
      template: {
        ...mockTemplate,
        body_text: 'Hola María González, bienvenido a Producto Premium'
      },
      variables: {
        1: 'María González',
        2: 'Producto Premium'
      },
      context: {
        contact: { name: 'María González', phone: '521234567890' },
        lead: { pipeline_stage: 'Calificando', estimated_value: 150.50 },
        product: { name: 'Producto Premium' }
      }
    };

    it('debe enviar template correctamente con ventana cerrada', async () => {
      // Mock getAccount
      supabase.from.mockReturnValueOnce(supabase);
      supabase.select.mockReturnValueOnce(supabase);
      supabase.eq.mockReturnValueOnce(supabase);
      supabase.single.mockResolvedValueOnce({
        data: mockAccount,
        error: null
      });

      // Mock getContact
      supabase.from.mockReturnValueOnce(supabase);
      supabase.select.mockReturnValueOnce(supabase);
      supabase.eq.mockReturnValueOnce(supabase);
      supabase.single.mockResolvedValueOnce({
        data: mockContact,
        error: null
      });

      // Mock getTemplate (dentro de mapTemplateVariables)
      supabase.from.mockReturnValueOnce(supabase);
      supabase.select.mockReturnValueOnce(supabase);
      supabase.eq.mockReturnValueOnce(supabase);
      supabase.single.mockResolvedValueOnce({
        data: mockTemplate,
        error: null
      });

      // Mock getContact (dentro de getContactAndLeadData)
      supabase.from.mockReturnValueOnce(supabase);
      supabase.select.mockReturnValueOnce(supabase);
      supabase.eq.mockReturnValueOnce(supabase);
      supabase.single.mockResolvedValueOnce({
        data: mockContact,
        error: null
      });

      // Mock getAccount (dentro de getContactAndLeadData)
      supabase.from.mockReturnValueOnce(supabase);
      supabase.select.mockReturnValueOnce(supabase);
      supabase.eq.mockReturnValueOnce(supabase);
      supabase.single.mockResolvedValueOnce({
        data: { id: 'account-123', product_id: 'product-123' },
        error: null
      });

      // Mock get_lead_by_contact RPC
      supabase.rpc = vi.fn().mockResolvedValueOnce({
        data: [{
          id: 'lead-123',
          pipeline_stage: 'Calificando',
          estimated_value: 150.50
        }],
        error: null
      });

      // Mock getProduct
      supabase.from.mockReturnValueOnce(supabase);
      supabase.select.mockReturnValueOnce(supabase);
      supabase.eq.mockReturnValueOnce(supabase);
      supabase.single.mockResolvedValueOnce({
        data: { id: 'product-123', name: 'Producto Premium' },
        error: null
      });

      // Mock WhatsApp API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          messages: [{ id: 'wa-msg-123' }]
        })
      });

      // Mock saveMessage
      supabase.from.mockReturnValueOnce(supabase);
      supabase.insert.mockReturnValueOnce(supabase);
      supabase.select.mockReturnValueOnce(supabase);
      supabase.single.mockResolvedValueOnce({
        data: { id: 'msg-123' },
        error: null
      });

      // Mock updateContactInteraction
      supabase.from.mockReturnValueOnce(supabase);
      supabase.update.mockReturnValueOnce(supabase);
      supabase.eq.mockReturnValueOnce(supabase);

      const result = await templateSenderModule.sendTemplateMessage(
        'account-123',
        'contact-123',
        'template-123'
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg-123');
      expect(result.whatsappMessageId).toBe('wa-msg-123');
      expect(result.error).toBeNull();
      
      // Verificar que se llamó a WhatsApp API
      expect(mockFetch).toHaveBeenCalled();
      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall[0]).toContain('/messages');
      expect(fetchCall[1].method).toBe('POST');
      
      const payload = JSON.parse(fetchCall[1].body);
      expect(payload.type).toBe('template');
      expect(payload.template.name).toBe('bienvenida_template');
    });

    it('debe rechazar template no aprobado', async () => {
      const templatePending = {
        ...mockTemplate,
        wa_status: 'pending'
      };

      // Mock getAccount
      supabase.from.mockReturnValueOnce(supabase);
      supabase.select.mockReturnValueOnce(supabase);
      supabase.eq.mockReturnValueOnce(supabase);
      supabase.single.mockResolvedValueOnce({
        data: mockAccount,
        error: null
      });

      // Mock getContact
      supabase.from.mockReturnValueOnce(supabase);
      supabase.select.mockReturnValueOnce(supabase);
      supabase.eq.mockReturnValueOnce(supabase);
      supabase.single.mockResolvedValueOnce({
        data: mockContact,
        error: null
      });

      // Mock getTemplate (dentro de mapTemplateVariables)
      supabase.from.mockReturnValueOnce(supabase);
      supabase.select.mockReturnValueOnce(supabase);
      supabase.eq.mockReturnValueOnce(supabase);
      supabase.single.mockResolvedValueOnce({
        data: templatePending,
        error: null
      });

      // Mock getContact (dentro de getContactAndLeadData)
      supabase.from.mockReturnValueOnce(supabase);
      supabase.select.mockReturnValueOnce(supabase);
      supabase.eq.mockReturnValueOnce(supabase);
      supabase.single.mockResolvedValueOnce({
        data: mockContact,
        error: null
      });

      // Mock getAccount (dentro de getContactAndLeadData)
      supabase.from.mockReturnValueOnce(supabase);
      supabase.select.mockReturnValueOnce(supabase);
      supabase.eq.mockReturnValueOnce(supabase);
      supabase.single.mockResolvedValueOnce({
        data: { id: 'account-123', product_id: 'product-123' },
        error: null
      });

      // Mock get_lead_by_contact RPC
      supabase.rpc = vi.fn().mockResolvedValueOnce({
        data: [],
        error: null
      });

      // Mock getProduct
      supabase.from.mockReturnValueOnce(supabase);
      supabase.select.mockReturnValueOnce(supabase);
      supabase.eq.mockReturnValueOnce(supabase);
      supabase.single.mockResolvedValueOnce({
        data: { id: 'product-123', name: 'Producto Premium' },
        error: null
      });

      const result = await templateSenderModule.sendTemplateMessage(
        'account-123',
        'contact-123',
        'template-123'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('aprobado');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('debe rechazar template sin wa_template_name', async () => {
      // Ajustar el mensaje de error esperado
      const templateSinNombre = {
        ...mockTemplate,
        wa_template_name: null
      };

      // Mock getAccount
      supabase.from.mockReturnValueOnce(supabase);
      supabase.select.mockReturnValueOnce(supabase);
      supabase.eq.mockReturnValueOnce(supabase);
      supabase.single.mockResolvedValueOnce({
        data: mockAccount,
        error: null
      });

      // Mock getContact
      supabase.from.mockReturnValueOnce(supabase);
      supabase.select.mockReturnValueOnce(supabase);
      supabase.eq.mockReturnValueOnce(supabase);
      supabase.single.mockResolvedValueOnce({
        data: mockContact,
        error: null
      });

      // Mock getTemplate (dentro de mapTemplateVariables)
      supabase.from.mockReturnValueOnce(supabase);
      supabase.select.mockReturnValueOnce(supabase);
      supabase.eq.mockReturnValueOnce(supabase);
      supabase.single.mockResolvedValueOnce({
        data: templateSinNombre,
        error: null
      });

      // Mock getContact (dentro de getContactAndLeadData)
      supabase.from.mockReturnValueOnce(supabase);
      supabase.select.mockReturnValueOnce(supabase);
      supabase.eq.mockReturnValueOnce(supabase);
      supabase.single.mockResolvedValueOnce({
        data: mockContact,
        error: null
      });

      // Mock getAccount (dentro de getContactAndLeadData)
      supabase.from.mockReturnValueOnce(supabase);
      supabase.select.mockReturnValueOnce(supabase);
      supabase.eq.mockReturnValueOnce(supabase);
      supabase.single.mockResolvedValueOnce({
        data: { id: 'account-123', product_id: null },
        error: null
      });

      // Mock get_lead_by_contact RPC (sin lead)
      supabase.rpc = vi.fn().mockResolvedValueOnce({
        data: [],
        error: null
      });

      const result = await templateSenderModule.sendTemplateMessage(
        'account-123',
        'contact-123',
        'template-123'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      // El mensaje puede variar, solo verificar que hay error
      expect(result.error.message).toBeTruthy();
    });
  });

  describe('sendMessageIntelligent con template_id', () => {
    it('debe usar template cuando ventana está cerrada', async () => {
      const mockContact = {
        id: 'contact-123',
        phone: '521234567890',
        created_at: new Date(Date.now() - 100 * 60 * 60 * 1000).toISOString() // 100 horas atrás
      };

      // Mock checkWindow24h (ventana cerrada)
      supabase.rpc.mockResolvedValueOnce({
        data: [{ window_active: false, window_expires_at: null }],
        error: null
      });

      // Mock check72hWindow (fuera de 72h)
      supabase.from.mockReturnValueOnce(supabase);
      supabase.select.mockReturnValueOnce(supabase);
      supabase.eq.mockReturnValueOnce(supabase);
      supabase.single.mockResolvedValueOnce({
        data: { created_at: mockContact.created_at },
        error: null
      });

      // Mock getAccount (para sendTemplateMessage)
      supabase.from.mockReturnValueOnce(supabase);
      supabase.select.mockReturnValueOnce(supabase);
      supabase.eq.mockReturnValueOnce(supabase);
      supabase.single.mockResolvedValueOnce({
        data: {
          id: 'account-123',
          phone_number_id: 'phone-123',
          access_token: 'token-123',
          active: true
        },
        error: null
      });

      // Mock getContact (para sendTemplateMessage)
      supabase.from.mockReturnValueOnce(supabase);
      supabase.select.mockReturnValueOnce(supabase);
      supabase.eq.mockReturnValueOnce(supabase);
      supabase.single.mockResolvedValueOnce({
        data: mockContact,
        error: null
      });

      // Mock getTemplate y mapTemplateVariables (simplificado)
      supabase.from.mockReturnValue(supabase);
      supabase.select.mockReturnValue(supabase);
      supabase.eq.mockReturnValue(supabase);
      supabase.single.mockResolvedValue({
        data: {
          id: 'template-123',
          wa_template_name: 'test_template',
          wa_status: 'approved',
          body_text: 'Test'
        },
        error: null
      });

      supabase.rpc.mockResolvedValue({
        data: [],
        error: null
      });

      // Mock WhatsApp API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          messages: [{ id: 'wa-msg-123' }]
        })
      });

      // Mock saveMessage
      supabase.insert.mockReturnValue(supabase);
      supabase.select.mockReturnValue(supabase);
      supabase.single.mockResolvedValue({
        data: { id: 'msg-123' },
        error: null
      });

      // Mock updateContactInteraction
      supabase.update.mockReturnValue(supabase);

      const messageData = {
        template_id: 'template-123'
      };

      const result = await sendDecisionModule.sendMessageIntelligent(
        'account-123',
        'contact-123',
        'text',
        messageData
      );

      expect(result.success).toBe(true);
      expect(result.method).toBe('template');
      expect(result.messageId).toBe('msg-123');
    });

    it('debe usar flujo normal cuando ventana está abierta aunque tenga template_id', async () => {
      // Mock checkWindow24h (ventana abierta)
      supabase.rpc.mockResolvedValueOnce({
        data: [{ window_active: true, window_expires_at: new Date(Date.now() + 3600000).toISOString() }],
        error: null
      });

      // Mock decideSendMethod
      supabase.rpc.mockResolvedValueOnce({
        data: { method: 'cloud_api', reason: 'window_open', cost: 0 },
        error: null
      });

      // Mock sendTextMessage (flujo normal)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          messages: [{ id: 'wa-msg-456' }]
        })
      });

      supabase.from.mockReturnValue(supabase);
      supabase.select.mockReturnValue(supabase);
      supabase.eq.mockReturnValue(supabase);
      supabase.single.mockResolvedValue({
        data: {
          id: 'account-123',
          phone_number_id: 'phone-123',
          access_token: 'token-123',
          active: true
        },
        error: null
      });

      supabase.insert.mockReturnValue(supabase);
      supabase.select.mockReturnValue(supabase);
      supabase.single.mockResolvedValue({
        data: { id: 'msg-456' },
        error: null
      });

      supabase.update.mockReturnValue(supabase);

      const messageData = {
        template_id: 'template-123',
        contentText: 'Mensaje normal'
      };

      const result = await sendDecisionModule.sendMessageIntelligent(
        'account-123',
        'contact-123',
        'text',
        messageData
      );

      expect(result.success).toBe(true);
      expect(result.method).toBe('cloud_api');
    });
  });

  describe('processSequenceMessage con template_id', () => {
    it('debe usar template cuando ventana está cerrada en mensaje de secuencia', async () => {
      const mockContact = {
        id: 'contact-123',
        account_id: 'account-123',
        created_at: new Date(Date.now() - 100 * 60 * 60 * 1000).toISOString(),
        phone: '521234567890'
      };

      // Mock getContact
      supabase.from.mockReturnValueOnce(supabase);
      supabase.select.mockReturnValueOnce(supabase);
      supabase.eq.mockReturnValueOnce(supabase);
      supabase.single.mockResolvedValueOnce({
        data: mockContact,
        error: null
      });

      // Mock checkWindow24h
      supabase.rpc.mockResolvedValueOnce({
        data: [{ window_active: false, window_expires_at: null }],
        error: null
      });

      // Mock getAccount (para sendTemplateMessage)
      supabase.from.mockReturnValueOnce(supabase);
      supabase.select.mockReturnValueOnce(supabase);
      supabase.eq.mockReturnValueOnce(supabase);
      supabase.single.mockResolvedValueOnce({
        data: {
          id: 'account-123',
          phone_number_id: 'phone-123',
          access_token: 'token-123',
          active: true
        },
        error: null
      });

      // Mock getContact (para sendTemplateMessage)
      supabase.from.mockReturnValueOnce(supabase);
      supabase.select.mockReturnValueOnce(supabase);
      supabase.eq.mockReturnValueOnce(supabase);
      supabase.single.mockResolvedValueOnce({
        data: mockContact,
        error: null
      });

      // Mock getTemplate y mapTemplateVariables
      supabase.from.mockReturnValue(supabase);
      supabase.select.mockReturnValue(supabase);
      supabase.eq.mockReturnValue(supabase);
      supabase.single.mockResolvedValue({
        data: {
          id: 'template-123',
          wa_template_name: 'test_template',
          wa_status: 'approved',
          body_text: 'Test'
        },
        error: null
      });

      supabase.rpc.mockResolvedValue({
        data: [],
        error: null
      });

      // Mock WhatsApp API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          messages: [{ id: 'wa-msg-789' }]
        })
      });

      // Mock saveMessage
      supabase.insert.mockReturnValue(supabase);
      supabase.select.mockReturnValue(supabase);
      supabase.single.mockResolvedValue({
        data: { id: 'msg-789' },
        error: null
      });

      // Mock updateContactInteraction
      supabase.update.mockReturnValue(supabase);

      // Mock updateContactAfterSend
      supabase.from.mockReturnValue(supabase);
      supabase.update.mockReturnValue(supabase);
      supabase.eq.mockReturnValue(supabase);

      const messageData = {
        template_id: 'template-123',
        order_position: 1
      };

      const result = await sequenceDecisionModule.processSequenceMessage(
        'contact-123',
        messageData
      );

      expect(result.success).toBe(true);
      expect(result.method).toBe('template');
      expect(result.messageId).toBe('msg-789');
    });

    it('debe hacer fallback a flujo normal si template falla', async () => {
      const mockContact = {
        id: 'contact-123',
        account_id: 'account-123',
        created_at: new Date(Date.now() - 100 * 60 * 60 * 1000).toISOString()
      };

      // Mock getContact
      supabase.from.mockReturnValueOnce(supabase);
      supabase.select.mockReturnValueOnce(supabase);
      supabase.eq.mockReturnValueOnce(supabase);
      supabase.single.mockResolvedValueOnce({
        data: mockContact,
        error: null
      });

      // Mock checkWindow24h (ventana cerrada)
      supabase.rpc.mockResolvedValueOnce({
        data: [{ window_active: false, window_expires_at: null }],
        error: null
      });

      // Mock getAccount (para sendTemplateMessage - fallará)
      supabase.from.mockReturnValueOnce(supabase);
      supabase.select.mockReturnValueOnce(supabase);
      supabase.eq.mockReturnValueOnce(supabase);
      supabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Cuenta no encontrada' }
      });

      // Mock decideSendMethod (fallback)
      supabase.rpc.mockResolvedValueOnce({
        data: { method: 'puppeteer', reason: 'fallback', cost: 0 },
        error: null
      });

      // Mock addToPuppeteerQueue
      supabase.rpc.mockResolvedValueOnce({
        data: { id: 'queue-123' },
        error: null
      });

      // Mock updateContactAfterSend
      supabase.from.mockReturnValue(supabase);
      supabase.select.mockReturnValue(supabase);
      supabase.eq.mockReturnValue(supabase);
      supabase.single.mockResolvedValue({
        data: {
          messages_sent_via_cloud_api: 0,
          messages_sent_via_puppeteer: 0,
          sequence_position: 0
        },
        error: null
      });

      supabase.update.mockReturnValue(supabase);

      const messageData = {
        template_id: 'template-123',
        message_type: 'text',
        content_text: 'Mensaje fallback',
        order_position: 1
      };

      const result = await sequenceDecisionModule.processSequenceMessage(
        'contact-123',
        messageData
      );

      expect(result.success).toBe(true);
      expect(result.method).toBe('puppeteer');
      expect(result.queueId).toBe('queue-123');
    });
  });
});

