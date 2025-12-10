/**
 * Tests para FASE 8: Validaciones de Servicios
 * 
 * Ejecutar con: npm test -- tests/whatsapp/fase8-validations.test.js
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  addSequenceMessage,
  updateSequenceMessage,
  deleteSequenceMessage
} from '../../src/services/whatsapp/sequences';
import { getSequenceMessages } from '../../src/services/whatsapp/sequences';

// Mock del módulo supabaseClient
vi.mock('../../src/supabaseClient', () => {
  const mockSupabase = {
    from: vi.fn(() => mockSupabase),
    select: vi.fn(() => mockSupabase),
    insert: vi.fn(() => mockSupabase),
    update: vi.fn(() => mockSupabase),
    delete: vi.fn(() => mockSupabase),
    eq: vi.fn(() => mockSupabase),
    order: vi.fn(() => mockSupabase),
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

describe('FASE 8: Validaciones de Servicios', () => {
  const mockSequenceId = 'sequence_123';

  beforeEach(() => {
    vi.clearAllMocks();
    supabase.from.mockReturnValue(supabase);
    supabase.select.mockReturnValue(supabase);
    supabase.insert.mockReturnValue(supabase);
    supabase.update.mockReturnValue(supabase);
    supabase.delete.mockReturnValue(supabase);
    supabase.eq.mockReturnValue(supabase);
    supabase.order.mockReturnValue(supabase);
    supabase.single.mockResolvedValue({ data: null, error: null });
    getSequenceMessages.mockResolvedValue({ data: [], error: null });
  });

  describe('SUBFASE 8.1: Validaciones en addSequenceMessage', () => {
    it('debe rechazar step_type inválido', async () => {
      const invalidData = {
        step_type: 'invalid_type',
        message_type: 'text',
        content_text: 'Hola'
      };

      const { data, error } = await addSequenceMessage(mockSequenceId, invalidData);

      expect(data).toBeNull();
      expect(error).toBeTruthy();
      expect(error.message).toContain('step_type debe ser uno de: message, pause, stage_change');
    });

    it('debe validar que mensajes requieren message_type', async () => {
      const messageData = {
        step_type: 'message',
        content_text: 'Hola'
        // Falta message_type
      };

      const { data, error } = await addSequenceMessage(mockSequenceId, messageData);

      expect(data).toBeNull();
      expect(error).toBeTruthy();
      expect(error.message).toContain('message_type debe ser uno de');
    });

    it('debe validar que mensajes de texto requieren content_text', async () => {
      const messageData = {
        step_type: 'message',
        message_type: 'text'
        // Falta content_text
      };

      const { data, error } = await addSequenceMessage(mockSequenceId, messageData);

      expect(data).toBeNull();
      expect(error).toBeTruthy();
      expect(error.message).toContain('requieren content_text');
    });

    it('debe validar que pausas requieren pause_type', async () => {
      const pauseData = {
        step_type: 'pause',
        delay_hours_from_previous: 1
        // Falta pause_type
      };

      const { data, error } = await addSequenceMessage(mockSequenceId, pauseData);

      expect(data).toBeNull();
      expect(error).toBeTruthy();
      expect(error.message).toContain('Las pausas requieren un pause_type');
    });

    it('debe validar que cambios de etapa requieren target_stage_name', async () => {
      const stageChangeData = {
        step_type: 'stage_change'
        // Falta target_stage_name
      };

      const { data, error } = await addSequenceMessage(mockSequenceId, stageChangeData);

      expect(data).toBeNull();
      expect(error).toBeTruthy();
      expect(error.message).toContain('Los cambios de etapa requieren target_stage_name');
    });

    it('debe aceptar mensaje válido', async () => {
      const messageData = {
        step_type: 'message',
        message_type: 'text',
        content_text: 'Hola',
        delay_hours_from_previous: 0
      };

      supabase.single.mockResolvedValueOnce({
        data: { id: 'msg_1', ...messageData, sequence_id: mockSequenceId, message_number: 1, order_position: 1, active: true },
        error: null
      });

      const { data, error } = await addSequenceMessage(mockSequenceId, messageData);

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(data.step_type).toBe('message');
    });

    it('debe aceptar pausa válida', async () => {
      const pauseData = {
        step_type: 'pause',
        pause_type: 'fixed_delay',
        delay_hours_from_previous: 1.0
      };

      supabase.single.mockResolvedValueOnce({
        data: { id: 'pause_1', ...pauseData, sequence_id: mockSequenceId, message_number: 1, order_position: 1, active: true },
        error: null
      });

      const { data, error } = await addSequenceMessage(mockSequenceId, pauseData);

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(data.step_type).toBe('pause');
    });

    it('debe aceptar cambio de etapa válido', async () => {
      const stageChangeData = {
        step_type: 'stage_change',
        target_stage_name: 'Seguimiento'
      };

      supabase.single.mockResolvedValueOnce({
        data: { id: 'stage_change_1', ...stageChangeData, sequence_id: mockSequenceId, message_number: 1, order_position: 1, active: true },
        error: null
      });

      const { data, error } = await addSequenceMessage(mockSequenceId, stageChangeData);

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(data.step_type).toBe('stage_change');
      expect(data.target_stage_name).toBe('Seguimiento');
    });
  });

  describe('SUBFASE 8.2: Validaciones en updateSequenceMessage', () => {
    it('debe rechazar step_type inválido al actualizar', async () => {
      const currentMessage = {
        id: 'msg_1',
        step_type: 'message',
        message_type: 'text',
        content_text: 'Hola'
      };

      supabase.single.mockResolvedValueOnce({
        data: currentMessage,
        error: null
      });

      const updates = {
        step_type: 'invalid_type'
      };

      const { data, error } = await updateSequenceMessage('msg_1', updates);

      expect(data).toBeNull();
      expect(error).toBeTruthy();
      expect(error.message).toContain('step_type debe ser uno de: message, pause, stage_change');
    });

    it('debe validar al cambiar de mensaje a pausa', async () => {
      const currentMessage = {
        id: 'msg_1',
        step_type: 'message',
        message_type: 'text',
        content_text: 'Hola',
        pause_type: null
      };

      supabase.single
        .mockResolvedValueOnce({ data: currentMessage, error: null }) // Primera llamada: obtener mensaje actual
        .mockResolvedValueOnce({ data: { ...currentMessage, step_type: 'pause' }, error: null }); // Segunda llamada: actualizar

      const updates = {
        step_type: 'pause'
        // Falta pause_type
      };

      const { data, error } = await updateSequenceMessage('msg_1', updates);

      // Debe rechazar porque falta pause_type
      expect(data).toBeNull();
      expect(error).toBeTruthy();
      expect(error.message).toContain('Las pausas requieren un pause_type');
    });

    it('debe validar al cambiar de mensaje a cambio de etapa', async () => {
      const currentMessage = {
        id: 'msg_1',
        step_type: 'message',
        message_type: 'text',
        content_text: 'Hola',
        target_stage_name: null
      };

      supabase.single.mockResolvedValueOnce({
        data: currentMessage,
        error: null
      });

      const updates = {
        step_type: 'stage_change'
        // Falta target_stage_name
      };

      const { data, error } = await updateSequenceMessage('msg_1', updates);

      expect(data).toBeNull();
      expect(error).toBeTruthy();
      expect(error.message).toContain('Los cambios de etapa requieren target_stage_name');
    });

    it('debe limpiar campos inválidos al cambiar tipo de paso', async () => {
      const currentMessage = {
        id: 'msg_1',
        step_type: 'message',
        message_type: 'text',
        content_text: 'Hola',
        pause_type: null,
        target_stage_name: null
      };

      const updatedMessage = {
        ...currentMessage,
        step_type: 'pause',
        pause_type: 'fixed_delay',
        message_type: null,
        content_text: null,
        delay_hours_from_previous: 1.0
      };

      supabase.single
        .mockResolvedValueOnce({ data: currentMessage, error: null }) // Primera: obtener mensaje actual
        .mockResolvedValueOnce({ data: updatedMessage, error: null }); // Segunda: después de update

      const updates = {
        step_type: 'pause',
        pause_type: 'fixed_delay',
        delay_hours_from_previous: 1.0
      };

      const { data, error } = await updateSequenceMessage('msg_1', updates);

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(data.step_type).toBe('pause');

      // Verificar que se limpien campos de mensaje en la llamada a update
      expect(supabase.update).toHaveBeenCalled();
      const updateCall = supabase.update.mock.calls[0][0];
      expect(updateCall.message_type).toBeNull();
      expect(updateCall.content_text).toBeNull();
    });

    it('debe actualizar mensaje válido correctamente', async () => {
      const currentMessage = {
        id: 'msg_1',
        step_type: 'message',
        message_type: 'text',
        content_text: 'Hola'
      };

      const updatedMessage = {
        ...currentMessage,
        content_text: 'Hola actualizado'
      };

      supabase.single
        .mockResolvedValueOnce({ data: currentMessage, error: null }) // Primera: obtener mensaje actual
        .mockResolvedValueOnce({ data: updatedMessage, error: null }); // Segunda: después de update

      const updates = {
        content_text: 'Hola actualizado'
      };

      const { data, error } = await updateSequenceMessage('msg_1', updates);

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(data.content_text).toBe('Hola actualizado');
    });

    it('debe rechazar mensaje de texto sin content_text al actualizar', async () => {
      const currentMessage = {
        id: 'msg_1',
        step_type: 'message',
        message_type: 'text',
        content_text: 'Hola'
      };

      supabase.single.mockResolvedValueOnce({
        data: currentMessage,
        error: null
      });

      const updates = {
        content_text: '' // Vacío
      };

      const { data, error } = await updateSequenceMessage('msg_1', updates);

      expect(data).toBeNull();
      expect(error).toBeTruthy();
      expect(error.message).toContain('requieren content_text');
    });

    it('debe rechazar mensaje de imagen sin media_url al actualizar', async () => {
      const currentMessage = {
        id: 'msg_1',
        step_type: 'message',
        message_type: 'image',
        media_url: 'https://example.com/image.jpg'
      };

      supabase.single.mockResolvedValueOnce({
        data: currentMessage,
        error: null
      });

      const updates = {
        media_url: '' // Vacío o string vacío
      };

      const { data, error } = await updateSequenceMessage('msg_1', updates);

      expect(data).toBeNull();
      expect(error).toBeTruthy();
      expect(error.message).toContain('requieren media_url');
    });
  });

  describe('SUBFASE 8.3: Campos NULL según tipo de paso', () => {
    it('debe establecer message_type como NULL para pausas en addSequenceMessage', async () => {
      const pauseData = {
        step_type: 'pause',
        pause_type: 'fixed_delay',
        delay_hours_from_previous: 1.0,
        message_type: 'text' // Esto debería ser ignorado
      };

      supabase.single.mockResolvedValueOnce({
        data: { id: 'pause_1', ...pauseData, message_type: null, sequence_id: mockSequenceId, message_number: 1, order_position: 1, active: true },
        error: null
      });

      const { data, error } = await addSequenceMessage(mockSequenceId, pauseData);

      expect(error).toBeNull();
      expect(data).toBeTruthy();

      // Verificar que se insertó con message_type = null
      const insertCall = supabase.insert.mock.calls[0][0];
      expect(insertCall.message_type).toBeNull();
      expect(insertCall.step_type).toBe('pause');
    });

    it('debe establecer campos de mensaje como NULL para cambios de etapa en addSequenceMessage', async () => {
      const stageChangeData = {
        step_type: 'stage_change',
        target_stage_name: 'Seguimiento',
        message_type: 'text', // Esto debería ser ignorado
        content_text: 'Hola' // Esto debería ser ignorado
      };

      supabase.single.mockResolvedValueOnce({
        data: { id: 'stage_change_1', ...stageChangeData, message_type: null, content_text: null, sequence_id: mockSequenceId, message_number: 1, order_position: 1, active: true },
        error: null
      });

      const { data, error } = await addSequenceMessage(mockSequenceId, stageChangeData);

      expect(error).toBeNull();
      expect(data).toBeTruthy();

      // Verificar que se insertó con campos de mensaje = null
      const insertCall = supabase.insert.mock.calls[0][0];
      expect(insertCall.message_type).toBeNull();
      expect(insertCall.content_text).toBeNull();
      expect(insertCall.step_type).toBe('stage_change');
    });

    it('debe limpiar campos al cambiar de mensaje a pausa en updateSequenceMessage', async () => {
      const currentMessage = {
        id: 'msg_1',
        step_type: 'message',
        message_type: 'text',
        content_text: 'Hola',
        pause_type: null
      };

      supabase.single
        .mockResolvedValueOnce({ data: currentMessage, error: null })
        .mockResolvedValueOnce({ 
          data: { ...currentMessage, step_type: 'pause', message_type: null, content_text: null, pause_type: 'fixed_delay' }, 
          error: null 
        });

      const updates = {
        step_type: 'pause',
        pause_type: 'fixed_delay',
        delay_hours_from_previous: 1.0
      };

      await updateSequenceMessage('msg_1', updates);

      // Verificar que se limpiaron campos de mensaje
      const updateCall = supabase.update.mock.calls[0][0];
      expect(updateCall.message_type).toBeNull();
      expect(updateCall.content_text).toBeNull();
      expect(updateCall.pause_type).toBe('fixed_delay');
    });
  });
});

