# 🧪 Guía de Testing Manual - FASE 1

## 📋 Checklist de Testing

### ✅ **TEST 1: Índice Único en Base de Datos**

**Ejecutar en Supabase Dashboard > SQL Editor:**

```sql
-- Verificar índice único
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'whatsapp_accounts'
  AND indexname = 'idx_accounts_product_unique';
```

**Resultado esperado:**
- ✅ Debe aparecer el índice `idx_accounts_product_unique`
- ✅ Debe ser UNIQUE INDEX

---

### ✅ **TEST 2: Verificar Duplicados**

**Ejecutar en Supabase Dashboard > SQL Editor:**

```sql
-- Verificar que no hay duplicados
SELECT 
  product_id,
  COUNT(*) as cuenta_count
FROM whatsapp_accounts
WHERE product_id IS NOT NULL
GROUP BY product_id
HAVING COUNT(*) > 1;
```

**Resultado esperado:**
- ✅ No debe retornar ningún resultado (0 filas)

---

### ✅ **TEST 3: Crear Cuenta Duplicada (debe fallar)**

**Desde la aplicación:**

1. **Ir a configuración de WhatsApp**
2. **Crear cuenta WhatsApp:**
   - Seleccionar producto: "CARDIO PLUS"
   - Completar datos
   - Guardar

3. **Intentar crear otra cuenta:**
   - Seleccionar producto: "CARDIO PLUS" (mismo)
   - Completar datos
   - Intentar guardar

**Resultado esperado:**
- ✅ Debe aparecer mensaje de error
- ✅ Mensaje: "Este producto ya tiene un WhatsApp Account asignado..."

---

### ✅ **TEST 4: Actualizar Cuenta a Producto Ocupado**

**Desde la aplicación:**

1. **Tener dos productos:**
   - Producto A con cuenta WhatsApp
   - Producto B sin cuenta

2. **Crear cuenta para Producto B**

3. **Intentar actualizar cuenta de Producto B a Producto A:**
   - Editar cuenta de Producto B
   - Cambiar producto a "Producto A"
   - Guardar

**Resultado esperado:**
- ✅ Debe aparecer mensaje de error
- ✅ Mensaje: "Este producto ya tiene un WhatsApp Account asignado..."

---

### ✅ **TEST 5: Crear Lead con Cuenta de Otro Producto**

**Desde la aplicación:**

1. **Tener:**
   - Producto A con cuenta WhatsApp
   - Producto B sin cuenta (o con cuenta diferente)

2. **Crear Lead:**
   - Seleccionar contacto
   - Seleccionar cuenta del Producto A
   - Seleccionar producto: "Producto B"
   - Intentar crear

**Resultado esperado:**
- ✅ Debe aparecer mensaje de error
- ✅ Mensaje: "La cuenta WhatsApp pertenece a otro producto..."

---

### ✅ **TEST 6: Mover Lead Entre Productos**

**Desde la aplicación:**

1. **Tener:**
   - Lead del Producto A en Kanban de Producto A
   - Abrir Kanban de Producto B

2. **Intentar mover:**
   - Intentar arrastrar lead del Producto A al Kanban del Producto B
   - (Si es posible técnicamente)

**Resultado esperado:**
- ✅ Debe fallar o prevenir el movimiento
- ✅ Mensaje: "No se puede mover este lead. Los productos son independientes..."

**Nota:** Este test puede no ser aplicable si la UI ya previene esto mostrando solo leads del producto seleccionado.

---

### ✅ **TEST 7: Verificar que Lead NO puede Cambiar de Producto**

**Desde código (o SQL directo):**

**Intentar actualizar product_id directamente:**

```sql
-- Obtener un lead existente
SELECT id, product_id FROM whatsapp_leads LIMIT 1;

-- Intentar cambiar product_id (debe fallar o prevenirse)
UPDATE whatsapp_leads
SET product_id = 'diferente-product-id'
WHERE id = 'lead-id-here';
```

**Resultado esperado:**
- ✅ No debe permitirse cambiar product_id
- ✅ O debe validarse y retornar error

---

## 📊 Resultados Esperados

### **Validaciones Implementadas:**

✅ **Índice único:** 1 cuenta por producto máximo  
✅ **createAccount():** Previene duplicados  
✅ **updateAccount():** Previene asignar a producto ocupado  
✅ **createLead():** Previene mismatch cuenta/producto  
✅ **moveLeadToStage():** Valida que lead pertenece al producto  
✅ **updateLead():** Previene cambiar product_id  

---

## ✅ Ejecutar Tests SQL

**Ejecutar en Supabase Dashboard > SQL Editor:**

```sql
-- Copiar y ejecutar todo el contenido de:
-- scripts/test-product-independence.sql
```

Esto verificará:
- ✅ Índice único existe
- ✅ No hay duplicados
- ✅ Estructura de tablas correcta
- ✅ Foreign keys correctas

---

**Listo para hacer testing manual** ✅



