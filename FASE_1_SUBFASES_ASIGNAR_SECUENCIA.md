# 📋 FASE 1: Servicio Backend - División en Subfases

## 🎯 Objetivo
Implementar las funciones backend para asignar y gestionar secuencias desde leads, dividido en subfases pequeñas con testing después de cada una.

---

## 📊 División en Subfases

### ✅ **SUBFASE 1.1: Función `assignSequenceToLead()`** ⏱️ 2-3 horas
**Objetivo:** Asignar una secuencia a un lead (asigna al contacto asociado)

**Funciones a crear:**
- `assignSequenceToLead(leadId, sequenceId, userId)`

**Tests a crear:**
- ✅ Asignar secuencia exitosamente
- ✅ Error si lead no existe
- ✅ Error si secuencia no existe
- ✅ Error si secuencia no pertenece a la cuenta del lead
- ✅ Error si secuencia no está activa
- ✅ Registra actividad en el lead

**Criterio de éxito:**
- Función implementada y funcionando
- Todos los tests pasando (6/6)
- Documentación actualizada

---

### ✅ **SUBFASE 1.2: Función `getLeadSequence()`** ⏱️ 1-2 horas
**Objetivo:** Obtener información de secuencia asignada a un lead

**Funciones a crear:**
- `getLeadSequence(leadId)`

**Tests a crear:**
- ✅ Obtener secuencia cuando existe
- ✅ Retornar null cuando no hay secuencia
- ✅ Error si lead no existe
- ✅ Incluye información completa de secuencia
- ✅ Incluye posición y progreso

**Criterio de éxito:**
- Función implementada y funcionando
- Todos los tests pasando (5/5)
- Integración con SUBFASE 1.1 verificada

---

### ✅ **SUBFASE 1.3: Funciones de Control (Pause/Resume/Stop)** ⏱️ 2-3 horas
**Objetivo:** Controlar el estado de la secuencia (pausar, retomar, detener)

**Funciones a crear:**
- `pauseLeadSequence(leadId, userId)`
- `resumeLeadSequence(leadId, userId)`
- `stopLeadSequence(leadId, userId)`

**Tests a crear:**
- ✅ Pausar secuencia exitosamente
- ✅ Retomar secuencia pausada
- ✅ Detener secuencia completamente
- ✅ Error si lead no existe
- ✅ Error si no hay secuencia asignada
- ✅ Registrar actividades correctamente

**Criterio de éxito:**
- 3 funciones implementadas y funcionando
- Todos los tests pasando (6/6 mínimo)
- Integración con SUBFASE 1.1 y 1.2 verificada

---

### ✅ **SUBFASE 1.4: Testing de Integración Completo** ⏱️ 1-2 horas
**Objetivo:** Verificar que todo el flujo funciona end-to-end

**Tests de integración:**
- ✅ Flujo completo: Asignar → Pausar → Retomar → Detener
- ✅ Flujo completo: Asignar → Obtener → Detener
- ✅ Múltiples leads con diferentes secuencias
- ✅ Validar que la secuencia se asigna correctamente al contacto
- ✅ Validar que el cron job puede procesar la secuencia

**Criterio de éxito:**
- Todos los tests de integración pasando
- Documentación completa
- Listo para FASE 2 (UI)

---

## 📝 Archivos a Crear/Modificar

### Archivos a Modificar:
- `src/services/whatsapp/leads.js` - Agregar nuevas funciones

### Archivos a Crear:
- `tests/whatsapp/lead-sequences.test.js` - Tests para todas las funciones

---

## 🧪 Estrategia de Testing

1. **Después de cada subfase:** Ejecutar tests específicos de esa subfase
2. **Antes de pasar a la siguiente:** Verificar que todo funciona
3. **Al final de FASE 1:** Testing completo de integración

---

## ✅ Checklist de Progreso

### SUBFASE 1.1
- [ ] Implementar `assignSequenceToLead()`
- [ ] Crear tests (6 tests)
- [ ] Ejecutar tests y verificar que pasan
- [ ] Documentar función

### SUBFASE 1.2
- [ ] Implementar `getLeadSequence()`
- [ ] Crear tests (5 tests)
- [ ] Ejecutar tests y verificar que pasan
- [ ] Integrar con SUBFASE 1.1

### SUBFASE 1.3
- [ ] Implementar `pauseLeadSequence()`
- [ ] Implementar `resumeLeadSequence()`
- [ ] Implementar `stopLeadSequence()`
- [ ] Crear tests (6+ tests)
- [ ] Ejecutar tests y verificar que pasan

### SUBFASE 1.4
- [ ] Crear tests de integración (5+ tests)
- [ ] Ejecutar todos los tests
- [ ] Verificar flujo completo
- [ ] Documentación final

---

**¡Empecemos con SUBFASE 1.1!** 🚀



