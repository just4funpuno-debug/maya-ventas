# ✅ Checklist de Verificación: Sistema de Etiquetas

## 🎯 Objetivo

Verificar que todas las funcionalidades del sistema de etiquetas estén funcionando correctamente antes de considerar la implementación completa.

---

## 📋 Checklist de Funcionalidades

### 1. Crear Etiquetas

#### 1.1 Desde el Filtro de Conversaciones
- [ ] Abrir menú "Chat WhatsApp"
- [ ] Hacer clic en botón "Etiquetas" debajo del buscador
- [ ] Hacer clic en "Añadir etiqueta"
- [ ] Completar formulario:
  - [ ] Nombre: "Cliente VIP"
  - [ ] Color: Seleccionar de la paleta
- [ ] Hacer clic en "Guardar"
- [ ] Verificar que la etiqueta aparece en el menú desplegable
- [ ] Verificar que la etiqueta tiene el color seleccionado

#### 1.2 Desde el Modal de Gestión
- [ ] Abrir una conversación con un contacto
- [ ] Hacer clic en botón de etiquetas (🏷️) en el header
- [ ] Hacer clic en "Nueva Etiqueta"
- [ ] Completar formulario:
  - [ ] Nombre: "Pendiente"
  - [ ] Color: Escribir código hexadecimal (#ff0000)
- [ ] Hacer clic en "Crear Etiqueta"
- [ ] Verificar que la etiqueta aparece en la lista

#### 1.3 Validaciones
- [ ] Intentar crear etiqueta sin nombre → Debe mostrar error
- [ ] Intentar crear etiqueta con nombre > 50 caracteres → Debe mostrar error
- [ ] Intentar crear etiqueta con color inválido → Debe mostrar error
- [ ] Intentar crear etiqueta duplicada → Debe mostrar error "Ya existe una etiqueta con ese nombre"

---

### 2. Asignar Etiquetas a Contactos

#### 2.1 Desde el Modal del Chat
- [ ] Abrir conversación con un contacto
- [ ] Hacer clic en botón de etiquetas (🏷️) en el header
- [ ] Ver sección "Etiquetas del Contacto"
- [ ] Hacer clic en una etiqueta sin asignar
- [ ] Verificar que la etiqueta cambia a estado "asignada" (fondo naranja + checkmark)
- [ ] Verificar que aparece un toast de éxito
- [ ] Cerrar el modal
- [ ] Verificar que la etiqueta aparece en el header del chat

#### 2.2 Múltiples Etiquetas
- [ ] Asignar 2-3 etiquetas al mismo contacto
- [ ] Verificar que todas aparecen en el header
- [ ] Verificar que si hay más de 3, aparece contador "+N"

#### 2.3 Quitar Etiquetas
- [ ] Abrir modal de etiquetas
- [ ] Hacer clic en una etiqueta asignada (con checkmark)
- [ ] Verificar que la etiqueta cambia a estado "no asignada"
- [ ] Verificar que desaparece del header del chat

---

### 3. Ver Etiquetas

#### 3.1 En el Header del Chat
- [ ] Abrir conversación con contacto que tiene etiquetas
- [ ] Verificar que las etiquetas aparecen como badges debajo del nombre
- [ ] Verificar que los badges tienen el color correcto
- [ ] Verificar que se muestran hasta 3 etiquetas
- [ ] Si hay más de 3, verificar que aparece contador "+N"

#### 3.2 En la Lista de Conversaciones
- [ ] Verificar que cada conversación muestra etiquetas asignadas
- [ ] Verificar que se muestran hasta 2 etiquetas por conversación
- [ ] Si hay más de 2, verificar que aparece contador "+N"
- [ ] Verificar que los badges tienen el color correcto

---

### 4. Filtrar Conversaciones por Etiquetas

#### 4.1 Filtrar por una Etiqueta
- [ ] Abrir menú de etiquetas (botón "Etiquetas")
- [ ] Seleccionar una etiqueta del menú
- [ ] Verificar que la lista de conversaciones se filtra
- [ ] Verificar que solo aparecen contactos con esa etiqueta
- [ ] Verificar que el botón muestra contador "1"

#### 4.2 Filtrar por Múltiples Etiquetas (AND)
- [ ] Seleccionar 2 etiquetas diferentes
- [ ] Verificar que solo aparecen contactos que tienen AMBAS etiquetas
- [ ] Verificar que el botón muestra contador "2"
- [ ] Deseleccionar una etiqueta
- [ ] Verificar que la lista se actualiza

#### 4.3 Limpiar Filtros
- [ ] Con filtros activos, hacer clic en "Limpiar filtros (N)"
- [ ] Verificar que todas las conversaciones vuelven a aparecer
- [ ] Verificar que el contador desaparece

#### 4.4 Combinar con Búsqueda
- [ ] Seleccionar una etiqueta
- [ ] Escribir texto en el buscador (ej: "Juan")
- [ ] Verificar que solo aparecen contactos que:
  - Tienen la etiqueta seleccionada **Y**
  - Coinciden con el texto de búsqueda

---

### 5. Editar Etiquetas

#### 5.1 Editar Nombre
- [ ] Abrir modal de gestión de etiquetas
- [ ] Hacer clic en botón de editar (✏️) de una etiqueta
- [ ] Cambiar el nombre
- [ ] Hacer clic en "Actualizar Etiqueta"
- [ ] Verificar que el nombre se actualiza en la lista
- [ ] Verificar que se actualiza en todos los contactos que la tienen

#### 5.2 Editar Color
- [ ] Abrir modal de gestión de etiquetas
- [ ] Hacer clic en botón de editar (✏️) de una etiqueta
- [ ] Cambiar el color
- [ ] Hacer clic en "Actualizar Etiqueta"
- [ ] Verificar que el color se actualiza en la lista
- [ ] Verificar que se actualiza en todos los badges

---

### 6. Eliminar Etiquetas

#### 6.1 Eliminar Etiqueta
- [ ] Abrir modal de gestión de etiquetas
- [ ] Hacer clic en botón de eliminar (🗑️) de una etiqueta
- [ ] Verificar que aparece modal de confirmación
- [ ] Confirmar eliminación
- [ ] Verificar que la etiqueta desaparece de la lista
- [ ] Verificar que desaparece de todos los contactos que la tenían

#### 6.2 Validación de Eliminación
- [ ] Intentar eliminar una etiqueta asignada a múltiples contactos
- [ ] Verificar que se elimina correctamente de todos
- [ ] Verificar que los badges desaparecen de los headers

---

### 7. Rendimiento y UX

#### 7.1 Carga de Etiquetas
- [ ] Abrir conversación → Verificar que las etiquetas cargan rápidamente
- [ ] Abrir lista de conversaciones → Verificar que las etiquetas cargan sin demora
- [ ] Filtrar por etiquetas → Verificar que el filtrado es instantáneo

#### 7.2 Actualización en Tiempo Real
- [ ] Asignar etiqueta desde el modal
- [ ] Verificar que aparece inmediatamente en el header
- [ ] Verificar que aparece inmediatamente en la lista de conversaciones

#### 7.3 Responsive Design
- [ ] Verificar que los badges se muestran correctamente en móvil
- [ ] Verificar que el modal es responsive
- [ ] Verificar que el filtro funciona en móvil

---

### 8. Casos Edge

#### 8.1 Sin Etiquetas
- [ ] Crear cuenta nueva sin etiquetas
- [ ] Verificar que el mensaje "No hay etiquetas creadas" aparece correctamente
- [ ] Verificar que no hay errores en consola

#### 8.2 Contacto sin Etiquetas
- [ ] Abrir conversación con contacto sin etiquetas
- [ ] Verificar que no aparecen badges en el header
- [ ] Verificar que no hay errores en consola

#### 8.3 Muchas Etiquetas
- [ ] Crear 10+ etiquetas
- [ ] Asignar 5+ etiquetas a un contacto
- [ ] Verificar que el header muestra correctamente (3 + contador)
- [ ] Verificar que la lista muestra correctamente (2 + contador)

#### 8.4 Nombres Largos
- [ ] Crear etiqueta con nombre de 50 caracteres
- [ ] Verificar que se muestra correctamente truncado en badges
- [ ] Verificar que el tooltip muestra el nombre completo

---

## 🐛 Verificación de Errores

### Consola del Navegador
- [ ] Abrir DevTools (F12)
- [ ] Ir a la pestaña "Console"
- [ ] Realizar todas las acciones anteriores
- [ ] Verificar que no hay errores en rojo
- [ ] Verificar que no hay warnings críticos

### Network
- [ ] Abrir DevTools → Network
- [ ] Realizar acciones de etiquetas
- [ ] Verificar que las llamadas a Supabase son exitosas (200)
- [ ] Verificar que no hay llamadas fallidas (4xx, 5xx)

---

## ✅ Resumen de Verificación

### Funcionalidades Críticas
- [ ] Crear etiquetas ✅
- [ ] Asignar/quitar etiquetas ✅
- [ ] Ver etiquetas en header y lista ✅
- [ ] Filtrar conversaciones por etiquetas ✅
- [ ] Editar etiquetas ✅
- [ ] Eliminar etiquetas ✅

### Calidad
- [ ] Sin errores en consola ✅
- [ ] Rendimiento aceptable ✅
- [ ] UX fluida ✅
- [ ] Responsive design ✅

---

## 📝 Notas de Verificación

**Fecha de verificación**: _______________

**Verificado por**: _______________

**Problemas encontrados**:
1. 
2. 
3. 

**Comentarios adicionales**:
- 
- 
- 

---

## 🎯 Criterios de Aprobación

Para considerar la SUBFASE 1.5 como completada:

- ✅ Todos los tests unitarios pasando (20/20)
- ✅ Todos los tests de integración pasando (3/3)
- ✅ Todas las funcionalidades críticas verificadas manualmente
- ✅ Sin errores críticos en consola
- ✅ Documentación completa creada
- ✅ Checklist de verificación completado

---

**Estado Final**: ⬜ Pendiente | ⬜ En Progreso | ⬜ Completado

