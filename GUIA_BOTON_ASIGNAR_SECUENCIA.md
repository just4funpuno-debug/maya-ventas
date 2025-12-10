# 📍 Guía Detallada: Dónde Ver el Botón "Asignar Secuencia"

## 🎯 Ubicación Exacta del Botón

### **PASO 1: Abrir el Modal del Lead**

1. Ve al **CRM** en el menú lateral
2. Haz clic en la pestaña **"Leads"**
3. Selecciona un **producto** (ej: CARDIO PLUS)
4. En el **Kanban**, haz clic en cualquier **tarjeta de lead** (cualquier lead de cualquier columna)

✅ **Resultado:** Se abrirá un modal grande con el detalle del lead

---

### **PASO 2: Ubicación en el Modal**

Una vez abierto el modal, verás esta estructura de arriba hacia abajo:

```
┌─────────────────────────────────────────┐
│  [Header: "Detalle del Lead"]          │
│  [Botones: Editar | X cerrar]          │
├─────────────────────────────────────────┤
│                                         │
│  1️⃣ INFORMACIÓN DEL CONTACTO           │
│     - Nombre                            │
│     - Teléfono                          │
│                                         │
│  2️⃣ INFORMACIÓN DEL LEAD               │
│     - Valor Estimado                    │
│     - Lead Score                        │
│     - Etapa Actual                      │
│     - Notas                             │
│     - Fechas (Creado, Última Actividad)│
│                                         │
│  ⚡ 3️⃣ SECUENCIA AUTOMÁTICA ⚡         │  ← AQUÍ ESTÁ LA SECCIÓN
│     ┌───────────────────────────────┐   │
│     │  [Icono rayo naranja]         │   │
│     │  "No hay secuencia asignada..."│   │
│     │                                │   │
│     │  [BOTÓN NARANJA GRANDE]       │   │  ← AQUÍ DEBERÍAS VER EL BOTÓN
│     │  ⚡ Asignar Secuencia         │   │
│     └───────────────────────────────┘   │
│                                         │
│  4️⃣ HISTORIAL DE VENTAS                │
│                                         │
│  5️⃣ ACTIVIDADES                        │
│                                         │
└─────────────────────────────────────────┘
```

---

## 📍 Descripción Visual Detallada

### **Sección "Secuencia Automática"**

La sección se encuentra **INMEDIATAMENTE DESPUÉS** de:
- ✅ "Información del Lead" (con Valor Estimado, Lead Score, Etapa, Notas, Fechas)

Y **ANTES** de:
- ✅ "Historial de Ventas"

---

### **Aspecto de la Sección (cuando NO hay secuencia)**

```
┌─────────────────────────────────────────────────────┐
│  ⚡ Secuencia Automática                            │  ← Título con icono rayo naranja
├─────────────────────────────────────────────────────┤
│                                                     │
│  No hay secuencia asignada. Asigna una para        │
│  enviar mensajes automáticos.                      │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │                                             │   │
│  │    ⚡  Asignar Secuencia                   │   │  ← BOTÓN NARANJA
│  │                                             │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Características del botón:**
- 🟠 **Color:** Naranja (`#e7922b`)
- 📏 **Tamaño:** Ancho completo del contenedor
- 🔘 **Texto:** "Asignar Secuencia" con icono de rayo (⚡)
- 📐 **Posición:** Centrado dentro de una caja con fondo oscuro y borde

---

## 🔄 Qué Debería Suceder Paso a Paso

### **ESCENARIO 1: Lead SIN Secuencia Asignada**

#### **Estado Inicial:**
1. Abres el modal del lead
2. Ves la sección "Secuencia Automática"
3. Aparece el mensaje: "No hay secuencia asignada..."
4. **DEBERÍAS VER:** El botón naranja "Asignar Secuencia"

#### **Al hacer clic en "Asignar Secuencia":**

**Paso 1:** Clic en el botón
```
┌─────────────────────────────────────────┐
│  ⚡ Asignar Secuencia  [CLIC]          │
└─────────────────────────────────────────┘
```

**Paso 2:** Se abre el selector de secuencias
```
┌─────────────────────────────────────────┐
│  Seleccionar secuencia:      [Cancelar] │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  📋 Secuencia de Bienvenida       │ │
│  │     5 mensajes                    │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  📋 Seguimiento Inicial           │ │
│  │     3 mensajes                    │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Paso 3:** Seleccionas una secuencia
- Aparece un spinner de carga
- Se asigna la secuencia
- Aparece notificación: "Secuencia asignada correctamente"

**Paso 4:** La sección se actualiza mostrando:
- ✅ Nombre de la secuencia
- ✅ Progreso: "Mensaje 1 de 5"
- ✅ Fecha de inicio
- ✅ Badge: "Activa" (verde)
- ✅ Barra de progreso visual
- ✅ Botones: "Pausar" y "Detener"

---

### **ESCENARIO 2: Lead CON Secuencia Asignada**

Cuando el lead YA tiene una secuencia asignada, verás:

```
┌─────────────────────────────────────────┐
│  ⚡ Secuencia Automática                │
├─────────────────────────────────────────┤
│                                         │
│  Secuencia de Bienvenida    [Activa]   │  ← Badge verde
│  Mensaje 1 de 5 · Iniciada 30 ene...   │
│                                         │
│  ▓▓▓▓▓▓░░░░░░░░░░░░░░░░  20%          │  ← Barra progreso
│                                         │
│  [Pausar]          [Detener]           │  ← Botones de control
│                                         │
└─────────────────────────────────────────┘
```

**NO verás el botón "Asignar Secuencia"** porque ya hay una asignada.

---

## 🔍 Si NO Ves el Botón: Checklist de Verificación

### **1. ¿Ves el título "Secuencia Automática"?**
- ✅ **SÍ** → Continúa al paso 2
- ❌ **NO** → Hay un error. Revisa la consola del navegador (F12)

### **2. ¿Qué aparece dentro de la sección?**

**Opción A:** Ves "Cargando información de secuencia..."
- ⏳ **Espera** unos segundos
- El botón debería aparecer después

**Opción B:** Ves "No hay secuencia asignada..." pero NO el botón
- ❌ **ERROR:** Revisa la consola (F12) para ver errores

**Opción C:** No ves nada
- ❌ **ERROR:** La sección no se está renderizando

### **3. Revisa la Consola del Navegador**

1. Presiona **F12** (o clic derecho → Inspeccionar)
2. Ve a la pestaña **"Console"**
3. Busca errores en **rojo**
4. Comparte esos errores para solucionarlo

---

## 🎨 Características Visuales del Botón

### **Cuando está Visible:**
- **Color de fondo:** Naranja (`#e7922b`)
- **Color al hover:** Naranja más oscuro (`#d6821b`)
- **Color del texto:** Blanco
- **Icono:** Rayo (⚡) de color blanco
- **Tamaño del texto:** `text-sm`
- **Peso de fuente:** `font-medium`
- **Bordes:** Redondeados (`rounded-lg`)
- **Ancho:** Completo (`w-full`)

### **Ubicación CSS:**
- Dentro de un `div` con clase `bg-[#0f171e] border border-neutral-800 rounded-lg p-4`
- Espaciado: `space-y-3` (espaciado vertical)
- Padding interno: `px-4 py-2`

---

## 🚨 Problemas Comunes y Soluciones

### **Problema 1: No veo la sección completa**
**Causa:** Error de JavaScript que rompe el renderizado
**Solución:** Revisa la consola (F12) y busca errores

### **Problema 2: Veo la sección pero está vacía**
**Causa:** El estado no se está inicializando correctamente
**Solución:** Recarga la página y vuelve a abrir el modal

### **Problema 3: Veo "Cargando..." indefinidamente**
**Causa:** La función `loadLeadSequence()` tiene un error
**Solución:** Revisa la consola para ver el error específico

### **Problema 4: El botón no hace nada al hacer clic**
**Causa:** Error en la función `handleAssignSequence()`
**Solución:** Revisa la consola cuando haces clic

---

## ✅ Pasos de Verificación Rápida

1. **Abrir modal:** Haz clic en cualquier lead del Kanban
2. **Scroll hacia abajo:** Busca después de "Información del Lead"
3. **Buscar título:** "⚡ Secuencia Automática"
4. **Ver contenido:** 
   - Si no hay secuencia → Debe aparecer botón naranja
   - Si hay secuencia → Debe aparecer info de la secuencia

---

## 📸 Descripción Textual del Flujo Completo

```
┌─────────────────────────────────────────────────┐
│  MODAL: DETALLE DEL LEAD                        │
├─────────────────────────────────────────────────┤
│                                                 │
│  📋 Información del Contacto                    │
│     Juan Pérez | +52 123 456 7890              │
│                                                 │
│  📊 Información del Lead                        │
│     Valor: $5,000                               │
│     Score: 75/100                               │
│     Etapa: Seguimiento                          │
│     Notas: Cliente interesado...                │
│                                                 │
│  ⚡ Secuencia Automática  ← AQUÍ                │
│  ┌───────────────────────────────────────────┐  │
│  │                                           │  │
│  │  No hay secuencia asignada. Asigna una   │  │
│  │  para enviar mensajes automáticos.       │  │
│  │                                           │  │
│  │  ┌─────────────────────────────────────┐ │  │
│  │  │                                     │ │  │
│  │  │    ⚡  Asignar Secuencia           │ │  │ ← BOTÓN
│  │  │                                     │ │  │
│  │  └─────────────────────────────────────┘ │  │
│  │                                           │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  📦 Historial de Ventas                         │
│                                                 │
│  📝 Actividades                                 │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 🎯 Resumen

**¿Dónde verlo?**
- En el modal de detalle del lead
- Después de "Información del Lead"
- Antes de "Historial de Ventas"

**¿Cómo se ve?**
- Título: "⚡ Secuencia Automática" (naranja)
- Mensaje: "No hay secuencia asignada..."
- Botón grande naranja: "⚡ Asignar Secuencia"

**¿Qué pasa al hacer clic?**
- Se abre un selector con las secuencias disponibles
- Seleccionas una
- Se asigna y la sección se actualiza

---

**Si aún no lo ves, revisa la consola del navegador (F12) y comparte los errores que aparezcan.** 🔍



