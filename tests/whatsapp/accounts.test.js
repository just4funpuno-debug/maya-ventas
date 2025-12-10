/**
 * Tests automatizados para servicios de cuentas WhatsApp
 * SUBFASE 1.4: Testing de accounts.js
 * FASE 2: SUBFASE 2.1 - Testing de filtrado por productos
 * 
 * Ejecutar con: npm test -- tests/whatsapp/accounts.test.js
 * O con Vitest: npx vitest tests/whatsapp/accounts.test.js
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getAllAccounts,
  getAccountById,
  getAccountByPhoneNumberId,
  createAccount,
  updateAccount,
  deleteAccount,
  toggleAccountActive,
  getProducts
} from '../../src/services/whatsapp/accounts';
import { supabase } from '../../src/supabaseClient';

// Mock del módulo supabaseClient (factory function para evitar hoisting issues)
vi.mock('../../src/supabaseClient', () => {
  const mockSupabase = {
    from: vi.fn(() => mockSupabase),
    select: vi.fn(() => mockSupabase),
    insert: vi.fn(() => mockSupabase),
    update: vi.fn(() => mockSupabase),
    delete: vi.fn(() => mockSupabase),
    eq: vi.fn(() => mockSupabase),
    in: vi.fn(() => mockSupabase),
    order: vi.fn(() => mockSupabase),
    single: vi.fn(() => mockSupabase),
    maybeSingle: vi.fn(() => mockSupabase),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        subscribe: vi.fn(() => () => {}) // unsubscribe function
      }))
    }))
  };
  
  return {
    supabase: mockSupabase
  };
});

describe('WhatsApp Accounts Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Resetear el mock para que retorne el objeto para encadenar
    supabase.from.mockReturnValue(supabase);
    supabase.select.mockReturnValue(supabase);
    supabase.insert.mockReturnValue(supabase);
    supabase.update.mockReturnValue(supabase);
    supabase.delete.mockReturnValue(supabase);
    supabase.eq.mockReturnValue(supabase);
    supabase.in.mockReturnValue(supabase);
    supabase.order.mockReturnValue(supabase);
    supabase.rpc.mockResolvedValue({ data: null, error: null });
  });

  describe('getAllAccounts', () => {
    it('debe obtener todas las cuentas ordenadas por fecha (sin filtro)', async () => {
      const mockData = [
        { id: '1', phone_number_id: '123', created_at: '2025-01-30T10:00:00Z' },
        { id: '2', phone_number_id: '456', created_at: '2025-01-29T10:00:00Z' }
      ];

      // El chain termina en .order() que retorna { data, error }
      supabase.order.mockResolvedValue({ data: mockData, error: null });

      const result = await getAllAccounts();

      expect(supabase.from).toHaveBeenCalledWith('whatsapp_accounts');
      expect(supabase.select).toHaveBeenCalled();
      expect(supabase.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(result.data).toEqual(mockData);
      expect(result.error).toBeNull();
    });

    it('debe filtrar cuentas por productos del usuario', async () => {
      const userSkus = ['SKU1', 'SKU2'];
      const allowedAccountIds = ['account-1', 'account-2'];
      const mockData = [
        { id: 'account-1', phone_number_id: '123', product_id: 'prod-1' },
        { id: 'account-2', phone_number_id: '456', product_id: 'prod-2' }
      ];

      // Mock de RPC para obtener account_ids permitidos
      supabase.rpc.mockResolvedValueOnce({ data: allowedAccountIds, error: null });
      // Mock de query con filtro
      supabase.in.mockReturnValue(supabase);
      supabase.order.mockResolvedValue({ data: mockData, error: null });

      const result = await getAllAccounts(userSkus);

      expect(supabase.rpc).toHaveBeenCalledWith('get_account_ids_by_user_skus', {
        p_skus: userSkus
      });
      expect(supabase.in).toHaveBeenCalledWith('id', allowedAccountIds);
      expect(result.data).toEqual(mockData);
      expect(result.error).toBeNull();
    });

    it('debe retornar array vacío si el usuario no tiene cuentas asignadas', async () => {
      const userSkus = ['SKU1'];
      
      // Mock de RPC que retorna array vacío
      supabase.rpc.mockResolvedValueOnce({ data: [], error: null });

      const result = await getAllAccounts(userSkus);

      expect(supabase.rpc).toHaveBeenCalledWith('get_account_ids_by_user_skus', {
        p_skus: userSkus
      });
      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
    });

    it('debe manejar errores correctamente', async () => {
      const mockError = { message: 'Error de conexión' };
      supabase.order.mockResolvedValue({ data: null, error: mockError });

      const result = await getAllAccounts();

      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
    });
  });

  describe('getAccountById', () => {
    it('debe obtener una cuenta por ID (sin filtro)', async () => {
      const mockAccount = { id: '1', phone_number_id: '123' };
      supabase.single.mockResolvedValue({ data: mockAccount, error: null });

      const result = await getAccountById('1');

      expect(supabase.from).toHaveBeenCalledWith('whatsapp_accounts');
      expect(supabase.eq).toHaveBeenCalledWith('id', '1');
      expect(result.data).toEqual(mockAccount);
      expect(result.error).toBeNull();
    });

    it('debe obtener cuenta por ID con filtro de productos permitidos', async () => {
      const accountId = 'account-1';
      const userSkus = ['SKU1'];
      const allowedAccountIds = ['account-1', 'account-2'];
      const mockAccount = { id: accountId, phone_number_id: '123' };

      // Mock de RPC para obtener account_ids permitidos
      supabase.rpc.mockResolvedValueOnce({ data: allowedAccountIds, error: null });
      // Mock de query
      supabase.single.mockResolvedValue({ data: mockAccount, error: null });

      const result = await getAccountById(accountId, userSkus);

      expect(supabase.rpc).toHaveBeenCalledWith('get_account_ids_by_user_skus', {
        p_skus: userSkus
      });
      expect(result.data).toEqual(mockAccount);
      expect(result.error).toBeNull();
    });

    it('debe retornar error si el usuario no tiene permisos para la cuenta', async () => {
      const accountId = 'account-1';
      const userSkus = ['SKU1'];
      const allowedAccountIds = ['account-2', 'account-3']; // No incluye account-1

      // Mock de RPC que retorna account_ids que no incluyen accountId
      supabase.rpc.mockResolvedValueOnce({ data: allowedAccountIds, error: null });

      const result = await getAccountById(accountId, userSkus);

      expect(supabase.rpc).toHaveBeenCalledWith('get_account_ids_by_user_skus', {
        p_skus: userSkus
      });
      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('PERMISSION_DENIED');
      expect(result.error.message).toContain('permisos');
    });

    it('debe retornar error si el usuario no tiene cuentas asignadas', async () => {
      const accountId = 'account-1';
      const userSkus = ['SKU1'];

      // Mock de RPC que retorna array vacío
      supabase.rpc.mockResolvedValueOnce({ data: [], error: null });

      const result = await getAccountById(accountId, userSkus);

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
      expect(result.error.code).toBe('PERMISSION_DENIED');
    });
  });

  describe('createAccount', () => {
    it('debe crear una cuenta con datos válidos', async () => {
      const accountData = {
        phone_number_id: '123456789',
        business_account_id: '987654321',
        access_token: 'token123456789012345678901234567890',
        verify_token: 'verify1234567890',
        phone_number: '+591 12345678',
        display_name: 'Test Account',
        product_id: null,
        active: true
      };

      const mockCreated = { id: 'new-id', ...accountData };
      supabase.single.mockReturnValue({ data: mockCreated, error: null });

      const result = await createAccount(accountData);

      expect(supabase.insert).toHaveBeenCalled();
      expect(result.data).toEqual(mockCreated);
      expect(result.error).toBeNull();
    });

    it('debe limpiar espacios en blanco de los campos', async () => {
      const accountData = {
        phone_number_id: '  123456789  ',
        business_account_id: '  987654321  ',
        access_token: '  token123  ',
        verify_token: '  verify123  ',
        phone_number: '  +591 12345678  ',
        display_name: '  Test Account  '
      };

      supabase.single.mockReturnValue({ data: { id: '1' }, error: null });

      await createAccount(accountData);

      const insertCall = supabase.insert.mock.calls[0][0];
      expect(insertCall.phone_number_id).toBe('123456789');
      expect(insertCall.business_account_id).toBe('987654321');
      expect(insertCall.display_name).toBe('Test Account');
    });
  });

  describe('updateAccount', () => {
    it('debe actualizar una cuenta existente', async () => {
      const updates = {
        display_name: 'Updated Name',
        active: false
      };

      const mockUpdated = { id: '1', ...updates };
      supabase.single.mockReturnValue({ data: mockUpdated, error: null });

      const result = await updateAccount('1', updates);

      expect(supabase.update).toHaveBeenCalled();
      expect(supabase.eq).toHaveBeenCalledWith('id', '1');
      expect(result.data).toEqual(mockUpdated);
      expect(result.error).toBeNull();
    });

    it('debe actualizar updated_at automáticamente', async () => {
      supabase.single.mockReturnValue({ data: { id: '1' }, error: null });

      await updateAccount('1', { display_name: 'Test' });

      const updateCall = supabase.update.mock.calls[0][0];
      expect(updateCall.updated_at).toBeDefined();
    });
  });

  describe('deleteAccount', () => {
    it('debe eliminar una cuenta', async () => {
      // El chain termina en .eq() que retorna { error }
      supabase.eq.mockResolvedValue({ error: null });

      const result = await deleteAccount('1');

      expect(supabase.from).toHaveBeenCalledWith('whatsapp_accounts');
      expect(supabase.delete).toHaveBeenCalled();
      expect(supabase.eq).toHaveBeenCalledWith('id', '1');
      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
    });
  });

  describe('toggleAccountActive', () => {
    it('debe activar una cuenta', async () => {
      const mockUpdated = { id: '1', active: true };
      // El chain es: .from().update().eq().select().single()
      // Necesitamos que cada método retorne el objeto para encadenar
      supabase.select.mockReturnValue(supabase);
      supabase.single.mockResolvedValue({ data: mockUpdated, error: null });

      const result = await toggleAccountActive('1', true);

      // Verificar que se llamaron los métodos principales
      expect(supabase.from).toHaveBeenCalledWith('whatsapp_accounts');
      expect(supabase.update).toHaveBeenCalled();
      expect(result.data).not.toBeNull();
      expect(result.data.active).toBe(true);
      expect(result.error).toBeNull();
    });

    it('debe desactivar una cuenta', async () => {
      const mockUpdated = { id: '1', active: false };
      supabase.select.mockReturnValue(supabase);
      supabase.single.mockResolvedValue({ data: mockUpdated, error: null });

      const result = await toggleAccountActive('1', false);

      expect(result.data).not.toBeNull();
      expect(result.data.active).toBe(false);
      expect(result.error).toBeNull();
    });
  });

  describe('getProducts', () => {
    it('debe retornar array vacío si la tabla products no existe', async () => {
      // Simular que la tabla no existe
      supabase.maybeSingle.mockReturnValue({ data: null, error: null });
      supabase.from.mockImplementation((table) => {
        if (table === 'products') {
          return {
            select: vi.fn(() => ({
              order: vi.fn(() => ({
                data: null,
                error: { message: 'relation "products" does not exist' }
              }))
            }))
          };
        }
        return supabase;
      });

      const result = await getProducts();

      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
    });

    it('debe retornar productos si la tabla existe', async () => {
      // Mock de datos de almacen_central (con 'nombre' en lugar de 'name')
      const mockAlmacenData = [
        { id: '1', nombre: 'Producto 1', sku: 'SKU1' },
        { id: '2', nombre: 'Producto 2', sku: 'SKU2' }
      ];

      // Datos esperados después del mapeo (nombre -> name)
      const expectedMapped = [
        { id: '1', name: 'Producto 1', sku: 'SKU1' },
        { id: '2', name: 'Producto 2', sku: 'SKU2' }
      ];

      // Mock: getProducts ahora usa directamente almacen_central
      const mockOrder = vi.fn().mockResolvedValueOnce({
        data: mockAlmacenData,
        error: null
      });
      const mockSelectProducts = vi.fn(() => ({ order: mockOrder }));
      
      supabase.from.mockImplementation((table) => {
        if (table === 'almacen_central') {
          return { select: mockSelectProducts };
        }
        return supabase;
      });

      const result = await getProducts();

      expect(result.data).toEqual(expectedMapped);
      expect(result.error).toBeNull();
      expect(supabase.from).toHaveBeenCalledWith('almacen_central');
    });
  });
});

