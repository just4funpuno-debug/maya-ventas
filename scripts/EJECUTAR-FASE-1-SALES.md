# 🚀 EJECUTAR FASE 1: Renombrar sales → ventas

## 📋 Resumen
Esta fase crea la nueva tabla `ventas`, renombra `sales` a `sales_backup`, migra todos los datos, y crea una vista `sales` para mantener compatibilidad temporal con el código existente.

## ⚠️ IMPORTANTE
- **Hacer backup de la base de datos** antes de ejecutar
- Ejecutar en **Supabase SQL Editor**
- Verificar que no hay procesos activos usando la tabla `sales`
- Esta fase es **reversible** (puedes renombrar `sales_backup` de vuelta a `sales` si es necesario)

## 📝 Pasos de Ejecución

### 1. Preparación
- [ ] Abrir Supabase Dashboard
- [ ] Ir a SQL Editor
- [ ] Verificar que la tabla `sales` existe y tiene datos

### 2. Ejecutar FASE 1
- [ ] Copiar el contenido de `scripts/fase-1-renombrar-sales.sql`
- [ ] Pegar en Supabase SQL Editor
- [ ] Ejecutar el script
- [ ] Verificar que no hay errores

### 3. Verificar Resultados
- [ ] Ejecutar `scripts/test-fase-1-renombrar-sales.sql`
- [ ] Verificar que todos los tests pasan (✅)
- [ ] Verificar conteos: `sales_backup` = `ventas` = `sales` (vista)

### 4. Habilitar Realtime (Manual)
- [ ] Ir a Database → Replication en Supabase Dashboard
- [ ] Buscar la tabla `ventas`
- [ ] Habilitar Realtime para `ventas`
- [ ] Verificar que aparece en la lista de tablas con Realtime habilitado

### 5. Testing Manual
- [ ] Abrir la aplicación en localhost
- [ ] Verificar que el menú "Ventas" carga correctamente
- [ ] Verificar que se pueden ver las ventas por ciudad
- [ ] Verificar que no hay errores en la consola del navegador

## ✅ Criterios de Éxito
- [ ] Tabla `ventas` creada con todos los registros
- [ ] Tabla `sales_backup` existe con los mismos registros
- [ ] Vista `sales` funciona y muestra los mismos datos
- [ ] RLS habilitado y políticas creadas
- [ ] Triggers funcionando
- [ ] Índices creados
- [ ] Realtime habilitado para `ventas`
- [ ] Aplicación funciona sin errores

## 🔄 Si algo sale mal
1. **Revertir cambios**:
   ```sql
   DROP VIEW IF EXISTS sales;
   DROP TABLE IF EXISTS ventas;
   ALTER TABLE sales_backup RENAME TO sales;
   ```

2. **Verificar estado**:
   ```sql
   SELECT table_name, table_type 
   FROM information_schema.tables 
   WHERE table_name IN ('sales', 'ventas', 'sales_backup');
   ```

## 📊 Resultados Esperados
- Total de registros en `sales_backup`: igual a `ventas`
- Total de registros en vista `sales`: igual a `ventas`
- Estado final: ✅ TODO CORRECTO

## ➡️ Próximo Paso
Una vez completada y verificada la FASE 1, continuar con:
- **FASE 2**: Actualizar código JavaScript para usar `ventas` directamente


