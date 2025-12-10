# 📱 PLAN DE DESARROLLO: CRM WhatsApp Cloud API con Coexistencia

**Fecha:** 2025-01-30  
**Proyecto:** Maya Ventas - Integración WhatsApp CRM  
**Stack Actual:** React + Vite + Supabase + Tailwind CSS

---

## 📋 ANÁLISIS DEL BRIEF

### ✅ Requisitos Identificados

1. **Múltiples cuentas WhatsApp** (una por producto o más)
2. **Coexistencia** (enviar desde celular y API simultáneamente)
3. **Secuencias automáticas configurables** (no fijas, flexibles)
4. **Ventana 24h inteligente** (se reactiva con envíos manuales)
5. **Detección automática de bloqueos** (monitoreo universal)
6. **Sistema de mensajes pendientes manuales**
7. **Dashboard tipo WhatsApp Web**
8. **Integración con sistema de ventas existente**

### 🔍 Adaptaciones Necesarias al Stack Actual

**Cambios respecto al brief original:**
- ❌ No usaremos Next.js (ya tienen Vite)
- ✅ Usaremos Vite + Supabase Edge Functions para webhooks
- ✅ Integraremos con la app React existente
- ✅ Usaremos Supabase Realtime (ya configurado)
- ✅ Múltiples números WhatsApp = múltiples configuraciones

---

## 🗄️ ESQUEMA DE BASE DE DATOS

### Tablas Principales

```sql
-- 1. Configuración de números WhatsApp (múltiples cuentas)
CREATE TABLE whatsapp_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number_id VARCHAR(50) UNIQUE NOT NULL, -- WhatsApp Phone Number ID
  business_account_id VARCHAR(50) NOT NULL,
  access_token TEXT NOT NULL, -- Encriptado o en Supabase Vault
  verify_token VARCHAR(100) NOT NULL,
  phone_number VARCHAR(20) NOT NULL, -- Número legible
  display_name VARCHAR(100),
  product_id UUID REFERENCES products(id) ON DELETE SET NULL, -- Opcional: asociar a producto
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Contactos de WhatsApp
CREATE TABLE whatsapp_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES whatsapp_accounts(id) ON DELETE CASCADE,
  phone VARCHAR(20) NOT NULL, -- Número sin + ni espacios
  name VARCHAR(200),
  profile_pic_url TEXT,
  
  -- Ventana 24h (CRÍTICO)
  last_interaction_at TIMESTAMPTZ, -- Última interacción (cliente/manual/crm)
  last_interaction_source VARCHAR(20) CHECK (last_interaction_source IN ('client', 'manual', 'crm')),
  window_expires_at TIMESTAMPTZ, -- last_interaction_at + 24h
  window_active BOOLEAN GENERATED ALWAYS AS (NOW() < window_expires_at) STORED,
  
  -- Engagement
  total_messages_sent INT DEFAULT 0,
  total_messages_delivered INT DEFAULT 0,
  total_messages_read INT DEFAULT 0,
  client_responses_count INT DEFAULT 0,
  responded_ever BOOLEAN DEFAULT false,
  
  -- Detección bloqueos
  consecutive_undelivered INT DEFAULT 0,
  block_probability INT DEFAULT 0 CHECK (block_probability BETWEEN 0 AND 100),
  is_blocked BOOLEAN DEFAULT false,
  
  -- Secuencia
  sequence_active BOOLEAN DEFAULT false,
  sequence_id UUID REFERENCES whatsapp_sequences(id) ON DELETE SET NULL,
  sequence_position INT DEFAULT 0, -- En qué mensaje va (1, 2, 3...)
  sequence_started_at TIMESTAMPTZ, -- Cuándo inició la secuencia
  messages_skipped INT[] DEFAULT '{}', -- Array de mensajes saltados [6, 7, 8]
  messages_completed_manual INT[] DEFAULT '{}', -- Enviados desde celular [7, 10]
  
  -- Meta
  labels TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(account_id, phone) -- Un contacto por número por cuenta
);

-- 3. Mensajes
CREATE TABLE whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES whatsapp_contacts(id) ON DELETE CASCADE,
  account_id UUID REFERENCES whatsapp_accounts(id) ON DELETE CASCADE,
  wa_message_id VARCHAR(100) UNIQUE, -- ID de WhatsApp
  
  -- Contenido
  message_type VARCHAR(20) CHECK (message_type IN ('text', 'audio', 'image', 'video', 'document')),
  text_content TEXT,
  media_url TEXT, -- URL en Supabase Storage
  media_filename VARCHAR(255),
  media_mime_type VARCHAR(100),
  media_caption TEXT,
  media_wa_id VARCHAR(100), -- Media ID de WhatsApp (para reutilizar)
  
  -- Origen y contexto
  is_from_me BOOLEAN DEFAULT false,
  source VARCHAR(20) CHECK (source IN ('crm', 'manual', 'client')),
  sequence_message_id INT, -- A qué mensaje de secuencia corresponde (1, 2, 3...)
  was_skipped BOOLEAN DEFAULT false, -- Si fue saltado por ventana cerrada
  
  -- Estado
  status VARCHAR(20) CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')) DEFAULT 'pending',
  status_updated_at TIMESTAMPTZ,
  error_message TEXT,
  
  -- Timestamps
  timestamp TIMESTAMPTZ NOT NULL, -- Timestamp del mensaje
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Secuencias configurables
CREATE TABLE whatsapp_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES whatsapp_accounts(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  total_messages INT DEFAULT 0, -- Calculado automáticamente
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Mensajes de secuencia (configuración flexible)
CREATE TABLE whatsapp_sequence_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID REFERENCES whatsapp_sequences(id) ON DELETE CASCADE,
  message_number INT NOT NULL, -- 1, 2, 3... hasta N (identificador único)
  message_type VARCHAR(20) CHECK (message_type IN ('text', 'audio', 'image', 'video', 'document')),
  
  -- Contenido
  content_text TEXT,
  media_url TEXT, -- URL en Supabase Storage
  media_filename VARCHAR(255),
  caption TEXT, -- Para imágenes/videos
  
  -- Timing
  delay_hours_from_previous INT DEFAULT 0, -- Horas desde mensaje anterior
  
  -- Orden
  order_position INT NOT NULL, -- Para reordenar (drag & drop)
  
  -- Estado
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(sequence_id, message_number)
);

-- 6. Mensajes pendientes manuales
CREATE TABLE whatsapp_pending_manual (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES whatsapp_contacts(id) ON DELETE CASCADE,
  account_id UUID REFERENCES whatsapp_accounts(id) ON DELETE CASCADE,
  sequence_id UUID REFERENCES whatsapp_sequences(id) ON DELETE SET NULL,
  message_number INT NOT NULL, -- Qué mensaje de secuencia
  message_type VARCHAR(20) CHECK (message_type IN ('text', 'audio', 'image', 'video', 'document')),
  
  -- Contenido sugerido
  suggested_text TEXT,
  media_url TEXT,
  media_filename VARCHAR(255),
  
  -- Prioridad
  priority VARCHAR(10) CHECK (priority IN ('HIGH', 'MEDIUM', 'LOW')) DEFAULT 'MEDIUM',
  
  -- Estado
  sent_manually BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Meta
  skipped_count INT DEFAULT 0, -- Cuántos mensajes saltados lleva
  notes TEXT
);

-- 7. Problemas de entrega / Bloqueos
CREATE TABLE whatsapp_delivery_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES whatsapp_contacts(id) ON DELETE CASCADE,
  account_id UUID REFERENCES whatsapp_accounts(id) ON DELETE CASCADE,
  message_id UUID REFERENCES whatsapp_messages(id) ON DELETE SET NULL,
  
  -- Detección
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  issue_type VARCHAR(20) CHECK (issue_type IN ('undelivered', 'probable_block', 'confirmed_block')),
  message_source VARCHAR(20) CHECK (message_source IN ('crm', 'manual')),
  
  -- Métricas
  days_undelivered INT DEFAULT 0,
  consecutive_count INT DEFAULT 0,
  
  -- Acción
  action_taken VARCHAR(20) CHECK (action_taken IN ('none', 'paused', 'stopped')) DEFAULT 'none',
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  notes TEXT
);

-- 8. Webhooks recibidos (log para debugging)
CREATE TABLE whatsapp_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES whatsapp_accounts(id) ON DELETE SET NULL,
  event_type VARCHAR(50), -- 'message', 'status', etc.
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices críticos
CREATE INDEX idx_contacts_account_phone ON whatsapp_contacts(account_id, phone);
CREATE INDEX idx_contacts_window_active ON whatsapp_contacts(window_active, window_expires_at);
CREATE INDEX idx_contacts_sequence_active ON whatsapp_contacts(sequence_active, sequence_position);
CREATE INDEX idx_messages_contact_timestamp ON whatsapp_messages(contact_id, timestamp DESC);
CREATE INDEX idx_messages_status ON whatsapp_messages(status, status_updated_at);
CREATE INDEX idx_messages_wa_id ON whatsapp_messages(wa_message_id);
CREATE INDEX idx_pending_manual_contact ON whatsapp_pending_manual(contact_id, sent_manually, priority);
CREATE INDEX idx_sequence_messages_order ON whatsapp_sequence_messages(sequence_id, order_position);
CREATE INDEX idx_delivery_issues_contact ON whatsapp_delivery_issues(contact_id, resolved);

-- Triggers para updated_at
CREATE TRIGGER whatsapp_accounts_updated BEFORE UPDATE ON whatsapp_accounts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER whatsapp_contacts_updated BEFORE UPDATE ON whatsapp_contacts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER whatsapp_messages_updated BEFORE UPDATE ON whatsapp_messages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER whatsapp_sequences_updated BEFORE UPDATE ON whatsapp_sequences
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER whatsapp_sequence_messages_updated BEFORE UPDATE ON whatsapp_sequence_messages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Función para actualizar total_messages en secuencias
CREATE OR REPLACE FUNCTION update_sequence_total_messages()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE whatsapp_sequences
  SET total_messages = (
    SELECT COUNT(*) FROM whatsapp_sequence_messages
    WHERE sequence_id = COALESCE(NEW.sequence_id, OLD.sequence_id)
    AND active = true
  )
  WHERE id = COALESCE(NEW.sequence_id, OLD.sequence_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sequence_messages_count AFTER INSERT OR UPDATE OR DELETE ON whatsapp_sequence_messages
  FOR EACH ROW EXECUTE FUNCTION update_sequence_total_messages();
```

---

## 🚀 PLAN DE DESARROLLO POR FASES

### **FASE 1: FUNDACIÓN (Días 1-3)** ⚡ CRÍTICO

#### **Subfase 1.1: Base de Datos y Configuración**
- [ ] Crear schema completo en Supabase
- [ ] Configurar RLS (Row Level Security) para todas las tablas
- [ ] Crear funciones SQL auxiliares:
  - `calculate_window_24h(contact_id)` - Calcula ventana 24h
  - `update_contact_interaction(contact_id, source)` - Actualiza última interacción
  - `check_sequence_next_message(contact_id)` - Verifica siguiente mensaje
- [ ] Configurar Supabase Storage bucket `whatsapp-media`
- [ ] Crear Edge Function base para webhooks

**Archivos a crear:**
- `supabase/migrations/001_whatsapp_schema.sql`
- `supabase/functions/whatsapp-webhook/index.ts`
- `src/services/whatsapp/config.ts`

#### **Subfase 1.2: Configuración de Cuentas WhatsApp**
- [ ] UI para agregar/editar cuentas WhatsApp
- [ ] Formulario con campos:
  - Phone Number ID
  - Business Account ID
  - Access Token (encriptado)
  - Verify Token
  - Número de teléfono
  - Asociación opcional a producto
- [ ] Validación de tokens
- [ ] Lista de cuentas activas

**Archivos a crear:**
- `src/components/whatsapp/WhatsAppAccountManager.jsx`
- `src/services/whatsapp/accounts.js`
- `src/utils/whatsapp/validation.js`

#### **Subfase 1.3: Webhook Básico (Recibir Mensajes)**
- [ ] Edge Function para recibir webhooks de WhatsApp
- [ ] Verificación de webhook (GET)
- [ ] Procesamiento de eventos (POST):
  - `messages` - Mensajes entrantes
  - `status` - Estados de mensajes enviados
- [ ] Detección de `is_from_me = true` (envíos manuales)
- [ ] Guardar mensajes en BD
- [ ] Actualizar `last_interaction_at` cuando corresponde
- [ ] Descargar media y guardar en Supabase Storage

**Archivos a crear:**
- `supabase/functions/whatsapp-webhook/index.ts` (completo)
- `src/services/whatsapp/webhook-processor.js`
- `src/services/whatsapp/media-downloader.js`

---

### **FASE 2: ENVÍO Y VENTANA 24H (Días 4-6)** 🔥 IMPORTANTE

#### **Subfase 2.1: API para Enviar Mensajes**
- [ ] Función para enviar texto
- [ ] Función para subir media a WhatsApp
- [ ] Función para enviar audio
- [ ] Función para enviar imagen (con caption)
- [ ] Función para enviar video (con caption)
- [ ] Función para enviar documentos PDF
- [ ] Validación de ventana 24h antes de enviar
- [ ] Manejo de errores y reintentos
- [ ] Guardar estado de mensajes (sent, delivered, read)

**Archivos a crear:**
- `src/services/whatsapp/message-sender.js`
- `src/services/whatsapp/media-uploader.js`
- `src/utils/whatsapp/window-24h.js`

#### **Subfase 2.2: Lógica de Ventana 24h**
- [ ] Función para calcular ventana activa
- [ ] Actualización automática cuando:
  - Cliente responde
  - Se envía manual desde celular
  - Se envía automático desde CRM
- [ ] Trigger en BD para actualizar `window_expires_at`
- [ ] Validación antes de cada envío

**Archivos a crear:**
- `src/utils/whatsapp/window-24h.js` (completo)
- `supabase/migrations/002_window_24h_triggers.sql`

#### **Subfase 2.3: Dashboard Básico (Lista + Chat)**
- [ ] Sidebar con lista de conversaciones
  - Foto de perfil
  - Nombre
  - Último mensaje
  - Badge de no leídos
  - Indicador de ventana 24h
- [ ] Ventana de chat
  - Burbujas de mensajes (verde/blanco)
  - Mostrar texto, imágenes, audios, videos
  - Estados: ✓ sent, ✓✓ delivered, ✓✓ read
  - Indicador de origen (CRM/manual/cliente)
- [ ] Input para escribir mensajes
- [ ] Botón para adjuntar archivos
- [ ] Integración con Supabase Realtime

**Archivos a crear:**
- `src/components/whatsapp/WhatsAppDashboard.jsx`
- `src/components/whatsapp/ConversationList.jsx`
- `src/components/whatsapp/ChatWindow.jsx`
- `src/components/whatsapp/MessageBubble.jsx`
- `src/hooks/useWhatsAppRealtime.js`

---

### **FASE 3: SECUENCIAS AUTOMÁTICAS (Días 7-10)** 🎯 CORE

#### **Subfase 3.1: Configurador de Secuencias**
- [ ] UI para crear/editar secuencias
- [ ] Agregar/eliminar mensajes (flexible, no fijo)
- [ ] Drag & drop para reordenar
- [ ] Para cada mensaje:
  - Tipo (texto, audio, imagen, video, documento)
  - Contenido o archivo
  - Delay en horas
  - Vista previa
- [ ] Guardar configuración
- [ ] Activar/desactivar secuencia
- [ ] Duplicar secuencia (templates)

**Archivos a crear:**
- `src/components/whatsapp/SequenceConfigurator.jsx`
- `src/components/whatsapp/SequenceMessageEditor.jsx`
- `src/services/whatsapp/sequences.js`

#### **Subfase 3.2: Motor de Secuencias**
- [ ] Lógica de evaluación independiente por mensaje
- [ ] Cálculo de cuándo enviar cada mensaje
- [ ] Verificación de ventana 24h antes de cada envío
- [ ] Lógica de saltar mensajes (no detenerse)
- [ ] Agregar a `pending_manual` si ventana cerrada
- [ ] Continuar con siguiente mensaje programado
- [ ] Pausar secuencia si cliente responde

**Archivos a crear:**
- `src/services/whatsapp/sequence-engine.js`
- `src/utils/whatsapp/sequence-calculator.js`

#### **Subfase 3.3: Cron Job / Automatización**
- [ ] Edge Function para procesar secuencias
- [ ] Ejecutar cada 1 hora:
  - Obtener contactos con secuencia activa
  - Verificar si es momento de enviar siguiente mensaje
  - Evaluar ventana 24h
  - Enviar automático o agregar a manual
- [ ] Configurar en Supabase Cron o Vercel Cron

**Archivos a crear:**
- `supabase/functions/process-sequences/index.ts`
- `src/services/whatsapp/cron-processor.js`

---

### **FASE 4: MENSAJES PENDIENTES Y DETECCIÓN (Días 11-13)** 🛡️ SEGURIDAD

#### **Subfase 4.1: Panel de Mensajes Pendientes Manuales**
- [ ] Lista de contactos esperando mensaje manual
- [ ] Mostrar:
  - Nombre y teléfono
  - Qué mensaje enviar (número en secuencia)
  - Tipo de mensaje
  - Texto sugerido para copiar
  - Archivo a enviar (si aplica)
  - Cuántos mensajes saltados
  - Prioridad (ALTA/MEDIA/BAJA)
- [ ] Botón "Copiar texto"
- [ ] Botón "Ver archivo"
- [ ] Botón "Marcar como enviado" (manual)
- [ ] Agrupar por prioridad
- [ ] Sistema detecta envío automáticamente via webhook

**Archivos a crear:**
- `src/components/whatsapp/PendingManualMessages.jsx`
- `src/components/whatsapp/PendingMessageCard.jsx`
- `src/services/whatsapp/pending-manual.js`

#### **Subfase 4.2: Detección Automática de Bloqueos**
- [ ] Monitorear TODOS los mensajes (CRM + manual)
- [ ] Escanear mensajes en "sent" por 72h+
- [ ] Contar mensajes consecutivos sin entregar
- [ ] Marcar como "Probable bloqueo" (2+ consecutivos)
- [ ] Marcar como "Bloqueado confirmado" (3+ consecutivos)
- [ ] Pausar secuencia automáticamente
- [ ] Agregar a lista de revisión

**Archivos a crear:**
- `src/services/whatsapp/block-detector.js`
- `supabase/functions/detect-blocks/index.ts`

#### **Subfase 4.3: Panel de Posibles Bloqueos**
- [ ] Lista de contactos con problemas de entrega
- [ ] Mostrar:
  - Nombre y teléfono
  - Cuántos mensajes sin entregar
  - Origen de mensajes (CRM y/o manual)
  - Último mensaje entregado
  - Probabilidad de bloqueo (%)
- [ ] Acciones:
  - Eliminar contacto
  - Reactivar secuencia (falso positivo)
  - Agregar nota
- [ ] Botón "Limpiar todos los bloqueados"
- [ ] Estadísticas de tasa de bloqueo

**Archivos a crear:**
- `src/components/whatsapp/BlockedContacts.jsx`
- `src/services/whatsapp/block-manager.js`

---

### **FASE 5: ETIQUETAS Y ESTADÍSTICAS (Días 14-16)** 📊 ANALYTICS

#### **Subfase 5.1: Sistema de Etiquetas Automáticas**
- [ ] Generar etiquetas automáticamente:
  - Por estado de ventana
  - Por engagement
  - Por problemas de entrega
  - Por posición en secuencia
  - Por mensaje pendiente manual
- [ ] Mostrar etiquetas en dashboard
- [ ] Filtrar por etiquetas

**Archivos a crear:**
- `src/services/whatsapp/label-generator.js`
- `src/components/whatsapp/ContactLabels.jsx`

#### **Subfase 5.2: Estadísticas y Reportes**
- [ ] Dashboard de estadísticas:
  - Total de contactos activos
  - Mensajes enviados/entregados/leídos
  - Desglose por origen (CRM vs manual)
  - Tasa de entrega (%)
  - Tasa de lectura (%)
  - Tasa de bloqueo (%)
  - Mensajes saltados por ventana cerrada
  - Promedio de mensajes manuales por día
- [ ] Gráficas:
  - Engagement por día
  - Contactos por etapa de secuencia
  - Distribución de mensajes pendientes
- [ ] Exportar reportes (CSV/PDF)

**Archivos a crear:**
- `src/components/whatsapp/WhatsAppStats.jsx`
- `src/services/whatsapp/stats-calculator.js`
- `src/utils/whatsapp/report-exporter.js`

---

### **FASE 6: INTEGRACIÓN Y PULIDO (Días 17-20)** ✨ FINAL

#### **Subfase 6.1: Integración con Sistema de Ventas**
- [ ] Asociar contactos con ventas existentes
- [ ] Crear contacto automáticamente desde venta
- [ ] Mostrar historial de ventas en chat
- [ ] Botón "Crear venta" desde chat
- [ ] Sincronizar datos de cliente

**Archivos a crear:**
- `src/services/whatsapp/sales-integration.js`
- `src/components/whatsapp/SalesHistoryPanel.jsx`

#### **Subfase 6.2: UI/UX Refinado**
- [ ] Mejorar diseño del dashboard
- [ ] Animaciones y transiciones
- [ ] Notificaciones en tiempo real
- [ ] Modo oscuro/claro
- [ ] Responsive design
- [ ] Optimización de rendimiento

#### **Subfase 6.3: Testing y Manejo de Errores**
- [ ] Tests unitarios para lógica crítica
- [ ] Tests de integración para webhooks
- [ ] Manejo robusto de errores
- [ ] Logging y monitoreo
- [ ] Documentación de API

**Archivos a crear:**
- `src/__tests__/whatsapp/`
- `src/services/whatsapp/error-handler.js`
- `docs/WHATSAPP_API.md`

---

## ⚠️ DESAFÍOS TÉCNICOS IDENTIFICADOS

### 1. **Múltiples Cuentas WhatsApp**
**Desafío:** Gestionar múltiples números WhatsApp con diferentes tokens y configuraciones.

**Solución:**
- Tabla `whatsapp_accounts` para almacenar configuraciones
- Middleware que identifica qué cuenta usar según contexto
- Webhook debe identificar qué cuenta recibió el mensaje

### 2. **Coexistencia (Celular + API)**
**Desafío:** Detectar cuando se envía desde celular vs API.

**Solución:**
- Webhook recibe `is_from_me = true` cuando envías desde celular
- Verificar `source` en mensajes para distinguir
- Actualizar `last_interaction_at` cuando detectes envío manual

### 3. **Ventana 24h Reactiva**
**Desafío:** La ventana debe reactivarse con envíos manuales.

**Solución:**
- Trigger en BD que actualiza `window_expires_at` automáticamente
- Función que recalcula ventana en cada interacción
- Verificar ventana antes de cada envío automático

### 4. **Secuencias que No se Detienen**
**Desafío:** El CRM debe continuar aunque mensajes anteriores estén pendientes.

**Solución:**
- Evaluar cada mensaje independientemente
- Usar `sequence_position` para saber dónde está cada contacto
- Calcular cuándo enviar cada mensaje basado en `sequence_started_at` + delays acumulados

### 5. **Detección de Bloqueos**
**Desafío:** WhatsApp no notifica explícitamente bloqueos.

**Solución:**
- Monitorear estados de mensajes
- Detectar patrones (2+ consecutivos sin entregar)
- Marcar probabilidad de bloqueo
- Pausar secuencias automáticamente

### 6. **Media Management**
**Desafío:** Descargar, almacenar y reutilizar media de WhatsApp.

**Solución:**
- Descargar media desde WhatsApp API
- Guardar en Supabase Storage
- Reutilizar `media_wa_id` cuando sea posible
- Comprimir imágenes antes de almacenar

### 7. **Cron Jobs en Vite**
**Desafío:** Vite no tiene cron jobs nativos como Next.js.

**Solución:**
- Usar Supabase Edge Functions con triggers
- O usar Vercel Cron Jobs
- O usar servicio externo (cron-job.org)

### 8. **Realtime Performance**
**Desafío:** Muchos contactos y mensajes pueden afectar rendimiento.

**Solución:**
- Paginación en lista de conversaciones
- Lazy loading de mensajes antiguos
- Optimizar queries con índices
- Usar virtual scrolling

---

## 💡 MEJORAS SUGERIDAS A LA ARQUITECTURA

### 1. **Separar Lógica de Negocio**
- Crear `src/services/whatsapp/` con módulos específicos
- Separar UI de lógica de negocio
- Usar hooks personalizados para estado compartido

### 2. **Cache de Configuración**
- Cachear tokens y configuraciones en memoria
- Invalidar cache cuando se actualiza configuración
- Reducir llamadas a BD

### 3. **Queue para Envíos**
- Usar cola (Supabase Queue o BullMQ) para envíos masivos
- Procesar en lotes
- Manejar rate limits de WhatsApp

### 4. **Webhook Retry Logic**
- Si falla procesar webhook, reintentar
- Guardar webhooks fallidos para reprocesar
- Alertas si hay muchos fallos

### 5. **Media CDN**
- Usar Cloudinary o similar para media
- Reducir carga en Supabase Storage
- Mejorar velocidad de carga

### 6. **Testing de Secuencias**
- Modo "test" para probar secuencias sin enviar
- Preview de cómo se verá la secuencia
- Validación antes de activar

### 7. **Backup y Restore**
- Backup automático de configuraciones
- Restore de secuencias eliminadas
- Historial de cambios

### 8. **Multi-idioma**
- Preparar estructura para múltiples idiomas
- Traducir mensajes de secuencia
- UI en español/inglés

---

## 📦 DEPENDENCIAS NECESARIAS

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.86.0", // Ya existe
    "axios": "^1.6.0", // Para llamadas a WhatsApp API
    "date-fns": "^3.0.0", // Manejo de fechas
    "react-dropzone": "^14.2.0", // Upload de archivos
    "react-hot-toast": "^2.4.0", // Notificaciones
    "clsx": "^2.1.0", // Clases condicionales
    "recharts": "^2.12.0" // Ya existe para gráficas
  },
  "devDependencies": {
    "@types/node": "^20.0.0" // Para TypeScript en Edge Functions
  }
}
```

---

## 🔐 VARIABLES DE ENTORNO NECESARIAS

```env
# WhatsApp (por cada cuenta, usar prefijo)
WA_ACCOUNT_1_PHONE_NUMBER_ID=
WA_ACCOUNT_1_BUSINESS_ACCOUNT_ID=
WA_ACCOUNT_1_ACCESS_TOKEN=
WA_ACCOUNT_1_VERIFY_TOKEN=
WA_ACCOUNT_1_PHONE_NUMBER=

WA_ACCOUNT_2_PHONE_NUMBER_ID=
WA_ACCOUNT_2_BUSINESS_ACCOUNT_ID=
WA_ACCOUNT_2_ACCESS_TOKEN=
WA_ACCOUNT_2_VERIFY_TOKEN=
WA_ACCOUNT_2_PHONE_NUMBER=

# O mejor: usar tabla whatsapp_accounts y Supabase Vault
```

---

## ✅ CHECKLIST PRE-DESARROLLO

- [ ] Revisar documentación de WhatsApp Cloud API
- [ ] Configurar cuenta de WhatsApp Business
- [ ] Obtener tokens de acceso
- [ ] Configurar webhook en Meta Developer Console
- [ ] Probar webhook básico (GET verification)
- [ ] Revisar límites de rate de WhatsApp
- [ ] Configurar Supabase Storage bucket
- [ ] Revisar políticas RLS existentes
- [ ] Planificar migración de datos (si hay datos previos)
- [ ] Definir estructura de carpetas

---

## 🎯 MÉTRICAS DE ÉXITO

1. **Funcionalidad:**
   - ✅ Recibir mensajes de WhatsApp
   - ✅ Enviar mensajes (texto, audio, imagen, video, documento)
   - ✅ Secuencias automáticas funcionando
   - ✅ Detección de bloqueos precisa
   - ✅ Mensajes pendientes manuales funcionando

2. **Rendimiento:**
   - ✅ Dashboard carga en < 2 segundos
   - ✅ Mensajes aparecen en tiempo real (< 1 segundo)
   - ✅ Envío de mensajes < 3 segundos

3. **Confiabilidad:**
   - ✅ 99%+ de webhooks procesados correctamente
   - ✅ 0 pérdida de mensajes
   - ✅ Detección de bloqueos > 95% precisión

---

## 📝 NOTAS FINALES

1. **Priorizar FASE 1 y FASE 2** - Son críticas para el funcionamiento básico
2. **Testing continuo** - Probar cada subfase antes de continuar
3. **Documentación** - Documentar cada función y componente
4. **Backup** - Hacer backup antes de cambios grandes
5. **Comunicación** - Mantener al equipo informado del progreso

---

**¿Listo para comenzar?** 🚀

Sugerencia: Empezar con FASE 1, Subfase 1.1 (Base de Datos) para tener la fundación sólida.

