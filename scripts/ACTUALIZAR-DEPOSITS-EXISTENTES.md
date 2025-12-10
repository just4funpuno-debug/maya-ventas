# Actualizar Depósitos Existentes con Estructura Completa

## Situación Actual

Los depósitos en Supabase existen pero pueden no tener el campo `nota` con la estructura completa (`resumen` + `ventas`).

## Opciones

### Opción 1: Verificar estructura actual
Ejecuta el script `scripts/verificar-deposits-nota.sql` en el SQL Editor de Supabase para ver qué estructura tienen los depósitos actuales.

### Opción 2: Actualizar depósitos desde Firebase
Si los depósitos en Firebase tienen la estructura completa pero los de Supabase no, podemos:
1. Modificar el script para **actualizar** depósitos existentes (no solo crear nuevos)
2. O crear un script específico para actualizar solo el campo `nota`

### Opción 3: Re-migrar forzando actualización
Modificar el script para que actualice depósitos existentes con datos de Firebase si Firebase tiene más información.

## Recomendación

1. **Primero**: Ejecuta `verificar-deposits-nota.sql` para ver qué estructura tienen
2. **Luego**: Decidimos si necesitamos actualizar los depósitos existentes o si el problema es otro


