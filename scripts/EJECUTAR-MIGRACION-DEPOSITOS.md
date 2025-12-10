# Ejecutar Migración de Depósitos desde Firebase a Supabase

## ⚠️ IMPORTANTE: MIGRACIÓN SEGURA

Este script **NO elimina** datos existentes. Solo inserta depósitos que no existen en Supabase.

## Requisitos Previos

1. **Credenciales de Firebase**:
   - Archivo `serviceAccountKey.json` en la raíz del proyecto
   - Este archivo contiene las credenciales de Firebase Admin SDK

2. **Variables de entorno de Supabase**:
   - `VITE_SUPABASE_URL` en `.env.local`
   - `SUPABASE_SERVICE_ROLE_KEY` en `.env.local`

## Pasos para Ejecutar

### 1. Verificar Credenciales

Asegúrate de tener:
- ✅ `serviceAccountKey.json` en la raíz del proyecto
- ✅ Variables de entorno configuradas en `.env.local`

### 2. Ejecutar el Script

```bash
node scripts/migrate-deposits-complete.js
```

### 3. Revisar el Resumen

El script mostrará:
- ✅ Cantidad de depósitos migrados exitosamente
- ⏭️ Cantidad de depósitos omitidos (ya existían)
- ❌ Cantidad de errores (si los hay)
- 📊 Conteos de validación

## ¿Qué hace el script?

1. **Lee todos los documentos** de la colección `GenerarDeposito` en Firebase
2. **Para cada documento**:
   - Verifica si ya existe en Supabase (por ciudad y fecha)
   - Si no existe, crea un nuevo registro en `deposits`
   - Preserva la estructura completa: `resumen` + `ventas` en el campo `nota` (JSON)
3. **No modifica** depósitos existentes
4. **No elimina** ningún dato

## Estructura de Datos Migrada

Cada depósito de Firebase se migra con:
- `ciudad`: Normalizada (ej: "EL ALTO" → "el_alto")
- `fecha`: Convertida a formato date (YYYY-MM-DD)
- `monto_total`: Del campo `resumen.totalNeto` o `resumen.totalMonto`
- `nota`: JSON stringificado con `{ resumen: {...}, ventas: [...] }`
- `estado`: "pendiente", "confirmado", o "cancelado"
- `created_at`: Timestamp de creación
- `confirmed_at`: Timestamp de confirmación (si existe)

## Notas Importantes

- Los IDs de Firebase **no se preservan** (Firebase usa strings, Supabase usa UUIDs)
- Se creará un nuevo UUID para cada depósito migrado
- Si hay depósitos con misma ciudad y fecha, se omitirán (para evitar duplicados)
- El script es **idempotente**: puedes ejecutarlo múltiples veces sin problemas

## Solución de Problemas

### Error: "Variables de entorno de Supabase no configuradas"
- Verifica que `.env.local` tenga `VITE_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`

### Error: "serviceAccountKey.json not found"
- Asegúrate de tener el archivo de credenciales de Firebase en la raíz del proyecto

### Depósitos omitidos
- Si muchos depósitos se omiten, puede ser porque ya existen en Supabase
- Revisa los logs para ver qué depósitos se omitieron y por qué

## Después de la Migración

1. **Verificar en Supabase**: Revisa la tabla `deposits` para confirmar que los datos se migraron correctamente
2. **Verificar en la aplicación**: Ve al menú "Generar Depósito" en localhost y verifica que los datos aparezcan correctamente
3. **Si hay problemas**: Revisa los logs del script para identificar errores específicos


