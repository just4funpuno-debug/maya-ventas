# 🧪 Guía de Pruebas - FASE 2

## 📋 Cómo Ejecutar las Pruebas

### 1. Acceder a la Página de Pruebas

1. Inicia sesión como **admin**
2. En el menú lateral, busca **"🧪 Pruebas WhatsApp"**
3. Haz clic para abrir la página de pruebas

### 2. Configurar Pruebas

1. **Selecciona un Contacto:**
   - Elige un contacto de la lista desplegable
   - Si no hay contactos, crea uno desde el webhook o manualmente

2. **Selecciona una Cuenta WhatsApp:**
   - Elige una cuenta activa de WhatsApp
   - Asegúrate de que la cuenta esté configurada correctamente

### 3. Ejecutar Pruebas Automáticas

1. Haz clic en **"▶️ Ejecutar Todas las Pruebas"**
2. Espera a que se completen todas las pruebas
3. Revisa los resultados en la sección "Resultados de Pruebas"

### 4. Pruebas Manuales

1. Usa el componente **"Prueba Manual - Envío de Mensajes"** en la parte inferior
2. Prueba enviar diferentes tipos de mensajes:
   - Mensaje de texto
   - Imagen con caption
   - Video con caption
   - Audio
   - Documento

---

## ✅ Checklist de Verificación

### Pruebas Automáticas

- [ ] `isWindow24hActive` - Retorna true/false correctamente
- [ ] `getHoursRemaining` - Calcula horas correctamente
- [ ] `isWithin72hWindow` - Detecta ventana 72h correctamente
- [ ] `decideSendMethod` - Decide método correctamente
- [ ] `getWindow24hInfo` - Obtiene información completa
- [ ] `sendTextMessage` - Envía mensaje (si ventana activa)
- [ ] `sendMessageIntelligent` - Envía mensaje inteligentemente

### Pruebas Manuales

- [ ] Selector de tipo de mensaje funciona
- [ ] Input de texto funciona
- [ ] Selector de archivo funciona
- [ ] Campo de caption funciona
- [ ] Campo de filename funciona
- [ ] Botón de envío funciona
- [ ] Muestra estado de carga
- [ ] Muestra errores correctamente
- [ ] Limpia formulario después de envío
- [ ] WindowIndicator muestra información correcta
- [ ] SendMethodBadge muestra método correcto

---

## 🐛 Solución de Problemas

### No hay contactos disponibles
- **Solución:** Crea un contacto manualmente en la BD o espera a que llegue un mensaje via webhook

### No hay cuentas disponibles
- **Solución:** Ve a "WhatsApp" en el menú y crea una cuenta

### Error al enviar mensaje
- **Verifica:** Que la cuenta esté activa y configurada correctamente
- **Verifica:** Que el contacto tenga un número válido
- **Verifica:** Que la ventana 24h o 72h esté activa (para Cloud API)

### Ventana cerrada
- **Normal:** Si la ventana está cerrada, el sistema usará Puppeteer automáticamente
- **Para probar Cloud API:** Crea un contacto nuevo (dentro de 72h) o espera a que responda un cliente

---

## 📊 Interpretación de Resultados

### ✅ Éxito (Verde)
- La prueba se ejecutó correctamente
- Revisa el JSON de resultado para detalles

### ❌ Error (Rojo)
- La prueba falló
- Revisa el mensaje de error para detalles
- Verifica la configuración

### ⏭️ Omitido (Amarillo)
- La prueba se omitió por una razón válida
- Ejemplo: Ventana cerrada, usaría Puppeteer

### ⏳ Ejecutando (Azul)
- La prueba está en progreso
- Espera a que termine

---

## 🎯 Próximos Pasos

Una vez que todas las pruebas pasen:
1. Verifica que los mensajes se guardan en la BD
2. Verifica que los mensajes se envían correctamente
3. Verifica que la UI se actualiza correctamente
4. Continúa con FASE 3

---

**¡Buena suerte con las pruebas!** 🚀


