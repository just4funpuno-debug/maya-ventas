/**
 * Tests para validaciones de independencia de productos
 * FASE 1: Validaciones de Independencia
 * 
 * Ejecutar con: npm test -- tests/whatsapp/product-independence.test.js
 * O con Vitest: npx vitest tests/whatsapp/product-independence.test.js
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createAccount, updateAccount } from '../../src/services/whatsapp/accounts';
import { createLead, moveLeadToStage, updateLead } from '../../src/services/whatsapp/leads';
import { supabase } from '../../src/supabaseClient';

// Mock del módulo supabaseClient
vi.mock('../../src/supabaseClient', () => {
  const mockSupabase = {
    from: vi.fn(() => mockSupabase),
    select: vi.fn(() => mockSupabase),
    insert: vi.fn(() => mockSupabase),
    update: vi.fn(() => mockSupabase),
    eq: vi.fn(() => mockSupabase),
    neq: vi.fn(() => mockSupabase),
    single: vi.fn(() => Promise.resolve({ data: null, error: null })),
    maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null }))
  };
  
  return {
    supabase: mockSupabase
  };
});

describe('FASE 1: Validaciones de Independencia de Productos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabase.from.mockReturnValue(supabase);
    supabase.select.mockReturnValue(supabase);
    supabase.update.mockReturnValue(supabase);
    supabase.insert.mockReturnValue(supabase);
    supabase.eq.mockReturnValue(supabase);
    supabase.neq.mockReturnValue(supabase);
  });

  describe('SUBFASE 1.2: Validación en createAccount()', () => {
    const mockProductId = 'product-123';
    const mockExistingAccount = {
      id: 'existing-account-123',
      display_name: 'Cuenta Existente',
      product_id: mockProductId
    };

    it('TEST 1: debe permitir crear cuenta sin product_id', async () => {
      const accountData = {
        phone_number_id: 'phone-123',
        business_account_id: 'business-123',
        access_token: 'token-123',
        verify_token: 'verify-123',
        phone_number: '+1234567890',
        product_id: null
      };

      // Sin product_id, no se hace verificación previa
      supabase.insert.mockReturnValue(supabase);
      supabase.select.mockReturnValue(supabase);
      supabase.single.mockResolvedValueOnce({
        data: { id: 'new-account', ...accountData },
        error: null
      });

      const result = await createAccount(accountData);

      expect(result.data).toBeTruthy();
      expect(result.error).toBeNull();
    });

    it('TEST 2: debe prevenir crear cuenta duplicada para mismo producto', async () => {
      const accountData = {
        phone_number_id: 'phone-456',
        business_account_id: 'business-456',
        access_token: 'token-456',
        verify_token: 'verify-456',
        phone_number: '+1234567891',
        product_id: mockProductId
      };

      // Mock la cadena completa: from -> select -> eq -> maybeSingle
      supabase.from.mockReturnValue(supabase);
      supabase.select.mockReturnValue(supabase);
      supabase.eq.mockReturnValue(supabase);
      supabase.maybeSingle.mockResolvedValueOnce({
        data: mockExistingAccount,
        error: null
      });

      const result = await createAccount(accountData);

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
      expect(result.error.code).toBe('DUPLICATE_PRODUCT_ACCOUNT');
      expect(result.error.message).toContain('ya tiene un WhatsApp Account asignado');
    });

    it('TEST 3: debe permitir crear cuenta si no existe otra para el producto', async () => {
      const accountData = {
        phone_number_id: 'phone-789',
        business_account_id: 'business-789',
        access_token: 'token-789',
        verify_token: 'verify-789',
        phone_number: '+1234567892',
        product_id: mockProductId
      };

      // Primera llamada: verificar cuenta existente
      supabase.from.mockReturnValue(supabase);
      supabase.select.mockReturnValue(supabase);
      supabase.eq.mockReturnValue(supabase);
      supabase.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' } // No encontrado
      });

      // Segunda llamada: insertar cuenta
      supabase.insert.mockReturnValue(supabase);
      supabase.select.mockReturnValue(supabase);
      supabase.single.mockResolvedValueOnce({
        data: { id: 'new-account-2', ...accountData },
        error: null
      });

      const result = await createAccount(accountData);

      expect(result.data).toBeTruthy();
      expect(result.error).toBeNull();
    });
  });

  describe('SUBFASE 1.2: Validación en updateAccount()', () => {
    const mockProductId = 'product-456';
    const mockAccountId = 'account-to-update';

    it('TEST 4: debe prevenir actualizar cuenta a producto que ya tiene cuenta', async () => {
      const existingAccount = {
        id: 'other-account',
        display_name: 'Otra Cuenta',
        product_id: mockProductId
      };

      // Mock la cadena completa: from -> select -> eq -> neq -> maybeSingle
      supabase.from.mockReturnValue(supabase);
      supabase.select.mockReturnValue(supabase);
      supabase.eq.mockReturnValue(supabase);
      supabase.neq.mockReturnValue(supabase);
      supabase.maybeSingle.mockResolvedValueOnce({
        data: existingAccount,
        error: null
      });

      const result = await updateAccount(mockAccountId, {
        product_id: mockProductId
      });

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
      expect(result.error.code).toBe('DUPLICATE_PRODUCT_ACCOUNT');
    });

    it('TEST 5: debe permitir actualizar si el producto no tiene cuenta', async () => {
      const newProductId = 'product-sin-cuenta';

      // Primera llamada: verificar cuenta existente con ese producto
      supabase.from.mockReturnValue(supabase);
      supabase.select.mockReturnValue(supabase);
      supabase.eq.mockReturnValue(supabase);
      supabase.neq.mockReturnValue(supabase);
      supabase.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }
      });

      // Segunda llamada: actualizar cuenta
      supabase.update.mockReturnValue(supabase);
      supabase.select.mockReturnValue(supabase);
      supabase.single.mockResolvedValueOnce({
        data: { id: mockAccountId, product_id: newProductId },
        error: null
      });

      const result = await updateAccount(mockAccountId, {
        product_id: newProductId
      });

      expect(result.data).toBeTruthy();
      expect(result.error).toBeNull();
    });
  });

  describe('SUBFASE 1.3: Validación en createLead()', () => {
    const mockContactId = 'contact-123';
    const mockAccountId = 'account-123';
    const mockProductId = 'product-123';

    it('TEST 6: debe prevenir crear lead con cuenta de otro producto', async () => {
      const accountWithDifferentProduct = {
        id: mockAccountId,
        product_id: 'different-product-id'
      };

      // Primera llamada: verificar cuenta (from -> select -> eq -> maybeSingle)
      supabase.from.mockReturnValue(supabase);
      supabase.select.mockReturnValue(supabase);
      supabase.eq.mockReturnValue(supabase);
      supabase.maybeSingle.mockResolvedValueOnce({
        data: accountWithDifferentProduct,
        error: null
      });

      // No debe llegar a verificar lead duplicado porque falla antes
      const result = await createLead({
        contact_id: mockContactId,
        account_id: mockAccountId,
        product_id: mockProductId
      });

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
      expect(result.error.code).toBe('PRODUCT_ACCOUNT_MISMATCH');
      expect(result.error.message).toContain('productos son completamente independientes');
    });

    it('TEST 7: debe permitir crear lead si cuenta pertenece al mismo producto', async () => {
      const accountWithSameProduct = {
        id: mockAccountId,
        product_id: mockProductId
      };

      // Mock: verificar cuenta
      supabase.maybeSingle.mockResolvedValueOnce({
        data: accountWithSameProduct,
        error: null
      });

      // Mock: verificar lead duplicado (no existe)
      supabase.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }
      });

      // Mock: crear lead
      supabase.single.mockResolvedValueOnce({
        data: {
          id: 'new-lead',
          contact_id: mockContactId,
          account_id: mockAccountId,
          product_id: mockProductId
        },
        error: null
      });

      // Mock: crear actividad inicial
      supabase.insert.mockReturnValueOnce({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'activity-1' }, error: null }))
        }))
      });

      const result = await createLead({
        contact_id: mockContactId,
        account_id: mockAccountId,
        product_id: mockProductId
      });

      expect(result.data).toBeTruthy();
      expect(result.error).toBeNull();
    });

    it('TEST 8: debe permitir crear lead si cuenta no tiene product_id', async () => {
      const accountWithoutProduct = {
        id: mockAccountId,
        product_id: null
      };

      // Mock: verificar cuenta (sin product_id)
      supabase.maybeSingle.mockResolvedValueOnce({
        data: accountWithoutProduct,
        error: null
      });

      // Mock: verificar lead duplicado (no existe)
      supabase.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }
      });

      // Mock: crear lead
      supabase.single.mockResolvedValueOnce({
        data: {
          id: 'new-lead-2',
          contact_id: mockContactId,
          account_id: mockAccountId,
          product_id: mockProductId
        },
        error: null
      });

      // Mock: crear actividad inicial
      supabase.insert.mockReturnValueOnce({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'activity-2' }, error: null }))
        }))
      });

      const result = await createLead({
        contact_id: mockContactId,
        account_id: mockAccountId,
        product_id: mockProductId
      });

      expect(result.data).toBeTruthy();
      expect(result.error).toBeNull();
    });
  });

  describe('SUBFASE 1.3: Validación en moveLeadToStage()', () => {
    const mockLeadId = 'lead-123';
    const mockProductId = 'product-123';
    const differentProductId = 'product-456';

    it('TEST 9: debe prevenir mover lead a otro producto', async () => {
      const leadWithDifferentProduct = {
        pipeline_stage: 'entrantes',
        product_id: differentProductId
      };

      // Mock: obtener lead
      supabase.maybeSingle.mockResolvedValueOnce({
        data: leadWithDifferentProduct,
        error: null
      });

      const result = await moveLeadToStage(
        mockLeadId,
        'seguimiento',
        null, // userId
        mockProductId // productId esperado (diferente)
      );

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
      expect(result.error.code).toBe('PRODUCT_MISMATCH');
      expect(result.error.message).toContain('productos son completamente independientes');
    });

    it('TEST 10: debe permitir mover lead si pertenece al producto correcto', async () => {
      const leadWithCorrectProduct = {
        pipeline_stage: 'entrantes',
        product_id: mockProductId
      };

      // Mock: obtener lead
      supabase.maybeSingle.mockResolvedValueOnce({
        data: leadWithCorrectProduct,
        error: null
      });

      // Mock: actualizar etapa
      supabase.single.mockResolvedValueOnce({
        data: {
          id: mockLeadId,
          pipeline_stage: 'seguimiento',
          product_id: mockProductId
        },
        error: null
      });

      // Mock: crear actividad
      supabase.insert.mockReturnValueOnce({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'activity-3' }, error: null }))
        }))
      });

      // Mock: rpc para update_lead_activity
      supabase.rpc.mockResolvedValueOnce({
        data: null,
        error: null
      });

      const result = await moveLeadToStage(
        mockLeadId,
        'seguimiento',
        null, // userId
        mockProductId // productId esperado (coincide)
      );

      expect(result.data).toBeTruthy();
      expect(result.error).toBeNull();
    });
  });

  describe('SUBFASE 1.3: Validación en updateLead()', () => {
    const mockLeadId = 'lead-123';
    const currentProductId = 'product-123';
    const newProductId = 'product-456';

    it('TEST 11: debe prevenir cambiar product_id de un lead', async () => {
      const currentLead = {
        product_id: currentProductId
      };

      // Mock: obtener lead actual
      supabase.maybeSingle.mockResolvedValueOnce({
        data: currentLead,
        error: null
      });

      const result = await updateLead(mockLeadId, {
        product_id: newProductId,
        notes: 'Intentando cambiar producto'
      });

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
      expect(result.error.code).toBe('PRODUCT_CHANGE_NOT_ALLOWED');
      expect(result.error.message).toContain('No se puede cambiar el producto de un lead');
    });

    it('TEST 12: debe permitir actualizar otros campos sin cambiar product_id', async () => {
      const currentLead = {
        product_id: currentProductId
      };

      // Mock: obtener lead actual
      supabase.maybeSingle.mockResolvedValueOnce({
        data: currentLead,
        error: null
      });

      // Mock: actualizar lead
      supabase.single.mockResolvedValueOnce({
        data: {
          id: mockLeadId,
          product_id: currentProductId, // Sin cambiar
          notes: 'Nueva nota',
          estimated_value: 5000
        },
        error: null
      });

      const result = await updateLead(mockLeadId, {
        notes: 'Nueva nota',
        estimated_value: 5000
        // NO incluir product_id
      });

      expect(result.data).toBeTruthy();
      expect(result.error).toBeNull();
    });
  });
});

