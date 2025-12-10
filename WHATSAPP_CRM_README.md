# 📱 WhatsApp CRM - Documentación Completa

**Versión:** 1.0.0  
**Fecha:** 2025-02-01  
**Proyecto:** Maya Ventas - Sistema de Gestión de Ventas e Inventario

---

## 📋 Tabla de Contenidos

1. [Introducción](#introducción)
2. [Características Principales](#características-principales)
3. [Arquitectura](#arquitectura)
4. [Instalación y Configuración](#instalación-y-configuración)
5. [Uso del Sistema](#uso-del-sistema)
6. [API y Servicios](#api-y-servicios)
7. [Deployment](#deployment)
8. [Troubleshooting](#troubleshooting)
9. [Referencias](#referencias)

---

## 🎯 Introducción

El **WhatsApp CRM** es un sistema completo de gestión de relaciones con clientes integrado con WhatsApp, diseñado para optimizar la comunicación y automatizar el seguimiento de contactos. Utiliza una estrategia híbrida que combina:

- **WhatsApp Cloud API** (oficial, gratis en ventanas activas)
- **Puppeteer Bot** (automatización, gratis siempre)
- **Envío Manual** (intervención humana cuando sea necesario)

### Objetivos

- ✅ Enviar mensajes de forma automática e inteligente
- ✅ Gestionar secuencias de mensajes personalizadas
- ✅ Integrar con el sistema de ventas existente
- ✅ Detectar bloqueos y problemas de entrega
- ✅ Optimizar costos (objetivo: $0/mes en mensajes)

---

## ✨ Características Principales

### 1. **Gestión de Cuentas WhatsApp**
- Conexión automática via OAuth de Meta
- Soporte para múltiples cuentas
- Coexistencia con WhatsApp Web
- Configuración de tokens y credenciales

### 2. **Dashboard de Conversaciones**
- Lista de conversaciones en tiempo real
- Chat individual con historial completo
- Búsqueda de contactos
- Indicadores de ventana 24h/72h

### 3. **Envío Inteligente de Mensajes**
- Decisión automática: Cloud API vs Puppeteer
- Soporte para texto, imágenes, videos, audio, documentos
- Validación de ventanas de mensajería
- Fallback automático en caso de error

### 4. **Secuencias Automáticas**
- Creación y edición de secuencias de mensajes
- Envío automático con delays configurables
- Pausa automática cuando cliente responde
- Integración con decisión híbrida

### 5. **Detección de Bloqueos**
- Monitoreo automático de entregas
- Identificación de contactos bloqueados
- Estadísticas de bloqueo
- Panel de gestión de bloqueados

### 6. **Integración con Ventas**
- Asociación automática de contactos con ventas
- Historial de ventas en chat
- Creación de contacto desde venta

### 7. **Cola Puppeteer**
- Panel de gestión de cola
- Estadísticas y logs
- Control de bot (pausar/reanudar)
- Reintentos automáticos

---

## 🏗️ Arquitectura

### Stack Tecnológico

- **Frontend:** React + Vite + Tailwind CSS + Framer Motion
- **Backend:** Supabase (PostgreSQL + Edge Functions + Storage)
- **WhatsApp API:** Meta Graph API (Cloud API)
- **Automatización:** Puppeteer (en VPS)
- **Autenticación:** Meta OAuth 2.0

### Componentes Principales

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  Dashboard   │  │  Sequences   │  │   Accounts    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              Supabase (Backend)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  PostgreSQL  │  │ Edge Functions│ │   Storage    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Cloud API   │  │  Puppeteer   │  │   Webhook    │
│  (Meta)      │  │  Bot (VPS)   │  │  (Meta)      │
└──────────────┘  └──────────────┘  └──────────────┘
```

### Flujo de Decisión de Envío

```
¿Ventana 24h activa?
  ├─ SÍ → Cloud API (gratis)
  └─ NO → ¿Ventana 72h activa?
           ├─ SÍ → Cloud API (gratis)
           └─ NO → Puppeteer (gratis)
```

---

## 🚀 Instalación y Configuración

### Requisitos Previos

- Node.js 18+ y npm
- Cuenta de Supabase
- Cuenta de Meta Developer (para WhatsApp Business API)
- VPS (opcional, para Puppeteer bot)

### Variables de Entorno

Crear archivo `.env.local`:

```env
# Supabase
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key

# Meta OAuth
VITE_META_APP_ID=tu_app_id
VITE_META_OAUTH_REDIRECT_URI=https://tu-proyecto.supabase.co/functions/v1/meta-oauth-callback

# Edge Functions (backend)
META_APP_ID=tu_app_id
META_APP_SECRET=tu_app_secret
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
```

### Instalación

```bash
# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev

# Ejecutar tests
npm test

# Build para producción
npm run build
```

### Configuración Inicial

1. **Configurar Supabase:**
   - Ejecutar migraciones SQL en orden
   - Configurar Storage bucket `whatsapp-media`
   - Habilitar Realtime para tablas relevantes

2. **Configurar Meta Developer:**
   - Crear app en Meta Developer Console
   - Configurar OAuth redirect URI
   - Obtener App ID y App Secret

3. **Desplegar Edge Functions:**
   - `whatsapp-webhook`
   - `meta-oauth-callback`
   - `process-sequences`
   - `detect-blocks`

4. **Configurar Cron Jobs:**
   - `process-sequences` (cada hora)
   - `detect-blocks` (cada 6 horas)

---

## 📖 Uso del Sistema

### Conectar Cuenta WhatsApp

1. Ir a **"⚙️ Configuración WhatsApp"**
2. Click en **"Conectar con Meta"**
3. Autorizar en Meta
4. Si es necesario, escanear QR para coexistencia
5. La cuenta se conecta automáticamente

### Enviar Mensaje Manual

1. Ir a **"💬 Chat WhatsApp"**
2. Seleccionar contacto
3. Escribir mensaje o seleccionar media
4. Click en enviar
5. El sistema decide automáticamente el método (Cloud API o Puppeteer)

### Crear Secuencia

1. Ir a **"⚙️ Secuencias WhatsApp"**
2. Click en **"Nueva Secuencia"**
3. Agregar mensajes con delays
4. Asignar secuencia a contactos
5. La secuencia se ejecuta automáticamente

### Ver Contactos Bloqueados

1. Ir a **"🚫 Contactos Bloqueados"**
2. Ver lista de bloqueados y sospechosos
3. Marcar como bloqueado/no bloqueado
4. Agregar notas

### Ver Cola Puppeteer

1. Ir a **"🤖 Cola Puppeteer"**
2. Ver mensajes pendientes
3. Ver estadísticas
4. Pausar/reanudar bot si es necesario

---

## 🔌 API y Servicios

### Servicios Principales

#### `src/services/whatsapp/accounts.js`
- `getAllAccounts()` - Obtener todas las cuentas
- `getAccountById(id)` - Obtener cuenta por ID
- `createAccount(data)` - Crear nueva cuenta
- `updateAccount(id, data)` - Actualizar cuenta
- `deleteAccount(id)` - Eliminar cuenta

#### `src/services/whatsapp/conversations.js`
- `getConversations(options)` - Obtener lista de conversaciones
- `getContact(contactId)` - Obtener contacto
- `getContactMessages(contactId, options)` - Obtener mensajes
- `markMessagesAsRead(contactId)` - Marcar como leídos

#### `src/services/whatsapp/cloud-api-sender.js`
- `sendTextMessage(accountId, contactId, phone, text)` - Enviar texto
- `sendImageMessage(accountId, contactId, phone, url, caption)` - Enviar imagen
- `sendVideoMessage(...)` - Enviar video
- `sendAudioMessage(...)` - Enviar audio
- `sendDocumentMessage(...)` - Enviar documento

#### `src/services/whatsapp/send-decision.js`
- `decideSendMethod(contactId)` - Decidir método de envío

#### `src/services/whatsapp/sequences.js`
- `getSequences(accountId)` - Obtener secuencias
- `createSequence(data)` - Crear secuencia
- `addSequenceMessage(sequenceId, data)` - Agregar mensaje
- `getSequenceWithMessages(sequenceId)` - Obtener secuencia completa

#### `src/services/whatsapp/sales-integration.js`
- `createContactFromSale(saleId, accountId)` - Crear contacto desde venta
- `getContactSales(contactId)` - Obtener ventas del contacto
- `associateContactWithSale(contactId, saleId)` - Asociar contacto con venta

Ver documentación completa en: `WHATSAPP_CRM_API_DOCUMENTATION.md`

---

## 🚢 Deployment

### Frontend (Vite)

```bash
# Build
npm run build

# Deploy a Vercel/Netlify
vercel deploy
# o
netlify deploy --prod
```

### Edge Functions (Supabase)

```bash
# Deploy todas las funciones
supabase functions deploy

# Deploy función específica
supabase functions deploy whatsapp-webhook
```

### Cron Jobs

Ejecutar SQL en Supabase SQL Editor:

```sql
-- Ver scripts en:
-- SQL_CRON_JOB_COMPLETO.sql
-- SQL_CRON_DETECT_BLOCKS.sql
```

---

## 🔧 Troubleshooting

### Error: "META_APP_ID no configurado"
- Verificar que `VITE_META_APP_ID` esté en `.env.local`
- Reiniciar servidor de desarrollo

### Error: "Could not find table"
- Verificar que las migraciones SQL se ejecutaron
- Verificar que el schema es `public`

### Webhook no recibe mensajes
- Verificar URL del webhook en Meta Developer Console
- Verificar Verify Token
- Verificar que la Edge Function está desplegada

### Puppeteer no envía mensajes
- Verificar que el bot está activo en VPS
- Verificar configuración de `puppeteer_config`
- Verificar logs del bot

Ver guía completa en: `TROUBLESHOOTING_OAUTH.md`

---

## 📚 Referencias

- [WhatsApp Cloud API Docs](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Meta Graph API](https://developers.facebook.com/docs/graph-api)
- [Supabase Docs](https://supabase.com/docs)
- [Puppeteer Docs](https://pptr.dev/)

---

## 📝 Licencia

Propietario - Maya Life and Beauty

---

**Última actualización:** 2025-02-01


