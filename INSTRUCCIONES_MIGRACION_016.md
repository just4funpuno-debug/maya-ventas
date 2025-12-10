# 📋 Instrucciones: Migración 016 - Mejoras de Automatizaciones

## 🎯 Objetivo

Agregar campos nuevos a `whatsapp_sequence_messages` para soportar:
- Pausas inteligentes
- Condiciones básicas
- Ramificaciones

**Sin romper funcionalidad existente.**

---

## ✅ Paso 1: Ejecutar Migración

1. **Abrir Supabase SQL Editor**
   - Ve a tu proyecto en Supabase
   - Click en "SQL Editor" en el menú lateral

2. **Ejecutar Script**
   - Abre el archivo `EJECUTAR_MIGRACION_016.sql`
   - Copia todo el contenido
   - Pégalo en el SQL Editor
   - Click en "Run" o presiona `Ctrl+Enter`

3. **Verificar Resultados**
   - Debe aparecer: "Success. No rows returned" o mensajes de NOTICE
   - NO debe haber errores en rojo

---

## ✅ Paso 2: Verificar Migración

1. **Ejecutar Script de Verificación**
   - Abre el archivo `scripts/test-automation-schema.sql`
   - Copia todo el contenido
   - Pégalo en el SQL Editor
   - Click en "Run"

2. **Revisar Resultados**
   - Debe aparecer "✅ PASS" en todos los tests
   - Si aparece "❌ FAIL", revisa los errores

---

## ✅ Paso 3: Verificar Compatibilidad

1. **Consultar Secuencias Existentes**
   ```sql
   SELECT 
     id,
     sequence_id,
     message_number,
     pause_type,
     condition_type,
     next_message_if_true,
     next_message_if_false
   FROM whatsapp_sequence_messages
   LIMIT 10;
   ```

2. **Verificar Valores por Defecto**
   - Todos los registros deben tener:
     - `pause_type = 'fixed_delay'`
     - `condition_type = 'none'`
     - `next_message_if_true = NULL`
     - `next_message_if_false = NULL`

---

## 🔍 Campos Agregados

### `pause_type` (TEXT)
- **Valores permitidos:**
  - `'fixed_delay'` (por defecto) - Delay fijo como antes
  - `'until_message'` - Pausar hasta recibir mensaje del cliente
  - `'until_days_without_response'` - Pausar hasta X días sin respuesta

### `condition_type` (TEXT)
- **Valores permitidos:**
  - `'none'` (por defecto) - Sin condición, siempre enviar
  - `'if_responded'` - Solo enviar si el cliente respondió
  - `'if_not_responded'` - Solo enviar si el cliente NO respondió

### `next_message_if_true` (UUID)
- ID del mensaje siguiente si la condición es verdadera
- NULL si no hay ramificación

### `next_message_if_false` (UUID)
- ID del mensaje siguiente si la condición es falsa
- NULL si no hay ramificación

### `days_without_response` (INTEGER)
- Número de días sin respuesta requeridos
- Solo usado cuando `pause_type = 'until_days_without_response'`

---

## ⚠️ Notas Importantes

1. **Compatibilidad hacia atrás:**
   - ✅ Las secuencias existentes seguirán funcionando igual
   - ✅ Todos los campos nuevos tienen valores por defecto
   - ✅ No se modifica ningún dato existente

2. **Índices creados:**
   - Se crean índices para mejorar rendimiento
   - No afectan funcionalidad existente

3. **Foreign Keys:**
   - `next_message_if_true` y `next_message_if_false` referencian otros mensajes
   - Si se elimina un mensaje referenciado, se pone NULL (ON DELETE SET NULL)

---

## 🐛 Troubleshooting

### Error: "column already exists"
- **Causa:** La migración ya se ejecutó antes
- **Solución:** No es problema, los campos ya existen. Continúa con el testing.

### Error: "relation does not exist"
- **Causa:** La tabla `whatsapp_sequence_messages` no existe
- **Solución:** Ejecuta primero las migraciones anteriores (001, 002, etc.)

### Error: "permission denied"
- **Causa:** No tienes permisos para modificar la tabla
- **Solución:** Usa una cuenta con permisos de administrador

---

## ✅ Checklist de Verificación

- [ ] Migración ejecutada sin errores
- [ ] Script de testing ejecutado
- [ ] Todos los tests pasan (✅ PASS)
- [ ] Secuencias existentes tienen valores por defecto correctos
- [ ] No hay errores en la consola

---

**Fecha:** 2025-01-30

