# 🔍 Análisis: Cambiar "Secuencia" por "Flujo", "Bot" o "Sales-Bot"

## 📋 Solicitud del Usuario

Cambiar el término "secuencia" por algo más intuitivo:
- Opción 1: **"Flujo"**
- Opción 2: **"Bot"**
- Opción 3: **"Sales-Bot"**
- O recomendar otro nombre

---

## 🔍 Análisis de Referencias

### **Referencias Encontradas:**

#### **Textos Visibles al Usuario** (DEBEN CAMBIAR):
1. **Botones:**
   - "Secuencias" (botón en LeadsKanban)
   - "Ver secuencias de este producto" (tooltip)

2. **Etiquetas y Títulos:**
   - "Secuencia Automática" (LeadDetailModal)
   - "Secuencia Automática (Opcional)" (PipelineConfigurator)
   - "Sin secuencia" (opción en selector)
   - "Cargando secuencias..." 
   - "No hay secuencias disponibles"

3. **Mensajes:**
   - "Secuencia iniciada automáticamente"
   - "Asignar Secuencia"
   - "Pausar Secuencia"
   - "Detener Secuencia"

4. **Archivos de Componentes:**
   - `SequenceConfigurator.jsx` (nombre del componente)
   - `SequenceMessageEditor.jsx`
   - `SequenceMessageForm.jsx`

#### **Nombres Técnicos** (OPCIONAL - Mantener o Cambiar):
- Funciones: `getSequences()`, `assignSequenceToLead()`, etc.
- Variables: `sequence_id`, `availableSequences`, etc.
- Servicios: `sequences.js`, `sequence-engine.js`, etc.

#### **Base de Datos** (NO CAMBIAR):
- Tabla: `whatsapp_sequences`
- Campos: `sequence_id`, `sequence_active`, `sequence_position`, etc.

---

## 💡 Análisis de Opciones

### **OPCIÓN 1: "Flujo"** ⭐⭐⭐ (RECOMENDADA)

**Ventajas:**
- ✅ Muy intuitivo en español
- ✅ Describe bien lo que hace (flujo de mensajes)
- ✅ Común en marketing/CRM (ej: "Sales Flow", "Customer Flow")
- ✅ Más corto que "Sales-Bot"
- ✅ Suena profesional

**Desventajas:**
- ⚠️ Puede confundirse con "flujo de trabajo" (workflow)
- ⚠️ Menos técnico que "bot"

**Ejemplos de uso:**
- "Flujo Automático"
- "Asignar Flujo"
- "Flujo de Mensajes"
- "Configurar Flujo"

---

### **OPCIÓN 2: "Bot"** ⭐⭐

**Ventajas:**
- ✅ Muy corto y directo
- ✅ Técnicamente preciso (es un bot automatizado)
- ✅ Moderno y tecnológico

**Desventajas:**
- ⚠️ Puede sonar muy técnico para usuarios no técnicos
- ⚠️ "Bot" en español puede no ser tan intuitivo
- ⚠️ Menos descriptivo

**Ejemplos de uso:**
- "Bot Automático"
- "Asignar Bot"
- "Bot de Mensajes"

---

### **OPCIÓN 3: "Sales-Bot"** ⭐

**Ventajas:**
- ✅ Muy descriptivo (indica que es para ventas)
- ✅ En inglés suena profesional

**Desventajas:**
- ⚠️ Muy largo para botones y etiquetas
- ⚠️ Mezcla idiomas (no es consistente con el resto)
- ⚠️ Puede ser confuso en español

**Ejemplos de uso:**
- "Sales-Bot Automático" (muy largo)
- "Asignar Sales-Bot"

---

### **OPCIÓN 4: "Automatización"** ⭐⭐

**Ventajas:**
- ✅ Muy descriptivo
- ✅ Profesional en español
- ✅ Claro para todos los usuarios

**Desventajas:**
- ⚠️ Muy largo para botones
- ⚠️ Más genérico

**Ejemplos de uso:**
- "Automatización de Mensajes"
- "Asignar Automatización"

---

## 🎯 Recomendación Final

### **RECOMENDACIÓN: "FLUJO"** ⭐⭐⭐

**Razones:**
1. ✅ **Más intuitivo** - Todos entienden "flujo de mensajes"
2. ✅ **Corto y claro** - Cabe bien en botones y etiquetas
3. ✅ **Profesional** - Común en CRM y marketing
4. ✅ **En español** - Consistente con el resto de la interfaz
5. ✅ **Descriptivo** - Indica claramente qué es

**Ejemplos Visuales:**
```
Botón: "Flujos" (en lugar de "Secuencias")
Etiqueta: "Flujo Automático" (en lugar de "Secuencia Automática")
Selector: "Sin flujo" (en lugar de "Sin secuencia")
```

---

## 📝 Plan de Cambio

### **Estrategia Recomendada:**

#### **Nivel 1: Textos Visibles** (CAMBiar a "Flujo")
- ✅ Botones y etiquetas en UI
- ✅ Títulos y mensajes
- ✅ Tooltips y placeholders
- ✅ Nombres de componentes visibles

#### **Nivel 2: Nombres Técnicos** (OPCIONAL)
- ⚠️ Funciones y variables (mantener "sequence" o cambiar a "flow")
- ⚠️ Servicios (mantener nombres técnicos o cambiar)

#### **Nivel 3: Base de Datos** (NO CAMBIAR)
- ❌ Tabla `whatsapp_sequences` (mantener)
- ❌ Campos `sequence_id` (mantener)
- ✅ Solo cambiar textos visibles

---

## 📊 Impacto del Cambio

### **Archivos a Modificar (Textos Visibles):**

1. **Componentes:**
   - `LeadsKanban.jsx` - Botón "Secuencias"
   - `LeadDetailModal.jsx` - "Secuencia Automática"
   - `PipelineConfigurator.jsx` - "Secuencia Automática"
   - `SequenceConfigurator.jsx` - Títulos y etiquetas

2. **Otros:**
   - Mensajes de toast
   - Tooltips
   - Placeholders

### **Archivos Técnicos (OPCIONAL):**
- Servicios: `sequences.js` (solo comentarios)
- Funciones: Solo comentarios y mensajes

### **Base de Datos:**
- ❌ NO cambiar (estructura actual funciona)

---

## ⏱️ Estimación

**Cambio Solo Textos Visibles:**
- ~15-20 archivos
- ~50-70 referencias visibles
- Tiempo: ~1-2 horas

**Cambio Completo (Incluyendo Técnicos):**
- ~30-40 archivos
- ~300+ referencias
- Tiempo: ~4-6 horas
- Riesgo: Más probabilidad de errores

---

## ✅ Recomendación Final

**Cambiar SOLO textos visibles a "Flujo":**
- ✅ Rápido y seguro
- ✅ Usuario ve "Flujo" en toda la UI
- ✅ Código técnico mantiene consistencia
- ✅ Base de datos intacta

---

**⏳ ¿Qué opción prefieres?**

1. ✅ **"Flujo"** (recomendado)
2. ⚠️ **"Bot"**
3. ⚠️ **"Sales-Bot"**
4. 💡 **Otro nombre**

¿Cambiamos solo textos visibles o también nombres técnicos?



