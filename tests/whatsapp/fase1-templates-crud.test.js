/**
 * Tests para Templates de WhatsApp - CRUD Básico
 * FASE 1 - SUBFASE 1.4: Testing
 * 
 * Ejecutar con: npm test -- tests/whatsapp/fase1-templates-crud.test.js
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { supabase } from '../../src/supabaseClient';

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
    limit: vi.fn(() => mockSupabase)
  };
  
  return {
    supabase: mockSupabase
  };
});

// Importar funciones después de los mocks
let templatesModule;

describe('Templates - Crear Template', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    templatesModule = await import('../../src/services/whatsapp/templates');
  });

  it('debe crear un template básico con datos válidos', async () => {
    const mockTemplate = {
      id: 'template-123',
      account_id: 'account-123',
      name: 'Bienvenida',
      category: 'MARKETING',
      language: 'es',
      header_type: 'NONE',
      body_text: 'Hola {{1}}, bienvenido',
      footer_text: null,
      buttons: [],
      wa_template_name: 'bienvenida_1234567890',
      wa_status: 'draft'
    };

    supabase.from.mockReturnValue(supabase);
    supabase.insert.mockReturnValue(supabase);
    supabase.select.mockReturnValue(supabase);
    supabase.single.mockResolvedValue({
      data: mockTemplate,
      error: null
    });

    // Mock para verificar que no existe otro template con el mismo nombre
    supabase.maybeSingle.mockResolvedValue({
      data: null,
      error: null
    });

    const templateData = {
      account_id: 'account-123',
      name: 'Bienvenida',
      category: 'MARKETING',
      body_text: 'Hola {{1}}, bienvenido'
    };

    const result = await templatesModule.createTemplate(templateData);

    expect(result.error).toBeNull();
    expect(result.data).toBeTruthy();
    expect(result.data.name).toBe('Bienvenida');
    expect(result.data.category).toBe('MARKETING');
    expect(result.data.wa_status).toBe('draft');
  });

  it('debe rechazar template sin account_id', async () => {
    const templateData = {
      name: 'Bienvenida',
      category: 'MARKETING',
      body_text: 'Hola'
    };

    const result = await templatesModule.createTemplate(templateData);

    expect(result.error).toBeTruthy();
    expect(result.error.message).toContain('account_id');
    expect(result.data).toBeNull();
  });

  it('debe rechazar template sin name', async () => {
    const templateData = {
      account_id: 'account-123',
      category: 'MARKETING',
      body_text: 'Hola'
    };

    const result = await templatesModule.createTemplate(templateData);

    expect(result.error).toBeTruthy();
    expect(result.error.message).toContain('name');
  });

  it('debe rechazar template sin body_text', async () => {
    const templateData = {
      account_id: 'account-123',
      name: 'Bienvenida',
      category: 'MARKETING'
    };

    const result = await templatesModule.createTemplate(templateData);

    expect(result.error).toBeTruthy();
    expect(result.error.message).toContain('body_text');
  });

  it('debe rechazar template con body_text muy largo (>1024 caracteres)', async () => {
    const longText = 'a'.repeat(1025);
    const templateData = {
      account_id: 'account-123',
      name: 'Bienvenida',
      category: 'MARKETING',
      body_text: longText
    };

    const result = await templatesModule.createTemplate(templateData);

    expect(result.error).toBeTruthy();
    expect(result.error.message).toContain('1024');
  });

  it('debe rechazar template con header_type TEXT pero sin header_text', async () => {
    const templateData = {
      account_id: 'account-123',
      name: 'Bienvenida',
      category: 'MARKETING',
      body_text: 'Hola',
      header_type: 'TEXT'
    };

    const result = await templatesModule.createTemplate(templateData);

    expect(result.error).toBeTruthy();
    expect(result.error.message).toContain('header_text');
  });

  it('debe rechazar template con footer_text muy largo (>60 caracteres)', async () => {
    const longFooter = 'a'.repeat(61);
    const templateData = {
      account_id: 'account-123',
      name: 'Bienvenida',
      category: 'MARKETING',
      body_text: 'Hola',
      footer_text: longFooter
    };

    const result = await templatesModule.createTemplate(templateData);

    expect(result.error).toBeTruthy();
    expect(result.error.message).toContain('60');
  });

  it('debe rechazar template con más de 3 botones', async () => {
    const templateData = {
      account_id: 'account-123',
      name: 'Bienvenida',
      category: 'MARKETING',
      body_text: 'Hola',
      buttons: [
        { type: 'QUICK_REPLY', text: 'Botón 1' },
        { type: 'QUICK_REPLY', text: 'Botón 2' },
        { type: 'QUICK_REPLY', text: 'Botón 3' },
        { type: 'QUICK_REPLY', text: 'Botón 4' } // Demasiados
      ]
    };

    const result = await templatesModule.createTemplate(templateData);

    expect(result.error).toBeTruthy();
    expect(result.error.message).toContain('3');
  });

  it('debe rechazar template con más de un botón CALL_TO_ACTION', async () => {
    const templateData = {
      account_id: 'account-123',
      name: 'Bienvenida',
      category: 'MARKETING',
      body_text: 'Hola',
      buttons: [
        { type: 'CALL_TO_ACTION', text: 'Visitar', url: 'https://example.com' },
        { type: 'CALL_TO_ACTION', text: 'Visitar 2', url: 'https://example2.com' } // Solo 1 permitido
      ]
    };

    const result = await templatesModule.createTemplate(templateData);

    expect(result.error).toBeTruthy();
    expect(result.error.message).toContain('CALL_TO_ACTION');
  });

  it('debe aceptar template con botones válidos', async () => {
    const mockTemplate = {
      id: 'template-123',
      account_id: 'account-123',
      name: 'Bienvenida',
      category: 'MARKETING',
      body_text: 'Hola',
      buttons: [
        { type: 'QUICK_REPLY', text: 'Sí' },
        { type: 'QUICK_REPLY', text: 'No' }
      ],
      wa_template_name: 'bienvenida_1234567890',
      wa_status: 'draft'
    };

    supabase.from.mockReturnValue(supabase);
    supabase.insert.mockReturnValue(supabase);
    supabase.select.mockReturnValue(supabase);
    supabase.single.mockResolvedValue({
      data: mockTemplate,
      error: null
    });
    supabase.maybeSingle.mockResolvedValue({
      data: null,
      error: null
    });

    const templateData = {
      account_id: 'account-123',
      name: 'Bienvenida',
      category: 'MARKETING',
      body_text: 'Hola',
      buttons: [
        { type: 'QUICK_REPLY', text: 'Sí' },
        { type: 'QUICK_REPLY', text: 'No' }
      ]
    };

    const result = await templatesModule.createTemplate(templateData);

    expect(result.error).toBeNull();
    expect(result.data.buttons).toHaveLength(2);
  });
});

describe('Templates - Listar Templates', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    templatesModule = await import('../../src/services/whatsapp/templates');
  });

  it('debe listar todos los templates', async () => {
    const mockTemplates = [
      { id: 't1', name: 'Template 1', wa_status: 'draft' },
      { id: 't2', name: 'Template 2', wa_status: 'approved' }
    ];

    const finalResult = Promise.resolve({
      data: mockTemplates,
      error: null
    });

    const mockChainAfterOrder = {
      eq: vi.fn(() => mockChainAfterOrder),
      then: finalResult.then.bind(finalResult)
    };

    const mockChain = {
      select: vi.fn(() => mockChain),
      order: vi.fn(() => mockChainAfterOrder)
    };

    supabase.from.mockReturnValue(mockChain);

    const result = await templatesModule.getTemplates();

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(2);
  });

  it('debe filtrar templates por account_id', async () => {
    const mockTemplates = [
      { id: 't1', account_id: 'account-123', name: 'Template 1' }
    ];

    const finalResult = Promise.resolve({
      data: mockTemplates,
      error: null
    });

    const mockChainAfterOrder = {
      eq: vi.fn(() => mockChainAfterOrder),
      then: finalResult.then.bind(finalResult)
    };

    const mockChain = {
      select: vi.fn(() => mockChain),
      order: vi.fn(() => mockChainAfterOrder)
    };

    supabase.from.mockReturnValue(mockChain);

    const result = await templatesModule.getTemplates('account-123');

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(1);
    expect(result.data[0].account_id).toBe('account-123');
  });

  it('debe filtrar templates por categoría', async () => {
    const mockTemplates = [
      { id: 't1', category: 'MARKETING', name: 'Template Marketing' }
    ];

    const finalResult = Promise.resolve({
      data: mockTemplates,
      error: null
    });

    const mockChainAfterOrder = {
      eq: vi.fn(() => mockChainAfterOrder),
      then: finalResult.then.bind(finalResult)
    };

    const mockChain = {
      select: vi.fn(() => mockChain),
      order: vi.fn(() => mockChainAfterOrder)
    };

    supabase.from.mockReturnValue(mockChain);

    const result = await templatesModule.getTemplates(null, null, 'MARKETING');

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(1);
    expect(result.data[0].category).toBe('MARKETING');
  });
});

describe('Templates - Obtener Template', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    templatesModule = await import('../../src/services/whatsapp/templates');
  });

  it('debe obtener un template por ID', async () => {
    const mockTemplate = {
      id: 'template-123',
      name: 'Bienvenida',
      category: 'MARKETING'
    };

    supabase.from.mockReturnValue(supabase);
    supabase.select.mockReturnValue(supabase);
    supabase.eq.mockReturnValue(supabase);
    supabase.single.mockResolvedValue({
      data: mockTemplate,
      error: null
    });

    const result = await templatesModule.getTemplate('template-123');

    expect(result.error).toBeNull();
    expect(result.data.id).toBe('template-123');
    expect(supabase.eq).toHaveBeenCalledWith('id', 'template-123');
  });

  it('debe retornar error si template no existe', async () => {
    supabase.from.mockReturnValue(supabase);
    supabase.select.mockReturnValue(supabase);
    supabase.eq.mockReturnValue(supabase);
    supabase.single.mockResolvedValue({
      data: null,
      error: { message: 'Template no encontrado' }
    });

    const result = await templatesModule.getTemplate('template-999');

    expect(result.error).toBeTruthy();
    expect(result.data).toBeNull();
  });
});

describe('Templates - Actualizar Template', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    templatesModule = await import('../../src/services/whatsapp/templates');
  });

  it('debe actualizar un template existente', async () => {
    const currentTemplate = {
      id: 'template-123',
      name: 'Bienvenida',
      body_text: 'Hola',
      wa_status: 'draft'
    };

    const updatedTemplate = {
      ...currentTemplate,
      body_text: 'Hola actualizado'
    };

    // Mock para obtener template actual
    supabase.from.mockReturnValue(supabase);
    supabase.select.mockReturnValue(supabase);
    supabase.eq.mockReturnValue(supabase);
    supabase.single.mockResolvedValueOnce({
      data: currentTemplate,
      error: null
    });

    // Mock para actualizar
    supabase.update.mockReturnValue(supabase);
    supabase.select.mockReturnValue(supabase);
    supabase.single.mockResolvedValueOnce({
      data: updatedTemplate,
      error: null
    });

    const result = await templatesModule.updateTemplate('template-123', {
      body_text: 'Hola actualizado'
    });

    expect(result.error).toBeNull();
    expect(result.data.body_text).toBe('Hola actualizado');
  });

  it('debe rechazar actualización de template aprobado', async () => {
    const approvedTemplate = {
      id: 'template-123',
      name: 'Bienvenida',
      wa_status: 'approved'
    };

    supabase.from.mockReturnValue(supabase);
    supabase.select.mockReturnValue(supabase);
    supabase.eq.mockReturnValue(supabase);
    supabase.single.mockResolvedValue({
      data: approvedTemplate,
      error: null
    });

    const result = await templatesModule.updateTemplate('template-123', {
      name: 'Nuevo nombre'
    });

    expect(result.error).toBeTruthy();
    expect(result.error.message).toContain('aprobado');
  });
});

describe('Templates - Eliminar Template', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    templatesModule = await import('../../src/services/whatsapp/templates');
  });

  it('debe eliminar un template existente', async () => {
    const existingTemplate = {
      id: 'template-123',
      wa_status: 'draft'
    };

    // Mock para verificar que existe
    const selectChain = {
      select: vi.fn(() => selectChain),
      eq: vi.fn(() => selectChain),
      single: vi.fn(() => Promise.resolve({ data: existingTemplate, error: null }))
    };

    // Mock para eliminar
    const deleteChain = {
      delete: vi.fn(() => deleteChain),
      eq: vi.fn(() => Promise.resolve({ error: null }))
    };

    supabase.from.mockReturnValueOnce(selectChain).mockReturnValueOnce(deleteChain);

    const result = await templatesModule.deleteTemplate('template-123');

    expect(result.error).toBeNull();
    expect(result.data.success).toBe(true);
  });

  it('debe retornar error si template no existe', async () => {
    const selectChain = {
      select: vi.fn(() => selectChain),
      eq: vi.fn(() => selectChain),
      single: vi.fn(() => Promise.resolve({ data: null, error: null }))
    };

    supabase.from.mockReturnValue(selectChain);

    const result = await templatesModule.deleteTemplate('template-999');

    expect(result.error).toBeTruthy();
    expect(result.error.message).toContain('no encontrado');
  });
});

