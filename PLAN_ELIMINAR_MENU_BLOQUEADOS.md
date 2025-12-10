# 📋 Plan de Eliminación: Menú Lateral "Contactos Bloqueados"

## 🎯 Objetivo

Eliminar el acceso al panel de "Contactos Bloqueados" desde el menú lateral, manteniendo solo el acceso desde el botón en Chat WhatsApp.

---

## 📍 Referencias Encontradas

1. **`src/App.jsx` línea 1944**: Botón en menú lateral
2. **`src/App.jsx` líneas 1352-1363**: Vista/ruta que renderiza el panel
3. **`src/App.jsx` línea 433**: Comentario con tipo de view

---

## 🔄 Fases de Eliminación

### **FASE 1: Identificar Referencias** ✅
- ✅ Buscar todas las referencias a `whatsapp-blocked`
- ✅ Identificar ubicaciones exactas
- ✅ Verificar que no hay otras referencias

### **FASE 2: Eliminar Botón del Menú Lateral**
- Eliminar línea 1944 en `App.jsx`
- Es el botón: `🚫 Contactos Bloqueados`

### **FASE 3: Eliminar Vista/Ruta**
- Eliminar líneas 1352-1363 en `App.jsx`
- Es la condición que renderiza `BlockedContactsPanel` cuando `view === 'whatsapp-blocked'`

### **FASE 4: Limpiar Comentarios**
- Actualizar comentario en línea 433
- Remover `'whatsapp-blocked'` del comentario de tipos de view

### **FASE 5: Verificación Final**
- Verificar que no hay referencias rotas
- Verificar que el botón en chat sigue funcionando
- Testing manual

---

## ⚠️ Notas Importantes

- ✅ El componente `BlockedContactsPanel` NO se elimina (se usa en el modal)
- ✅ El botón en Chat WhatsApp NO se toca
- ✅ Solo se elimina el acceso desde menú lateral

---

## ✅ Resultado Esperado

Después de la eliminación:
- ✅ No habrá botón "Contactos Bloqueados" en el menú lateral
- ✅ Solo se accederá desde el botón 🚫 en Chat WhatsApp
- ✅ No habrá errores ni referencias rotas



