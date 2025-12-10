# 📝 FASE 2: Actualizar Referencias en Código JavaScript

## 🎯 Objetivo
Actualizar todas las referencias de `deposits` a `generar_deposito` en el código JavaScript.

## 📋 Archivos a Modificar

### 1. `src/supabaseUsers.js`
- **Línea 36**: Cambiar `'GenerarDeposito': 'deposits'` a `'GenerarDeposito': 'generar_deposito'`

### 2. `src/App.jsx`
- **Línea 7301**: Cambiar `.from('deposits')` a `.from('generar_deposito')`
- **Línea 7315**: Cambiar `.from('deposits')` a `.from('generar_deposito')`

### 3. `src/supabaseUtils.js`
- **Línea 773**: Cambiar `.from('deposits')` a `.from('generar_deposito')`
- **Línea 904**: Cambiar `.from('deposits')` a `.from('generar_deposito')`

### 4. `src/supabaseUtils-deposits.js`
- **Línea 51**: Cambiar `.from('deposits')` a `.from('generar_deposito')`
- **Línea 75**: Cambiar `.from('deposits')` a `.from('generar_deposito')`

## ✅ Testing
Después de cada cambio, verificar:
1. ✅ La aplicación compila sin errores
2. ✅ El menú "Generar Depósito" carga correctamente
3. ✅ Se pueden crear nuevos depósitos
4. ✅ Se pueden eliminar depósitos
5. ✅ Se pueden confirmar depósitos
6. ✅ No hay errores en la consola del navegador

## 🔍 Búsqueda de Referencias
Para encontrar todas las referencias:
```bash
grep -r "deposits" src/ --include="*.js" --include="*.jsx"
```

## ⚠️ IMPORTANTE
- La vista `deposits` seguirá funcionando durante esta fase (compatibilidad)
- Todos los cambios deben apuntar directamente a `generar_deposito`
- No modificar referencias a `deposit_id` en `sales` (eso es FASE 3)


