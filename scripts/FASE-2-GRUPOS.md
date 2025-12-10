# Fase 2: Componente Selector de Grupos

## Objetivo
Crear un componente reutilizable que permita seleccionar grupos de una lista y añadir nuevos grupos.

## Archivos Creados

1. **`src/components/GrupoSelector.jsx`**
   - Componente selector de grupos con dropdown
   - Botón "Añadir grupo" (solo para admins)
   - Modal para agregar nuevos grupos
   - Sincronización en tiempo real con Supabase

2. **Actualización en `src/supabaseUsers.js`**
   - Agregado 'grupos' al tableMap
   - Agregada normalización para grupos

## Características del Componente

✅ **Selector dropdown** con todos los grupos activos
✅ **Botón "Añadir grupo"** (solo visible para admins)
✅ **Modal** para agregar nuevos grupos
✅ **Validación** de nombre único
✅ **Sincronización en tiempo real** (si otro admin añade un grupo, aparece automáticamente)
✅ **Selección automática** del nuevo grupo después de crearlo

## Uso del Componente

```jsx
import GrupoSelector from './components/GrupoSelector';

<GrupoSelector
  value={grupo}
  onChange={setGrupo}
  disabled={false}
  session={session}
/>
```

## Testing de la Fase 2

### Pruebas a realizar:

1. **Verificar que el selector muestra los 3 grupos iniciales**
   - Abre el formulario de crear usuario
   - Verifica que el dropdown muestra: "Grupo A", "Grupo B", "Grupo C"

2. **Probar añadir un nuevo grupo (como admin)**
   - Haz clic en el botón "+" (Añadir grupo)
   - Ingresa nombre: "Grupo D"
   - Ingresa descripción: "Grupo D de vendedoras"
   - Haz clic en "Añadir Grupo"
   - Verifica que el grupo aparece en el selector
   - Verifica que se selecciona automáticamente

3. **Probar validación de nombre duplicado**
   - Intenta crear "Grupo A" nuevamente
   - Debe mostrar error: "Ya existe un grupo con ese nombre"

4. **Verificar que vendedoras no ven el botón "Añadir"**
   - (Si tienes una sesión de vendedora, verifica que el botón no aparece)

## Siguiente Fase
Una vez completada esta fase y probada, procederemos a la **Fase 3: Integrar selector en formulario crear usuario**.


