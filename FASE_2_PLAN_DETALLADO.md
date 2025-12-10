# FASE 2: Backend - Servicios - Plan Detallado

## 📋 Objetivo
Modificar los servicios backend para filtrar datos por productos asignados al usuario actual, utilizando las funciones SQL helper creadas en FASE 1.

---

## 🔍 Análisis Previo

### Información del Usuario
- Los usuarios tienen un campo `productos` (array de SKUs) en la tabla `users`
- El usuario actual se obtiene desde `session` en los componentes
- Los servicios necesitan recibir los SKUs del usuario para filtrar

### Estrategia de Filtrado
1. **Obtener SKUs del usuario**: Desde `session.productos` (array de SKUs)
2. **Convertir SKUs a product_ids**: Usar función SQL `get_product_ids_from_skus()`
3. **Obtener account_ids**: Usar función SQL `get_account_ids_by_user_skus()` o `get_account_ids_by_product_ids()`
4. **Filtrar datos**: Aplicar filtro por `account_id` en las consultas

---

## 📦 SUBFASE 2.1: Modificar `accounts.js` (1 hora)

### Cambios:
1. **`getAllAccounts(userSkus = null)`**:
   - Si `userSkus` es proporcionado, filtrar cuentas por productos del usuario
   - Usar función SQL `get_account_ids_by_user_skus(userSkus)`
   - Si es `null` o admin, retornar todas las cuentas

2. **`getAccountById(accountId, userSkus = null)`**:
   - Verificar que la cuenta pertenece a productos del usuario
   - Si no pertenece y no es admin, retornar error

### Testing:
- ✅ Obtener todas las cuentas (admin)
- ✅ Obtener cuentas filtradas por SKUs de usuario
- ✅ Obtener cuenta por ID con filtro
- ✅ Error al acceder a cuenta no permitida

---

## 📦 SUBFASE 2.2: Modificar `conversations.js` (1 hora)

### Cambios:
1. **`getConversations(options, userSkus = null)`**:
   - Agregar parámetro `userSkus`
   - Obtener `account_ids` permitidos usando `get_account_ids_by_user_skus()`
   - Filtrar mensajes por `account_id IN (account_ids)`
   - Filtrar contactos que tienen mensajes con cuentas permitidas

2. **`getContactMessages(contactId, options, userSkus = null)`**:
   - Filtrar mensajes por `account_id` permitidos

3. **`getLastMessage(contactId, userSkus = null)`**:
   - Filtrar por `account_id` permitidos

### Testing:
- ✅ Obtener conversaciones filtradas por productos
- ✅ Obtener mensajes de contacto filtrados
- ✅ Último mensaje filtrado correctamente

---

## 📦 SUBFASE 2.3: Modificar Otros Servicios (1.5 horas)

### Servicios a Modificar:

#### 1. `sequences.js`
- **`getSequences(accountId, userSkus = null)`**: Verificar que `accountId` pertenece a productos del usuario
- **`getSequenceById(sequenceId, userSkus = null)`**: Verificar permisos

#### 2. `puppeteer-queue.js`
- **`getQueueMessages(options, userSkus = null)`**: Filtrar por `account_id` permitidos
- **`getQueueStats(userSkus = null)`**: Estadísticas filtradas

#### 3. `tags.js` (opcional)
- **`getAllTags(userSkus = null)`**: Filtrar tags por productos (si aplica)
- **`getContactTags(contactId, userSkus = null)`**: Filtrar por productos

#### 4. `quick-replies.js` (opcional)
- **`getQuickReplies(userSkus = null)`**: Filtrar respuestas rápidas por productos (si aplica)

#### 5. `block-detector.js` / `blocked-contacts.js`
- Filtrar contactos bloqueados por `account_id` permitidos

### Testing:
- ✅ Cada servicio filtra correctamente por productos
- ✅ Admin ve todos los datos
- ✅ Usuario ve solo sus productos asignados

---

## 📦 SUBFASE 2.4: Testing Completo (1 hora)

### Tests Unitarios:
- Crear/actualizar tests para cada servicio modificado
- Verificar filtrado por productos
- Verificar permisos de admin

### Tests de Integración:
- Flujo completo: usuario → productos → cuentas → conversaciones
- Verificar que datos no permitidos no se muestran

---

## 📝 Notas de Implementación

### Helper Function para Obtener Account IDs
```javascript
/**
 * Obtener account_ids permitidos para un usuario
 * @param {Array<string>} userSkus - SKUs del usuario
 * @returns {Promise<Array<string>>} - Array de account_ids
 */
async function getAccountIdsForUser(userSkus) {
  if (!userSkus || userSkus.length === 0) {
    // Si no hay SKUs, retornar cuentas sin producto
    const { data, error } = await supabase.rpc('get_account_ids_without_product');
    return data || [];
  }
  
  const { data, error } = await supabase.rpc('get_account_ids_by_user_skus', {
    p_skus: userSkus
  });
  
  if (error) {
    console.error('[getAccountIdsForUser] Error:', error);
    return [];
  }
  
  return data || [];
}
```

### Patrón de Filtrado
```javascript
// En cada función de servicio:
export async function getSomething(options = {}, userSkus = null) {
  // Si userSkus es null, no filtrar (admin o todas)
  let accountIds = null;
  
  if (userSkus && userSkus.length > 0) {
    accountIds = await getAccountIdsForUser(userSkus);
    if (accountIds.length === 0) {
      // Usuario no tiene cuentas asignadas
      return { data: [], error: null };
    }
  }
  
  // Construir query con filtro
  let query = supabase.from('table').select('*');
  
  if (accountIds) {
    query = query.in('account_id', accountIds);
  }
  
  // ... resto de la lógica
}
```

---

## ✅ Criterios de Éxito

1. ✅ Todos los servicios aceptan `userSkus` como parámetro opcional
2. ✅ Los datos se filtran correctamente por productos del usuario
3. ✅ Los admins ven todos los datos (cuando `userSkus` es `null`)
4. ✅ Los tests pasan correctamente
5. ✅ No se rompe funcionalidad existente

---

## 🚀 Orden de Implementación

1. **SUBFASE 2.1**: `accounts.js` (base para todo)
2. **SUBFASE 2.2**: `conversations.js` (más crítico)
3. **SUBFASE 2.3**: Otros servicios (sequences, queue, etc.)
4. **SUBFASE 2.4**: Testing completo

---

**Tiempo Estimado Total**: 4-5 horas
