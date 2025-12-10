/**
 * Tests unitarios para el servicio de etiquetas
 * FASE 1: SUBFASE 1.2 - Testing de Servicios
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock del módulo supabaseClient (factory function para evitar hoisting issues)
vi.mock('../../src/supabaseClient', () => {
  const mockSupabase = {
    from: vi.fn(() => mockSupabase),
    select: vi.fn(() => mockSupabase),
    insert: vi.fn(() => mockSupabase),
    update: vi.fn(() => mockSupabase),
    delete: vi.fn(() => mockSupabase),
    eq: vi.fn(() => mockSupabase),
    order: vi.fn(() => mockSupabase),
    single: vi.fn(),
    rpc: vi.fn()
  };
  
  return {
    supabase: mockSupabase
  };
});

import {
  getAllTags,
  getTagById,
  createTag,
  updateTag,
  deleteTag,
  getContactTags,
  addTagToContact,
  removeTagFromContact,
  setContactTags
} from '../../src/services/whatsapp/tags';
import { supabase } from '../../src/supabaseClient';

describe('Servicio de Etiquetas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Resetear el mock para que retorne el objeto para encadenar
    supabase.from.mockReturnValue(supabase);
  });

  describe('getAllTags', () => {
    it('debe obtener todas las etiquetas de un producto', async () => {
      const mockTags = [
        { id: '1', product_id: 'prod1', account_id: 'acc1', name: 'Cliente VIP', color: '#ff0000' },
        { id: '2', account_id: 'acc1', name: 'Pendiente', color: '#00ff00' }
      ];

      // Mock de la cadena de llamadas
      supabase.order.mockResolvedValue({ data: mockTags, error: null });

      const result = await getAllTags('acc1');

      expect(supabase.from).toHaveBeenCalledWith('whatsapp_tags');
      expect(supabase.select).toHaveBeenCalledWith('*');
      expect(supabase.eq).toHaveBeenCalledWith('account_id', 'acc1');
      expect(result.data).toEqual(mockTags);
      expect(result.error).toBeNull();
    });

    it('debe retornar error si accountId no se proporciona', async () => {
      const result = await getAllTags(null);

      expect(result.data).toBeNull();
      expect(result.error.message).toBe('accountId es requerido');
    });
  });

  describe('getTagById', () => {
    it('debe obtener una etiqueta por ID', async () => {
      const mockTag = { id: '1', account_id: 'acc1', name: 'Cliente VIP', color: '#ff0000' };

      supabase.single.mockResolvedValue({ data: mockTag, error: null });

      const result = await getTagById('1');

      expect(supabase.from).toHaveBeenCalledWith('whatsapp_tags');
      expect(supabase.select).toHaveBeenCalledWith('*');
      expect(supabase.eq).toHaveBeenCalledWith('id', '1');
      expect(result.data).toEqual(mockTag);
      expect(result.error).toBeNull();
    });

    it('debe retornar error si tagId no se proporciona', async () => {
      const result = await getTagById(null);

      expect(result.data).toBeNull();
      expect(result.error.message).toBe('tagId es requerido');
    });
  });

  describe('createTag', () => {
    it('debe crear una nueva etiqueta', async () => {
      const mockTag = { id: '1', account_id: 'acc1', name: 'Nueva Etiqueta', color: '#e7922b' };

      supabase.single.mockResolvedValue({ data: mockTag, error: null });

      const result = await createTag('acc1', 'Nueva Etiqueta', '#e7922b');

      expect(supabase.from).toHaveBeenCalledWith('whatsapp_tags');
      expect(supabase.insert).toHaveBeenCalledWith({
        account_id: 'acc1',
        name: 'Nueva Etiqueta',
        color: '#e7922b'
      });
      expect(result.data).toEqual(mockTag);
      expect(result.error).toBeNull();
    });

    it('debe validar formato de color', async () => {
      const result = await createTag('acc1', 'Test', 'invalid-color');

      expect(result.data).toBeNull();
      expect(result.error.message).toContain('Color debe ser un código hexadecimal válido');
    });

    it('debe validar longitud del nombre', async () => {
      const longName = 'a'.repeat(51);
      const result = await createTag('acc1', longName);

      expect(result.data).toBeNull();
      expect(result.error.message).toContain('no puede exceder 50 caracteres');
    });

    it('debe manejar error de etiqueta duplicada', async () => {
      supabase.single.mockResolvedValue({
        data: null,
        error: { code: '23505', message: 'duplicate key' }
      });

      const result = await createTag('acc1', 'Duplicada');

      expect(result.data).toBeNull();
      expect(result.error.code).toBe('DUPLICATE_TAG');
    });
  });

  describe('updateTag', () => {
    it('debe actualizar una etiqueta', async () => {
      const mockTag = { id: '1', account_id: 'acc1', name: 'Actualizada', color: '#0000ff' };

      supabase.single.mockResolvedValue({ data: mockTag, error: null });

      const result = await updateTag('1', { name: 'Actualizada', color: '#0000ff' });

      expect(supabase.from).toHaveBeenCalledWith('whatsapp_tags');
      expect(supabase.update).toHaveBeenCalledWith({
        name: 'Actualizada',
        color: '#0000ff'
      });
      expect(result.data).toEqual(mockTag);
      expect(result.error).toBeNull();
    });

    it('debe validar que se proporcionen campos para actualizar', async () => {
      const result = await updateTag('1', {});

      expect(result.data).toBeNull();
      expect(result.error.message).toContain('Debe proporcionar al menos un campo');
    });
  });

  describe('deleteTag', () => {
    it('debe eliminar una etiqueta', async () => {
      supabase.eq.mockResolvedValue({ error: null });

      const result = await deleteTag('1');

      expect(supabase.from).toHaveBeenCalledWith('whatsapp_tags');
      expect(supabase.delete).toHaveBeenCalled();
      expect(supabase.eq).toHaveBeenCalledWith('id', '1');
      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
    });

    it('debe retornar error si tagId no se proporciona', async () => {
      const result = await deleteTag(null);

      expect(result.success).toBe(false);
      expect(result.error.message).toBe('tagId es requerido');
    });
  });

  describe('getContactTags', () => {
    it('debe obtener etiquetas de un contacto usando RPC', async () => {
      const mockTags = [
        { tag_id: '1', tag_name: 'Cliente VIP', tag_color: '#ff0000' }
      ];

      supabase.rpc.mockResolvedValue({ data: mockTags, error: null });

      const result = await getContactTags('contact1');

      expect(supabase.rpc).toHaveBeenCalledWith('get_contact_tags', {
        p_contact_id: 'contact1'
      });
      expect(result.data).toEqual(mockTags);
      expect(result.error).toBeNull();
    });

    it('debe retornar error si contactId no se proporciona', async () => {
      const result = await getContactTags(null);

      expect(result.data).toBeNull();
      expect(result.error.message).toBe('contactId es requerido');
    });
  });

  describe('addTagToContact', () => {
    it('debe asignar una etiqueta a un contacto', async () => {
      supabase.insert.mockResolvedValue({ error: null });

      const result = await addTagToContact('contact1', 'tag1');

      expect(supabase.from).toHaveBeenCalledWith('whatsapp_contact_tags');
      expect(supabase.insert).toHaveBeenCalledWith({
        contact_id: 'contact1',
        tag_id: 'tag1'
      });
      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
    });

    it('debe manejar etiqueta duplicada como éxito', async () => {
      supabase.insert.mockResolvedValue({
        error: { code: '23505', message: 'duplicate key' }
      });

      const result = await addTagToContact('contact1', 'tag1');

      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
    });
  });

  describe('removeTagFromContact', () => {
    it('debe quitar una etiqueta de un contacto', async () => {
      // Mock para la cadena: delete().eq().eq() debe retornar { error: null }
      const mockDelete = {
        eq: vi.fn((field, value) => {
          if (field === 'contact_id') {
            return {
              eq: vi.fn(() => Promise.resolve({ error: null }))
            };
          }
          return Promise.resolve({ error: null });
        })
      };
      supabase.delete.mockReturnValue(mockDelete);

      const result = await removeTagFromContact('contact1', 'tag1');

      expect(supabase.from).toHaveBeenCalledWith('whatsapp_contact_tags');
      expect(supabase.delete).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
    });
  });

  describe('setContactTags', () => {
    it('debe reemplazar todas las etiquetas de un contacto', async () => {
      supabase.eq.mockResolvedValue({ error: null });
      supabase.insert.mockResolvedValue({ error: null });

      const result = await setContactTags('contact1', ['tag1', 'tag2']);

      expect(supabase.from).toHaveBeenCalledWith('whatsapp_contact_tags');
      expect(supabase.delete).toHaveBeenCalled();
      expect(supabase.insert).toHaveBeenCalledWith([
        { contact_id: 'contact1', tag_id: 'tag1' },
        { contact_id: 'contact1', tag_id: 'tag2' }
      ]);
      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
    });

    it('debe eliminar todas las etiquetas si se proporciona array vacío', async () => {
      supabase.eq.mockResolvedValue({ error: null });

      const result = await setContactTags('contact1', []);

      expect(supabase.delete).toHaveBeenCalled();
      expect(supabase.insert).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('debe validar que tagIds sea un array', async () => {
      const result = await setContactTags('contact1', 'not-an-array');

      expect(result.success).toBe(false);
      expect(result.error.message).toContain('debe ser un array');
    });
  });
});

