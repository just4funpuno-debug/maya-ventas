# ✅ Checklist: Datos de Meta Developer Console

Usa este checklist para asegurarte de tener todos los datos necesarios.

---

## 📋 Paso 1: Acceso

- [ ] Accedí a https://developers.facebook.com/
- [ ] Inicié sesión con mi cuenta
- [ ] Tengo una App de WhatsApp Business creada
- [ ] Puedo ver el menú "WhatsApp" en el sidebar

---

## 📋 Paso 2: Navegar a API Setup

- [ ] Hice clic en **WhatsApp** en el menú lateral
- [ ] Hice clic en **API Setup**
- [ ] Puedo ver la página con la configuración

---

## 📋 Paso 3: Obtener Phone Number ID

- [ ] Encontré la sección "Phone number ID"
- [ ] Copié el número completo
- [ ] Lo guardé en un lugar seguro
- [ ] **Valor:** `_________________________`

---

## 📋 Paso 4: Obtener Business Account ID

- [ ] Encontré la sección "Business account ID"
- [ ] Copié el número completo
- [ ] Lo guardé en un lugar seguro
- [ ] **Valor:** `_________________________`

---

## 📋 Paso 5: Obtener Access Token

- [ ] Encontré la sección "Temporary access token" o "Access tokens"
- [ ] Copié el token completo (es muy largo)
- [ ] Lo guardé en un lugar seguro
- [ ] **Nota:** Si es temporal, expira en 1 hora
- [ ] **Valor:** `_________________________` (solo primeras letras: `EAAB...`)

---

## 📋 Paso 6: Generar Verify Token

- [ ] Generé un token seguro
- [ ] Lo guardé en un lugar seguro
- [ ] **⚠️ IMPORTANTE:** Este mismo token lo usaré en Meta Developer Console después
- [ ] **Valor:** `_________________________`

**Opciones para generar:**
- Simple: `maya_whatsapp_verify_2025`
- Con fecha: `maya_webhook_20251202`
- Aleatorio: (generar en consola del navegador)

---

## 📋 Paso 7: Obtener Phone Number

- [ ] Encontré la sección "Phone number" o "To"
- [ ] Copié el número completo
- [ ] **Valor:** `_________________________`

---

## 📋 Paso 8: Verificar Todos los Datos

Antes de continuar, verifica que tienes:

- [ ] ✅ Phone Number ID
- [ ] ✅ Business Account ID
- [ ] ✅ Access Token
- [ ] ✅ Verify Token (generado)
- [ ] ✅ Phone Number

---

## 🚀 Siguiente Paso

Una vez que tengas todos los datos:

1. **Abre tu app** → Sidebar > **Administración** > **WhatsApp**
2. **Haz clic en "Nueva Cuenta"**
3. **Pega cada dato en su campo correspondiente:**
   - Phone Number ID → Campo "Phone Number ID"
   - Business Account ID → Campo "Business Account ID"
   - Access Token → Campo "Access Token"
   - Verify Token → Campo "Verify Token"
   - Phone Number → Campo "Número de Teléfono"
   - Display Name → (elige un nombre, ej: "Maya Life - Principal")
4. **Marca "Cuenta activa"**
5. **Haz clic en "Crear Cuenta"**

---

## ⚠️ Notas Importantes

1. **Access Token:**
   - Si es temporal, expira en 1 hora
   - Para producción, genera uno permanente

2. **Verify Token:**
   - Debe ser el mismo en tu app Y en Meta Developer Console
   - Guárdalo bien, lo necesitarás dos veces

3. **Seguridad:**
   - No compartas estos datos públicamente
   - Especialmente el Access Token y Verify Token

---

**¿Listo?** Continúa configurando la cuenta en tu app.

