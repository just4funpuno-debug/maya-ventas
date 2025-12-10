/**
 * Tests unitarios para el servicio de respuestas rápidas
 * FASE 2: SUBFASE 2.5 - Testing de Servicios
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock del módulo supabaseClient
vi.mock('../../src/supabaseClient', () => {
  const mockSupabase = {
    from: vi.fn(() => mockSupabase),
    select: vi.fn(() => mockSupabase),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn()
      }))
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      }))
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
    })),
    eq: vi.fn(() => mockSupabase),
    order: vi.fn(() => Promise.resolve({ data: [], error: null })),
    single: vi.fn(),
    rpc: vi.fn(() => Promise.resolve({ data: [], error: null }))
  };
  
  return {
    supabase: mockSupabase
  };
});

// Mock del módulo storage
vi.mock('../../src/services/whatsapp/storage', () => ({
  uploadMediaToWhatsAppStorage: vi.fn()
}));

import {
  getAllQuickReplies,
  getQuickReplyById,
  createQuickReply,
  updateQuickReply,
  deleteQuickReply,
  searchQuickReplies,
  uploadQuickReplyMedia
} from '../../src/services/whatsapp/quick-replies';
import { supabase } from '../../src/supabaseClient';
import { uploadMediaToWhatsAppStorage } from '../../src/services/whatsapp/storage';

describe('Servicio de Respuestas Rápidas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Resetear el mock para que retorne el objeto para encadenar
    supabase.from.mockReturnValue(supabase);
    supabase.select.mockReturnValue(supabase);
    supabase.insert.mockReturnValue(supabase);
    supabase.update.mockReturnValue(supabase);
    supabase.delete.mockReturnValue(supabase);
    supabase.eq.mockReturnValue(supabase);
    supabase.order.mockReturnValue(supabase);
  });

  describe('getAllQuickReplies', () => {
    it('debe obtener todas las respuestas rápidas de una cuenta', async () => {
      const accountId = 'acc-123';
      const mockReplies = [
        { id: '1', account_id: accountId, trigger: '/saludo', name: 'Saludo', type: 'text', content_text: 'Hola' },
        { id: '2', account_id: accountId, trigger: '/despedida', name: 'Despedida', type: 'text', content_text: 'Adiós' }
      ];

      // Mock de la cadena de llamadas
      supabase.order.mockResolvedValue({
        data: mockReplies,
        error: null
      });

      const result = await getAllQuickReplies(accountId);

      expect(result.error).toBeNull();
      expect(result.data).toEqual(mockReplies);
      expect(supabase.from).toHaveBeenCalledWith('whatsapp_quick_replies');
      expect(supabase.eq).toHaveBeenCalledWith('account_id', accountId);
      expect(supabase.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('debe retornar error si accountId no es proporcionado', async () => {
      const result = await getAllQuickReplies(null);

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('accountId es requerido');
    });

    it('debe manejar errores de la base de datos', async () => {
      const accountId = 'acc-123';
      const dbError = { message: 'Database error', code: 'PGRST116' };

      supabase.order.mockResolvedValue({
        data: null,
        error: dbError
      });

      const result = await getAllQuickReplies(accountId);

      expect(result.data).toBeNull();
      expect(result.error).toEqual(dbError);
    });
  });

  describe('getQuickReplyById', () => {
    it('debe obtener una respuesta rápida por ID', async () => {
      const replyId = 'reply-123';
      const mockReply = {
        id: replyId,
        account_id: 'acc-123',
        trigger: '/saludo',
        name: 'Saludo',
        type: 'text',
        content_text: 'Hola'
      };

      supabase.single.mockResolvedValue({
        data: mockReply,
        error: null
      });

      const result = await getQuickReplyById(replyId);

      expect(result.error).toBeNull();
      expect(result.data).toEqual(mockReply);
      expect(supabase.from).toHaveBeenCalledWith('whatsapp_quick_replies');
      expect(supabase.eq).toHaveBeenCalledWith('id', replyId);
    });

    it('debe manejar error si no se encuentra la respuesta rápida', async () => {
      const replyId = 'reply-123';
      const dbError = { message: 'No rows found', code: 'PGRST116' };

      supabase.single.mockResolvedValue({
        data: null,
        error: dbError
      });

      const result = await getQuickReplyById(replyId);

      expect(result.error).toEqual(dbError);
      expect(result.data).toBeNull();
    });

    it('debe retornar error si replyId no es proporcionado', async () => {
      const result = await getQuickReplyById(null);

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('quickReplyId es requerido');
    });
  });

  describe('createQuickReply', () => {
    it('debe crear una nueva respuesta rápida de tipo texto', async () => {
      const accountId = 'acc-123';
      const quickReplyData = {
        trigger: '/saludo',
        name: 'Saludo Inicial',
        type: 'text',
        content_text: 'Hola, ¿cómo estás?'
      };

      const mockCreated = {
        id: 'reply-123',
        account_id: accountId,
        ...quickReplyData
      };

      const insertMock = supabase.insert();
      insertMock.select().single.mockResolvedValue({
        data: mockCreated,
        error: null
      });

      const result = await createQuickReply(accountId, quickReplyData);

      expect(result.error).toBeNull();
      expect(result.data).toEqual(mockCreated);
      expect(supabase.insert).toHaveBeenCalled();
    });

    it('debe crear una respuesta rápida de tipo imagen', async () => {
      const accountId = 'acc-123';
      const quickReplyData = {
        trigger: '/imagen',
        name: 'Imagen Producto',
        type: 'image',
        media_path: 'whatsapp-media/image.jpg',
        media_type: 'image'
      };

      const mockCreated = {
        id: 'reply-123',
        account_id: accountId,
        ...quickReplyData
      };

      const insertMock = supabase.insert();
      insertMock.select().single.mockResolvedValue({
        data: mockCreated,
        error: null
      });

      const result = await createQuickReply(accountId, quickReplyData);

      expect(result.error).toBeNull();
      expect(result.data).toEqual(mockCreated);
    });

    it('debe validar que trigger es requerido', async () => {
      const accountId = 'acc-123';
      const quickReplyData = {
        trigger: '',
        name: 'Test',
        type: 'text',
        content_text: 'Test'
      };

      const result = await createQuickReply(accountId, quickReplyData);

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('trigger es requerido');
    });

    it('debe validar que trigger empiece con "/"', async () => {
      const accountId = 'acc-123';
      const quickReplyData = {
        trigger: 'saludo',
        name: 'Test',
        type: 'text',
        content_text: 'Test'
      };

      const result = await createQuickReply(accountId, quickReplyData);

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('trigger debe empezar con "/"');
    });

    it('debe validar que name es requerido', async () => {
      const accountId = 'acc-123';
      const quickReplyData = {
        trigger: '/saludo',
        name: '',
        type: 'text',
        content_text: 'Test'
      };

      const result = await createQuickReply(accountId, quickReplyData);

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('name es requerido');
    });

    it('debe validar que content_text es requerido para tipo text', async () => {
      const accountId = 'acc-123';
      const quickReplyData = {
        trigger: '/saludo',
        name: 'Test',
        type: 'text',
        content_text: ''
      };

      const result = await createQuickReply(accountId, quickReplyData);

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('content_text es requerido');
    });

    it('debe validar que media_path es requerido para tipo image', async () => {
      const accountId = 'acc-123';
      const quickReplyData = {
        trigger: '/imagen',
        name: 'Test',
        type: 'image',
        media_path: null
      };

      const result = await createQuickReply(accountId, quickReplyData);

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('media_path es requerido');
    });

    it('debe manejar error de trigger duplicado', async () => {
      const accountId = 'acc-123';
      const quickReplyData = {
        trigger: '/saludo',
        name: 'Test',
        type: 'text',
        content_text: 'Test'
      };

      // Mock de la cadena insert().select().single() con error
      supabase.select.mockReturnValueOnce({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: '23505', message: 'Duplicate key' }
        })
      });

      const result = await createQuickReply(accountId, quickReplyData);

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
      expect(result.error.code).toBe('DUPLICATE_TRIGGER');
      expect(result.error.message).toContain('Ya existe una respuesta rápida con ese trigger');
    });
  });

  describe('updateQuickReply', () => {
    it('debe actualizar una respuesta rápida', async () => {
      const replyId = 'reply-123';
      const updates = {
        trigger: '/saludo-nuevo',
        content_text: 'Hola actualizado'
      };

      const mockUpdated = {
        id: replyId,
        ...updates
      };

      // Mock de la cadena update().eq().select().single()
      supabase.eq.mockReturnValueOnce({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: mockUpdated,
            error: null
          })
        }))
      });

      const result = await updateQuickReply(replyId, updates);

      expect(result.error).toBeNull();
      expect(result.data).toEqual(mockUpdated);
      expect(supabase.update).toHaveBeenCalled();
    });

    it('debe validar que replyId es requerido', async () => {
      const result = await updateQuickReply(null, {});

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('quickReplyId es requerido');
    });

    it('debe validar que hay al menos un campo para actualizar', async () => {
      const replyId = 'reply-123';
      const result = await updateQuickReply(replyId, {});

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('Debe proporcionar al menos un campo');
    });

    it('debe validar que trigger empiece con "/" si se actualiza', async () => {
      const replyId = 'reply-123';
      const updates = {
        trigger: 'saludo-sin-slash'
      };

      const result = await updateQuickReply(replyId, updates);

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('trigger debe empezar con "/"');
    });
  });

  describe('deleteQuickReply', () => {
    it('debe eliminar una respuesta rápida', async () => {
      const replyId = 'reply-123';

      // Mock de la cadena delete().eq()
      supabase.eq.mockResolvedValueOnce({
        data: [],
        error: null
      });

      const result = await deleteQuickReply(replyId);

      expect(result.error).toBeNull();
      expect(result.success).toBe(true);
      expect(supabase.from).toHaveBeenCalledWith('whatsapp_quick_replies');
      expect(supabase.delete).toHaveBeenCalled();
      expect(supabase.eq).toHaveBeenCalledWith('id', replyId);
    });

    it('debe retornar error si replyId no es proporcionado', async () => {
      const result = await deleteQuickReply(null);

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('quickReplyId es requerido');
    });

    it('debe manejar errores de la base de datos', async () => {
      const replyId = 'reply-123';
      const dbError = { message: 'Database error' };

      // Mock de la cadena delete().eq() con error
      supabase.eq.mockResolvedValueOnce({
        data: null,
        error: dbError
      });

      const result = await deleteQuickReply(replyId);

      expect(result.success).toBe(false);
      expect(result.error).toEqual(dbError);
    });
  });

  describe('searchQuickReplies', () => {
    it('debe buscar respuestas rápidas por término', async () => {
      const accountId = 'acc-123';
      const searchTerm = 'saludo';
      const mockReplies = [
        { id: '1', account_id: accountId, trigger: '/saludo', name: 'Saludo', type: 'text' }
      ];

      supabase.rpc.mockResolvedValue({
        data: mockReplies,
        error: null
      });

      const result = await searchQuickReplies(accountId, searchTerm);

      expect(result.error).toBeNull();
      expect(result.data).toEqual(mockReplies);
      expect(supabase.rpc).toHaveBeenCalledWith('get_quick_replies', {
        p_account_id: accountId,
        p_search_term: searchTerm
      });
    });

    it('debe retornar todas las respuestas si searchTerm está vacío', async () => {
      const accountId = 'acc-123';
      const mockReplies = [
        { id: '1', account_id: accountId, trigger: '/saludo', name: 'Saludo', type: 'text' },
        { id: '2', account_id: accountId, trigger: '/despedida', name: 'Despedida', type: 'text' }
      ];

      supabase.rpc.mockResolvedValue({
        data: mockReplies,
        error: null
      });

      const result = await searchQuickReplies(accountId, '');

      expect(result.error).toBeNull();
      expect(result.data).toEqual(mockReplies);
      expect(supabase.rpc).toHaveBeenCalledWith('get_quick_replies', {
        p_account_id: accountId,
        p_search_term: null
      });
    });

    it('debe retornar error si accountId no es proporcionado', async () => {
      const result = await searchQuickReplies(null, 'test');

      expect(result.data).toBeNull();
      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('accountId es requerido');
    });
  });

  describe('uploadQuickReplyMedia', () => {
    it('debe subir un archivo de imagen', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const mockPath = 'whatsapp-media/test.jpg';
      const mockUrl = 'https://example.com/test.jpg';

      uploadMediaToWhatsAppStorage.mockResolvedValue({
        url: mockUrl,
        path: mockPath
      });

      const result = await uploadQuickReplyMedia(file, 'image');

      expect(result.error).toBeNull();
      expect(result.path).toBe(mockPath);
      expect(result.url).toBe(mockUrl);
      expect(uploadMediaToWhatsAppStorage).toHaveBeenCalledWith(file, 'image');
    });

    it('debe subir un archivo de audio', async () => {
      const file = new File(['test'], 'test.mp3', { type: 'audio/mpeg' });
      const mockPath = 'whatsapp-media/test.mp3';
      const mockUrl = 'https://example.com/test.mp3';

      uploadMediaToWhatsAppStorage.mockResolvedValue({
        url: mockUrl,
        path: mockPath
      });

      const result = await uploadQuickReplyMedia(file, 'audio');

      expect(result.error).toBeNull();
      expect(result.path).toBe(mockPath);
      expect(result.url).toBe(mockUrl);
    });

    it('debe validar tamaño máximo de imagen (5 MB)', async () => {
      const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
      const result = await uploadQuickReplyMedia(largeFile, 'image');

      expect(result.path).toBeNull();
      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('demasiado grande');
    });

    it('debe validar tamaño máximo de audio (16 MB)', async () => {
      const largeFile = new File(['x'.repeat(17 * 1024 * 1024)], 'large.mp3', { type: 'audio/mpeg' });
      const result = await uploadQuickReplyMedia(largeFile, 'audio');

      expect(result.path).toBeNull();
      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('demasiado grande');
    });

    it('debe retornar error si file no es proporcionado', async () => {
      const result = await uploadQuickReplyMedia(null, 'image');

      expect(result.path).toBeNull();
      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('file es requerido');
    });

    it('debe validar que mediaType sea válido', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const result = await uploadQuickReplyMedia(file, 'invalid');

      expect(result.path).toBeNull();
      expect(result.error).toBeTruthy();
      expect(result.error.message).toContain('mediaType debe ser');
    });
  });
});

