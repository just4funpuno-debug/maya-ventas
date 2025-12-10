# 🔐 Configurar Verify Token para Webhook

El **Verify Token** es un string secreto que usas para verificar que las peticiones al webhook vienen realmente de Meta/WhatsApp.

---

## 📋 Opción 1: Si YA tienes una cuenta WhatsApp configurada

### Paso 1: Ver el Verify Token existente

1. **Abre tu app en el navegador**
2. **Ve a:** Sidebar > **Administración** > **WhatsApp**
3. **Busca tu cuenta** en la lista
4. **Haz clic en el botón "Editar"** (ícono de lápiz)
5. **Busca el campo "Verify Token"**
6. **Copia el valor** (si está vacío, ve a Opción 2)

### Paso 2: Si el Verify Token está vacío

Si el campo está vacío, necesitas crear uno:

1. **Genera un token seguro:**
   - Puede ser cualquier string alfanumérico
   - Ejemplo: `maya_whatsapp_token_2025_xyz123`
   - O usa un generador: https://www.random.org/strings/
   
2. **Pega el token en el campo "Verify Token"**
3. **Guarda los cambios** (botón "Actualizar Cuenta")
4. **Copia el token** - lo necesitarás para configurar en Meta Developer Console

---

## 📋 Opción 2: Si NO tienes cuenta WhatsApp configurada

### Paso 1: Crear nueva cuenta

1. **Abre tu app en el navegador**
2. **Ve a:** Sidebar > **Administración** > **WhatsApp**
3. **Haz clic en "Nueva Cuenta"** (botón naranja con ícono +)

### Paso 2: Llenar el formulario

Necesitas estos datos de **Meta Developer Console**:

1. **Phone Number ID**: 
   - Ve a Meta Developer Console > WhatsApp > API Setup
   - Copia el "Phone number ID"

2. **Business Account ID**:
   - En la misma página, copia el "Business account ID"

3. **Access Token**:
   - En la misma página, copia el "Temporary access token" o genera uno permanente
   - **⚠️ Importante:** Este token es sensible, guárdalo seguro

4. **Verify Token** (ESTE ES EL QUE NECESITAMOS):
   - **Genera un token seguro:**
     - Puede ser cualquier string: `maya_whatsapp_token_2025_xyz123`
     - O usa: `maya_webhook_verify_` + fecha actual
     - Ejemplo: `maya_webhook_verify_20251202`
   - **⚠️ IMPORTANTE:** Este mismo token lo usarás después en Meta Developer Console
   - **Guárdalo en un lugar seguro** (lo necesitarás dos veces)

5. **Phone Number**:
   - El número de teléfono de WhatsApp Business
   - Ejemplo: `+591 12345678`

6. **Display Name**:
   - Nombre para identificar la cuenta
   - Ejemplo: `Maya Life - Principal`

7. **Product ID** (opcional):
   - Si quieres asociar a un producto específico

8. **Active**: ✅ (dejar marcado)

### Paso 3: Guardar

1. **Haz clic en "Crear Cuenta"**
2. **Verifica que se guardó correctamente**
3. **Copia el Verify Token** - lo necesitarás para Meta Developer Console

---

## 🔑 Generar un Verify Token Seguro

### Opción A: Token Simple (Recomendado para empezar)

```
maya_whatsapp_verify_2025
```

### Opción B: Token con Fecha

```
maya_webhook_verify_20251202
```

### Opción C: Token Aleatorio (Más seguro)

Usa un generador online:
- https://www.random.org/strings/
- Configuración:
  - **Length**: 32
  - **Characters**: Letters and Numbers
  - Ejemplo resultado: `K8mN2pQ9rT5vW7xY3zA6bC4dE1fG0h`

### Opción D: Token con UUID

```javascript
// En la consola del navegador (F12)
crypto.randomUUID().replace(/-/g, '')
```

Ejemplo: `a1b2c3d4e5f6789012345678901234ab`

---

## ✅ Checklist

- [ ] Verify Token generado/obtenido
- [ ] Verify Token guardado en la cuenta WhatsApp
- [ ] Verify Token copiado (lo necesitarás para Meta Developer Console)
- [ ] Cuenta WhatsApp activa (`active = true`)

---

## 📝 Notas Importantes

1. **El Verify Token debe ser el mismo en:**
   - Tu cuenta en `whatsapp_accounts.verify_token`
   - Meta Developer Console > Webhook > Verify Token

2. **Si cambias el Verify Token:**
   - Debes actualizarlo en ambos lugares
   - Meta Developer Console requerirá re-verificación

3. **Seguridad:**
   - No compartas el Verify Token públicamente
   - Úsalo solo para configurar el webhook
   - Puedes cambiarlo cuando quieras

---

## 🚀 Siguiente Paso

Una vez que tengas el Verify Token configurado:

1. **Cópialo** (lo necesitarás)
2. **Continúa con:** Configurar Webhook en Meta Developer Console
   - Sigue la guía: `CONFIGURAR_WEBHOOK_META.md`

---

**Última actualización:** 2025-12-02

