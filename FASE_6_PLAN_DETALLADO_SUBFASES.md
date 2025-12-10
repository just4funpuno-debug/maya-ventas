# 🚀 FASE 6: Modal QR para Coexistencia - Plan Detallado

## 📋 Objetivo

Mostrar QR en modal si Meta requiere escanear para coexistencia. Detectar cuando se escaneó y continuar proceso automáticamente.

---

## 📋 SUBFASE 6.1: Crear Componente QRModal (30-45 min)

### Tareas:
- [ ] Crear `src/components/whatsapp/QRModal.jsx`
- [ ] Implementar UI del modal (similar a ConfirmModal/ErrorModal)
- [ ] Mostrar QR code (usando librería o imagen)
- [ ] Agregar instrucciones para el usuario
- [ ] Botón de cerrar/cancelar

### Archivos:
- `src/components/whatsapp/QRModal.jsx` (nuevo)

### Testing:
- [ ] Verificar que el modal se muestra correctamente
- [ ] Verificar que el QR se renderiza
- [ ] Verificar que se puede cerrar

---

## 📋 SUBFASE 6.2: Servicio para Verificar Coexistencia (30-45 min)

### Tareas:
- [ ] Crear `src/services/whatsapp/coexistence-checker.js`
- [ ] Implementar función para verificar estado de coexistencia
- [ ] Obtener QR code si está disponible
- [ ] Polling para detectar cuando se escaneó
- [ ] Manejar timeout

### Archivos:
- `src/services/whatsapp/coexistence-checker.js` (nuevo)

### Testing:
- [ ] Verificar que obtiene estado de coexistencia
- [ ] Verificar polling funciona
- [ ] Verificar timeout funciona

---

## 📋 SUBFASE 6.3: Integrar con Flujo OAuth (30-45 min)

### Tareas:
- [ ] Detectar cuando OAuth retorna `coexistence_status: 'pending'`
- [ ] Mostrar QRModal automáticamente
- [ ] Iniciar polling para verificar coexistencia
- [ ] Cerrar modal cuando se detecta conexión
- [ ] Continuar flujo OAuth automáticamente

### Archivos:
- `src/components/whatsapp/AccountForm.jsx` (modificar)
- `src/components/whatsapp/QRModal.jsx` (modificar)

### Testing:
- [ ] Verificar que el modal se muestra cuando es necesario
- [ ] Verificar que detecta cuando se escaneó
- [ ] Verificar que continúa el flujo automáticamente

---

## 📋 SUBFASE 6.4: Testing y Refinamiento (20-30 min)

### Tareas:
- [ ] Crear tests unitarios
- [ ] Probar flujo completo
- [ ] Refinar UI/UX
- [ ] Documentar

### Archivos:
- `tests/whatsapp/qr-modal.test.js` (nuevo)
- `tests/whatsapp/coexistence-checker.test.js` (nuevo)

### Testing:
- [ ] Tests unitarios pasando
- [ ] Flujo completo funciona

---

## ✅ Criterios de Éxito FASE 6

- ✅ Modal muestra QR correctamente
- ✅ Detecta cuando se escaneó
- ✅ Continúa proceso automáticamente
- ✅ Maneja timeout
- ✅ Tests pasando

---

**Tiempo Total Estimado:** 2-3 horas

