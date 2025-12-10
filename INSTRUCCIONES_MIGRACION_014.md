# 📋 Instrucciones: Migración 014 - Funciones SQL Helper

## 🎯 Objetivo

Crear funciones SQL helper para operaciones comunes de leads:
- `get_leads_by_product_id()` - Obtener leads por producto
- `count_leads_by_stage()` - Contar leads por etapa
- `update_lead_activity()` - Actualizar última actividad
- `get_leads_by_account_id()` - Obtener leads por cuenta
- `contact_has_lead()` - Verificar si contacto tiene lead
- `get_lead_by_contact()` - Obtener lead de un contacto
- `get_lead_stats_by_product()` - Estadísticas de leads

---

## 📝 Pasos para Ejecutar

### 1. Verificar Migración 013
- ✅ Asegúrate de haber ejecutado la migración 013 primero
- ✅ Verifica que las tablas existen

### 2. Ejecutar Migración 014
1. Abre `supabase/migrations/014_whatsapp_leads_functions.sql`
2. Copia todo el contenido
3. Pégalo en el SQL Editor de Supabase
4. Ejecuta el script

### 3. Verificar Funciones
1. Ejecuta `scripts/test-leads-functions.sql`
2. Verifica que todas las funciones existen
3. Prueba las funciones con datos reales (ajustar UUIDs)

---

## ✅ Checklist de Verificación

### Funciones Creadas
- [ ] `get_leads_by_product_id` existe
- [ ] `count_leads_by_stage` existe
- [ ] `update_lead_activity` existe
- [ ] `get_leads_by_account_id` existe
- [ ] `contact_has_lead` existe
- [ ] `get_lead_by_contact` existe
- [ ] `get_lead_stats_by_product` existe

### Funcionalidad
- [ ] Funciones retornan resultados correctos
- [ ] Filtrado por userSkus funciona
- [ ] Filtrado por producto funciona
- [ ] Actualización de actividad funciona

---

## 🐛 Troubleshooting

### Error: "function does not exist"
- **Causa:** La migración 013 no se ejecutó
- **Solución:** Ejecuta primero la migración 013

### Error: "column does not exist"
- **Causa:** Las tablas no tienen las columnas esperadas
- **Solución:** Verifica que la migración 013 se ejecutó correctamente

---

## 📊 Resultados Esperados

Después de ejecutar, deberías tener:
- ✅ 7 funciones creadas
- ✅ Todas las funciones ejecutables sin errores
- ✅ Funciones compatibles con sistema multi-producto

---

## ✅ Siguiente Paso

**SUBFASE 1.3:** Crear pipelines por defecto para cada producto

---

**Fecha:** 2025-01-30

