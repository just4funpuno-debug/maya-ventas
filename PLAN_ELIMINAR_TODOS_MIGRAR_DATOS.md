# 📋 Plan: Eliminar "Todos" y Migrar Datos a Cardio Vascular

## ✅ Confirmación

**¿Es mejor eliminar "Todos"?**  
✅ **SÍ** - Tiene sentido porque:
- Simplifica la UI y reduce confusión
- Cada producto debe tener su propio CRM y datos
- Facilita el mantenimiento y organización
- Evita datos "huérfanos" sin producto asignado

---

## 🎯 Objetivo

1. **Eliminar** la opción "Todos" de todos los componentes del CRM
2. **Migrar** todos los datos de prueba (sin `product_id`) al producto **"Cardio Vascular Plus"** (SKU: `CVP-60`)
3. **Garantizar** que no se pierdan datos durante la migración

---

## 📊 Análisis de Datos a Migrar

### Tablas con `product_id` NULL que necesitan migración:

1. **`whatsapp_accounts`**
   - Campo: `product_id`
   - Impacto: Alto - afecta todo lo relacionado

2. **`whatsapp_leads`**
   - Campo: `product_id`
   - Impacto: Medio - leads sin producto asignado

3. **`whatsapp_pipelines`**
   - Campo: `product_id`
   - Impacto: Medio - pipelines sin producto

### Datos relacionados (se migran automáticamente vía foreign keys):

- `whatsapp_sequences` → vía `account_id`
- `whatsapp_sequence_messages` → vía `sequence_id`
- `whatsapp_contacts` → vía `account_id`
- `whatsapp_messages` → vía `account_id`
- `whatsapp_contact_tags` → vía `contact_id`

---

## 📋 Plan por Fases y Subfases

### **FASE 1: Análisis y Preparación**
**Objetivo:** Identificar datos a migrar y obtener ID del producto

#### SUBFASE 1.1: Script de Análisis
- Crear script SQL para identificar:
  - Cuentas sin producto
  - Leads sin producto
  - Pipelines sin producto
  - Conteo total de registros afectados

#### SUBFASE 1.2: Obtener ID de Cardio Vascular
- Script SQL para obtener `id` del producto con SKU `CVP-60`
- Verificar que existe
- Guardar ID para usar en migración

---

### **FASE 2: Migración de Datos**
**Objetivo:** Migrar datos sin producto a Cardio Vascular

#### SUBFASE 2.1: Migrar `whatsapp_accounts`
- Actualizar `product_id = NULL` → `product_id = [ID_CVP-60]`
- Verificar que no haya errores
- Contar registros migrados

#### SUBFASE 2.2: Migrar `whatsapp_leads`
- Actualizar `product_id = NULL` → `product_id = [ID_CVP-60]`
- Verificar integridad referencial
- Contar registros migrados

#### SUBFASE 2.3: Migrar `whatsapp_pipelines`
- Actualizar `product_id = NULL` → `product_id = [ID_CVP-60]`
- Verificar que no haya duplicados
- Contar registros migrados

#### SUBFASE 2.4: Verificación Post-Migración
- Script SQL para verificar que no queden `product_id = NULL`
- Verificar integridad de datos relacionados
- Generar reporte de migración

---

### **FASE 3: Eliminar "Todos" del Frontend**
**Objetivo:** Remover opción "Todos" de todos los componentes

#### SUBFASE 3.1: Eliminar de `LeadsKanban.jsx`
- Remover botón "Todos"
- Ajustar lógica para seleccionar primer producto por defecto
- Verificar que funciona correctamente

#### SUBFASE 3.2: Eliminar de `SequenceConfigurator.jsx`
- Remover botón "Todos"
- Ajustar lógica de selección
- Verificar que funciona correctamente

#### SUBFASE 3.3: Eliminar de `WhatsAppDashboard.jsx`
- Remover botón "Todos"
- Ajustar lógica de selección
- Verificar que funciona correctamente

#### SUBFASE 3.4: Eliminar de `WhatsAppAccountManager.jsx`
- Remover botón "Todos"
- Ajustar lógica de selección
- Verificar que funciona correctamente

#### SUBFASE 3.5: Eliminar de `PuppeteerQueuePanel.jsx`
- Remover botón "Todos"
- Ajustar lógica de selección
- Verificar que funciona correctamente

#### SUBFASE 3.6: Eliminar de `BlockedContactsPanel.jsx`
- Remover botón "Todos"
- Ajustar lógica de selección
- Verificar que funciona correctamente

---

### **FASE 4: Ajustes de Backend**
**Objetivo:** Asegurar que el backend no permita `product_id = NULL`

#### SUBFASE 4.1: Actualizar Servicios
- Revisar `accounts.js`, `leads.js`, `pipelines.js`
- Asegurar que no se permita crear registros sin `product_id`
- Agregar validaciones si es necesario

#### SUBFASE 4.2: Actualizar Funciones SQL
- Revisar funciones que filtran por `product_id`
- Asegurar que no dependan de `product_id = NULL`
- Actualizar si es necesario

---

### **FASE 5: Testing y Verificación**
**Objetivo:** Verificar que todo funciona correctamente

#### SUBFASE 5.1: Testing de Migración
- Verificar que todos los datos se migraron correctamente
- Verificar que no se perdieron datos
- Verificar integridad referencial

#### SUBFASE 5.2: Testing de Frontend
- Verificar que no aparece "Todos" en ningún componente
- Verificar que se selecciona producto por defecto
- Verificar que todos los componentes funcionan correctamente

#### SUBFASE 5.3: Testing de Backend
- Verificar que no se pueden crear registros sin `product_id`
- Verificar que las funciones SQL funcionan correctamente
- Verificar que no hay errores en consola

---

## 🔧 Scripts SQL Necesarios

1. **`ANALISIS_DATOS_MIGRACION.sql`** - Analizar datos a migrar
2. **`OBTENER_ID_CVP60.sql`** - Obtener ID del producto
3. **`MIGRAR_ACCOUNTS.sql`** - Migrar cuentas
4. **`MIGRAR_LEADS.sql`** - Migrar leads
5. **`MIGRAR_PIPELINES.sql`** - Migrar pipelines
6. **`VERIFICAR_MIGRACION.sql`** - Verificar migración

---

## ✅ Criterios de Éxito

- ✅ No quedan registros con `product_id = NULL`
- ✅ Todos los datos están asignados a Cardio Vascular
- ✅ No aparece "Todos" en ningún componente
- ✅ Todos los componentes funcionan correctamente
- ✅ No se perdieron datos durante la migración

---

## ⚠️ Consideraciones

1. **Backup:** Hacer backup antes de migrar
2. **Rollback:** Tener plan de rollback si algo falla
3. **Testing:** Probar en ambiente de desarrollo primero
4. **Comunicación:** Informar a usuarios si es necesario

---

**¿Confirmas este plan?** Si estás de acuerdo, comenzamos con FASE 1.

