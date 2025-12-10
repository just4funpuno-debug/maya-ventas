# FASE 4: Limpieza y verificación final

## Objetivo
Eliminar código legacy y verificar que todo funciona correctamente.

## Pasos

### 1. Eliminar vista de compatibilidad (si aún existe)

```sql
-- Eliminar vista products (ya no es necesaria)
DROP VIEW IF EXISTS products;
```

### 2. Actualizar scripts SQL legacy

- Actualizar `supabase-schema.sql` para usar `almacen_central`
- Actualizar otros scripts que referencien `products`

### 3. Verificación completa

#### Testing funcional:
- ✅ Agregar producto nuevo
- ✅ Editar producto existente
- ✅ Eliminar producto
- ✅ Crear despacho
- ✅ Confirmar despacho
- ✅ Registrar venta
- ✅ Ver stock por ciudad

#### Testing de integridad:
- ✅ Foreign keys funcionan
- ✅ Triggers se ejecutan
- ✅ Políticas RLS permiten acceso
- ✅ No hay errores en consola
- ✅ Datos se guardan correctamente

### 4. Documentación

- Actualizar documentación si existe
- Documentar el cambio en el código

## Checklist final

- [ ] Vista `products` eliminada (si se creó)
- [ ] Todos los scripts actualizados
- [ ] Testing completo realizado
- [ ] No hay errores en consola
- [ ] Datos se guardan correctamente
- [ ] Foreign keys funcionan
- [ ] Triggers funcionan
- [ ] Políticas RLS funcionan

## Nota importante

✅ **Solo marcar como completado cuando todo funcione correctamente**


