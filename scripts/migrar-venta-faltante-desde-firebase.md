# Migrar Venta Faltante desde Firebase

## Venta a Buscar

- **Fecha**: 25/10/2025
- **Hora**: 4:00 PM
- **Ciudad**: SUCRE
- **Usuario**: Wendy
- **Celular**: 60322315
- **Total**: Bs 580,00
- **Delivery**: Bs 20,00
- **Cantidad**: 3 productos

## Pasos

1. **Primero**: Ejecuta `scripts/buscar-venta-faltante.sql` para verificar si la venta existe en Supabase
2. **Si no existe**: Necesitamos buscarla en Firebase y migrarla
3. **Si existe pero no está asociada**: Asociarla al depósito correcto

## Opciones

### Opción 1: Buscar en Firebase manualmente
- Ve a Firebase Console
- Colección `ventasporcobrar` o `ventashistorico`
- Busca por fecha 25/10/2025, ciudad SUCRE, vendedora Wendy
- Si la encuentras, podemos crear un script para migrarla

### Opción 2: Buscar en Firebase con script
- Podemos crear un script Node.js que busque en Firebase
- Luego la migre a Supabase

### Opción 3: Verificar si está en otro estado
- Puede que la venta esté en estado diferente (pendiente, cancelada, etc.)
- O puede que tenga datos ligeramente diferentes


