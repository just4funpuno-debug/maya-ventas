# 📝 FASE 1.2: Actualizar Código JavaScript

## Objetivo
Modificar `registrarVentaPendiente` en `src/supabaseUtils.js` para usar la función SQL transaccional en lugar de operaciones separadas.

---

## Cambios a Realizar

### Archivo: `src/supabaseUtils.js`

**ANTES (líneas 232-294):**
- Descontaba stock manualmente
- Luego insertaba la venta
- Si fallaba el insert, el stock quedaba descontado

**DESPUÉS:**
- Llama a la función SQL `registrar_venta_pendiente_atomica`
- Todo se hace en una sola transacción atómica
- Si falla, todo se revierte automáticamente

---

## Instrucciones

1. Abre `src/supabaseUtils.js`
2. Localiza la función `registrarVentaPendiente` (línea 232)
3. Reemplaza toda la función con el nuevo código (ver archivo de código)

---

## Verificación

Después de los cambios:
- [ ] La función usa `supabase.rpc('registrar_venta_pendiente_atomica', ...)`
- [ ] Ya no llama a `discountCityStock` manualmente
- [ ] El código es más simple y seguro

---

**Ver archivo de código para los cambios exactos**


