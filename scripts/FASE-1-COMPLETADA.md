# ✅ FASE 1 COMPLETADA: Renombrar products a almacen_central

## Resumen de lo logrado

### ✅ Cambios en Base de Datos
- [x] Tabla `almacen_central` creada con todas las columnas
- [x] Tabla `products` renombrada a `products_backup` (backup seguro)
- [x] Datos migrados correctamente (8 productos)
- [x] Vista `products` creada apuntando a `almacen_central` (compatibilidad)
- [x] RLS, triggers e índices configurados

### ✅ Cambios en Código
- [x] `tableMap` actualizado: `'almacenCentral'` → `'almacen_central'`
- [x] Todas las operaciones (INSERT, UPDATE, DELETE) van directamente a `almacen_central`
- [x] Actualizaciones optimistas implementadas (cambios inmediatos en UI)
- [x] Suscripción en tiempo real funcionando correctamente
- [x] Eliminado `createdAt` del INSERT (la tabla usa `created_at` automáticamente)

### ✅ Funcionalidades Verificadas
- [x] Crear producto: funciona correctamente, aparece inmediatamente
- [x] Editar producto: funciona correctamente, cambios inmediatos
- [x] Eliminar producto: funciona correctamente
- [x] Despachos: funcionan correctamente
- [x] Stock: se actualiza correctamente

## Estado Actual

- **Tabla principal**: `almacen_central` (donde se guardan los datos)
- **Vista de compatibilidad**: `products` (apunta a `almacen_central`)
- **Backup**: `products_backup` (tabla original renombrada, no se modifica)

## Notas Importantes

1. **`products_backup` no se actualiza**: Esto es correcto. Es solo un backup de la tabla original y no debe modificarse.

2. **Los cambios van a `almacen_central`**: Todas las operaciones (crear, editar, eliminar) se hacen directamente en `almacen_central`.

3. **La vista `products` es solo lectura**: Aunque técnicamente se puede escribir en vistas, ahora escribimos directamente en `almacen_central` para mejor rendimiento.

4. **Compatibilidad mantenida**: El código existente sigue funcionando porque la vista `products` muestra los datos de `almacen_central`.

## Próximos Pasos (FASE 2)

Cuando estés listo, la FASE 2 consistirá en:
- Actualizar referencias restantes en el código
- Verificar que todo sigue funcionando
- Preparar para la FASE 3 (actualizar foreign keys)

## Rollback (si es necesario)

Si necesitas revertir la FASE 1:
```sql
-- Eliminar vista products
DROP VIEW IF EXISTS products;

-- Renombrar products_backup de vuelta a products
ALTER TABLE products_backup RENAME TO products;

-- Eliminar almacen_central (CUIDADO: esto elimina los datos)
-- DROP TABLE IF EXISTS almacen_central;
```

**Nota:** La FASE 1 es reversible porque mantiene `products_backup` como backup.


