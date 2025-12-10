# FASE 4: SUBFASE 4.1 - Testing Manual Completo

## 📋 Objetivo

Realizar testing completo del sistema multi-producto para verificar que todas las funcionalidades funcionan correctamente.

---

## ✅ Checklist de Testing

### 1. Testing como Admin

#### 1.1 Verificación de Tabs
- [ ] Se muestra tab "Todos"
- [ ] Se muestran todos los productos (excepto sintéticos)
- [ ] Los tabs tienen formato correcto: `{sku} - {name}`
- [ ] Los tabs tienen estilo activo/inactivo correcto
- [ ] El scroll horizontal funciona si hay muchos productos

#### 1.2 Verificación de Filtrado
- [ ] Al seleccionar tab "Todos", se muestran todas las cuentas/conversaciones
- [ ] Al seleccionar un producto específico, se filtran los datos correctamente
- [ ] El cambio de tab es rápido y sin errores
- [ ] No se mezclan datos entre productos

#### 1.3 Verificación de Menús
- [ ] **Chat WhatsApp**: Tabs funcionan, filtrado funciona
- [ ] **Secuencias**: Tabs funcionan, filtrado funciona
- [ ] **Cola Puppeteer**: Tabs funcionan, filtrado funciona
- [ ] **Contactos Bloqueados**: Tabs funcionan, filtrado funciona
- [ ] **WhatsApp (Cuentas)**: Tabs funcionan, filtrado funciona

---

### 2. Testing como Vendedora

#### 2.1 Verificación de Tabs
- [ ] NO se muestra tab "Todos"
- [ ] Solo se muestran productos asignados al usuario
- [ ] Los tabs tienen formato correcto: `{sku} - {name}`
- [ ] Los tabs tienen estilo activo/inactivo correcto

#### 2.2 Verificación de Filtrado
- [ ] Solo ve datos de productos asignados
- [ ] NO puede ver datos de otros productos
- [ ] El cambio de tab funciona correctamente
- [ ] Los datos se filtran correctamente al cambiar de tab

#### 2.3 Verificación de Permisos
- [ ] NO puede ver cuentas de otros productos
- [ ] NO puede ver conversaciones de otros productos
- [ ] NO puede ver secuencias de otros productos
- [ ] NO puede ver cola de otros productos
- [ ] NO puede ver contactos bloqueados de otros productos

---

### 3. Testing de Filtrado por Producto

#### 3.1 Chat WhatsApp
- [ ] Al cambiar de tab, las conversaciones se filtran
- [ ] Solo se muestran conversaciones del producto seleccionado
- [ ] Al abrir una conversación, los mensajes son del producto correcto
- [ ] Al enviar mensaje, se envía desde la cuenta correcta

#### 3.2 Secuencias
- [ ] Al cambiar de tab, las secuencias se filtran
- [ ] Solo se muestran secuencias del producto seleccionado
- [ ] Al crear secuencia, se asigna al producto correcto

#### 3.3 Cola Puppeteer
- [ ] Al cambiar de tab, la cola se filtra
- [ ] Solo se muestran mensajes del producto seleccionado
- [ ] Las estadísticas se calculan correctamente por producto

#### 3.4 Contactos Bloqueados
- [ ] Al cambiar de tab, los contactos se filtran
- [ ] Solo se muestran contactos del producto seleccionado
- [ ] Las estadísticas se calculan correctamente por producto

#### 3.5 WhatsApp (Cuentas)
- [ ] Al cambiar de tab, las cuentas se filtran
- [ ] Solo se muestran cuentas del producto seleccionado
- [ ] Al crear cuenta, se puede asignar al producto correcto

---

### 4. Testing de Exclusión de Productos Sintéticos

#### 4.1 Verificación en Tabs
- [ ] NO se muestran productos sintéticos en tabs
- [ ] Los tabs solo muestran productos con `sintetico = false`

#### 4.2 Verificación en Selectores
- [ ] Al crear cuenta, NO aparecen productos sintéticos en selector
- [ ] Al editar cuenta, NO aparecen productos sintéticos en selector

#### 4.3 Verificación en Funciones SQL
- [ ] `get_product_ids_from_skus()` excluye sintéticos
- [ ] `get_account_ids_by_user_skus()` excluye sintéticos indirectamente

---

### 5. Testing de Persistencia

#### 5.1 Persistencia de Selección (si implementado)
- [ ] La selección de producto se mantiene al recargar página
- [ ] La selección de producto se mantiene al cambiar de menú

#### 5.2 Carga Inicial
- [ ] Los datos se cargan correctamente al iniciar
- [ ] El primer producto se selecciona automáticamente (si aplica)
- [ ] No hay errores en consola al cargar

---

### 6. Testing de Edge Cases

#### 6.1 Usuario sin Productos Asignados
- [ ] Se muestra mensaje apropiado
- [ ] No hay errores en consola
- [ ] La UI no se rompe

#### 6.2 Producto sin Cuentas Asignadas
- [ ] Se muestra mensaje apropiado
- [ ] No hay errores en consola
- [ ] La UI no se rompe

#### 6.3 Cambio Rápido entre Tabs
- [ ] No causa errores
- [ ] Los datos se cargan correctamente
- [ ] No hay race conditions

#### 6.4 Múltiples Usuarios
- [ ] Cada usuario ve solo sus productos
- [ ] No hay interferencia entre usuarios
- [ ] Los datos se filtran correctamente

---

## 📝 Resultados del Testing

### Fecha: _______________
### Tester: _______________

### Resultados:

#### 1. Testing como Admin
- Estado: ⬜ Pendiente / ✅ Completado / ❌ Falló
- Observaciones: 
  - 

#### 2. Testing como Vendedora
- Estado: ⬜ Pendiente / ✅ Completado / ❌ Falló
- Observaciones: 
  - 

#### 3. Testing de Filtrado
- Estado: ⬜ Pendiente / ✅ Completado / ❌ Falló
- Observaciones: 
  - 

#### 4. Testing de Exclusión de Sintéticos
- Estado: ⬜ Pendiente / ✅ Completado / ❌ Falló
- Observaciones: 
  - 

#### 5. Testing de Persistencia
- Estado: ⬜ Pendiente / ✅ Completado / ❌ Falló
- Observaciones: 
  - 

#### 6. Testing de Edge Cases
- Estado: ⬜ Pendiente / ✅ Completado / ❌ Falló
- Observaciones: 
  - 

---

## 🐛 Errores Encontrados

### Error 1:
- **Descripción:**
- **Ubicación:**
- **Severidad:** 🔴 Crítico / 🟡 Medio / 🟢 Bajo
- **Solución:**

---

## ✅ Funcionalidades Verificadas

- [ ] Tabs por productos funcionan correctamente
- [ ] Filtrado funciona en todos los menús
- [ ] Permisos funcionan correctamente (admin vs vendedora)
- [ ] Productos sintéticos están excluidos
- [ ] No hay errores en consola
- [ ] La UI es responsive
- [ ] El rendimiento es aceptable

---

## 📊 Resumen Final

**Tests Pasados:** ___ / ___
**Tests Fallidos:** ___ / ___
**Errores Críticos:** ___
**Errores Menores:** ___

**Estado General:** ⬜ Pendiente / ✅ Aprobado / ❌ Requiere Correcciones

---

**Fecha de Finalización:** _______________

