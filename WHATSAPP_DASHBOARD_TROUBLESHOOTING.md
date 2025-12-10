# 🔧 WhatsApp Dashboard - Troubleshooting

## ❌ Problemas Comunes y Soluciones

---

### 1. No se muestran conversaciones

**Síntomas:**
- La lista de conversaciones está vacía
- Mensaje "No hay conversaciones"

**Posibles causas:**
1. No hay contactos en la base de datos
2. No hay mensajes asociados a los contactos
3. Error de conexión a Supabase
4. Permisos RLS bloqueando acceso

**Soluciones:**
1. Verificar que existan registros en `whatsapp_contacts`
2. Verificar que existan mensajes en `whatsapp_messages`
3. Revisar consola del navegador para errores
4. Verificar políticas RLS en Supabase Dashboard

**Comandos SQL útiles:**
```sql
-- Verificar contactos
SELECT COUNT(*) FROM whatsapp_contacts;

-- Verificar mensajes
SELECT COUNT(*) FROM whatsapp_messages;

-- Ver contactos con mensajes
SELECT c.*, COUNT(m.id) as message_count
FROM whatsapp_contacts c
LEFT JOIN whatsapp_messages m ON m.contact_id = c.id
GROUP BY c.id;
```

---

### 2. Los mensajes no se actualizan en tiempo real

**Síntomas:**
- Los nuevos mensajes no aparecen automáticamente
- Necesitas recargar la página para ver cambios

**Posibles causas:**
1. Realtime no está habilitado en Supabase
2. Error en la suscripción
3. Problemas de conexión

**Soluciones:**
1. **Habilitar Realtime en Supabase:**
   - Ve a Supabase Dashboard
   - Database → Replication
   - Habilita Realtime para `whatsapp_contacts` y `whatsapp_messages`

2. **Verificar suscripción:**
   - Abre consola del navegador
   - Busca logs de `subscribeConversations` o `subscribeContactMessages`
   - Verifica que no haya errores

3. **Verificar conexión:**
   - Verifica tu conexión a internet
   - Verifica que Supabase esté accesible

---

### 3. No puedo enviar mensajes

**Síntomas:**
- El botón de enviar está deshabilitado
- Error al intentar enviar mensaje
- Mensaje "Ventana cerrada"

**Posibles causas:**
1. Ventana 24h cerrada
2. Ventana 72h cerrada
3. Cuenta WhatsApp inactiva
4. Error de API

**Soluciones:**
1. **Verificar ventana 24h:**
   - El contacto debe haber respondido en las últimas 24 horas
   - Verifica `window_expires_at` en `whatsapp_contacts`

2. **Verificar ventana 72h:**
   - Debe haber un Click-to-WhatsApp Ad en las últimas 72 horas
   - Verifica `entry_point_72h_at` en `whatsapp_contacts`

3. **Verificar cuenta:**
   - Ve a "WhatsApp" en el menú
   - Verifica que la cuenta esté activa
   - Verifica que tenga `access_token` válido

4. **Revisar errores:**
   - Abre consola del navegador
   - Busca errores de API
   - Verifica el mensaje de error específico

---

### 4. El dashboard no carga

**Síntomas:**
- Pantalla en blanco
- Mensaje de error
- Spinner infinito

**Posibles causas:**
1. Error de permisos
2. Error de conexión a Supabase
3. Error en el código

**Soluciones:**
1. **Verificar permisos:**
   - Debes tener rol `admin`
   - Verifica tu sesión en la aplicación

2. **Verificar conexión:**
   - Verifica `VITE_SUPABASE_URL` en `.env.local`
   - Verifica `VITE_SUPABASE_ANON_KEY` en `.env.local`
   - Verifica que Supabase esté accesible

3. **Revisar consola:**
   - Abre consola del navegador (F12)
   - Busca errores en rojo
   - Comparte el error para debugging

---

### 5. Búsqueda no funciona

**Síntomas:**
- Escribes en el campo de búsqueda pero no filtra
- No se muestran resultados

**Posibles causas:**
1. Error en la función de búsqueda
2. Problema con la query de Supabase

**Soluciones:**
1. **Verificar búsqueda:**
   - Abre consola del navegador
   - Verifica que `getConversations` se llame con `search`
   - Verifica la respuesta de la API

2. **Probar búsqueda directa:**
   - Usa diferentes términos de búsqueda
   - Prueba con nombre completo
   - Prueba con número de teléfono

---

### 6. Mensajes duplicados

**Síntomas:**
- Los mensajes aparecen duplicados
- El mismo mensaje aparece varias veces

**Posibles causas:**
1. Múltiples suscripciones activas
2. Webhook procesando el mismo mensaje varias veces

**Soluciones:**
1. **Verificar suscripciones:**
   - Asegúrate de que solo haya una suscripción activa
   - Verifica que las suscripciones se limpien al desmontar

2. **Verificar webhook:**
   - Revisa los logs del webhook
   - Verifica que no se procese el mismo mensaje múltiples veces

---

### 7. Estados de mensaje incorrectos

**Síntomas:**
- Los estados no se actualizan
- Siempre muestra "enviado" aunque esté leído

**Posibles causas:**
1. Webhook no está actualizando estados
2. Error en la actualización de BD

**Soluciones:**
1. **Verificar webhook:**
   - Revisa que el webhook esté configurado correctamente
   - Verifica que procese eventos de estado

2. **Verificar BD:**
   - Verifica que `status` se actualice en `whatsapp_messages`
   - Verifica que `read_at` se actualice cuando se lee

---

## 🔍 Debugging Avanzado

### Habilitar Logs Detallados

Abre la consola del navegador y ejecuta:

```javascript
// Habilitar logs de conversaciones
localStorage.setItem('debug_conversations', 'true');

// Habilitar logs de mensajes
localStorage.setItem('debug_messages', 'true');

// Habilitar logs de tiempo real
localStorage.setItem('debug_realtime', 'true');
```

### Verificar Estado de Componentes

```javascript
// En la consola del navegador
// Ver estado de ConversationList
window.__REACT_DEVTOOLS_GLOBAL_HOOK__?.renderers?.get(1)?.getFiberRoots(1)?.forEach(root => {
  console.log('Component state:', root.current);
});
```

### Verificar Suscripciones Activas

```javascript
// En la consola del navegador
// Ver suscripciones de Supabase
const channels = supabase.getChannels();
console.log('Active channels:', channels);
```

---

## 📞 Soporte

Si el problema persiste:

1. **Recopila información:**
   - Captura de pantalla del error
   - Logs de la consola del navegador
   - Descripción detallada del problema

2. **Verifica configuración:**
   - Variables de entorno
   - Configuración de Supabase
   - Permisos RLS

3. **Revisa documentación:**
   - `WHATSAPP_DASHBOARD_README.md`
   - `WHATSAPP_DASHBOARD_GUIA_TECNICA.md`
   - Documentación de Supabase

---

**Versión:** 1.0.0  
**Última actualización:** 2025-01-02


