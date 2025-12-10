# 🔧 CONSIDERACIONES TÉCNICAS: CRM WhatsApp HÍBRIDO (Puppeteer)

## 🚨 PROBLEMAS POTENCIALES Y SOLUCIONES - PUPPETEER

### 1. **Sesión Persistente de WhatsApp Web**

**Problema:** WhatsApp Web puede cerrar sesión o pedir re-escaneo de QR.

**Solución:**
- Usar `whatsapp-web.js` para mantener sesión
- O guardar cookies y localStorage de Puppeteer
- Reiniciar Chrome sin perder sesión
- Monitorear estado de sesión
- Alertar si se pierde sesión

```javascript
// Ejemplo de guardar sesión
const browser = await puppeteer.launch({
  userDataDir: '/home/user/.wwebjs_auth/session/',
  headless: false
});

// Verificar si sesión está activa
async function checkSessionActive(page) {
  try {
    await page.waitForSelector('[data-testid="chat"]', { timeout: 5000 });
    return true;
  } catch {
    return false; // Necesita re-escaneo
  }
}
```

---

### 2. **Selectores de WhatsApp Web Cambian**

**Problema:** Meta actualiza WhatsApp Web frecuentemente, rompiendo selectores.

**Solución:**
- Usar múltiples selectores como fallback
- Selectores por texto visible (más estables)
- Selectores por atributos data-testid
- Actualizar selectores regularmente
- Tests automatizados que detecten cambios

```javascript
// Selectores con fallbacks
const searchInput = await page.$('input[data-testid="chat-list-search"]') 
  || await page.$('input[placeholder*="Buscar"]')
  || await page.$('div[contenteditable="true"]');

// Selector por texto
const sendButton = await page.evaluateHandle(() => {
  return Array.from(document.querySelectorAll('button')).find(
    btn => btn.getAttribute('data-testid') === 'send' || 
           btn.querySelector('span[data-icon="send"]')
  );
});
```

---

### 3. **Rate Limiting de WhatsApp Web**

**Problema:** WhatsApp puede limitar acciones si detecta comportamiento automatizado.

**Solución:**
- Delays aleatorios entre acciones (45-90 seg)
- Velocidad de escritura humana (80-150ms por carácter)
- Movimiento de mouse natural
- Scroll ocasional
- Horario laboral (9am-7pm)
- No enviar domingos
- Pausas como si leyera

```javascript
// Simulación humana
async function typeHuman(page, selector, text) {
  await page.click(selector);
  await delay(500 + Math.random() * 500);
  
  for (const char of text) {
    await page.keyboard.type(char);
    const delayMs = 80 + Math.random() * 70; // 80-150ms
    await delay(delayMs);
  }
  
  // Pausa como si leyera
  await delay(2000 + Math.random() * 2000);
}

// Delay aleatorio entre mensajes
async function delayBetweenMessages() {
  const delaySec = 45 + Math.random() * 45; // 45-90 seg
  await delay(delaySec * 1000);
}
```

---

### 4. **Archivos Grandes Tardan en Cargar**

**Problema:** Videos de 10MB pueden tardar 15+ segundos en cargar.

**Solución:**
- Validar tamaños antes de agregar a cola
- Comprimir videos antes de enviar
- Mostrar progreso de carga
- Timeout de 30 segundos máximo
- Reintentar si falla por timeout

```javascript
// Validar y comprimir antes de agregar a cola
async function validateAndCompressMedia(filePath, type) {
  const stats = await fs.stat(filePath);
  const sizeKB = stats.size / 1024;
  
  if (type === 'image' && sizeKB > 300) {
    // Comprimir imagen
    await compressImage(filePath, 85);
  } else if (type === 'video' && sizeKB > 10000) {
    // Comprimir video
    await compressVideo(filePath, '720p');
  }
  
  return filePath;
}

// Esperar carga con timeout
async function waitForUpload(page, timeout = 30000) {
  try {
    await page.waitForSelector('[data-testid="media-send"]', { timeout });
    return true;
  } catch {
    return false; // Timeout
  }
}
```

---

### 5. **Detección de Respuestas del Cliente**

**Problema:** Puppeteer debe saber si cliente respondió para pausar.

**Solución:**
- Webhook de Cloud API detecta respuestas primero
- Actualizar BD inmediatamente
- Puppeteer consulta BD antes de cada envío
- Verificar `last_interaction_at` antes de enviar
- Pausar secuencia si cliente respondió

```javascript
// Verificar antes de enviar
async function shouldSendMessage(contactId) {
  const contact = await supabase
    .from('whatsapp_contacts')
    .select('last_interaction_at, sequence_active')
    .eq('id', contactId)
    .single();
  
  // Si cliente respondió recientemente, pausar
  const lastInteraction = new Date(contact.last_interaction_at);
  const now = new Date();
  const hoursSinceInteraction = (now - lastInteraction) / (1000 * 60 * 60);
  
  if (hoursSinceInteraction < 1 && contact.sequence_active) {
    // Cliente respondió hace menos de 1 hora, pausar
    await pauseSequence(contactId);
    return false;
  }
  
  return true;
}
```

---

### 6. **Múltiples Instancias de Puppeteer**

**Problema:** Si hay múltiples productos, necesitas múltiples instancias.

**Solución:**
- PM2 para gestionar múltiples procesos
- Cada instancia con su propia sesión
- Cada instancia lee su propia cola (filtrada por account_id)
- Monitoreo independiente por instancia

```javascript
// PM2 ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'whatsapp-bot-producto-1',
      script: './index.js',
      env: {
        ACCOUNT_ID: 'uuid-producto-1',
        SESSION_PATH: '/home/user/.wwebjs_auth/session/producto-1/'
      }
    },
    {
      name: 'whatsapp-bot-producto-2',
      script: './index.js',
      env: {
        ACCOUNT_ID: 'uuid-producto-2',
        SESSION_PATH: '/home/user/.wwebjs_auth/session/producto-2/'
      }
    }
  ]
};
```

---

### 7. **Manejo de Errores y Reintentos**

**Problema:** WhatsApp Web puede fallar por múltiples razones.

**Solución:**
- Reintentos automáticos (max 3)
- Diferentes estrategias según tipo de error
- Logging detallado
- Alertas si falla múltiples veces
- Marcar mensaje como "failed" en BD

```javascript
async function sendWithRetry(page, contactPhone, message, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await sendMessage(page, contactPhone, message);
      return { success: true };
    } catch (error) {
      console.error(`Intento ${attempt} falló:`, error);
      
      if (attempt === maxRetries) {
        // Último intento falló
        await markAsFailed(message.id, error.message);
        return { success: false, error: error.message };
      }
      
      // Esperar antes de reintentar
      await delay(5000 * attempt); // 5s, 10s, 15s
    }
  }
}
```

---

### 8. **Monitoreo y Heartbeat**

**Problema:** Necesitas saber si el bot está funcionando.

**Solución:**
- Heartbeat cada 5 minutos
- Actualizar `last_heartbeat` en BD
- Dashboard muestra estado del bot
- Alertar si no hay heartbeat en 10 minutos

```javascript
// Heartbeat
setInterval(async () => {
  await supabase
    .from('puppeteer_config')
    .update({ last_heartbeat: new Date().toISOString() })
    .eq('account_id', ACCOUNT_ID);
}, 5 * 60 * 1000); // Cada 5 minutos

// Verificar estado en dashboard
async function getBotStatus(accountId) {
  const { data } = await supabase
    .from('puppeteer_config')
    .select('last_heartbeat, bot_active')
    .eq('account_id', accountId)
    .single();
  
  const lastHeartbeat = new Date(data.last_heartbeat);
  const now = new Date();
  const minutesSinceHeartbeat = (now - lastHeartbeat) / (1000 * 60);
  
  if (minutesSinceHeartbeat > 10) {
    return { status: 'offline', lastSeen: lastHeartbeat };
  }
  
  return { status: 'online', lastSeen: lastHeartbeat };
}
```

---

### 9. **Optimización de Recursos del VPS**

**Problema:** Chrome consume mucha RAM, múltiples instancias pueden agotar recursos.

**Solución:**
- Chrome en modo headless (menos RAM)
- Cerrar pestañas no usadas
- Limpiar caché periódicamente
- Monitorear uso de RAM
- Escalar VPS si es necesario

```javascript
// Lanzar Chrome optimizado
const browser = await puppeteer.launch({
  headless: true, // Menos RAM
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage', // Menos RAM
    '--disable-accelerated-2d-canvas',
    '--disable-gpu'
  ]
});

// Limpiar caché periódicamente
setInterval(async () => {
  const pages = await browser.pages();
  for (const page of pages) {
    await page.evaluate(() => {
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => caches.delete(name));
        });
      }
    });
  }
}, 60 * 60 * 1000); // Cada hora
```

---

### 10. **Sincronización de Archivos entre Supabase y VPS**

**Problema:** Media está en Supabase Storage, pero Puppeteer necesita archivos locales.

**Solución:**
- Descargar archivos de Supabase Storage a VPS
- Cachear archivos localmente
- Limpiar archivos antiguos periódicamente
- Usar rutas locales en `puppeteer_queue.media_path`

```javascript
// Descargar y cachear
async function downloadAndCache(mediaUrl, filename) {
  const localPath = `/var/whatsapp/media/${filename}`;
  
  // Verificar si ya existe
  if (await fs.exists(localPath)) {
    return localPath;
  }
  
  // Descargar desde Supabase Storage
  const response = await fetch(mediaUrl);
  const buffer = await response.buffer();
  await fs.writeFile(localPath, buffer);
  
  return localPath;
}

// Limpiar archivos antiguos (más de 7 días)
async function cleanupOldFiles() {
  const files = await fs.readdir('/var/whatsapp/media/');
  const now = Date.now();
  
  for (const file of files) {
    const filePath = `/var/whatsapp/media/${file}`;
    const stats = await fs.stat(filePath);
    const daysSinceModified = (now - stats.mtime) / (1000 * 60 * 60 * 24);
    
    if (daysSinceModified > 7) {
      await fs.unlink(filePath);
    }
  }
}
```

---

## 🔄 FLUJOS CRÍTICOS ACTUALIZADOS

### Flujo 1: Decisión de Método de Envío

```
1. Cron job ejecuta cada hora
2. Para cada contacto con secuencia activa:
   a. Verificar si es momento de siguiente mensaje
   b. Calcular horas desde creación
   c. Si < 72h:
      → Enviar via Cloud API (gratis)
   d. Si >= 72h:
      → Verificar ventana 24h
      → Si activa: Cloud API (gratis)
      → Si cerrada: Agregar a puppeteer_queue
3. Puppeteer procesa cola cada 5-10 min
4. Enviar mensajes desde cola
```

### Flujo 2: Puppeteer Procesa Cola

```
1. Leer puppeteer_queue donde status = "pending"
2. Para cada mensaje:
   a. Verificar si cliente respondió (consultar BD)
   b. Si respondió: Pausar, remover de cola
   c. Si no: Continuar
   d. Buscar contacto en WhatsApp Web
   e. Enviar mensaje según tipo
   f. Actualizar status en BD
   g. Delay aleatorio (45-90 seg)
3. Esperar 5-10 minutos
4. Repetir
```

### Flujo 3: Cliente Responde

```
1. Webhook recibe mensaje del cliente
2. Actualizar last_interaction_at en BD
3. Recalcular window_expires_at
4. Si tiene secuencia activa:
   → Pausar secuencia
5. Notificar en tiempo real (Realtime)
6. Puppeteer detecta en próximo ciclo:
   → Consulta BD antes de enviar
   → Ve que cliente respondió
   → Pausa y remueve mensajes de cola
```

---

## 📊 OPTIMIZACIONES ESPECÍFICAS PUPPETEER

### 1. **Selectores Robustos**

```javascript
// Selectores con múltiples fallbacks
const SELECTORS = {
  searchInput: [
    'input[data-testid="chat-list-search"]',
    'input[placeholder*="Buscar"]',
    'div[contenteditable="true"][data-tab="3"]'
  ],
  sendButton: [
    'button[data-testid="send"]',
    'span[data-icon="send"]',
    'button[aria-label*="Enviar"]'
  ],
  attachButton: [
    'button[data-testid="clip"]',
    'span[data-icon="clip"]',
    'button[aria-label*="Adjuntar"]'
  ]
};

async function findElement(page, selectorGroup) {
  for (const selector of selectorGroup) {
    try {
      const element = await page.$(selector);
      if (element) return element;
    } catch {}
  }
  throw new Error(`No se encontró elemento: ${selectorGroup[0]}`);
}
```

### 2. **Validación de Tamaños de Archivos**

```javascript
const MAX_SIZES = {
  image: 300, // KB
  video: 10000, // KB (10MB)
  audio: 5000, // KB (5MB)
  document: 2000 // KB (2MB)
};

async function validateFileSize(filePath, type) {
  const stats = await fs.stat(filePath);
  const sizeKB = stats.size / 1024;
  const maxSize = MAX_SIZES[type];
  
  if (sizeKB > maxSize) {
    throw new Error(
      `Archivo ${type} excede tamaño máximo: ${sizeKB}KB > ${maxSize}KB`
    );
  }
  
  return true;
}
```

### 3. **Configuración Dinámica desde BD**

```javascript
async function loadConfig(accountId) {
  const { data } = await supabase
    .from('puppeteer_config')
    .select('*')
    .eq('account_id', accountId)
    .single();
  
  return {
    typingSpeed: {
      min: data.typing_speed_min_ms,
      max: data.typing_speed_max_ms
    },
    delayBetweenMessages: {
      min: data.delay_between_messages_min_sec,
      max: data.delay_between_messages_max_sec
    },
    workingHours: {
      start: data.working_hours_start,
      end: data.working_hours_end
    },
    skipSundays: data.skip_sundays
  };
}
```

---

## 🧪 TESTING STRATEGY PUPPETEER

### 1. **Tests Unitarios**

- Lógica de decisión de método
- Validación de archivos
- Cálculo de delays
- Verificación de horario laboral

### 2. **Tests de Integración**

- Conexión a WhatsApp Web
- Envío de texto
- Envío de media
- Actualización de BD

### 3. **Tests E2E**

- Flujo completo: cola → envío → BD
- Detección de respuestas
- Pausa de secuencias
- Manejo de errores

### 4. **Tests de Carga**

- 100+ mensajes en cola
- Múltiples tipos de media
- Procesamiento continuo 24h

---

## 📝 LOGGING Y MONITOREO PUPPETEER

### Logs Importantes

```javascript
logger.info('puppeteer.queue.processed', { 
  contactId, 
  messageNumber, 
  status 
});
logger.warn('puppeteer.session.lost', { accountId });
logger.error('puppeteer.send.failed', { 
  contactId, 
  error, 
  attempts 
});
logger.info('puppeteer.heartbeat', { accountId, timestamp });
```

### Métricas a Monitorear

- Mensajes procesados por hora
- Tasa de éxito de envíos
- Tiempo promedio de envío
- Uso de RAM del VPS
- Estado de sesión
- Errores por tipo

---

## 🔒 SEGURIDAD PUPPETEER

### 1. **API Key para Control Remoto**

```javascript
// Express API en VPS para control remoto
app.post('/api/pause', (req, res) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.PUPPETEER_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  // Pausar bot
  bot.pause();
  res.json({ status: 'paused' });
});
```

### 2. **Variables de Entorno**

- Nunca commitear `.env` en VPS
- Rotar API keys periódicamente
- Usar Supabase Service Role Key solo en VPS
- No exponer tokens de WhatsApp

---

## 🚀 DEPLOYMENT PUPPETEER

### 1. **Setup Inicial en VPS**

```bash
# Instalar Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar Chrome
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo dpkg -i google-chrome-stable_current_amd64.deb

# Instalar PM2 globalmente
sudo npm install -g pm2

# Clonar repositorio
git clone https://github.com/tu-repo/whatsapp-bot.git
cd whatsapp-bot

# Instalar dependencias
npm install

# Configurar .env
cp .env.example .env
# Editar .env con tus credenciales

# Iniciar con PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 2. **Ecosystem Config**

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'whatsapp-bot',
    script: './index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
```

---

**Última actualización:** 2025-01-30

