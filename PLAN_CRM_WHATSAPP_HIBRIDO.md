# 📱 PLAN DE DESARROLLO: CRM WhatsApp HÍBRIDO (Cloud API + Puppeteer)

**Fecha:** 2025-01-30  
**Proyecto:** Maya Ventas - Integración WhatsApp CRM Híbrido  
**Stack Actual:** React + Vite + Supabase + Tailwind CSS  
**Estrategia:** Cloud API (gratis) + Puppeteer Bot (gratis) + Manual

---

## 🎯 ESTRATEGIA HÍBRIDA DE 3 CAPAS

### 1. **Cloud API Oficial** (0-72h + ventanas 24h activas)
- ✅ Mensajes gratis cuando es posible
- ✅ 0% riesgo de baneo
- ✅ Estados de entrega en tiempo real

### 2. **Puppeteer Bot** (después 72h, ventanas cerradas)
- ✅ Reemplaza envío manual desde celular
- ✅ Abre Chrome → web.whatsapp.com
- ✅ Simula clicks y escritura humana
- ✅ $0 por mensaje
- ✅ Sesión persistente (QR una vez)

### 3. **Manual** (siempre disponible)
- ✅ Tú desde celular o WhatsApp Web
- ✅ Cuando necesites intervenir

---

## 🗄️ ESQUEMA DE BASE DE DATOS ACTUALIZADO

### Tablas Principales

```sql
-- 1. Configuración de números WhatsApp (múltiples cuentas)
CREATE TABLE whatsapp_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number_id VARCHAR(50) UNIQUE NOT NULL,
  business_account_id VARCHAR(50) NOT NULL,
  access_token TEXT NOT NULL, -- Encriptado o en Supabase Vault
  verify_token VARCHAR(100) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  display_name VARCHAR(100),
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  active BOOLEAN DEFAULT true,
  
  -- ⭐ NUEVO: Campos para OAuth (conexión automática)
  meta_app_id VARCHAR(50),
  meta_user_id VARCHAR(50),
  oauth_access_token TEXT,
  oauth_refresh_token TEXT,
  oauth_expires_at TIMESTAMPTZ,
  connection_method VARCHAR(20) CHECK (connection_method IN ('manual', 'oauth')) DEFAULT 'manual',
  coexistence_status VARCHAR(20) CHECK (coexistence_status IN ('pending', 'connected', 'failed')) DEFAULT 'pending',
  coexistence_qr_url TEXT,
  coexistence_verified_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Contactos de WhatsApp (ACTUALIZADO)
CREATE TABLE whatsapp_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES whatsapp_accounts(id) ON DELETE CASCADE,
  phone VARCHAR(20) NOT NULL,
  name VARCHAR(200),
  profile_pic_url TEXT,
  
  -- Ventana 24h (CRÍTICO)
  last_interaction_at TIMESTAMPTZ,
  last_interaction_source VARCHAR(20) CHECK (last_interaction_source IN ('client', 'manual', 'cloud_api', 'puppeteer')),
  window_expires_at TIMESTAMPTZ,
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
  sequence_position INT DEFAULT 0,
  sequence_started_at TIMESTAMPTZ,
  sequence_phase VARCHAR(20) CHECK (sequence_phase IN ('cloud_api', 'puppeteer')) DEFAULT 'cloud_api',
  phase_switched_at TIMESTAMPTZ,
  messages_sent_via_cloud_api INT DEFAULT 0,
  messages_sent_via_puppeteer INT DEFAULT 0,
  messages_sent_via_manual INT DEFAULT 0,
  
  -- Meta
  labels TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(account_id, phone)
);

-- 3. Mensajes (ACTUALIZADO)
CREATE TABLE whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES whatsapp_contacts(id) ON DELETE CASCADE,
  account_id UUID REFERENCES whatsapp_accounts(id) ON DELETE CASCADE,
  wa_message_id VARCHAR(100) UNIQUE,
  
  -- Contenido
  message_type VARCHAR(20) CHECK (message_type IN ('text', 'audio', 'image', 'video', 'document')),
  text_content TEXT,
  media_url TEXT,
  media_filename VARCHAR(255),
  media_mime_type VARCHAR(100),
  media_caption TEXT,
  media_wa_id VARCHAR(100),
  
  -- Origen y contexto (ACTUALIZADO)
  is_from_me BOOLEAN DEFAULT false,
  sent_via VARCHAR(20) CHECK (sent_via IN ('cloud_api', 'puppeteer', 'manual', 'client')),
  sequence_message_id INT,
  was_skipped BOOLEAN DEFAULT false,
  
  -- Estado
  status VARCHAR(20) CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')) DEFAULT 'pending',
  status_updated_at TIMESTAMPTZ,
  error_message TEXT,
  
  -- Timestamps
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Secuencias configurables
CREATE TABLE whatsapp_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES whatsapp_accounts(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  total_messages INT DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Mensajes de secuencia (configuración flexible)
CREATE TABLE whatsapp_sequence_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID REFERENCES whatsapp_sequences(id) ON DELETE CASCADE,
  message_number INT NOT NULL,
  message_type VARCHAR(20) CHECK (message_type IN ('text', 'audio', 'image', 'video', 'document')),
  
  -- Contenido
  content_text TEXT,
  media_url TEXT, -- URL en Supabase Storage
  media_filename VARCHAR(255),
  media_size_kb INT, -- Para validación Puppeteer
  caption TEXT,
  
  -- Timing
  delay_hours_from_previous INT DEFAULT 0,
  
  -- Orden
  order_position INT NOT NULL,
  
  -- Estado
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(sequence_id, message_number)
);

-- 6. COLA PUPPETEER ⭐ NUEVA TABLA CRÍTICA
CREATE TABLE puppeteer_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES whatsapp_contacts(id) ON DELETE CASCADE,
  account_id UUID REFERENCES whatsapp_accounts(id) ON DELETE CASCADE,
  message_number INT NOT NULL,
  message_type VARCHAR(20) CHECK (message_type IN ('text', 'image', 'video', 'audio', 'document')),
  
  -- Contenido
  content_text TEXT,
  media_path TEXT, -- Ruta LOCAL en VPS (no Supabase)
  media_size_kb INT,
  caption TEXT,
  
  -- Prioridad y timing
  priority VARCHAR(10) CHECK (priority IN ('HIGH', 'MEDIUM', 'LOW')) DEFAULT 'MEDIUM',
  scheduled_for TIMESTAMPTZ,
  
  -- Estado
  status VARCHAR(20) CHECK (status IN ('pending', 'processing', 'sent', 'failed')) DEFAULT 'pending',
  attempts INT DEFAULT 0,
  error_message TEXT,
  
  -- Timestamps
  added_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  
  -- Índices
  INDEX idx_puppeteer_queue_status (status, scheduled_for),
  INDEX idx_puppeteer_queue_contact (contact_id)
);

-- 7. CONFIGURACIÓN PUPPETEER ⭐ NUEVA TABLA
CREATE TABLE puppeteer_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES whatsapp_accounts(id) ON DELETE CASCADE,
  
  -- Velocidad de escritura
  typing_speed_min_ms INT DEFAULT 80,
  typing_speed_max_ms INT DEFAULT 150,
  
  -- Delays entre mensajes
  delay_between_messages_min_sec INT DEFAULT 45,
  delay_between_messages_max_sec INT DEFAULT 90,
  
  -- Horario laboral
  working_hours_start INT DEFAULT 9,
  working_hours_end INT DEFAULT 19,
  skip_sundays BOOLEAN DEFAULT true,
  
  -- Configuración técnica
  headless BOOLEAN DEFAULT false,
  max_retries INT DEFAULT 3,
  session_path TEXT DEFAULT '/home/user/.wwebjs_auth/session/',
  
  -- Estado
  bot_active BOOLEAN DEFAULT true,
  last_heartbeat TIMESTAMPTZ,
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Problemas de entrega / Bloqueos (ACTUALIZADO)
CREATE TABLE whatsapp_delivery_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES whatsapp_contacts(id) ON DELETE CASCADE,
  account_id UUID REFERENCES whatsapp_accounts(id) ON DELETE CASCADE,
  message_id UUID REFERENCES whatsapp_messages(id) ON DELETE SET NULL,
  
  -- Detección
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  issue_type VARCHAR(20) CHECK (issue_type IN ('undelivered', 'probable_block', 'confirmed_block')),
  message_source VARCHAR(20) CHECK (message_source IN ('cloud_api', 'puppeteer', 'manual')),
  
  -- Métricas
  days_undelivered INT DEFAULT 0,
  consecutive_count INT DEFAULT 0,
  
  -- Acción
  action_taken VARCHAR(20) CHECK (action_taken IN ('none', 'paused', 'stopped')) DEFAULT 'none',
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  notes TEXT
);

-- 9. Webhooks recibidos (log para debugging)
CREATE TABLE whatsapp_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES whatsapp_accounts(id) ON DELETE SET NULL,
  event_type VARCHAR(50),
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
CREATE INDEX idx_messages_sent_via ON whatsapp_messages(sent_via);
CREATE INDEX idx_puppeteer_queue_status_scheduled ON puppeteer_queue(status, scheduled_for);
CREATE INDEX idx_puppeteer_queue_contact ON puppeteer_queue(contact_id);
CREATE INDEX idx_sequence_messages_order ON whatsapp_sequence_messages(sequence_id, order_position);
CREATE INDEX idx_delivery_issues_contact ON whatsapp_delivery_issues(contact_id, resolved);
```

---

## 🔄 LÓGICA DE DECISIÓN INTELIGENTE

### Flujo de Decisión para Cada Mensaje

```javascript
async function decideSendMethod(contactId) {
  const contact = await getContact(contactId);
  const now = new Date();
  const createdAt = new Date(contact.created_at);
  
  // PASO 1: ¿Contacto < 72h desde creación?
  const hoursSinceCreation = (now - createdAt) / (1000 * 60 * 60);
  if (hoursSinceCreation < 72) {
    return {
      method: 'cloud_api',
      reason: 'free_entry_point',
      cost: 0
    };
  }
  
  // PASO 2: ¿Ventana 24h activa?
  if (contact.window_active) {
    return {
      method: 'cloud_api',
      reason: 'window_24h_active',
      cost: 0
    };
  }
  
  // PASO 3: Agregar a cola Puppeteer
  return {
    method: 'puppeteer',
    reason: 'window_closed',
    cost: 0
  };
}
```

---

## 🚀 PLAN DE DESARROLLO ACTUALIZADO

### **FASE 1: FUNDACIÓN (Días 1-3)** ⚡ CRÍTICO

#### **Subfase 1.1: Base de Datos y Configuración**
- [ ] Crear schema completo en Supabase (incluyendo `puppeteer_queue` y `puppeteer_config`)
- [ ] Configurar RLS (Row Level Security)
- [ ] Crear funciones SQL auxiliares
- [ ] Configurar Supabase Storage bucket `whatsapp-media`
- [ ] Crear Edge Function base para webhooks

**Archivos a crear:**
- `supabase/migrations/001_whatsapp_hybrid_schema.sql`
- `supabase/functions/whatsapp-webhook/index.ts`

#### **Subfase 1.2: Configuración de Cuentas WhatsApp**
- [x] UI para agregar/editar cuentas WhatsApp (manual)
- [x] Validación de tokens
- [x] Lista de cuentas activas
- [ ] **NUEVO:** Conexión automática via OAuth de Meta
- [ ] **NUEVO:** Botón "Conectar con Meta"
- [ ] **NUEVO:** Modal QR para coexistencia
- [ ] **NUEVO:** Obtención automática de datos

**Archivos a crear:**
- `src/components/whatsapp/WhatsAppAccountManager.jsx` ✅
- `src/services/whatsapp/accounts.js` ✅
- `supabase/migrations/005_whatsapp_oauth_fields.sql` ⭐ NUEVO
- `supabase/functions/meta-oauth-callback/index.ts` ⭐ NUEVO
- `src/services/whatsapp/meta-graph-api.js` ⭐ NUEVO
- `src/components/whatsapp/MetaConnectButton.jsx` ⭐ NUEVO
- `src/components/whatsapp/QRModal.jsx` ⭐ NUEVO

#### **Subfase 1.3: Webhook Básico (Recibir Mensajes)**
- [ ] Edge Function para recibir webhooks
- [ ] Verificación de webhook (GET)
- [ ] Procesamiento de eventos (POST)
- [ ] Detección de `is_from_me = true`
- [ ] Guardar mensajes en BD
- [ ] Actualizar `last_interaction_at`

**Archivos a crear:**
- `supabase/functions/whatsapp-webhook/index.ts` (completo)
- `src/services/whatsapp/webhook-processor.js`

---

### **FASE 2: ENVÍO Y LÓGICA DE DECISIÓN (Días 4-6)** 🔥 IMPORTANTE

#### **Subfase 2.1: API para Enviar Mensajes (Cloud API)**
- [ ] Función para enviar texto
- [ ] Función para subir media a WhatsApp
- [ ] Función para enviar audio, imagen, video, documentos
- [ ] Validación de ventana 24h antes de enviar
- [ ] Guardar estado de mensajes
- [ ] Marcar origen: `sent_via = 'cloud_api'`

**Archivos a crear:**
- `src/services/whatsapp/cloud-api-sender.js`
- `src/services/whatsapp/media-uploader.js`

#### **Subfase 2.2: Lógica de Decisión Inteligente**
- [ ] Función `decideSendMethod()`
- [ ] Verificar si contacto < 72h
- [ ] Verificar ventana 24h
- [ ] Agregar a `puppeteer_queue` si corresponde
- [ ] Actualizar contadores por método

**Archivos a crear:**
- `src/services/whatsapp/send-decision.js`
- `src/utils/whatsapp/window-24h.js`

#### **Subfase 2.3: Dashboard Básico**
- [ ] Sidebar con lista de conversaciones
- [ ] Ventana de chat
- [ ] Burbujas de mensajes
- [ ] Indicador de método de envío (Cloud API/Puppeteer/Manual)
- [ ] Input para escribir mensajes
- [ ] Integración con Supabase Realtime

**Archivos a crear:**
- `src/components/whatsapp/WhatsAppDashboard.jsx`
- `src/components/whatsapp/ConversationList.jsx`
- `src/components/whatsapp/ChatWindow.jsx`
- `src/components/whatsapp/MessageBubble.jsx`

---

### **FASE 3: PUPPETEER BOT (Días 7-13)** 🤖 CORE

#### **Subfase 3.1: Setup VPS y Puppeteer Base**
- [ ] Configurar VPS Hetzner CPX11
- [ ] Instalar Node.js 20+, Chrome/Chromium
- [ ] Instalar Puppeteer
- [ ] Configurar PM2
- [ ] Script básico de Puppeteer
- [ ] Conectar a WhatsApp Web
- [ ] Escanear QR (primera vez)
- [ ] Guardar sesión persistente

**Archivos a crear:**
- `puppeteer-bot/package.json`
- `puppeteer-bot/index.js`
- `puppeteer-bot/config.js`
- `puppeteer-bot/.env.example`

#### **Subfase 3.2: Lectura de Cola y Envío de Texto**
- [ ] Conectar a Supabase desde VPS
- [ ] Leer `puppeteer_queue` cada 5-10 min
- [ ] Buscar contacto en WhatsApp Web
- [ ] Escribir texto letra por letra (80-150ms)
- [ ] Enviar mensaje
- [ ] Actualizar status en BD
- [ ] Delays aleatorios (45-90 seg)

**Archivos a crear:**
- `puppeteer-bot/queue-reader.js`
- `puppeteer-bot/text-sender.js`
- `puppeteer-bot/utils/delays.js`

#### **Subfase 3.3: Envío de Media (Imágenes)**
- [ ] Subir imagen (max 300KB)
- [ ] Click en botón clip
- [ ] Seleccionar archivo desde VPS
- [ ] Esperar carga (1-3 seg)
- [ ] Escribir caption si aplica
- [ ] Enviar

**Archivos a crear:**
- `puppeteer-bot/image-sender.js`
- `puppeteer-bot/utils/file-handler.js`

#### **Subfase 3.4: Envío de Media (Videos, Audios, Documentos)**
- [ ] Subir video (max 10MB)
- [ ] Subir audio
- [ ] Subir documentos PDF
- [ ] Manejo de errores y reintentos
- [ ] Validación de tamaños

**Archivos a crear:**
- `puppeteer-bot/video-sender.js`
- `puppeteer-bot/audio-sender.js`
- `puppeteer-bot/document-sender.js`
- `puppeteer-bot/utils/validators.js`

#### **Subfase 3.5: Comportamiento Humano Avanzado**
- [ ] Movimiento de mouse natural
- [ ] Scroll ocasional
- [ ] Indicador "escribiendo..." visible
- [ ] Pausas como si leyera (2-4 seg)
- [ ] Horario laboral (9am-7pm)
- [ ] No enviar domingos
- [ ] Configuración desde BD

**Archivos a crear:**
- `puppeteer-bot/utils/human-behavior.js`
- `puppeteer-bot/utils/schedule.js`

---

### **FASE 4: SECUENCIAS Y AUTOMATIZACIÓN (Días 14-17)** 🎯 CORE

#### **Subfase 4.1: Configurador de Secuencias**
- [ ] UI para crear/editar secuencias
- [ ] Agregar/eliminar mensajes (flexible)
- [ ] Drag & drop para reordenar
- [ ] Configurar tipo, contenido, delay
- [ ] Validación de tamaños de media
- [ ] Vista previa

**Archivos a crear:**
- `src/components/whatsapp/SequenceConfigurator.jsx`
- `src/components/whatsapp/SequenceMessageEditor.jsx`

#### **Subfase 4.2: Motor de Secuencias con Decisión Híbrida**
- [ ] Lógica de evaluación independiente
- [ ] Cálculo de cuándo enviar cada mensaje
- [ ] Integrar `decideSendMethod()` en secuencias
- [ ] Enviar via Cloud API o agregar a Puppeteer
- [ ] Actualizar contadores por método
- [ ] Pausar si cliente responde

**Archivos a crear:**
- `src/services/whatsapp/sequence-engine.js`
- `src/services/whatsapp/sequence-decision.js`

#### **Subfase 4.3: Cron Jobs**
- [ ] Edge Function para procesar secuencias
- [ ] Ejecutar cada 1 hora
- [ ] Integrar decisión híbrida
- [ ] Configurar en Supabase Cron o Vercel Cron

**Archivos a crear:**
- `supabase/functions/process-sequences/index.ts`

---

### **FASE 5: DETECCIÓN Y GESTIÓN (Días 18-20)** 🛡️ SEGURIDAD

#### **Subfase 5.1: Panel de Cola Puppeteer**
- [ ] Lista de mensajes en cola
- [ ] Mostrar contacto, mensaje, tipo, status
- [ ] Filtros por status, prioridad, tipo
- [ ] Botón "Pausar bot" (emergencia)
- [ ] Log de últimos 100 envíos

**Archivos a crear:**
- `src/components/whatsapp/PuppeteerQueuePanel.jsx`
- `src/components/whatsapp/QueueMessageCard.jsx`

#### **Subfase 5.2: Detección Automática de Bloqueos**
- [ ] Monitorear TODOS los mensajes (Cloud API + Puppeteer + Manual)
- [ ] Escanear mensajes en "sent" por 72h+
- [ ] Contar mensajes consecutivos sin entregar
- [ ] Marcar como bloqueado según umbral
- [ ] Pausar secuencias automáticamente

**Archivos a crear:**
- `src/services/whatsapp/block-detector.js`
- `supabase/functions/detect-blocks/index.ts`

#### **Subfase 5.3: Panel de Posibles Bloqueos**
- [ ] Lista de contactos con problemas
- [ ] Mostrar métricas y probabilidad
- [ ] Acciones: eliminar, reactivar, agregar nota
- [ ] Estadísticas de tasa de bloqueo

**Archivos a crear:**
- `src/components/whatsapp/BlockedContacts.jsx`

---

### **FASE 6: CONFIGURACIÓN Y REPORTES (Días 21-23)** 📊 ANALYTICS

#### **Subfase 6.1: Configurador de Puppeteer**
- [ ] UI para configurar velocidades
- [ ] Configurar delays
- [ ] Configurar horario laboral
- [ ] Activar/desactivar bot
- [ ] Ver estado del bot (heartbeat)

**Archivos a crear:**
- `src/components/whatsapp/PuppeteerConfig.jsx`
- `src/services/whatsapp/puppeteer-config.js`

#### **Subfase 6.2: Sistema de Etiquetas**
- [ ] Generar etiquetas automáticamente
- [ ] Por método de envío
- [ ] Por estado de ventana
- [ ] Por engagement
- [ ] Por problemas de entrega

**Archivos a crear:**
- `src/services/whatsapp/label-generator.js`

#### **Subfase 6.3: Estadísticas y Reportes**
- [ ] Dashboard de estadísticas
- [ ] Desglose por método (Cloud API/Puppeteer/Manual)
- [ ] Gráficas de engagement
- [ ] Métricas de cola Puppeteer
- [ ] Exportar reportes

**Archivos a crear:**
- `src/components/whatsapp/WhatsAppStats.jsx`
- `src/services/whatsapp/stats-calculator.js`

---

### **FASE 7: INTEGRACIÓN Y PULIDO (Días 24-25)** ✨ FINAL

#### **Subfase 7.1: Integración con Sistema de Ventas**
- [ ] Asociar contactos con ventas
- [ ] Crear contacto desde venta
- [ ] Mostrar historial en chat

**Archivos a crear:**
- `src/services/whatsapp/sales-integration.js`

#### **Subfase 7.2: UI/UX Refinado**
- [ ] Mejorar diseño
- [ ] Animaciones
- [ ] Notificaciones en tiempo real
- [ ] Responsive design

#### **Subfase 7.3: Testing y Documentación**
- [ ] Tests unitarios
- [ ] Tests de integración
- [ ] Manejo robusto de errores
- [ ] Documentación

---

## ⚠️ DESAFÍOS TÉCNICOS ACTUALIZADOS

### 1. **Gestión de Sesión Puppeteer**
**Desafío:** Mantener sesión persistente de WhatsApp Web.

**Solución:**
- Usar `whatsapp-web.js` o mantener sesión de Puppeteer
- Guardar cookies y localStorage
- Escanear QR solo una vez
- Reiniciar Chrome sin perder sesión

### 2. **Sincronización entre Cloud API y Puppeteer**
**Desafío:** Evitar enviar el mismo mensaje dos veces.

**Solución:**
- Usar `puppeteer_queue` como única fuente de verdad
- Marcar mensaje como "processing" antes de enviar
- Verificar status antes de enviar
- Transacciones atómicas en BD

### 3. **Detección de Respuestas del Cliente**
**Desafío:** Puppeteer debe detectar cuando cliente responde.

**Solución:**
- Webhook de Cloud API detecta respuestas
- Actualizar BD inmediatamente
- Puppeteer consulta BD antes de cada envío
- Pausar si cliente respondió

### 4. **Manejo de Errores en Puppeteer**
**Desafío:** WhatsApp Web puede cambiar, elementos pueden no encontrarse.

**Solución:**
- Selectores robustos y múltiples fallbacks
- Reintentos automáticos (max 3)
- Logging detallado
- Alertas si falla múltiples veces

### 5. **Optimización de Archivos para Puppeteer**
**Desafío:** Archivos grandes tardan mucho en cargar.

**Solución:**
- Validar tamaños antes de agregar a cola
- Comprimir imágenes/videos
- Usar formatos optimizados
- Mostrar progreso de carga

---

## 💰 COSTOS ACTUALIZADOS

### VPS Hetzner CPX11
- **Costo:** €4.51/mes (~$5/mes)
- **Especificaciones:** 2 vCPU, 2GB RAM, 40GB SSD
- **Suficiente para:** 1 producto

### Mensajes WhatsApp
- **Primeras 72h:** $0 (Free Entry Point - Cloud API)
- **Después 72h con ventana activa:** $0 (Cloud API gratis)
- **Después 72h con ventana cerrada:** $0 (Puppeteer)
- **Total:** $0/mes en mensajes ✅

### Comparación con Solo Cloud API
- **50 contactos/día × 13 mensajes**
- **Después 72h:** 8 mensajes × $0.074 = $0.592/contacto
- **Total:** $888/mes
- **AHORRO:** $883/mes con estrategia híbrida 💰

---

## 📦 DEPENDENCIAS ACTUALIZADAS

### Frontend/Backend (Vite + React)
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.86.0",
    "axios": "^1.6.0",
    "date-fns": "^3.0.0",
    "react-dropzone": "^14.2.0",
    "react-hot-toast": "^2.4.0",
    "clsx": "^2.1.0",
    "recharts": "^2.12.0"
  }
}
```

### Bot Puppeteer (VPS)
```json
{
  "dependencies": {
    "puppeteer": "^21.0.0",
    "@supabase/supabase-js": "^2.86.0",
    "express": "^4.18.0",
    "dotenv": "^16.3.0"
  },
  "devDependencies": {
    "pm2": "^5.3.0"
  }
}
```

---

## 🔐 VARIABLES DE ENTORNO ACTUALIZADAS

```env
# Supabase
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# WhatsApp Cloud API
WA_PHONE_NUMBER_ID=
WA_BUSINESS_ACCOUNT_ID=
WA_ACCESS_TOKEN=
WA_VERIFY_TOKEN=

# ⭐ NUEVO: Meta OAuth (para conexión automática)
META_APP_ID=
META_APP_SECRET=
META_OAUTH_REDIRECT_URI=https://[project-ref].supabase.co/functions/v1/meta-oauth-callback

# Puppeteer Bot (en VPS)
PUPPETEER_VPS_URL=http://tu-vps-ip:3000
PUPPETEER_API_KEY=tu_api_key_secreta
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## ✅ CHECKLIST PRE-DESARROLLO ACTUALIZADO

- [ ] Revisar documentación de WhatsApp Cloud API
- [ ] Configurar cuenta de WhatsApp Business
- [ ] Obtener tokens de acceso
- [ ] Configurar webhook en Meta Developer Console
- [ ] **Contratar VPS Hetzner CPX11**
- [ ] **Configurar VPS (Node.js, Chrome, PM2)**
- [ ] Configurar Supabase Storage bucket
- [ ] Revisar políticas RLS existentes
- [ ] Planificar estructura de carpetas
- [ ] **Preparar archivos de media optimizados**

---

## 🎯 MÉTRICAS DE ÉXITO ACTUALIZADAS

1. **Funcionalidad:**
   - ✅ Recibir mensajes de WhatsApp
   - ✅ Enviar mensajes via Cloud API
   - ✅ Enviar mensajes via Puppeteer
   - ✅ Decisión inteligente funcionando
   - ✅ Secuencias automáticas funcionando
   - ✅ Detección de bloqueos precisa

2. **Rendimiento:**
   - ✅ Dashboard carga en < 2 segundos
   - ✅ Mensajes aparecen en tiempo real
   - ✅ Puppeteer procesa cola cada 5-10 min
   - ✅ Envío via Puppeteer < 30 segundos

3. **Confiabilidad:**
   - ✅ 99%+ de webhooks procesados
   - ✅ 0 pérdida de mensajes
   - ✅ Puppeteer mantiene sesión 24/7
   - ✅ Detección de bloqueos > 95% precisión

4. **Costos:**
   - ✅ $0 en mensajes WhatsApp
   - ✅ Solo $5/mes en VPS

---

**¿Listo para comenzar?** 🚀

Sugerencia: Empezar con FASE 1, Subfase 1.1 (Base de Datos) y luego FASE 3, Subfase 3.1 (Setup VPS) en paralelo.

