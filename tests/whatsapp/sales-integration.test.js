/**
 * Tests unitarios para el servicio de integración con ventas
 * FASE 7: SUBFASE 7.1.5 - Testing
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  findContactByPhone,
  createContactFromSale,
  associateContactWithSale,
  getContactSales,
  getSaleContact,
  disassociateContactFromSale
} from '../../src/services/whatsapp/sales-integration';
import { supabase } from '../../src/supabaseClient';

// Mock del módulo supabaseClient
vi.mock('../../src/supabaseClient', () => {
  const mockSupabase = {
    from: vi.fn(() => mockSupabase),
    select: vi.fn(() => mockSupabase),
    eq: vi.fn(() => mockSupabase),
    single: vi.fn(() => Promise.resolve({ data: null, error: null })),
    insert: vi.fn(() => Promise.resolve({ error: null })),
    delete: vi.fn(() => mockSupabase),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null }))
  };
  
  return {
    supabase: mockSupabase
  };
});

describe('Sales Integration Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabase.from.mockReturnValue(supabase);
    supabase.select.mockReturnValue(supabase);
    supabase.eq.mockReturnValue(supabase);
    supabase.insert.mockReturnValue(supabase);
    supabase.delete.mockReturnValue(supabase);
  });

  describe('findContactByPhone', () => {
    it('debe encontrar contacto por teléfono', async () => {
      const mockContact = {
        id: 'contact_123',
        phone: '+59112345678',
        name: 'Juan',
        account_id: 'acc_123'
      };

      supabase.single.mockResolvedValueOnce({
        data: mockContact,
        error: null
      });

      const { data, error } = await findContactByPhone('+591 1234 5678', 'acc_123');

      expect(supabase.from).toHaveBeenCalledWith('whatsapp_contacts');
      expect(supabase.eq).toHaveBeenCalledWith('account_id', 'acc_123');
      expect(supabase.eq).toHaveBeenCalledWith('phone', '+59112345678'); // Normalizado
      expect(data).toEqual(mockContact);
      expect(error).toBeNull();
    });

    it('debe retornar null si no encuentra contacto', async () => {
      supabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116', message: 'No rows returned' }
      });

      const { data, error } = await findContactByPhone('+59112345678', 'acc_123');

      expect(data).toBeNull();
      expect(error).toBeNull(); // PGRST116 se maneja como "no encontrado"
    });

    it('debe validar parámetros requeridos', async () => {
      const { data, error } = await findContactByPhone('', 'acc_123');

      expect(data).toBeNull();
      expect(error).toEqual({ message: 'phone y accountId son requeridos' });
    });
  });

  describe('createContactFromSale', () => {
    it('debe crear contacto desde venta exitosamente', async () => {
      const mockSale = {
        id: 'sale_123',
        celular: '+591 1234 5678',
        cliente: 'Juan Pérez'
      };

      const mockContact = {
        id: 'contact_123',
        phone: '+59112345678',
        name: 'Juan Pérez',
        account_id: 'acc_123'
      };

      // Mock obtener venta
      supabase.single.mockResolvedValueOnce({
        data: mockSale,
        error: null
      });

      // Mock findContactByPhone (llamada interna) - retorna null (no existe)
      // Necesitamos mockear la llamada a supabase.single para findContactByPhone
      // La función llama a supabase.from('whatsapp_contacts').select().eq().eq().single()
      // Ya mockeamos single para la venta, ahora necesitamos otro para el contacto
      supabase.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' } // No encontrado
      });

      // Mock crear contacto - insert retorna con select().single()
      const insertThenable = {
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: mockContact, error: null }))
        }))
      };
      supabase.insert.mockReturnValueOnce(insertThenable);

      // Mock asociar venta
      supabase.insert.mockReturnValueOnce(
        Promise.resolve({ error: null })
      );

      const { data, error, wasExisting } = await createContactFromSale('sale_123', 'acc_123');

      expect(data).toEqual(mockContact);
      expect(error).toBeNull();
      expect(wasExisting).toBe(false);
    });

    it('debe asociar venta con contacto existente', async () => {
      const mockSale = {
        id: 'sale_123',
        celular: '+591 1234 5678',
        cliente: 'Juan Pérez'
      };

      const mockContact = {
        id: 'contact_123',
        phone: '+59112345678',
        name: 'Juan',
        account_id: 'acc_123'
      };

      // Mock obtener venta (primera llamada a single)
      supabase.single.mockResolvedValueOnce({
        data: mockSale,
        error: null
      });

      // Mock findContactByPhone (llamada interna)
      // findContactByPhone hace: from().select().eq().eq().single()
      // Necesitamos que la segunda llamada a single retorne el contacto
      supabase.single.mockResolvedValueOnce({
        data: mockContact,
        error: null
      });

      // Mock associateContactWithSale (llamada interna)
      // associateContactWithSale hace: from().select().eq().single() para contacto
      supabase.single.mockResolvedValueOnce({
        data: { id: 'contact_123' },
        error: null
      });

      // Mock associateContactWithSale - verificar venta
      supabase.single.mockResolvedValueOnce({
        data: { id: 'sale_123' },
        error: null
      });

      // Mock associateContactWithSale - insertar asociación
      supabase.insert.mockReturnValueOnce(
        Promise.resolve({ error: null })
      );

      const { data, error, wasExisting } = await createContactFromSale('sale_123', 'acc_123');

      // En este caso, el contacto ya existe, así que no se crea uno nuevo
      // Pero la función debería retornar el contacto existente
      expect(data).toEqual(mockContact);
      expect(wasExisting).toBe(true);
      expect(error).toBeNull();
    });

    it('debe validar que la venta tenga teléfono', async () => {
      const mockSale = {
        id: 'sale_123',
        celular: null,
        cliente: 'Juan Pérez'
      };

      supabase.single.mockResolvedValueOnce({
        data: mockSale,
        error: null
      });

      const { data, error } = await createContactFromSale('sale_123', 'acc_123');

      expect(data).toBeNull();
      expect(error).toEqual({ message: 'La venta no tiene teléfono asociado' });
    });

    it('debe validar parámetros requeridos', async () => {
      const { data, error } = await createContactFromSale('', 'acc_123');

      expect(data).toBeNull();
      expect(error).toEqual({ message: 'saleId y accountId son requeridos' });
    });
  });

  describe('associateContactWithSale', () => {
    it('debe asociar contacto con venta exitosamente', async () => {
      const mockContact = { id: 'contact_123' };
      const mockSale = { id: 'sale_123' };

      supabase.single
        .mockResolvedValueOnce({ data: mockContact, error: null }) // Contacto existe
        .mockResolvedValueOnce({ data: mockSale, error: null }); // Venta existe

      supabase.insert.mockReturnValueOnce(
        Promise.resolve({ error: null })
      );

      const { success, error } = await associateContactWithSale('contact_123', 'sale_123');

      expect(supabase.from).toHaveBeenCalledWith('whatsapp_contact_sales');
      expect(success).toBe(true);
      expect(error).toBeNull();
    });

    it('debe manejar duplicados como éxito', async () => {
      supabase.single
        .mockResolvedValueOnce({ data: { id: 'contact_123' }, error: null })
        .mockResolvedValueOnce({ data: { id: 'sale_123' }, error: null });

      supabase.insert.mockReturnValueOnce(
        Promise.resolve({ error: { code: '23505' } }) // unique_violation
      );

      const { success, error } = await associateContactWithSale('contact_123', 'sale_123');

      expect(success).toBe(true);
      expect(error).toBeNull();
    });

    it('debe validar que el contacto existe', async () => {
      supabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Contacto no encontrado' }
      });

      const { success, error } = await associateContactWithSale('contact_123', 'sale_123');

      expect(success).toBe(false);
      expect(error).toEqual({ message: 'Contacto no encontrado' });
    });

    it('debe validar parámetros requeridos', async () => {
      const { success, error } = await associateContactWithSale('', 'sale_123');

      expect(success).toBe(false);
      expect(error).toEqual({ message: 'contactId y saleId son requeridos' });
    });
  });

  describe('getContactSales', () => {
    it('debe obtener ventas de un contacto', async () => {
      const mockSales = [
        {
          sale_id: 'sale_1',
          fecha: '2025-01-30',
          ciudad: 'LA PAZ',
          cliente: 'Juan',
          total: 120,
          estado_entrega: 'confirmado'
        }
      ];

      supabase.rpc.mockResolvedValueOnce({
        data: mockSales,
        error: null
      });

      const { data, error } = await getContactSales('contact_123');

      expect(supabase.rpc).toHaveBeenCalledWith('get_contact_sales', {
        p_contact_id: 'contact_123'
      });
      expect(data).toEqual(mockSales);
      expect(error).toBeNull();
    });

    it('debe retornar array vacío si no hay ventas', async () => {
      supabase.rpc.mockResolvedValueOnce({
        data: [],
        error: null
      });

      const { data, error } = await getContactSales('contact_123');

      expect(data).toEqual([]);
      expect(error).toBeNull();
    });

    it('debe validar parámetros requeridos', async () => {
      const { data, error } = await getContactSales('');

      expect(data).toBeNull();
      expect(error).toEqual({ message: 'contactId es requerido' });
    });
  });

  describe('getSaleContact', () => {
    it('debe obtener contacto de una venta', async () => {
      const mockContact = {
        contact_id: 'contact_123',
        phone: '+59112345678',
        name: 'Juan',
        account_id: 'acc_123'
      };

      supabase.rpc.mockResolvedValueOnce({
        data: [mockContact],
        error: null
      });

      const { data, error } = await getSaleContact('sale_123');

      expect(supabase.rpc).toHaveBeenCalledWith('get_sale_contact', {
        p_sale_id: 'sale_123'
      });
      expect(data).toEqual(mockContact);
      expect(error).toBeNull();
    });

    it('debe retornar null si no hay contacto asociado', async () => {
      supabase.rpc.mockResolvedValueOnce({
        data: [],
        error: null
      });

      const { data, error } = await getSaleContact('sale_123');

      expect(data).toBeNull();
      expect(error).toBeNull();
    });

    it('debe validar parámetros requeridos', async () => {
      const { data, error } = await getSaleContact('');

      expect(data).toBeNull();
      expect(error).toEqual({ message: 'saleId es requerido' });
    });
  });

  describe('disassociateContactFromSale', () => {
    it('debe desasociar contacto de venta exitosamente', async () => {
      // delete() retorna supabase, luego eq() para contact_id, luego eq() para sale_id
      const eqThenable1 = {
        eq: vi.fn(() => Promise.resolve({ error: null }))
      };
      supabase.delete.mockReturnValueOnce(supabase);
      supabase.eq
        .mockReturnValueOnce(eqThenable1) // Primera llamada: contact_id
        .mockReturnValueOnce(Promise.resolve({ error: null })); // Segunda llamada: sale_id (retorna promesa directamente)

      const { success, error } = await disassociateContactFromSale('contact_123', 'sale_123');

      expect(supabase.from).toHaveBeenCalledWith('whatsapp_contact_sales');
      expect(supabase.delete).toHaveBeenCalled();
      expect(supabase.eq).toHaveBeenCalledWith('contact_id', 'contact_123');
      expect(success).toBe(true);
      expect(error).toBeNull();
    });

    it('debe validar parámetros requeridos', async () => {
      const { success, error } = await disassociateContactFromSale('', 'sale_123');

      expect(success).toBe(false);
      expect(error).toEqual({ message: 'contactId y saleId son requeridos' });
    });
  });
});

