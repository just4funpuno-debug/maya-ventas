# Fase 5: Testing Completo y Verificación

## Objetivo
Verificar que todo el sistema de grupos funciona correctamente end-to-end.

## Checklist de Testing

### ✅ Fase 1: Base de Datos
- [x] Tabla `grupos` creada en Supabase
- [x] 3 grupos iniciales insertados (A, B, C)
- [x] RLS habilitado y funcionando
- [x] Realtime habilitado

### 🔍 Fase 2: Componente Selector
- [ ] El componente se renderiza correctamente
- [ ] Muestra los 3 grupos iniciales en el dropdown
- [ ] El botón "+" aparece solo para admins
- [ ] El modal se abre al hacer clic en "+"
- [ ] Se puede crear un nuevo grupo desde el modal
- [ ] La validación de nombre duplicado funciona
- [ ] El nuevo grupo aparece automáticamente en el selector
- [ ] El nuevo grupo se selecciona automáticamente después de crearlo

### 🔍 Fase 3: Formulario Crear Usuario
- [ ] El selector aparece cuando el rol es "Vendedora"
- [ ] El selector NO aparece cuando el rol es "Admin"
- [ ] Se puede seleccionar un grupo existente
- [ ] Se puede crear un usuario sin grupo (opción "-- Sin grupo --")
- [ ] Se puede añadir un nuevo grupo desde el formulario de crear
- [ ] El usuario se crea con el grupo correcto
- [ ] El grupo se guarda correctamente en la base de datos

### 🔍 Fase 4: Formulario Editar Usuario
- [ ] El selector aparece al editar un usuario vendedora
- [ ] Muestra el grupo actual del usuario
- [ ] Se puede cambiar el grupo de un usuario
- [ ] Se puede quitar el grupo (seleccionar "-- Sin grupo --")
- [ ] Se puede añadir un nuevo grupo desde la edición
- [ ] Los cambios se guardan correctamente
- [ ] El grupo actualizado se refleja en la lista de usuarios

### 🔍 Fase 5: Funcionalidad Completa
- [ ] **Sincronización en tiempo real**: Si abres dos pestañas y añades un grupo en una, aparece en la otra
- [ ] **Filtrado por grupo**: Las vendedoras solo ven ventas de su grupo
- [ ] **Mensajes por grupo**: Los mensajes se filtran correctamente por grupo
- [ ] **Dashboard por grupo**: Los KPIs se calculan correctamente por grupo
- [ ] **Historial por grupo**: El historial se filtra correctamente por grupo

## Pruebas Específicas a Realizar

### Prueba 1: Crear Usuario con Grupo
1. Ve al menú "Usuarios"
2. Llena el formulario:
   - Nombre: "Test Usuario"
   - Apellidos: "Grupo Test"
   - Usuario: "testgrupo"
   - Contraseña: "test123"
   - Rol: "Vendedora"
   - Grupo: Selecciona "Grupo A"
3. Haz clic en "Guardar"
4. **Verificar**: El usuario aparece en la lista con "G: Grupo A"

### Prueba 2: Añadir Nuevo Grupo desde Crear
1. En el formulario de crear usuario
2. Selecciona "Vendedora" como rol
3. Haz clic en el botón "+" (Añadir grupo)
4. Ingresa:
   - Nombre: "Grupo D"
   - Descripción: "Grupo D de prueba"
5. Haz clic en "Añadir Grupo"
6. **Verificar**: 
   - El modal se cierra
   - "Grupo D" aparece en el selector
   - "Grupo D" está seleccionado automáticamente
7. Completa el formulario y crea el usuario
8. **Verificar**: El usuario tiene "Grupo D" asignado

### Prueba 3: Editar Grupo de Usuario
1. En la lista de usuarios, haz clic en "Editar" en un usuario vendedora
2. Cambia el grupo de "Grupo A" a "Grupo B"
3. Guarda los cambios
4. **Verificar**: 
   - El usuario muestra "G: Grupo B" en la lista
   - El cambio se guardó en la base de datos

### Prueba 4: Sincronización en Tiempo Real
1. Abre dos pestañas del navegador con la aplicación
2. En la pestaña 1, añade un nuevo grupo "Grupo E"
3. **Verificar**: En la pestaña 2, "Grupo E" aparece automáticamente en el selector sin recargar

### Prueba 5: Validación de Nombre Duplicado
1. Intenta crear un grupo con nombre "Grupo A" (que ya existe)
2. **Verificar**: Aparece el error "Ya existe un grupo con ese nombre"

### Prueba 6: Quitar Grupo a Usuario
1. Edita un usuario que tiene grupo asignado
2. Selecciona "-- Sin grupo --"
3. Guarda los cambios
4. **Verificar**: El usuario ya no muestra la etiqueta "G: ..." en la lista

## Problemas Conocidos a Verificar

- [ ] ¿El selector funciona correctamente en móvil?
- [ ] ¿El modal se cierra correctamente al hacer clic fuera?
- [ ] ¿Los grupos se ordenan alfabéticamente?
- [ ] ¿Los grupos inactivos no aparecen en el selector?

## Resultado Final Esperado

✅ Todo el sistema de grupos funciona correctamente
✅ Se pueden crear, seleccionar y editar grupos
✅ La sincronización en tiempo real funciona
✅ Los filtros por grupo funcionan en toda la aplicación
✅ No hay errores en la consola

## Notas

- Si encuentras algún problema, anótalo aquí:
  - Problema: _______________
  - Pasos para reproducir: _______________
  - Solución: _______________


