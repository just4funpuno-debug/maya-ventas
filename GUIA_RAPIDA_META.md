# ⚡ Guía Rápida: Datos de Meta Developer Console

## 🎯 Ubicación de Cada Dato

### 1. Phone Number ID
**Ruta:** WhatsApp > API Setup  
**Sección:** "Phone number ID"  
**Ejemplo:** `123456789012345`

### 2. Business Account ID
**Ruta:** WhatsApp > API Setup  
**Sección:** "Business account ID" o "WhatsApp Business Account ID"  
**Ejemplo:** `987654321098765`

### 3. Access Token
**Ruta:** WhatsApp > API Setup  
**Sección:** "Temporary access token" (temporal) o "System User Access Token" (permanente)  
**Ejemplo:** `EAABwzLixZC...` (muy largo)

### 4. Verify Token
**NO viene de Meta** - Tú lo generas  
**Ejemplo:** `maya_whatsapp_verify_2025`

### 5. Phone Number
**Ruta:** WhatsApp > API Setup  
**Sección:** "Phone number" o "To"  
**Ejemplo:** `+591 12345678`

---

## 📍 Acceso Directo

1. **Ve a:** https://developers.facebook.com/
2. **Selecciona tu App** de WhatsApp Business
3. **Menú lateral:** WhatsApp > **API Setup**
4. **Ahí están todos los datos**

---

## 🔑 Generar Verify Token Rápido

En la consola del navegador (F12):
```javascript
'maya_whatsapp_' + Date.now().toString(36)
```

O simplemente usa:
```
maya_whatsapp_verify_2025
```

---

## ✅ Checklist

- [ ] Phone Number ID copiado
- [ ] Business Account ID copiado
- [ ] Access Token copiado (temporal o permanente)
- [ ] Verify Token generado
- [ ] Phone Number copiado
- [ ] Todos los datos guardados en lugar seguro

---

**Siguiente:** Configurar cuenta en tu app con estos datos.

