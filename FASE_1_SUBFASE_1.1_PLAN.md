# 📋 FASE 1 - SUBFASE 1.1: Índice Único para WhatsApp Account

## 🎯 Objetivo

Crear índice único en `whatsapp_accounts.product_id` para asegurar que cada producto solo tenga UN WhatsApp Account.

---

## ✅ Tareas

- [x] Crear migración SQL `019_unique_whatsapp_account_per_product.sql`
- [ ] Ejecutar migración en Supabase
- [ ] Verificar que no hay duplicados
- [ ] Verificar que el índice funciona
- [ ] Testing: Intentar crear cuenta duplicada (debe fallar)

---

## 📝 Migración Creada

**Archivo:** `supabase/migrations/019_unique_whatsapp_account_per_product.sql`

**Funcionalidad:**
1. ✅ Limpia duplicados existentes (mantiene el más reciente)
2. ✅ Crea índice único parcial (solo donde product_id IS NOT NULL)
3. ✅ Verifica que todo esté correcto

---

## 🧪 Testing

Después de ejecutar la migración:

### **Test 1: Verificar Índice**
```sql
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'whatsapp_accounts' 
  AND indexname = 'idx_accounts_product_unique';
```

### **Test 2: Intentar Crear Duplicado (debe fallar)**
```sql
-- Primero crear una cuenta con product_id
INSERT INTO whatsapp_accounts (product_id, phone_number_id, ...) VALUES (...);

-- Intentar crear otra cuenta con el mismo product_id (debe fallar)
INSERT INTO whatsapp_accounts (product_id, phone_number_id, ...) VALUES (...);
```

---

## ⏭️ Siguiente Paso

Después de completar esta subfase:
- ✅ **SUBFASE 1.2:** Validar en createAccount() que no haya duplicados

---

**Listo para ejecutar la migración** 🚀
