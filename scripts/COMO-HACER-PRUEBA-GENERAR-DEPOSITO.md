# 🧪 Cómo Hacer Prueba de "Generar Depósito" de Forma Segura

## ✅ Lo que SÍ pasa cuando generas un depósito:

1. **Las ventas desaparecen del menú "Ventas"** (de esa ciudad)
2. **Las ventas aparecen en "Generar Depósito"** (submenú de Historial)
3. **Las ventas SÍ aparecen en "Historial"** (no se pierden)

## ⚠️ Lo que NO pasa:

- ❌ Las ventas NO se eliminan de la base de datos
- ❌ Las ventas NO desaparecen de "Historial"
- ❌ Solo se marcan con `settled_at` (fecha de cobro)

---

## 🔄 Cómo Revertir un Depósito de Prueba:

### Opción 1: Usando SQL Script (Recomendado)

1. **Genera el depósito** desde el menú "Ventas" → "Generar Depósito"

2. **Ve a Supabase SQL Editor** y ejecuta:

```sql
-- Ver depósitos pendientes
SELECT 
  id,
  ciudad,
  fecha,
  monto_total,
  created_at
FROM generar_deposito
WHERE estado = 'pendiente'
ORDER BY created_at DESC
LIMIT 5;
```

3. **Copia el ID** del depósito que acabas de crear

4. **Ejecuta el script de reversión** (`scripts/revertir-deposito-prueba.sql`):
   - Abre el archivo
   - Reemplaza `'DEPOSIT_ID_AQUI'` con el ID que copiaste
   - Ejecuta el bloque `DO $$`

5. **Verifica** que las ventas volvieron al menú "Ventas"

---

### Opción 2: Desde el Menú "Generar Depósito" (Futuro)

En el futuro, podríamos agregar un botón "Eliminar Depósito" en el menú "Generar Depósito" que:
- Elimine el depósito
- Restaure las ventas al menú "Ventas"

---

## 📋 Checklist para Prueba Segura:

- [ ] Hacer la prueba en una ciudad con pocas ventas (para facilitar la reversión)
- [ ] Anotar el ID del depósito creado
- [ ] Verificar que las ventas aparecen en "Generar Depósito"
- [ ] Verificar que las ventas siguen en "Historial"
- [ ] Si quieres revertir: ejecutar el script SQL de reversión
- [ ] Verificar que las ventas volvieron al menú "Ventas"

---

## 💡 Recomendación:

**Para la primera prueba, usa una ciudad con 2-3 ventas confirmadas** para que sea fácil verificar y revertir si es necesario.


