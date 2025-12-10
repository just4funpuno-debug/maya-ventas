# 📋 Plan de Implementación: Ajuste de Stock (Sumar Cantidad)

## 🎯 Objetivo

Agregar un cuadro en el menú "Almacen Central" que permita:
- Seleccionar un producto existente
- Ingresar una cantidad
- Sumar esa cantidad al stock principal del producto

## ✅ Confirmación: Es Posible

**Sí, es totalmente posible** y se puede implementar de forma segura por fases.

## 📊 Fases de Implementación

### FASE 1: Crear Cuadro UI (Sin Funcionalidad)
**Objetivo**: Agregar la interfaz visual sin lógica de actualización

**Cambios**:
- Agregar nuevo cuadro en `ProductsView`
- Selector de productos (dropdown)
- Campo de cantidad (input numérico)
- Botón "Sumar al Stock" (deshabilitado inicialmente)

**Riesgo**: ⚠️ Bajo - Solo UI, no afecta funcionalidad existente

**Testing**:
- [ ] El cuadro se muestra correctamente
- [ ] El selector muestra todos los productos
- [ ] El campo de cantidad acepta números
- [ ] El botón está deshabilitado (por ahora)

---

### FASE 2: Implementar Lógica de Actualización
**Objetivo**: Agregar la funcionalidad de sumar al stock

**Cambios**:
- Función `sumarStock` que:
  - Obtiene el stock actual del producto
  - Suma la cantidad ingresada
  - Actualiza en `almacen_central`
  - Actualiza el estado local (optimista)
- Manejo de errores con reversión
- Validaciones (cantidad > 0, producto seleccionado)

**Riesgo**: ⚠️ Medio - Modifica stock, pero con validaciones

**Testing**:
- [ ] Seleccionar producto y cantidad
- [ ] Hacer clic en "Sumar al Stock"
- [ ] Verificar que el stock se actualiza en la BD
- [ ] Verificar que el stock se actualiza en la UI inmediatamente
- [ ] Verificar que funciona con números negativos (o validar que no se permiten)
- [ ] Verificar manejo de errores

---

### FASE 3: Mejoras y Validaciones
**Objetivo**: Agregar validaciones y mejoras de UX

**Cambios**:
- Validar que cantidad > 0
- Validar que producto esté seleccionado
- Mensaje de confirmación o éxito
- Limpiar formulario después de sumar
- Opcional: Historial de ajustes

**Riesgo**: ⚠️ Bajo - Solo mejoras, funcionalidad ya funciona

**Testing**:
- [ ] Validaciones funcionan correctamente
- [ ] Mensajes de éxito/error se muestran
- [ ] Formulario se limpia después de sumar
- [ ] UX es clara y fácil de usar

---

## 🎨 Diseño Propuesto

```
┌─────────────────────────────────────┐
│  AJUSTE DE STOCK                    │
├─────────────────────────────────────┤
│  Producto: [Selector ▼]            │
│  Cantidad:  [____]                  │
│  [Stock actual: 100]                │
│  [Nuevo stock: 150] (preview)      │
│                                     │
│  [Sumar al Stock]                  │
└─────────────────────────────────────┘
```

## 📝 Consideraciones

### Validaciones Necesarias
- ✅ Producto debe estar seleccionado
- ✅ Cantidad debe ser > 0
- ✅ Cantidad debe ser un número válido
- ⚠️ Opcional: Permitir números negativos para restar stock?

### Actualización Optimista
- Actualizar UI inmediatamente
- Revertir si falla la actualización en BD

### Manejo de Errores
- Mostrar mensaje si falla
- Revertir cambios locales
- Log de errores en consola

## 🔄 Flujo de Funcionamiento

1. Usuario selecciona producto del dropdown
2. Usuario ingresa cantidad a sumar
3. Sistema muestra preview del nuevo stock
4. Usuario hace clic en "Sumar al Stock"
5. Sistema actualiza stock en BD (optimista)
6. Sistema actualiza UI inmediatamente
7. Sistema muestra mensaje de éxito
8. Sistema limpia formulario

## ⚠️ Decisiones a Tomar

1. **¿Permitir números negativos?**
   - Si: Permite restar stock también
   - No: Solo permite sumar (más seguro)

2. **¿Mostrar historial de ajustes?**
   - Si: Más complejo, requiere tabla adicional
   - No: Más simple, solo ajuste directo

3. **¿Ubicación del cuadro?**
   - Opción A: Al lado del formulario de crear producto
   - Opción B: Debajo del formulario de crear producto
   - Opción C: En una sección separada

## ✅ Ventajas de Implementación por Fases

1. **Control**: Cada fase se puede probar independientemente
2. **Reversión**: Si algo falla, solo se revierte la fase actual
3. **Testing**: Testing incremental más fácil
4. **Riesgo**: Riesgo mínimo en cada fase

## 🚀 ¿Empezamos con FASE 1?

¿Quieres que comience con la FASE 1 (solo UI) para que puedas ver cómo se verá antes de agregar la funcionalidad?


