# 📋 FASE 2 - SUBFASE 2.1: Schema y Base de Datos

## 🎯 Objetivo

Crear la estructura de base de datos para respuestas rápidas que se activan con el comando "/" en el campo de mensaje.

---

## 📐 Tareas

### ✅ **TAREA 1: Crear Tabla `whatsapp_quick_replies`**
- **Estado**: ✅ Completada
- **Archivo**: `supabase/migrations/009_whatsapp_quick_replies_schema.sql`
- **Columnas**:
  - `id` (UUID, PRIMARY KEY)
  - `account_id` (UUID, FK a whatsapp_accounts)
  - `trigger` (TEXT) - Comando trigger (ej: "/saludo")
  - `name` (TEXT) - Nombre descriptivo
  - `type` (TEXT) - 'text', 'image', 'image_text', 'audio', 'audio_text'
  - `content_text` (TEXT) - Texto de la respuesta
  - `media_path` (TEXT) - Ruta al archivo en Storage
  - `media_type` (TEXT) - 'image' o 'audio'
  - `created_at`, `updated_at` (TIMESTAMPTZ)

### ✅ **TAREA 2: Crear Índices**
- **Estado**: ✅ Completada
- **Índices creados**:
  - `idx_quick_replies_account` en `account_id`
  - `idx_quick_replies_trigger` en `(account_id, trigger)`
  - `idx_quick_replies_created` en `created_at DESC`
  - `idx_quick_replies_account_type` en `(account_id, type)`

### ✅ **TAREA 3: Habilitar RLS y Políticas**
- **Estado**: ✅ Completada
- **Políticas creadas**:
  - `whatsapp_quick_replies_select_all`
  - `whatsapp_quick_replies_insert_all`
  - `whatsapp_quick_replies_update_all`
  - `whatsapp_quick_replies_delete_all`

### ✅ **TAREA 4: Crear Función SQL `get_quick_replies`**
- **Estado**: ✅ Completada
- **Función**: `get_quick_replies(account_id, search_term)`
- **Funcionalidad**:
  - Obtiene todas las respuestas rápidas de una cuenta
  - Opcionalmente filtra por término de búsqueda (trigger o name)
  - Ordena por fecha de creación (más recientes primero)

### ✅ **TAREA 5: Validaciones (CHECK Constraints)**
- **Estado**: ✅ Completada
- **Validaciones**:
  - `check_trigger_starts_with_slash`: Trigger debe empezar con "/"
  - `check_content_text_required`: content_text requerido para text, image_text, audio_text
  - `check_media_path_required`: media_path requerido para image, image_text, audio, audio_text
  - `check_media_type_required`: media_type requerido cuando hay media_path
  - `UNIQUE(account_id, trigger)`: Trigger único por cuenta

### ✅ **TAREA 6: Trigger para updated_at**
- **Estado**: ✅ Completada
- **Trigger**: `whatsapp_quick_replies_updated_at`
- **Función**: `update_whatsapp_quick_replies_updated_at()`

### ✅ **TAREA 7: Script de Testing**
- **Estado**: ✅ Completada
- **Archivo**: `scripts/test-quick-replies-schema.sql`
- **Tests**:
  - Verificación de tabla
  - Verificación de columnas
  - Verificación de índices
  - Verificación de RLS
  - Verificación de políticas
  - Verificación de función
  - Verificación de trigger
  - Verificación de CHECK constraints
  - Test de inserción
  - Test de validaciones

---

## 📁 Archivos Creados

1. ✅ `supabase/migrations/009_whatsapp_quick_replies_schema.sql` - Migración principal
2. ✅ `scripts/test-quick-replies-schema.sql` - Script de testing
3. ✅ `FASE_2_SUBFASE_2.1_PLAN.md` - Este documento

---

## ✅ Criterios de Éxito

- [x] Tabla `whatsapp_quick_replies` creada con todas las columnas
- [x] Índices creados para búsquedas rápidas
- [x] RLS habilitado con políticas
- [x] Función `get_quick_replies` creada y funcionando
- [x] Validaciones (CHECK constraints) implementadas
- [x] Trigger para `updated_at` funcionando
- [x] Script de testing creado

---

## 🚀 Próximos Pasos

**SUBFASE 2.2**: Servicios Backend
- Crear `src/services/whatsapp/quick-replies.js`
- Crear `src/services/whatsapp/quick-reply-sender.js`
- Crear tests unitarios

---

## 📝 Notas

- La migración sigue el mismo patrón que la migración de etiquetas (008)
- Las validaciones aseguran la integridad de los datos
- El trigger único por cuenta evita duplicados
- La función `get_quick_replies` permite búsqueda eficiente

---

**Estado**: ✅ **COMPLETADA**

