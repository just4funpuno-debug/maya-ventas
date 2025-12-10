# 📋 Instrucciones para Ejecutar Schema en Supabase

## ✅ Variables de Entorno Configuradas

El archivo `.env.local` ya está configurado con:
- `VITE_SUPABASE_URL=https://alwxhiombhfjyzyizyxz.supabase.co`
- `VITE_SUPABASE_ANON_KEY=eyJhbGci...`

---

## 🚀 Pasos para Ejecutar el Schema

### 1. Acceder al SQL Editor de Supabase

1. Ve a tu proyecto en [supabase.com](https://supabase.com)
2. En el menú lateral, haz clic en **"SQL Editor"**
3. Haz clic en **"New query"**

### 2. Ejecutar el Schema

**Opción A: Copiar y pegar el contenido completo**

1. Abre el archivo `supabase-schema-updated.sql` en tu editor
2. Copia TODO el contenido
3. Pégalo en el SQL Editor de Supabase
4. Haz clic en **"Run"** (o presiona `Ctrl+Enter`)

**Opción B: Ejecutar por partes (recomendado para primera vez)**

Si prefieres ejecutar por partes para verificar cada paso:

1. **Primero:** Extensiones y tablas base
   ```sql
   -- Copia desde "CREATE EXTENSION" hasta "CREATE TABLE users"
   ```

2. **Segundo:** Tablas principales
   ```sql
   -- Copia "CREATE TABLE deposits", "CREATE TABLE sales", "CREATE TABLE city_stock"
   ```

3. **Tercero:** Tablas secundarias
   ```sql
   -- Copia "CREATE TABLE dispatches", "team_messages", "numbers", etc.
   ```

4. **Cuarto:** Triggers e índices
   ```sql
   -- Copia desde "CREATE OR REPLACE FUNCTION" hasta los índices
   ```

5. **Quinto:** RLS y políticas
   ```sql
   -- Copia desde "ALTER TABLE ... ENABLE ROW LEVEL SECURITY" hasta el final
   ```

### 3. Verificar que se Crearon las Tablas

Después de ejecutar el schema:

1. Ve a **"Table Editor"** en el menú lateral
2. Deberías ver estas tablas:
   - ✅ `products`
   - ✅ `users`
   - ✅ `deposits`
   - ✅ `sales`
   - ✅ `city_stock`
   - ✅ `dispatches`
   - ✅ `team_messages`
   - ✅ `numbers`
   - ✅ `deposit_snapshots`
   - ✅ `resets`

### 4. Verificar Vistas

1. Ve a **"Database"** → **"Views"**
2. Deberías ver:
   - ✅ `v_sales_net`
   - ✅ `v_sales_pending_payment`
   - ✅ `v_sales_history`

---

## ✅ Checklist de Verificación

Después de ejecutar el schema, verifica:

- [ ] Todas las tablas se crearon sin errores
- [ ] Los índices se crearon correctamente
- [ ] Las políticas RLS están activas
- [ ] Las vistas se crearon correctamente
- [ ] No hay errores en el SQL Editor

---

## 🧪 Probar Conexión

Una vez ejecutado el schema, puedes probar la conexión:

```bash
# Probar que las variables de entorno funcionan
node -e "import('dotenv/config').then(() => import('./scripts/validate-counts.js'))"
```

O ejecutar el script de validación (aunque aún no haya datos):

```bash
npm run migration:validate
```

---

## 📝 Notas Importantes

1. **El schema es idempotente:** Puedes ejecutarlo múltiples veces sin problemas (usa `IF NOT EXISTS`)

2. **RLS Permisivo:** Las políticas actuales permiten todo (para desarrollo). En producción, deberás restringirlas.

3. **Campos Nuevos en `sales`:**
   - `deleted_from_pending_at` - Para soft delete de ventas por cobrar
   - `deposit_id` - Referencia a tabla `deposits`
   - `codigo_unico` - Para compatibilidad durante migración
   - `estado_pago` - Estado de pago de la venta
   - `entregada_at`, `fecha_cobro` - Timestamps adicionales

4. **Tabla `city_stock` Normalizada:** Ahora es una tabla normalizada en lugar de JSON plano.

---

## 🚨 Si Hay Errores

Si encuentras errores al ejecutar el schema:

1. **Revisa los mensajes de error** en el SQL Editor
2. **Verifica que no existan tablas con nombres conflictivos**
3. **Asegúrate de tener permisos** de administrador en el proyecto
4. **Ejecuta por partes** para identificar dónde falla

---

## ✅ Siguiente Paso

Una vez que el schema esté ejecutado correctamente:

1. ✅ Ejecutar backup completo: `npm run migration:backup`
2. ✅ Comenzar Fase 1: Migración de datos base

---

**¿Listo para ejecutar el schema?** Avísame cuando lo hayas ejecutado y verificamos que todo esté correcto.



