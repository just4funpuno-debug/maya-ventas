# 🚀 EJECUTAR FASE 1: Renombrar deposits → generar_deposito

## 📋 Objetivo
Crear la nueva tabla `generar_deposito`, migrar datos de `deposits`, y crear una vista de compatibilidad.

## ⚠️ IMPORTANTE
- **Hacer backup** de la base de datos antes de ejecutar
- Ejecutar en **Supabase SQL Editor**
- Verificar que no hay operaciones activas en `deposits` durante la migración

## 📝 Pasos

### 1. Ejecutar script de migración
```sql
-- Ejecutar: scripts/fase-1-renombrar-deposits.sql
```

### 2. Verificar migración
```sql
-- Ejecutar: scripts/test-fase-1-renombrar-deposits.sql
```

### 3. Testing manual
1. Abrir la aplicación en localhost
2. Ir al menú "Generar Depósito"
3. Verificar que:
   - ✅ Los depósitos se cargan correctamente
   - ✅ Se pueden ver los datos de cada ciudad
   - ✅ La tabla muestra las ventas correctamente
   - ✅ No hay errores en la consola del navegador

### 4. Verificar en Supabase Dashboard
- Ir a **Table Editor** → Verificar que existe `generar_deposito`
- Verificar que existe `deposits_backup`
- Verificar que `deposits` aparece como **View** (no tabla)

## ✅ Criterios de Éxito
- [ ] `deposits_backup` existe con todos los registros originales
- [ ] `generar_deposito` existe con todos los registros migrados
- [ ] Vista `deposits` funciona y muestra los mismos datos
- [ ] La aplicación carga correctamente el menú "Generar Depósito"
- [ ] No hay errores en consola del navegador
- [ ] Los conteos coinciden entre backup, nuevo y vista

## 🔄 Si algo sale mal
1. **Restaurar desde backup**: Si la migración falla, restaurar la base de datos
2. **Revertir manualmente**:
   ```sql
   -- Eliminar vista
   DROP VIEW IF EXISTS deposits;
   -- Renombrar backup de vuelta
   ALTER TABLE deposits_backup RENAME TO deposits;
   -- Eliminar tabla nueva
   DROP TABLE IF EXISTS generar_deposito;
   ```

## 📊 Resultados Esperados
- Total de registros en `deposits_backup` = Total en `generar_deposito` = Total en `deposits` (vista)
- RLS habilitado en `generar_deposito`
- Políticas RLS creadas
- Índices creados
- Trigger `updated_at` funcionando
- Realtime habilitado

## ➡️ Siguiente Paso
Una vez verificado todo, proceder a **FASE 2**: Actualizar referencias en código JavaScript.


