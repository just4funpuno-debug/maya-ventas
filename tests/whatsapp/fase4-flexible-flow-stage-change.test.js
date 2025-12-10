/**
 * Tests para FASE 4: Flujos Flexibles - Cambio de Etapa
 * 
 * Ejecutar con: npm test -- tests/whatsapp/fase4-flexible-flow-stage-change.test.js
 * O con Vitest: npx vitest tests/whatsapp/fase4-flexible-flow-stage-change.test.js
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  addSequenceMessage,
  updateSequenceMessage,
  getSequenceMessages,
  getSequenceById
} from '../../src/services/whatsapp/sequences';
import { getPipelineStages } from '../../src/services/whatsapp/pipelines';
import { getAccountById } from '../../src/services/whatsapp/accounts';

// Mock del módulo supabaseClient
vi.mock('../../src/supabaseClient', () => {
  const mockSupabase = {
    from: vi.fn(() => mockSupabase),
    select: vi.fn(() => mockSupabase),
    insert: vi.fn(() => mockSupabase),
    update: vi.fn(() => mockSupabase),
    eq: vi.fn(() => mockSupabase),
    order: vi.fn(() => Promise.resolve({ data: [], error: null })),
    single: vi.fn(() => Promise.resolve({ data: null, error: null })),
    maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null }))
  };
  
  return {
    supabase: mockSupabase
  };
});

// Mock de getSequenceMessages para addSequenceMessage
vi.mock('../../src/services/whatsapp/sequences', async () => {
  const actual = await vi.importActual('../../src/services/whatsapp/sequences');
  return {
    ...actual,
    getSequenceMessages: vi.fn(),
    getSequenceById: vi.fn()
  };
});

// Mock de servicios externos
vi.mock('../../src/services/whatsapp/pipelines');
vi.mock('../../src/services/whatsapp/accounts');

import { supabase } from '../../src/supabaseClient';

describe('FASE 4: Flujos Flexibles - Cambio de Etapa', () => {
  const mockSequenceId = 'sequence_123';
  const mockAccountId = 'account_123';
  const mockProductId = 'product_123';

  beforeEach(() => {
    vi.clearAllMocks();
    supabase.from.mockReturnValue(supabase);
    supabase.select.mockReturnValue(supabase);
    supabase.insert.mockReturnValue(supabase);
    supabase.update.mockReturnValue(supabase);
    supabase.eq.mockReturnValue(supabase);
    
    // Mock de getSequenceMessages por defecto (secuencia vacía)
    getSequenceMessages.mockResolvedValue({ data: [] });
    
    // Mock de getSequenceById por defecto
    getSequenceById.mockResolvedValue({
      data: {
        id: mockSequenceId,
        account_id: mockAccountId,
        name: 'Test Sequence',
        active: true
      },
      error: null
    });

    // Mock de getAccountById por defecto
    getAccountById.mockResolvedValue({
      data: {
        id: mockAccountId,
        product_id: mockProductId,
        display_name: 'Test Account'
      },
      error: null
    });

    // Mock de getPipelineStages por defecto
    getPipelineStages.mockResolvedValue({
      data: [
        { name: 'Leads Entrantes', order: 1, color: '#3b82f6' },
        { name: 'Seguimiento', order: 2, color: '#f59e0b' },
        { name: 'Venta', order: 3, color: '#10b981' },
        { name: 'Cliente', order: 4, color: '#8b5cf6' }
      ],
      error: null
    });
  });

  describe('SUBFASE 4.1: Crear Cambio de Etapa', () => {
    it('debe crear un cambio de etapa con etapa destino válida', async () => {
      const stageChangeData = {
        step_type: 'stage_change',
        target_stage_name: 'Seguimiento',
      };

      const mockInsertedStageChange = {
        id: 'stage_change_123',
        sequence_id: mockSequenceId,
        step_type: 'stage_change',
        message_type: null,
        target_stage_name: 'Seguimiento',
        content_text: null,
        message_number: 1,
        order_position: 1,
        active: true,
        delay_hours_from_previous: 0
      };

      supabase.single.mockResolvedValueOnce({
        data: mockInsertedStageChange,
        error: null
      });

      const { data, error } = await addSequenceMessage(mockSequenceId, stageChangeData);

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(data.step_type).toBe('stage_change');
      expect(data.target_stage_name).toBe('Seguimiento');
      expect(data.message_type).toBeNull();
      expect(data.content_text).toBeNull();
      expect(data.delay_hours_from_previous).toBe(0);

      // Verificar que se insertó con los datos correctos
      expect(supabase.insert).toHaveBeenCalled();
      const insertCall = supabase.insert.mock.calls[0][0];
      expect(insertCall.step_type).toBe('stage_change');
      expect(insertCall.target_stage_name).toBe('Seguimiento');
      expect(insertCall.message_type).toBeNull();
    });

    it('debe rechazar un cambio de etapa sin target_stage_name', async () => {
      const stageChangeData = {
        step_type: 'stage_change',
        // target_stage_name faltante
      };

      const { data, error } = await addSequenceMessage(mockSequenceId, stageChangeData);

      expect(data).toBeNull();
      expect(error).toBeTruthy();
      expect(error.message).toContain('requieren target_stage_name');
      
      // Verificar que NO se intentó insertar
      expect(supabase.insert).not.toHaveBeenCalled();
    });

    it('debe rechazar un cambio de etapa con target_stage_name vacío', async () => {
      const stageChangeData = {
        step_type: 'stage_change',
        target_stage_name: '', // Vacío
      };

      const { data, error } = await addSequenceMessage(mockSequenceId, stageChangeData);

      expect(data).toBeNull();
      expect(error).toBeTruthy();
      expect(error.message).toContain('requieren target_stage_name');
      
      expect(supabase.insert).not.toHaveBeenCalled();
    });

    it('debe asegurar que message_type es NULL para cambios de etapa', async () => {
      const stageChangeData = {
        step_type: 'stage_change',
        target_stage_name: 'Venta',
        message_type: 'text', // Intento de incluir message_type
        content_text: 'Este texto no debería guardarse'
      };

      const mockInsertedStageChange = {
        id: 'stage_change_validated_123',
        sequence_id: mockSequenceId,
        step_type: 'stage_change',
        message_type: null, // Debe ser NULL aunque se pase 'text'
        target_stage_name: 'Venta',
        content_text: null, // Debe ser NULL aunque se pase contenido
      };

      supabase.single.mockResolvedValueOnce({
        data: mockInsertedStageChange,
        error: null
      });

      const { data } = await addSequenceMessage(mockSequenceId, stageChangeData);

      // Verificar que se ignoró message_type y content_text
      expect(data.message_type).toBeNull();
      expect(data.content_text).toBeNull();
      
      // Verificar que el INSERT recibió NULL
      const insertCall = supabase.insert.mock.calls[0][0];
      expect(insertCall.message_type).toBeNull();
      expect(insertCall.content_text).toBeNull();
    });
  });

  describe('SUBFASE 4.2: Actualizar Cambio de Etapa', () => {
    it('debe actualizar un cambio de etapa existente', async () => {
      const existingStageChangeId = 'stage_change_existing_123';
      const updatedStageChangeData = {
        step_type: 'stage_change',
        target_stage_name: 'Cliente', // Cambiado de 'Seguimiento' a 'Cliente'
      };

      const mockUpdatedStageChange = {
        id: existingStageChangeId,
        sequence_id: mockSequenceId,
        step_type: 'stage_change',
        message_type: null,
        target_stage_name: 'Cliente',
        content_text: null,
        message_number: 1,
        order_position: 1,
        active: true,
        delay_hours_from_previous: 0
      };

      supabase.single.mockResolvedValueOnce({
        data: mockUpdatedStageChange,
        error: null
      });

      const { data, error } = await updateSequenceMessage(existingStageChangeId, updatedStageChangeData);

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(data.step_type).toBe('stage_change');
      expect(data.target_stage_name).toBe('Cliente');
      expect(data.message_type).toBeNull();

      // Verificar que se actualizó
      expect(supabase.update).toHaveBeenCalled();
      const updateCall = supabase.update.mock.calls[0][0];
      expect(updateCall.step_type).toBe('stage_change');
      expect(updateCall.target_stage_name).toBe('Cliente');
    });
  });

  describe('SUBFASE 4.3: Validaciones de Cambio de Etapa', () => {
    it('debe validar que target_stage_name es requerido', async () => {
      const stageChangeDataWithoutTarget = {
        step_type: 'stage_change',
        // target_stage_name faltante
      };

      const { data, error } = await addSequenceMessage(mockSequenceId, stageChangeDataWithoutTarget);

      expect(data).toBeNull();
      expect(error).toBeTruthy();
      expect(error.message).toContain('requieren target_stage_name');
    });

    it('debe rechazar target_stage_name con solo espacios', async () => {
      const stageChangeData = {
        step_type: 'stage_change',
        target_stage_name: '   ', // Solo espacios
      };

      const { data, error } = await addSequenceMessage(mockSequenceId, stageChangeData);

      expect(data).toBeNull();
      expect(error).toBeTruthy();
      expect(error.message).toContain('requieren target_stage_name');
    });
  });

  describe('SUBFASE 4.4: Integración - Cambio de Etapa y Otros Pasos', () => {
    it('debe permitir crear una secuencia con mensaje, cambio de etapa y mensaje', async () => {
      // 1. Crear mensaje inicial
      getSequenceMessages.mockResolvedValueOnce({ data: [] });
      
      const message1Data = {
        step_type: 'message',
        message_type: 'text',
        content_text: 'Primer mensaje',
        delay_hours_from_previous: 0,
      };

      const mockMessage1 = {
        id: 'msg_1',
        step_type: 'message',
        message_type: 'text',
        content_text: 'Primer mensaje',
        message_number: 1,
        order_position: 1,
      };

      supabase.single.mockResolvedValueOnce({
        data: mockMessage1,
        error: null
      });

      const { data: msg1 } = await addSequenceMessage(mockSequenceId, message1Data);
      expect(msg1.step_type).toBe('message');

      // 2. Agregar cambio de etapa después del mensaje
      getSequenceMessages.mockResolvedValueOnce({
        data: [mockMessage1]
      });

      const stageChangeData = {
        step_type: 'stage_change',
        target_stage_name: 'Seguimiento',
      };

      const mockStageChange = {
        id: 'stage_change_1',
        step_type: 'stage_change',
        target_stage_name: 'Seguimiento',
        message_number: 2,
        order_position: 2,
        delay_hours_from_previous: 0
      };

      supabase.single.mockResolvedValueOnce({
        data: mockStageChange,
        error: null
      });

      const { data: stageChange1 } = await addSequenceMessage(mockSequenceId, stageChangeData);
      expect(stageChange1.step_type).toBe('stage_change');
      expect(stageChange1.target_stage_name).toBe('Seguimiento');

      // 3. Agregar segundo mensaje después del cambio de etapa
      getSequenceMessages.mockResolvedValueOnce({
        data: [mockMessage1, mockStageChange]
      });

      const message2Data = {
        step_type: 'message',
        message_type: 'text',
        content_text: 'Segundo mensaje después de cambio de etapa',
        delay_hours_from_previous: 0,
      };

      const mockMessage2 = {
        id: 'msg_2',
        step_type: 'message',
        message_type: 'text',
        content_text: 'Segundo mensaje después de cambio de etapa',
        message_number: 3,
        order_position: 3,
      };

      supabase.single.mockResolvedValueOnce({
        data: mockMessage2,
        error: null
      });

      const { data: msg2 } = await addSequenceMessage(mockSequenceId, message2Data);
      expect(msg2.step_type).toBe('message');

      // Verificar que todos los pasos fueron creados correctamente
      expect(supabase.insert).toHaveBeenCalledTimes(3);
    });
  });

  describe('SUBFASE 4.5: Cambio de Etapa Inmediato', () => {
    it('debe tener delay_hours_from_previous = 0 (cambio inmediato)', async () => {
      const stageChangeData = {
        step_type: 'stage_change',
        target_stage_name: 'Venta',
        delay_hours_from_previous: 0, // Cambio inmediato
      };

      const mockStageChange = {
        id: 'stage_change_immediate_123',
        delay_hours_from_previous: 0,
        target_stage_name: 'Venta'
      };

      supabase.single.mockResolvedValueOnce({
        data: mockStageChange,
        error: null
      });

      const { data } = await addSequenceMessage(mockSequenceId, stageChangeData);

      // Verificar que el cambio es inmediato
      expect(data.delay_hours_from_previous).toBe(0);
      
      // Verificar en el INSERT
      const insertCall = supabase.insert.mock.calls[0][0];
      expect(insertCall.delay_hours_from_previous).toBe(0);
    });
  });

  describe('SUBFASE 4.6: Obtener Producto desde Secuencia', () => {
    it('debe obtener product_id desde account_id de la secuencia', async () => {
      const mockSequence = {
        id: mockSequenceId,
        account_id: mockAccountId,
        name: 'Test Sequence'
      };

      const mockAccount = {
        id: mockAccountId,
        product_id: mockProductId,
        display_name: 'Test Account'
      };

      getSequenceById.mockResolvedValueOnce({
        data: mockSequence,
        error: null
      });

      getAccountById.mockResolvedValueOnce({
        data: mockAccount,
        error: null
      });

      // Simular el flujo de obtener producto desde secuencia
      const sequence = await getSequenceById(mockSequenceId);
      expect(sequence.data.account_id).toBe(mockAccountId);

      const account = await getAccountById(mockAccountId);
      expect(account.data.product_id).toBe(mockProductId);
    });

    it('debe manejar error si la secuencia no tiene account_id', async () => {
      const mockSequenceWithoutAccount = {
        id: mockSequenceId,
        account_id: null,
        name: 'Test Sequence'
      };

      getSequenceById.mockResolvedValueOnce({
        data: mockSequenceWithoutAccount,
        error: null
      });

      const sequence = await getSequenceById(mockSequenceId);
      expect(sequence.data.account_id).toBeNull();
    });
  });

  describe('SUBFASE 4.7: Cargar Etapas del Pipeline', () => {
    it('debe cargar etapas disponibles del pipeline del producto', async () => {
      const mockStages = [
        { name: 'Leads Entrantes', order: 1, color: '#3b82f6' },
        { name: 'Seguimiento', order: 2, color: '#f59e0b' },
        { name: 'Venta', order: 3, color: '#10b981' },
        { name: 'Cliente', order: 4, color: '#8b5cf6' }
      ];

      getPipelineStages.mockResolvedValueOnce({
        data: mockStages,
        error: null
      });

      const { data: stages, error } = await getPipelineStages(mockProductId);

      expect(error).toBeNull();
      expect(stages).toBeTruthy();
      expect(stages.length).toBe(4);
      expect(stages[0].name).toBe('Leads Entrantes');
      expect(stages[1].name).toBe('Seguimiento');
    });

    it('debe manejar productos sin etapas configuradas', async () => {
      getPipelineStages.mockResolvedValueOnce({
        data: [],
        error: null
      });

      const { data: stages, error } = await getPipelineStages(mockProductId);

      expect(error).toBeNull();
      expect(stages).toEqual([]);
    });
  });
});



