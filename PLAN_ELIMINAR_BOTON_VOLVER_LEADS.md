# 📋 Plan de Eliminación: Botón "Volver a Leads"

## 🎯 Objetivo

Eliminar el botón "Volver a Leads" y usar solo el tab "Leads" del header para navegación.

---

## 📍 Referencias Encontradas

1. **`src/components/whatsapp/CRM.jsx` líneas 70-79**: Botón "Volver a Leads" dentro de la vista de Secuencias

---

## 🔄 Fases de Eliminación

### **FASE 1: Identificar Referencias** ✅
- ✅ Buscar todas las referencias a "Volver a Leads"
- ✅ Identificar ubicación exacta
- ✅ Verificar que no hay otras referencias

### **FASE 2: Eliminar el Botón**
- Eliminar líneas 70-79 en `CRM.jsx`
- Es el div y botón completo:
  ```jsx
  {/* Botón para volver a Leads */}
  <div className="border-b border-neutral-800 bg-[#0f171e] px-6 py-3">
    <button ...>
      Volver a Leads
    </button>
  </div>
  ```

### **FASE 3: Verificar Funcionalidad**
- Verificar que el tab "Leads" del header sigue funcionando
- Verificar que la navegación funciona correctamente
- Verificar que no hay errores

### **FASE 4: Testing Final**
- Verificar que no hay referencias rotas
- Verificar que la navegación funciona
- Verificar que el tab del header es suficiente

---

## ⚠️ Notas Importantes

- ✅ El tab "Leads" del header seguirá funcionando normalmente
- ✅ La funcionalidad de navegación se mantiene
- ✅ Solo se elimina el botón redundante

---

## ✅ Resultado Esperado

Después de la eliminación:
- ✅ No habrá botón "Volver a Leads"
- ✅ Solo se usará el tab "Leads" del header para navegar
- ✅ La navegación funcionará correctamente
- ✅ Código más limpio y sin redundancia



