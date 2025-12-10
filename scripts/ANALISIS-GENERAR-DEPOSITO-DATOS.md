# Análisis: Datos Faltantes en "Generar Depósito"

## 🔍 Problema Identificado

En la tabla del submenú "Generar Depósito" no se muestran los siguientes campos:
- ❌ **Hora** (`r.hora`)
- ❌ **Usuario** (`r.vendedor`)
- ❌ **Cantidad de productos** (columnas por SKU)
- ❌ **Celular** (`r.celular`)
- ❌ **Precio** (`r.precio`)
- ❌ **Delivery** (`r.gasto`)
- ❌ **Encomienda** (`r.destinoEncomienda`)

## 🔎 Causa Raíz

### Problema 1: Estructura de Datos Incorrecta
**Ubicación**: `src/App.jsx` línea 656

```javascript
groups[city].rows.push({ ...d, id: d.id });
```

**Problema**: 
- `d` es un registro de la tabla `deposits`, que solo contiene:
  - `id`, `ciudad`, `fecha`, `monto_total`, `nota`, `estado`, `created_at`, `updated_at`
- Los `rows` deberían ser las **ventas individuales**, no los depósitos.

### Problema 2: Datos en JSON No Parseados
**Ubicación**: Campo `nota` en `deposits`

El campo `nota` contiene un JSON con:
```json
{
  "resumen": { ... },
  "ventas": [
    {
      "id": "...",
      "codigo_unico": "...",
      "total": 100,
      "gasto": 10,
      "precio": 100,
      "fecha": "2025-01-15",
      "sku": "...",
      "cantidad": 2,
      ...
    }
  ]
}
```

**Problema**: Este JSON no se está parseando ni extrayendo.

### Problema 3: Campos Faltantes en el Payload
**Ubicación**: `src/supabaseUtils.js` líneas 748-765

El `ventasPayload` que se guarda en `nota` solo incluye:
- ✅ `id`, `codigo_unico`, `total`, `gasto`, `precio`, `fecha`
- ✅ `sku`, `cantidad`, `sku_extra`, `cantidad_extra`
- ✅ `estado_entrega`, `sintetica_cancelada`

**Faltan**:
- ❌ `hora_entrega` → necesario para mostrar `hora`
- ❌ `vendedora` → necesario para mostrar `vendedor`
- ❌ `celular` → necesario para mostrar `celular`
- ❌ `metodo` → necesario para mostrar `Encomienda`
- ❌ `destino_encomienda` → necesario para mostrar destino
- ❌ `gasto_cancelacion` → necesario para canceladas
- ❌ `motivo` → necesario para canceladas

### Problema 4: Campos No Normalizados
**Ubicación**: `src/App.jsx` líneas 7208-7220

La tabla espera campos con nombres específicos:
- `r.hora` → pero en `sales` es `hora_entrega`
- `r.vendedor` → pero en `sales` es `vendedora`
- `r.ciudad` → necesita desnormalización (ej: "el_alto" → "EL ALTO")

## 📋 Plan de Solución por Fases

### **FASE 1: Parsear y Extraer Ventas del JSON**
**Objetivo**: Extraer las ventas del campo `nota` y usarlas como `rows`.

**Cambios**:
1. Parsear el campo `nota` de cada depósito.
2. Extraer el array `ventas` del JSON.
3. Reemplazar `groups[city].rows.push({ ...d, id: d.id })` con las ventas extraídas.

**Archivos a modificar**:
- `src/App.jsx` (líneas 652-680)

**Riesgo**: Bajo - Solo cambio de estructura de datos.

---

### **FASE 2: Obtener Datos Completos desde `sales`**
**Objetivo**: Obtener todos los campos necesarios desde la tabla `sales` usando los IDs.

**Cambios**:
1. Después de extraer las ventas del JSON, obtener los IDs únicos.
2. Consultar `sales` con esos IDs para obtener datos completos:
   - `hora_entrega`, `vendedora`, `celular`, `metodo`, `destino_encomienda`
   - `gasto_cancelacion`, `motivo`, `ciudad` (para desnormalizar)
3. Combinar datos del JSON con datos de `sales` (JSON tiene prioridad para campos básicos, `sales` para campos faltantes).

**Archivos a modificar**:
- `src/App.jsx` (líneas 652-680)

**Riesgo**: Medio - Requiere consulta adicional a Supabase.

---

### **FASE 3: Normalizar Campos para la Tabla**
**Objetivo**: Mapear campos de `sales` a los nombres esperados por la tabla.

**Cambios**:
1. Crear función de normalización que mapee:
   - `hora_entrega` → `hora`
   - `vendedora` → `vendedor`
   - `ciudad` → desnormalizar (ej: "el_alto" → "EL ALTO")
   - Mantener: `celular`, `precio`, `gasto`, `total`, `fecha`, `sku`, `cantidad`, etc.
2. Aplicar normalización a cada venta antes de agregarla a `rows`.

**Archivos a modificar**:
- `src/App.jsx` (líneas 652-680, función de normalización)

**Riesgo**: Bajo - Solo mapeo de nombres.

---

### **FASE 4: Mejorar Payload en `crearSnapshotDeposito` (Opcional)**
**Objetivo**: Incluir más campos en el payload para evitar consultas futuras.

**Cambios**:
1. Agregar campos faltantes al `ventasPayload` en `crearSnapshotDeposito`:
   - `hora_entrega`, `vendedora`, `celular`, `metodo`, `destino_encomienda`
   - `gasto_cancelacion`, `motivo`
2. Esto permitirá que futuros depósitos tengan todos los datos sin consultar `sales`.

**Archivos a modificar**:
- `src/supabaseUtils.js` (líneas 748-765)

**Riesgo**: Bajo - Solo agregar campos al payload.

---

## 🎯 Estrategia Recomendada

**Opción A: Solución Rápida (Fases 1-3)**
- Parsear JSON → Obtener datos de `sales` → Normalizar
- **Ventaja**: Funciona inmediatamente con datos existentes
- **Desventaja**: Requiere consulta adicional a Supabase cada vez

**Opción B: Solución Completa (Fases 1-4)**
- Parsear JSON → Obtener datos de `sales` → Normalizar → Mejorar payload
- **Ventaja**: Datos completos en el futuro sin consultas adicionales
- **Desventaja**: Depósitos antiguos seguirán necesitando consulta

**Recomendación**: **Opción A primero** (Fases 1-3) para solucionar el problema inmediato, luego **Fase 4** para optimizar.

---

## 📊 Campos Necesarios vs Disponibles

| Campo en Tabla | Campo en `sales` | Disponible en JSON | Disponible en `sales` |
|----------------|-----------------|-------------------|----------------------|
| `hora` | `hora_entrega` | ❌ | ✅ |
| `vendedor` | `vendedora` | ❌ | ✅ |
| `celular` | `celular` | ❌ | ✅ |
| `precio` | `precio` | ✅ | ✅ |
| `gasto` | `gasto` | ✅ | ✅ |
| `total` | `total` | ✅ | ✅ |
| `fecha` | `fecha` | ✅ | ✅ |
| `sku` | `sku` | ✅ | ✅ |
| `cantidad` | `cantidad` | ✅ | ✅ |
| `ciudad` | `ciudad` | ❌ | ✅ (necesita desnormalización) |
| `metodo` | `metodo` | ❌ | ✅ |
| `destinoEncomienda` | `destino_encomienda` | ❌ | ✅ |
| `gastoCancelacion` | `gasto_cancelacion` | ❌ | ✅ |
| `motivo` | `motivo` | ❌ | ✅ |

---

## ✅ Checklist de Implementación

### Fase 1
- [ ] Parsear campo `nota` de cada depósito
- [ ] Extraer array `ventas` del JSON
- [ ] Reemplazar `rows` con ventas extraídas
- [ ] Verificar que `computeResumen` funcione con nuevas `rows`

### Fase 2
- [ ] Obtener IDs únicos de todas las ventas
- [ ] Consultar `sales` con esos IDs
- [ ] Combinar datos del JSON con datos de `sales`
- [ ] Manejar casos donde `sales` no tenga el registro (fallback a JSON)

### Fase 3
- [ ] Crear función de normalización
- [ ] Mapear `hora_entrega` → `hora`
- [ ] Mapear `vendedora` → `vendedor`
- [ ] Desnormalizar `ciudad`
- [ ] Aplicar normalización a cada venta

### Fase 4 (Opcional)
- [ ] Agregar campos faltantes a `ventasPayload`
- [ ] Actualizar `crearSnapshotDeposito` para incluir nuevos campos
- [ ] Verificar que nuevos depósitos tengan todos los datos

---

## 🧪 Testing

Después de cada fase, verificar:
1. ✅ Las filas se muestran correctamente en la tabla
2. ✅ Todos los campos están visibles (hora, usuario, celular, precio, delivery, etc.)
3. ✅ Las cantidades por producto se muestran correctamente
4. ✅ El resumen se calcula correctamente
5. ✅ La edición de ventas funciona
6. ✅ La eliminación de ventas funciona


