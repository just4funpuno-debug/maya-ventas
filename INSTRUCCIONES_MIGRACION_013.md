# 📋 Instrucciones: Migración 013 - Schema de CRM de Leads

## 🎯 Objetivo

Crear las tablas principales para el sistema de CRM de Leads:
- `whatsapp_leads` - Leads principales
- `whatsapp_lead_activities` - Actividades de cada lead
- `whatsapp_pipelines` - Pipelines personalizables por producto

---

## 📝 Pasos para Ejecutar

### 1. Abrir SQL Editor en Supabase
1. Ve a tu proyecto en Supabase
2. Navega a **SQL Editor**
3. Clic en **New Query**

### 2. Ejecutar la Migración
1. Abre el archivo `supabase/migrations/013_whatsapp_leads_schema.sql`
2. Copia todo el contenido
3. Pégalo en el SQL Editor de Supabase
4. Clic en **Run** o presiona `Ctrl+Enter`

### 3. Verificar que no hay Errores
- ✅ Debe mostrar "Success. No rows returned" o similar
- ❌ Si hay errores, revisa el mensaje y corrige

### 4. Ejecutar Tests
1. Abre el archivo `scripts/test-leads-schema.sql`
2. Copia y ejecuta en el SQL Editor
3. Verifica que todas las consultas retornan resultados correctos

---

## ✅ Checklist de Verificación

### Tablas Creadas
- [ ] `whatsapp_leads` existe
- [ ] `whatsapp_lead_activities` existe
- [ ] `whatsapp_pipelines` existe

### Índices Creados
- [ ] Índices en `whatsapp_leads` (contact_id, account_id, product_id, etc.)
- [ ] Índices en `whatsapp_lead_activities` (lead_id, created_at)
- [ ] Índices en `whatsapp_pipelines` (product_id, is_default)

### Triggers Creados
- [ ] Trigger `trigger_update_whatsapp_leads_updated_at`
- [ ] Trigger `trigger_update_whatsapp_pipelines_updated_at`

### RLS Policies
- [ ] Policies de SELECT en las 3 tablas
- [ ] Policies de INSERT en las 3 tablas
- [ ] Policies de UPDATE en las 3 tablas
- [ ] Policies de DELETE en las 3 tablas

### Foreign Keys
- [ ] `whatsapp_leads.contact_id` → `whatsapp_contacts.id`
- [ ] `whatsapp_leads.account_id` → `whatsapp_accounts.id`
- [ ] `whatsapp_leads.product_id` → `products.id`
- [ ] `whatsapp_leads.assigned_to` → `users.id`
- [ ] `whatsapp_lead_activities.lead_id` → `whatsapp_leads.id`
- [ ] `whatsapp_lead_activities.user_id` → `users.id`
- [ ] `whatsapp_pipelines.account_id` → `whatsapp_accounts.id`
- [ ] `whatsapp_pipelines.product_id` → `products.id`

---

## 🐛 Troubleshooting

### Error: "relation already exists"
- **Causa:** La tabla ya existe
- **Solución:** La migración usa `CREATE TABLE IF NOT EXISTS`, debería funcionar. Si persiste, verifica que no haya conflictos.

### Error: "foreign key constraint"
- **Causa:** Las tablas referenciadas no existen
- **Solución:** Verifica que `whatsapp_contacts`, `whatsapp_accounts`, `products`, `users` existan.

### Error: "permission denied"
- **Causa:** No tienes permisos para crear tablas
- **Solución:** Usa una cuenta con permisos de administrador en Supabase.

---

## 📊 Resultados Esperados

Después de ejecutar la migración y los tests, deberías ver:

1. **3 tablas creadas** con todas sus columnas
2. **Múltiples índices** para optimizar consultas
3. **2 triggers** para actualizar `updated_at`
4. **12 policies RLS** (4 por tabla: SELECT, INSERT, UPDATE, DELETE)
5. **8 foreign keys** establecidas correctamente

---

## ✅ Siguiente Paso

Una vez verificada la migración 013, proceder con:
- **SUBFASE 1.2:** Crear funciones SQL helper
- **SUBFASE 1.3:** Crear pipelines por defecto

---

**Fecha:** 2025-01-30

