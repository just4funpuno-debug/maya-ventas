/**
 * Tests para FASE 7: Flujos Flexibles - Cambio Automático de Etapa
 * 
 * Ejecutar con: npm test -- tests/whatsapp/fase7-stage-change-automatic.test.js
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  evaluateContactSequence,
  getNextSequenceMessage
} from '../../src/services/whatsapp/sequence-engine';
import { getSequenceWithMessages } from '../../src/services/whatsapp/sequences';
import { getAccountById } from '../../src/services/whatsapp/accounts';
import { getLeadByContact, moveLeadToStage } from '../../src/services/whatsapp/leads';

// Mock del módulo supabaseClient
vi.mock('../../src/supabaseClient', () => {
  const mockSupabase = {
    from: vi.fn(() => mockSupabase),
    select: vi.fn(() => mockSupabase),
    update: vi.fn(() => mockSupabase),
    eq: vi.fn(() => mockSupabase),
    order: vi.fn(() => mockSupabase),
    limit: vi.fn(() => mockSupabase),
    single: vi.fn(() => Promise.resolve({ data: null, error: null })),
    maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null }))
  };
  
  return {
    supabase: mockSupabase
  };
});

// Mock de servicios
vi.mock('../../src/services/whatsapp/sequences', async () => {
  const actual = await vi.importActual('../../src/services/whatsapp/sequences');
  return {
    ...actual,
    getSequenceWithMessages: vi.fn()
  };
});

vi.mock('../../src/services/whatsapp/accounts');
vi.mock('../../src/services/whatsapp/leads');

import { supabase } from '../../src/supabaseClient';

describe('FASE 7: Flujos Flexibles - Cambio Automático de Etapa', () => {
  const mockContactId = 'contact_123';
  const mockAccountId = 'account_456';
  const mockProductId = 'product_789';
  const mockSequenceId = 'sequence_123';
  const mockLeadId = 'lead_123';

  beforeEach(() => {
    vi.clearAllMocks();
    supabase.from.mockReturnValue(supabase);
    supabase.select.mockReturnValue(supabase);
    supabase.update.mockReturnValue(supabase);
    supabase.eq.mockReturnValue(supabase);
    supabase.order.mockReturnValue(supabase);
    supabase.limit.mockReturnValue(supabase);
    supabase.maybeSingle.mockResolvedValue({ data: null, error: null });
    
    // Default mocks
    getSequenceWithMessages.mockResolvedValue({
      data: {
        id: mockSequenceId,
        account_id: mockAccountId,
        active: true,
        messages: []
      },
      error: null
    });

    getAccountById.mockResolvedValue({
      data: {
        id: mockAccountId,
        product_id: mockProductId
      },
      error: null
    });

    getLeadByContact.mockResolvedValue({
      data: {
        id: mockLeadId,
        contact_id: mockContactId,
        product_id: mockProductId,
        pipeline_stage: 'entrantes'
      },
      error: null
    });

    moveLeadToStage.mockResolvedValue({
      data: {
        id: mockLeadId,
        pipeline_stage: 'Seguimiento'
      },
      error: null
    });
  });

  describe('SUBFASE 7.1: processStageChangeStep - Procesar Cambio de Etapa', () => {
    it('debe mover lead a etapa destino cuando se ejecuta cambio de etapa', async () => {
      const mockSequence = {
        id: mockSequenceId,
        account_id: mockAccountId,
        active: true,
        messages: [
          { id: 'msg_1', step_type: 'message', order_position: 1, delay_hours_from_previous: 0 },
          { id: 'stage_change_1', step_type: 'stage_change', order_position: 2, target_stage_name: 'Seguimiento' },
          { id: 'msg_2', step_type: 'message', order_position: 3, delay_hours_from_previous: 0 }
        ]
      };

      getSequenceWithMessages.mockResolvedValueOnce({
        data: mockSequence,
        error: null
      });

      // Mock contacto con posición 1
      supabase.single.mockResolvedValueOnce({
        data: {
          id: mockContactId,
          account_id: mockAccountId,
          sequence_active: true,
          sequence_id: mockSequenceId,
          sequence_position: 1,
          client_responses_count: 0
        },
        error: null
      });

      // Mock actualización de posición después del cambio de etapa
      supabase.update.mockResolvedValueOnce({
        data: null,
        error: null
      });

      // Mock para getNextSequenceMessage
      supabase.single.mockResolvedValueOnce({
        data: { sequence_position: 2 },
        error: null
      });

      // Mock para shouldSendNextMessage (no hay último mensaje)
      supabase.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null
      });

      const result = await evaluateContactSequence(mockContactId);

      // Verificar que moveLeadToStage fue llamado
      expect(getAccountById).toHaveBeenCalledWith(mockAccountId);
      expect(getLeadByContact).toHaveBeenCalledWith(mockContactId, mockProductId);
      expect(moveLeadToStage).toHaveBeenCalledWith(
        mockLeadId,
        'Seguimiento',
        null, // userId = null para cambios automáticos
        mockProductId
      );
    });

    it('debe manejar error cuando contacto no tiene lead', async () => {
      getLeadByContact.mockResolvedValueOnce({
        data: null, // Sin lead
        error: null
      });

      const mockSequence = {
        id: mockSequenceId,
        account_id: mockAccountId,
        active: true,
        messages: [
          { id: 'msg_1', step_type: 'message', order_position: 1 },
          { id: 'stage_change_1', step_type: 'stage_change', order_position: 2, target_stage_name: 'Seguimiento' }
        ]
      };

      getSequenceWithMessages.mockResolvedValueOnce({
        data: mockSequence,
        error: null
      });

      supabase.single.mockResolvedValueOnce({
        data: {
          id: mockContactId,
          account_id: mockAccountId,
          sequence_active: true,
          sequence_id: mockSequenceId,
          sequence_position: 1,
          client_responses_count: 0
        },
        error: null
      });

      // Mock para getNextSequenceMessage
      supabase.single.mockResolvedValueOnce({
        data: { sequence_position: 1 },
        error: null
      });

      const result = await evaluateContactSequence(mockContactId);

      // moveLeadToStage NO debe ser llamado si no hay lead
      expect(getLeadByContact).toHaveBeenCalled();
      expect(moveLeadToStage).not.toHaveBeenCalled();
    });

    it('debe manejar error cuando cuenta no tiene product_id', async () => {
      getAccountById.mockResolvedValueOnce({
        data: {
          id: mockAccountId,
          product_id: null // Sin product_id
        },
        error: null
      });

      const mockSequence = {
        id: mockSequenceId,
        account_id: mockAccountId,
        active: true,
        messages: [
          { id: 'msg_1', step_type: 'message', order_position: 1 },
          { id: 'stage_change_1', step_type: 'stage_change', order_position: 2, target_stage_name: 'Seguimiento' }
        ]
      };

      getSequenceWithMessages.mockResolvedValueOnce({
        data: mockSequence,
        error: null
      });

      supabase.single.mockResolvedValueOnce({
        data: {
          id: mockContactId,
          account_id: mockAccountId,
          sequence_active: true,
          sequence_id: mockSequenceId,
          sequence_position: 1,
          client_responses_count: 0
        },
        error: null
      });

      supabase.single.mockResolvedValueOnce({
        data: { sequence_position: 1 },
        error: null
      });

      const result = await evaluateContactSequence(mockContactId);

      // No debe llamar a getLeadByContact ni moveLeadToStage
      expect(getAccountById).toHaveBeenCalled();
      expect(getLeadByContact).not.toHaveBeenCalled();
      expect(moveLeadToStage).not.toHaveBeenCalled();
    });
  });

  describe('SUBFASE 7.2: Integración - Cambio de Etapa en Flujo', () => {
    it('debe procesar cambio de etapa antes de buscar siguiente mensaje', async () => {
      const mockSequence = {
        id: mockSequenceId,
        account_id: mockAccountId,
        active: true,
        messages: [
          { id: 'msg_1', step_type: 'message', order_position: 1, delay_hours_from_previous: 0 },
          { id: 'stage_change_1', step_type: 'stage_change', order_position: 2, target_stage_name: 'Seguimiento' },
          { id: 'msg_2', step_type: 'message', order_position: 3, delay_hours_from_previous: 0 }
        ]
      };

      getSequenceWithMessages.mockResolvedValueOnce({
        data: mockSequence,
        error: null
      });

      // Mock contacto en posición 1
      supabase.single.mockResolvedValueOnce({
        data: {
          id: mockContactId,
          account_id: mockAccountId,
          sequence_active: true,
          sequence_id: mockSequenceId,
          sequence_position: 1,
          client_responses_count: 0
        },
        error: null
      });

      // Mock actualización después de procesar cambio de etapa
      supabase.update.mockResolvedValueOnce({
        data: null,
        error: null
      });

      // Mock para getNextSequenceMessage (después de procesar cambio, buscar desde posición 2)
      supabase.single.mockResolvedValueOnce({
        data: { sequence_position: 2 },
        error: null
      });

      // Mock para shouldSendNextMessage
      supabase.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null
      });

      const result = await evaluateContactSequence(mockContactId);

      // Verificar que se procesó el cambio de etapa
      expect(moveLeadToStage).toHaveBeenCalledWith(
        mockLeadId,
        'Seguimiento',
        null,
        mockProductId
      );

      // Verificar que se actualizó la posición del contacto
      expect(supabase.update).toHaveBeenCalled();
    });

    it('debe NO procesar cambio de etapa si hay pausa antes', async () => {
      const mockSequence = {
        id: mockSequenceId,
        account_id: mockAccountId,
        active: true,
        messages: [
          { id: 'msg_1', step_type: 'message', order_position: 1 },
          { id: 'pause_1', step_type: 'pause', pause_type: 'fixed_delay', order_position: 2, delay_hours_from_previous: 1.0 },
          { id: 'stage_change_1', step_type: 'stage_change', order_position: 3, target_stage_name: 'Seguimiento' },
          { id: 'msg_2', step_type: 'message', order_position: 4 }
        ]
      };

      getSequenceWithMessages.mockResolvedValueOnce({
        data: mockSequence,
        error: null
      });

      supabase.single.mockResolvedValueOnce({
        data: {
          id: mockContactId,
          account_id: mockAccountId,
          sequence_active: true,
          sequence_id: mockSequenceId,
          sequence_position: 1,
          client_responses_count: 0
        },
        error: null
      });

      supabase.single.mockResolvedValueOnce({
        data: { sequence_position: 1 },
        error: null
      });

      supabase.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null
      });

      const result = await evaluateContactSequence(mockContactId);

      // NO debe procesar el cambio de etapa porque hay una pausa antes
      expect(moveLeadToStage).not.toHaveBeenCalled();
    });

    it('debe procesar cambio de etapa inmediatamente si no hay pausas intermedias', async () => {
      const mockSequence = {
        id: mockSequenceId,
        account_id: mockAccountId,
        active: true,
        messages: [
          { id: 'msg_1', step_type: 'message', order_position: 1 },
          { id: 'stage_change_1', step_type: 'stage_change', order_position: 2, target_stage_name: 'Seguimiento' },
          { id: 'msg_2', step_type: 'message', order_position: 3 }
        ]
      };

      getSequenceWithMessages.mockResolvedValueOnce({
        data: mockSequence,
        error: null
      });

      supabase.single.mockResolvedValueOnce({
        data: {
          id: mockContactId,
          account_id: mockAccountId,
          sequence_active: true,
          sequence_id: mockSequenceId,
          sequence_position: 1,
          client_responses_count: 0
        },
        error: null
      });

      supabase.update.mockResolvedValueOnce({
        data: null,
        error: null
      });

      supabase.single.mockResolvedValueOnce({
        data: { sequence_position: 2 },
        error: null
      });

      supabase.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null
      });

      const result = await evaluateContactSequence(mockContactId);

      // Debe procesar el cambio de etapa porque es inmediato
      expect(moveLeadToStage).toHaveBeenCalled();
    });
  });

  describe('SUBFASE 7.3: Detener Flujo Actual e Iniciar Nuevo', () => {
    it('debe detener flujo actual y iniciar nuevo flujo cuando etapa destino tiene uno', async () => {
      // moveLeadToStage ya maneja esto internamente
      // Solo verificamos que se llama correctamente
      
      const mockSequence = {
        id: mockSequenceId,
        account_id: mockAccountId,
        active: true,
        messages: [
          { id: 'msg_1', step_type: 'message', order_position: 1 },
          { id: 'stage_change_1', step_type: 'stage_change', order_position: 2, target_stage_name: 'Seguimiento' }
        ]
      };

      getSequenceWithMessages.mockResolvedValueOnce({
        data: mockSequence,
        error: null
      });

      supabase.single.mockResolvedValueOnce({
        data: {
          id: mockContactId,
          account_id: mockAccountId,
          sequence_active: true,
          sequence_id: mockSequenceId,
          sequence_position: 1,
          client_responses_count: 0
        },
        error: null
      });

      supabase.update.mockResolvedValueOnce({
        data: null,
        error: null
      });

      supabase.single.mockResolvedValueOnce({
        data: { sequence_position: 2 },
        error: null
      });

      supabase.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null
      });

      const result = await evaluateContactSequence(mockContactId);

      // moveLeadToStage debe ser llamado
      // moveLeadToStage internamente:
      // - Detiene el flujo actual
      // - Si la etapa destino tiene un flujo, lo inicia automáticamente
      expect(moveLeadToStage).toHaveBeenCalled();
    });
  });

  describe('SUBFASE 7.4: Actualizar Posición del Contacto', () => {
    it('debe actualizar sequence_position después de procesar cambio de etapa', async () => {
      const mockSequence = {
        id: mockSequenceId,
        account_id: mockAccountId,
        active: true,
        messages: [
          { id: 'msg_1', step_type: 'message', order_position: 1 },
          { id: 'stage_change_1', step_type: 'stage_change', order_position: 2, target_stage_name: 'Seguimiento' },
          { id: 'msg_2', step_type: 'message', order_position: 3 }
        ]
      };

      getSequenceWithMessages.mockResolvedValueOnce({
        data: mockSequence,
        error: null
      });

      supabase.single.mockResolvedValueOnce({
        data: {
          id: mockContactId,
          account_id: mockAccountId,
          sequence_active: true,
          sequence_id: mockSequenceId,
          sequence_position: 1,
          client_responses_count: 0
        },
        error: null
      });

      supabase.update.mockResolvedValueOnce({
        data: null,
        error: null
      });

      supabase.single.mockResolvedValueOnce({
        data: { sequence_position: 2 },
        error: null
      });

      supabase.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null
      });

      await evaluateContactSequence(mockContactId);

      // Verificar que se actualizó la posición del contacto
      expect(supabase.update).toHaveBeenCalled();
      const updateCall = supabase.update.mock.calls.find(call => 
        call[0]?.sequence_position === 2
      );
      expect(updateCall).toBeTruthy();
    });
  });
});



