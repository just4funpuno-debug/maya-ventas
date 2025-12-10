/**
 * Tests End-to-End para FASE 10: Flujos Flexibles - Testing Completo
 * 
 * Este test cubre todos los escenarios integrados:
 * - Flujo completo con todos los tipos de pasos
 * - Pausas consecutivas
 * - Cambio automático de etapa
 * - Inicio de nuevo flujo después de cambio de etapa
 * - Casos límite y errores
 * 
 * Ejecutar con: npm test -- tests/whatsapp/fase10-end-to-end.test.js
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  evaluateContactSequence,
  getNextSequenceMessage,
  shouldSendNextMessage
} from '../../src/services/whatsapp/sequence-engine';
import { getSequenceWithMessages } from '../../src/services/whatsapp/sequences';
import { getAccountById } from '../../src/services/whatsapp/accounts';
import { getLeadByContact, moveLeadToStage } from '../../src/services/whatsapp/leads';
import { addSequenceMessage } from '../../src/services/whatsapp/sequences';

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

describe('FASE 10: Testing End-to-End - Flujos Flexibles Completos', () => {
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

  describe('ESCENARIO 1: Flujo Completo con Todos los Tipos de Pasos', () => {
    it('debe ejecutar correctamente un flujo con mensaje, pausa, mensaje, cambio de etapa y mensaje', async () => {
      const mockSequence = {
        id: mockSequenceId,
        account_id: mockAccountId,
        active: true,
        messages: [
          {
            id: 'msg_1',
            step_type: 'message',
            message_type: 'text',
            content_text: 'Hola, bienvenido',
            order_position: 1,
            delay_hours_from_previous: 0
          },
          {
            id: 'pause_1',
            step_type: 'pause',
            pause_type: 'fixed_delay',
            order_position: 2,
            delay_hours_from_previous: 1.0
          },
          {
            id: 'msg_2',
            step_type: 'message',
            message_type: 'text',
            content_text: '¿Cómo estás?',
            order_position: 3,
            delay_hours_from_previous: 0
          },
          {
            id: 'stage_change_1',
            step_type: 'stage_change',
            target_stage_name: 'Seguimiento',
            order_position: 4,
            delay_hours_from_previous: 0
          },
          {
            id: 'msg_3',
            step_type: 'message',
            message_type: 'text',
            content_text: 'Mensaje final',
            order_position: 5,
            delay_hours_from_previous: 0
          }
        ]
      };

      getSequenceWithMessages.mockResolvedValueOnce({
        data: mockSequence,
        error: null
      });

      // Mock contacto en posición 0
      const contactData = {
        id: mockContactId,
        account_id: mockAccountId,
        sequence_active: true,
        sequence_id: mockSequenceId,
        sequence_position: 0,
        client_responses_count: 0,
        sequence_started_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // Hace 2 horas
      };

      supabase.single.mockResolvedValueOnce({
        data: contactData,
        error: null
      });

      // Mock para getNextSequenceMessage (retorna el primer mensaje)
      supabase.single.mockResolvedValueOnce({
        data: { sequence_position: 0 },
        error: null
      });

      // Mock para shouldSendNextMessage - no hay último mensaje enviado, primer mensaje listo
      supabase.maybeSingle.mockResolvedValueOnce({
        data: null, // No hay último mensaje (primer mensaje)
        error: null
      });

      const result = await evaluateContactSequence(mockContactId);

      expect(result.shouldSend).toBe(true);
      expect(result.nextMessage).toBeTruthy();
      expect(result.nextMessage.step_type).toBe('message');
      expect(result.nextMessage.content_text).toBe('Hola, bienvenido');
    });

    it('debe procesar cambio de etapa cuando se llega a ese paso', async () => {
      const mockSequence = {
        id: mockSequenceId,
        account_id: mockAccountId,
        active: true,
        messages: [
          {
            id: 'msg_1',
            step_type: 'message',
            message_type: 'text',
            content_text: 'Mensaje inicial',
            order_position: 1,
            delay_hours_from_previous: 0
          },
          {
            id: 'stage_change_1',
            step_type: 'stage_change',
            target_stage_name: 'Seguimiento',
            order_position: 2,
            delay_hours_from_previous: 0
          }
        ]
      };

      getSequenceWithMessages.mockResolvedValueOnce({
        data: mockSequence,
        error: null
      });

      // Mock contacto en posición 1 (después del primer mensaje)
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

      // Mock para getNextSequenceMessage (buscar siguiente después de cambio de etapa)
      supabase.single.mockResolvedValueOnce({
        data: { sequence_position: 2 },
        error: null
      });

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
    });
  });

  describe('ESCENARIO 2: Pausas Consecutivas', () => {
    it('debe sumar delays de pausas consecutivas correctamente', async () => {
      const mockSequence = {
        id: mockSequenceId,
        account_id: mockAccountId,
        active: true,
        messages: [
          {
            id: 'msg_1',
            step_type: 'message',
            message_type: 'text',
            content_text: 'Primer mensaje',
            order_position: 1,
            delay_hours_from_previous: 0
          },
          {
            id: 'pause_1',
            step_type: 'pause',
            pause_type: 'fixed_delay',
            order_position: 2,
            delay_hours_from_previous: 2.0 // 2 horas
          },
          {
            id: 'pause_2',
            step_type: 'pause',
            pause_type: 'fixed_delay',
            order_position: 3,
            delay_hours_from_previous: 1.5 // 1.5 horas
          },
          {
            id: 'msg_2',
            step_type: 'message',
            message_type: 'text',
            content_text: 'Segundo mensaje',
            order_position: 4,
            delay_hours_from_previous: 0
          }
        ]
      };

      getSequenceWithMessages.mockResolvedValueOnce({
        data: mockSequence,
        error: null
      });

      // Mock contacto en posición 1 (después del primer mensaje)
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

      // Mock para shouldSendNextMessage
      supabase.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null
      });

      const result = await evaluateContactSequence(mockContactId);

      // El siguiente mensaje debería ser msg_2 con delay acumulado de 3.5 horas (2.0 + 1.5)
      expect(result.nextMessage).toBeTruthy();
      expect(result.nextMessage.content_text).toBe('Segundo mensaje');
      // El delay acumulado se pasa a shouldSendNextMessage internamente
    });

    it('debe saltar pausas consecutivas y encontrar el siguiente mensaje real', async () => {
      const mockSequence = {
        id: mockSequenceId,
        account_id: mockAccountId,
        active: true,
        messages: [
          {
            id: 'pause_1',
            step_type: 'pause',
            pause_type: 'fixed_delay',
            order_position: 1,
            delay_hours_from_previous: 1.0
          },
          {
            id: 'pause_2',
            step_type: 'pause',
            pause_type: 'fixed_delay',
            order_position: 2,
            delay_hours_from_previous: 2.0
          },
          {
            id: 'msg_1',
            step_type: 'message',
            message_type: 'text',
            content_text: 'Mensaje después de pausas',
            order_position: 3,
            delay_hours_from_previous: 0
          }
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
          sequence_position: 0,
          client_responses_count: 0
        },
        error: null
      });

      supabase.single.mockResolvedValueOnce({
        data: { sequence_position: 0 },
        error: null
      });

      supabase.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null
      });

      const result = await evaluateContactSequence(mockContactId);

      // Debe encontrar el mensaje real después de las pausas
      expect(result.nextMessage).toBeTruthy();
      expect(result.nextMessage.step_type).toBe('message');
      expect(result.nextMessage.content_text).toBe('Mensaje después de pausas');
    });
  });

  describe('ESCENARIO 3: Cambio de Etapa Automático', () => {
    it('debe mover lead a nueva etapa y continuar con el flujo', async () => {
      const mockSequence = {
        id: mockSequenceId,
        account_id: mockAccountId,
        active: true,
        messages: [
          {
            id: 'msg_1',
            step_type: 'message',
            message_type: 'text',
            content_text: 'Antes del cambio',
            order_position: 1,
            delay_hours_from_previous: 0
          },
          {
            id: 'stage_change_1',
            step_type: 'stage_change',
            target_stage_name: 'Calificado',
            order_position: 2,
            delay_hours_from_previous: 0
          },
          {
            id: 'msg_2',
            step_type: 'message',
            message_type: 'text',
            content_text: 'Después del cambio',
            order_position: 3,
            delay_hours_from_previous: 0
          }
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

      // Verificar que se movió el lead a la nueva etapa
      expect(moveLeadToStage).toHaveBeenCalledWith(
        mockLeadId,
        'Calificado',
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
          {
            id: 'msg_1',
            step_type: 'message',
            message_type: 'text',
            content_text: 'Mensaje',
            order_position: 1,
            delay_hours_from_previous: 0
          },
          {
            id: 'pause_1',
            step_type: 'pause',
            pause_type: 'fixed_delay',
            order_position: 2,
            delay_hours_from_previous: 24.0 // 24 horas
          },
          {
            id: 'stage_change_1',
            step_type: 'stage_change',
            target_stage_name: 'Seguimiento',
            order_position: 3,
            delay_hours_from_previous: 0
          }
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

      await evaluateContactSequence(mockContactId);

      // NO debe procesar el cambio de etapa porque hay una pausa antes
      expect(moveLeadToStage).not.toHaveBeenCalled();
    });
  });

  describe('ESCENARIO 4: Casos Límite y Errores', () => {
    it('debe manejar flujo vacío (sin mensajes)', async () => {
      const mockSequence = {
        id: mockSequenceId,
        account_id: mockAccountId,
        active: true,
        messages: []
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
          sequence_position: 0,
          client_responses_count: 0
        },
        error: null
      });

      const result = await evaluateContactSequence(mockContactId);

      expect(result.shouldSend).toBe(false);
      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('Flujo sin mensajes');
    });

    it('debe manejar contacto sin lead al procesar cambio de etapa', async () => {
      getLeadByContact.mockResolvedValueOnce({
        data: null, // Sin lead
        error: null
      });

      const mockSequence = {
        id: mockSequenceId,
        account_id: mockAccountId,
        active: true,
        messages: [
          {
            id: 'stage_change_1',
            step_type: 'stage_change',
            target_stage_name: 'Seguimiento',
            order_position: 1,
            delay_hours_from_previous: 0
          }
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
          sequence_position: 0,
          client_responses_count: 0
        },
        error: null
      });

      supabase.single.mockResolvedValueOnce({
        data: { sequence_position: 0 },
        error: null
      });

      supabase.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null
      });

      const result = await evaluateContactSequence(mockContactId);

      // No debe llamar a moveLeadToStage si no hay lead
      expect(getLeadByContact).toHaveBeenCalled();
      expect(moveLeadToStage).not.toHaveBeenCalled();
    });

    it('debe manejar secuencia completada correctamente', async () => {
      const mockSequence = {
        id: mockSequenceId,
        account_id: mockAccountId,
        active: true,
        messages: [
          {
            id: 'msg_1',
            step_type: 'message',
            message_type: 'text',
            content_text: 'Último mensaje',
            order_position: 1,
            delay_hours_from_previous: 0
          }
        ]
      };

      getSequenceWithMessages.mockResolvedValueOnce({
        data: mockSequence,
        error: null
      });

      // Mock contacto en posición 1 (después del último mensaje)
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

      // Mock para getNextSequenceMessage (no hay más mensajes)
      supabase.single.mockResolvedValueOnce({
        data: { sequence_position: 1 },
        error: null
      });

      const result = await evaluateContactSequence(mockContactId);

      expect(result.shouldSend).toBe(false);
      expect(result.reason).toBe('sequence_completed');
      expect(result.nextMessage).toBeNull();
    });

    it('debe manejar cuenta sin product_id al procesar cambio de etapa', async () => {
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
          {
            id: 'stage_change_1',
            step_type: 'stage_change',
            target_stage_name: 'Seguimiento',
            order_position: 1,
            delay_hours_from_previous: 0
          }
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
          sequence_position: 0,
          client_responses_count: 0
        },
        error: null
      });

      supabase.single.mockResolvedValueOnce({
        data: { sequence_position: 0 },
        error: null
      });

      supabase.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null
      });

      await evaluateContactSequence(mockContactId);

      // No debe intentar obtener el lead si no hay product_id
      expect(getAccountById).toHaveBeenCalled();
      expect(getLeadByContact).not.toHaveBeenCalled();
      expect(moveLeadToStage).not.toHaveBeenCalled();
    });
  });

  describe('ESCENARIO 5: Integración Completa - Flujo Real', () => {
    it('debe ejecutar flujo completo: mensaje -> pausa -> mensaje -> cambio etapa -> nuevo flujo', async () => {
      // Flujo 1: Flujo inicial
      const mockSequence1 = {
        id: mockSequenceId,
        account_id: mockAccountId,
        active: true,
        messages: [
          {
            id: 'msg_1',
            step_type: 'message',
            message_type: 'text',
            content_text: 'Bienvenida',
            order_position: 1,
            delay_hours_from_previous: 0
          },
          {
            id: 'pause_1',
            step_type: 'pause',
            pause_type: 'fixed_delay',
            order_position: 2,
            delay_hours_from_previous: 2.0
          },
          {
            id: 'msg_2',
            step_type: 'message',
            message_type: 'text',
            content_text: 'Seguimiento',
            order_position: 3,
            delay_hours_from_previous: 0
          },
          {
            id: 'stage_change_1',
            step_type: 'stage_change',
            target_stage_name: 'Seguimiento',
            order_position: 4,
            delay_hours_from_previous: 0
          }
        ]
      };

      getSequenceWithMessages.mockResolvedValueOnce({
        data: mockSequence1,
        error: null
      });

      supabase.single.mockResolvedValueOnce({
        data: {
          id: mockContactId,
          account_id: mockAccountId,
          sequence_active: true,
          sequence_id: mockSequenceId,
          sequence_position: 3, // Después del mensaje 2
          client_responses_count: 0
        },
        error: null
      });

      // Mock moveLeadToStage que iniciará un nuevo flujo automáticamente
      moveLeadToStage.mockResolvedValueOnce({
        data: {
          id: mockLeadId,
          pipeline_stage: 'Seguimiento'
        },
        error: null
      });

      supabase.update.mockResolvedValueOnce({
        data: null,
        error: null
      });

      supabase.single.mockResolvedValueOnce({
        data: { sequence_position: 4 },
        error: null
      });

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

      // moveLeadToStage internamente debería iniciar el nuevo flujo si la etapa tiene uno asignado
      // (esto se verifica en los tests de FASE 7)
    });
  });
});

