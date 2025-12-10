# Fase 4: Integrar Selector en Formulario Editar Usuario

## Objetivo
Reemplazar el input de texto libre del campo "Grupo" por el componente GrupoSelector en el formulario de editar usuario.

## Cambios Realizados

### Reemplazo del input por el selector
- **Antes**: `<input ... value={editData.grupo||''} onChange={e=>setEditData({...editData,grupo:e.target.value})} ... />`
- **Ahora**: `<GrupoSelector value={editData.grupo||''} onChange={(val) => setEditData({...editData, grupo: val})} ... />`

### Ubicación del cambio
- Archivo: `src/App.jsx`
- Línea aproximada: ~2653
- Función: `CreateUserAdmin` → formulario de editar usuario (cuando `editingId === u.id`)

## Testing de la Fase 4

### Pruebas a realizar:

1. **Verificar que el selector aparece al editar**
   - Ve al menú "Usuarios"
   - Haz clic en "Editar" en un usuario vendedora
   - Verifica que aparece el selector de grupos (no el input de texto)

2. **Probar cambiar el grupo de un usuario**
   - Edita un usuario vendedora
   - Cambia su grupo de "Grupo A" a "Grupo B"
   - Guarda los cambios
   - Verifica que el grupo se actualiza correctamente

3. **Probar añadir grupo desde edición**
   - Edita un usuario
   - Haz clic en el botón "+" para añadir un nuevo grupo
   - Crea "Grupo E"
   - Verifica que se selecciona automáticamente
   - Guarda los cambios
   - Verifica que el usuario tiene el nuevo grupo

4. **Probar quitar grupo a un usuario**
   - Edita un usuario que tiene grupo
   - Selecciona "-- Sin grupo --"
   - Guarda los cambios
   - Verifica que el usuario ya no tiene grupo

## Resultado Esperado

✅ El formulario de editar usuario ahora usa el selector de grupos
✅ Se pueden cambiar grupos de usuarios existentes
✅ Se pueden añadir nuevos grupos desde la edición
✅ Los cambios se guardan correctamente

## Siguiente Fase
Una vez probada la Fase 4, procederemos a la **Fase 5: Testing completo y verificación final**.


