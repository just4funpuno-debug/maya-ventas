# 🚀 Actualizar Edge Function: whatsapp-webhook

## 📋 Método: Dashboard de Supabase (Sin CLI)

**Tiempo:** 5 minutos  
**Dificultad:** Fácil

---

## ✅ PASO 1: Ir a Edge Functions

1. **Abre tu navegador:**
   - Ve a: https://supabase.com/dashboard
   - **Inicia sesión** si es necesario

2. **Selecciona tu proyecto**

3. **En el menú lateral izquierdo:**
   - Haz clic en **"Edge Functions"** (o **"Funciones Edge"**)
   - O directamente ve a: `https://supabase.com/dashboard/project/[TU-PROJECT-ID]/functions`

---

## ✅ PASO 2: Buscar la Función Existente

1. **Busca la función:** `whatsapp-webhook` en la lista
2. **Haz clic en ella** para abrir el editor

**⚠️ IMPORTANTE:** Si la función **NO existe**, sigue estos pasos:
- Haz clic en **"Create a new function"** o **"Crear función"**
- Nombre: `whatsapp-webhook`
- Haz clic en **"Create function"**

---

## ✅ PASO 3: Copiar el Código Actualizado

1. **En tu editor local** (VS Code, etc.):
   - Abre el archivo: `supabase/functions/whatsapp-webhook/index.ts`
   - **Selecciona TODO el contenido** (Ctrl+A o Cmd+A)
   - **Copia** (Ctrl+C o Cmd+C)

2. **Vuelve al Dashboard de Supabase**

---

## ✅ PASO 4: Reemplazar el Código

1. **En el editor del Dashboard:**
   - **Selecciona TODO** el código existente (Ctrl+A)
   - **Borra** (Delete o Backspace)
   - **Pega** el nuevo código (Ctrl+V)

2. **Verifica que el código se vea completo:**
   - Debe tener la función `createLeadIfNotExists()` (busca en el código)
   - Debe tener la llamada a esta función en `processMessages()`

---

## ✅ PASO 5: Desplegar

1. **Haz clic en el botón "Deploy"** (o **"Desplegar"**)
   - Está en la parte superior derecha del editor
   - O puedes usar Ctrl+S para guardar y desplegar

2. **Espera a que termine:**
   - Verás "Deploying..." en la pantalla
   - Luego verás "Deployed successfully" ✅

3. **Deberías ver:**
   ```
   ✅ Function deployed successfully
   ```

---

## ✅ PASO 6: Verificar que Funciona

### Opción A: Desde el Dashboard

1. **En la página de la función**, busca la sección **"Logs"**
2. **Cuando llegue un mensaje nuevo**, deberías ver en los logs:
   ```
   [createLeadIfNotExists] ✅ Lead creado automáticamente: [id-del-lead]
   ```

### Opción B: Probar Manualmente

1. **Envía un mensaje desde WhatsApp** a tu número de negocio
2. **Ve a tu CRM** → Tab "Leads"
3. **Deberías ver** un nuevo lead automáticamente en la columna "Leads Entrantes" 🔒

---

## 🔍 Verificar el Código Actualizado

Para asegurarte de que el código tiene la nueva función, busca estas líneas en el editor:

```typescript
// Debe existir esta función:
async function createLeadIfNotExists(contactId: string, accountId: string) {
  // ... código ...
}

// Y debe ser llamada aquí:
if (!isFromMe) {
  await updateContactInteraction(contact.id, 'client');
  await pauseSequenceIfNeeded(contact.id);
  
  // FASE 1: Crear lead automáticamente si no existe
  await createLeadIfNotExists(contact.id, accountId); // ← Esta línea debe existir
}
```

---

## ✅ Checklist

- [ ] Función `whatsapp-webhook` encontrada o creada
- [ ] Código copiado desde `supabase/functions/whatsapp-webhook/index.ts`
- [ ] Código pegado en el editor del Dashboard
- [ ] Función desplegada exitosamente
- [ ] Logs verificados (opcional)
- [ ] Prueba manual realizada (enviar mensaje)

---

## 🐛 Si Hay Problemas

### Error: "Function not found"
- **Solución:** Crea la función nueva con el nombre `whatsapp-webhook`

### Error: "Deploy failed"
- **Solución:** Verifica que copiaste TODO el código sin cortes
- Revisa si hay errores de sintaxis en el código

### El código no se actualiza
- **Solución:** Asegúrate de hacer clic en "Deploy" después de pegar el código
- Espera a que termine el despliegue (puede tardar 30-60 segundos)

---

## 📞 URL de la Función

Una vez desplegada, tu función estará disponible en:

```
https://[TU-PROJECT-ID].supabase.co/functions/v1/whatsapp-webhook
```

Esta URL ya debería estar configurada en Meta Developer Console como webhook.

---

**¡Listo!** 🎉 

La creación automática de leads ya debería funcionar cuando lleguen mensajes nuevos.

