# 📋 Instrucciones: Migración 015 - Pipelines por Defecto

## 🎯 Objetivo

Crear un pipeline por defecto para cada producto no sintético con las etapas:
- "Leads Entrantes" (azul #3b82f6)
- "Seguimiento" (naranja #f59e0b)
- "Venta" (verde #10b981)
- "Cliente" (morado #8b5cf6)

---

## 📝 Pasos para Ejecutar

### 1. Verificar Migraciones Anteriores
- ✅ Migración 013 ejecutada (tablas creadas)
- ✅ Migración 014 ejecutada (funciones creadas)

### 2. Ejecutar Migración 015
1. Abre `supabase/migrations/015_default_pipelines.sql`
2. Copia todo el contenido
3. Pégalo en el SQL Editor de Supabase
4. Ejecuta el script

### 3. Verificar Pipelines
1. Ejecuta `scripts/test-default-pipelines.sql`
2. Verifica que cada producto tiene su pipeline
3. Verifica que las etapas están correctas

---

## ✅ Checklist de Verificación

### Pipelines Creados
- [ ] Hay al menos un pipeline por defecto
- [ ] Cada producto no sintético tiene pipeline
- [ ] Pipelines tienen 4 etapas
- [ ] Etapas tienen nombres correctos
- [ ] Etapas tienen colores correctos
- [ ] No hay pipelines para productos sintéticos

### Estructura de Etapas
- [ ] "Leads Entrantes" (order: 1, color: #3b82f6)
- [ ] "Seguimiento" (order: 2, color: #f59e0b)
- [ ] "Venta" (order: 3, color: #10b981)
- [ ] "Cliente" (order: 4, color: #8b5cf6)

---

## 🐛 Troubleshooting

### No se crearon pipelines
- **Causa:** No hay productos en la base de datos
- **Solución:** Verifica que existan productos no sintéticos

### Pipelines duplicados
- **Causa:** El script se ejecutó múltiples veces
- **Solución:** El script verifica duplicados, no debería crear duplicados

---

## 📊 Resultados Esperados

Después de ejecutar:
- ✅ Un pipeline por defecto por cada producto no sintético
- ✅ Cada pipeline con 4 etapas
- ✅ Etapas con nombres y colores correctos
- ✅ Pipelines listos para usar en el CRM

---

## ✅ FASE 1 COMPLETADA

Después de verificar esta migración, la FASE 1 está completa:
- ✅ SUBFASE 1.1: Tablas creadas
- ✅ SUBFASE 1.2: Funciones creadas
- ✅ SUBFASE 1.3: Pipelines por defecto creados

**Siguiente:** FASE 2 - Backend Services

---

**Fecha:** 2025-01-30

