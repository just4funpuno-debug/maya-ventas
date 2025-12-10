# Guía de Uso: Panel de Contactos Bloqueados

## Descripción

El Panel de Contactos Bloqueados permite visualizar y gestionar contactos que han sido marcados como bloqueados o que tienen una alta probabilidad de estar bloqueados.

## Acceso

1. Inicia sesión como **administrador**
2. En el menú lateral, selecciona **"🚫 Contactos Bloqueados"**
3. El panel se abrirá mostrando los contactos bloqueados y sospechosos

## Funcionalidades

### 1. Visualizar Contactos Bloqueados

**Pestaña "Bloqueados":**
- Muestra contactos con `is_blocked = true`
- Ordenados por fecha de actualización (más recientes primero)
- Cada contacto muestra:
  - Nombre y teléfono
  - Probabilidad de bloqueo (100%)
  - Mensajes consecutivos sin entregar
  - Última interacción
  - Notas (si existen)

### 2. Visualizar Contactos Sospechosos

**Pestaña "Sospechosos":**
- Muestra contactos con probabilidad 50-79% y `is_blocked = false`
- Ordenados por probabilidad (mayor primero)
- Estos contactos requieren revisión manual

### 3. Estadísticas en Tiempo Real

El panel muestra estadísticas actualizadas:
- **Total**: Número total de contactos
- **Bloqueados**: Contactos marcados como bloqueados
- **Sospechosos**: Contactos con probabilidad 50-79%
- **Activos**: Contactos sin problemas

### 4. Búsqueda y Filtros

**Búsqueda:**
- Busca por nombre o teléfono del contacto
- Los resultados se filtran en tiempo real

**Filtro por cuenta:**
- Selecciona una cuenta WhatsApp específica
- Solo muestra contactos de esa cuenta

### 5. Reactivar Contacto

Si un contacto fue marcado incorrectamente como bloqueado:

1. Selecciona el contacto bloqueado
2. Haz clic en **"Reactivar"** (botón verde)
3. Confirma la acción en el modal
4. El contacto será:
   - Marcado como `is_blocked = false`
   - Probabilidad reseteada a 0%
   - Contadores de mensajes sin entregar reseteados
   - Issues marcados como resueltos
   - Secuencias reanudadas automáticamente

### 6. Agregar Nota

Para documentar información sobre un contacto:

1. Selecciona el contacto
2. Haz clic en **"Nota"** (botón azul)
3. Escribe la nota en el modal
4. Haz clic en **"Guardar"**
5. La nota se guardará con timestamp automático

**Formato de notas:**
- Cada nota se agrega con timestamp: `[DD/MM/YYYY, HH:MM:SS] Nota`
- Las notas se concatenan con saltos de línea
- Útil para documentar decisiones y contexto

### 7. Eliminar Contacto

Si un contacto ya no es relevante:

1. Selecciona el contacto
2. Haz clic en **"Eliminar"** (botón rojo)
3. Confirma la acción en el modal
4. ⚠️ **Advertencia**: Esta acción elimina el contacto permanentemente y no se puede deshacer

## Información Detallada

Cada contacto muestra:

### Métricas
- **Probabilidad**: Porcentaje de probabilidad de bloqueo (0-100%)
- **Sin entregar**: Número de mensajes consecutivos sin entregar

### Interacciones
- **Última interacción**: Fecha y hora de la última interacción
- **Fuente**: Si fue del cliente o del sistema

### Notas
- Historial de notas agregadas
- Timestamps automáticos
- Útil para documentar decisiones

## Casos de Uso

### Caso 1: Contacto Bloqueado Incorrectamente

**Situación**: Un contacto fue marcado como bloqueado pero los mensajes se están entregando.

**Solución**:
1. Verifica el estado de los mensajes en WhatsApp
2. Si se están entregando, reactiva el contacto
3. Agrega una nota explicando la situación

### Caso 2: Contacto Sospechoso

**Situación**: Un contacto tiene probabilidad 65% pero no está bloqueado.

**Solución**:
1. Revisa los mensajes enviados recientemente
2. Verifica el estado en WhatsApp
3. Si es un falso positivo, agrega una nota
4. Si realmente está bloqueado, espera a que el sistema lo marque automáticamente

### Caso 3: Limpieza de Contactos

**Situación**: Tienes muchos contactos bloqueados antiguos que ya no son relevantes.

**Solución**:
1. Revisa cada contacto bloqueado
2. Elimina los que ya no son relevantes
3. Considera exportar datos antes de eliminar

## Mejores Prácticas

1. **Revisar regularmente**: Revisa contactos bloqueados y sospechosos semanalmente
2. **Documentar decisiones**: Agrega notas cuando reactives o elimines contactos
3. **No eliminar innecesariamente**: Los datos históricos son valiosos
4. **Verificar antes de reactivar**: Confirma que el contacto realmente no está bloqueado
5. **Monitorear estadísticas**: Revisa las estadísticas para identificar tendencias

## Troubleshooting

### No aparecen contactos bloqueados

1. Verifica que la detección automática esté funcionando
2. Revisa si hay contactos con `is_blocked = true` en la base de datos
3. Verifica que estés seleccionando la cuenta correcta

### Las estadísticas no se actualizan

1. Haz clic en **"Actualizar"** para refrescar los datos
2. Verifica la conexión con Supabase
3. Revisa la consola del navegador para errores

### No puedo reactivar un contacto

1. Verifica que tengas permisos de administrador
2. Revisa la consola del navegador para errores
3. Intenta refrescar la página

## Notas Técnicas

- Los contactos bloqueados tienen `is_blocked = true`
- Los contactos sospechosos tienen `block_probability >= 50% y < 80%` y `is_blocked = false`
- Las estadísticas se calculan dinámicamente desde la base de datos
- Las acciones requieren confirmación mediante modales
- Las notas se guardan con timestamp automático en formato español


