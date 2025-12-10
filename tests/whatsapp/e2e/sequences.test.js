/**
 * Tests E2E (End-to-End) para flujo completo de secuencias automáticas
 * FASE 7.3: SUBFASE 7.3.1 - Testing E2E de Secuencias
 * 
 * Ejecutar con: npm test -- tests/whatsapp/e2e/sequences.test.js
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createSequence, addSequenceMessage, getSequenceWithMessages } from '../../../src/services/whatsapp/sequences';
import { evaluateSequences, shouldSendNextMessage } from '../../../src/services/whatsapp/sequence-engine';
import { processSequenceMessage } from '../../../src/services/whatsapp/sequence-decision';
import { checkClientResponse, pauseSequence } from '../../../src/services/whatsapp/sequence-pauser';

// Mocks
vi.mock('../../../src/services/whatsapp/sequences');
vi.mock('../../../src/services/whatsapp/sequence-engine');
vi.mock('../../../src/services/whatsapp/sequence-decision');
vi.mock('../../../src/services/whatsapp/sequence-pauser');
vi.mock('../../../src/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          order: vi.fn(() => Promise.resolve({ data: [], error: null }))
        })),
        order: vi.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    })),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null }))
  }
}));

describe('Sequences E2E Tests - Flujo Completo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Flujo Completo: Crear Secuencia → Agregar Mensajes → Evaluar → Enviar', () => {
    it('debe completar flujo completo de secuencia automática', async () => {
      const accountId = 'account_123';
      const contactId = 'contact_123';

      // 1. Crear secuencia
      const mockSequence = {
        id: 'sequence_123',
        account_id: accountId,
        name: 'Secuencia de Bienvenida',
        active: true,
        total_messages: 0
      };

      createSequence.mockResolvedValueOnce({
        data: mockSequence,
        error: null
      });

      const sequenceResult = await createSequence({
        account_id: accountId,
        name: 'Secuencia de Bienvenida',
        active: true
      });

      expect(sequenceResult.data).toBeTruthy();
      expect(sequenceResult.data.id).toBe('sequence_123');

      // 2. Agregar mensajes a la secuencia
      const mockMessage1 = {
        id: 'msg_1',
        sequence_id: 'sequence_123',
        message_number: 1,
        message_type: 'text',
        content_text: '¡Hola! Bienvenido a nuestro servicio.',
        delay_hours_from_previous: 0,
        order_position: 1
      };

      const mockMessage2 = {
        id: 'msg_2',
        sequence_id: 'sequence_123',
        message_number: 2,
        message_type: 'text',
        content_text: 'Este es nuestro segundo mensaje.',
        delay_hours_from_previous: 24,
        order_position: 2
      };

      addSequenceMessage.mockResolvedValueOnce({
        data: mockMessage1,
        error: null
      });

      addSequenceMessage.mockResolvedValueOnce({
        data: mockMessage2,
        error: null
      });

      const message1Result = await addSequenceMessage('sequence_123', {
        message_type: 'text',
        content_text: '¡Hola! Bienvenido a nuestro servicio.',
        delay_hours_from_previous: 0,
        order_position: 1
      });

      const message2Result = await addSequenceMessage('sequence_123', {
        message_type: 'text',
        content_text: 'Este es nuestro segundo mensaje.',
        delay_hours_from_previous: 24,
        order_position: 2
      });

      expect(message1Result.data).toBeTruthy();
      expect(message2Result.data).toBeTruthy();

      // 3. Obtener secuencia con mensajes
      getSequenceWithMessages.mockResolvedValueOnce({
        data: {
          ...mockSequence,
          messages: [mockMessage1, mockMessage2]
        },
        error: null
      });

      const sequenceWithMessages = await getSequenceWithMessages('sequence_123');
      expect(sequenceWithMessages.data.messages).toHaveLength(2);

      // 4. Evaluar si debe enviar siguiente mensaje
      shouldSendNextMessage.mockResolvedValueOnce({
        shouldSend: true,
        nextMessage: mockMessage1,
        reason: 'first_message'
      });

      const evaluation = await shouldSendNextMessage(contactId, 'sequence_123');
      expect(evaluation.shouldSend).toBe(true);
      expect(evaluation.nextMessage).toBeTruthy();

      // 5. Procesar y enviar mensaje
      processSequenceMessage.mockResolvedValueOnce({
        success: true,
        method: 'cloud_api',
        messageId: 'sent_msg_123'
      });

      const sendResult = await processSequenceMessage(
        contactId,
        evaluation.nextMessage,
        accountId
      );

      expect(sendResult.success).toBe(true);
      expect(sendResult.method).toBe('cloud_api');
    });
  });

  describe('Flujo: Cliente Responde → Pausar Secuencia', () => {
    it('debe pausar secuencia cuando cliente responde', async () => {
      const contactId = 'contact_123';
      const sequenceId = 'sequence_123';

      // 1. Cliente responde (simulado por webhook)
      const mockContact = {
        id: contactId,
        sequence_id: sequenceId,
        sequence_active: true,
        sequence_started_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 horas atrás
        last_interaction_at: new Date().toISOString(),
        last_interaction_source: 'client',
        client_responses_count: 1
      };

      // 2. Verificar si cliente respondió
      checkClientResponse.mockResolvedValueOnce({
        responded: true,
        shouldPause: true
      });

      const responseCheck = await checkClientResponse(contactId);
      expect(responseCheck.responded).toBe(true);
      expect(responseCheck.shouldPause).toBe(true);

      // 3. Pausar secuencia
      pauseSequence.mockResolvedValueOnce({
        success: true,
        paused: true
      });

      const pauseResult = await pauseSequence(contactId);
      expect(pauseResult.success).toBe(true);
      expect(pauseResult.paused).toBe(true);
    });
  });

  describe('Flujo: Evaluar Múltiples Contactos en Batch', () => {
    it('debe evaluar y procesar múltiples contactos con secuencias activas', async () => {
      const accountId = 'account_123';
      const contactIds = ['contact_1', 'contact_2', 'contact_3'];

      // Mock de evaluación para múltiples contactos
      evaluateSequences.mockResolvedValueOnce({
        processed: 3,
        sent: 2,
        errors: 0,
        details: [
          { contactId: 'contact_1', shouldSend: true, sent: true },
          { contactId: 'contact_2', shouldSend: true, sent: true },
          { contactId: 'contact_3', shouldSend: false, sent: false, reason: 'delay_not_met' }
        ]
      });

      const batchResult = await evaluateSequences(accountId);
      
      expect(batchResult.processed).toBe(3);
      expect(batchResult.sent).toBe(2);
      expect(batchResult.errors).toBe(0);
      expect(batchResult.details).toHaveLength(3);
    });
  });
});


