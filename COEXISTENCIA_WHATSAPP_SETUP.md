# 🔗 Configurar Coexistencia de WhatsApp

La **coexistencia** permite usar el mismo número de WhatsApp con:
- ✅ **WhatsApp Cloud API** (envíos automáticos)
- ✅ **WhatsApp Business App** (envíos manuales desde celular)
- ✅ **Puppeteer Bot** (envíos automáticos cuando Cloud API no es gratis)

**Todo con el mismo número, sin conflictos.**

---

## 🎯 ¿Qué es Coexistencia?

**Coexistencia** = Puedes enviar mensajes desde:
1. **Tu celular** (WhatsApp Business App) - Manual
2. **Cloud API** (automático) - Gratis en ventanas activas
3. **Puppeteer** (automático) - Gratis cuando Cloud API no es gratis

**Todo funciona simultáneamente con el mismo número.**

---

## 📋 PASO 1: Verificar que tu Número está en WhatsApp Business

### Opción A: Si YA tienes WhatsApp Business en tu celular

1. **Abre WhatsApp Business** en tu celular
2. **Ve a:** Configuración > Negocio > Información del negocio
3. **Verifica que:**
   - El número está verificado (checkmark verde)
   - Tienes acceso a la cuenta de negocio

### Opción B: Si NO tienes WhatsApp Business

1. **Descarga WhatsApp Business** desde Play Store / App Store
2. **Registra tu número** (el mismo que usarás para Cloud API)
3. **Completa la configuración** básica

---

## 📋 PASO 2: Conectar Número a Cloud API (Coexistencia)

### Método 1: Desde Meta Developer Console (Recomendado)

1. **Ve a:** https://developers.facebook.com/
2. **Selecciona tu App** de WhatsApp Business
3. **Ve a:** WhatsApp > **Phone Numbers**

4. **Si ya tienes un número:**
   - Debería aparecer en la lista
   - Verifica que esté **"Connected"** o **"Active"**

5. **Si NO tienes número conectado:**
   - Haz clic en **"Add phone number"** o **"Agregar número"**
   - Sigue el proceso de vinculación

### Método 2: Usar Número Existente (Coexistencia)

1. En **WhatsApp > Phone Numbers**
2. Haz clic en **"Add phone number"**
3. Selecciona **"Use existing number"** o **"Usar número existente"**
4. **Ingresa tu número** de WhatsApp Business
5. **Meta enviará un código** a tu WhatsApp Business
6. **Ingresa el código** para verificar
7. **Listo** - Tu número está conectado con coexistencia activada

---

## 📋 PASO 3: Verificar Coexistencia Activada

1. En **WhatsApp > Phone Numbers**
2. **Busca tu número** en la lista
3. **Verifica que diga:**
   - ✅ **"Connected"** o **"Conectado"**
   - ✅ **"Coexistence enabled"** o **"Coexistencia habilitada"**

---

## 📋 PASO 4: Obtener Datos para tu App

Una vez que el número está conectado:

1. **Ve a:** WhatsApp > **API Setup**
2. **Copia estos datos:**
   - **Phone Number ID**: (aparece en la página)
   - **Business Account ID**: (aparece en la página)
   - **Access Token**: (temporal o permanente)

---

## ⚠️ Notas Importantes sobre Coexistencia

### ✅ Lo que SÍ puedes hacer:

- Enviar desde celular y Cloud API simultáneamente
- Recibir mensajes en ambos (celular y webhook)
- Usar Puppeteer sin afectar el celular
- Tener hasta 1,000 mensajes/día desde celular (límite de WhatsApp Business App)

### ❌ Lo que NO debes hacer:

- No desconectar el número de Cloud API mientras usas coexistencia
- No cambiar el número en WhatsApp Business App (rompería la conexión)

### 🔄 Sincronización:

- Los mensajes enviados desde celular aparecen en el webhook (`is_from_me = true`)
- Los mensajes enviados desde Cloud API aparecen en tu celular
- Todo se sincroniza automáticamente

---

## 🐛 Troubleshooting

### Error: "Number already in use"
- El número ya está conectado a otra app
- Ve a la app original y desconéctalo primero
- O usa un número diferente

### No veo opción de coexistencia
- Coexistencia se activa automáticamente cuando conectas un número existente
- No necesitas activarla manualmente

### El número no se conecta
- Verifica que el número esté en WhatsApp Business (no WhatsApp normal)
- Verifica que recibiste el código de verificación
- Intenta desde otro dispositivo si es necesario

---

## ✅ Checklist de Coexistencia

- [ ] Número está en WhatsApp Business App
- [ ] Número conectado a Cloud API desde Meta Developer Console
- [ ] Coexistencia activada (automático)
- [ ] Phone Number ID obtenido
- [ ] Business Account ID obtenido
- [ ] Access Token obtenido
- [ ] Puedo enviar desde celular
- [ ] Puedo enviar desde Cloud API (prueba después)

---

## 🚀 Siguiente Paso

Una vez que tengas coexistencia configurada:

1. **Obtén los datos** de API Setup
2. **Configura la cuenta** en tu app
3. **Configura el webhook** (para recibir mensajes)
4. **Prueba enviar** desde Cloud API
5. **Verifica** que aparece en tu celular

---

**Última actualización:** 2025-12-02

