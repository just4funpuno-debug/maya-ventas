# 🧪 FASE 4.3: Guía Práctica de Testing

## 🎯 Objetivo Rápido

Verificar que cuando falla una operación en Supabase, el estado local se revierte correctamente y el usuario recibe una notificación clara.

## 🚀 Inicio Rápido

### Paso 1: Preparar el Entorno

1. Abrir la aplicación en el navegador
2. Abrir DevTools (F12)
3. Ir a la pestaña "Console" para ver los logs
4. Ir a la pestaña "Network" para simular errores

### Paso 2: Simular Error de Red

**Opción A: Desconectar Internet**
- En DevTools → Network → Throttling → Seleccionar "Offline"

**Opción B: Bloquear Supabase**
- En DevTools → Network → Hacer clic derecho en una petición a `supabase.co`
- Seleccionar "Block request URL"
- Repetir para todas las peticiones a Supabase

---

## 📋 Tests Rápidos (5 minutos cada uno)

### ✅ TEST 1: Editar Despacho (2 minutos)

1. Ir a "Despacho de Productos"
2. Seleccionar un despacho pendiente
3. Hacer clic en "Editar"
4. Cambiar cantidad de un producto
5. **Activar modo offline** (DevTools → Network → Offline)
6. Hacer clic en "Guardar"

**✅ Resultado Esperado:**
- Aparece alerta: "Error al actualizar el despacho. Los cambios fueron revertidos."
- El stock vuelve a su valor original
- El despacho vuelve a su estado original

**❌ Si falla:**
- El stock queda inconsistente
- El despacho muestra valores incorrectos

---

### ✅ TEST 2: Cancelar Venta (2 minutos)

1. Ir al Dashboard
2. Seleccionar una venta pendiente
3. Hacer clic en "Cancelar"
4. Confirmar cancelación
5. **Activar modo offline** (DevTools → Network → Offline)
6. Confirmar cancelación nuevamente

**✅ Resultado Esperado:**
- Aparece alerta: "Error al cancelar el pedido: [mensaje]. Los cambios fueron revertidos."
- La venta vuelve a aparecer en la lista

**❌ Si falla:**
- La venta desaparece pero no se elimina en Supabase
- El stock no se restaura

---

### ✅ TEST 3: Reprogramar Venta (2 minutos)

1. Ir al Dashboard
2. Seleccionar una venta pendiente
3. Hacer clic en "Reprogramar"
4. Cambiar fecha/hora
5. **Activar modo offline** (DevTools → Network → Offline)
6. Hacer clic en "Guardar"

**✅ Resultado Esperado:**
- Aparece alerta: "Error al reprogramar la venta: [mensaje]"
- La fecha/hora vuelve a su valor original

**❌ Si falla:**
- La fecha/hora se actualiza en la UI pero no en Supabase

---

### ✅ TEST 4: Crear Usuario (2 minutos)

1. Ir a "Usuarios"
2. Hacer clic en "Crear Usuario"
3. Completar formulario (nombre, apellidos, email, contraseña)
4. **Activar modo offline** (DevTools → Network → Offline)
5. Hacer clic en "Guardar"

**✅ Resultado Esperado:**
- Aparece mensaje: "Error creando usuario: [mensaje]"
- El usuario no aparece en la lista

**❌ Si falla:**
- El usuario aparece en la lista pero no existe en Supabase

---

### ✅ TEST 5: Crear Despacho (2 minutos)

1. Ir a "Despacho de Productos"
2. Seleccionar productos y cantidades
3. **Activar modo offline** (DevTools → Network → Offline)
4. Hacer clic en "Guardar"

**✅ Resultado Esperado:**
- Aparece alerta: "Error al crear despacho: [mensaje]"
- El stock vuelve a su valor original
- El despacho no aparece en la lista

**❌ Si falla:**
- El stock queda descontado pero el despacho no se crea

---

### ✅ TEST 6: Registrar Venta (2 minutos)

1. Ir a "Registrar Venta"
2. Seleccionar ciudad y producto
3. Completar formulario
4. **Activar modo offline** (DevTools → Network → Offline)
5. Hacer clic en "Guardar"

**✅ Resultado Esperado:**
- Aparece notificación: "Error al registrar venta: [mensaje]"
- El stock de la ciudad vuelve a su valor original
- La venta no aparece en la lista

**❌ Si falla:**
- El stock queda descontado pero la venta no se registra

---

## 🔍 Verificación Final

Después de cada test:

1. **Reconectar Internet** (DevTools → Network → No throttling)
2. **Refrescar la página** (F5)
3. **Verificar consistencia:**
   - Los datos en la UI coinciden con la base de datos
   - No hay elementos "fantasma" (que aparecen en UI pero no en BD)
   - No hay inconsistencias de stock

---

## 📊 Checklist Rápido

- [ ] TEST 1: Editar Despacho - Rollback funciona
- [ ] TEST 2: Cancelar Venta - Rollback funciona
- [ ] TEST 3: Reprogramar Venta - Rollback funciona
- [ ] TEST 4: Crear Usuario - Rollback funciona
- [ ] TEST 5: Crear Despacho - Rollback funciona
- [ ] TEST 6: Registrar Venta - Rollback funciona
- [ ] Verificación Final: Consistencia después de refrescar

---

## ⚠️ Problemas Comunes

### Problema: El rollback no funciona

**Solución:**
- Verificar que el error se está capturando correctamente
- Verificar que `previousState` se guarda antes de la actualización optimista
- Verificar que `setState(previousState)` se llama en el catch

### Problema: No aparece notificación

**Solución:**
- Verificar que `alert()` o `push()` se llama en el catch
- Verificar que el error no se está silenciando con `console.warn`

### Problema: Inconsistencias después de refrescar

**Solución:**
- Verificar que la operación realmente falló en Supabase
- Verificar que no hay operaciones en segundo plano que se completaron después

---

## ✅ Criterios de Éxito

Todos los tests pasan si:
1. ✅ El rollback funciona en todos los casos
2. ✅ Las notificaciones son claras y útiles
3. ✅ No hay inconsistencias después de refrescar
4. ✅ Los errores se registran en la consola

---

## 📝 Reporte

**Fecha:** _______________

**Tests Pasados:** ___ / 6

**Observaciones:**
- _________________________________________________
- _________________________________________________

**Estado:** ✅ LISTO PARA PRODUCCIÓN / ⚠️ REQUIERE CORRECCIONES

