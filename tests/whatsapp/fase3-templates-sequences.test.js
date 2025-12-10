/**
 * Tests para Templates - Integración con Secuencias
 * FASE 3 - SUBFASE 3.4: Testing
 * 
 * Ejecutar con: npm test -- tests/whatsapp/fase3-templates-sequences.test.js
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

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
let templatesModule;
let sequencesModule;

describe('Templates - Integración con Secuencias', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    templatesModule = await import('../../src/services/whatsapp/templates');
    sequencesModule = await import('../../src/services/whatsapp/sequences');
  });

  describe('addSequenceMessage con template_id', () => {
    it('debe agregar un mensaje con template_id correctamente', async () => {
      const mockTemplate = {
        id: 'template-123',
        wa_status: 'approved'
      };

      const mockSequenceMessage = {
        id: 'msg-123',
        sequence_id: 'seq-123',
        step_type: 'message',
        template_id: 'template-123',
        message_type: null,
        content_text: null
      };

      // Mock getTemplate para verificar template (primera llamada en addSequenceMessage)
      supabase.from.mockReturnValue(supabase);
      supabase.select.mockReturnValue(supabase);
      supabase.eq.mockReturnValue(supabase);
      supabase.single.mockResolvedValueOnce({
        data: mockTemplate,
        error: null
      });

      // Mock getSequenceMessages (llamada interna en addSequenceMessage)
      // getSequenceMessages usa .order() que retorna un promise con data/error
      const getMessagesPromise = Promise.resolve({
        data: [],
        error: null
      });
      supabase.order.mockReturnValue(getMessagesPromise);

      // Mock insert
      supabase.insert.mockReturnValue(supabase);
      supabase.select.mockReturnValue(supabase);
      supabase.single.mockResolvedValueOnce({
        data: mockSequenceMessage,
        error: null
      });

      const messageData = {
        step_type: 'message',
        template_id: 'template-123'
      };

      const result = await sequencesModule.addSequenceMessage('seq-123', messageData);

      expect(result.error).toBeNull();
      expect(result.data).toBeTruthy();
      expect(result.data.template_id).toBe('template-123');
      expect(result.data.message_type).toBeNull();
      expect(result.data.content_text).toBeNull();
    });

    it('debe rechazar template que no está aprobado', async () => {
      const mockTemplate = {
        id: 'template-123',
        wa_status: 'pending' // No aprobado
      };

      supabase.from.mockReturnValue(supabase);
      supabase.select.mockReturnValue(supabase);
      supabase.eq.mockReturnValue(supabase);
      supabase.single.mockResolvedValueOnce({
        data: mockTemplate,
        error: null
      });

      const messageData = {
        step_type: 'message',
        template_id: 'template-123'
      };

      const result = await sequencesModule.addSequenceMessage('seq-123', messageData);

      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('aprobado');
      expect(result.data).toBeNull();
    });

    it('debe rechazar template que no existe', async () => {
      supabase.from.mockReturnValue(supabase);
      supabase.select.mockReturnValue(supabase);
      supabase.eq.mockReturnValue(supabase);
      supabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Template no encontrado' }
      });

      const messageData = {
        step_type: 'message',
        template_id: 'template-invalid'
      };

      const result = await sequencesModule.addSequenceMessage('seq-123', messageData);

      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('Template');
      expect(result.data).toBeNull();
    });

    it('debe validar campos normales si no se usa template', async () => {
      // Mock getSequenceMessages (llamada interna)
      const getMessagesPromise = Promise.resolve({
        data: [],
        error: null
      });
      supabase.order.mockReturnValue(getMessagesPromise);

      supabase.from.mockReturnValue(supabase);
      supabase.insert.mockReturnValue(supabase);
      supabase.select.mockReturnValue(supabase);
      supabase.single.mockResolvedValueOnce({
        data: {
          id: 'msg-123',
          template_id: null,
          message_type: 'text',
          content_text: 'Hola'
        },
        error: null
      });

      const messageData = {
        step_type: 'message',
        message_type: 'text',
        content_text: 'Hola'
      };

      const result = await sequencesModule.addSequenceMessage('seq-123', messageData);

      expect(result.error).toBeNull();
      expect(result.data).toBeTruthy();
      expect(result.data.template_id).toBeNull();
      expect(result.data.message_type).toBe('text');
    });
  });

  describe('updateSequenceMessage con template_id', () => {
    it('debe actualizar un mensaje para usar template', async () => {
      const mockCurrentMessage = {
        step_type: 'message',
        message_type: 'text',
        template_id: null,
        pause_type: null,
        target_stage_name: null,
        condition_type: 'none',
        condition_keywords: null
      };

      const mockTemplate = {
        id: 'template-123',
        wa_status: 'approved'
      };

      const mockUpdatedMessage = {
        id: 'msg-123',
        template_id: 'template-123',
        message_type: null
      };

      // Mock obtener mensaje actual (primera llamada)
      supabase.from.mockReturnValue(supabase);
      supabase.select.mockReturnValue(supabase);
      supabase.eq.mockReturnValue(supabase);
      supabase.single.mockResolvedValueOnce({
        data: mockCurrentMessage,
        error: null
      });

      // Mock verificar template (segunda llamada a .from() dentro de addSequenceMessage)
      // Esta es una llamada separada a 'whatsapp_templates'
      supabase.from.mockReturnValue(supabase);
      supabase.select.mockReturnValue(supabase);
      supabase.eq.mockReturnValue(supabase);
      supabase.single.mockResolvedValueOnce({
        data: mockTemplate,
        error: null
      });

      // Mock update
      supabase.update.mockReturnValue(supabase);
      supabase.single.mockResolvedValueOnce({
        data: mockUpdatedMessage,
        error: null
      });

      const updates = {
        template_id: 'template-123'
      };

      const result = await sequencesModule.updateSequenceMessage('msg-123', updates);

      expect(result.error).toBeNull();
      expect(result.data).toBeTruthy();
    });

    it('debe rechazar actualizar a template no aprobado', async () => {
      const mockCurrentMessage = {
        step_type: 'message',
        template_id: null,
        message_type: 'text',
        pause_type: null,
        target_stage_name: null,
        condition_type: 'none',
        condition_keywords: null
      };

      const mockTemplate = {
        id: 'template-123',
        wa_status: 'rejected'
      };

      // Mock obtener mensaje actual
      supabase.from.mockReturnValue(supabase);
      supabase.select.mockReturnValue(supabase);
      supabase.eq.mockReturnValue(supabase);
      supabase.single.mockResolvedValueOnce({
        data: mockCurrentMessage,
        error: null
      });

      // Mock verificar template (segunda llamada)
      supabase.from.mockReturnValue(supabase);
      supabase.select.mockReturnValue(supabase);
      supabase.eq.mockReturnValue(supabase);
      supabase.single.mockResolvedValueOnce({
        data: mockTemplate,
        error: null
      });

      const updates = {
        template_id: 'template-123'
      };

      const result = await sequencesModule.updateSequenceMessage('msg-123', updates);

      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('aprobado');
    });
  });

  describe('mapTemplateVariables', () => {
    const mockContact = {
      id: 'contact-123',
      name: 'María González',
      phone: '521234567890',
      created_at: '2024-01-15T10:00:00Z'
    };

    const mockLead = {
      id: 'lead-123',
      contact_id: 'contact-123',
      pipeline_stage: 'Calificando',
      estimated_value: 150.50
    };

    const mockProduct = {
      id: 'product-123',
      name: 'Producto Premium',
      sku: 'PROD-001'
    };

    const mockTemplate = {
      id: 'template-123',
      name: 'Bienvenida',
      header_text: 'Hola {{1}}',
      body_text: 'Tu pedido de {{2}} está en la etapa {{3}}. Valor: {{4}}',
      footer_text: 'Fecha: {{5}}',
      buttons: [
        { type: 'QUICK_REPLY', text: 'Más info sobre {{2}}' }
      ]
    };

    it('debe mapear variables correctamente con datos completos', async () => {
      // Mock getTemplate
      supabase.from.mockReturnValue(supabase);
      supabase.select.mockReturnValue(supabase);
      supabase.eq.mockReturnValue(supabase);
      supabase.single.mockResolvedValueOnce({
        data: mockTemplate,
        error: null
      });

      // Mock getContact
      supabase.single.mockResolvedValueOnce({
        data: mockContact,
        error: null
      });

      // Mock getAccount
      supabase.single.mockResolvedValueOnce({
        data: { id: 'account-123', product_id: 'product-123' },
        error: null
      });

      // Mock get_lead_by_contact RPC
      supabase.rpc.mockResolvedValueOnce({
        data: [mockLead],
        error: null
      });

      // Mock getProduct
      supabase.single.mockResolvedValueOnce({
        data: mockProduct,
        error: null
      });

      const result = await templatesModule.mapTemplateVariables(
        'template-123',
        'contact-123',
        'account-123'
      );

      expect(result.error).toBeNull();
      expect(result.data).toBeTruthy();
      expect(result.data.template.header_text).toBe('Hola María González');
      expect(result.data.template.body_text).toContain('Producto Premium');
      expect(result.data.template.body_text).toContain('Calificando');
      expect(result.data.template.body_text).toContain('$150.50');
      expect(result.data.template.footer_text).toMatch(/\d{2}\/\d{2}\/\d{4}/);
      expect(result.data.template.buttons[0].text).toContain('Producto Premium');
    });

    it('debe usar valores por defecto cuando faltan datos', async () => {
      // Mock getTemplate
      supabase.from.mockReturnValue(supabase);
      supabase.select.mockReturnValue(supabase);
      supabase.eq.mockReturnValue(supabase);
      supabase.single.mockResolvedValueOnce({
        data: {
          ...mockTemplate,
          body_text: 'Hola {{1}}, bienvenido a {{2}}'
        },
        error: null
      });

      // Mock getContact
      supabase.single.mockResolvedValueOnce({
        data: { ...mockContact, name: null },
        error: null
      });

      // Mock getAccount sin product_id
      supabase.single.mockResolvedValueOnce({
        data: { id: 'account-123', product_id: null },
        error: null
      });

      // Mock get_lead_by_contact retorna vacío (sin lead)
      supabase.rpc.mockResolvedValueOnce({
        data: [],
        error: null
      });

      const result = await templatesModule.mapTemplateVariables(
        'template-123',
        'contact-123',
        'account-123'
      );

      expect(result.error).toBeNull();
      expect(result.data).toBeTruthy();
      expect(result.data.template.body_text).toContain('Cliente');
      expect(result.data.template.body_text).toContain('Producto');
    });

    it('debe retornar error si el template no existe', async () => {
      supabase.from.mockReturnValue(supabase);
      supabase.select.mockReturnValue(supabase);
      supabase.eq.mockReturnValue(supabase);
      supabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Template no encontrado' }
      });

      const result = await templatesModule.mapTemplateVariables(
        'template-invalid',
        'contact-123',
        'account-123'
      );

      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('Template');
    });

    it('debe retornar error si el contacto no existe', async () => {
      // Mock getTemplate
      supabase.from.mockReturnValue(supabase);
      supabase.select.mockReturnValue(supabase);
      supabase.eq.mockReturnValue(supabase);
      supabase.single.mockResolvedValueOnce({
        data: mockTemplate,
        error: null
      });

      // Mock getContact - no encontrado
      supabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Contacto no encontrado' }
      });

      const result = await templatesModule.mapTemplateVariables(
        'template-123',
        'contact-invalid',
        'account-123'
      );

      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('Contacto');
    });

    it('debe mapear todas las variables estándar', async () => {
      const templateWithAllVariables = {
        ...mockTemplate,
        body_text: '{{1}} {{2}} {{3}} {{4}} {{5}} {{6}} {{7}} {{8}}'
      };

      // Configurar mocks en el orden de ejecución
      let callCount = 0;
      
      // Mock para getTemplate (usa getTemplate internamente, que llama a .from('whatsapp_templates'))
      supabase.from.mockImplementationOnce(() => {
        callCount++;
        return supabase;
      });
      supabase.select.mockImplementationOnce(() => supabase);
      supabase.eq.mockImplementationOnce(() => supabase);
      supabase.single.mockResolvedValueOnce({
        data: templateWithAllVariables,
        error: null
      });

      // Mock para getContact (dentro de getContactAndLeadData)
      supabase.from.mockImplementationOnce(() => {
        callCount++;
        return supabase;
      });
      supabase.select.mockImplementationOnce(() => supabase);
      supabase.eq.mockImplementationOnce(() => supabase);
      supabase.single.mockResolvedValueOnce({
        data: mockContact,
        error: null
      });

      // Mock para getAccount (dentro de getContactAndLeadData)
      supabase.from.mockImplementationOnce(() => {
        callCount++;
        return supabase;
      });
      supabase.select.mockImplementationOnce(() => supabase);
      supabase.eq.mockImplementationOnce(() => supabase);
      supabase.single.mockResolvedValueOnce({
        data: { id: 'account-123', product_id: 'product-123' },
        error: null
      });

      // Mock para get_lead_by_contact RPC (dentro de getContactAndLeadData)
      supabase.rpc = vi.fn().mockResolvedValueOnce({
        data: [mockLead],
        error: null
      });

      // Mock para getProduct (dentro de getContactAndLeadData)
      supabase.from.mockImplementationOnce(() => {
        callCount++;
        return supabase;
      });
      supabase.select.mockImplementationOnce(() => supabase);
      supabase.eq.mockImplementationOnce(() => supabase);
      supabase.single.mockResolvedValueOnce({
        data: mockProduct,
        error: null
      });

      const result = await templatesModule.mapTemplateVariables(
        'template-123',
        'contact-123',
        'account-123'
      );

      expect(result.error).toBeNull();
      expect(result.data).toBeTruthy();
      const bodyText = result.data.template.body_text;
      
      // Verificar que todas las variables fueron reemplazadas
      expect(bodyText).not.toContain('{{');
      expect(bodyText).toContain('María González'); // {{1}}
      expect(bodyText).toContain('Producto Premium'); // {{2}} y {{8}}
      expect(bodyText).toContain('Calificando'); // {{3}}
      expect(bodyText).toContain('$150.50'); // {{4}}
      expect(bodyText).toMatch(/\d{2}\/\d{2}\/\d{4}/); // {{5}}
      expect(bodyText).toContain('521234567890'); // {{7}}
    });
  });
});

