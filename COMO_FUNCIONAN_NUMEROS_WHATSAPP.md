# 📱 ¿Cómo Funcionan los Números de WhatsApp?

## 🎯 Respuesta Rápida

**Los números de WhatsApp DEBEN estar registrados MANUALMENTE en Meta Developer Console ANTES de usar OAuth.**

El OAuth **NO puede registrar números nuevos automáticamente**. Solo puede obtener números que ya están registrados.

---

## 📋 Proceso Actual (Cómo Funciona)

### 1️⃣ PRIMERO: Registrar Números en Meta Developer Console (Manual)

**Esto lo haces ANTES de conectar con OAuth:**

1. Ve a: https://developers.facebook.com/
2. Selecciona tu App de WhatsApp Business
3. Ve a: **WhatsApp > Phone Numbers**
4. Haz clic en: **"Add phone number"** o **"Agregar número"**
5. Selecciona: **"Use existing number"** (usar número existente)
6. Ingresa tu número de WhatsApp Business (ej: `+591 12345678`)
7. Meta enviará un código a tu WhatsApp Business
8. Verifica con el código o QR code
9. ✅ **Listo** - El número queda registrado

**⚠️ IMPORTANTE:**
- Puedes registrar múltiples números en Meta Developer Console
- Cada número debe estar activo en WhatsApp Business App en tu celular
- El proceso de registro es manual y se hace una sola vez

---

### 2️⃣ SEGUNDO: Conectar con OAuth (Desde tu App)

**Una vez que los números están registrados en Meta:**

1. En tu app, haz clic en **"Conectar con Meta"**
2. El OAuth obtiene todos los números que YA están registrados
3. Si hay **1 número**: Se usa automáticamente
4. Si hay **múltiples números**: Aparece un selector para elegir cuál usar
5. Eliges el número y se llena el formulario automáticamente

---

## ❓ Preguntas Frecuentes

### ¿Puedo elegir un número al inicio del proceso?

**Respuesta corta: NO directamente en OAuth, pero SÍ puedes controlarlo:**

#### Opción A: Registrar solo el número que quieres (Recomendado)
1. En Meta Developer Console, registra **SOLO** el número que quieres usar
2. Cuando uses OAuth, solo aparecerá ese número
3. Se usará automáticamente (no aparecerá selector)

#### Opción B: Registrar múltiples números y elegir
1. En Meta Developer Console, registra **varios números**
2. Cuando uses OAuth, aparecerá un selector
3. Eliges cuál quieres usar

#### Opción C: Registrar manualmente todos los datos (Sin OAuth)
1. Obtén los datos manualmente desde Meta Developer Console:
   - Phone Number ID
   - Business Account ID
   - Access Token
   - Verify Token
2. Llena el formulario manualmente en tu app

---

### ¿Dónde se registran los números?

**En Meta Developer Console:**
- URL: https://developers.facebook.com/
- Sección: **WhatsApp > Phone Numbers**
- Requisito: El número debe estar activo en WhatsApp Business App

---

### ¿El OAuth puede registrar un número nuevo automáticamente?

**NO.** El OAuth solo puede:
- ✅ Obtener números que YA están registrados
- ✅ Obtener tokens de acceso
- ✅ Obtener IDs (Phone Number ID, Business Account ID)

**NO puede:**
- ❌ Registrar números nuevos
- ❌ Crear cuentas de WhatsApp Business
- ❌ Agregar números a Meta Developer Console

---

## 🔄 Flujo Recomendado

### Para un Solo Número:

```
1. Registra tu número en Meta Developer Console (Manual)
   └─> WhatsApp > Phone Numbers > Add phone number
   
2. Conecta con OAuth desde tu app
   └─> El número se detecta automáticamente
   └─> Se llena el formulario automáticamente
   
3. Guarda la cuenta en tu app
   └─> ✅ Listo
```

### Para Múltiples Números:

```
1. Registra TODOS los números que quieres usar en Meta Developer Console
   └─> WhatsApp > Phone Numbers > Add phone number (repetir para cada número)
   
2. Conecta con OAuth desde tu app
   └─> Aparece selector con todos los números
   
3. Elige el número que quieres usar
   └─> Se llena el formulario con ese número
   
4. Guarda la cuenta en tu app
   └─> ✅ Listo
```

---

## 📝 Resumen

| Pregunta | Respuesta |
|----------|-----------|
| ¿Dónde se registran los números? | Meta Developer Console > WhatsApp > Phone Numbers |
| ¿El OAuth puede registrar números? | NO, solo puede obtener números ya registrados |
| ¿Puedo elegir el número antes? | SÍ, registrando solo ese número en Meta |
| ¿Cuándo se registran los números? | ANTES de usar OAuth (proceso manual) |
| ¿Puedo tener múltiples números? | SÍ, y puedes elegir cuál usar con el selector |

---

## 🚀 Próximos Pasos

1. **Decide qué números quieres usar**
2. **Regístralos en Meta Developer Console** (uno por uno)
3. **Luego usa OAuth** desde tu app para conectarlos

---

## 💡 Tip

**Para evitar confusión:**
- Si solo vas a usar un número, regístralo en Meta y úsalo directamente con OAuth
- Si vas a usar varios números, regístralos todos primero y luego elige con el selector


