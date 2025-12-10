/**
 * Tests para FASE 2: Interrupción de Pausas por Palabras Clave
 * 
 * Pruebas de la lógica de interrupción de pausas fixed_delay cuando
 * el cliente envía mensajes con palabras clave.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock del módulo supabaseClient
vi.mock('../../src/supabaseClient.js', () => {
  const mockSupabase = {
    from: vi.fn(() => mockSupabase),
    select: vi.fn(() => mockSupabase),
    eq: vi.fn(() => mockSupabase),
    gt: vi.fn(() => mockSupabase),
    order: vi.fn(() => mockSupabase),
    limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
    maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
    single: vi.fn(() => Promise.resolve({ data: null, error: null })),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null }))
  };
  
  return {
    supabase: mockSupabase
  };
});

// Importar después de los mocks
import { supabase } from '../../src/supabaseClient.js';
import { shouldSendNextMessage } from '../../src/services/whatsapp/sequence-engine.js';

describe('FASE 2: Interrupción de Pausas por Palabras Clave', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock de Date.now() para controlar tiempo
    vi.useFakeTimers();
    
    // Resetear mocks de Supabase - cada método debe retornar el objeto para encadenamiento
    // excepto el último método que retorna una promesa
    supabase.from.mockReturnValue(supabase);
    supabase.select.mockReturnValue(supabase);
    supabase.eq.mockReturnValue(supabase);
    supabase.gt.mockReturnValue(supabase);
    supabase.order.mockReturnValue(supabase);
    supabase.limit.mockReturnValue(supabase); // Retorna supabase para permitir encadenar con maybeSingle
    supabase.maybeSingle.mockResolvedValue({ data: null, error: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('shouldSendNextMessage - Pausa con interrupción por keywords', () => {
    it('debe interrumpir pausa cuando cliente envía mensaje con keywords (sin delay después)', async () => {
      const contactId = 'contact-1';
      const lastMessageTime = new Date('2024-01-01T10:00:00Z');
      const now = new Date('2024-01-01T11:00:00Z'); // 1 hora después
      vi.setSystemTime(now);

      const nextMessage = {
        id: 'msg-1',
        step_type: 'pause',
        pause_type: 'fixed_delay',
        delay_hours_from_previous: 24, // 24 horas de pausa
        pause_interrupt_keywords: {
          keywords: ['si', 'acepto'],
          match_type: 'any'
        },
        pause_delay_after_interrupt: null // Sin delay después
      };

      const contact = {
        id: contactId,
        sequence_position: 5,
        sequence_started_at: '2024-01-01T08:00:00Z'
      };

      // Configurar mocks para las dos consultas:
      // 1. shouldSendNextMessage busca último mensaje enviado (.maybeSingle())
      // 2. checkMessageKeywords busca mensajes del cliente (.limit() como última llamada)
      
      // Mock 1: Último mensaje enviado (maybeSingle retorna promesa)
      supabase.maybeSingle
        .mockResolvedValueOnce({
          data: { timestamp: lastMessageTime.toISOString(), sequence_message_id: 5 },
          error: null
        });

      // Mock 2: checkMessageKeywords hace .limit(1) como última llamada
      // Necesitamos que limit() retorne una promesa cuando es la última llamada
      // Crear un objeto mock intermedio que retorne la promesa en limit()
      const checkKeywordsChain = {
        from: vi.fn(() => checkKeywordsChain),
        select: vi.fn(() => checkKeywordsChain),
        eq: vi.fn(() => checkKeywordsChain),
        gt: vi.fn(() => checkKeywordsChain),
        order: vi.fn(() => checkKeywordsChain),
        limit: vi.fn(() => Promise.resolve({
          data: [
            {
              text_content: 'si, me interesa',
              timestamp: '2024-01-01T10:30:00Z'
            }
          ],
          error: null
        }))
      };
      
      // Hacer que la segunda llamada a from() retorne el chain especial
      let callCount = 0;
      supabase.from.mockImplementation((table) => {
        callCount++;
        if (callCount === 2) {
          return checkKeywordsChain;
        }
        return supabase;
      });

      const result = await shouldSendNextMessage(contactId, nextMessage, contact, 0);

      expect(result.shouldSend).toBe(true);
      expect(result.reason).toBe('interrupted_by_keywords');
      expect(result.timeUntilSend).toBe(0);
    });

    it('debe interrumpir pausa y aplicar delay después de interrupción', async () => {
      const contactId = 'contact-1';
      const lastMessageTime = new Date('2024-01-01T10:00:00Z');
      const interruptTime = new Date('2024-01-01T10:30:00Z'); // Mensaje a las 10:30
      const now = new Date('2024-01-01T11:00:00Z'); // 30 minutos después del mensaje
      vi.setSystemTime(now);

      const nextMessage = {
        id: 'msg-1',
        step_type: 'pause',
        pause_type: 'fixed_delay',
        delay_hours_from_previous: 24,
        pause_interrupt_keywords: {
          keywords: ['si'],
          match_type: 'any'
        },
        pause_delay_after_interrupt: 1.0 // 1 hora después de interrupción
      };

      const contact = {
        id: contactId,
        sequence_position: 5,
        sequence_started_at: '2024-01-01T08:00:00Z'
      };

      // Mock: Último mensaje enviado
      supabase.maybeSingle.mockResolvedValueOnce({
        data: { timestamp: lastMessageTime.toISOString() },
        error: null
      });

      // Mock: Buscar mensajes del cliente (para checkMessageKeywords)
      supabase.limit.mockResolvedValueOnce({
        data: [
          {
            text_content: 'si, me interesa',
            timestamp: interruptTime.toISOString()
          }
        ],
        error: null
      });

      // Mock: Obtener último mensaje del cliente (para getLastClientMessageAfter)
      supabase.limit.mockResolvedValueOnce({
        data: [
          {
            text_content: 'si, me interesa',
            timestamp: interruptTime.toISOString()
          }
        ],
        error: null
      });

      const result = await shouldSendNextMessage(contactId, nextMessage, contact, 0);

      expect(result.shouldSend).toBe(false);
      expect(result.reason).toBe('waiting_delay_after_interrupt');
      expect(result.timeUntilSend).toBeCloseTo(30, 0); // 30 minutos restantes (1 hora - 30 min)
    });

    it('debe enviar inmediatamente después de que pase el delay de interrupción', async () => {
      const contactId = 'contact-1';
      const lastMessageTime = new Date('2024-01-01T10:00:00Z');
      const interruptTime = new Date('2024-01-01T10:30:00Z');
      const now = new Date('2024-01-01T11:30:00Z'); // 1 hora después del mensaje (delay cumplido)
      vi.setSystemTime(now);

      const nextMessage = {
        id: 'msg-1',
        step_type: 'pause',
        pause_type: 'fixed_delay',
        delay_hours_from_previous: 24,
        pause_interrupt_keywords: {
          keywords: ['si'],
          match_type: 'any'
        },
        pause_delay_after_interrupt: 1.0
      };

      const contact = {
        id: contactId,
        sequence_position: 5,
        sequence_started_at: '2024-01-01T08:00:00Z'
      };

      // Mock: Último mensaje enviado
      supabase.maybeSingle.mockResolvedValueOnce({
        data: { timestamp: lastMessageTime.toISOString() },
        error: null
      });

      // Mock: Buscar mensajes del cliente (para checkMessageKeywords)
      supabase.limit.mockResolvedValueOnce({
        data: [
          {
            text_content: 'si, me interesa',
            timestamp: interruptTime.toISOString()
          }
        ],
        error: null
      });

      // Mock: Obtener último mensaje del cliente (para getLastClientMessageAfter)
      supabase.limit.mockResolvedValueOnce({
        data: [
          {
            text_content: 'si, me interesa',
            timestamp: interruptTime.toISOString()
          }
        ],
        error: null
      });

      const result = await shouldSendNextMessage(contactId, nextMessage, contact, 0);

      expect(result.shouldSend).toBe(true);
      expect(result.reason).toBe('interrupted_and_delay_passed');
      expect(result.timeUntilSend).toBe(0);
    });

    it('debe continuar esperando si no hay mensaje con keywords (comportamiento normal)', async () => {
      const contactId = 'contact-1';
      const lastMessageTime = new Date('2024-01-01T10:00:00Z');
      const now = new Date('2024-01-01T11:00:00Z'); // Solo 1 hora, faltan 23 horas
      vi.setSystemTime(now);

      const nextMessage = {
        id: 'msg-1',
        step_type: 'pause',
        pause_type: 'fixed_delay',
        delay_hours_from_previous: 24,
        pause_interrupt_keywords: {
          keywords: ['si', 'acepto'],
          match_type: 'any'
        },
        pause_delay_after_interrupt: null
      };

      const contact = {
        id: contactId,
        sequence_position: 5,
        sequence_started_at: '2024-01-01T08:00:00Z'
      };

      // Mock: Último mensaje enviado
      supabase.maybeSingle.mockResolvedValueOnce({
        data: { timestamp: lastMessageTime.toISOString() },
        error: null
      });

      // Mock: No hay mensajes del cliente con keywords
      supabase.limit.mockResolvedValueOnce({
        data: [], // Sin mensajes
        error: null
      });

      const result = await shouldSendNextMessage(contactId, nextMessage, contact, 0);

      expect(result.shouldSend).toBe(false);
      expect(result.reason).toBe('waiting_delay');
      expect(result.timeUntilSend).toBeCloseTo(23 * 60, 0); // 23 horas = 1380 minutos
    });

    it('debe funcionar igual que antes si no tiene pause_interrupt_keywords', async () => {
      const contactId = 'contact-1';
      const lastMessageTime = new Date('2024-01-01T10:00:00Z');
      const now = new Date('2024-01-01T11:00:00Z');
      vi.setSystemTime(now);

      const nextMessage = {
        id: 'msg-1',
        step_type: 'pause',
        pause_type: 'fixed_delay',
        delay_hours_from_previous: 24,
        pause_interrupt_keywords: null, // Sin interrupción
        pause_delay_after_interrupt: null
      };

      const contact = {
        id: contactId,
        sequence_position: 5,
        sequence_started_at: '2024-01-01T08:00:00Z'
      };

      // Mock: Último mensaje enviado
      supabase.maybeSingle.mockResolvedValueOnce({
        data: { timestamp: lastMessageTime.toISOString() },
        error: null
      });

      const result = await shouldSendNextMessage(contactId, nextMessage, contact, 0);

      expect(result.shouldSend).toBe(false);
      expect(result.reason).toBe('waiting_delay');
      expect(result.timeUntilSend).toBeCloseTo(23 * 60, 0);
    });
  });
});

