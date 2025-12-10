# 🎯 Plan: Asignar Secuencia a un Lead

## 📋 Situación Actual

### ✅ **Lo que YA existe:**
1. **Secuencias** se pueden asignar a **Contactos** (`whatsapp_contacts`)
   - Campos: `sequence_active`, `sequence_id`, `sequence_position`, `sequence_started_at`
   - Sistema de automatización funcionando (cron job)

2. **Leads** están relacionados con **Contactos** 
   - `whatsapp_leads.contact_id` → `whatsapp_contacts.id`
   - Un lead siempre tiene un contacto asociado

3. **Funcionalidades de secuencias:**
   - Crear/editar secuencias
   - Mensajes con pausas inteligentes
   - Condiciones y ramificaciones
   - Envío automático vía cron job

### ❌ **Lo que NO existe:**
- ❌ Asignar secuencia directamente desde un Lead
- ❌ Ver estado de secuencia en el modal del Lead
- ❌ Iniciar/pausar/detener secuencia desde Lead
- ❌ Visualizar progreso de secuencia en Lead

---

## 🎯 Objetivo

Permitir asignar una **secuencia automática de mensajes** a un lead, de forma que:
1. El lead pueda iniciar una secuencia automática
2. Se vea el estado de la secuencia en el modal del lead
3. Se pueda pausar/retomar/detener la secuencia desde el lead
4. La secuencia se ejecute automáticamente sobre el contacto asociado

---

## 🔄 Flujo Propuesto

```
Lead (CRM) → Contacto → Secuencia Activa → Mensajes Automáticos
```

**Lógica:**
- Asignar secuencia al **contacto** asociado al lead
- Mostrar y gestionar desde el **lead** (UI/UX)
- La secuencia corre automáticamente en el cron job

---

## 📋 Implementación

### **FASE 1: Servicio Backend** ⏱️ 1-2 días

#### 1.1: Función para asignar secuencia a Lead

**Archivo:** `src/services/whatsapp/leads.js` (agregar)

```javascript
/**
 * Asignar secuencia a un lead
 * Esto asigna la secuencia al contacto asociado al lead
 * 
 * @param {string} leadId - ID del lead
 * @param {string} sequenceId - ID de la secuencia a asignar
 * @param {string} userId - ID del usuario que hace la asignación
 * @returns {Promise<{success: boolean, error: Object|null}>}
 */
export async function assignSequenceToLead(leadId, sequenceId, userId = null) {
  try {
    // 1. Obtener el lead y su contacto
    const { data: lead, error: leadError } = await supabase
      .from('whatsapp_leads')
      .select('id, contact_id, account_id')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      return { success: false, error: leadError || { message: 'Lead no encontrado' } };
    }

    if (!lead.contact_id) {
      return { success: false, error: { message: 'Lead sin contacto asociado' } };
    }

    // 2. Verificar que la secuencia existe y pertenece a la misma cuenta
    const { data: sequence, error: seqError } = await supabase
      .from('whatsapp_sequences')
      .select('id, account_id, active')
      .eq('id', sequenceId)
      .single();

    if (seqError || !sequence) {
      return { success: false, error: seqError || { message: 'Secuencia no encontrada' } };
    }

    if (sequence.account_id !== lead.account_id) {
      return { success: false, error: { message: 'La secuencia no pertenece a la misma cuenta del lead' } };
    }

    if (!sequence.active) {
      return { success: false, error: { message: 'La secuencia no está activa' } };
    }

    // 3. Asignar secuencia al contacto
    const { error: assignError } = await supabase
      .from('whatsapp_contacts')
      .update({
        sequence_id: sequenceId,
        sequence_active: true,
        sequence_position: 0, // Empezar desde el principio
        sequence_started_at: new Date().toISOString()
      })
      .eq('id', lead.contact_id);

    if (assignError) {
      console.error('[assignSequenceToLead] Error asignando secuencia:', assignError);
      return { success: false, error: assignError };
    }

    // 4. Registrar actividad en el lead
    await addLeadActivity(leadId, {
      type: 'stage_change',
      content: `Secuencia "${sequence.name || sequenceId}" asignada automáticamente`,
      user_id: userId,
      metadata: { sequence_id: sequenceId, action: 'assigned' }
    });

    return { success: true, error: null };
  } catch (err) {
    console.error('[assignSequenceToLead] Error fatal:', err);
    return { success: false, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Obtener información de secuencia de un lead
 * 
 * @param {string} leadId - ID del lead
 * @returns {Promise<{data: Object|null, error: Object|null}>}
 */
export async function getLeadSequence(leadId) {
  try {
    // 1. Obtener el lead y su contacto
    const { data: lead, error: leadError } = await supabase
      .from('whatsapp_leads')
      .select('id, contact_id')
      .eq('id', leadId)
      .single();

    if (leadError || !lead || !lead.contact_id) {
      return { data: null, error: leadError || { message: 'Lead no encontrado o sin contacto' } };
    }

    // 2. Obtener información del contacto y su secuencia
    const { data: contact, error: contactError } = await supabase
      .from('whatsapp_contacts')
      .select(`
        id,
        sequence_active,
        sequence_id,
        sequence_position,
        sequence_started_at,
        whatsapp_sequences (
          id,
          name,
          active,
          total_messages
        )
      `)
      .eq('id', lead.contact_id)
      .single();

    if (contactError || !contact) {
      return { data: null, error: contactError || { message: 'Contacto no encontrado' } };
    }

    if (!contact.sequence_active || !contact.sequence_id) {
      return { data: null, error: null }; // No hay secuencia asignada
    }

    return {
      data: {
        active: contact.sequence_active,
        sequence_id: contact.sequence_id,
        position: contact.sequence_position,
        started_at: contact.sequence_started_at,
        sequence: contact.whatsapp_sequences
      },
      error: null
    };
  } catch (err) {
    console.error('[getLeadSequence] Error fatal:', err);
    return { data: null, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Pausar secuencia de un lead
 * 
 * @param {string} leadId - ID del lead
 * @param {string} userId - ID del usuario
 * @returns {Promise<{success: boolean, error: Object|null}>}
 */
export async function pauseLeadSequence(leadId, userId = null) {
  try {
    // 1. Obtener el lead y su contacto
    const { data: lead, error: leadError } = await supabase
      .from('whatsapp_leads')
      .select('id, contact_id')
      .eq('id', leadId)
      .single();

    if (leadError || !lead || !lead.contact_id) {
      return { success: false, error: leadError || { message: 'Lead no encontrado' } };
    }

    // 2. Pausar secuencia en el contacto
    const { error: pauseError } = await supabase
      .from('whatsapp_contacts')
      .update({ sequence_active: false })
      .eq('id', lead.contact_id);

    if (pauseError) {
      return { success: false, error: pauseError };
    }

    // 3. Registrar actividad
    await addLeadActivity(leadId, {
      type: 'note',
      content: 'Secuencia pausada',
      user_id: userId,
      metadata: { action: 'sequence_paused' }
    });

    return { success: true, error: null };
  } catch (err) {
    console.error('[pauseLeadSequence] Error fatal:', err);
    return { success: false, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Retomar secuencia de un lead
 * 
 * @param {string} leadId - ID del lead
 * @param {string} userId - ID del usuario
 * @returns {Promise<{success: boolean, error: Object|null}>}
 */
export async function resumeLeadSequence(leadId, userId = null) {
  try {
    // Similar a pauseLeadSequence pero con sequence_active: true
    const { data: lead, error: leadError } = await supabase
      .from('whatsapp_leads')
      .select('id, contact_id')
      .eq('id', leadId)
      .single();

    if (leadError || !lead || !lead.contact_id) {
      return { success: false, error: leadError || { message: 'Lead no encontrado' } };
    }

    // Verificar que tenga sequence_id
    const { data: contact, error: contactError } = await supabase
      .from('whatsapp_contacts')
      .select('sequence_id')
      .eq('id', lead.contact_id)
      .single();

    if (contactError || !contact || !contact.sequence_id) {
      return { success: false, error: { message: 'El contacto no tiene secuencia asignada' } };
    }

    const { error: resumeError } = await supabase
      .from('whatsapp_contacts')
      .update({ sequence_active: true })
      .eq('id', lead.contact_id);

    if (resumeError) {
      return { success: false, error: resumeError };
    }

    await addLeadActivity(leadId, {
      type: 'note',
      content: 'Secuencia retomada',
      user_id: userId,
      metadata: { action: 'sequence_resumed' }
    });

    return { success: true, error: null };
  } catch (err) {
    console.error('[resumeLeadSequence] Error fatal:', err);
    return { success: false, error: { message: err.message || 'Error desconocido' } };
  }
}

/**
 * Detener secuencia de un lead
 * 
 * @param {string} leadId - ID del lead
 * @param {string} userId - ID del usuario
 * @returns {Promise<{success: boolean, error: Object|null}>}
 */
export async function stopLeadSequence(leadId, userId = null) {
  try {
    const { data: lead, error: leadError } = await supabase
      .from('whatsapp_leads')
      .select('id, contact_id')
      .eq('id', leadId)
      .single();

    if (leadError || !lead || !lead.contact_id) {
      return { success: false, error: leadError || { message: 'Lead no encontrado' } };
    }

    // Obtener sequence_id antes de eliminarlo
    const { data: contact, error: contactError } = await supabase
      .from('whatsapp_contacts')
      .select('sequence_id')
      .eq('id', lead.contact_id)
      .single();

    const sequenceId = contact?.sequence_id;

    // Detener y limpiar secuencia
    const { error: stopError } = await supabase
      .from('whatsapp_contacts')
      .update({
        sequence_active: false,
        sequence_id: null,
        sequence_position: 0,
        sequence_started_at: null
      })
      .eq('id', lead.contact_id);

    if (stopError) {
      return { success: false, error: stopError };
    }

    await addLeadActivity(leadId, {
      type: 'note',
      content: 'Secuencia detenida',
      user_id: userId,
      metadata: { action: 'sequence_stopped', sequence_id: sequenceId }
    });

    return { success: true, error: null };
  } catch (err) {
    console.error('[stopLeadSequence] Error fatal:', err);
    return { success: false, error: { message: err.message || 'Error desconocido' } };
  }
}
```

---

### **FASE 2: UI en Modal de Lead** ⏱️ 2-3 días

#### 2.1: Sección de Secuencia en `LeadDetailModal.jsx`

**Agregar sección nueva:**

```jsx
// En LeadDetailModal.jsx

import { Play, Pause, Square, Zap } from 'lucide-react';
import { 
  assignSequenceToLead, 
  getLeadSequence, 
  pauseLeadSequence, 
  resumeLeadSequence, 
  stopLeadSequence 
} from '../../services/whatsapp/leads';
import { getSequences } from '../../services/whatsapp/sequences';

// Estados nuevos:
const [leadSequence, setLeadSequence] = useState(null);
const [loadingSequence, setLoadingSequence] = useState(false);
const [showSequenceSelector, setShowSequenceSelector] = useState(false);
const [availableSequences, setAvailableSequences] = useState([]);
const [selectingSequence, setSelectingSequence] = useState(false);

// Cargar información de secuencia cuando se carga el lead
useEffect(() => {
  if (lead && lead.id) {
    loadLeadSequence();
  }
}, [lead?.id]);

// Cargar secuencias disponibles cuando se abre el selector
useEffect(() => {
  if (showSequenceSelector && lead?.account_id) {
    loadAvailableSequences();
  }
}, [showSequenceSelector, lead?.account_id]);

const loadLeadSequence = async () => {
  try {
    setLoadingSequence(true);
    const { data, error } = await getLeadSequence(lead.id);
    if (error && error.message !== 'Lead no encontrado o sin contacto') {
      console.error('[LeadDetailModal] Error cargando secuencia:', error);
      return;
    }
    setLeadSequence(data);
  } catch (err) {
    console.error('[LeadDetailModal] Error fatal:', err);
  } finally {
    setLoadingSequence(false);
  }
};

const loadAvailableSequences = async () => {
  try {
    const { data, error } = await getSequences(lead.account_id, userSkus);
    if (error) {
      toast.push({
        type: 'error',
        title: 'Error',
        message: 'No se pudieron cargar las secuencias'
      });
      return;
    }
    // Filtrar solo secuencias activas
    setAvailableSequences((data || []).filter(s => s.active));
  } catch (err) {
    console.error('[LeadDetailModal] Error cargando secuencias:', err);
  }
};

const handleAssignSequence = async (sequenceId) => {
  try {
    setSelectingSequence(true);
    const { success, error } = await assignSequenceToLead(
      lead.id, 
      sequenceId, 
      session?.user?.id
    );

    if (!success) {
      throw error;
    }

    toast.push({
      type: 'success',
      title: 'Éxito',
      message: 'Secuencia asignada correctamente'
    });

    setShowSequenceSelector(false);
    await loadLeadSequence();
    await loadLead(); // Recargar lead para actualizar actividades
  } catch (err) {
    toast.push({
      type: 'error',
      title: 'Error',
      message: 'No se pudo asignar la secuencia: ' + (err.message || 'Error desconocido')
    });
  } finally {
    setSelectingSequence(false);
  }
};

const handlePauseSequence = async () => {
  try {
    const { success, error } = await pauseLeadSequence(lead.id, session?.user?.id);
    if (!success) throw error;
    
    toast.push({
      type: 'success',
      title: 'Éxito',
      message: 'Secuencia pausada'
    });
    
    await loadLeadSequence();
    await loadLead();
  } catch (err) {
    toast.push({
      type: 'error',
      title: 'Error',
      message: 'No se pudo pausar la secuencia'
    });
  }
};

const handleResumeSequence = async () => {
  try {
    const { success, error } = await resumeLeadSequence(lead.id, session?.user?.id);
    if (!success) throw error;
    
    toast.push({
      type: 'success',
      title: 'Éxito',
      message: 'Secuencia retomada'
    });
    
    await loadLeadSequence();
    await loadLead();
  } catch (err) {
    toast.push({
      type: 'error',
      title: 'Error',
      message: 'No se pudo retomar la secuencia'
    });
  }
};

const handleStopSequence = async () => {
  if (!confirm('¿Estás seguro de que deseas detener la secuencia? Esto no se puede deshacer.')) {
    return;
  }

  try {
    const { success, error } = await stopLeadSequence(lead.id, session?.user?.id);
    if (!success) throw error;
    
    toast.push({
      type: 'success',
      title: 'Éxito',
      message: 'Secuencia detenida'
    });
    
    await loadLeadSequence();
    await loadLead();
  } catch (err) {
    toast.push({
      type: 'error',
      title: 'Error',
      message: 'No se pudo detener la secuencia'
    });
  }
};
```

**JSX en el modal (agregar después de las métricas o antes de actividades):**

```jsx
{/* Sección de Secuencia Automática */}
<div className="bg-[#0f171e] border border-neutral-800 rounded-lg p-4 mb-4">
  <div className="flex items-center justify-between mb-3">
    <div className="flex items-center gap-2">
      <Zap className="w-5 h-5 text-[#e7922b]" />
      <h3 className="text-sm font-semibold text-neutral-200">
        Secuencia Automática
      </h3>
    </div>
  </div>

  {loadingSequence ? (
    <div className="text-center py-4 text-neutral-400 text-sm">
      Cargando información de secuencia...
    </div>
  ) : leadSequence && leadSequence.sequence ? (
    <div className="space-y-3">
      {/* Info de secuencia activa */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-neutral-200">
            {leadSequence.sequence.name}
          </p>
          <p className="text-xs text-neutral-400 mt-1">
            Mensaje {leadSequence.position + 1} de {leadSequence.sequence.total_messages || 'N/A'}
            {leadSequence.started_at && (
              <> · Iniciada {formatDate(leadSequence.started_at)}</>
            )}
          </p>
        </div>
        <div className={`px-2 py-1 rounded text-xs font-medium ${
          leadSequence.active 
            ? 'bg-green-500/20 text-green-400' 
            : 'bg-yellow-500/20 text-yellow-400'
        }`}>
          {leadSequence.active ? 'Activa' : 'Pausada'}
        </div>
      </div>

      {/* Barra de progreso */}
      {leadSequence.sequence.total_messages && (
        <div className="w-full bg-neutral-800 rounded-full h-2">
          <div 
            className="bg-[#e7922b] h-2 rounded-full transition-all"
            style={{ 
              width: `${Math.min(
                ((leadSequence.position + 1) / leadSequence.sequence.total_messages) * 100, 
                100
              )}%` 
            }}
          />
        </div>
      )}

      {/* Botones de acción */}
      <div className="flex gap-2">
        {leadSequence.active ? (
          <>
            <button
              onClick={handlePauseSequence}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg transition text-sm"
            >
              <Pause className="w-4 h-4" />
              Pausar
            </button>
            <button
              onClick={handleStopSequence}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition text-sm"
            >
              <Square className="w-4 h-4" />
              Detener
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleResumeSequence}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#e7922b] hover:bg-[#d6821b] text-white rounded-lg transition text-sm"
            >
              <Play className="w-4 h-4" />
              Retomar
            </button>
            <button
              onClick={handleStopSequence}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition text-sm"
            >
              <Square className="w-4 h-4" />
              Detener
            </button>
          </>
        )}
      </div>
    </div>
  ) : (
    <div className="space-y-3">
      <p className="text-sm text-neutral-400">
        No hay secuencia asignada. Asigna una para enviar mensajes automáticos.
      </p>
      
      {!showSequenceSelector ? (
        <button
          onClick={() => setShowSequenceSelector(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#e7922b] hover:bg-[#d6821b] text-white rounded-lg transition text-sm font-medium"
        >
          <Zap className="w-4 h-4" />
          Asignar Secuencia
        </button>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-neutral-200">
              Seleccionar secuencia:
            </h4>
            <button
              onClick={() => setShowSequenceSelector(false)}
              className="text-xs text-neutral-400 hover:text-neutral-300"
            >
              Cancelar
            </button>
          </div>

          {availableSequences.length === 0 ? (
            <p className="text-sm text-neutral-400 text-center py-4">
              No hay secuencias activas disponibles
            </p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {availableSequences.map(sequence => (
                <button
                  key={sequence.id}
                  onClick={() => handleAssignSequence(sequence.id)}
                  disabled={selectingSequence}
                  className="w-full text-left px-3 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition text-sm disabled:opacity-50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-neutral-200">{sequence.name}</p>
                      <p className="text-xs text-neutral-400">
                        {sequence.total_messages || 0} mensajes
                      </p>
                    </div>
                    {selectingSequence && (
                      <Loader2 className="w-4 h-4 text-[#e7922b] animate-spin" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )}
</div>
```

---

### **FASE 3: Indicador Visual en Cards** ⏱️ 1 día

#### 3.1: Badge de secuencia en cards del Kanban

**Archivo:** `src/components/whatsapp/LeadsKanban.jsx`

Agregar badge visual en las cards cuando el lead tenga secuencia activa:

```jsx
// En el render de cada card del lead
{lead.contact?.sequence_active && (
  <div className="flex items-center gap-1 text-xs text-[#e7922b]">
    <Zap className="w-3 h-3" />
    <span>Secuencia activa</span>
  </div>
)}
```

**Necesitarás modificar la query para incluir información del contacto:**

```javascript
// En getLeadsByProduct, modificar para incluir contacto:
.select('*, whatsapp_contacts (sequence_active, sequence_id)')
```

---

## 📊 Resumen de Tareas

### ✅ **FASE 1: Servicio Backend** (1-2 días)
- [ ] `assignSequenceToLead()` - Asignar secuencia
- [ ] `getLeadSequence()` - Obtener info de secuencia
- [ ] `pauseLeadSequence()` - Pausar secuencia
- [ ] `resumeLeadSequence()` - Retomar secuencia
- [ ] `stopLeadSequence()` - Detener secuencia

### ✅ **FASE 2: UI en Modal** (2-3 días)
- [ ] Cargar información de secuencia
- [ ] Sección visual de secuencia en modal
- [ ] Selector de secuencias disponibles
- [ ] Botones de acción (Pausar/Retomar/Detener)
- [ ] Barra de progreso
- [ ] Estados de carga

### ✅ **FASE 3: Indicadores Visuales** (1 día)
- [ ] Badge en cards del Kanban
- [ ] Icono de secuencia activa

**Tiempo total estimado:** 4-6 días

---

## 🎯 Beneficios

1. **Automatización desde el CRM:** Asignar secuencias directamente desde el lead
2. **Visibilidad:** Ver estado de secuencia en tiempo real
3. **Control:** Pausar/retomar/detener cuando sea necesario
4. **Progreso:** Ver qué mensaje va de la secuencia
5. **Integración:** Secuencias como parte natural del flujo de leads

---

**¿Quieres que empecemos a implementar?** 🚀



