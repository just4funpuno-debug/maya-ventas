# 📋 Guía Práctica: Testing Manual FASE 4.1

## 🚀 Inicio Rápido

### Usuarios de Prueba

Según el código encontrado, los usuarios de prueba son:
- **Admin:** `admin` / `admin123` o `pedroadmin` / `pedro123`
- **Vendedora 1:** `ana` / `ana123`
- **Vendedora 2:** `luisa` / `luisa123`

---

## 📝 Testing Paso a Paso

### TEST 1: Verificación como Admin

#### Paso 1.1: Login como Admin
1. Abre la aplicación
2. Inicia sesión con: `admin` / `admin123`
3. Verifica que el login funciona

#### Paso 1.2: Verificar Tabs en "Chat WhatsApp"
1. Ve al menú "💬 Chat WhatsApp"
2. **Verifica:**
   - ✅ Se muestra tab "Todos"
   - ✅ Se muestran todos los productos (excepto sintéticos)
   - ✅ Los tabs tienen formato: `{name}` (solo nombre del producto)
   - ✅ El tab activo tiene color naranja (`bg-[#e7922b]`)
   - ✅ Los tabs inactivos tienen color gris oscuro

#### Paso 1.3: Verificar Filtrado en "Chat WhatsApp"
1. Haz clic en tab "Todos"
2. **Verifica:**
   - ✅ Se muestran todas las conversaciones
   - ✅ No hay errores en consola
3. Haz clic en un producto específico (ej: "CVP-60 - Cardio Vascular Plus 60 caps")
4. **Verifica:**
   - ✅ Solo se muestran conversaciones de ese producto
   - ✅ Las conversaciones se filtran correctamente
   - ✅ No hay errores en consola

#### Paso 1.4: Verificar Otros Menús
Repite los pasos 1.2 y 1.3 para:
- ✅ **Secuencias** (menú "📋 Secuencias")
- ✅ **Cola Puppeteer** (menú "Cola Puppeteer")
- ✅ **Contactos Bloqueados** (menú "Contactos Bloqueados")
- ✅ **WhatsApp (Cuentas)** (menú "WhatsApp")

---

### TEST 2: Verificación como Vendedora

#### Paso 2.1: Preparar Usuario Vendedora
1. **IMPORTANTE:** Primero, como admin, ve al menú "Usuarios"
2. Asigna productos a la vendedora `ana`:
   - Selecciona productos específicos (ej: solo "CVP-60")
   - Guarda los cambios

#### Paso 2.2: Login como Vendedora
1. Cierra sesión
2. Inicia sesión con: `ana` / `ana123`
3. Verifica que el login funciona

#### Paso 2.3: Verificar Tabs en "Chat WhatsApp"
1. Ve al menú "💬 Chat WhatsApp"
2. **Verifica:**
   - ❌ NO se muestra tab "Todos"
   - ✅ Solo se muestran productos asignados a `ana`
   - ✅ Los tabs tienen formato: `{name}` (solo nombre del producto)
   - ✅ El tab activo tiene color naranja

#### Paso 2.4: Verificar Filtrado y Permisos
1. Haz clic en un producto asignado
2. **Verifica:**
   - ✅ Solo ve conversaciones de ese producto
   - ✅ NO puede ver conversaciones de otros productos
3. Repite para otros menús:
   - ✅ **Secuencias**: Solo ve secuencias de productos asignados
   - ✅ **Cola Puppeteer**: Solo ve cola de productos asignados
   - ✅ **Contactos Bloqueados**: Solo ve contactos de productos asignados
   - ✅ **WhatsApp (Cuentas)**: Solo ve cuentas de productos asignados

---

### TEST 3: Verificación de Exclusión de Productos Sintéticos

#### Paso 3.1: Verificar en Tabs
1. Como admin, ve a cualquier menú con tabs
2. **Verifica:**
   - ✅ NO aparecen productos sintéticos en los tabs
   - ✅ Solo aparecen productos con `sintetico = false`

#### Paso 3.2: Verificar en Selector de Productos
1. Como admin, ve a "WhatsApp" (cuentas)
2. Haz clic en "Nueva Cuenta"
3. En el selector de productos:
   - ✅ NO aparecen productos sintéticos
   - ✅ Solo aparecen productos no sintéticos

#### Paso 3.3: Verificar en Base de Datos (Opcional)
1. Ve a Supabase SQL Editor
2. Ejecuta:
```sql
-- Verificar que hay productos sintéticos
SELECT sku, nombre, sintetico FROM products WHERE sintetico = true;

-- Verificar que get_product_ids_from_skus excluye sintéticos
SELECT get_product_ids_from_skus(ARRAY['SKU_SINTETICO', 'CVP-60']);
-- Debe retornar solo el ID de CVP-60, no el sintético
```

---

### TEST 4: Verificación de Edge Cases

#### Paso 4.1: Usuario sin Productos Asignados
1. Como admin, ve a "Usuarios"
2. Crea un usuario vendedora sin productos asignados
3. Inicia sesión con ese usuario
4. **Verifica:**
   - ✅ Se muestra mensaje apropiado (ej: "No hay productos asignados")
   - ✅ No hay errores en consola
   - ✅ La UI no se rompe

#### Paso 4.2: Producto sin Cuentas Asignadas
1. Como admin, crea un producto nuevo (o usa uno existente sin cuentas)
2. Ve a "Chat WhatsApp"
3. Selecciona ese producto en el tab
4. **Verifica:**
   - ✅ Se muestra mensaje apropiado (ej: "No hay conversaciones")
   - ✅ No hay errores en consola
   - ✅ La UI no se rompe

#### Paso 4.3: Cambio Rápido entre Tabs
1. Como admin, ve a "Chat WhatsApp"
2. Cambia rápidamente entre diferentes tabs (5-10 veces)
3. **Verifica:**
   - ✅ No hay errores en consola
   - ✅ Los datos se cargan correctamente
   - ✅ No hay race conditions
   - ✅ La UI responde correctamente

---

### TEST 5: Verificación de Rendimiento

#### Paso 5.1: Carga Inicial
1. Abre la aplicación en modo incógnito
2. Inicia sesión
3. Ve a "Chat WhatsApp"
4. **Verifica:**
   - ✅ La carga es rápida (< 3 segundos)
   - ✅ No hay errores en consola
   - ✅ Los tabs se muestran correctamente

#### Paso 5.2: Cambio de Tab
1. Cambia entre diferentes tabs
2. **Verifica:**
   - ✅ El cambio es rápido (< 1 segundo)
   - ✅ No hay recargas innecesarias
   - ✅ La UI es fluida

---

## 📊 Plantilla de Resultados

### TEST 1: Admin
- **Tabs:** ⬜ OK / ❌ FALLO
- **Filtrado:** ⬜ OK / ❌ FALLO
- **Menús:** ⬜ OK / ❌ FALLO
- **Observaciones:** 

### TEST 2: Vendedora
- **Tabs:** ⬜ OK / ❌ FALLO
- **Filtrado:** ⬜ OK / ❌ FALLO
- **Permisos:** ⬜ OK / ❌ FALLO
- **Observaciones:** 

### TEST 3: Exclusión Sintéticos
- **Tabs:** ⬜ OK / ❌ FALLO
- **Selectores:** ⬜ OK / ❌ FALLO
- **SQL:** ⬜ OK / ❌ FALLO
- **Observaciones:** 

### TEST 4: Edge Cases
- **Sin productos:** ⬜ OK / ❌ FALLO
- **Sin cuentas:** ⬜ OK / ❌ FALLO
- **Cambio rápido:** ⬜ OK / ❌ FALLO
- **Observaciones:** 

### TEST 5: Rendimiento
- **Carga inicial:** ⬜ OK / ❌ FALLO
- **Cambio de tab:** ⬜ OK / ❌ FALLO
- **Observaciones:** 

---

## 🐛 Reportar Errores

Si encuentras errores, documenta:
1. **Descripción:** ¿Qué pasó?
2. **Pasos para reproducir:** ¿Cómo lo reproduzco?
3. **Resultado esperado:** ¿Qué debería pasar?
4. **Resultado actual:** ¿Qué pasó realmente?
5. **Consola:** ¿Hay errores en la consola del navegador?
6. **Screenshot:** Si es posible, captura de pantalla

---

## ✅ Checklist Final

- [ ] Todos los tests de Admin pasaron
- [ ] Todos los tests de Vendedora pasaron
- [ ] Todos los tests de Filtrado pasaron
- [ ] Todos los tests de Sintéticos pasaron
- [ ] Todos los tests de Edge Cases pasaron
- [ ] El rendimiento es aceptable
- [ ] No hay errores en consola
- [ ] La UI es responsive

---

**¡Listo para comenzar el testing!** 🚀

