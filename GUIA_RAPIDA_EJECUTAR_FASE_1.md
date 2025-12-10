# 🚀 Guía Rápida: Ejecutar Migraciones FASE 1

## ⚡ Ejecución Rápida (Todo en Uno)

### Paso 1: Abrir SQL Editor
1. Ve a tu proyecto en Supabase
2. Click en **SQL Editor** (menú lateral izquierdo)
3. Click en **New Query**

### Paso 2: Ejecutar Todo
1. Abre el archivo `EJECUTAR_TODAS_MIGRACIONES_FASE_1.sql`
2. **Copia TODO el contenido** (Ctrl+A, Ctrl+C)
3. Pégalo en el SQL Editor de Supabase (Ctrl+V)
4. Click en **Run** o presiona `Ctrl+Enter`

### Paso 3: Verificar Resultados
Al final del script verás 3 consultas de verificación:
- ✅ **Tablas creadas:** Debe mostrar `3`
- ✅ **Funciones creadas:** Debe mostrar `7`
- ✅ **Pipelines creados:** Debe mostrar el número de productos no sintéticos

---

## ✅ Resultado Esperado

Si todo está correcto, verás:
```
Success. No rows returned
```

Y al final:
```
Tablas creadas: 3
Funciones creadas: 7
Pipelines creados: [número de productos]
```

---

## 🐛 Si Hay Errores

### Error: "relation already exists"
- **Significa:** Las tablas ya existen
- **Solución:** No es problema, el script usa `IF NOT EXISTS`

### Error: "foreign key constraint"
- **Significa:** Faltan tablas referenciadas
- **Solución:** Verifica que existan:
  - `whatsapp_contacts`
  - `whatsapp_accounts`
  - `products` o `almacen_central`
  - `users`

### Error: "permission denied"
- **Significa:** No tienes permisos
- **Solución:** Usa cuenta de administrador

---

## 📊 Verificación Detallada (Opcional)

Si quieres verificar paso a paso, ejecuta:

1. `scripts/test-leads-schema.sql` - Verificar tablas
2. `scripts/test-leads-functions.sql` - Verificar funciones
3. `scripts/test-default-pipelines.sql` - Verificar pipelines

---

## ✅ Una Vez Completado

Si todo está correcto:
- ✅ FASE 1 está completa
- ✅ Puedes continuar con FASE 2: Backend Services

---

**Tiempo estimado:** 2-3 minutos

