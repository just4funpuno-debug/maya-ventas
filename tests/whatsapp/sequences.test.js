/**
 * Tests unitarios para el servicio de secuencias
 * FASE 4: SUBFASE 4.1 - Tests de Secuencias
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getSequences,
  getSequenceById,
  createSequence,
  updateSequence,
  deleteSequence,
  getSequenceMessages,
  addSequenceMessage,
  updateSequenceMessage,
  deleteSequenceMessage,
  reorderSequenceMessages,
  getSequenceWithMessages
} from '../../src/services/whatsapp/sequences';

// Mock del módulo supabaseClient
vi.mock('../../src/supabaseClient', () => {
  const mockSupabase = {
    from: vi.fn(() => mockSupabase),
    select: vi.fn(() => mockSupabase),
    insert: vi.fn(() => mockSupabase),
    update: vi.fn(() => mockSupabase),
    delete: vi.fn(() => mockSupabase),
    eq: vi.fn(() => mockSupabase),
    order: vi.fn(() => Promise.resolve({ data: [], error: null })),
    single: vi.fn(() => Promise.resolve({ data: null, error: null })),
    range: vi.fn(() => Promise.resolve({ data: [], error: null }))
  };
  
  return {
    supabase: mockSupabase
  };
});

import { supabase } from '../../src/supabaseClient';

describe('Servicio de Secuencias', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Resetear el mock para que retorne el objeto para encadenar
    supabase.from.mockReturnValue(supabase);
  });

  describe('getSequences', () => {
    it('debe obtener todas las secuencias de una cuenta', async () => {
      const mockSequences = [
        { id: '1', name: 'Secuencia 1', account_id: 'acc1' },
        { id: '2', name: 'Secuencia 2', account_id: 'acc1' }
      ];

      supabase.order.mockResolvedValueOnce({
        data: mockSequences,
        error: null
      });

      const { data, error } = await getSequences('acc1');

      expect(supabase.from).toHaveBeenCalledWith('whatsapp_sequences');
      expect(supabase.select).toHaveBeenCalledWith('*');
      expect(supabase.eq).toHaveBeenCalledWith('account_id', 'acc1');
      expect(supabase.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(data).toEqual(mockSequences);
      expect(error).toBeNull();
    });

    it('debe manejar errores correctamente', async () => {
      const mockError = { message: 'Error de conexión' };
      supabase.order.mockResolvedValueOnce({
        data: null,
        error: mockError
      });

      const { data, error } = await getSequences('acc1');

      expect(data).toBeNull();
      expect(error).toEqual(mockError);
    });
  });

  describe('getSequenceById', () => {
    it('debe obtener una secuencia por ID', async () => {
      const mockSequence = { id: '1', name: 'Secuencia 1' };
      supabase.single.mockResolvedValueOnce({
        data: mockSequence,
        error: null
      });

      const { data, error } = await getSequenceById('1');

      expect(supabase.from).toHaveBeenCalledWith('whatsapp_sequences');
      expect(supabase.select).toHaveBeenCalledWith('*');
      expect(supabase.eq).toHaveBeenCalledWith('id', '1');
      expect(supabase.single).toHaveBeenCalled();
      expect(data).toEqual(mockSequence);
      expect(error).toBeNull();
    });
  });

  describe('createSequence', () => {
    it('debe crear una nueva secuencia', async () => {
      const sequenceData = {
        account_id: 'acc1',
        name: 'Nueva Secuencia',
        description: 'Descripción',
        active: true
      };

      const mockCreated = { id: '1', ...sequenceData, total_messages: 0 };
      supabase.single.mockResolvedValueOnce({
        data: mockCreated,
        error: null
      });

      const { data, error } = await createSequence(sequenceData);

      expect(supabase.from).toHaveBeenCalledWith('whatsapp_sequences');
      expect(supabase.insert).toHaveBeenCalled();
      expect(data).toEqual(mockCreated);
      expect(error).toBeNull();
    });

    it('debe validar que account_id y name son requeridos', async () => {
      const { data, error } = await createSequence({ name: 'Test' });

      expect(data).toBeNull();
      expect(error).toEqual({ message: 'account_id y name son requeridos' });
    });
  });

  describe('updateSequence', () => {
    it('debe actualizar una secuencia existente', async () => {
      const updates = { name: 'Nombre Actualizado' };
      const mockUpdated = { id: '1', name: 'Nombre Actualizado' };

      supabase.single.mockResolvedValueOnce({
        data: mockUpdated,
        error: null
      });

      const { data, error } = await updateSequence('1', updates);

      expect(supabase.from).toHaveBeenCalledWith('whatsapp_sequences');
      expect(supabase.update).toHaveBeenCalledWith(updates);
      expect(supabase.eq).toHaveBeenCalledWith('id', '1');
      expect(data).toEqual(mockUpdated);
      expect(error).toBeNull();
    });
  });

  describe('deleteSequence', () => {
    it('debe eliminar una secuencia', async () => {
      // delete() retorna el objeto para encadenar, eq() retorna la promesa
      supabase.eq.mockResolvedValueOnce({
        data: null,
        error: null
      });

      const { success, error } = await deleteSequence('1');

      expect(supabase.from).toHaveBeenCalledWith('whatsapp_sequences');
      expect(supabase.delete).toHaveBeenCalled();
      expect(supabase.eq).toHaveBeenCalledWith('id', '1');
      expect(success).toBe(true);
      expect(error).toBeNull();
    });
  });

  describe('getSequenceMessages', () => {
    it('debe obtener todos los mensajes de una secuencia', async () => {
      const mockMessages = [
        { id: '1', message_number: 1, content_text: 'Mensaje 1' },
        { id: '2', message_number: 2, content_text: 'Mensaje 2' }
      ];

      supabase.order.mockResolvedValueOnce({
        data: mockMessages,
        error: null
      });

      const { data, error } = await getSequenceMessages('seq1');

      expect(supabase.from).toHaveBeenCalledWith('whatsapp_sequence_messages');
      expect(supabase.select).toHaveBeenCalledWith('*');
      expect(supabase.eq).toHaveBeenCalledWith('sequence_id', 'seq1');
      expect(supabase.order).toHaveBeenCalledWith('order_position', { ascending: true });
      expect(data).toEqual(mockMessages);
      expect(error).toBeNull();
    });
  });

  describe('addSequenceMessage', () => {
    it('debe agregar un mensaje de texto a una secuencia', async () => {
      // Mock para obtener mensajes existentes (para calcular message_number)
      supabase.range.mockResolvedValueOnce({
        data: [],
        error: null
      });

      // Mock para insertar nuevo mensaje
      const mockMessage = {
        id: '1',
        message_type: 'text',
        content_text: 'Hola',
        message_number: 1
      };
      supabase.single.mockResolvedValueOnce({
        data: mockMessage,
        error: null
      });

      const messageData = {
        message_type: 'text',
        content_text: 'Hola',
        delay_hours_from_previous: 0
      };

      const { data, error } = await addSequenceMessage('seq1', messageData);

      expect(supabase.from).toHaveBeenCalledWith('whatsapp_sequence_messages');
      expect(supabase.insert).toHaveBeenCalled();
      expect(data).toEqual(mockMessage);
      expect(error).toBeNull();
    });

    it('debe validar que los mensajes de texto tienen content_text', async () => {
      supabase.range.mockResolvedValueOnce({
        data: [],
        error: null
      });

      const { data, error } = await addSequenceMessage('seq1', {
        message_type: 'text',
        content_text: ''
      });

      expect(data).toBeNull();
      expect(error).toEqual({ message: 'Los mensajes de texto requieren content_text' });
    });

    it('debe validar que los mensajes de media tienen media_url', async () => {
      supabase.range.mockResolvedValueOnce({
        data: [],
        error: null
      });

      const { data, error } = await addSequenceMessage('seq1', {
        message_type: 'image'
      });

      expect(data).toBeNull();
      expect(error).toEqual({ message: 'Los mensajes de tipo image requieren media_url' });
    });
  });

  describe('updateSequenceMessage', () => {
    it('debe actualizar un mensaje de secuencia', async () => {
      const updates = { content_text: 'Texto actualizado' };
      const mockUpdated = { id: '1', ...updates };

      supabase.single.mockResolvedValueOnce({
        data: mockUpdated,
        error: null
      });

      const { data, error } = await updateSequenceMessage('1', updates);

      expect(supabase.from).toHaveBeenCalledWith('whatsapp_sequence_messages');
      expect(supabase.update).toHaveBeenCalledWith(updates);
      expect(supabase.eq).toHaveBeenCalledWith('id', '1');
      expect(data).toEqual(mockUpdated);
      expect(error).toBeNull();
    });
  });

  describe('deleteSequenceMessage', () => {
    it('debe eliminar un mensaje de secuencia', async () => {
      // delete() retorna el objeto para encadenar, eq() retorna la promesa
      supabase.eq.mockResolvedValueOnce({
        data: null,
        error: null
      });

      const { success, error } = await deleteSequenceMessage('1');

      expect(supabase.from).toHaveBeenCalledWith('whatsapp_sequence_messages');
      expect(supabase.delete).toHaveBeenCalled();
      expect(supabase.eq).toHaveBeenCalledWith('id', '1');
      expect(success).toBe(true);
      expect(error).toBeNull();
    });
  });

  describe('getSequenceWithMessages', () => {
    it('debe obtener una secuencia con sus mensajes', async () => {
      const mockSequence = { id: '1', name: 'Secuencia 1' };
      const mockMessages = [
        { id: '1', message_number: 1, content_text: 'Mensaje 1' }
      ];

      // Mock para getSequenceById
      supabase.single.mockResolvedValueOnce({
        data: mockSequence,
        error: null
      });

      // Mock para getSequenceMessages
      supabase.order.mockResolvedValueOnce({
        data: mockMessages,
        error: null
      });

      const { data, error } = await getSequenceWithMessages('1');

      expect(data).toEqual({
        ...mockSequence,
        messages: mockMessages
      });
      expect(error).toBeNull();
    });
  });
});

