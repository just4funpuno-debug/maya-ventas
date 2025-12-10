# 🔧 Corregir Función "Code" - Guía Rápida

## Situación Actual

✅ Tienes el código corregido en `supabase/functions/process-sequences/index.ts`  
❌ Creaste una función llamada "Code" por error  
✅ Ya existe "process-sequences" (la correcta)

## Solución: Actualizar "process-sequences" y Eliminar "Code"

### Paso 1: Actualizar "process-sequences" (La Correcta)

1. **Ir a process-sequences:**
   - Click en **"process-sequences"** en la lista de funciones
   - O ve a: https://supabase.com/dashboard/project/alwxhiombhfyjyyziyxz/functions/process-sequences

2. **Ir a pestaña "Code":**
   - Click en **"Code"** (no "Details")

3. **Copiar código corregido:**
   - Abre `supabase/functions/process-sequences/index.ts` en tu editor
   - Selecciona TODO (Ctrl+A)
   - Copia (Ctrl+C)

4. **Pegar en Dashboard:**
   - En el editor de Supabase Dashboard
   - Selecciona TODO (Ctrl+A)
   - Pega (Ctrl+V) - reemplaza todo el contenido
   - Click **"Deploy"** o **"Save"**

5. **Verificar:**
   - Deberías ver "Successfully deployed edge function"
   - "LAST UPDATED" debería cambiar a "just now" o "a few seconds ago"

### Paso 2: Eliminar "Code" (La Incorrecta)

1. **Ir a la función "Code":**
   - Click en **"Code"** en la lista de funciones
   - O ve a: https://supabase.com/dashboard/project/alwxhiombhfyjyyziyxz/functions/Code

2. **Eliminar función:**
   - Busca un botón **"Delete"** o **"Remove"** (puede estar en Settings o en el menú de 3 puntos)
   - O en la pestaña **"Details"** → busca opción de eliminar
   - Confirma la eliminación

3. **Verificar:**
   - "Code" ya no debería aparecer en la lista

## Alternativa: Si no puedes eliminar "Code"

Si no encuentras cómo eliminar "Code", no es crítico:
- ✅ "process-sequences" es la que se usará (es la correcta)
- ⚠️ "Code" quedará ahí pero no se usará
- Puedes eliminarla después cuando encuentres la opción

## Verificar que Todo Está Bien

Después de actualizar "process-sequences", ejecuta el test:

```powershell
.\test-process-sequences.ps1
```

Deberías ver:
- ✅ `success: true`
- ✅ Sin errores de `add_to_puppeteer_queue`
- ✅ Procesamiento correcto

---

**¿Listo?** Empieza actualizando "process-sequences" con el código corregido.


