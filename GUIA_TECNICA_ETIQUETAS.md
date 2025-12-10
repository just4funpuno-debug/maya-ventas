# 🔧 Guía Técnica: Sistema de Etiquetas para WhatsApp

## 📋 Índice

1. [Arquitectura General](#arquitectura-general)
2. [Base de Datos](#base-de-datos)
3. [Servicios Backend](#servicios-backend)
4. [Componentes Frontend](#componentes-frontend)
5. [Flujos de Datos](#flujos-de-datos)
6. [API Reference](#api-reference)

---

## 🏗️ Arquitectura General

El sistema de etiquetas está compuesto por:

- **Base de Datos**: Tablas `whatsapp_tags` y `whatsapp_contact_tags`
- **Backend Services**: `src/services/whatsapp/tags.js`
- **UI Components**: 
  - `TagManagerModal.jsx` - Gestión de etiquetas
  - `SimpleAddTagModal.jsx` - Creación rápida de etiquetas
  - `ChatWindow.jsx` - Muestra etiquetas en el header
  - `ConversationList.jsx` - Muestra y filtra por etiquetas

---

## 🗄️ Base de Datos

### Tabla: `whatsapp_tags`

```sql
CREATE TABLE whatsapp_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES whatsapp_accounts(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(50) NOT NULL,
  color VARCHAR(7) NOT NULL DEFAULT '#e7922b',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(account_id, name)
);
```

**Índices**:
- `idx_tags_account` en `account_id`
- `idx_tags_name` en `name`
- `idx_tags_created` en `created_at DESC`

### Tabla: `whatsapp_contact_tags`

```sql
CREATE TABLE whatsapp_contact_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES whatsapp_contacts(id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES whatsapp_tags(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contact_id, tag_id)
);
```

**Índices**:
- `idx_contact_tags_contact` en `contact_id`
- `idx_contact_tags_tag` en `tag_id`
- `idx_contact_tags_contact_tag` en `(contact_id, tag_id)`

### Función RPC: `get_contact_tags`

```sql
CREATE OR REPLACE FUNCTION get_contact_tags(p_contact_id UUID)
RETURNS TABLE (
  tag_id UUID,
  tag_name VARCHAR,
  tag_color VARCHAR,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id AS tag_id,
    t.name AS tag_name,
    t.color AS tag_color,
    ct.created_at
  FROM whatsapp_contact_tags ct
  INNER JOIN whatsapp_tags t ON t.id = ct.tag_id
  WHERE ct.contact_id = p_contact_id
  ORDER BY ct.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 🔧 Servicios Backend

### Archivo: `src/services/whatsapp/tags.js`

#### Funciones Disponibles

##### `getAllTags(accountId)`
Obtiene todas las etiquetas de una cuenta.

**Parámetros**:
- `accountId` (string, requerido): ID de la cuenta WhatsApp

**Retorna**:
```javascript
{
  data: Array<{
    id: string,
    account_id: string,
    name: string,
    color: string,
    created_at: string,
    updated_at: string
  }>,
  error: null | { message: string, code?: string }
}
```

##### `getTagById(tagId)`
Obtiene una etiqueta por su ID.

**Parámetros**:
- `tagId` (string, requerido): ID de la etiqueta

**Retorna**: Similar a `getAllTags`, pero con un solo objeto.

##### `createTag(accountId, name, color)`
Crea una nueva etiqueta.

**Parámetros**:
- `accountId` (string, requerido): ID de la cuenta
- `name` (string, requerido): Nombre de la etiqueta (máx. 50 caracteres)
- `color` (string, requerido): Color hexadecimal (ej: "#e7922b")

**Validaciones**:
- Nombre no puede estar vacío
- Nombre no puede exceder 50 caracteres
- Color debe ser un código hexadecimal válido (#RRGGBB)
- Nombre debe ser único por cuenta

**Retorna**:
```javascript
{
  data: { id, account_id, name, color, ... } | null,
  error: null | { message: string, code?: 'DUPLICATE_TAG' }
}
```

##### `updateTag(tagId, updates)`
Actualiza una etiqueta existente.

**Parámetros**:
- `tagId` (string, requerido): ID de la etiqueta
- `updates` (object): `{ name?: string, color?: string }`

**Retorna**: Similar a `createTag`.

##### `deleteTag(tagId)`
Elimina una etiqueta.

**Parámetros**:
- `tagId` (string, requerido): ID de la etiqueta

**Retorna**:
```javascript
{
  success: boolean,
  error: null | { message: string }
}
```

**Nota**: La eliminación en cascada se maneja automáticamente por la FK.

##### `getContactTags(contactId)`
Obtiene todas las etiquetas de un contacto.

**Parámetros**:
- `contactId` (string, requerido): ID del contacto

**Retorna**:
```javascript
{
  data: Array<{
    tag_id: string,
    tag_name: string,
    tag_color: string,
    created_at: string
  }>,
  error: null | { message: string }
}
```

##### `addTagToContact(contactId, tagId)`
Asigna una etiqueta a un contacto.

**Parámetros**:
- `contactId` (string, requerido): ID del contacto
- `tagId` (string, requerido): ID de la etiqueta

**Retorna**:
```javascript
{
  success: boolean,
  error: null | { message: string }
}
```

**Nota**: Si la etiqueta ya está asignada, se considera éxito (no duplica).

##### `removeTagFromContact(contactId, tagId)`
Quita una etiqueta de un contacto.

**Parámetros**: Igual que `addTagToContact`

**Retorna**: Similar a `addTagToContact`.

##### `setContactTags(contactId, tagIds)`
Reemplaza todas las etiquetas de un contacto.

**Parámetros**:
- `contactId` (string, requerido): ID del contacto
- `tagIds` (Array<string>, requerido): Array de IDs de etiquetas

**Retorna**: Similar a `addTagToContact`.

**Nota**: Esta función elimina todas las etiquetas existentes y luego inserta las nuevas.

---

## 🎨 Componentes Frontend

### `TagManagerModal.jsx`

Modal para gestionar etiquetas y asignarlas a contactos.

**Props**:
```typescript
{
  isOpen: boolean;
  onClose: () => void;
  accountId: string | null;
  contactId?: string | null;
  onTagsUpdated?: () => void;
}
```

**Funcionalidades**:
- Listar todas las etiquetas de la cuenta
- Crear nuevas etiquetas
- Editar etiquetas existentes
- Eliminar etiquetas
- Asignar/quitar etiquetas al contacto (si `contactId` está presente)

### `SimpleAddTagModal.jsx`

Modal simplificado para crear etiquetas rápidamente.

**Props**:
```typescript
{
  isOpen: boolean;
  onClose: () => void;
  accountId: string | null;
  onTagCreated: (tag: Tag) => void;
}
```

**Funcionalidades**:
- Formulario simple: nombre + selector de color
- Validación en tiempo real
- Creación inmediata

### `ChatWindow.jsx`

Muestra etiquetas en el header del chat.

**Funcionalidades**:
- Carga etiquetas del contacto al abrir el chat
- Muestra badges de etiquetas en el header
- Botón para abrir modal de gestión
- Recarga automática cuando se actualizan etiquetas

**Estado**:
```javascript
const [contactTags, setContactTags] = useState([]);
```

### `ConversationList.jsx`

Muestra etiquetas en cada conversación y permite filtrar.

**Funcionalidades**:
- Carga etiquetas para todas las conversaciones
- Muestra badges de etiquetas en cada conversación
- Filtro por etiquetas (botón "Etiquetas")
- Combinación de filtro de etiquetas con búsqueda por texto

**Estado**:
```javascript
const [conversationTags, setConversationTags] = useState({}); // { contactId: [tags] }
const [selectedTagIds, setSelectedTagIds] = useState([]);
```

---

## 🔄 Flujos de Datos

### Crear Etiqueta

```
Usuario → SimpleAddTagModal
  → createTag(accountId, name, color)
  → Supabase: INSERT INTO whatsapp_tags
  → onTagCreated(tag)
  → Actualizar lista de etiquetas
```

### Asignar Etiqueta a Contacto

```
Usuario → TagManagerModal
  → setContactTags(contactId, [tagIds])
  → Supabase: DELETE + INSERT en whatsapp_contact_tags
  → onTagsUpdated()
  → ChatWindow: loadContactTags()
  → Actualizar badges en header
```

### Filtrar Conversaciones por Etiquetas

```
Usuario → ConversationList
  → setSelectedTagIds([tagIds])
  → getConversations({ tagIds })
  → getContactsWithTags(tagIds) [función interna]
  → Supabase: Query con JOIN
  → Filtrar lista de conversaciones
```

### Cargar Etiquetas de Contacto

```
ChatWindow monta
  → loadContactTags()
  → getContactTags(contactId)
  → Supabase RPC: get_contact_tags
  → setContactTags([tags])
  → Render badges en header
```

---

## 📚 API Reference

### Supabase Queries

#### Obtener etiquetas de cuenta
```javascript
supabase
  .from('whatsapp_tags')
  .select('*')
  .eq('account_id', accountId)
  .order('created_at', { ascending: false });
```

#### Crear etiqueta
```javascript
supabase
  .from('whatsapp_tags')
  .insert({ account_id, name, color })
  .select()
  .single();
```

#### Obtener etiquetas de contacto (RPC)
```javascript
supabase.rpc('get_contact_tags', {
  p_contact_id: contactId
});
```

#### Asignar etiqueta a contacto
```javascript
supabase
  .from('whatsapp_contact_tags')
  .insert({ contact_id, tag_id });
```

#### Filtrar contactos por etiquetas
```javascript
// 1. Obtener contactos con etiqueta
supabase
  .from('whatsapp_contact_tags')
  .select('contact_id')
  .eq('tag_id', tagId);

// 2. Filtrar conversaciones
supabase
  .from('whatsapp_contacts')
  .select('*')
  .in('id', contactIds)
  .order('last_interaction_at', { ascending: false });
```

---

## 🧪 Testing

### Tests Unitarios

**Archivo**: `tests/whatsapp/tags.test.js`

**Cobertura**:
- ✅ `getAllTags` (2 tests)
- ✅ `getTagById` (2 tests)
- ✅ `createTag` (4 tests)
- ✅ `updateTag` (2 tests)
- ✅ `deleteTag` (2 tests)
- ✅ `getContactTags` (2 tests)
- ✅ `addTagToContact` (2 tests)
- ✅ `removeTagFromContact` (1 test)
- ✅ `setContactTags` (3 tests)

**Total**: 20 tests unitarios

### Tests de Integración

**Archivo**: `tests/whatsapp/conversations-tags.test.js`

**Cobertura**:
- ✅ Filtrado por etiquetas (3 tests)
- ✅ Retorno vacío cuando no hay contactos
- ✅ Retorno de todas las conversaciones sin filtro
- ✅ Aplicación de filtro de etiquetas

**Total**: 3 tests de integración

---

## 🔒 Seguridad

### Row Level Security (RLS)

**Políticas actuales**: Permisivas (para desarrollo)

**Recomendación para producción**:
```sql
-- Política para whatsapp_tags
CREATE POLICY "users_can_manage_own_account_tags"
  ON whatsapp_tags
  FOR ALL
  USING (account_id IN (
    SELECT id FROM whatsapp_accounts WHERE user_id = auth.uid()
  ));

-- Política para whatsapp_contact_tags
CREATE POLICY "users_can_manage_own_contact_tags"
  ON whatsapp_contact_tags
  FOR ALL
  USING (contact_id IN (
    SELECT id FROM whatsapp_contacts 
    WHERE account_id IN (
      SELECT id FROM whatsapp_accounts WHERE user_id = auth.uid()
    )
  ));
```

---

## 📝 Notas de Implementación

### Optimizaciones

1. **Carga en paralelo**: `ConversationList` carga etiquetas para todas las conversaciones en paralelo usando `Promise.all`
2. **Cacheo**: Las etiquetas se almacenan en estado local para evitar llamadas redundantes
3. **Actualización selectiva**: Solo se recargan etiquetas cuando es necesario (cambio de contacto, actualización desde modal)

### Limitaciones Conocidas

1. **Sin paginación**: La lista de etiquetas no está paginada (puede ser lenta con muchas etiquetas)
2. **Sin búsqueda**: No hay búsqueda de etiquetas en el modal (solo filtrado visual)
3. **Sin ordenamiento**: Las etiquetas se muestran en orden de creación

### Mejoras Futuras

1. **Búsqueda de etiquetas** en el modal
2. **Ordenamiento personalizado** de etiquetas
3. **Estadísticas**: Contador de contactos por etiqueta
4. **Importar/Exportar** etiquetas
5. **Etiquetas predefinidas** por industria

---

**Última actualización**: 2025-01-30

