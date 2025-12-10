# 🔧 CONSIDERACIONES TÉCNICAS: CRM WhatsApp

## 🚨 PROBLEMAS POTENCIALES Y SOLUCIONES

### 1. **Rate Limits de WhatsApp**

**Problema:** WhatsApp tiene límites estrictos de mensajes por segundo/minuto/día.

**Límites conocidos:**
- 80 mensajes/segundo por número
- 1,000 mensajes/día desde WhatsApp Business App (coexistencia)
- Sin límite desde API (pero costos después de 24h)

**Solución:**
- Implementar queue con rate limiting
- Procesar envíos en lotes pequeños
- Monitorear rate limits y pausar si es necesario
- Usar múltiples números si es necesario

```javascript
// Ejemplo de rate limiter
class WhatsAppRateLimiter {
  constructor(maxPerSecond = 20) {
    this.queue = [];
    this.processing = false;
    this.maxPerSecond = maxPerSecond;
  }
  
  async add(message) {
    return new Promise((resolve) => {
      this.queue.push({ message, resolve });
      this.process();
    });
  }
  
  async process() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;
    
    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.maxPerSecond);
      await Promise.all(batch.map(item => this.send(item.message).then(item.resolve)));
      await new Promise(resolve => setTimeout(resolve, 1000)); // Esperar 1 segundo
    }
    
    this.processing = false;
  }
}
```

---

### 2. **Tokens de Acceso Expirados**

**Problema:** Los access tokens de WhatsApp expiran después de cierto tiempo.

**Solución:**
- Implementar refresh token automático
- Guardar refresh token en BD (encriptado)
- Monitorear expiración y renovar antes de que expire
- Alertar si falla la renovación

```javascript
// Ejemplo de refresh token
async function refreshWhatsAppToken(accountId) {
  const account = await getAccount(accountId);
  // Llamar a API de Meta para refrescar
  const newToken = await metaAPI.refreshToken(account.refresh_token);
  await updateAccount(accountId, { access_token: newToken });
  return newToken;
}
```

---

### 3. **Webhook Duplicados o Perdidos**

**Problema:** WhatsApp puede enviar webhooks duplicados o algunos pueden perderse.

**Solución:**
- Usar `wa_message_id` como idempotencia
- Verificar si mensaje ya existe antes de procesar
- Guardar todos los webhooks en `webhook_logs` para debugging
- Implementar retry logic para webhooks fallidos

```sql
-- Verificar duplicados
CREATE UNIQUE INDEX idx_messages_wa_id ON whatsapp_messages(wa_message_id);
```

---

### 4. **Media Files Grandes**

**Problema:** Videos y audios pueden ser muy grandes, afectando storage y velocidad.

**Solución:**
- Comprimir videos antes de almacenar
- Usar thumbnails para videos
- Lazy load de media en UI
- Limitar tamaño máximo de archivos
- Usar CDN para servir media

```javascript
// Comprimir video
async function compressVideo(file) {
  // Usar FFmpeg o similar
  // Reducir calidad/resolución
  // Convertir a formato más eficiente
}
```

---

### 5. **Ventana 24h con Timezone**

**Problema:** La ventana 24h debe calcularse correctamente con timezone.

**Solución:**
- Usar UTC en BD
- Convertir a timezone local solo en UI
- Calcular ventana en servidor (Edge Function)
- Considerar timezone del contacto si es posible

```javascript
// Calcular ventana 24h
function calculateWindow24h(lastInteraction) {
  const expiresAt = new Date(lastInteraction);
  expiresAt.setHours(expiresAt.getHours() + 24);
  return expiresAt;
}

function isWindowActive(expiresAt) {
  return new Date() < new Date(expiresAt);
}
```

---

### 6. **Secuencias con Muchos Contactos**

**Problema:** Procesar secuencias para miles de contactos puede ser lento.

**Solución:**
- Procesar en lotes (batch processing)
- Usar índices en BD para queries rápidas
- Cachear configuraciones de secuencias
- Procesar solo contactos activos
- Paralelizar cuando sea posible

```sql
-- Query optimizada para procesar secuencias
SELECT * FROM whatsapp_contacts
WHERE sequence_active = true
  AND window_active = true
  AND is_blocked = false
  AND (
    -- Es momento de enviar siguiente mensaje
    NOW() >= sequence_started_at + INTERVAL '1 hour' * (
      SELECT SUM(delay_hours_from_previous)
      FROM whatsapp_sequence_messages
      WHERE sequence_id = whatsapp_contacts.sequence_id
        AND order_position <= whatsapp_contacts.sequence_position + 1
    )
  )
ORDER BY sequence_started_at ASC
LIMIT 100; -- Procesar en lotes de 100
```

---

### 7. **Detección de Bloqueos Falsos Positivos**

**Problema:** Puede detectar bloqueos cuando solo hay problemas de red.

**Solución:**
- Esperar 72h antes de marcar como bloqueado
- Verificar múltiples mensajes consecutivos
- Permitir reactivar manualmente
- Monitorear tasa de falsos positivos
- Ajustar algoritmo según resultados

```javascript
// Detección mejorada de bloqueos
async function detectBlock(contactId) {
  const messages = await getRecentMessages(contactId, 5);
  const undelivered = messages.filter(m => 
    m.status === 'sent' && 
    m.status_updated_at < new Date(Date.now() - 72 * 60 * 60 * 1000)
  );
  
  if (undelivered.length >= 3) {
    return { blocked: true, probability: 99 };
  } else if (undelivered.length >= 2) {
    return { blocked: true, probability: 95 };
  }
  
  return { blocked: false, probability: 0 };
}
```

---

### 8. **Múltiples Dispositivos/Usuarios**

**Problema:** Varios usuarios pueden enviar desde el mismo número.

**Solución:**
- Detectar `is_from_me = true` en webhook
- Actualizar `last_interaction_at` cuando se detecta
- No importa desde qué dispositivo se envió
- Registrar origen como "manual" siempre

---

### 9. **Costo de Mensajes**

**Problema:** Mensajes después de 24h cuestan dinero.

**Solución:**
- Validar ventana 24h antes de cada envío
- Agregar a manual si ventana cerrada
- Mostrar estimación de costos en dashboard
- Alertar si se intenta enviar fuera de ventana
- Permitir forzar envío (con advertencia de costo)

```javascript
// Validar antes de enviar
async function canSendMessage(contactId) {
  const contact = await getContact(contactId);
  
  // Dentro de 72h desde inicio (Free Entry Point)
  const hoursSinceStart = (Date.now() - contact.sequence_started_at) / (1000 * 60 * 60);
  if (hoursSinceStart < 72) {
    return { canSend: true, reason: 'free_entry_point' };
  }
  
  // Ventana 24h activa
  if (contact.window_active) {
    return { canSend: true, reason: 'window_24h_active' };
  }
  
  return { canSend: false, reason: 'window_closed', cost: 0.074 };
}
```

---

### 10. **Backup y Recuperación**

**Problema:** Pérdida de datos o configuración.

**Solución:**
- Backup diario de configuraciones
- Exportar secuencias como JSON
- Historial de cambios (audit log)
- Restore point antes de cambios grandes
- Backup de mensajes importantes

---

## 🔄 FLUJOS CRÍTICOS

### Flujo 1: Recibir Mensaje de Cliente

```
1. Webhook recibe mensaje
2. Verificar si contacto existe
   - Si no existe: crear contacto
3. Guardar mensaje en BD
4. Actualizar last_interaction_at
5. Recalcular window_expires_at
6. Si tiene secuencia activa:
   - Pausar secuencia
   - Marcar como "cliente respondió"
7. Notificar en tiempo real (Realtime)
8. Descargar media si aplica
```

### Flujo 2: Enviar Mensaje Automático

```
1. Cron job ejecuta cada hora
2. Obtener contactos con secuencia activa
3. Para cada contacto:
   a. Calcular si es momento de siguiente mensaje
   b. Verificar ventana 24h
   c. Si ventana activa:
      - Enviar mensaje
      - Actualizar last_interaction_at
      - Incrementar sequence_position
   d. Si ventana cerrada:
      - Agregar a pending_manual
      - Marcar mensaje como skipped
      - Incrementar sequence_position (saltar)
4. Continuar con siguiente contacto
```

### Flujo 3: Detectar Envío Manual

```
1. Webhook recibe mensaje con is_from_me = true
2. Verificar source != "crm"
3. Actualizar last_interaction_at = NOW()
4. Actualizar window_expires_at = NOW() + 24h
5. Marcar mensaje como source = "manual"
6. Si mensaje corresponde a secuencia:
   - Marcar como completado
   - Remover de pending_manual
   - Continuar secuencia
7. Notificar en tiempo real
```

### Flujo 4: Detección de Bloqueos

```
1. Cron job ejecuta cada 6 horas
2. Obtener mensajes en "sent" por 72h+
3. Agrupar por contacto
4. Contar mensajes consecutivos sin entregar
5. Si 2+ consecutivos:
   - Marcar como "probable_block" (95%)
   - Pausar secuencia
6. Si 3+ consecutivos:
   - Marcar como "confirmed_block" (99%)
   - Detener todo envío
7. Agregar a delivery_issues
8. Notificar en dashboard
```

---

## 📊 OPTIMIZACIONES DE RENDIMIENTO

### 1. **Índices Críticos**

```sql
-- Contactos activos con secuencia
CREATE INDEX idx_contacts_sequence_active 
ON whatsapp_contacts(sequence_active, sequence_position, window_active)
WHERE sequence_active = true;

-- Mensajes recientes por contacto
CREATE INDEX idx_messages_recent 
ON whatsapp_messages(contact_id, timestamp DESC)
WHERE timestamp > NOW() - INTERVAL '30 days';

-- Pending manual por prioridad
CREATE INDEX idx_pending_priority 
ON whatsapp_pending_manual(sent_manually, priority, added_at)
WHERE sent_manually = false;
```

### 2. **Materialized Views**

```sql
-- Vista materializada para estadísticas
CREATE MATERIALIZED VIEW whatsapp_stats_daily AS
SELECT 
  DATE(created_at) as date,
  account_id,
  COUNT(*) FILTER (WHERE is_from_me = true) as sent,
  COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
  COUNT(*) FILTER (WHERE status = 'read') as read
FROM whatsapp_messages
GROUP BY DATE(created_at), account_id;

-- Refrescar cada hora
CREATE INDEX ON whatsapp_stats_daily(date, account_id);
```

### 3. **Cache Strategy**

```javascript
// Cache de configuraciones
const configCache = new Map();

async function getSequenceConfig(sequenceId) {
  if (configCache.has(sequenceId)) {
    return configCache.get(sequenceId);
  }
  
  const config = await db.getSequenceConfig(sequenceId);
  configCache.set(sequenceId, config);
  
  // Invalidar después de 5 minutos
  setTimeout(() => configCache.delete(sequenceId), 5 * 60 * 1000);
  
  return config;
}
```

---

## 🧪 TESTING STRATEGY

### 1. **Unit Tests**

- Lógica de ventana 24h
- Cálculo de secuencias
- Detección de bloqueos
- Validación de mensajes

### 2. **Integration Tests**

- Webhook completo
- Envío de mensajes
- Procesamiento de secuencias
- Detección de envíos manuales

### 3. **E2E Tests**

- Flujo completo de secuencia
- Envío manual y detección
- Bloqueo y reactivación
- Múltiples cuentas

### 4. **Load Tests**

- 1000+ contactos simultáneos
- 100+ mensajes por segundo
- Procesamiento de secuencias masivo

---

## 📝 LOGGING Y MONITOREO

### Logs Importantes

```javascript
// Logs críticos
logger.info('whatsapp.message.received', { contactId, messageId });
logger.info('whatsapp.message.sent', { contactId, messageId, status });
logger.warn('whatsapp.window.closed', { contactId, skippedMessage });
logger.error('whatsapp.send.failed', { contactId, error });
logger.info('whatsapp.block.detected', { contactId, probability });
```

### Métricas a Monitorear

- Tasa de entrega de mensajes
- Tiempo de procesamiento de webhooks
- Número de mensajes pendientes manuales
- Tasa de bloqueos
- Costo estimado de mensajes
- Errores de API de WhatsApp

---

## 🔒 SEGURIDAD

### 1. **Tokens y Credenciales**

- Guardar tokens en Supabase Vault (encriptado)
- Nunca exponer tokens en frontend
- Rotar tokens periódicamente
- Usar variables de entorno para desarrollo

### 2. **RLS Policies**

```sql
-- Solo usuarios autenticados pueden ver sus contactos
CREATE POLICY "users_own_contacts" ON whatsapp_contacts
FOR SELECT USING (auth.uid() = created_by);

-- Solo admin puede modificar secuencias
CREATE POLICY "admin_modify_sequences" ON whatsapp_sequences
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND rol = 'admin'
  )
);
```

### 3. **Validación de Webhooks**

- Verificar firma de webhook
- Validar origen (Meta)
- Rate limiting en webhook endpoint
- Sanitizar inputs

---

## 🚀 DEPLOYMENT

### 1. **Edge Functions**

```bash
# Deploy webhook
supabase functions deploy whatsapp-webhook

# Deploy process-sequences
supabase functions deploy process-sequences

# Deploy detect-blocks
supabase functions deploy detect-blocks
```

### 2. **Cron Jobs**

```sql
-- Configurar cron en Supabase
SELECT cron.schedule(
  'process-sequences-hourly',
  '0 * * * *', -- Cada hora
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/process-sequences',
    headers := '{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  );
  $$
);
```

### 3. **Environment Variables**

- Configurar en Supabase Dashboard
- Usar diferentes valores para dev/staging/prod
- Rotar tokens periódicamente

---

## 📚 RECURSOS ÚTILES

- [WhatsApp Cloud API Docs](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Meta Business Suite](https://business.facebook.com/)

---

**Última actualización:** 2025-01-30

