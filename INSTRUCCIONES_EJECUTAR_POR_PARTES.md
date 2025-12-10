# 📋 Instrucciones: Ejecutar Migraciones por Partes

## ⚠️ Problema Detectado

La tabla `products` no existe en tu base de datos. Hemos ajustado las migraciones para usar `almacen_central` como fallback.

---

## 📝 Ejecución por Partes

### **PARTE 1: Tablas** (Ejecutar primero)

1. Abre `EJECUTAR_MIGRACION_013_PARTE_1.sql`
2. Copia TODO el contenido
3. Pégalo en SQL Editor de Supabase
4. Ejecuta (Ctrl+Enter)
5. **Verifica:** Debe mostrar "Tablas creadas: 3"

**✅ Si hay errores:** Revisa que existan las tablas:
- `whatsapp_contacts`
- `whatsapp_accounts`
- `users`

---

### **PARTE 2: Funciones** (Ejecutar segundo)

1. Abre `EJECUTAR_MIGRACION_014_PARTE_2.sql`
2. Copia TODO el contenido
3. Pégalo en SQL Editor de Supabase
4. Ejecuta (Ctrl+Enter)
5. **Verifica:** Debe mostrar "Funciones creadas: 7"

**✅ Si hay errores:** Verifica que la Parte 1 se ejecutó correctamente.

---

### **PARTE 3: Pipelines** (Ejecutar tercero)

1. Abre `EJECUTAR_MIGRACION_015_PARTE_3.sql`
2. Copia TODO el contenido
3. Pégalo en SQL Editor de Supabase
4. Ejecuta (Ctrl+Enter)
5. **Verifica:** Debe mostrar "Pipelines creados: [número]"

**✅ Si hay errores:** Verifica que exista la tabla `almacen_central` con productos.

---

## 🔧 Ajustes Realizados

### **1. Foreign Keys Removidas**
- `product_id` ya no tiene FK a `products`
- Funciona con `products` o `almacen_central`

### **2. Funciones con Fallback**
- Todas las funciones verifican si existe `products`
- Si no existe, usan `almacen_central`
- Compatible con ambos esquemas

### **3. Pipelines con Fallback**
- Intenta crear pipelines desde `products`
- Si no existe, usa `almacen_central`
- Maneja ambos casos automáticamente

---

## ✅ Orden de Ejecución

1. ✅ **PARTE 1** → Tablas (obligatorio primero)
2. ✅ **PARTE 2** → Funciones (después de Parte 1)
3. ✅ **PARTE 3** → Pipelines (después de Parte 2)

---

## 🐛 Troubleshooting

### Error: "relation whatsapp_contacts does not exist"
- **Solución:** Ejecuta primero las migraciones de WhatsApp (008, 009, etc.)

### Error: "relation whatsapp_accounts does not exist"
- **Solución:** Crea primero las cuentas de WhatsApp

### Error: "relation almacen_central does not exist"
- **Solución:** Verifica que la tabla `almacen_central` existe o crea productos en `products`

---

## 📊 Verificación Final

Después de ejecutar las 3 partes, ejecuta:

```sql
-- Verificar todo
SELECT 'Tablas' AS tipo, COUNT(*) AS total FROM information_schema.tables 
WHERE table_name IN ('whatsapp_leads', 'whatsapp_lead_activities', 'whatsapp_pipelines')
UNION ALL
SELECT 'Funciones', COUNT(*) FROM pg_proc 
WHERE proname IN ('get_leads_by_product_id', 'count_leads_by_stage', 'update_lead_activity', 
                  'get_leads_by_account_id', 'contact_has_lead', 'get_lead_by_contact', 'get_lead_stats_by_product')
UNION ALL
SELECT 'Pipelines', COUNT(*) FROM whatsapp_pipelines WHERE is_default = true;
```

Debe mostrar:
- Tablas: 3
- Funciones: 7
- Pipelines: [número de productos]

---

**¡Ejecuta las 3 partes en orden y avísame cuando termines!**

