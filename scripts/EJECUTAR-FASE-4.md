# Ejecutar FASE 4: Limpieza Final

## 📋 Objetivo

La FASE 4 es la limpieza final y verificación completa de la migración. Es **OPCIONAL** y principalmente verifica que todo está correcto.

## ⚠️ Nota Importante

**La vista `products` puede mantenerse** para compatibilidad. El script de la FASE 4 NO elimina la vista por defecto. Si quieres eliminarla, debes descomentar las líneas correspondientes.

## 🚀 Pasos de Ejecución

### Paso 1: Ejecutar Script Principal

1. Ve al SQL Editor de Supabase: https://supabase.com/dashboard/project/alwxhiombhfyjyyziyxz/sql/new
2. Abre el archivo: `scripts/fase-4-renombrar-products.sql`
3. Copia TODO el contenido del script
4. Pégalo en el SQL Editor
5. Haz clic en "Run" o presiona `Ctrl+Enter`

### Paso 2: Ejecutar Script de Testing

1. Abre el archivo: `scripts/test-fase-4-renombrar-products.sql`
2. Copia TODO el contenido
3. Ejecuta en el SQL Editor
4. Revisa que todos los checks estén en verde ✅

### Paso 3: Verificación Final en la Aplicación

1. **Menú "Productos"**
   - [ ] Los productos se cargan correctamente
   - [ ] Puedes agregar/editar/eliminar productos
   - [ ] Los cambios se ven inmediatamente

2. **Menú "Ventas"**
   - [ ] Puedes registrar ventas
   - [ ] Los productos aparecen correctamente
   - [ ] No hay errores de foreign key

3. **Menú "Mis Números"**
   - [ ] Puedes agregar números
   - [ ] Puedes asignar productos
   - [ ] No hay errores de foreign key

4. **Menú "Almacen Central"**
   - [ ] Los despachos funcionan correctamente
   - [ ] El stock se actualiza correctamente

5. **Consola del navegador (F12)**
   - [ ] No hay errores
   - [ ] No hay errores de "table not found"
   - [ ] No hay errores de foreign key

## ✅ Criterios de Éxito

La FASE 4 se considera exitosa si:

- [x] El script SQL se ejecutó sin errores
- [ ] El script de testing muestra todos los checks en verde ✅
- [ ] La aplicación funciona correctamente en todos los menús
- [ ] No hay errores en consola
- [ ] Las foreign keys funcionan correctamente
- [ ] Los datos se guardan en `almacen_central`

## 📝 Decisión: ¿Eliminar vista `products`?

### Opción A: Mantener la vista (RECOMENDADO)
- **Ventaja**: Compatibilidad con código legacy
- **Ventaja**: Fácil rollback si es necesario
- **Desventaja**: Mantiene una vista adicional

### Opción B: Eliminar la vista
- **Ventaja**: Limpieza completa
- **Desventaja**: Si hay código que aún usa `products`, fallará
- **Desventaja**: Más difícil de revertir

**Recomendación**: Mantener la vista `products` por ahora. No causa problemas y proporciona compatibilidad.

## 🔄 Rollback (si es necesario)

Si necesitas revertir todo:

```sql
-- Recrear vista products si fue eliminada
CREATE OR REPLACE VIEW products AS SELECT * FROM almacen_central;

-- Restaurar foreign keys a products (requeriría recrear la tabla products)
-- Mejor: restaurar desde backup completo
```

## ✅ Migración Completa

Una vez completada la FASE 4, la migración de `products` a `almacen_central` está **100% completa**.


