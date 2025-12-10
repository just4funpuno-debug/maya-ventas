# 🎯 Paso a Paso: Configurar Verify Token

## Escenario 1: Ya tienes cuenta WhatsApp

### 1. Abre tu app
- Abre la aplicación en el navegador
- URL: `http://localhost:5173` (o la URL donde esté corriendo)

### 2. Ve a WhatsApp
- En el sidebar, haz clic en **WhatsApp** (bajo "Administración")
- O directamente: busca el ícono de mensaje en el sidebar

### 3. Ver/Editar cuenta
- Si ves una lista de cuentas, haz clic en **"Editar"** (ícono de lápiz)
- Si no hay cuentas, ve a **Escenario 2**

### 4. Verificar Verify Token
- Busca el campo **"Verify Token"**
- **Si tiene valor:** ✅ Cópialo y guárdalo
- **Si está vacío:** Genera uno (ver abajo)

### 5. Generar Token (si está vacío)
- Puede ser cualquier string: `maya_whatsapp_2025`
- O más seguro: `maya_webhook_verify_20251202`
- Pégualo en el campo
- Haz clic en **"Actualizar Cuenta"**

---

## Escenario 2: No tienes cuenta WhatsApp

### 1. Abre tu app
- Abre la aplicación en el navegador

### 2. Ve a WhatsApp
- Sidebar > **Administración** > **WhatsApp**

### 3. Crear nueva cuenta
- Haz clic en **"Nueva Cuenta"** (botón naranja)

### 4. Llenar formulario

**Campos requeridos:**

1. **Phone Number ID** ⭐
   - De Meta Developer Console
   - Ejemplo: `123456789012345`

2. **Business Account ID** ⭐
   - De Meta Developer Console
   - Ejemplo: `987654321098765`

3. **Access Token** ⭐
   - De Meta Developer Console
   - Token temporal o permanente

4. **Verify Token** ⭐⭐ (ESTE ES EL IMPORTANTE)
   - **Genera uno:** `maya_whatsapp_verify_2025`
   - O más seguro: `maya_webhook_20251202_xyz123`
   - **⚠️ GUÁRDALO** - lo necesitarás para Meta Developer Console

5. **Phone Number**
   - Ejemplo: `+591 12345678`

6. **Display Name**
   - Ejemplo: `Maya Life - Principal`

7. **Active**: ✅ (marcado)

### 5. Guardar
- Haz clic en **"Crear Cuenta"**
- Verifica que se guardó
- **Copia el Verify Token** - lo necesitarás después

---

## 🔑 Generar Verify Token Rápido

### Opción 1: Token Simple
```
maya_whatsapp_verify_2025
```

### Opción 2: Token con Fecha
```
maya_webhook_20251202
```

### Opción 3: Token Aleatorio
Abre la consola del navegador (F12) y ejecuta:
```javascript
Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
```

Ejemplo resultado: `k8m2n5p9rt7vw3xy1za6bc4de0fg`

### Opción 4: UUID
En la consola del navegador:
```javascript
crypto.randomUUID().replace(/-/g, '')
```

---

## ✅ Verificación

Después de guardar:

1. **Verifica que la cuenta está activa:**
   - En la lista, debería aparecer con estado "Activa"
   - Si no, haz clic en el toggle para activarla

2. **Copia el Verify Token:**
   - Edita la cuenta de nuevo
   - Copia el valor del campo "Verify Token"
   - Guárdalo en un lugar seguro

3. **Listo para siguiente paso:**
   - Ahora puedes configurar el webhook en Meta Developer Console
   - Usarás este mismo Verify Token allí

---

## 🚀 Siguiente Paso

Una vez que tengas el Verify Token:

1. ✅ Token generado y guardado
2. ✅ Cuenta WhatsApp activa
3. ➡️ **Continúa con:** Configurar Webhook en Meta Developer Console

---

**¿Necesitas ayuda?** Revisa `CONFIGURAR_VERIFY_TOKEN.md` para más detalles.

