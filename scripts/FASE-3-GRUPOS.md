# Fase 3: Integrar Selector en Formulario Crear Usuario

## Objetivo
Reemplazar el input de texto libre del campo "Grupo" por el componente GrupoSelector en el formulario de crear usuario.

## Cambios Realizados

### 1. Importación del componente
- Agregado `import GrupoSelector from "./components/GrupoSelector";` en `src/App.jsx`

### 2. Reemplazo del input por el selector
- **Antes**: `<input value={grupo} onChange={e=>setGrupo(e.target.value)} ... />`
- **Ahora**: `<GrupoSelector value={grupo} onChange={setGrupo} disabled={false} session={session} />`

### Ubicación del cambio
- Archivo: `src/App.jsx`
- Línea aproximada: ~2602
- Función: `CreateUserAdmin` → formulario de crear usuario

## Testing de la Fase 3

### Pruebas a realizar:

1. **Verificar que el selector aparece en el formulario**
   - Ve al menú "Usuarios"
   - Verifica que cuando seleccionas "Vendedora" como rol, aparece el selector de grupos
   - Debe mostrar: "-- Sin grupo --", "Grupo A", "Grupo B", "Grupo C"

2. **Probar seleccionar un grupo**
   - Selecciona "Grupo A" del dropdown
   - Crea un usuario de prueba
   - Verifica que el usuario se crea con el grupo correcto

3. **Probar añadir un nuevo grupo desde el formulario**
   - Haz clic en el botón "+" (Añadir grupo)
   - Ingresa nombre: "Grupo D"
   - Haz clic en "Añadir Grupo"
   - Verifica que:
     - El grupo aparece en el selector
     - Se selecciona automáticamente
     - Puedes crear el usuario con ese grupo

4. **Probar crear usuario sin grupo**
   - Selecciona "-- Sin grupo --"
   - Crea un usuario
   - Verifica que el usuario se crea sin grupo asignado

5. **Verificar que admins no tienen campo grupo**
   - Selecciona "Admin" como rol
   - Verifica que el campo "Grupo" desaparece (correcto)

## Resultado Esperado

✅ El formulario de crear usuario ahora usa el selector de grupos
✅ Se pueden seleccionar grupos de la lista
✅ Se pueden añadir nuevos grupos desde el formulario
✅ Los grupos se sincronizan en tiempo real

## Siguiente Fase
Una vez probada la Fase 3, procederemos a la **Fase 4: Integrar selector en formulario editar usuario**.


