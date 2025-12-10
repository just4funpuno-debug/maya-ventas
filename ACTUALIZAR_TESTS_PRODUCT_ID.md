# Actualización de Tests para productId

## Cambios Necesarios

Los servicios ahora requieren `productId` como primer parámetro:

### tags.js
- `getAllTags(productId, accountId?)` - Antes: `getAllTags(accountId)`
- `createTag(productId, accountId, name, color)` - Antes: `createTag(accountId, name, color)`

### quick-replies.js
- `getAllQuickReplies(productId, accountId?)` - Antes: `getAllQuickReplies(accountId)`
- `createQuickReply(productId, accountId, quickReplyData)` - Antes: `createQuickReply(accountId, quickReplyData)`
- `searchQuickReplies(productId, searchTerm, accountId?)` - Antes: `searchQuickReplies(accountId, searchTerm)`

## Tests a Actualizar

1. `tests/whatsapp/tags.test.js` - Todos los tests de `getAllTags` y `createTag`
2. `tests/whatsapp/quick-replies.test.js` - Todos los tests de `getAllQuickReplies`, `createQuickReply` y `searchQuickReplies`

