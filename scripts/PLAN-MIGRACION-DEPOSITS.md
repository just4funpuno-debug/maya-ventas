# 📋 PLAN DE MIGRACIÓN: deposits → generar_deposito

## 🎯 Objetivo
Renombrar la tabla `deposits` a `generar_deposito` siguiendo un enfoque por fases para garantizar seguridad y control.

## 📊 Resumen de Fases

| Fase | Descripción | Estado |
|------|-------------|--------|
| **FASE 1** | Crear `generar_deposito`, migrar datos, crear vista `deposits` | ⏳ Pendiente |
| **FASE 2** | Actualizar referencias en código JavaScript | ⏳ Pendiente |
| **FASE 3** | Verificar y actualizar foreign keys | ⏳ Pendiente |
| **FASE 4** | Limpieza final (eliminar vista y backup) | ⏳ Pendiente |

---

## 🔄 FASE 1: Crear Tabla y Migrar Datos

### Objetivo
- Crear tabla `generar_deposito`
- Migrar todos los datos de `deposits` a `generar_deposito`
- Renombrar `deposits` a `deposits_backup`
- Crear vista `deposits` que apunta a `generar_deposito` (compatibilidad)

### Archivos
- `scripts/fase-1-renombrar-deposits.sql`
- `scripts/test-fase-1-renombrar-deposits.sql`
- `scripts/EJECUTAR-FASE-1-DEPOSITS.md`

### Testing
1. Verificar que `generar_deposito` tiene todos los registros
2. Verificar que la vista `deposits` funciona
3. Probar que la aplicación carga correctamente

---

## 💻 FASE 2: Actualizar Código JavaScript

### Objetivo
Actualizar todas las referencias de `deposits` a `generar_deposito` en el código.

### Archivos a Modificar

#### 1. `src/supabaseUsers.js`
```javascript
// Línea 36: Cambiar
'GenerarDeposito': 'deposits',
// A:
'GenerarDeposito': 'generar_deposito',
```

#### 2. `src/App.jsx`
```javascript
// Líneas 7301, 7315: Cambiar
.from('deposits')
// A:
.from('generar_deposito')
```

#### 3. `src/supabaseUtils.js`
```javascript
// Líneas 773, 904: Cambiar
.from('deposits')
// A:
.from('generar_deposito')
```

#### 4. `src/supabaseUtils-deposits.js`
```javascript
// Líneas 51, 75: Cambiar
.from('deposits')
// A:
.from('generar_deposito')
```

### Archivos
- `scripts/fase-2-renombrar-deposits.md`

### Testing
1. Compilar sin errores
2. Probar crear depósito
3. Probar eliminar depósito
4. Probar confirmar depósito
5. Verificar que no hay errores en consola

---

## 🔗 FASE 3: Verificar Foreign Keys

### Objetivo
- Verificar si `sales.deposit_id` tiene foreign key
- Actualizar foreign key para que apunte a `generar_deposito`

### Archivos
- `scripts/fase-3-renombrar-deposits.sql`
- `scripts/test-fase-3-renombrar-deposits.sql`

### Testing
1. Verificar que foreign key apunta a `generar_deposito`
2. Verificar integridad referencial
3. Probar que las ventas con `deposit_id` funcionan correctamente

---

## 🧹 FASE 4: Limpieza Final

### Objetivo
- Eliminar vista `deposits` (ya no necesaria)
- Opcionalmente eliminar `deposits_backup` (después de verificar)

### Archivos
- `scripts/fase-4-renombrar-deposits.sql`

### ⚠️ IMPORTANTE
- **NO eliminar `deposits_backup`** hasta estar 100% seguro de que todo funciona
- Se puede mantener como respaldo permanente

### Testing
1. Verificar que la aplicación funciona sin la vista
2. Verificar que no hay referencias a `deposits` en código
3. Probar todas las funcionalidades del menú "Generar Depósito"

---

## 📝 Checklist General

### Antes de Empezar
- [ ] Hacer backup completo de la base de datos
- [ ] Verificar que no hay operaciones activas
- [ ] Notificar al equipo sobre la migración

### Durante la Migración
- [ ] Ejecutar cada fase en orden
- [ ] Hacer testing después de cada fase
- [ ] Documentar cualquier problema encontrado

### Después de la Migración
- [ ] Verificar que todas las funcionalidades funcionan
- [ ] Verificar que no hay errores en logs
- [ ] Actualizar documentación si es necesario

---

## 🔄 Rollback Plan

Si algo sale mal en cualquier fase:

### FASE 1
```sql
-- Eliminar vista
DROP VIEW IF EXISTS deposits;
-- Renombrar backup de vuelta
ALTER TABLE deposits_backup RENAME TO deposits;
-- Eliminar tabla nueva
DROP TABLE IF EXISTS generar_deposito;
```

### FASE 2
- Revertir cambios en código JavaScript
- La vista `deposits` seguirá funcionando

### FASE 3
- Revertir foreign key si es necesario
- La aplicación seguirá funcionando

### FASE 4
- No hay rollback necesario (solo limpieza)

---

## 📊 Estructura de Tablas

### Antes
```
deposits (tabla)
```

### Después de FASE 1
```
deposits_backup (tabla) ← Backup
generar_deposito (tabla) ← Nueva tabla principal
deposits (vista) ← Apunta a generar_deposito
```

### Después de FASE 4
```
deposits_backup (tabla) ← Opcional mantener
generar_deposito (tabla) ← Tabla principal
```

---

## ✅ Criterios de Éxito Final

- [ ] `generar_deposito` es la única tabla activa
- [ ] Todas las referencias en código apuntan a `generar_deposito`
- [ ] Foreign keys actualizadas correctamente
- [ ] La aplicación funciona sin errores
- [ ] No hay referencias a `deposits` en código
- [ ] Vista `deposits` eliminada (o mantenida solo si es necesario)

---

## 📞 Soporte

Si encuentras problemas durante la migración:
1. Revisar logs de Supabase
2. Verificar errores en consola del navegador
3. Consultar scripts de testing de cada fase
4. Considerar rollback si es necesario


