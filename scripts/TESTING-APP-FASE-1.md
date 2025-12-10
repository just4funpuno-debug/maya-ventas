# Testing de Aplicación - FASE 1

## ✅ Testing SQL Completado
- Tabla `almacen_central` creada correctamente
- Vista `products` funcionando
- 8 productos migrados correctamente
- Todos los checks pasaron

## 🧪 Testing de Aplicación

### Pasos a seguir:

1. **Abrir la aplicación en localhost**
   - Inicia el servidor de desarrollo si no está corriendo
   - Abre http://localhost:5173 (o el puerto que uses)

2. **Iniciar sesión como admin**
   - Usuario: `pedroadmin`
   - Verifica que inicias sesión correctamente

3. **Menú "Productos"**
   - [ ] Los 8 productos se cargan correctamente
   - [ ] Puedes ver la lista completa de productos
   - [ ] Las imágenes se muestran (si hay productos con imágenes)
   - [ ] Puedes hacer clic en "Editar" en un producto
   - [ ] Puedes modificar un producto y guardar
   - [ ] Puedes hacer clic en "Agregar" y crear un nuevo producto
   - [ ] El nuevo producto se guarda correctamente
   - [ ] El stock se muestra correctamente
   - [ ] No hay errores en la consola del navegador (F12)

4. **Menú "Almacen Central"**
   - [ ] Los productos aparecen en el formulario de despachos
   - [ ] Puedes seleccionar una ciudad
   - [ ] Puedes ingresar cantidades para crear un despacho
   - [ ] Puedes crear un despacho
   - [ ] El stock se actualiza correctamente después del despacho
   - [ ] No hay errores en la consola

5. **Verificar Consola del Navegador**
   - Abre las DevTools (F12)
   - Ve a la pestaña "Console"
   - [ ] No hay errores rojos
   - [ ] No hay errores de "table not found"
   - [ ] No hay errores de "column not found"
   - [ ] No hay errores de "relation does not exist"

## ✅ Criterios de Éxito

La FASE 1 está **COMPLETA** cuando:
- [x] Script SQL ejecutado sin errores
- [x] Script de testing muestra todos los checks en verde
- [ ] La aplicación carga productos correctamente
- [ ] Puedes agregar/editar productos sin errores
- [ ] Los despachos funcionan correctamente
- [ ] No hay errores en consola

## 📝 Notas

- Si ves algún error, anótalo y compártelo
- La vista `products` debería funcionar exactamente igual que la tabla original
- Todos los cambios se reflejan en `almacen_central` y se ven a través de la vista `products`

## 🔄 Si algo falla

Si encuentras algún problema:
1. Revisa la consola del navegador para ver el error exacto
2. Verifica que la vista `products` funciona ejecutando:
   ```sql
   SELECT * FROM products LIMIT 1;
   ```
3. Verifica que `almacen_central` tiene datos:
   ```sql
   SELECT COUNT(*) FROM almacen_central;
   ```


