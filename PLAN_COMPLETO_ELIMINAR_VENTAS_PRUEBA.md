# 📋 Plan Completo: Eliminar Ventas "PRUEBA" del 30/11/2025

## ✅ Información Confirmada

- **Fecha:** "30/11/2025" (2025-11-30) ✅ FECHA PASADA (hoy es 5/12/2025)
- **Ciudad:** "PRUEBA"
- **Tipo de eliminación:** **COMPLETAMENTE** (Hard Delete - Eliminación física permanente)
- **Restaurar stock:** **NO** (solo fueron ventas de prueba sobre nuevos flujos)
- **Primero consultar:** **SÍ** (ver cuántas ventas hay antes de eliminar)

---

## 🔍 Análisis del Sistema

### **Tabla de Ventas:**
- Nombre: `ventas` (no `sales`)
- Ciudad puede estar normalizada: "prueba" (minúsculas)
- Formato fecha: YYYY-MM-DD (2025-11-30)

### **Funciones de Eliminación Existentes:**
- `eliminarVentaPendiente()` - Para ventas pendientes
- `cancelarVentaConfirmada()` - Para ventas confirmadas (restaura stock)
- **NO existe función para eliminación masiva**

### **Estrategia:**
1. **Crear script SQL** para consultar primero
2. **Crear script SQL** para eliminación masiva
3. **Ejecutar consulta** y mostrar resultados
4. **Confirmar** antes de eliminar
5. **Ejecutar eliminación**

---

## 📝 Scripts a Crear

### **Script 1: CONSULTA (YA CREADO)**
- `CONSULTA_VENTAS_PRUEBA_30_11_2025.sql`
- ✅ Solo consulta, NO elimina
- Muestra todas las ventas encontradas

### **Script 2: ELIMINACIÓN MASIVA (A CREAR)**
- `ELIMINAR_VENTAS_PRUEBA_30_11_2025.sql`
- Elimina todas las ventas de "PRUEBA" del 30/11/2025
- **HARD DELETE** (eliminación física permanente)
- **NO restaura stock** (como solicitaste)

---

## ⚠️ ADVERTENCIAS IMPORTANTES

### **1. Eliminación Permanente:**
- ❌ **NO se puede deshacer**
- ❌ **NO hay backup automático**
- ✅ **Solo afecta ventas de "PRUEBA" del 30/11/2025**

### **2. Sin Restauración de Stock:**
- ✅ Como solicitaste, **NO restauraremos stock**
- ✅ Son solo ventas de prueba

### **3. Dependencias:**
- ⚠️ Si hay ventas en depósitos, puede afectar registros
- ⚠️ El script verificará dependencias primero

---

## 🎯 Plan de Ejecución

### **PASO 1: Consulta** ⏳
1. Ejecutar `CONSULTA_VENTAS_PRUEBA_30_11_2025.sql` en Supabase SQL Editor
2. Revisar resultados
3. Contar cuántas ventas se encontraron
4. Verificar estados y dependencias

### **PASO 2: Confirmación**
1. Mostrar resultados al usuario
2. Confirmar que son las ventas correctas
3. Confirmar eliminación

### **PASO 3: Eliminación**
1. Ejecutar script de eliminación
2. Verificar que se eliminaron correctamente
3. Confirmar finalización

---

## 📄 Scripts Creados

1. ✅ `CONSULTA_VENTAS_PRUEBA_30_11_2025.sql` - Consulta (sin eliminar)
2. ⏳ `ELIMINAR_VENTAS_PRUEBA_30_11_2025.sql` - Eliminación masiva (a crear)

---

## ❓ Confirmación Final

**Antes de crear el script de eliminación, confirma:**

1. ✅ Fecha: "30/11/2025" (2025-11-30)
2. ✅ Ciudad: "PRUEBA"
3. ✅ Eliminación: **COMPLETA** (hard delete)
4. ✅ Stock: **NO restaurar**
5. ✅ Primero consultar: **SÍ**

**¿Procedo a crear el script de eliminación?**

---

**⏳ ESPERANDO CONFIRMACIÓN FINAL ANTES DE CREAR SCRIPT DE ELIMINACIÓN**



