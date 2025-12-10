# 🔗 Coexistencia WhatsApp: Paso a Paso Completo

## 🎯 ¿Qué es Coexistencia?

**Coexistencia** = Usar el **mismo número** de WhatsApp para:

1. ✅ **WhatsApp Business App** (en tu celular) - Envíos manuales
2. ✅ **Cloud API** (automático) - Envíos automáticos gratis
3. ✅ **Puppeteer** (automático) - Envíos cuando Cloud API no es gratis

**Todo funciona simultáneamente, sin conflictos.**

---

## 📋 Requisitos Previos

- [ ] Tienes WhatsApp Business instalado en tu celular
- [ ] Tu número está registrado en WhatsApp Business
- [ ] Tienes una App creada en Meta Developer Console
- [ ] WhatsApp está agregado como producto en tu App

---

## 🚀 Proceso Completo de Coexistencia

### PASO 1: Ir a Phone Numbers

1. **Ve a:** https://developers.facebook.com/
2. **Selecciona tu App** de WhatsApp Business
3. **Menú lateral:** WhatsApp > **Phone Numbers**
4. O directamente: https://developers.facebook.com/apps/[TU_APP_ID]/whatsapp-business/wa-dev-console/

### PASO 2: Agregar Número

1. **Haz clic en:** "Add phone number" o "Agregar número"
2. **Selecciona:** "Use existing number" o "Usar número existente"
   - ⚠️ **NO selecciones** "Get a new number" (eso crearía un número nuevo)

### PASO 3: Ingresar Número

1. **Ingresa tu número** completo
   - Formato: `+591 12345678` o `59112345678`
   - Debe ser el mismo número de tu WhatsApp Business App

2. **Haz clic en "Next"** o "Siguiente"

### PASO 4: Verificación (Puede ser QR o Código)

Meta te pedirá verificar de una de estas formas:

#### Opción A: Código Numérico (Más Común)

1. **Meta enviará un código** a tu WhatsApp Business
2. **Abre WhatsApp Business** en tu celular
3. **Busca el mensaje** de Meta con el código
4. **Copia el código** (ej: `123456`)
5. **Pégalo** en Meta Developer Console
6. **Haz clic en "Verify"** o "Verificar"

#### Opción B: QR Code (A veces)

1. **Meta mostrará un QR code** en la pantalla
2. **Abre WhatsApp Business** en tu celular
3. **Ve a:** Configuración > Dispositivos vinculados
4. **Toca "Conectar un dispositivo"**
5. **Escanear QR** que muestra Meta Developer Console
6. **Confirma** en tu celular

### PASO 5: Confirmar Conexión

1. **Espera 1-2 minutos** mientras Meta conecta el número
2. **Verás un mensaje:** "Phone number connected" o "Número conectado"
3. **✅ Coexistencia activada automáticamente**

---

## ✅ Verificar que Funciona

### En Meta Developer Console:

1. **Ve a:** WhatsApp > Phone Numbers
2. **Tu número debería aparecer** con estado:
   - ✅ **"Connected"** o **"Conectado"**
   - ✅ **"Active"** o **"Activo"**

### En tu Celular:

1. **Abre WhatsApp Business**
2. **Deberías ver una notificación** de que está conectado
3. **Puedes seguir usando** WhatsApp Business normalmente

---

## 🎯 Después de Conectar

Una vez conectado, puedes:

1. **Obtener los datos** de API Setup:
   - Phone Number ID
   - Business Account ID
   - Access Token

2. **Configurar en tu app:**
   - Pega los datos en el formulario
   - Guarda la cuenta

3. **Configurar webhook:**
   - Para recibir mensajes automáticamente

4. **Probar:**
   - Envía desde Cloud API → Aparece en tu celular
   - Envía desde celular → Aparece en webhook

---

## ⚠️ Notas Importantes

### ✅ Lo que SÍ puedes hacer:

- Enviar desde celular y Cloud API al mismo tiempo
- Recibir mensajes en ambos lugares
- Usar Puppeteer sin afectar el celular
- Tener hasta 1,000 mensajes/día desde celular

### ❌ Lo que NO debes hacer:

- Desconectar el número de Cloud API (rompería coexistencia)
- Cambiar el número en WhatsApp Business App
- Usar WhatsApp normal (debe ser WhatsApp Business)

### 🔄 Sincronización Automática:

- Mensajes desde celular → Aparecen en webhook (`is_from_me = true`)
- Mensajes desde Cloud API → Aparecen en tu celular
- Estados (sent, delivered, read) → Se sincronizan

---

## 🐛 Troubleshooting

### Error: "Number already in use"
- El número ya está conectado a otra app
- Ve a la app original y desconéctalo
- O contacta a Meta Support

### No recibo el código
- Verifica que el número es correcto
- Verifica que WhatsApp Business está abierto
- Espera unos minutos y vuelve a intentar

### No veo opción de "Use existing number"
- Asegúrate de que tu número está en WhatsApp Business (no WhatsApp normal)
- Verifica que tienes permisos de administrador en la App

### El QR no se escanea
- Asegúrate de que WhatsApp Business está actualizado
- Intenta desde otro dispositivo
- Usa la opción de código numérico si está disponible

---

## ✅ Checklist Final

- [ ] WhatsApp Business instalado en celular
- [ ] Número registrado en WhatsApp Business
- [ ] App creada en Meta Developer Console
- [ ] WhatsApp agregado como producto
- [ ] Número conectado con coexistencia
- [ ] Estado "Connected" en Meta Developer Console
- [ ] Puedo usar WhatsApp Business normalmente
- [ ] Datos obtenidos de API Setup

---

## 🚀 Siguiente Paso

Después de configurar coexistencia:

1. **Obtén los datos** de API Setup
2. **Configura la cuenta** en tu app
3. **Configura el webhook**
4. **Prueba enviar** desde Cloud API

---

**Última actualización:** 2025-12-02

