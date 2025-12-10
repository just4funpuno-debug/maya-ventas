# 🚀 Plan de Implementación: Verificación con Código de 6 Dígitos

## 📋 Objetivo
Implementar verificación de código de 6 dígitos para coexistencia de WhatsApp, dividido en fases progresivas con testing después de cada una.

---

## 🎯 FASE 1: Servicio Backend de Verificación

### SUBFASE 1.1: Crear estructura base del servicio
**Tiempo estimado:** 30 min  
**Objetivo:** Crear archivo base con estructura y validaciones básicas

**Tareas:**
- [ ] Crear `src/services/whatsapp/phone-verification.js`
- [ ] Agregar imports necesarios
- [ ] Implementar validaciones de parámetros
- [ ] Agregar JSDoc comments

**Testing:**
- [ ] Verificar que el archivo se crea correctamente
- [ ] Verificar imports
- [ ] Linter sin errores

---

### SUBFASE 1.2: Implementar función `verifyCode()`
**Tiempo estimado:** 45 min  
**Objetivo:** Crear función para verificar código de 6 dígitos

**Tareas:**
- [ ] Implementar validación de formato de código (6 dígitos)
- [ ] Implementar llamada a `POST /{phone_number_id}/verify_code`
- [ ] Manejar errores específicos (código inválido, expirado, etc.)
- [ ] Retornar respuesta estructurada

**Testing:**
- [ ] Test unitario: código válido
- [ ] Test unitario: código inválido (formato)
- [ ] Test unitario: código inválido (respuesta de API)
- [ ] Test unitario: errores de red
- [ ] Verificar manejo de errores específicos

---

### SUBFASE 1.3: Implementar función `registerPhoneNumber()`
**Tiempo estimado:** 45 min  
**Objetivo:** Crear función para registrar número después de verificación

**Tareas:**
- [ ] Implementar validación de PIN (6 dígitos)
- [ ] Implementar llamada a `POST /{phone_number_id}/register`
- [ ] Manejar errores de registro
- [ ] Retornar respuesta estructurada

**Testing:**
- [ ] Test unitario: registro exitoso
- [ ] Test unitario: PIN inválido (formato)
- [ ] Test unitario: errores de API
- [ ] Test unitario: errores de red

---

### SUBFASE 1.4: Implementar función `verifyAndRegisterPhoneNumber()`
**Tiempo estimado:** 30 min  
**Objetivo:** Crear función combinada para verificar y registrar

**Tareas:**
- [ ] Combinar `verifyCode()` y `registerPhoneNumber()`
- [ ] Manejar errores en cascada
- [ ] Retornar respuesta completa

**Testing:**
- [ ] Test unitario: flujo completo exitoso
- [ ] Test unitario: falla en verificación
- [ ] Test unitario: falla en registro
- [ ] Test de integración completo

---

### SUBFASE 1.5: Testing completo del servicio
**Tiempo estimado:** 45 min  
**Objetivo:** Testing exhaustivo del servicio backend

**Tareas:**
- [ ] Crear archivo de tests: `tests/whatsapp/phone-verification.test.js`
- [ ] Tests con mocks de fetch
- [ ] Tests de casos edge (código expirado, ya verificado, etc.)
- [ ] Verificar cobertura > 90%

**Testing:**
- [ ] Ejecutar todos los tests
- [ ] Verificar que todos pasan
- [ ] Verificar cobertura de código

---

## 🎯 FASE 2: Componente UI (Modal)

### SUBFASE 2.1: Crear estructura base del modal
**Tiempo estimado:** 30 min  
**Objetivo:** Crear componente base con estructura visual

**Tareas:**
- [ ] Crear `src/components/whatsapp/VerificationCodeModal.jsx`
- [ ] Implementar estructura básica del modal
- [ ] Agregar estilos base
- [ ] Implementar botones de cerrar/cancelar

**Testing:**
- [ ] Verificar que el componente se renderiza
- [ ] Verificar que se puede cerrar
- [ ] Verificar estilos visuales

---

### SUBFASE 2.2: Implementar input de código de 6 dígitos
**Tiempo estimado:** 45 min  
**Objetivo:** Campo de entrada con validación en tiempo real

**Tareas:**
- [ ] Input con formato de 6 dígitos
- [ ] Validación en tiempo real (solo números, máximo 6)
- [ ] Indicador visual de progreso (X/6 dígitos)
- [ ] Auto-focus al abrir modal

**Testing:**
- [ ] Verificar que solo acepta números
- [ ] Verificar límite de 6 dígitos
- [ ] Verificar formato visual correcto
- [ ] Verificar auto-focus funciona

---

### SUBFASE 2.3: Implementar integración con servicio backend
**Tiempo estimado:** 45 min  
**Objetivo:** Conectar UI con servicio de verificación

**Tareas:**
- [ ] Implementar `handleSubmit()`
- [ ] Integrar con `verifyAndRegisterPhoneNumber()`
- [ ] Manejo de estados: loading, error, success
- [ ] Mostrar mensajes de error/success

**Testing:**
- [ ] Verificar que se llama al servicio correctamente
- [ ] Verificar estados de loading
- [ ] Verificar mensajes de error
- [ ] Verificar mensaje de éxito

---

### SUBFASE 2.4: Mejorar UX y manejo de errores
**Tiempo estimado:** 45 min  
**Objetivo:** Mejorar experiencia de usuario y manejo de errores

**Tareas:**
- [ ] Agregar instrucciones claras
- [ ] Agregar información del número de teléfono
- [ ] Mensajes de error específicos y útiles
- [ ] Animaciones/transiciones suaves
- [ ] Botón de "Reintentar" en caso de error

**Testing:**
- [ ] Verificar instrucciones son claras
- [ ] Verificar que muestra el número correcto
- [ ] Verificar mensajes de error específicos
- [ ] Verificar UX fluida

---

### SUBFASE 2.5: Testing completo del componente UI
**Tiempo estimado:** 30 min  
**Objetivo:** Testing exhaustivo del componente

**Tareas:**
- [ ] Tests de renderizado
- [ ] Tests de interacciones (input, submit, cerrar)
- [ ] Tests de estados (loading, error, success)
- [ ] Tests de accesibilidad básica

**Testing:**
- [ ] Ejecutar tests del componente
- [ ] Verificar que todos pasan
- [ ] Prueba manual en navegador

---

## 🎯 FASE 3: Integración con Flujo OAuth

### SUBFASE 3.1: Detectar necesidad de verificación
**Tiempo estimado:** 45 min  
**Objetivo:** Detectar cuando se requiere verificación de código

**Tareas:**
- [ ] Modificar `AccountForm.jsx` para verificar estado después de OAuth
- [ ] Obtener `code_verification_status` de detalles del número
- [ ] Mostrar modal automáticamente si `status === 'PENDING'`
- [ ] Manejar casos edge (cuenta ya verificada, sin estado, etc.)

**Testing:**
- [ ] Verificar detección correcta de estado
- [ ] Verificar que modal se muestra cuando es necesario
- [ ] Verificar que no se muestra cuando ya está verificado
- [ ] Verificar manejo de errores

---

### SUBFASE 3.2: Integrar modal con flujo OAuth
**Tiempo estimado:** 45 min  
**Objetivo:** Integrar modal en el flujo completo

**Tareas:**
- [ ] Pasar `phoneNumberId`, `accessToken`, `phoneNumber` al modal
- [ ] Implementar callback `onSuccess` después de verificación
- [ ] Actualizar estado de coexistencia después de éxito
- [ ] Cerrar modal y continuar flujo normal

**Testing:**
- [ ] Verificar que props se pasan correctamente
- [ ] Verificar callback onSuccess funciona
- [ ] Verificar actualización de estado
- [ ] Verificar flujo completo sin interrupciones

---

### SUBFASE 3.3: Actualizar estado después de verificación
**Tiempo estimado:** 30 min  
**Objetivo:** Actualizar UI y datos después de verificación exitosa

**Tareas:**
- [ ] Recargar detalles del número después de verificación
- [ ] Actualizar `coexistence_status` en la cuenta
- [ ] Mostrar mensaje de éxito
- [ ] Actualizar lista de cuentas si es necesario

**Testing:**
- [ ] Verificar que estado se actualiza correctamente
- [ ] Verificar que mensaje de éxito se muestra
- [ ] Verificar que lista se actualiza
- [ ] Verificar persistencia en BD

---

### SUBFASE 3.4: Manejo de errores en flujo completo
**Tiempo estimado:** 30 min  
**Objetivo:** Manejar todos los casos de error posibles

**Tareas:**
- [ ] Manejar errores de red
- [ ] Manejar códigos inválidos/expirados
- [ ] Manejar timeouts
- [ ] Opción de reintentar o cancelar
- [ ] Mensajes claros para cada tipo de error

**Testing:**
- [ ] Simular error de red
- [ ] Simular código inválido
- [ ] Simular timeout
- [ ] Verificar mensajes de error claros
- [ ] Verificar opciones de reintentar/cancelar

---

### SUBFASE 3.5: Testing de integración completo
**Tiempo estimado:** 45 min  
**Objetivo:** Testing end-to-end del flujo completo

**Tareas:**
- [ ] Test: OAuth → Detección → Modal → Verificación → Éxito
- [ ] Test: OAuth → Detección → Modal → Error → Reintentar → Éxito
- [ ] Test: OAuth → Ya verificado → No mostrar modal
- [ ] Test: OAuth → Sin estado → Manejo correcto

**Testing:**
- [ ] Ejecutar todos los tests de integración
- [ ] Prueba manual completa del flujo
- [ ] Verificar logs y debugging

---

## 🎯 FASE 4: Testing Final y Refinamiento

### SUBFASE 4.1: Testing manual exhaustivo
**Tiempo estimado:** 60 min  
**Objetivo:** Probar todos los casos de uso manualmente

**Tareas:**
- [ ] Probar flujo completo con número real
- [ ] Probar con código válido
- [ ] Probar con código inválido
- [ ] Probar con código expirado
- [ ] Probar con número ya verificado
- [ ] Probar con errores de red
- [ ] Probar en diferentes navegadores

**Testing:**
- [ ] Todos los casos probados exitosamente
- [ ] Documentar cualquier issue encontrado
- [ ] Verificar UX en diferentes dispositivos

---

### SUBFASE 4.2: Corrección de bugs encontrados
**Tiempo estimado:** Variable (depende de bugs)  
**Objetivo:** Corregir todos los bugs encontrados

**Tareas:**
- [ ] Identificar bugs del testing manual
- [ ] Priorizar bugs (críticos primero)
- [ ] Corregir cada bug
- [ ] Testing de regresión después de cada corrección

**Testing:**
- [ ] Verificar que bugs corregidos
- [ ] Verificar que no hay regresiones
- [ ] Re-testing de casos afectados

---

### SUBFASE 4.3: Optimización y mejoras finales
**Tiempo estimado:** 45 min  
**Objetivo:** Optimizar código y UX

**Tareas:**
- [ ] Optimizar performance (lazy loading, memoización)
- [ ] Mejorar mensajes de error (más claros)
- [ ] Mejorar instrucciones para usuario
- [ ] Agregar tooltips/ayuda contextual
- [ ] Optimizar tamaño de bundle

**Testing:**
- [ ] Verificar performance mejorado
- [ ] Verificar que mensajes son claros
- [ ] Verificar tamaño de bundle
- [ ] Verificar accesibilidad

---

### SUBFASE 4.4: Documentación final
**Tiempo estimado:** 30 min  
**Objetivo:** Documentar implementación completa

**Tareas:**
- [ ] Actualizar documentación técnica
- [ ] Documentar API del servicio
- [ ] Documentar props del componente
- [ ] Crear guía de usuario (si es necesario)
- [ ] Actualizar README si es necesario

**Testing:**
- [ ] Verificar documentación completa
- [ ] Verificar que es clara y útil

---

## 📊 Resumen de Fases

| Fase | Subfases | Tiempo Estimado | Testing Incluido |
|------|----------|-----------------|------------------|
| **FASE 1: Servicio Backend** | 5 subfases | ~3.5 horas | ✅ Después de cada subfase |
| **FASE 2: Componente UI** | 5 subfases | ~3.5 horas | ✅ Después de cada subfase |
| **FASE 3: Integración OAuth** | 5 subfases | ~3.5 horas | ✅ Después de cada subfase |
| **FASE 4: Testing Final** | 4 subfases | ~3.5 horas | ✅ Testing completo |
| **TOTAL** | **19 subfases** | **~14 horas** | ✅ Testing continuo |

---

## ✅ Criterios de Éxito

### FASE 1 (Servicio Backend)
- ✅ Todas las funciones implementadas
- ✅ Tests unitarios pasando (>90% cobertura)
- ✅ Manejo robusto de errores
- ✅ Código limpio y documentado

### FASE 2 (Componente UI)
- ✅ Modal funcional y atractivo
- ✅ Validaciones en tiempo real
- ✅ Estados bien manejados (loading, error, success)
- ✅ UX fluida y clara

### FASE 3 (Integración OAuth)
- ✅ Detección automática de necesidad de verificación
- ✅ Integración sin interrupciones en flujo
- ✅ Actualización de estado correcta
- ✅ Manejo completo de errores

### FASE 4 (Testing Final)
- ✅ Todos los tests pasando
- ✅ Testing manual completo exitoso
- ✅ Sin bugs conocidos
- ✅ Documentación completa

---

## 🚦 Control de Calidad

### Después de cada SUBFASE:
1. ✅ Ejecutar linter (sin errores)
2. ✅ Ejecutar tests relacionados
3. ✅ Verificar que código compila
4. ✅ Revisar código manualmente
5. ✅ Commit con mensaje descriptivo

### Después de cada FASE:
1. ✅ Todos los tests de la fase pasando
2. ✅ Testing manual de la fase
3. ✅ Revisión completa del código
4. ✅ Documentar progreso
5. ✅ Decidir si continuar o corregir

---

## 📝 Notas Importantes

1. **No avanzar a la siguiente subfase** hasta que la actual esté 100% completa y probada
2. **Testing continuo:** Después de cada subfase, hacer testing antes de continuar
3. **Commits frecuentes:** Hacer commit después de cada subfase completada
4. **Comunicación:** Si hay dudas o problemas, pausar y consultar antes de continuar
5. **Flexibilidad:** Si encontramos mejoras durante el desarrollo, documentarlas y evaluarlas

---

## 🎯 Orden de Implementación

1. ✅ **FASE 1 completa** → Testing → Aprobación
2. ✅ **FASE 2 completa** → Testing → Aprobación
3. ✅ **FASE 3 completa** → Testing → Aprobación
4. ✅ **FASE 4 completa** → Testing Final → Aprobación Final

---

**Fecha de Creación:** 2025-01-XX  
**Estado:** 📋 Plan creado - Pendiente de aprobación  
**Listo para iniciar:** ⏳ Esperando confirmación


