# 📖 Guía de Uso - CRM de Leads

## 🎯 Introducción

El CRM de Leads te permite gestionar y hacer seguimiento a tus leads de WhatsApp de manera organizada, similar a herramientas como Kommo o HubSpot.

---

## 🚀 Acceso al CRM

1. **Navegar al menú "CRM"**
   - En el sidebar, busca el menú "📋 CRM"
   - Solo visible para administradores
   - Click para abrir

2. **Tabs disponibles**
   - **Leads:** Gestión de leads con vista Kanban
   - **Secuencias:** Gestión de secuencias de mensajes (funcionalidad existente)

---

## 📊 Vista Kanban de Leads

### Métricas Principales

En la parte superior verás 4 tarjetas con métricas:

- **Total Leads:** Cantidad total de leads (activos + ganados + perdidos)
- **Ganados:** Cantidad de leads convertidos en ventas (con tasa de conversión)
- **Valor Total:** Suma de todos los valores estimados de los leads
- **Score Promedio:** Promedio del lead score de todos los leads

### Columnas del Pipeline

Cada columna representa una etapa del proceso de ventas:

- **Leads Entrantes:** Nuevos leads que acaban de llegar
- **Seguimiento:** Leads en proceso de seguimiento
- **Venta:** Leads listos para cerrar venta
- **Cliente:** Leads convertidos en clientes

### Tarjetas de Lead

Cada tarjeta muestra:
- Nombre del contacto
- Teléfono
- Valor estimado (si tiene)
- Última actividad
- Lead Score (barra de progreso)

---

## 🎯 Crear un Lead

### Desde el CRM

1. Click en botón **"Crear Lead"** (naranja, arriba a la derecha)
2. **Buscar contacto:**
   - Escribe nombre o teléfono en el buscador
   - Selecciona el contacto de la lista
3. **Seleccionar cuenta WhatsApp**
4. **Completar información:**
   - Valor estimado (opcional)
   - Lead Score 0-100 (opcional)
   - Notas (opcional)
5. Click en **"Crear Lead"**

### Desde Chat WhatsApp

1. Abre el chat con el contacto
2. En el header del chat, busca el icono **"+"** (UserPlus)
3. Click en el icono
4. El modal se abre con:
   - Contacto pre-seleccionado
   - Cuenta pre-seleccionada
   - Producto pre-seleccionado
5. Completa los datos y crea el lead

---

## 🔄 Mover Leads entre Etapas

### Drag & Drop

1. **Arrastra** una tarjeta de lead
2. **Suelta** en la columna de la nueva etapa
3. El lead se moverá automáticamente
4. Se creará una actividad registrando el cambio

### Ver Detalle del Lead

1. **Click** en cualquier tarjeta de lead
2. Se abre el modal de detalle con:
   - Información del contacto
   - Información del lead (editable)
   - Historial de ventas
   - Actividades

---

## ✏️ Editar Lead

1. Abre el modal de detalle (click en tarjeta)
2. Click en botón **"Editar"**
3. Modifica:
   - Valor estimado
   - Lead Score
   - Notas
4. Click en **"Guardar"**

---

## 📝 Agregar Actividades

1. En el modal de detalle, sección **"Actividades"**
2. Click en **"Agregar Actividad"**
3. Selecciona tipo:
   - Nota
   - Mensaje
   - Llamada
   - Tarea
   - Reunión
4. Escribe el contenido
5. Click en **"Agregar"**

---

## ⚙️ Configurar Pipeline

### Editar Etapas

1. Click en botón **"Pipeline"** (gris, arriba a la derecha)
2. En la lista de etapas, click en **"Editar"**
3. Modifica:
   - Nombre de la etapa
   - Color (selector o colores predefinidos)
4. Los cambios se guardan automáticamente

### Agregar Etapa

1. Abre el configurador de pipeline
2. En la sección **"Agregar Nueva Etapa"**
3. Escribe el nombre
4. Selecciona un color
5. Click en **"Agregar Etapa"**

### Eliminar Etapa

1. Abre el configurador de pipeline
2. Click en botón **"Eliminar"** (rojo) de la etapa
3. Confirma la eliminación
4. **Nota:** No se puede eliminar si solo queda 1 etapa

### Reordenar Etapas

1. Abre el configurador de pipeline
2. Usa los botones **↑ ↓** para mover etapas
3. El orden se actualiza automáticamente

### Restaurar por Defecto

1. Abre el configurador de pipeline
2. Click en **"Restaurar por Defecto"**
3. Confirma
4. Se restauran las 4 etapas estándar:
   - Leads Entrantes
   - Seguimiento
   - Venta
   - Cliente

---

## 📦 Integración con Ventas

### Ver Historial de Ventas

1. Abre el modal de detalle de un lead
2. Busca la sección **"Historial de Ventas"**
3. Verás:
   - Todas las ventas del contacto
   - Total de ventas reales (verde)
   - Comparación con valor estimado (naranja)

---

## 🔍 Filtrado por Productos

### Tabs de Productos

- En la parte superior del CRM verás tabs por cada producto
- **Admins:** Ven todos los productos + tab "Todos"
- **Usuarios:** Solo ven sus productos asignados

### Cambiar Producto

1. Click en el tab del producto deseado
2. Los leads se filtran automáticamente
3. Las métricas se actualizan por producto

---

## 💡 Consejos y Mejores Prácticas

### Lead Score

- **0-30:** Lead frío, necesita más información
- **31-60:** Lead tibio, en seguimiento
- **61-80:** Lead caliente, listo para cerrar
- **81-100:** Lead muy caliente, prioridad alta

### Actividades

- Registra todas las interacciones importantes
- Usa notas para recordatorios
- Las actividades se ordenan por fecha (más recientes primero)

### Pipeline

- Personaliza las etapas según tu proceso de ventas
- Usa colores para identificar rápidamente las etapas
- Mantén el pipeline simple (4-6 etapas recomendado)

---

## ❓ Preguntas Frecuentes

### ¿Puedo tener múltiples leads para el mismo contacto?

No, cada contacto solo puede tener un lead activo por producto. Si intentas crear otro, verás un warning.

### ¿Qué pasa si elimino una etapa que tiene leads?

Los leads que estaban en esa etapa quedarán con un nombre de etapa que ya no existe. Deberás moverlos manualmente a otra etapa.

### ¿Cómo se calcula la tasa de conversión?

Tasa = (Leads Ganados / Total Leads) × 100

### ¿Puedo ver leads de todos los productos a la vez?

Solo los administradores pueden ver el tab "Todos" que muestra leads de todos los productos.

---

**Fecha:** 2025-01-30

