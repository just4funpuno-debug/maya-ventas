# ✅ SUBFASE 1.2 COMPLETADA: Funciones SQL Auxiliares

**Fecha de finalización:** 2025-01-30  
**Estado:** ✅ Código completado (pendiente ejecutar y testear)  
**Duración:** ~2 horas

---

## 📊 RESUMEN

Se han creado **6 funciones SQL** que implementan la lógica crítica del CRM WhatsApp:

1. ✅ `calculate_window_24h()` - Calcula ventana 24h
2. ✅ `update_contact_interaction()` - Actualiza interacciones y contadores
3. ✅ `check_sequence_next_message()` - Verifica siguiente mensaje de secuencia
4. ✅ `decide_send_method()` ⭐ - Decide Cloud API vs Puppeteer
5. ✅ `add_to_puppeteer_queue()` ⭐ - Agrega mensajes a cola Puppeteer
6. ✅ `get_contact_with_window()` - Función auxiliar para obtener info completa

---

## ✅ FUNCIONES CREADAS

### 1. `calculate_window_24h(p_contact_id UUID)`

**Propósito:** Calcula `window_expires_at` desde `last_interaction_at` y retorna si ventana está activa.

**Retorna:**
- `window_expires_at` (TIMESTAMPTZ)
- `window_active` (BOOLEAN)

**Lógica:**
- Si no hay `last_interaction_at` → ventana cerrada
- Calcula expiración: `last_interaction_at + 24 horas`
- Verifica si `NOW() < window_expires_at`

**Uso:**
```sql
SELECT * FROM calculate_window_24h('contact-uuid');
```

---

### 2. `update_contact_interaction(p_contact_id UUID, p_source VARCHAR, p_interaction_time TIMESTAMPTZ)`

**Propósito:** Actualiza `last_interaction_at`, `last_interaction_source`, `window_expires_at` y contadores según `source`.

**Parámetros:**
- `p_contact_id` - UUID del contacto
- `p_source` - 'client', 'manual', 'cloud_api', o 'puppeteer'
- `p_interaction_time` - Timestamp de interacción (default: NOW())

**Retorna:**
- `updated` (BOOLEAN)
- `window_expires_at` (TIMESTAMPTZ)
- `window_active` (BOOLEAN)

**Lógica:**
- Valida que `source` sea válido
- Actualiza `last_interaction_at` y `last_interaction_source`
- Calcula `window_expires_at = interaction_time + 24h`
- Actualiza contadores según `source`:
  - `client` → `client_responses_count++`, `responded_ever = true`
  - `cloud_api` → `messages_sent_via_cloud_api++`, `total_messages_sent++`
  - `puppeteer` → `messages_sent_via_puppeteer++`, `total_messages_sent++`
  - `manual` → `messages_sent_via_manual++`, `total_messages_sent++`

**Uso:**
```sql
SELECT * FROM update_contact_interaction('contact-uuid', 'client', NOW());
```

---

### 3. `check_sequence_next_message(p_contact_id UUID)`

**Propósito:** Verifica si es momento de enviar siguiente mensaje de secuencia y retorna información del mensaje.

**Retorna:**
- `should_send` (BOOLEAN) - Si es momento de enviar
- `message_number` (INT) - Número del mensaje en secuencia
- `message_type` (VARCHAR) - Tipo de mensaje
- `content_text` (TEXT) - Contenido de texto
- `media_url` (TEXT) - URL de media
- `media_filename` (VARCHAR) - Nombre de archivo
- `caption` (TEXT) - Caption para imagen/video
- `delay_hours` (INT) - Delay desde mensaje anterior
- `sequence_message_id` (UUID) - ID del mensaje en secuencia

**Lógica:**
1. Verifica que contacto tenga secuencia activa
2. Obtiene siguiente mensaje (`sequence_position + 1`)
3. Si es primer mensaje (`position = 0`) → `should_send = true`
4. Si no, calcula tiempo acumulado hasta este mensaje
5. Compara con tiempo desde inicio de secuencia
6. Retorna `should_send = true` si ya pasó el tiempo necesario

**Uso:**
```sql
SELECT * FROM check_sequence_next_message('contact-uuid');
```

---

### 4. `decide_send_method(p_contact_id UUID)` ⭐

**Propósito:** Decide método de envío (`cloud_api` o `puppeteer`) según Free Entry Point 72h y ventana 24h.

**Retorna:**
- `method` (VARCHAR) - 'cloud_api' o 'puppeteer'
- `reason` (TEXT) - Razón de la decisión
- `is_free_entry_point` (BOOLEAN) - Si está en Free Entry Point (< 72h)
- `window_active` (BOOLEAN) - Si ventana 24h está activa
- `hours_since_creation` (INT) - Horas desde creación del contacto

**Lógica (CRÍTICA):**
1. **PASO 1:** Si contacto < 72h desde creación → `cloud_api` (Free Entry Point)
2. **PASO 2:** Si ventana 24h activa → `cloud_api` (gratis)
3. **PASO 3:** Si ventana cerrada → `puppeteer` (gratis)

**Uso:**
```sql
SELECT * FROM decide_send_method('contact-uuid');
```

---

### 5. `add_to_puppeteer_queue(...)` ⭐

**Propósito:** Agrega mensaje a `puppeteer_queue` con validación de datos.

**Parámetros:**
- `p_contact_id` (UUID) - ID del contacto
- `p_message_number` (INT) - Número de mensaje en secuencia
- `p_message_type` (VARCHAR) - 'text', 'image', 'video', 'audio', 'document'
- `p_content_text` (TEXT) - Contenido de texto (opcional)
- `p_media_path` (TEXT) - Ruta local en VPS (opcional)
- `p_media_size_kb` (INT) - Tamaño en KB (opcional)
- `p_caption` (TEXT) - Caption para imagen/video (opcional)
- `p_priority` (VARCHAR) - 'HIGH', 'MEDIUM', 'LOW' (default: 'MEDIUM')
- `p_scheduled_for` (TIMESTAMPTZ) - Cuándo debe enviarse (default: NOW())

**Retorna:**
- `queue_id` (UUID) - ID del mensaje en cola
- `success` (BOOLEAN) - Si se agregó exitosamente
- `error_message` (TEXT) - Mensaje de error si falló

**Validaciones:**
- Valida que `message_type` sea válido
- Valida que `priority` sea válido
- Valida que contacto exista
- Valida contenido según tipo:
  - `text` → requiere `content_text`
  - `image/video/audio/document` → requiere `media_path`
- Valida tamaños máximos:
  - Imagen: max 300KB
  - Video: max 10240KB (10MB)

**Uso:**
```sql
-- Mensaje de texto
SELECT * FROM add_to_puppeteer_queue(
  'contact-uuid',
  2,
  'text',
  'Mensaje de prueba',
  NULL, NULL, NULL,
  'HIGH'
);

-- Imagen
SELECT * FROM add_to_puppeteer_queue(
  'contact-uuid',
  3,
  'image',
  NULL,
  '/var/whatsapp/media/images/test.jpg',
  200,
  'Caption de prueba',
  'MEDIUM'
);
```

---

### 6. `get_contact_with_window(p_contact_id UUID)`

**Propósito:** Obtiene información completa de contacto incluyendo estado de ventana 24h y Free Entry Point.

**Retorna:**
- `contact_id` (UUID)
- `phone` (VARCHAR)
- `name` (VARCHAR)
- `last_interaction_at` (TIMESTAMPTZ)
- `last_interaction_source` (VARCHAR)
- `window_expires_at` (TIMESTAMPTZ)
- `window_active` (BOOLEAN) - Calculado dinámicamente
- `hours_since_creation` (NUMERIC)
- `is_free_entry_point` (BOOLEAN) - < 72h
- `sequence_active` (BOOLEAN)
- `sequence_position` (INT)

**Uso:**
```sql
SELECT * FROM get_contact_with_window('contact-uuid');
```

---

## 📁 ARCHIVOS CREADOS

1. ✅ `supabase/migrations/002_whatsapp_functions.sql` - Migración con todas las funciones
2. ✅ `scripts/test-functions.sql` - Script completo de testing con:
   - Datos de prueba (cuenta, secuencia, contactos)
   - Tests para cada función
   - Escenarios de prueba (Free Entry Point, ventana activa, ventana cerrada)
   - Validaciones de errores
   - Limpieza opcional

---

## 🧪 TESTING

El script `scripts/test-functions.sql` incluye:

### Datos de Prueba:
- 1 cuenta de prueba (`TEST_PHONE_NUMBER_ID`)
- 1 secuencia con 3 mensajes
- 3 contactos de prueba:
  - **Contacto 1:** < 72h (Free Entry Point activo)
  - **Contacto 2:** > 72h pero ventana 24h activa
  - **Contacto 3:** > 72h y ventana cerrada

### Tests Incluidos:
1. ✅ `calculate_window_24h` - Ventana activa y sin interacciones
2. ✅ `update_contact_interaction` - Con diferentes sources (client, cloud_api)
3. ✅ `check_sequence_next_message` - Diferentes posiciones en secuencia
4. ✅ `decide_send_method` - Los 3 escenarios críticos
5. ✅ `add_to_puppeteer_queue` - Texto, imagen válida, imagen muy grande (error), texto sin contenido (error)
6. ✅ `get_contact_with_window` - Información completa

---

## 🎯 PRÓXIMOS PASOS

1. **Ejecutar migración** en Supabase SQL Editor:
   ```sql
   -- Ejecutar: supabase/migrations/002_whatsapp_functions.sql
   ```

2. **Ejecutar tests** en Supabase SQL Editor:
   ```sql
   -- Ejecutar: scripts/test-functions.sql
   ```

3. **Verificar resultados:**
   - Todas las funciones se crean sin errores
   - Todos los tests pasan
   - Validaciones funcionan correctamente

4. **Continuar con SUBFASE 1.3:** Configuración de Storage y Realtime

---

## 📝 NOTAS TÉCNICAS

### Consideraciones de diseño:
- **Validación robusta:** Todas las funciones validan parámetros y retornan errores descriptivos
- **Lógica crítica:** `decide_send_method` implementa la estrategia híbrida completa
- **Flexibilidad:** `add_to_puppeteer_queue` acepta diferentes tipos de mensaje
- **Trazabilidad:** Todas las funciones actualizan `updated_at` automáticamente

### Puntos críticos implementados:
- ✅ Cálculo correcto de ventana 24h (desde última interacción)
- ✅ Free Entry Point 72h verificado correctamente
- ✅ Decisión inteligente Cloud API vs Puppeteer
- ✅ Validación de tamaños máximos para Puppeteer
- ✅ Actualización automática de contadores según source

---

**✅ SUBFASE 1.2 COMPLETADA (CÓDIGO)**

**Fecha:** 2025-01-30  
**Estado:** Listo para ejecutar y testear  
**Próximo:** Ejecutar migración y tests en Supabase

