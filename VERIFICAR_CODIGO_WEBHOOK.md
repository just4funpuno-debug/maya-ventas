# ✅ Verificación de Código: whatsapp-webhook

## 🔍 Verificación Local

El código local **SÍ tiene todos los cambios necesarios**:

✅ **Función `createLeadIfNotExists`:**
- Ubicación: Línea 219
- Incluye toda la lógica de creación automática de leads
- Verifica existencia antes de crear
- Crea lead en etapa "entrantes"

✅ **Llamada a la función:**
- Ubicación: Línea 676 dentro de `processMessages()`
- Se ejecuta cuando llega un mensaje del cliente (`!isFromMe`)

---

## 🔧 Si no aparece en el Dashboard

### Posibles causas:
1. **Caché del navegador** - El Dashboard puede mostrar código antiguo
2. **El código no se copió completo** - Faltó alguna parte al pegar
3. **El despliegue falló silenciosamente** - Necesita re-desplegar

---

## ✅ Solución: Re-desplegar Correctamente

### Paso 1: Refrescar el Dashboard
1. En el Dashboard, presiona `Ctrl+F5` (refrescar forzado)
2. O cierra y vuelve a abrir la pestaña

### Paso 2: Verificar el Código en el Dashboard
1. Ve a la pestaña **"Code"**
2. Busca `createLeadIfNotExists` (Ctrl+F)
3. Si **NO aparece**, necesitas copiar el código de nuevo

### Paso 3: Copiar TODO el Código (Si no aparece)

**En tu editor local (VS Code):**
```
Archivo: supabase/functions/whatsapp-webhook/index.ts
```

1. **Selecciona TODO:** `Ctrl+A`
2. **Copia:** `Ctrl+C`
3. **Verifica que copiaste:** Debería tener 747 líneas aproximadamente

**En el Dashboard:**
1. **Selecciona TODO:** `Ctrl+A`
2. **Borra:** `Delete`
3. **Pega:** `Ctrl+V`
4. **Verifica:** Debe mostrar 747 líneas aproximadamente

### Paso 4: Buscar Verificaciones

En el código pegado, busca estas líneas para confirmar:

**Línea ~219:** (Busca "async function createLeadIfNotExists")
```typescript
async function createLeadIfNotExists(contactId: string, accountId: string) {
```

**Línea ~676:** (Busca "FASE 1: Crear lead")
```typescript
// FASE 1: Crear lead automáticamente si no existe
await createLeadIfNotExists(contact.id, accountId);
```

### Paso 5: Desplegar
1. Haz clic en **"Deploy updates"** o **"Deploy"**
2. Espera el mensaje: **"Successfully deployed"**
3. Refresca la página (F5)

### Paso 6: Verificar Final
1. Busca de nuevo `createLeadIfNotExists` (Ctrl+F)
2. **Debe aparecer** en la línea ~219

---

## 📋 Checklist de Verificación

- [ ] Código local tiene `createLeadIfNotExists` (✅ Confirmado)
- [ ] Dashboard refrescado (F5 o Ctrl+F5)
- [ ] Código copiado completamente (747 líneas)
- [ ] Función aparece en línea ~219 del Dashboard
- [ ] Llamada aparece en línea ~676 del Dashboard
- [ ] Desplegado exitosamente
- [ ] Verificado después del despliegue

---

## 🧪 Probar que Funciona

Después de desplegar correctamente:

1. **Envía un mensaje** desde WhatsApp a tu número de negocio
2. **Ve a CRM** → Tab "Leads"
3. **Deberías ver** un nuevo lead automáticamente en "Leads Entrantes"

O verifica en **Logs** del Dashboard:
- Pestaña "Logs" de la función
- Busca: `[createLeadIfNotExists] ✅ Lead creado automáticamente`

---

## ⚠️ Si Aún No Funciona

Si después de seguir todos los pasos aún no aparece:

1. **Verifica la URL del archivo:**
   - Debe ser: `supabase/functions/whatsapp-webhook/index.ts`
   - Debe tener 747 líneas

2. **Cuenta de caracteres:**
   - El archivo completo debe tener aproximadamente 25,000+ caracteres
   - Si copiaste menos, falta parte del código

3. **Re-desplegar desde cero:**
   - Elimina la función en el Dashboard
   - Créala de nuevo
   - Copia y pega el código completo


