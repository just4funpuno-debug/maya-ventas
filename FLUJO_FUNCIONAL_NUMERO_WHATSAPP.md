# 🔧 Flujo Funcional: Selección de Número WhatsApp

## 🎯 Objetivo
Permitir al usuario **especificar qué número quiere usar ANTES de iniciar OAuth**, y guiarlo funcionalmente según el estado de ese número.

---

## 🔄 Flujo Funcional Propuesto

### PASO 1: Usuario especifica número deseado
```
Usuario ingresa el número que quiere usar:
- Campo: "Número de WhatsApp a vincular" (opcional)
- Ejemplo: +591 12345678
```

### PASO 2: Verificación inteligente
```
Sistema verifica:
- ¿El número está en formato válido?
- ¿El usuario tiene números registrados? (OAuth)
- ¿El número ingresado está en la lista de números registrados?
```

### PASO 3: Acción según resultado

#### Caso A: Número encontrado en números registrados
```
✅ "Número encontrado"
→ Inicia OAuth
→ Pre-selecciona ese número automáticamente
→ Continúa con el flujo normal
```

#### Caso B: Número NO encontrado pero hay otros números registrados
```
⚠️ "Número no encontrado. Tienes estos números registrados:"
→ Muestra lista de números disponibles
→ Usuario puede:
   1. Elegir uno de los disponibles
   2. O registrar el número que ingresó (mostrar instrucciones)
```

#### Caso C: No hay números registrados
```
📝 "No tienes números registrados aún"
→ Muestra instrucciones específicas para registrar el número ingresado
→ Incluye:
   - Link directo a Meta Developer Console
   - Paso a paso con capturas/screenshots
   - Botón "Continuar después de registrar"
```

#### Caso D: Usuario no especificó número
```
🔄 "Selecciona cómo proceder:"
→ Botón 1: "Tengo números registrados" → Inicia OAuth
→ Botón 2: "Registrar nuevo número" → Muestra instrucciones
```

---

## 💻 Implementación Técnica

### 1. Campo de número en el formulario
```jsx
<input
  type="tel"
  placeholder="+591 12345678"
  value={desiredPhoneNumber}
  onChange={(e) => setDesiredPhoneNumber(e.target.value)}
/>
```

### 2. Botón inteligente "Conectar con Meta"
```jsx
<button onClick={handleSmartConnect}>
  {desiredPhoneNumber 
    ? `Conectar con ${desiredPhoneNumber}`
    : 'Conectar con Meta'
  }
</button>
```

### 3. Función de verificación
```javascript
async function handleSmartConnect() {
  if (desiredPhoneNumber) {
    // Verificar si el número está registrado
    const isRegistered = await checkIfNumberRegistered(desiredPhoneNumber);
    
    if (isRegistered) {
      // Iniciar OAuth y pre-seleccionar ese número
      await startOAuthWithPreference(desiredPhoneNumber);
    } else {
      // Mostrar instrucciones para registrar ese número específico
      showRegistrationInstructions(desiredPhoneNumber);
    }
  } else {
    // Flujo normal: iniciar OAuth sin preferencia
    await startOAuth();
  }
}
```

### 4. Verificación de número registrado
```javascript
async function checkIfNumberRegistered(phoneNumber) {
  // Intentar OAuth primero
  // Luego verificar en la lista de números obtenidos
  const numbers = await getRegisteredPhoneNumbers();
  return numbers.some(n => 
    normalizePhoneNumber(n.phone_number) === normalizePhoneNumber(phoneNumber)
  );
}
```

---

## 🎨 Componentes a Crear

### 1. `PhoneNumberInput.jsx`
- Campo para ingresar número deseado
- Validación de formato
- Sugerencia de formato internacional

### 2. `NumberVerificationModal.jsx`
- Muestra estado del número
- Acciones según resultado
- Instrucciones personalizadas

### 3. `RegistrationGuide.jsx`
- Instrucciones paso a paso
- Específicas para el número ingresado
- Links directos a Meta Developer Console

---

## ✅ Ventajas de este Flujo

1. **Funcional**: El usuario puede especificar exactamente qué número quiere
2. **Inteligente**: El sistema verifica y adapta el flujo
3. **Guía clara**: Instrucciones específicas cuando se necesita
4. **Flexible**: Funciona con o sin número especificado
5. **Pre-selección**: Si el número está registrado, se selecciona automáticamente

---

## ⚠️ Limitación Técnica

**NO podemos verificar si un número está registrado SIN hacer OAuth primero.**

**Solución**: 
- Iniciar OAuth en segundo plano (sin mostrar popup al usuario)
- Verificar en la lista de números obtenidos
- Si está, continuar normalmente
- Si no está, cancelar OAuth y mostrar instrucciones

**Alternativa más simple**:
- Siempre iniciar OAuth
- Comparar número ingresado con números obtenidos
- Si coincide, pre-seleccionarlo
- Si no coincide, mostrar selector + opción de registrar

---

## 🚀 Implementación Recomendada

### Versión Simple (Más Rápida)
1. Campo opcional para número deseado
2. Iniciar OAuth normalmente
3. Al obtener números, comparar con el deseado
4. Si coincide → Pre-seleccionar
5. Si no coincide → Mostrar selector + instrucciones

### Versión Completa (Más Funcional)
1. Campo para número deseado
2. Botón "Verificar número"
3. Iniciar OAuth en background
4. Verificar número
5. Mostrar resultado y acciones según caso


