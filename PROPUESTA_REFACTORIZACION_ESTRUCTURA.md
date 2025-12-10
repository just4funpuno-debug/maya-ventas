# Propuesta de Refactorización de Estructura de Datos

## ⚠️ ACLARACIÓN IMPORTANTE

**La separación entre `ventashistorico` y `ventasporcobrar` es INTENCIONAL y CORRECTA desde el punto de vista del negocio:**

- ✅ `ventashistorico` = **Historial PERMANENTE** (nunca se borra, excepto cancelación completa)
- ✅ `ventasporcobrar` = **Ventas activas por cobrar** (se ELIMINA cuando se genera depósito o se cobra)
- ✅ `GenerarDeposito` = **Copia temporal** para generar depósito (se elimina al finalizar)

**Esta propuesta NO elimina esta lógica de negocio**, sino que la simplifica técnicamente usando:
- **Soft Delete** (`deleted_from_pending_at`) para marcar cuando una venta sale de la lista por cobrar
- **Una sola tabla** en lugar de múltiples colecciones, pero respetando el mismo ciclo de vida

## 🔍 ANÁLISIS DE COMPLEJIDAD ACTUAL

### Problemas Identificados en Firebase:

#### 1. **Múltiples Colecciones para Ventas (4 colecciones)**
```
VentasSinConfirmar → ventashistorico → ventasporcobrar → GenerarDeposito
```

**Ciclo de Vida Actual (CORRECTO desde lógica de negocio):**
1. `VentasSinConfirmar` → Ventas pendientes (se eliminan al confirmar)
2. `ventashistorico` → **Historial PERMANENTE** (nunca se borra, excepto cancelación completa)
3. `ventasporcobrar` → **Ventas activas por cobrar** (se ELIMINA cuando se genera depósito o se cobra)
4. `GenerarDeposito` → Copia temporal para generar depósito (se elimina al finalizar)

**Problemas Técnicos (no de lógica de negocio):**
- ⚠️ **Sincronización manual:** Cualquier cambio requiere actualizar 2-3 colecciones
- ⚠️ **Referencias cruzadas complejas:** `codigoUnico`, `idHistorico`, `idPorCobrar`
- ⚠️ **Heurísticas para encontrar documentos:** Múltiples fallbacks cuando fallan referencias
- ⚠️ **Riesgo de inconsistencias:** Si falla una actualización, datos divergen
- ⚠️ **Código complejo:** 114+ referencias a `codigoUnico`/`idHistorico`/`idPorCobrar`
- ⚠️ **Duplicación temporal:** Misma venta existe en `ventashistorico` Y `ventasporcobrar` (pero se elimina de `ventasporcobrar` cuando se cobra)

#### 2. **cityStock con Estructura Plana**
```javascript
// Actual: Documento por ciudad con objeto plano
cityStock/LA_PAZ = { "CVP-60": 10, "FLEX-60": 5 }
```

**Problemas:**
- ❌ No se puede hacer JOIN con productos
- ❌ Consultas complejas (ej: "¿qué ciudades tienen stock de X?")
- ❌ Actualizaciones atómicas difíciles
- ❌ No hay foreign keys

#### 3. **Despachos Separados en 2 Colecciones**
```
despachos (pendientes) → despachosHistorial (confirmados)
```

**Problemas:**
- ❌ Duplicación innecesaria
- ❌ Mover documentos entre colecciones

---

## ✅ PROPUESTA: ESTRUCTURA SIMPLIFICADA EN SUPABASE

### **FILOSOFÍA: "Una Venta, Una Fila"**

En lugar de múltiples colecciones, usar **UNA tabla de ventas** con estados y relaciones claras.

---

## 📊 NUEVA ESTRUCTURA PROPUESTA

### **OPCIÓN A: Tabla Única con Soft Delete (RECOMENDADA)**

Mantener una sola tabla pero respetar el ciclo de vida con campo `deleted_from_pending_at`:

```sql
CREATE TABLE sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Datos básicos de la venta
  fecha date NOT NULL,
  ciudad text NOT NULL,
  sku text REFERENCES products(sku),
  cantidad integer NOT NULL DEFAULT 1,
  precio numeric(12,2) NOT NULL DEFAULT 0,
  sku_extra text REFERENCES products(sku),
  cantidad_extra integer DEFAULT 0,
  total numeric(12,2),
  
  -- Información de vendedora
  vendedora text,
  vendedora_id uuid REFERENCES users(id),
  celular text,
  
  -- Método de pago y cliente
  metodo text,
  cliente text,
  notas text,
  
  -- ESTADO DE LA VENTA
  estado_entrega text NOT NULL DEFAULT 'pendiente' 
    CHECK (estado_entrega IN ('pendiente', 'confirmado', 'entregada', 'cancelado')),
  estado_pago text DEFAULT 'pendiente' 
    CHECK (estado_pago IN ('pendiente', 'cobrado', 'cancelado')),
  
  -- Gastos
  gasto numeric(12,2) DEFAULT 0,
  gasto_cancelacion numeric(12,2) DEFAULT 0,
  
  -- Timestamps de estados
  created_at timestamptz DEFAULT now(),
  confirmado_at timestamptz,
  entregada_at timestamptz,
  cancelado_at timestamptz,
  settled_at timestamptz,  -- Cuando se incluye en depósito
  fecha_cobro timestamptz,
  
  -- SOFT DELETE para "ventasporcobrar"
  -- Cuando se genera depósito o se cobra, marcar como eliminado de lista pendiente
  -- pero mantener en historial (nunca se borra físicamente)
  deleted_from_pending_at timestamptz,  -- NULL = está en lista por cobrar
  
  -- Referencia a depósito (si aplica)
  deposit_id uuid REFERENCES deposits(id),
  
  -- Campos adicionales
  comprobante text,
  hora_entrega text,
  destino_encomienda text,
  motivo text,
  sintetica_cancelada boolean DEFAULT false,
  
  -- Código único (mantener para compatibilidad durante migración)
  codigo_unico uuid UNIQUE,
  
  -- Índices para consultas rápidas
  INDEX idx_sales_estado_entrega (estado_entrega),
  INDEX idx_sales_estado_pago (estado_pago),
  INDEX idx_sales_fecha (fecha),
  INDEX idx_sales_ciudad (ciudad),
  INDEX idx_sales_deposit_id (deposit_id),
  INDEX idx_sales_deleted_from_pending (deleted_from_pending_at)  -- Para filtrar activas
);
```

**Ventajas:**
- ✅ **Una sola fuente de verdad:** No hay duplicación física
- ✅ **Respetar ciclo de vida:** `deleted_from_pending_at` marca cuando sale de lista por cobrar
- ✅ **Historial permanente:** Nunca se borra físicamente, solo se marca
- ✅ **Consultas simples:** 
  - Ventas por cobrar: `WHERE deleted_from_pending_at IS NULL AND estado_pago = 'pendiente'`
  - Historial: `WHERE estado_entrega IN ('confirmado', 'entregada', 'cancelado')`
- ✅ **Sin sincronización:** Un solo UPDATE actualiza todo
- ✅ **Foreign keys nativas:** Relación con productos y usuarios

**Flujo simplificado:**
```
1. Crear venta → estado_entrega = 'pendiente', deleted_from_pending_at = NULL
2. Confirmar entrega → estado_entrega = 'confirmado', confirmado_at = now()
   (deleted_from_pending_at sigue NULL = está en lista por cobrar)
3. Generar depósito → deposit_id = X, settled_at = now()
4. Finalizar depósito → deleted_from_pending_at = now() (sale de lista por cobrar)
   (pero sigue en historial para siempre)
```

---

### **OPCIÓN B: Dos Tablas Separadas (Alternativa)**

Si prefieres mantener separación física explícita:

```sql
-- Historial permanente (nunca se borra)
CREATE TABLE sales_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- ... todos los campos de venta ...
  estado_entrega text NOT NULL,
  estado_pago text,
  fecha_cobro timestamptz,
  deposit_id uuid REFERENCES deposits(id),
  -- ... resto de campos ...
);

-- Ventas por cobrar (se eliminan cuando se cobran)
CREATE TABLE sales_pending_payment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  history_id uuid REFERENCES sales_history(id) ON DELETE CASCADE,
  -- ... campos de venta (duplicados) ...
  -- O solo referencia + campos específicos de "por cobrar"
);
```

**Ventajas:**
- ✅ Separación física clara
- ✅ Eliminación real de `sales_pending_payment` cuando se cobra

**Desventajas:**
- ⚠️ Duplicación de datos (pero intencional)
- ⚠️ Sincronización necesaria al editar

---

### 2. **Tabla de Depósitos: `deposits`**

```sql
CREATE TABLE deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ciudad text NOT NULL,
  fecha date NOT NULL,
  monto_total numeric(12,2) NOT NULL,
  nota text,
  estado text DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'confirmado', 'cancelado')),
  created_at timestamptz DEFAULT now(),
  confirmed_at timestamptz
);

-- Relación: sales.deposit_id → deposits.id
-- Ya definida arriba en sales
```

**Ventajas:**
- ✅ **Relación clara:** Foreign key en `sales`
- ✅ **Consulta simple:** `SELECT * FROM sales WHERE deposit_id = X`
- ✅ **Sin duplicación:** No necesitamos `GenerarDeposito` separado

---

### 3. **Stock Normalizado: `city_stock`**

```sql
CREATE TABLE city_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ciudad text NOT NULL,
  sku text NOT NULL REFERENCES products(sku),
  cantidad integer NOT NULL DEFAULT 0,
  UNIQUE(ciudad, sku),
  INDEX idx_city_stock_ciudad (ciudad),
  INDEX idx_city_stock_sku (sku)
);
```

**Ventajas:**
- ✅ **JOINs nativos:** `SELECT * FROM city_stock JOIN products ON ...`
- ✅ **Consultas complejas:** "¿Qué ciudades tienen stock de X?"
- ✅ **Actualizaciones atómicas:** `UPDATE city_stock SET cantidad = cantidad - 1 WHERE ...`
- ✅ **Foreign keys:** Integridad referencial garantizada

---

### 4. **Despachos Unificados: `dispatches`**

```sql
CREATE TABLE dispatches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha date NOT NULL,
  ciudad text NOT NULL,
  status text DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'confirmado', 'cancelado')),
  items jsonb NOT NULL,  -- O tabla normalizada dispatch_items
  created_at timestamptz DEFAULT now(),
  confirmed_at timestamptz
);
```

**Ventajas:**
- ✅ **Una sola tabla:** Filtro por `status` en lugar de colección diferente
- ✅ **Historial automático:** `status = 'confirmado'` es el historial

---

## 🎯 COMPARACIÓN: ANTES vs DESPUÉS

### **ANTES (Firebase - Complejo):**
```javascript
// Para obtener ventas pendientes
const q = query(collection(db, 'VentasSinConfirmar'), ...);

// Para obtener ventas por cobrar
const q = query(collection(db, 'ventasporcobrar'), ...);

// Para obtener historial
const q = query(collection(db, 'ventashistorico'), ...);

// Para editar una venta confirmada
await updateDoc(doc(db, 'ventashistorico', idHist), {...});
await updateDoc(doc(db, 'ventasporcobrar', idPC), {...});  // Sincronización manual

// Para generar depósito
// 1. Copiar de ventasporcobrar a GenerarDeposito
// 2. Eliminar de ventasporcobrar
// 3. Mantener en ventashistorico
```

### **DESPUÉS (Supabase - Simple con Soft Delete):**
```sql
-- Ventas pendientes (VentasSinConfirmar)
SELECT * FROM sales 
WHERE estado_entrega = 'pendiente';

-- Ventas por cobrar (ventasporcobrar)
SELECT * FROM sales 
WHERE estado_entrega IN ('confirmado', 'entregada') 
  AND estado_pago = 'pendiente'
  AND deleted_from_pending_at IS NULL;  -- Solo las que están activas

-- Historial (ventashistorico) - TODAS las confirmadas
SELECT * FROM sales 
WHERE estado_entrega IN ('confirmado', 'entregada', 'cancelado')
ORDER BY fecha DESC;

-- Generar depósito (marcar como eliminadas de lista por cobrar)
UPDATE sales 
SET deposit_id = 'xxx', 
    settled_at = now(),
    deleted_from_pending_at = now()  -- Sale de lista por cobrar
WHERE id IN (SELECT id FROM sales WHERE ciudad = 'LA PAZ' AND deleted_from_pending_at IS NULL);

-- Finalizar depósito (eliminar GenerarDeposito)
-- Solo actualizar deposit_id a NULL, las ventas ya están marcadas como deleted_from_pending_at
UPDATE sales SET deposit_id = NULL WHERE deposit_id = 'xxx';

-- Editar una venta (UNA SOLA actualización, sin sincronización)
UPDATE sales SET precio = 150 WHERE id = 'xxx';
-- ¡Automáticamente se refleja en historial Y por cobrar (si aún está activa)!
```

---

## ⚖️ ¿CUÁNDO HACER LA REFACTORIZACIÓN?

### **OPCIÓN A: Antes de Migrar** ❌ NO RECOMENDADO
**Pros:**
- Código más limpio antes de migrar

**Contras:**
- ❌ Cambios en producción con Firebase (riesgo)
- ❌ Tener que mantener compatibilidad con estructura antigua
- ❌ Doble trabajo: refactorizar Firebase Y luego migrar
- ❌ Riesgo de romper funcionalidad existente

---

### **OPCIÓN B: Durante la Migración** ✅ **RECOMENDADO**
**Pros:**
- ✅ **Una sola vez:** Refactorizar directamente en Supabase
- ✅ **Aprovechar el momento:** Ya estamos cambiando todo
- ✅ **Estructura correcta desde el inicio:** No tener que refactorizar después
- ✅ **Menos código legacy:** No arrastrar complejidad innecesaria
- ✅ **Mejor rendimiento:** Estructura optimizada desde el día 1

**Contras:**
- ⚠️ Migración ligeramente más compleja (pero más simple a largo plazo)
- ⚠️ Requiere mapeo de datos durante migración

---

### **OPCIÓN C: Después de Migrar** ⚠️ NO RECOMENDADO
**Pros:**
- Migración más directa (1:1)

**Contras:**
- ❌ **Doble trabajo:** Migrar estructura compleja Y luego refactorizar
- ❌ **Código legacy:** Mantener complejidad innecesaria
- ❌ **Riesgo de inconsistencias:** Durante período de transición
- ❌ **Más tiempo total:** 2 refactorizaciones en lugar de 1

---

## 🎯 RECOMENDACIÓN FINAL

### **HACER LA REFACTORIZACIÓN DURANTE LA MIGRACIÓN**

**Razones:**
1. ✅ **Eficiencia:** Una sola vez, no dos
2. ✅ **Estructura correcta desde el inicio:** No arrastrar deuda técnica
3. ✅ **Menos riesgo:** Cambios controlados durante migración
4. ✅ **Mejor código:** Código más simple y mantenible
5. ✅ **Mejor rendimiento:** Estructura optimizada

---

## 📋 PLAN DE MIGRACIÓN CON REFACTORIZACIÓN

### **Fase 1: Diseño de Nueva Estructura** (1 día)
1. Validar esquema SQL propuesto
2. Crear migraciones SQL en Supabase
3. Documentar mapeo de datos

### **Fase 2: Scripts de Transformación** (2-3 días)
1. Script que lee Firebase y transforma a nueva estructura
2. Consolidar `VentasSinConfirmar` + `ventashistorico` + `ventasporcobrar` → `sales`
3. Normalizar `cityStock` → `city_stock`
4. Unificar `despachos` + `despachosHistorial` → `dispatches`

### **Fase 3: Migración de Datos** (2-3 días)
1. Ejecutar scripts de transformación
2. Validar integridad
3. Comparar totales y conteos

### **Fase 4: Adaptación de Código** (4-5 días)
1. Crear funciones helper para nueva estructura
2. Reemplazar consultas complejas por queries simples
3. Eliminar lógica de sincronización duplicada
4. Simplificar funciones en `supabaseUtils.js`

### **Fase 5: Pruebas** (2-3 días)
1. Validar que todo funciona igual
2. Verificar que datos se muestran correctamente
3. Probar flujos completos

---

## 🔄 MAPEO DE DATOS DURANTE MIGRACIÓN

### **Ventas: Consolidación de 4 colecciones → 1 tabla con Soft Delete**

```javascript
// Script de migración
async function migrateSales() {
  // 1. VentasSinConfirmar → sales (estado_entrega = 'pendiente')
  const pendientes = await getDocs(collection(db, 'VentasSinConfirmar'));
  for (const doc of pendientes.docs) {
    await supabase.from('sales').insert({
      ...doc.data(),
      estado_entrega: 'pendiente',
      estado_pago: null,
      deposit_id: null,
      deleted_from_pending_at: null  // Aún en lista
    });
  }
  
  // 2. ventashistorico → sales (historial permanente)
  const historico = await getDocs(collection(db, 'ventashistorico'));
  for (const doc of historico.docs) {
    const data = doc.data();
    await supabase.from('sales').insert({
      ...data,
      estado_entrega: data.estadoEntrega || 'confirmado',
      estado_pago: data.estadoPago || 'pendiente',
      deposit_id: data.snapshotId || null,
      confirmado_at: data.confirmadoAt?.toDate() || null,
      settled_at: data.settledAt?.toDate() || null,
      // Si tiene settledAt, ya fue procesado (marcar como eliminado de lista)
      deleted_from_pending_at: data.settledAt?.toDate() || null
    });
  }
  
  // 3. ventasporcobrar → Verificar si existe en historico
  // Si existe en historico, actualizar deleted_from_pending_at = NULL (está activa)
  // Si NO existe, crear nueva fila (caso edge)
  const porCobrar = await getDocs(collection(db, 'ventasporcobrar'));
  for (const doc of porCobrar.docs) {
    const data = doc.data();
    // Buscar por codigoUnico en sales ya migradas
    const existing = await supabase
      .from('sales')
      .select('id')
      .eq('codigo_unico', data.codigoUnico)
      .single();
    
    if (existing.data) {
      // Ya existe en historico, solo marcar como activa en lista por cobrar
      await supabase
        .from('sales')
        .update({ deleted_from_pending_at: null })
        .eq('id', existing.data.id);
    } else {
      // Caso edge: existe en porCobrar pero no en historico (crear)
      await supabase.from('sales').insert({
        ...data,
        estado_entrega: data.estadoEntrega || 'confirmado',
        estado_pago: 'pendiente',
        deleted_from_pending_at: null  // Activa en lista por cobrar
      });
    }
  }
  
  // 4. GenerarDeposito → Actualizar sales.deposit_id y settled_at
  const depositos = await getDocs(collection(db, 'GenerarDeposito'));
  for (const doc of depositos.docs) {
    const data = doc.data();
    // Buscar venta por codigoUnico
    await supabase
      .from('sales')
      .update({ 
        deposit_id: doc.id,  // O crear tabla deposits y usar su ID
        settled_at: data.createdAt?.toDate() || now(),
        deleted_from_pending_at: data.createdAt?.toDate() || now()  // Ya procesada
      })
      .eq('codigo_unico', data.codigoUnico);
  }
}
```

---

## 📊 IMPACTO EN CÓDIGO

### **Código que se SIMPLIFICA:**

#### **ANTES (Complejo):**
```javascript
// firestoreUtils.js - 450+ líneas de lógica compleja
export async function editarVentaConfirmada(idPorCobrar, idHistorico, ventaAnterior, ventaNueva) {
  // Buscar por codigoUnico si faltan IDs
  if (codigoUnico && (!idPorCobrar || !idHistorico)) {
    // ... 50 líneas de búsqueda y fallbacks
  }
  // Actualizar ventasporcobrar
  await updateDoc(doc(db, "ventasporcobrar", idPorCobrar), {...});
  // Actualizar ventashistorico
  await updateDoc(doc(db, "ventashistorico", idHistorico), {...});
  // Sincronizar si hay diferencias...
}

// Generar depósito
// 1. Copiar de ventasporcobrar a GenerarDeposito
// 2. Eliminar de ventasporcobrar
// 3. Mantener en ventashistorico
```

#### **DESPUÉS (Simple con Soft Delete):**
```javascript
// supabaseUtils.js - 10 líneas
export async function editarVentaConfirmada(saleId, ventaNueva) {
  await supabase
    .from('sales')
    .update(ventaNueva)
    .eq('id', saleId);
  // ¡Eso es todo! Una sola actualización
  // Automáticamente se refleja en historial Y por cobrar (si aún está activa)
}

// Generar depósito (mucho más simple)
export async function generarDeposito(ciudad, ventaIds, depositId) {
  await supabase
    .from('sales')
    .update({ 
      deposit_id: depositId,
      settled_at: now(),
      deleted_from_pending_at: now()  // Sale de lista por cobrar
    })
    .in('id', ventaIds)
    .eq('ciudad', ciudad)
    .is('deleted_from_pending_at', null);  // Solo las activas
  // ¡Eso es todo! No hay que copiar ni eliminar documentos
}

// Finalizar depósito
export async function finalizarDeposito(depositId) {
  await supabase
    .from('sales')
    .update({ deposit_id: null })
    .eq('deposit_id', depositId);
  // Las ventas ya están marcadas como deleted_from_pending_at
  // Solo limpiamos la referencia al depósito
}
```

---

## ✅ BENEFICIOS DE REFACTORIZAR DURANTE MIGRACIÓN

1. **Código 70% más simple:** Eliminar lógica de sincronización
2. **Mejor rendimiento:** Queries SQL optimizadas vs múltiples lecturas Firestore
3. **Menos bugs:** Sin riesgo de inconsistencias entre colecciones
4. **Más mantenible:** Estructura clara y lógica
5. **Escalable:** PostgreSQL maneja mejor grandes volúmenes
6. **Mejor para el equipo:** Código más fácil de entender

---

## 🎯 CONCLUSIÓN

### **RECOMENDACIÓN: REFACTORIZAR DURANTE LA MIGRACIÓN**

**Ventajas:**
- ✅ Una sola vez, no dos
- ✅ Estructura correcta desde el inicio
- ✅ Código más simple y mantenible
- ✅ Mejor rendimiento
- ✅ Menos riesgo a largo plazo

**El esfuerzo adicional durante migración (1-2 días) se compensa con:**
- Menos código a mantener (70% reducción)
- Menos bugs potenciales
- Mejor experiencia de desarrollo
- Mejor rendimiento

---

## 📝 PRÓXIMOS PASOS

1. **Aprobar nueva estructura** propuesta
2. **Crear schema SQL** definitivo en Supabase
3. **Desarrollar scripts de transformación** de datos
4. **Ejecutar migración** con nueva estructura
5. **Adaptar código** a estructura simplificada

---

## 🔄 FLEXIBILIDAD Y AJUSTES

### ✅ **SÍ, PODEMOS MODIFICAR EN CUALQUIER MOMENTO**

**Durante la migración:**
- ✅ Ajustar campos de la tabla `sales` si detectamos algo faltante
- ✅ Modificar índices según necesidades de consulta
- ✅ Cambiar nombres de columnas si es necesario
- ✅ Agregar campos adicionales que no consideramos inicialmente

**Después de la migración:**
- ✅ PostgreSQL permite `ALTER TABLE` fácilmente
- ✅ Podemos agregar columnas sin afectar datos existentes
- ✅ Podemos modificar índices para optimizar consultas
- ✅ Podemos crear vistas o funciones si simplifican el código

**Ejemplos de cambios posibles:**
```sql
-- Agregar un campo nuevo
ALTER TABLE sales ADD COLUMN nueva_columna text;

-- Modificar un índice
DROP INDEX idx_sales_ciudad;
CREATE INDEX idx_sales_ciudad_fecha ON sales(ciudad, fecha);

-- Crear una vista para simplificar consultas
CREATE VIEW ventas_por_cobrar AS
SELECT * FROM sales 
WHERE deleted_from_pending_at IS NULL 
  AND estado_pago = 'pendiente';
```

**Recomendación:**
- 🔍 **Durante migración:** Probar con datos reales y ajustar según veamos
- 🔍 **Después de migración:** Monitorear rendimiento y ajustar índices/vistas
- 🔍 **Siempre:** Documentar cambios para el equipo

**La estructura propuesta es un punto de partida, no una camisa de fuerza.** Podemos refinarla según las necesidades reales que vayamos descubriendo.

---

¿Quieres que proceda con el diseño detallado del nuevo schema SQL y los scripts de transformación?

