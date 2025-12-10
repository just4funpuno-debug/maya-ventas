/**
 * Tests para FASE 3: Flujos Flexibles - Pausas Independientes
 * 
 * Ejecutar con: npm test -- tests/whatsapp/fase3-flexible-flow-pauses.test.js
 * O con Vitest: npx vitest tests/whatsapp/fase3-flexible-flow-pauses.test.js
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  addSequenceMessage,
  updateSequenceMessage,
  getSequenceMessages
} from '../../src/services/whatsapp/sequences';

// Mock del módulo supabaseClient
vi.mock('../../src/supabaseClient', () => {
  const mockSupabase = {
    from: vi.fn(() => mockSupabase),
    select: vi.fn(() => mockSupabase),
    insert: vi.fn(() => mockSupabase),
    update: vi.fn(() => mockSupabase),
    eq: vi.fn(() => mockSupabase),
    order: vi.fn(() => Promise.resolve({ data: [], error: null })),
    single: vi.fn(() => Promise.resolve({ data: null, error: null }))
  };
  
  return {
    supabase: mockSupabase
  };
});

// Mock de getSequenceMessages para addSequenceMessage
vi.mock('../../src/services/whatsapp/sequences', async () => {
  const actual = await vi.importActual('../../src/services/whatsapp/sequences');
  return {
    ...actual,
    getSequenceMessages: vi.fn()
  };
});

import { supabase } from '../../src/supabaseClient';

describe('FASE 3: Flujos Flexibles - Pausas Independientes', () => {
  const mockSequenceId = 'sequence_123';

  beforeEach(() => {
    vi.clearAllMocks();
    supabase.from.mockReturnValue(supabase);
    supabase.select.mockReturnValue(supabase);
    supabase.insert.mockReturnValue(supabase);
    supabase.update.mockReturnValue(supabase);
    supabase.eq.mockReturnValue(supabase);
    
    // Mock de getSequenceMessages por defecto (secuencia vacía)
    getSequenceMessages.mockResolvedValue({ data: [] });
  });

  describe('SUBFASE 3.1: Crear Pausas Independientes', () => {
    it('debe crear una pausa con delay fijo (fixed_delay)', async () => {
      const pauseData = {
        step_type: 'pause',
        pause_type: 'fixed_delay',
        delay_hours_from_previous: 1.5, // 1 hora 30 minutos = 1.5 horas
      };

      const mockInsertedPause = {
        id: 'pause_123',
        sequence_id: mockSequenceId,
        step_type: 'pause',
        message_type: null,
        pause_type: 'fixed_delay',
        delay_hours_from_previous: 1.5,
        content_text: null,
        message_number: 1,
        order_position: 1,
        active: true
      };

      supabase.single.mockResolvedValueOnce({
        data: mockInsertedPause,
        error: null
      });

      const { data, error } = await addSequenceMessage(mockSequenceId, pauseData);

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(data.step_type).toBe('pause');
      expect(data.message_type).toBeNull();
      expect(data.pause_type).toBe('fixed_delay');
      expect(data.delay_hours_from_previous).toBe(1.5);
      expect(data.content_text).toBeNull();

      // Verificar que se insertó con los datos correctos
      expect(supabase.insert).toHaveBeenCalled();
      const insertCall = supabase.insert.mock.calls[0][0];
      expect(insertCall.step_type).toBe('pause');
      expect(insertCall.message_type).toBeNull();
      expect(insertCall.pause_type).toBe('fixed_delay');
    });

    it('debe crear una pausa que espera mensaje del cliente (until_message)', async () => {
      const pauseData = {
        step_type: 'pause',
        pause_type: 'until_message',
        delay_hours_from_previous: 0,
      };

      const mockInsertedPause = {
        id: 'pause_456',
        sequence_id: mockSequenceId,
        step_type: 'pause',
        message_type: null,
        pause_type: 'until_message',
        delay_hours_from_previous: 0,
        content_text: null,
        message_number: 1,
        order_position: 1,
        active: true
      };

      supabase.single.mockResolvedValueOnce({
        data: mockInsertedPause,
        error: null
      });

      const { data, error } = await addSequenceMessage(mockSequenceId, pauseData);

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(data.step_type).toBe('pause');
      expect(data.pause_type).toBe('until_message');
      expect(data.message_type).toBeNull();
    });

    it('debe crear una pausa que espera días sin respuesta (until_days_without_response)', async () => {
      const pauseData = {
        step_type: 'pause',
        pause_type: 'until_days_without_response',
        days_without_response: 3,
        delay_hours_from_previous: 0,
      };

      const mockInsertedPause = {
        id: 'pause_789',
        sequence_id: mockSequenceId,
        step_type: 'pause',
        message_type: null,
        pause_type: 'until_days_without_response',
        days_without_response: 3,
        delay_hours_from_previous: 0,
        content_text: null,
        message_number: 1,
        order_position: 1,
        active: true
      };

      supabase.single.mockResolvedValueOnce({
        data: mockInsertedPause,
        error: null
      });

      const { data, error } = await addSequenceMessage(mockSequenceId, pauseData);

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(data.step_type).toBe('pause');
      expect(data.pause_type).toBe('until_days_without_response');
      expect(data.days_without_response).toBe(3);
      expect(data.message_type).toBeNull();
    });

    it('debe rechazar una pausa sin pause_type', async () => {
      const pauseData = {
        step_type: 'pause',
        // pause_type faltante
        delay_hours_from_previous: 1,
      };

      const { data, error } = await addSequenceMessage(mockSequenceId, pauseData);

      expect(data).toBeNull();
      expect(error).toBeTruthy();
      expect(error.message).toContain('requieren un pause_type');
      
      // Verificar que NO se intentó insertar
      expect(supabase.insert).not.toHaveBeenCalled();
    });

    it('debe rechazar un step_type inválido', async () => {
      const invalidData = {
        step_type: 'invalid_type',
        pause_type: 'fixed_delay',
      };

      const { data, error } = await addSequenceMessage(mockSequenceId, invalidData);

      expect(data).toBeNull();
      expect(error).toBeTruthy();
      expect(error.message).toContain('step_type debe ser uno de');
      
      expect(supabase.insert).not.toHaveBeenCalled();
    });
  });

  describe('SUBFASE 3.2: Actualizar Pausas Existentes', () => {
    it('debe actualizar una pausa existente', async () => {
      const existingPauseId = 'pause_existing_123';
      const updatedPauseData = {
        step_type: 'pause',
        pause_type: 'fixed_delay',
        delay_hours_from_previous: 2.5, // Cambiado de 1.5 a 2.5
      };

      const mockUpdatedPause = {
        id: existingPauseId,
        sequence_id: mockSequenceId,
        step_type: 'pause',
        message_type: null,
        pause_type: 'fixed_delay',
        delay_hours_from_previous: 2.5,
        content_text: null,
        message_number: 1,
        order_position: 1,
        active: true
      };

      supabase.single.mockResolvedValueOnce({
        data: mockUpdatedPause,
        error: null
      });

      const { data, error } = await updateSequenceMessage(existingPauseId, updatedPauseData);

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(data.step_type).toBe('pause');
      expect(data.delay_hours_from_previous).toBe(2.5);
      expect(data.message_type).toBeNull();

      // Verificar que se actualizó
      expect(supabase.update).toHaveBeenCalled();
      const updateCall = supabase.update.mock.calls[0][0];
      expect(updateCall.step_type).toBe('pause');
      // message_type puede no estar presente en updates si no se incluye explícitamente
      // La validación ocurre en addSequenceMessage, no en updateSequenceMessage
    });

    it('debe cambiar el tipo de pausa de fixed_delay a until_message', async () => {
      const existingPauseId = 'pause_existing_456';
      const updatedPauseData = {
        step_type: 'pause',
        pause_type: 'until_message',
        delay_hours_from_previous: 0,
      };

      const mockUpdatedPause = {
        id: existingPauseId,
        step_type: 'pause',
        pause_type: 'until_message',
        delay_hours_from_previous: 0,
        message_type: null,
      };

      supabase.single.mockResolvedValueOnce({
        data: mockUpdatedPause,
        error: null
      });

      const { data, error } = await updateSequenceMessage(existingPauseId, updatedPauseData);

      expect(error).toBeNull();
      expect(data.pause_type).toBe('until_message');
      expect(data.delay_hours_from_previous).toBe(0);
    });
  });

  describe('SUBFASE 3.3: Validaciones de Pausas', () => {
    it('debe asegurar que message_type es NULL para pausas', async () => {
      const pauseData = {
        step_type: 'pause',
        pause_type: 'fixed_delay',
        delay_hours_from_previous: 1,
        message_type: 'text', // Intento de incluir message_type
        content_text: 'Este texto no debería guardarse'
      };

      const mockInsertedPause = {
        id: 'pause_validated_123',
        sequence_id: mockSequenceId,
        step_type: 'pause',
        message_type: null, // Debe ser NULL aunque se pase 'text'
        pause_type: 'fixed_delay',
        content_text: null, // Debe ser NULL aunque se pase contenido
      };

      supabase.single.mockResolvedValueOnce({
        data: mockInsertedPause,
        error: null
      });

      const { data } = await addSequenceMessage(mockSequenceId, pauseData);

      // Verificar que se ignoró message_type y content_text
      expect(data.message_type).toBeNull();
      expect(data.content_text).toBeNull();
      
      // Verificar que el INSERT recibió NULL
      const insertCall = supabase.insert.mock.calls[0][0];
      expect(insertCall.message_type).toBeNull();
      expect(insertCall.content_text).toBeNull();
    });

    it('debe validar que pause_type es requerido al crear pausa', async () => {
      const pauseDataWithoutType = {
        step_type: 'pause',
        delay_hours_from_previous: 1,
        // pause_type faltante
      };

      const { data, error } = await addSequenceMessage(mockSequenceId, pauseDataWithoutType);

      expect(data).toBeNull();
      expect(error).toBeTruthy();
      expect(error.message).toContain('requieren un pause_type');
    });
  });

  describe('SUBFASE 3.4: Integración - Pausas y Mensajes', () => {
    it('debe permitir crear una secuencia con mensaje, pausa y mensaje', async () => {
      // 1. Crear mensaje inicial
      getSequenceMessages.mockResolvedValueOnce({ data: [] });
      
      const message1Data = {
        step_type: 'message',
        message_type: 'text',
        content_text: 'Primer mensaje',
        delay_hours_from_previous: 0,
      };

      const mockMessage1 = {
        id: 'msg_1',
        step_type: 'message',
        message_type: 'text',
        content_text: 'Primer mensaje',
        message_number: 1,
        order_position: 1,
      };

      supabase.single.mockResolvedValueOnce({
        data: mockMessage1,
        error: null
      });

      const { data: msg1 } = await addSequenceMessage(mockSequenceId, message1Data);
      expect(msg1.step_type).toBe('message');

      // 2. Agregar pausa después del mensaje
      getSequenceMessages.mockResolvedValueOnce({
        data: [mockMessage1]
      });

      const pauseData = {
        step_type: 'pause',
        pause_type: 'fixed_delay',
        delay_hours_from_previous: 2.0,
      };

      const mockPause = {
        id: 'pause_1',
        step_type: 'pause',
        pause_type: 'fixed_delay',
        delay_hours_from_previous: 2.0,
        message_number: 2,
        order_position: 2,
      };

      supabase.single.mockResolvedValueOnce({
        data: mockPause,
        error: null
      });

      const { data: pause1 } = await addSequenceMessage(mockSequenceId, pauseData);
      expect(pause1.step_type).toBe('pause');

      // 3. Agregar segundo mensaje después de la pausa
      getSequenceMessages.mockResolvedValueOnce({
        data: [mockMessage1, mockPause]
      });

      const message2Data = {
        step_type: 'message',
        message_type: 'text',
        content_text: 'Segundo mensaje después de pausa',
        delay_hours_from_previous: 0,
      };

      const mockMessage2 = {
        id: 'msg_2',
        step_type: 'message',
        message_type: 'text',
        content_text: 'Segundo mensaje después de pausa',
        message_number: 3,
        order_position: 3,
      };

      supabase.single.mockResolvedValueOnce({
        data: mockMessage2,
        error: null
      });

      const { data: msg2 } = await addSequenceMessage(mockSequenceId, message2Data);
      expect(msg2.step_type).toBe('message');

      // Verificar que todos los pasos fueron creados correctamente
      expect(supabase.insert).toHaveBeenCalledTimes(3);
    });
  });

  describe('SUBFASE 3.5: Conversión de Horas Decimales a HH:MM', () => {
    it('debe guardar correctamente delay en horas decimales', async () => {
      // 1.5 horas = 1 hora 30 minutos
      const pauseData = {
        step_type: 'pause',
        pause_type: 'fixed_delay',
        delay_hours_from_previous: 1.5,
      };

      const mockPause = {
        id: 'pause_time_123',
        delay_hours_from_previous: 1.5,
      };

      supabase.single.mockResolvedValueOnce({
        data: mockPause,
        error: null
      });

      const { data } = await addSequenceMessage(mockSequenceId, pauseData);

      // Verificar que se guardó en horas decimales
      expect(data.delay_hours_from_previous).toBe(1.5);
      
      // Verificar en el INSERT
      const insertCall = supabase.insert.mock.calls[0][0];
      expect(insertCall.delay_hours_from_previous).toBe(1.5);
    });

    it('debe manejar delays largos (días completos)', async () => {
      // 48 horas = 2 días
      const pauseData = {
        step_type: 'pause',
        pause_type: 'fixed_delay',
        delay_hours_from_previous: 48,
      };

      const mockPause = {
        id: 'pause_long_123',
        delay_hours_from_previous: 48,
      };

      supabase.single.mockResolvedValueOnce({
        data: mockPause,
        error: null
      });

      const { data } = await addSequenceMessage(mockSequenceId, pauseData);
      expect(data.delay_hours_from_previous).toBe(48);
    });
  });
});

