# 📋 FASE 2: UI en Modal de Lead - División en Subfases

## 🎯 Objetivo
Agregar interfaz visual para gestionar secuencias desde el modal de detalle del lead, dividido en subfases pequeñas con verificación después de cada una.

---

## 📊 División en Subfases

### ✅ **FASE 2.1: Estados y Funciones Base** ⏱️ 1-2 horas
**Objetivo:** Configurar estados, imports y funciones básicas

**Tareas:**
- [ ] Agregar imports necesarios (Zap, Play, Pause, Square, Loader2)
- [ ] Agregar imports de funciones de servicio
- [ ] Agregar estados para secuencia
- [ ] Crear función `loadLeadSequence()`
- [ ] Crear función `loadAvailableSequences()`

**Criterio de éxito:**
- Estados configurados
- Funciones básicas funcionando
- Sin errores en consola

---

### ✅ **FASE 2.2: Sección Visual de Secuencia** ⏱️ 2-3 horas
**Objetivo:** Mostrar información de secuencia cuando existe

**Tareas:**
- [ ] Crear componente visual de secuencia activa
- [ ] Mostrar nombre de secuencia
- [ ] Mostrar progreso (mensaje X de Y)
- [ ] Mostrar fecha de inicio
- [ ] Mostrar estado (Activa/Pausada)
- [ ] Agregar barra de progreso visual

**Criterio de éxito:**
- Sección visible en el modal
- Información se muestra correctamente
- Diseño consistente con el resto del modal

---

### ✅ **FASE 2.3: Selector de Secuencias** ⏱️ 2-3 horas
**Objetivo:** Permitir asignar una secuencia desde el modal

**Tareas:**
- [ ] Botón "Asignar Secuencia"
- [ ] Lista de secuencias disponibles
- [ ] Filtrar solo secuencias activas
- [ ] Selección y asignación de secuencia
- [ ] Manejo de estados de carga
- [ ] Notificaciones de éxito/error

**Criterio de éxito:**
- Se puede asignar secuencia exitosamente
- Selector funciona correctamente
- UX fluida

---

### ✅ **FASE 2.4: Botones de Control** ⏱️ 2-3 horas
**Objetivo:** Pausar, retomar y detener secuencia

**Tareas:**
- [ ] Botón "Pausar" cuando está activa
- [ ] Botón "Retomar" cuando está pausada
- [ ] Botón "Detener" (con confirmación)
- [ ] Manejo de estados de carga
- [ ] Actualización automática después de cada acción
- [ ] Notificaciones de éxito/error

**Criterio de éxito:**
- Todos los botones funcionan
- Estados se actualizan correctamente
- UX intuitiva

---

## 📝 Archivos a Modificar

### Archivo Principal:
- `src/components/whatsapp/LeadDetailModal.jsx`

**Modificaciones:**
- Agregar imports
- Agregar estados
- Agregar funciones
- Agregar sección JSX

---

## 🧪 Estrategia de Verificación

1. **Después de cada subfase:** Verificar que no hay errores
2. **Testing manual:** Probar en navegador después de cada subfase
3. **Antes de pasar a la siguiente:** Verificar que todo funciona

---

## ✅ Checklist de Progreso

### FASE 2.1
- [ ] Agregar imports necesarios
- [ ] Agregar estados
- [ ] Crear función loadLeadSequence()
- [ ] Crear función loadAvailableSequences()
- [ ] Verificar que carga correctamente

### FASE 2.2
- [ ] Crear sección visual
- [ ] Mostrar información de secuencia
- [ ] Agregar barra de progreso
- [ ] Verificar visualización

### FASE 2.3
- [ ] Agregar botón "Asignar Secuencia"
- [ ] Crear selector de secuencias
- [ ] Implementar asignación
- [ ] Verificar funcionalidad

### FASE 2.4
- [ ] Agregar botones de control
- [ ] Implementar pausar
- [ ] Implementar retomar
- [ ] Implementar detener
- [ ] Verificar todos los controles

---

**¡Empecemos con FASE 2.1!** 🚀



