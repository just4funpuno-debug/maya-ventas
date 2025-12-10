/**
 * Tests unitarios para el servicio de contactos bloqueados
 * FASE 5: SUBFASE 5.3 - Panel de Posibles Bloqueos
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getBlockedContacts,
  getSuspiciousContacts,
  getContactDeliveryIssues,
  reactivateContact,
  deleteContact,
  addContactNote,
  getBlockingStats,
  getUnresolvedIssues
} from '../../src/services/whatsapp/blocked-contacts';
import { supabase } from '../../src/supabaseClient';

// Mock del módulo supabaseClient
vi.mock('../../src/supabaseClient', () => {
  const mockSupabase = {
    from: vi.fn(() => mockSupabase),
    select: vi.fn(() => mockSupabase),
    eq: vi.fn(() => mockSupabase),
    gte: vi.fn(() => mockSupabase),
    lt: vi.fn(() => mockSupabase),
    order: vi.fn(() => mockSupabase),
    range: vi.fn(() => Promise.resolve({ data: [], error: null })),
    or: vi.fn(() => mockSupabase),
    update: vi.fn(() => mockSupabase),
    delete: vi.fn(() => mockSupabase),
    insert: vi.fn(() => Promise.resolve({ error: null })),
    single: vi.fn(() => Promise.resolve({ data: null, error: null })),
    limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
  };
  
  return {
    supabase: mockSupabase
  };
});

describe('Blocked Contacts Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Configurar métodos de chaining para retornar supabase
    supabase.from.mockReturnValue(supabase);
    supabase.select.mockReturnValue(supabase);
    supabase.eq.mockReturnValue(supabase);
    supabase.gte.mockReturnValue(supabase);
    supabase.lt.mockReturnValue(supabase);
    supabase.order.mockReturnValue(supabase);
    supabase.or.mockReturnValue(supabase);
    supabase.update.mockReturnValue(supabase);
    supabase.delete.mockReturnValue(supabase);
    // order() puede retornar una promesa cuando se ejecuta
    supabase.order.mockImplementation(() => {
      // Si ya se llamó range() o limit(), retornar promesa
      if (supabase.range.mock.calls.length > 0 || supabase.limit.mock.calls.length > 0) {
        return Promise.resolve({ data: [], error: null });
      }
      return supabase;
    });
  });

  describe('getBlockedContacts', () => {
    it('debe obtener contactos bloqueados sin filtros', async () => {
      const mockContacts = [
        { id: '1', name: 'Juan', phone: '+59112345678', is_blocked: true },
        { id: '2', name: 'María', phone: '+59187654321', is_blocked: true }
      ];

      const thenableRange = {
        then: (resolve) => resolve({ data: mockContacts, error: null })
      };
      supabase.range.mockReturnValueOnce(thenableRange);

      const { data, error } = await getBlockedContacts();

      expect(supabase.from).toHaveBeenCalledWith('whatsapp_contacts');
      expect(supabase.select).toHaveBeenCalledWith('*');
      expect(supabase.eq).toHaveBeenCalledWith('is_blocked', true);
      expect(supabase.order).toHaveBeenCalledWith('updated_at', { ascending: false });
      expect(data).toEqual(mockContacts);
      expect(error).toBeNull();
    });

    it('debe filtrar por accountId', async () => {
      const mockContacts = [{ id: '1', name: 'Juan', is_blocked: true }];
      // range() retorna un objeto que también tiene eq() para permitir chaining
      const rangeThenable = {
        eq: vi.fn(() => {
          const thenable = {
            then: (resolve) => resolve({ data: mockContacts, error: null })
          };
          return thenable;
        })
      };
      supabase.range.mockReturnValueOnce(rangeThenable);

      const { data } = await getBlockedContacts({ accountId: 'acc_123' });

      // Verificar que se llamó eq() para account_id (después de range)
      expect(rangeThenable.eq).toHaveBeenCalledWith('account_id', 'acc_123');
      expect(data).toEqual(mockContacts);
    });

    it('debe buscar por nombre o teléfono', async () => {
      const mockContacts = [{ id: '1', name: 'Juan', phone: '+59112345678', is_blocked: true }];
      // range() retorna un objeto que también tiene or() para permitir chaining
      const rangeThenable = {
        or: vi.fn(() => {
          const orThenable = {
            then: (resolve) => resolve({ data: mockContacts, error: null })
          };
          return orThenable;
        })
      };
      supabase.range.mockReturnValueOnce(rangeThenable);

      const { data } = await getBlockedContacts({ search: 'Juan' });

      // Verificar que se llamó or() para búsqueda (después de range)
      expect(rangeThenable.or).toHaveBeenCalled();
      expect(data).toEqual(mockContacts);
    });

    it('debe manejar errores correctamente', async () => {
      const mockError = { message: 'Error de base de datos' };
      const thenableRange = {
        then: (resolve) => resolve({ data: null, error: mockError })
      };
      supabase.range.mockReturnValueOnce(thenableRange);

      const { data, error } = await getBlockedContacts();

      expect(data).toBeNull();
      expect(error).toEqual(mockError);
    });
  });

  describe('getSuspiciousContacts', () => {
    it('debe obtener contactos sospechosos (50-79%)', async () => {
      const mockContacts = [
        { id: '1', name: 'Pedro', phone: '+59112345678', block_probability: 65, is_blocked: false }
      ];

      const thenableRange = {
        then: (resolve) => resolve({ data: mockContacts, error: null })
      };
      supabase.range.mockReturnValueOnce(thenableRange);

      const { data, error } = await getSuspiciousContacts();

      expect(supabase.from).toHaveBeenCalledWith('whatsapp_contacts');
      expect(supabase.gte).toHaveBeenCalledWith('block_probability', 50);
      expect(supabase.lt).toHaveBeenCalledWith('block_probability', 80);
      expect(supabase.eq).toHaveBeenCalledWith('is_blocked', false);
      expect(data).toEqual(mockContacts);
      expect(error).toBeNull();
    });

    it('debe filtrar por accountId', async () => {
      const mockContacts = [{ id: '1', name: 'Pedro', block_probability: 65, is_blocked: false }];
      // range() retorna un objeto que también tiene eq() para permitir chaining
      const rangeThenable = {
        eq: vi.fn(() => {
          const thenable = {
            then: (resolve) => resolve({ data: mockContacts, error: null })
          };
          return thenable;
        })
      };
      supabase.range.mockReturnValueOnce(rangeThenable);

      const { data } = await getSuspiciousContacts({ accountId: 'acc_123' });

      // Verificar que se llamó eq() para account_id (después de range)
      expect(rangeThenable.eq).toHaveBeenCalledWith('account_id', 'acc_123');
      expect(data).toEqual(mockContacts);
    });
  });

  describe('getContactDeliveryIssues', () => {
    it('debe obtener issues de entrega para un contacto', async () => {
      const mockIssues = [
        {
          id: '1',
          contact_id: 'contact_123',
          issue_type: 'undelivered',
          detected_at: '2025-01-30T10:00:00Z'
        }
      ];

      supabase.order.mockReturnValueOnce(
        Promise.resolve({ data: mockIssues, error: null })
      );

      const { data, error } = await getContactDeliveryIssues('contact_123');

      expect(supabase.from).toHaveBeenCalledWith('whatsapp_delivery_issues');
      expect(supabase.select).toHaveBeenCalledWith('*');
      expect(supabase.eq).toHaveBeenCalledWith('contact_id', 'contact_123');
      expect(supabase.order).toHaveBeenCalledWith('detected_at', { ascending: false });
      expect(data).toEqual(mockIssues);
      expect(error).toBeNull();
    });

    it('debe retornar array vacío si no hay issues', async () => {
      supabase.order.mockReturnValueOnce(
        Promise.resolve({ data: [], error: null })
      );

      const { data, error } = await getContactDeliveryIssues('contact_123');

      expect(data).toEqual([]);
      expect(error).toBeNull();
    });
  });

  describe('reactivateContact', () => {
    it('debe reactivar un contacto correctamente', async () => {
      // Mock para update().eq() - update retorna supabase, eq() retorna promesa
      const updateThenable = {
        eq: vi.fn(() => Promise.resolve({ error: null }))
      };
      supabase.update.mockReturnValueOnce(updateThenable);

      const { success, error } = await reactivateContact('contact_123');

      expect(supabase.from).toHaveBeenCalledWith('whatsapp_contacts');
      expect(supabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          is_blocked: false,
          block_probability: 0,
          consecutive_undelivered: 0
        })
      );
      expect(updateThenable.eq).toHaveBeenCalledWith('id', 'contact_123');
      expect(success).toBe(true);
      expect(error).toBeNull();
    });

    it('debe marcar issues como resueltos', async () => {
      // Mock para primera actualización (contacto)
      const updateThenable1 = {
        eq: vi.fn(() => Promise.resolve({ error: null }))
      };
      // Mock para segunda actualización (issues)
      const updateThenable2 = {
        eq: vi.fn(() => Promise.resolve({ error: null }))
      };
      supabase.update
        .mockReturnValueOnce(updateThenable1)
        .mockReturnValueOnce(updateThenable2);

      await reactivateContact('contact_123');

      // Verificar que se actualizaron los issues
      expect(supabase.from).toHaveBeenCalledWith('whatsapp_delivery_issues');
      expect(supabase.update).toHaveBeenCalledTimes(2);
    });

    it('debe manejar errores al reactivar', async () => {
      const mockError = { message: 'Error al actualizar' };
      const updateThenable = {
        eq: vi.fn(() => Promise.resolve({ error: mockError }))
      };
      supabase.update.mockReturnValueOnce(updateThenable);

      const { success, error } = await reactivateContact('contact_123');

      expect(success).toBe(false);
      expect(error).toEqual(mockError);
    });
  });

  describe('deleteContact', () => {
    it('debe eliminar un contacto correctamente', async () => {
      const deleteThenable = {
        eq: vi.fn(() => Promise.resolve({ error: null }))
      };
      supabase.delete.mockReturnValueOnce(deleteThenable);

      const { success, error } = await deleteContact('contact_123');

      expect(supabase.from).toHaveBeenCalledWith('whatsapp_contacts');
      expect(supabase.delete).toHaveBeenCalled();
      expect(deleteThenable.eq).toHaveBeenCalledWith('id', 'contact_123');
      expect(success).toBe(true);
      expect(error).toBeNull();
    });

    it('debe manejar errores al eliminar', async () => {
      const mockError = { message: 'Error al eliminar' };
      const deleteThenable = {
        eq: vi.fn(() => Promise.resolve({ error: mockError }))
      };
      supabase.delete.mockReturnValueOnce(deleteThenable);

      const { success, error } = await deleteContact('contact_123');

      expect(success).toBe(false);
      expect(error).toEqual(mockError);
    });
  });

  describe('addContactNote', () => {
    it('debe agregar nota a un contacto sin notas previas', async () => {
      const mockContact = { id: 'contact_123', notes: null };
      supabase.single.mockResolvedValueOnce({
        data: mockContact,
        error: null
      });
      const updateThenable = {
        eq: vi.fn(() => Promise.resolve({ error: null }))
      };
      supabase.update.mockReturnValueOnce(updateThenable);

      const { success, error } = await addContactNote('contact_123', 'Nueva nota');

      expect(supabase.from).toHaveBeenCalledWith('whatsapp_contacts');
      expect(supabase.select).toHaveBeenCalledWith('notes');
      expect(supabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          notes: expect.stringContaining('Nueva nota')
        })
      );
      expect(updateThenable.eq).toHaveBeenCalledWith('id', 'contact_123');
      expect(success).toBe(true);
      expect(error).toBeNull();
    });

    it('debe agregar nota a un contacto con notas existentes', async () => {
      const mockContact = { id: 'contact_123', notes: 'Nota anterior' };
      supabase.single.mockResolvedValueOnce({
        data: mockContact,
        error: null
      });
      const updateThenable = {
        eq: vi.fn(() => Promise.resolve({ error: null }))
      };
      supabase.update.mockReturnValueOnce(updateThenable);

      const { success } = await addContactNote('contact_123', 'Nueva nota');

      expect(supabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          notes: expect.stringContaining('Nota anterior'),
          notes: expect.stringContaining('Nueva nota')
        })
      );
      expect(success).toBe(true);
    });

    it('debe manejar errores al obtener contacto', async () => {
      const mockError = { message: 'Contacto no encontrado' };
      supabase.single.mockResolvedValueOnce({
        data: null,
        error: mockError
      });

      const { success, error } = await addContactNote('contact_123', 'Nota');

      expect(success).toBe(false);
      expect(error).toEqual(mockError);
    });
  });

  describe('getBlockingStats', () => {
    it('debe calcular estadísticas correctamente', async () => {
      const mockContacts = [
        { id: '1', is_blocked: true, block_probability: 100 },
        { id: '2', is_blocked: false, block_probability: 75 },
        { id: '3', is_blocked: false, block_probability: 30 },
        { id: '4', is_blocked: false, block_probability: 0 }
      ];

      supabase.select.mockReturnValueOnce(
        Promise.resolve({ data: mockContacts, error: null })
      );

      const { data, error } = await getBlockingStats();

      expect(data.total).toBe(4);
      expect(data.blocked).toBe(1);
      expect(data.suspicious).toBe(1);
      expect(data.active).toBe(2);
      expect(data.averageProbability).toBeGreaterThan(0);
      expect(error).toBeNull();
    });

    it('debe filtrar por accountId si se proporciona', async () => {
      const mockContacts = [
        { id: '1', is_blocked: true, block_probability: 100 }
      ];

      // select() retorna supabase, pero cuando se ejecuta la query (await query), necesita retornar datos
      // Necesitamos que eq() retorne una promesa cuando se await
      const eqThenable = {
        then: (resolve) => resolve({ data: mockContacts, error: null })
      };
      supabase.eq.mockReturnValueOnce(eqThenable);

      const { data } = await getBlockingStats('acc_123');

      expect(supabase.eq).toHaveBeenCalledWith('account_id', 'acc_123');
      expect(data.total).toBe(1);
    });

    it('debe calcular promedio de probabilidad correctamente', async () => {
      const mockContacts = [
        { id: '1', block_probability: 50 },
        { id: '2', block_probability: 75 },
        { id: '3', block_probability: 0 }
      ];

      supabase.select.mockReturnValueOnce(
        Promise.resolve({ data: mockContacts, error: null })
      );

      const { data } = await getBlockingStats();

      // Solo cuenta contactos con probability > 0: (50 + 75) / 2 = 62.5 ≈ 63
      expect(data.averageProbability).toBe(63);
    });
  });

  describe('getUnresolvedIssues', () => {
    it('debe obtener issues no resueltos', async () => {
      const mockIssues = [
        {
          id: '1',
          contact_id: 'contact_123',
          resolved: false,
          whatsapp_contacts: {
            id: 'contact_123',
            name: 'Juan',
            phone: '+59112345678',
            block_probability: 80,
            is_blocked: true
          }
        }
      ];

      supabase.limit.mockReturnValueOnce(
        Promise.resolve({ data: mockIssues, error: null })
      );

      const { data, error } = await getUnresolvedIssues();

      expect(supabase.from).toHaveBeenCalledWith('whatsapp_delivery_issues');
      expect(supabase.select).toHaveBeenCalled();
      expect(supabase.eq).toHaveBeenCalledWith('resolved', false);
      expect(supabase.order).toHaveBeenCalledWith('detected_at', { ascending: false });
      expect(data).toEqual(mockIssues);
      expect(error).toBeNull();
    });

    it('debe filtrar por accountId si se proporciona', async () => {
      const mockIssues = [];
      // limit() retorna un objeto que también tiene eq() para permitir chaining
      const limitThenable = {
        eq: vi.fn(() => {
          const eqThenable = {
            then: (resolve) => resolve({ data: mockIssues, error: null })
          };
          return eqThenable;
        })
      };
      supabase.limit.mockReturnValueOnce(limitThenable);
      supabase.eq.mockReturnValueOnce(supabase); // Primera llamada: resolved = false
      supabase.order.mockReturnValueOnce(supabase); // order retorna supabase

      const { data } = await getUnresolvedIssues({ accountId: 'acc_123' });

      // Verificar que se llamó eq() para account_id (después de limit)
      expect(limitThenable.eq).toHaveBeenCalledWith('account_id', 'acc_123');
      expect(data).toEqual(mockIssues);
    });

    it('debe respetar el límite de resultados', async () => {
      const mockIssues = [];
      // order() retorna supabase, luego limit() retorna promesa
      const orderThenable = {
        limit: vi.fn(() => Promise.resolve({ data: mockIssues, error: null }))
      };
      supabase.order.mockReturnValueOnce(orderThenable);
      supabase.eq.mockReturnValueOnce(supabase); // resolved = false

      await getUnresolvedIssues({ limit: 50 });

      expect(orderThenable.limit).toHaveBeenCalledWith(50);
    });
  });
});

