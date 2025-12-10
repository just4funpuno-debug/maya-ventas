# 🔍 Análisis Completo: Eliminar Ventas "PRUEBA" del 30/11/2025

## 📋 Información del Usuario

- **Ciudad:** "PRUEBA"
- **Fecha:** "30/11/2025"
- **Requisito:** Eliminar de manera sistemática o 1 a 1 todas las ventas

---

## 🔍 Análisis de Estructura

### **1. Tabla de Ventas**

**Nombre de tabla en Supabase:** `sales` o `ventas` (verificar cuál está en uso)

**Campos relevantes:**
```sql
CREATE TABLE sales (
  id uuid PRIMARY KEY,
  fecha date NOT NULL,        -- Formato: YYYY-MM-DD
  ciudad text NOT NULL,       -- Formato normalizado: "prueba" (minúsculas)
  estado_entrega text,        -- 'pendiente', 'confirmado', 'entregada', 'cancelado'
  estado_pago text,
  -- ... otros campos
);
```

### **2. Normalización de Ciudad**

**Según `cityUtils.js`:**
- **Entrada:** "PRUEBA" (usuario)
- **Normalizado en BD:** "prueba" (minúsculas, sin espacios)
- **Visualización:** "PRUEBA" (mayúsculas)

**Para búsqueda:**
- Usar formato normalizado: `ciudad = 'prueba'` o `LOWER(REPLACE(ciudad, ' ', '_')) = 'prueba'`

### **3. Formato de Fecha**

**Entrada del usuario:** "30/11/2025" (DD/MM/YYYY)  
**Formato en BD:** "2025-11-30" (YYYY-MM-DD)  
**Conversión:** "30/11/2025" → "2025-11-30"

⚠️ **NOTA:** La fecha "30/11/2025" es **FUTURO** (noviembre 2025). Verificar si es correcta o puede ser error (2024).

---

## 🔍 Verificaciones Necesarias

### **PASO 1: Consultar Ventas Existentes**

Antes de eliminar, necesitamos:
1. ✅ Verificar si existen ventas con esos criterios
2. ✅ Contar cuántas son
3. ✅ Ver su estado (pendientes, confirmadas, canceladas)
4. ✅ Verificar dependencias (depósitos, stock, etc.)

### **PASO 2: Verificar Impacto**

**Riesgos de eliminar:**
- ❌ Si están en depósitos → puede afectar registros
- ❌ Si tienen stock → debe restaurarse
- ❌ Si están vinculadas a otras tablas
- ❌ **Pérdida permanente de datos**

---

## 📝 Propuesta de Implementación

### **OPCIÓN A: Eliminación Individual (Más Segura)**
- Ver lista de ventas
- Confirmar una por una
- Eliminar con validaciones

### **OPCIÓN B: Eliminación Masiva (Más Rápida)**
- Consultar todas las ventas
- Eliminar todas de una vez
- Restaurar stock si aplica

### **OPCIÓN C: Cancelación en Lugar de Eliminación (Más Segura)**
- Cambiar estado a "cancelado"
- Mantener historial
- No afecta depósitos

---

## ⚠️ Consideraciones Importantes

### **1. Formato de Ciudad**
- En BD puede estar como: "prueba", "PRUEBA", "Prueba"
- Búsqueda debe ser case-insensitive

### **2. Formato de Fecha**
- Verificar si "30/11/2025" es correcto (parece futuro)
- Confirmar formato exacto en BD

### **3. Estado de Ventas**
- ¿Qué estados tienen? (pendiente, confirmada, entregada, cancelada)
- Eliminar solo confirmadas o todas?

### **4. Restauración de Stock**
- Si están confirmadas, debe restaurarse stock
- Verificar impacto en `city_stock`

---

## 🎯 Plan de Acción Propuesto

### **FASE 1: Consulta y Verificación** (SIN ELIMINAR)
1. Crear script SQL para consultar ventas
2. Mostrar resultados al usuario
3. Verificar dependencias
4. Confirmar criterios

### **FASE 2: Crear Funcionalidad de Eliminación**
1. Función para eliminar múltiples ventas
2. Validaciones y restauraciones necesarias
3. Testing

### **FASE 3: Implementación**
1. Eliminar ventas una por una o masivamente
2. Restaurar stock si aplica
3. Limpiar dependencias

---

## ❓ Preguntas Clave

1. **¿La fecha es correcta?** "30/11/2025" es futuro. ¿Es 2025 o 2024?
2. **¿Tipo de eliminación?** Física, cancelación, o soft delete
3. **¿Restaurar stock?** Si están confirmadas, ¿restaurar stock?
4. **¿Verificar dependencias primero?** Revisar depósitos, etc.

---

**⏳ ESPERANDO CONFIRMACIÓN ANTES DE PROCEDER**



