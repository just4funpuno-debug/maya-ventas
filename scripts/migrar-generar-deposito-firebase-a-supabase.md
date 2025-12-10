# Migración de "Generar Depósito" desde Firebase (Vercel) a Supabase (localhost)

## ⚠️ IMPORTANTE: MIGRACIÓN SEGURA

Este script **NO elimina** datos existentes. Solo inserta depósitos que no existen en Supabase.

## Script Disponible

Usa el script: `scripts/migrate-deposits-complete.js`

Ver instrucciones detalladas en: `scripts/EJECUTAR-MIGRACION-DEPOSITOS.md`

## Estructura de Datos

### Firebase (Vercel)
- **Colección**: `GenerarDeposito`
- **Estructura de cada documento**:
  ```javascript
  {
    id: "firebase-doc-id",
    ciudad: "EL ALTO",
    createdAt: Timestamp,
    resumen: {
      ventasConfirmadas: number,
      ventasSinteticas: number,
      canceladasConCosto: number,
      totalPedidos: number,
      totalMonto: number,
      totalDelivery: number,
      totalNeto: number,
      productos: { sku: cantidad, ... }
    },
    ventas: [
      {
        idPorCobrar: "id",
        idHistorico: "id",
        codigoUnico: "uuid",
        total: number,
        gasto: number,
        precio: number,
        fecha: string,
        sku: string,
        cantidad: number,
        skuExtra: string,
        cantidadExtra: number,
        estadoEntrega: string,
        sinteticaCancelada: boolean
      },
      ...
    ],
    estado: "pendiente"
  }
  ```

### Supabase (localhost)
- **Tabla**: `deposits`
- **Estructura**:
  ```sql
  {
    id: uuid,
    ciudad: text,
    fecha: date,
    monto_total: numeric,
    nota: text, -- JSON stringificado: { resumen: {...}, ventas: [...] }
    estado: text, -- 'pendiente', 'confirmado', 'cancelado'
    created_at: timestamptz,
    confirmed_at: timestamptz
  }
  ```

## Estrategia de Migración

1. **Leer todos los documentos de Firebase `GenerarDeposito`**
2. **Para cada documento**:
   - Verificar si ya existe en Supabase (por `ciudad`, `fecha`, y contenido de `nota`)
   - Si no existe, crear un nuevo registro en `deposits`
   - Convertir `ventas` array a formato Supabase (usar `id` en lugar de `idPorCobrar`/`idHistorico`)
   - Guardar `resumen` y `ventas` en el campo `nota` como JSON stringificado
3. **Preservar datos existentes**: Usar `ON CONFLICT DO NOTHING` o verificación previa

## Notas Importantes

- Los IDs de Firebase no se pueden preservar directamente (Firebase usa strings, Supabase usa UUIDs)
- Se creará un nuevo UUID para cada depósito migrado
- El script verificará duplicados antes de insertar
- No se eliminarán depósitos existentes en Supabase

