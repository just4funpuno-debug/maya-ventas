# 📊 Flujo Detallado: Menú "Historial"

## 📋 Índice
1. [Vista General](#vista-general)
2. [Carga de Datos](#carga-de-datos)
3. [Estructura del Componente](#estructura-del-componente)
4. [Filtros y Visualización](#filtros-y-visualización)
5. [Gráfico de Ventas](#gráfico-de-ventas)
6. [Tabla de Historial](#tabla-de-historial)
7. [Cálculos y Totales](#cálculos-y-totales)

---

## 🎯 Vista General

El menú "Historial" muestra:
- ✅ **Ventas confirmadas** (estado: `entregada` o `confirmado`)
- ✅ **Ventas canceladas** con costo (filas sintéticas negativas)
- ✅ **Ventas pendientes** (opcional, para referencia)
- ❌ **NO incluye** "Generar Depósito" (menú separado)

### Propósito
- Visualizar historial completo de ventas
- Análisis temporal de ventas (gráficos)
- Filtrado por período, ciudad, fechas
- Ver comprobantes de ventas

---

## 📥 Carga de Datos

### Suscripción a Datos

Cuando el usuario entra a la vista `historial`:

```javascript
// En App.jsx, cuando view === 'historial'
unsub = subscribeCollection('ventashistorico', (historico) => {
  // Normalizar timestamps
  let base = Date.now() - historico.length;
  const normalizadas = historico.map(s => {
    let next = s;
    // Agregar confirmadoAt si falta
    if ((next.estadoEntrega || 'confirmado') === 'confirmado' && !next.confirmadoAt) {
      next = { ...next, confirmadoAt: ++base };
    }
    // Agregar canceladoAt si falta
    if (next.estadoEntrega === 'cancelado' && !next.canceladoAt) {
      next = { ...next, canceladoAt: ++base };
    }
    // Mapear vendedoraId si falta
    if (!next.vendedoraId && next.vendedora) {
      const match = seedUsers.find(u => 
        (`${u.nombre} ${u.apellidos}`.trim().toLowerCase() === next.vendedora.trim().toLowerCase())
      );
      if (match) next = { ...next, vendedoraId: match.id };
    }
    return next;
  });
  setSales(normalizadas);
}, {
  orderBy: { column: 'created_at', ascending: false }
});
```

### Mapeo de Tabla

```javascript
// En supabaseUsers.js
tableMap = {
  'ventashistorico': 'sales'  // Mapea a tabla 'sales' en Supabase
}

// Filtro aplicado en normalizeData:
case 'ventashistorico':
  return data
    .filter(s => ['confirmado', 'entregada', 'cancelado'].includes(s.estado_entrega))
    .map(s => normalizeSale(s));
```

### Datos Incluidos

El historial incluye ventas con:
- `estado_entrega = 'entregada'` → Ventas entregadas
- `estado_entrega = 'confirmado'` → Ventas confirmadas (legacy)
- `estado_entrega = 'cancelado'` → Ventas canceladas

---

## 🧩 Estructura del Componente

### Componente: HistorialView

```javascript
function HistorialView({ 
  sales,        // Array de ventas del historial
  products,     // Array de productos
  session,      // Sesión del usuario
  users,        // Array de usuarios
  onOpenReceipt,// Callback para abrir comprobante
  onGoDeposit   // Callback para ir a "Generar Depósito"
})
```

### Procesamiento de Datos

#### 1. Filtrar Ventas Confirmadas
```javascript
const confirmedBase = sales.filter(s => 
  s.estadoEntrega === 'entregada' || 
  s.estadoEntrega === 'confirmado'
);
```

#### 2. Incluir Canceladas con Costo
```javascript
const canceladasConCosto = sales
  .filter(s => s.estadoEntrega === 'cancelado' && Number(s.gastoCancelacion || 0) > 0)
  .map(s => ({
    ...s,
    id: s.id + ':canc',  // ID visual extra
    total: -Number(s.gastoCancelacion || 0),  // Total negativo
    gasto: Number(s.gastoCancelacion || 0),   // Gasto positivo
    neto: -Number(s.gastoCancelacion || 0),   // Neto negativo
    cantidad: 0,
    cantidadExtra: 0,
    sku: '',
    skuExtra: '',
    sinteticaCancelada: true,
    confirmadoAt: s.confirmadoAt || s.canceladoAt || 0
  }));

confirmadas = [...confirmedBase, ...canceladasConCosto];
```

#### 3. Incluir Pendientes (Opcional)
```javascript
const pendientesTabla = sales
  .filter(s => (s.estadoEntrega || '') === 'pendiente')
  .map(s => ({ ...s, esPendiente: true, neto: 0 }));

let tablaVentas = [...confirmadas, ...pendientesTabla];
```

#### 4. Filtro por Grupo (Vendedoras)
```javascript
if (session?.rol !== 'admin') {
  const myGroup = session.grupo || (users.find(u => u.id === session.id)?.grupo) || '';
  if (myGroup) {
    const filtroGrupo = (arr) => arr.filter(s => {
      const vId = s.vendedoraId;
      if (vId) {
        const vu = users.find(u => u.id === vId);
        return vu ? vu.grupo === myGroup : false;
      }
      const vu = users.find(u => 
        (`${u.nombre} ${u.apellidos}`.trim().toLowerCase() === (s.vendedora || '').trim().toLowerCase())
      );
      return vu ? vu.grupo === myGroup : false;
    });
    confirmadas = filtroGrupo(confirmadas);
    tablaVentas = filtroGrupo(tablaVentas);
  }
}
```

#### 5. Ordenar y Normalizar
```javascript
const rows = useMemo(() => tablaVentas
  .slice()
  .sort((a, b) => {
    // 1. Prioridad: timestamps (reciente primero)
    const ta = a.confirmadoAt || a.canceladoAt || 0;
    const tb = b.confirmadoAt || b.canceladoAt || 0;
    if (tb !== ta) return tb - ta;
    
    // 2. Por fecha textual (más reciente primero)
    if ((a.fecha || '') !== (b.fecha || '')) {
      return (b.fecha || '').localeCompare(a.fecha || '');
    }
    
    // 3. Por ID descendente (estabilidad)
    return (b.id || '').localeCompare(a.id || '');
  })
  .map(s => {
    // Normalizar cada venta para la tabla
    const p1 = products.find(p => p.sku === s.sku);
    const p2 = s.skuExtra ? products.find(p => p.sku === s.skuExtra) : null;
    
    // Calcular precio unitario
    const precioUnit = s.precio != null ? Number(s.precio) : 0;
    
    // Calcular neto (lógica compleja para evitar doble resta de gasto)
    let netoCalc;
    if (s.sinteticaCancelada) {
      netoCalc = s.neto != null ? Number(s.neto) : ((s.total ?? 0) - s.gasto);
    } else if (s.total != null) {
      // Heurísticas para determinar si total ya es neto o bruto
      const isTotalAlreadyNet = Math.abs((precioUnit - s.gasto) - s.total) < 0.000001;
      const isTotalBruto = Math.abs(precioUnit - s.total) < 0.000001;
      if (isTotalAlreadyNet) {
        netoCalc = s.total;  // Ya es neto
      } else if (isTotalBruto) {
        netoCalc = s.total - s.gasto;  // Restar gasto
      } else {
        netoCalc = s.total - s.gasto;  // Asumir bruto
      }
    } else {
      netoCalc = precioUnit - s.gasto;  // Derivar de precio
    }
    
    return {
      id: s.id || '(sin id)',
      fecha: s.fecha || '(sin fecha)',
      hora: s.horaEntrega || '',
      ciudad: s.ciudad || '(sin ciudad)',
      vendedor: s.vendedora || s.vendedoraId || '(sin vendedora)',
      productos: [p1?.nombre || s.sku || '(sin producto)', p2 ? p2.nombre : null]
        .filter(Boolean).join(' + '),
      cantidades: [s.cantidad ?? '', s.cantidadExtra ?? '']
        .filter(v => v !== '').join(' + '),
      precio: precioUnit,
      total: s.total,
      gasto: Number(s.gasto || 0),
      neto: netoCalc,
      metodo: s.metodo || '(sin método)',
      celular: s.celular || '',
      comprobante: s.comprobante,
      destinoEncomienda: s.destinoEncomienda,
      motivo: s.motivo,
      sku: s.sku,
      cantidad: s.cantidad,
      skuExtra: s.skuExtra,
      cantidadExtra: s.cantidadExtra,
      sinteticaCancelada: !!s.sinteticaCancelada,
      gastoCancelacion: s.gastoCancelacion,
      esPendiente: !!s.esPendiente,
      estadoEntrega: s.estadoEntrega || (s.esPendiente ? 'pendiente' : 'confirmado'),
      _raw: s
    };
  }), [tablaVentas, products]);
```

---

## 🔍 Filtros y Visualización

### Filtros Disponibles

#### 1. Filtro por Período
```javascript
const [tableFilter, setTableFilter] = useState('all');
// Opciones: 'all', 'today', 'week', 'month'
```

**Lógica de Filtrado:**
```javascript
function keepByFilter(r) {
  if (tableFilter === 'all') return true;
  if (tableFilter === 'today') return r.fecha === hoy;
  if (tableFilter === 'week') {
    // Últimos 7 días incluyendo hoy
    const d = new Date(r.fecha + "T00:00:00");
    return d >= weekAgo;
  }
  if (tableFilter === 'month') return r.fecha.slice(0, 7) === hoy.slice(0, 7);
  return true;
}
```

#### 2. Filtro por Ciudad
```javascript
const [cityFilter, setCityFilter] = useState('all');
// Opciones: 'all' o nombre de ciudad específica
```

#### 3. Filtro por Rango de Fechas
```javascript
const [dateStart, setDateStart] = useState('');
const [dateEnd, setDateEnd] = useState('');
// Formato: YYYY-MM-DD
```

### Aplicación de Filtros

```javascript
const filteredRows = rows.filter(r => {
  if (!keepByFilter(r)) return false;
  if (cityFilter !== 'all' && r.ciudad !== cityFilter) return false;
  if (dateStart && r.fecha < dateStart) return false;
  if (dateEnd && r.fecha > dateEnd) return false;
  return true;
});
```

### Paginación

```javascript
const pageSize = 50;  // 50 registros por página
const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
const safePage = Math.min(page, totalPages);
const pageRows = filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize);
```

---

## 📈 Gráfico de Ventas

### Componente: ChartVentas

**Solo visible para administradores**

```javascript
function ChartVentas({ period, sales, products }) {
  // period: 'week' | 'month' | 'quarter'
  // sales: Array de ventas normalizadas (rows)
  // products: Array de productos
}
```

### Períodos Disponibles

#### 1. Semana (últimos 7 días)
```javascript
if (period === 'week') {
  const days = [...Array(7)].map((_, i) => 
    shiftISO(baseTodayISO, -(6 - i))
  );
  const map = Object.fromEntries(days.map(d => [d, 0]));
  elegibles.forEach(s => {
    if (map[s.fecha] != null) map[s.fecha] += totalFila(s);
  });
  return days.map(d => ({ label: d, total: map[d] }));
}
```

#### 2. Mes (días del mes actual)
```javascript
if (period === 'month') {
  const [yearStr, monthStr] = baseTodayISO.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const daysInMonth = new Date(year, month, 0).getDate();
  
  const map = {};
  for (let day = 1; day <= daysInMonth; day++) {
    const iso = `${yearStr}-${monthStr}-${String(day).padStart(2, '0')}`;
    map[iso] = 0;
  }
  
  elegibles.forEach(s => {
    if (map[s.fecha] != null) map[s.fecha] += totalFila(s);
  });
  
  return Object.keys(map).map(k => ({
    label: k.slice(8, 10),  // Solo día
    total: map[k]
  }));
}
```

#### 3. Trimestre (últimas 12 semanas)
```javascript
// quarter -> últimas 12 semanas
const weeks = [];
for (let i = 11; i >= 0; i--) {
  const endISO = shiftISO(baseTodayISO, -(i * 7));
  const startISO = shiftISO(endISO, -6);
  weeks.push({ startISO, endISO, total: 0 });
}

elegibles.forEach(s => {
  const val = totalFila(s);
  if (!val) return;
  for (const w of weeks) {
    if (s.fecha >= w.startISO && s.fecha <= w.endISO) {
      w.total += val;
      break;
    }
  }
});

return weeks.map(w => ({ label: w.startISO, total: w.total }));
```

### Cálculo de Total por Fila

```javascript
function totalFila(s) {
  // Si tiene campo 'total' explícito, usarlo
  if (typeof s.total === 'number') return Number(s.total);
  
  // Reconstruir desde precio y cantidades
  const p1 = products.find(p => p.sku === s.sku);
  const p2 = s.skuExtra ? products.find(p => p.sku === s.skuExtra) : null;
  const bruto = 
    (Number(p1?.precio || s.precio || 0) * Number(s.cantidad || 0)) +
    (s.skuExtra ? Number(p2?.precio || 0) * Number(s.cantidadExtra || 0) : 0);
  
  return bruto;  // No restar gasto (refleja sumatoria de columna total)
}
```

### Visualización

- **Biblioteca**: Recharts (BarChart)
- **Eje X**: Fechas o períodos
- **Eje Y**: Montos en Bs
- **Incrementos**: 250 Bs (para semana y mes)
- **Color**: Naranja (#f09929)

---

## 📋 Tabla de Historial

### Columnas de la Tabla

1. **Fecha** - Fecha de la venta (DD/MM/YYYY)
2. **Hora** - Hora de entrega
3. **Ciudad** - Ciudad donde se realizó la venta
4. **Encomienda** - Destino (si método es Encomienda) o motivo (si cancelada)
5. **Usuario** - Nombre del vendedor (solo primer nombre)
6. **Columnas de Productos** - Una columna por cada producto no sintético
7. **Precio** - Precio unitario (solo para no canceladas)
8. **Delivery** - Gasto de delivery o gasto de cancelación
9. **Total** - Neto (precio - gasto, o total negativo si cancelada)
10. **Celular** - Número de celular del cliente
11. **Comp.** - Botón para ver comprobante (si existe)

### Formato de Filas

#### Ventas Normales
```javascript
<tr className="border-t border-neutral-800">
  <td>{toDMY(r.fecha)}</td>
  <td>{r.hora}</td>
  <td>{r.ciudad}</td>
  <td>{r.destinoEncomienda || r.motivo || ''}</td>
  <td>{firstName(r.vendedor)}</td>
  {/* Columnas de productos con cantidades */}
  <td>{currency(r.precio)}</td>
  <td>{currency(r.gasto)}</td>
  <td>{currency(r.neto)}</td>
  <td>{r.celular}</td>
  <td>
    {r.comprobante && (
      <button onClick={() => onOpenReceipt(sale)}>
        <Search className="w-3 h-3" />
      </button>
    )}
  </td>
</tr>
```

#### Ventas Canceladas con Costo
```javascript
<tr className="border-t border-neutral-800 bg-red-900/10">
  <td className="text-red-400">{toDMY(r.fecha)}</td>
  {/* ... otras columnas ... */}
  <td className="text-red-400">{/* Precio vacío */}</td>
  <td className="text-red-400">{currency(r.gastoCancelacion)}</td>
  <td className="text-red-400">{currency(r.neto)}</td>
  {/* ... */}
  <td>
    <span className="text-[10px] font-semibold text-red-400">Cancelado</span>
  </td>
</tr>
```

### Indicadores Visuales

- **Fondo rojo claro**: Ventas canceladas con costo
- **Texto rojo**: Totales negativos o canceladas
- **Fondo rojo muy claro**: Totales negativos (no canceladas)

---

## 🧮 Cálculos y Totales

### Totales por Página

```javascript
const pageTotals = (() => {
  const skuTotals = {};
  let precio = 0, delivery = 0, neto = 0;
  
  pageRows.forEach(r => {
    // Sumar cantidades por SKU
    if (r.sku) skuTotals[r.sku] = (skuTotals[r.sku] || 0) + Number(r.cantidad || 0);
    if (r.skuExtra) skuTotals[r.skuExtra] = (skuTotals[r.skuExtra] || 0) + Number(r.cantidadExtra || 0);
    
    // Sumar montos
    if (r.sinteticaCancelada) {
      delivery += Number(r.gastoCancelacion || 0);
      neto += Number(r.neto || 0);
    } else {
      precio += Number(r.precio || 0);  // Precio unitario
      delivery += Number(r.gasto || 0);
      neto += Number(r.neto || 0);
    }
  });
  
  return { skuTotals, precio, delivery, neto };
})();
```

### Fila de Totales

```javascript
<tfoot>
  <tr className="border-t border-neutral-800 bg-neutral-900/40">
    <td colSpan={5}>Totales (página)</td>
    {/* Totales por producto */}
    {productOrder.map(sku => (
      <td className="font-semibold text-[#e7922b]">
        {pageTotals.skuTotals[sku] || ''}
      </td>
    ))}
    {/* Totales de montos */}
    <td className="font-bold text-[#e7922b]">
      {currency(totalPrecioPage)}
    </td>
    <td className="font-bold text-[#e7922b]">
      {currency(pageTotals.delivery)}
    </td>
    <td className="font-bold text-[#e7922b]">
      {currency(pageTotals.neto)}
    </td>
  </tr>
</tfoot>
```

---

## 🔄 Flujo Completo

### 1. Carga Inicial
```
Usuario entra a "Historial"
  ↓
subscribeCollection('ventashistorico')
  ↓
Filtra: estado_entrega IN ('confirmado', 'entregada', 'cancelado')
  ↓
Normaliza datos (timestamps, vendedoraId)
  ↓
setSales(normalizadas)
```

### 2. Procesamiento
```
HistorialView recibe sales
  ↓
Filtra confirmadas + canceladas con costo
  ↓
Crea filas sintéticas para canceladas
  ↓
Aplica filtro por grupo (si vendedora)
  ↓
Ordena por timestamp/fecha/ID
  ↓
Normaliza cada venta para tabla
```

### 3. Visualización
```
Aplica filtros (período, ciudad, fechas)
  ↓
Paginación (50 por página)
  ↓
Renderiza gráfico (solo admin)
  ↓
Renderiza tabla con ventas
  ↓
Muestra totales por página
```

---

## 📌 Notas Importantes

### Normalización de Ciudades
- **Base de datos**: `el_alto` (minúsculas, guiones bajos)
- **UI**: `EL ALTO` (mayúsculas, espacios)
- **Conversión**: Automática en `normalizeSale()`

### Cálculo de Neto
- **Heurísticas complejas** para evitar doble resta de gasto
- **Ventas canceladas**: Neto negativo = -gastoCancelacion
- **Ventas normales**: Neto = total - gasto (o precio - gasto si no hay total)

### Productos Sintéticos
- **Excluidos** de columnas de productos en tabla
- **Mostrados** en columna "Encomienda/Motivo"
- **No tienen** cantidades ni precios

### Filtro por Grupo
- **Vendedoras**: Solo ven ventas de su grupo
- **Admins**: Ven todas las ventas
- **Aplicado** antes de filtros de período/ciudad

---

## 🎯 Resumen

### Datos Mostrados
- ✅ Ventas entregadas
- ✅ Ventas confirmadas (legacy)
- ✅ Ventas canceladas con costo (filas sintéticas)
- ⚠️ Ventas pendientes (opcional, para referencia)

### Funcionalidades
- 📊 Gráfico de ventas (semana/mes/trimestre)
- 🔍 Filtros múltiples (período, ciudad, fechas)
- 📄 Paginación (50 por página)
- 📎 Ver comprobantes
- 🧮 Totales por página

### Restricciones
- **Gráfico**: Solo administradores
- **Filtro grupo**: Automático para vendedoras
- **Botón "Generar Depósito"**: Visible pero lleva a otro menú

---

*Última actualización: 29 de noviembre de 2025*


