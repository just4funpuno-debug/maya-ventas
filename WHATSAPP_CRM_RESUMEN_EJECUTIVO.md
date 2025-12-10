# 📱 RESUMEN EJECUTIVO: CRM WhatsApp

## 🎯 OBJETIVO

Integrar un CRM completo de WhatsApp Cloud API con coexistencia en la aplicación Maya Ventas, permitiendo gestionar múltiples cuentas de WhatsApp, enviar secuencias automáticas configurables, y detectar bloqueos automáticamente.

---

## ⏱️ TIEMPO ESTIMADO

**Total: 20 días de desarrollo**

- FASE 1 (Fundación): 3 días
- FASE 2 (Envío y Ventana 24h): 3 días
- FASE 3 (Secuencias): 4 días
- FASE 4 (Pendientes y Bloqueos): 3 días
- FASE 5 (Etiquetas y Stats): 3 días
- FASE 6 (Integración y Pulido): 4 días

---

## 💰 COSTOS

### WhatsApp Cloud API
- **Gratis:** Primeros 72h después de Click-to-WhatsApp Ads
- **Después:** $0.074 por mensaje (fuera de ventana 24h)
- **Dentro de ventana 24h:** Gratis

### Supabase
- **Edge Functions:** Incluido en plan
- **Storage:** ~$0.021/GB/mes
- **Database:** Incluido en plan

### Estimación Mensual
- 1,000 contactos activos
- 10,000 mensajes/mes
- ~70% dentro de ventana 24h = **$222/mes** (solo 30% pagados)

---

## 🏗️ ARQUITECTURA

```
Frontend (React + Vite)
    ↓
Supabase Client
    ↓
┌─────────────────┬─────────────────┬─────────────────┐
│  Edge Functions │  PostgreSQL     │  Supabase       │
│                 │                 │  Storage        │
│  - Webhook      │  - Contacts     │  - Media Files  │
│  - Process      │  - Messages     │                 │
│  - Detect       │  - Sequences    │                 │
└─────────────────┴─────────────────┴─────────────────┘
    ↓
WhatsApp Cloud API
```

---

## 📋 FUNCIONALIDADES PRINCIPALES

### ✅ Recibir Mensajes
- Webhook procesa mensajes entrantes
- Descarga y almacena media
- Detecta envíos manuales desde celular
- Actualiza ventana 24h automáticamente

### ✅ Enviar Mensajes
- Texto, audio, imagen, video, documentos
- Validación de ventana 24h antes de enviar
- Estados: sent, delivered, read, failed

### ✅ Secuencias Automáticas
- Configurables (no fijas)
- Evaluación independiente por mensaje
- Salta mensajes si ventana cerrada
- Continúa sin detenerse

### ✅ Mensajes Pendientes Manuales
- Lista de mensajes a enviar manualmente
- Texto sugerido para copiar
- Prioridad automática
- Detección automática de envío

### ✅ Detección de Bloqueos
- Monitorea todos los mensajes
- Detecta 2+ mensajes sin entregar = 95% bloqueo
- Detecta 3+ mensajes sin entregar = 99% bloqueo
- Pausa secuencias automáticamente

### ✅ Dashboard
- Lista de conversaciones
- Chat en tiempo real
- Indicadores de ventana 24h
- Origen de mensajes (CRM/manual/cliente)

---

## 🔑 PUNTOS CRÍTICOS

1. **Ventana 24h se reactiva con envíos manuales**
2. **Secuencias nunca se detienen, solo saltan mensajes**
3. **Cada mensaje se evalúa independientemente**
4. **Detección de bloqueos monitorea TODOS los mensajes**
5. **Múltiples cuentas WhatsApp soportadas**

---

## ⚠️ RIESGOS

### Alto
- **Rate limits de WhatsApp:** Implementar queue y rate limiting
- **Tokens expirados:** Sistema de refresh automático
- **Webhooks perdidos:** Idempotencia y retry logic

### Medio
- **Media files grandes:** Compresión y CDN
- **Rendimiento con muchos contactos:** Optimización de queries
- **Falsos positivos en bloqueos:** Algoritmo mejorado

### Bajo
- **Costo de mensajes:** Validación de ventana 24h
- **Timezone issues:** Usar UTC en BD

---

## ✅ CRITERIOS DE ÉXITO

1. ✅ Recibir y enviar mensajes correctamente
2. ✅ Secuencias automáticas funcionando
3. ✅ Detección de bloqueos > 95% precisión
4. ✅ Dashboard carga en < 2 segundos
5. ✅ Mensajes aparecen en tiempo real
6. ✅ 99%+ de webhooks procesados

---

## 🚀 PRÓXIMOS PASOS

1. **Revisar y aprobar plan**
2. **Configurar cuenta WhatsApp Business**
3. **Obtener tokens de acceso**
4. **Comenzar FASE 1.1 (Base de Datos)**

---

**¿Listo para comenzar?** 🎉

