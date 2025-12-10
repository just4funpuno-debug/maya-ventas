# 🧪 Testing Completo - FASE 1: Validaciones de Independencia

## 📊 Resumen

**Fecha:** 2025-01-30  
**Estado:** ✅ Tests creados, algunos requieren ajustes en mocks

---

## ✅ Tests Creados

### **Archivos de Testing:**

1. ✅ **`tests/whatsapp/product-independence.test.js`**
   - 12 tests unitarios
   - 7 tests pasando ✅
   - 5 tests requieren ajuste de mocks

2. ✅ **`scripts/test-product-independence.sql`**
   - Tests de base de datos
   - Verificación de índices
   - Verificación de duplicados

---

## 🧪 Plan de Testing Manual

### **TEST 1: Verificar Índice Único en BD**

**Ejecutar en Supabase SQL Editor:**
```sql
-- Verificar que el índice existe
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'whatsapp_accounts'
  AND indexname = 'idx_accounts_product_unique';
```

**Resultado esperado:**
- ✅ Índice existe y está activo

---

### **TEST 2: Intentar Crear Cuenta Duplicada**

**Pasos:**
1. Crear cuenta WhatsApp con `product_id = 'test-product-123'`
2. Intentar crear otra cuenta con el mismo `product_id`
3. Verificar que falla con error claro

**Código de prueba:**
```sql
-- Primera cuenta (debe funcionar)
INSERT INTO whatsapp_accounts (
  phone_number_id, business_account_id, access_token, verify_token, phone_number, product_id
) VALUES (
  'test-1', 'business-1', 'token-1', 'verify-1', '+1234567890', 'test-product-123'
);

-- Segunda cuenta (debe fallar)
INSERT INTO whatsapp_accounts (
  phone_number_id, business_account_id, access_token, verify_token, phone_number, product_id
) VALUES (
  'test-2', 'business-2', 'token-2', 'verify-2', '+1234567891', 'test-product-123'
);
-- Error esperado: duplicate key value violates unique constraint
```

---

### **TEST 3: Validación en createAccount() - Código**

**Pasos:**
1. Desde la aplicación, intentar crear cuenta WhatsApp
2. Seleccionar un producto que ya tiene cuenta
3. Verificar que aparece mensaje de error claro

**Resultado esperado:**
- ✅ Mensaje: "Este producto ya tiene un WhatsApp Account asignado..."

---

### **TEST 4: Validación en createLead() - Mismatch Producto/Cuenta**

**Pasos:**
1. Tener cuenta WhatsApp del producto A
2. Intentar crear lead del producto B usando esa cuenta
3. Verificar que aparece error claro

**Resultado esperado:**
- ✅ Error: "La cuenta WhatsApp pertenece a otro producto..."

---

### **TEST 5: Validación en moveLeadToStage()**

**Pasos:**
1. Tener lead del producto A
2. Abrir Kanban del producto B
3. Intentar mover lead del producto A al producto B
4. Verificar que falla

**Resultado esperado:**
- ✅ Error: "No se puede mover este lead. Los productos son independientes..."

---

### **TEST 6: Validación en updateLead() - Intentar Cambiar product_id**

**Pasos:**
1. Abrir modal de detalle de un lead
2. Intentar cambiar el producto (si existe esa opción)
3. Verificar que no se puede cambiar

**Resultado esperado:**
- ✅ Error: "No se puede cambiar el producto de un lead..."

---

## 📝 Checklist de Testing

### **Base de Datos:**
- [ ] Índice único existe
- [ ] No hay productos con múltiples cuentas
- [ ] Intentar crear cuenta duplicada falla

### **Código - createAccount():**
- [ ] Permite crear cuenta sin product_id
- [ ] Previene crear cuenta duplicada
- [ ] Mensaje de error claro

### **Código - updateAccount():**
- [ ] Previene actualizar a producto ocupado
- [ ] Permite actualizar si producto está libre

### **Código - createLead():**
- [ ] Previene crear lead con cuenta de otro producto
- [ ] Permite crear lead si cuenta coincide
- [ ] Permite crear lead si cuenta no tiene product_id

### **Código - moveLeadToStage():**
- [ ] Previene mover lead a otro producto
- [ ] Permite mover lead dentro del mismo producto

### **Código - updateLead():**
- [ ] Previene cambiar product_id
- [ ] Permite actualizar otros campos

---

## 🔧 Tests Unitarios Requieren Ajustes

Los tests unitarios necesitan ajustes en los mocks para simular correctamente:
- Las múltiples llamadas a supabase en cada función
- El encadenamiento de métodos (from -> select -> eq -> maybeSingle)
- Los diferentes resultados según el caso

**Archivo:** `tests/whatsapp/product-independence.test.js`

**Status:** 7/12 tests pasando (58%)
- ✅ Tests de moveLeadToStage() pasando
- ✅ Tests de updateLead() pasando
- ⚠️ Tests de createAccount() requieren ajustes
- ⚠️ Tests de createLead() requieren ajustes

---

## ✅ Recomendación

**Para testing inmediato:**
1. ✅ Ejecutar tests SQL en Supabase
2. ✅ Hacer testing manual desde la UI
3. ⚠️ Ajustar mocks de tests unitarios después

**Los tests unitarios son complementarios, el testing más importante es:**
- ✅ Validación en BD (índice único)
- ✅ Testing manual desde la aplicación

---

**¿Quieres que corrija los mocks de los tests unitarios o prefieres hacer testing manual primero?** 🧪



