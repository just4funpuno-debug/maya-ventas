/**
 * Tests unitarios para el servicio de cola Puppeteer
 * FASE 5: SUBFASE 5.1 - Tests de Puppeteer Queue
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getQueueMessages,
  getQueueStats,
  getQueueLog,
  getBotStatus,
  pauseBot,
  resumeBot,
  removeFromQueue,
  retryMessage,
  subscribeQueue
} from '../../src/services/whatsapp/puppeteer-queue';
import { supabase } from '../../src/supabaseClient';

// Mock del módulo supabaseClient
vi.mock('../../src/supabaseClient', () => {
  const mockSupabase = {
    from: vi.fn(() => mockSupabase),
    select: vi.fn(() => mockSupabase),
    eq: vi.fn(() => mockSupabase), // Para select().eq().single()
    order: vi.fn(() => mockSupabase),
    range: vi.fn(() => mockSupabase), // Retorna supabase para permitir chaining
    limit: vi.fn(() => mockSupabase),
    in: vi.fn(() => mockSupabase),
    single: vi.fn(() => Promise.resolve({ data: null, error: null })),
    update: vi.fn(() => {
      // update() retorna un objeto con eq() que retorna una promesa
      return {
        eq: vi.fn(() => Promise.resolve({ error: null }))
      };
    }),
    insert: vi.fn(() => Promise.resolve({ error: null })),
    delete: vi.fn(() => {
      // delete() retorna un objeto con eq() que retorna una promesa
      return {
        eq: vi.fn(() => Promise.resolve({ error: null }))
      };
    }),
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        subscribe: vi.fn(() => () => {})
      }))
    })),
    removeChannel: vi.fn()
  };
  
  return {
    supabase: mockSupabase
  };
});

describe('Puppeteer Queue Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Configurar from() para siempre retornar supabase (permite chaining)
    supabase.from.mockReturnValue(supabase);
    // Configurar otros métodos de chaining para retornar supabase
    supabase.select.mockReturnValue(supabase);
    supabase.order.mockReturnValue(supabase);
    // update() y delete() retornan objetos con eq() que retornan promesas
    // No sobrescribir estos mocks aquí, se configuran en el mock inicial
    supabase.insert.mockReturnValue(supabase);
    supabase.limit.mockReturnValue(supabase);
    supabase.in.mockReturnValue(supabase);
  });

  describe('getQueueMessages', () => {
    it('debe obtener mensajes de la cola sin filtros', async () => {
      const mockMessages = [
        {
          id: '1',
          status: 'pending',
          priority: 'MEDIUM',
          message_type: 'text',
          whatsapp_contacts: { id: 'c1', name: 'Juan', phone: '+59112345678' }
        }
      ];

      // range() retorna supabase, pero cuando se ejecuta la query (await query), necesita retornar datos
      // Simulamos que la query final retorna los datos
      // Como range() retorna supabase, necesitamos que el último método en la cadena retorne la promesa
      // En este caso, range() es el último, así que necesitamos mockearlo para que retorne una promesa cuando se await
      // Pero el problema es que range() se llama antes de await, así que necesitamos otro enfoque
      // Mejor: hacer que range() retorne un objeto "thenable" que resuelva con los datos
      const thenableRange = {
        then: (resolve) => resolve({ data: mockMessages, error: null })
      };
      supabase.range.mockReturnValueOnce(thenableRange);

      const { data, error } = await getQueueMessages();

      expect(supabase.from).toHaveBeenCalledWith('puppeteer_queue');
      expect(supabase.select).toHaveBeenCalled();
      expect(data).toEqual(mockMessages);
      expect(error).toBeNull();
    });

    it('debe filtrar por status', async () => {
      // range() retorna supabase, pero cuando se llama eq() después, necesita retornar un objeto thenable
      // Crear un objeto que tenga tanto eq() como then()
      const thenableWithEq = {
        eq: vi.fn(() => thenableWithEq), // Permitir más chaining
        then: (resolve) => resolve({ data: [], error: null })
      };
      
      supabase.range.mockReturnValueOnce(supabase); // range() retorna supabase
      supabase.eq.mockReturnValueOnce(thenableWithEq); // eq() después de range() retorna objeto thenable

      await getQueueMessages({ status: 'pending' });

      // Verificar que eq fue llamado con status
      expect(supabase.eq).toHaveBeenCalledWith('status', 'pending');
    });

    it('debe filtrar por búsqueda de contacto', async () => {
      const mockMessages = [
        {
          id: '1',
          status: 'pending',
          whatsapp_contacts: { name: 'Juan Pérez', phone: '+59112345678' }
        },
        {
          id: '2',
          status: 'pending',
          whatsapp_contacts: { name: 'María', phone: '+59187654321' }
        }
      ];

      const thenableRange = {
        then: (resolve) => resolve({ data: mockMessages, error: null })
      };
      supabase.range.mockReturnValueOnce(thenableRange);

      const { data } = await getQueueMessages({ search: 'Juan' });

      expect(data).toHaveLength(1);
      expect(data[0].whatsapp_contacts.name).toContain('Juan');
    });

    it('debe manejar errores correctamente', async () => {
      const mockError = { message: 'Error de conexión' };
      const thenableRange = {
        then: (resolve) => resolve({ data: null, error: mockError })
      };
      supabase.range.mockReturnValueOnce(thenableRange);

      const { data, error } = await getQueueMessages();

      expect(data).toBeNull();
      expect(error).toEqual(mockError);
    });
  });

  describe('getQueueStats', () => {
    it('debe calcular estadísticas de la cola', async () => {
      const mockData = [
        { status: 'pending', priority: 'HIGH', message_type: 'text' },
        { status: 'pending', priority: 'MEDIUM', message_type: 'image' },
        { status: 'sent', priority: 'LOW', message_type: 'text' },
        { status: 'failed', priority: 'HIGH', message_type: 'video' }
      ];

      supabase.select.mockResolvedValueOnce({
        data: mockData,
        error: null
      });

      const { data, error } = await getQueueStats();

      expect(data).toBeDefined();
      expect(data.total).toBe(4);
      expect(data.byStatus.pending).toBe(2);
      expect(data.byStatus.sent).toBe(1);
      expect(data.byStatus.failed).toBe(1);
      expect(data.byPriority.HIGH).toBe(2);
      expect(data.byType.text).toBe(2);
      expect(error).toBeNull();
    });
  });

  describe('getQueueLog', () => {
    it('debe obtener log de últimos envíos', async () => {
      const mockLog = [
        { id: '1', status: 'sent', processed_at: new Date().toISOString() },
        { id: '2', status: 'failed', processed_at: new Date().toISOString() }
      ];

      supabase.limit.mockResolvedValueOnce({
        data: mockLog,
        error: null
      });

      const { data, error } = await getQueueLog({ limit: 100 });

      expect(supabase.in).toHaveBeenCalledWith('status', ['sent', 'failed']);
      expect(data).toEqual(mockLog);
      expect(error).toBeNull();
    });
  });

  describe('getBotStatus', () => {
    it('debe obtener estado del bot', async () => {
      const mockConfig = {
        bot_active: true,
        last_heartbeat: new Date().toISOString()
      };

      supabase.single.mockResolvedValueOnce({
        data: mockConfig,
        error: null
      });

      const { data, error } = await getBotStatus('account1');

      expect(supabase.eq).toHaveBeenCalledWith('account_id', 'account1');
      expect(data.bot_active).toBe(true);
      expect(data.last_heartbeat).toBeDefined();
      expect(error).toBeNull();
    });

    it('debe retornar valores por defecto si no hay configuración', async () => {
      supabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }
      });

      const { data, error } = await getBotStatus('account1');

      expect(data.bot_active).toBe(true);
      expect(data.last_heartbeat).toBeNull();
      expect(error).toBeNull();
    });
  });

  describe('pauseBot', () => {
    it('debe pausar bot si existe configuración', async () => {
      // Primera llamada: verificar si existe (select().eq().single())
      supabase.single.mockResolvedValueOnce({
        data: { id: 'config1' },
        error: null
      });

      // update().eq() retorna una promesa con { error: null }
      // El mock ya está configurado para esto

      const { success, error } = await pauseBot('account1');

      expect(supabase.update).toHaveBeenCalled();
      expect(success).toBe(true);
      expect(error).toBeNull();
    });

    it('debe crear configuración si no existe', async () => {
      supabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }
      });

      supabase.insert.mockResolvedValueOnce({
        error: null
      });

      const { success, error } = await pauseBot('account1');

      expect(supabase.insert).toHaveBeenCalled();
      expect(success).toBe(true);
      expect(error).toBeNull();
    });
  });

  describe('resumeBot', () => {
    it('debe reanudar bot', async () => {
      // Primera llamada: verificar si existe (select().eq().single())
      supabase.single.mockResolvedValueOnce({
        data: { id: 'config1' },
        error: null
      });

      // update().eq() retorna una promesa con { error: null }
      // El mock ya está configurado para esto

      const { success, error } = await resumeBot('account1');

      expect(supabase.update).toHaveBeenCalled();
      expect(success).toBe(true);
      expect(error).toBeNull();
    });
  });

  describe('removeFromQueue', () => {
    it('debe eliminar mensaje de la cola', async () => {
      // delete().eq() retorna una promesa con { error: null }
      // El mock ya está configurado para esto

      const { success, error } = await removeFromQueue('message1');

      expect(supabase.from).toHaveBeenCalledWith('puppeteer_queue');
      expect(supabase.delete).toHaveBeenCalled();
      expect(success).toBe(true);
      expect(error).toBeNull();
    });
  });

  describe('retryMessage', () => {
    it('debe reintentar mensaje fallido', async () => {
      // update().eq() retorna una promesa con { error: null }
      // El mock ya está configurado para esto

      const { success, error } = await retryMessage('message1');

      expect(supabase.from).toHaveBeenCalledWith('puppeteer_queue');
      expect(supabase.update).toHaveBeenCalled();
      expect(success).toBe(true);
      expect(error).toBeNull();
    });
  });

  describe('subscribeQueue', () => {
    it('debe crear suscripción Realtime', () => {
      const callback = vi.fn();
      const unsubscribe = subscribeQueue(callback);

      expect(supabase.channel).toHaveBeenCalledWith('puppeteer_queue');
      expect(typeof unsubscribe).toBe('function');
    });
  });
});

