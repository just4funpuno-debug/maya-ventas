/**
 * Tests para FASE 6: Flujos Flexibles - Suma de Pausas Consecutivas
 * 
 * Ejecutar con: npm test -- tests/whatsapp/fase6-consecutive-pauses.test.js
 * O con Vitest: npx vitest tests/whatsapp/fase6-consecutive-pauses.test.js
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getNextSequenceMessage,
  shouldSendNextMessage,
  evaluateContactSequence
} from '../../src/services/whatsapp/sequence-engine';
import { getSequenceWithMessages } from '../../src/services/whatsapp/sequences';

// Mock del módulo supabaseClient
vi.mock('../../src/supabaseClient', () => {
  const mockSupabase = {
    from: vi.fn(() => mockSupabase),
    select: vi.fn(() => mockSupabase),
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

// Mock de getSequenceWithMessages
vi.mock('../../src/services/whatsapp/sequences', async () => {
  const actual = await vi.importActual('../../src/services/whatsapp/sequences');
  return {
    ...actual,
    getSequenceWithMessages: vi.fn()
  };
});

import { supabase } from '../../src/supabaseClient';

describe('FASE 6: Flujos Flexibles - Suma de Pausas Consecutivas', () => {
  const mockContactId = 'contact_123';
  const mockSequenceId = 'sequence_123';

  beforeEach(() => {
    vi.clearAllMocks();
    supabase.from.mockReturnValue(supabase);
    supabase.select.mockReturnValue(supabase);
    supabase.eq.mockReturnValue(supabase);
    supabase.order.mockReturnValue(supabase);
    supabase.limit.mockReturnValue(supabase);
    supabase.maybeSingle.mockResolvedValue({ data: null, error: null });
  });

  describe('SUBFASE 6.1: getNextRealMessageWithPauseDelay - Suma de Pausas Consecutivas', () => {
    it('debe sumar delays de pausas consecutivas (1h + 2h = 3h)', () => {
      // Importar la función helper directamente (si es posible)
      // O probarla indirectamente a través de getNextSequenceMessage
      
      const sortedMessages = [
        { id: 'msg_1', step_type: 'message', order_position: 1, delay_hours_from_previous: 0 },
        { id: 'pause_1', step_type: 'pause', pause_type: 'fixed_delay', order_position: 2, delay_hours_from_previous: 1.0 },
        { id: 'pause_2', step_type: 'pause', pause_type: 'fixed_delay', order_position: 3, delay_hours_from_previous: 2.0 },
        { id: 'msg_2', step_type: 'message', order_position: 4, delay_hours_from_previous: 0 }
      ];

      const currentPosition = 1; // Después de Mensaje 1

      // Simular la lógica de getNextRealMessageWithPauseDelay
      let accumulatedDelay = 0;
      let foundMessage = null;

      for (const msg of sortedMessages) {
        const msgPos = msg.order_position || 0;
        if (msgPos <= currentPosition) continue;

        const stepType = msg.step_type || 'message';

        if (stepType === 'pause' && msg.pause_type === 'fixed_delay') {
          accumulatedDelay += msg.delay_hours_from_previous || 0;
          continue;
        }

        if (stepType === 'stage_change') {
          continue;
        }

        foundMessage = msg;
        break;
      }

      expect(foundMessage).toBeTruthy();
      expect(foundMessage.id).toBe('msg_2');
      expect(accumulatedDelay).toBe(3.0); // 1h + 2h = 3h
    });

    it('debe NO sumar pausas intercaladas con mensajes', () => {
      const sortedMessages = [
        { id: 'msg_1', step_type: 'message', order_position: 1 },
        { id: 'pause_1', step_type: 'pause', pause_type: 'fixed_delay', order_position: 2, delay_hours_from_previous: 1.0 },
        { id: 'msg_2', step_type: 'message', order_position: 3, delay_hours_from_previous: 0 },
        { id: 'pause_2', step_type: 'pause', pause_type: 'fixed_delay', order_position: 4, delay_hours_from_previous: 2.0 },
        { id: 'msg_3', step_type: 'message', order_position: 5, delay_hours_from_previous: 0 }
      ];

      // Test: Desde posición 1, buscar Mensaje 2 (debe tener delay de solo Pausa 1)
      let accumulatedDelay = 0;
      let foundMessage = null;
      const currentPosition = 1;

      for (const msg of sortedMessages) {
        const msgPos = msg.order_position || 0;
        if (msgPos <= currentPosition) continue;

        const stepType = msg.step_type || 'message';

        if (stepType === 'pause' && msg.pause_type === 'fixed_delay') {
          accumulatedDelay += msg.delay_hours_from_previous || 0;
          continue;
        }

        if (stepType === 'stage_change') {
          continue;
        }

        foundMessage = msg;
        break;
      }

      expect(foundMessage.id).toBe('msg_2');
      expect(accumulatedDelay).toBe(1.0); // Solo Pausa 1, no Pausa 2

      // Test: Desde posición 3, buscar Mensaje 3 (debe tener delay de solo Pausa 2)
      accumulatedDelay = 0;
      foundMessage = null;
      const currentPosition2 = 3;

      for (const msg of sortedMessages) {
        const msgPos = msg.order_position || 0;
        if (msgPos <= currentPosition2) continue;

        const stepType = msg.step_type || 'message';

        if (stepType === 'pause' && msg.pause_type === 'fixed_delay') {
          accumulatedDelay += msg.delay_hours_from_previous || 0;
          continue;
        }

        if (stepType === 'stage_change') {
          continue;
        }

        foundMessage = msg;
        break;
      }

      expect(foundMessage.id).toBe('msg_3');
      expect(accumulatedDelay).toBe(2.0); // Solo Pausa 2
    });

    it('debe NO sumar pausas de tipo until_message o until_days_without_response', () => {
      const sortedMessages = [
        { id: 'msg_1', step_type: 'message', order_position: 1 },
        { id: 'pause_1', step_type: 'pause', pause_type: 'fixed_delay', order_position: 2, delay_hours_from_previous: 1.0 },
        { id: 'pause_2', step_type: 'pause', pause_type: 'until_message', order_position: 3, delay_hours_from_previous: 0 },
        { id: 'msg_2', step_type: 'message', order_position: 4 }
      ];

      let accumulatedDelay = 0;
      let foundMessage = null;
      const currentPosition = 1;

      for (const msg of sortedMessages) {
        const msgPos = msg.order_position || 0;
        if (msgPos <= currentPosition) continue;

        const stepType = msg.step_type || 'message';

        // Solo sumar fixed_delay - las demás pausas se saltan pero no se suman
        if (stepType === 'pause' && msg.pause_type === 'fixed_delay') {
          accumulatedDelay += msg.delay_hours_from_previous || 0;
          continue; // Continuar sin romper el loop
        }

        // Las pausas until_message también se saltan
        if (stepType === 'pause' && msg.pause_type !== 'fixed_delay') {
          continue; // Saltar pero no sumar delay
        }

        if (stepType === 'stage_change') {
          continue;
        }

        // Si llegamos aquí y es un mensaje, lo encontramos
        if (stepType === 'message') {
          foundMessage = msg;
          break;
        }
      }

      expect(foundMessage).toBeTruthy();
      expect(foundMessage.id).toBe('msg_2');
      expect(accumulatedDelay).toBe(1.0); // Solo Pausa 1 (fixed_delay), no Pausa 2 (until_message)
    });

    it('debe saltar cambios de etapa sin afectar el delay', () => {
      const sortedMessages = [
        { id: 'msg_1', step_type: 'message', order_position: 1 },
        { id: 'pause_1', step_type: 'pause', pause_type: 'fixed_delay', order_position: 2, delay_hours_from_previous: 1.0 },
        { id: 'stage_change_1', step_type: 'stage_change', order_position: 3, target_stage_name: 'Seguimiento' },
        { id: 'pause_2', step_type: 'pause', pause_type: 'fixed_delay', order_position: 4, delay_hours_from_previous: 2.0 },
        { id: 'msg_2', step_type: 'message', order_position: 5 }
      ];

      let accumulatedDelay = 0;
      let foundMessage = null;
      const currentPosition = 1;

      for (const msg of sortedMessages) {
        const msgPos = msg.order_position || 0;
        if (msgPos <= currentPosition) continue;

        const stepType = msg.step_type || 'message';

        if (stepType === 'pause' && msg.pause_type === 'fixed_delay') {
          accumulatedDelay += msg.delay_hours_from_previous || 0;
          continue;
        }

        if (stepType === 'stage_change') {
          continue; // Saltar pero no afectar delay
        }

        foundMessage = msg;
        break;
      }

      expect(foundMessage.id).toBe('msg_2');
      expect(accumulatedDelay).toBe(3.0); // 1h + 2h = 3h (el cambio de etapa no afecta)
    });
  });

  describe('SUBFASE 6.2: Integración - getNextSequenceMessage con Pausas Consecutivas', () => {
    it('debe retornar accumulatedPauseDelay cuando hay pausas consecutivas', async () => {
      const mockSequence = {
        id: mockSequenceId,
        account_id: 'account_123',
        name: 'Test Sequence',
        active: true,
        messages: [
          { id: 'msg_1', step_type: 'message', order_position: 1, delay_hours_from_previous: 0 },
          { id: 'pause_1', step_type: 'pause', pause_type: 'fixed_delay', order_position: 2, delay_hours_from_previous: 1.0 },
          { id: 'pause_2', step_type: 'pause', pause_type: 'fixed_delay', order_position: 3, delay_hours_from_previous: 2.0 },
          { id: 'msg_2', step_type: 'message', order_position: 4, delay_hours_from_previous: 0 }
        ]
      };

      // Mock contacto con posición actual = 1
      supabase.single.mockResolvedValueOnce({
        data: { sequence_position: 1 },
        error: null
      });

      const result = await getNextSequenceMessage(mockContactId, mockSequence);

      expect(result.message).toBeTruthy();
      expect(result.message.id).toBe('msg_2');
      expect(result.accumulatedPauseDelay).toBe(3.0); // 1h + 2h = 3h
      expect(result.position).toBe(4);
    });

    it('debe retornar accumulatedPauseDelay = 0 cuando no hay pausas consecutivas', async () => {
      const mockSequence = {
        id: mockSequenceId,
        account_id: 'account_123',
        name: 'Test Sequence',
        active: true,
        messages: [
          { id: 'msg_1', step_type: 'message', order_position: 1, delay_hours_from_previous: 0 },
          { id: 'msg_2', step_type: 'message', order_position: 2, delay_hours_from_previous: 24 }
        ]
      };

      supabase.single.mockResolvedValueOnce({
        data: { sequence_position: 1 },
        error: null
      });

      const result = await getNextSequenceMessage(mockContactId, mockSequence);

      expect(result.message).toBeTruthy();
      expect(result.message.id).toBe('msg_2');
      expect(result.accumulatedPauseDelay).toBe(0); // No hay pausas consecutivas
    });
  });

  describe('SUBFASE 6.3: Integración - shouldSendNextMessage con Delay Acumulado', () => {
    it('debe considerar delay acumulado al calcular si enviar mensaje', async () => {
      const mockMessage = {
        id: 'msg_2',
        step_type: 'message',
        delay_hours_from_previous: 0, // El mensaje no tiene delay propio
        pause_type: 'fixed_delay'
      };

      const mockContact = {
        id: mockContactId,
        sequence_position: 1,
        sequence_started_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() // Hace 4 horas
      };

      // Mock último mensaje enviado hace 2.9 horas (menos que el delay requerido de 3h)
      const lastMessageTime = new Date(Date.now() - 2.9 * 60 * 60 * 1000);
      supabase.maybeSingle.mockResolvedValueOnce({
        data: { timestamp: lastMessageTime.toISOString(), sequence_message_id: 1 },
        error: null
      });

      // accumulatedPauseDelay = 3 horas (1h + 2h de pausas consecutivas)
      const accumulatedPauseDelay = 3.0;

      const result = await shouldSendNextMessage(mockContactId, mockMessage, mockContact, accumulatedPauseDelay);

      // Debería esperar: 2.9 horas desde último mensaje, necesita 3 horas total
      // Hace 2.9 horas < 3 horas requeridas = false (debe esperar)
      expect(result.shouldSend).toBe(false);
      expect(result.reason).toBe('waiting_delay');
      // El tiempo restante debería ser cercano a 0 (ya casi se cumplieron las 3 horas)
    });

    it('debe enviar mensaje cuando delay acumulado ya se cumplió', async () => {
      const mockMessage = {
        id: 'msg_2',
        step_type: 'message',
        delay_hours_from_previous: 0,
        pause_type: 'fixed_delay'
      };

      const mockContact = {
        id: mockContactId,
        sequence_position: 1,
        sequence_started_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() // Hace 5 horas
      };

      // Mock último mensaje enviado hace 4 horas (más del delay acumulado de 3h)
      const lastMessageTime = new Date(Date.now() - 4 * 60 * 60 * 1000);
      // Configurar la cadena completa para maybeSingle
      supabase.order = vi.fn(() => supabase);
      supabase.limit = vi.fn(() => supabase);
      supabase.maybeSingle.mockResolvedValueOnce({
        data: { timestamp: lastMessageTime.toISOString(), sequence_message_id: 1 },
        error: null
      });

      const accumulatedPauseDelay = 3.0; // 3 horas de pausas consecutivas

      const result = await shouldSendNextMessage(mockContactId, mockMessage, mockContact, accumulatedPauseDelay);

      // Hace 4 horas >= 3 horas requeridas = true (debe enviar)
      expect(result.shouldSend).toBe(true);
      expect(result.reason).toBe('ready');
    });

    it('debe sumar delay del mensaje + delay acumulado de pausas', async () => {
      const mockMessage = {
        id: 'msg_2',
        step_type: 'message',
        delay_hours_from_previous: 1.0, // El mensaje tiene 1h de delay propio
        pause_type: 'fixed_delay'
      };

      const mockContact = {
        id: mockContactId,
        sequence_position: 1
      };

      // Configurar la cadena completa para maybeSingle
      supabase.order = vi.fn(() => supabase);
      supabase.limit = vi.fn(() => supabase);
      supabase.maybeSingle.mockResolvedValueOnce({
        data: null, // No hay último mensaje
        error: null
      });

      const accumulatedPauseDelay = 2.0; // 2 horas de pausas consecutivas

      const result = await shouldSendNextMessage(mockContactId, mockMessage, mockContact, accumulatedPauseDelay);

      // Delay total = 1h (mensaje) + 2h (pausas) = 3h
      expect(result.shouldSend).toBe(false);
      expect(result.reason).toBe('waiting_delay');
      expect(result.timeUntilSend).toBe(3.0 * 60); // 3 horas en minutos
    });
  });

  describe('SUBFASE 6.4: Casos Especiales', () => {
    it('debe manejar múltiples pausas consecutivas (3 o más)', () => {
      const sortedMessages = [
        { id: 'msg_1', step_type: 'message', order_position: 1 },
        { id: 'pause_1', step_type: 'pause', pause_type: 'fixed_delay', order_position: 2, delay_hours_from_previous: 1.0 },
        { id: 'pause_2', step_type: 'pause', pause_type: 'fixed_delay', order_position: 3, delay_hours_from_previous: 2.0 },
        { id: 'pause_3', step_type: 'pause', pause_type: 'fixed_delay', order_position: 4, delay_hours_from_previous: 1.5 },
        { id: 'msg_2', step_type: 'message', order_position: 5 }
      ];

      let accumulatedDelay = 0;
      let foundMessage = null;
      const currentPosition = 1;

      for (const msg of sortedMessages) {
        const msgPos = msg.order_position || 0;
        if (msgPos <= currentPosition) continue;

        const stepType = msg.step_type || 'message';

        if (stepType === 'pause' && msg.pause_type === 'fixed_delay') {
          accumulatedDelay += msg.delay_hours_from_previous || 0;
          continue;
        }

        if (stepType === 'stage_change') {
          continue;
        }

        foundMessage = msg;
        break;
      }

      expect(foundMessage.id).toBe('msg_2');
      expect(accumulatedDelay).toBe(4.5); // 1h + 2h + 1.5h = 4.5h
    });

    it('debe retornar delay 0 cuando no hay pausas antes del siguiente mensaje', () => {
      const sortedMessages = [
        { id: 'msg_1', step_type: 'message', order_position: 1 },
        { id: 'msg_2', step_type: 'message', order_position: 2 }
      ];

      let accumulatedDelay = 0;
      let foundMessage = null;
      const currentPosition = 1;

      for (const msg of sortedMessages) {
        const msgPos = msg.order_position || 0;
        if (msgPos <= currentPosition) continue;

        const stepType = msg.step_type || 'message';

        if (stepType === 'pause' && msg.pause_type === 'fixed_delay') {
          accumulatedDelay += msg.delay_hours_from_previous || 0;
          continue;
        }

        if (stepType === 'stage_change') {
          continue;
        }

        foundMessage = msg;
        break;
      }

      expect(foundMessage.id).toBe('msg_2');
      expect(accumulatedDelay).toBe(0); // No hay pausas
    });
  });
});

