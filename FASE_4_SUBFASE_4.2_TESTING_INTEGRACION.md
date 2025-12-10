# FASE 4: SUBFASE 4.2 - Testing de Integración

## 📋 Objetivo

Probar flujos completos de extremo a extremo para verificar que todas las funcionalidades trabajan correctamente en conjunto.

---

## ✅ Flujos a Probar

### FLUJO 1: Admin crea cuenta WhatsApp con producto

#### Pasos:
1. Login como admin (`admin` / `admin123`)
2. Ir a menú "WhatsApp" (cuentas)
3. Verificar que se muestran tabs por productos
4. Verificar que se muestra tab "Todos"
5. Crear nueva cuenta WhatsApp
6. En el formulario, seleccionar un producto del selector
7. Completar formulario y guardar
8. Verificar que la cuenta aparece en la lista
9. Verificar que la cuenta aparece en el tab del producto correspondiente
10. Verificar que NO aparece en otros tabs de productos

#### Resultado Esperado:
- ✅ Cuenta creada exitosamente
- ✅ Asignada al producto correcto
- ✅ Visible en tab del producto
- ✅ NO visible en otros tabs

---

### FLUJO 2: Admin crea cuenta WhatsApp sin producto

#### Pasos:
1. Login como admin
2. Ir a menú "WhatsApp" (cuentas)
3. Crear nueva cuenta WhatsApp
4. En el formulario, dejar "Sin producto asociado" seleccionado
5. Completar formulario y guardar
6. Verificar que la cuenta aparece en la lista
7. Verificar que la cuenta aparece en tab "Todos"
8. Verificar que NO aparece en tabs de productos específicos

#### Resultado Esperado:
- ✅ Cuenta creada exitosamente
- ✅ Sin producto asignado (`product_id = NULL`)
- ✅ Visible en tab "Todos"
- ✅ NO visible en tabs de productos específicos

---

### FLUJO 3: Vendedora ve solo sus productos

#### Pasos:
1. **Preparación:** Como admin, asignar productos a vendedora `ana`:
   - Ir a menú "Usuarios"
   - Editar usuario `ana`
   - Asignar productos (ej: solo "CVP-60")
   - Guardar

2. **Testing:**
   - Cerrar sesión
   - Login como `ana` / `ana123`
   - Ir a menú "Chat WhatsApp"
   - Verificar que solo se muestran tabs de productos asignados
   - Verificar que NO se muestra tab "Todos"
   - Cambiar entre tabs
   - Verificar que solo ve conversaciones de productos asignados
   - Verificar que NO puede ver conversaciones de otros productos

3. **Repetir para otros menús:**
   - "Secuencias" - Solo ve secuencias de productos asignados
   - "Cola Puppeteer" - Solo ve cola de productos asignados
   - "Contactos Bloqueados" - Solo ve contactos de productos asignados
   - "WhatsApp" (cuentas) - Solo ve cuentas de productos asignados

#### Resultado Esperado:
- ✅ Solo ve tabs de productos asignados
- ✅ NO ve tab "Todos"
- ✅ Solo ve datos de productos asignados
- ✅ NO puede ver datos de otros productos

---

### FLUJO 4: Cambio de producto en chat

#### Pasos:
1. Login como admin
2. Ir a menú "Chat WhatsApp"
3. Seleccionar tab de un producto específico (ej: "CVP-60")
4. Verificar que solo se muestran conversaciones de ese producto
5. Abrir una conversación
6. Verificar que los mensajes son del producto correcto
7. Enviar un mensaje
8. Verificar que se envía desde la cuenta correcta del producto
9. Cambiar a otro tab de producto
10. Verificar que las conversaciones cambian correctamente
11. Verificar que NO se mezclan mensajes entre productos

#### Resultado Esperado:
- ✅ Conversaciones se filtran por producto
- ✅ Mensajes se envían desde cuenta correcta
- ✅ No se mezclan datos entre productos
- ✅ Cambio de tab funciona correctamente

---

### FLUJO 5: Crear secuencia para producto específico

#### Pasos:
1. Login como admin
2. Ir a menú "Secuencias"
3. Seleccionar tab de un producto específico
4. Verificar que solo se muestran secuencias de ese producto
5. Crear nueva secuencia
6. Seleccionar cuenta del producto seleccionado
7. Completar formulario y guardar
8. Verificar que la secuencia aparece en la lista
9. Verificar que la secuencia está asignada al producto correcto
10. Cambiar a otro tab de producto
11. Verificar que la secuencia NO aparece en otros productos

#### Resultado Esperado:
- ✅ Secuencia creada exitosamente
- ✅ Asignada al producto correcto
- ✅ Visible solo en tab del producto
- ✅ NO visible en otros tabs

---

### FLUJO 6: Filtrado cruzado (Producto + Etiquetas)

#### Pasos:
1. Login como admin
2. Ir a menú "Chat WhatsApp"
3. Seleccionar tab de un producto específico
4. Aplicar filtro de etiquetas
5. Verificar que se filtran conversaciones por:
   - Producto seleccionado (tab)
   - Etiquetas seleccionadas
6. Verificar que solo se muestran conversaciones que cumplen AMBAS condiciones

#### Resultado Esperado:
- ✅ Filtrado por producto funciona
- ✅ Filtrado por etiquetas funciona
- ✅ Filtrado combinado funciona correctamente
- ✅ Solo se muestran conversaciones que cumplen ambas condiciones

---

### FLUJO 7: Múltiples usuarios con diferentes productos

#### Pasos:
1. **Preparación:** Como admin:
   - Asignar "CVP-60" a vendedora `ana`
   - Asignar "FLEX-60" a vendedora `luisa`

2. **Testing con `ana`:**
   - Login como `ana` / `ana123`
   - Verificar que solo ve "CVP-60"
   - Verificar que NO ve "FLEX-60"

3. **Testing con `luisa`:**
   - Cerrar sesión
   - Login como `luisa` / `luisa123`
   - Verificar que solo ve "FLEX-60"
   - Verificar que NO ve "CVP-60"

#### Resultado Esperado:
- ✅ Cada usuario ve solo sus productos
- ✅ No hay interferencia entre usuarios
- ✅ Los datos se filtran correctamente

---

## 📝 Plantilla de Resultados

### FLUJO 1: Admin crea cuenta con producto
- **Estado:** ⬜ Pendiente / ✅ Completado / ❌ Falló
- **Observaciones:** 

### FLUJO 2: Admin crea cuenta sin producto
- **Estado:** ⬜ Pendiente / ✅ Completado / ❌ Falló
- **Observaciones:** 

### FLUJO 3: Vendedora ve solo sus productos
- **Estado:** ⬜ Pendiente / ✅ Completado / ❌ Falló
- **Observaciones:** 

### FLUJO 4: Cambio de producto en chat
- **Estado:** ⬜ Pendiente / ✅ Completado / ❌ Falló
- **Observaciones:** 

### FLUJO 5: Crear secuencia para producto
- **Estado:** ⬜ Pendiente / ✅ Completado / ❌ Falló
- **Observaciones:** 

### FLUJO 6: Filtrado cruzado
- **Estado:** ⬜ Pendiente / ✅ Completado / ❌ Falló
- **Observaciones:** 

### FLUJO 7: Múltiples usuarios
- **Estado:** ⬜ Pendiente / ✅ Completado / ❌ Falló
- **Observaciones:** 

---

## 🐛 Errores Encontrados

### Error 1:
- **Flujo afectado:**
- **Descripción:**
- **Pasos para reproducir:**
- **Severidad:** 🔴 Crítico / 🟡 Medio / 🟢 Bajo
- **Solución:**

---

## ✅ Resumen Final

**Flujos Pasados:** ___ / 7
**Flujos Fallidos:** ___ / 7
**Errores Críticos:** ___
**Errores Menores:** ___

**Estado General:** ⬜ Pendiente / ✅ Aprobado / ❌ Requiere Correcciones

---

**Fecha de Finalización:** _______________

