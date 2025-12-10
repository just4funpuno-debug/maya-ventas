# 🚀 FASE 3: Edge Function para OAuth Callback

## 📋 Objetivo

Crear la Edge Function que procesa el callback de OAuth cuando un usuario autoriza con Meta.

**Tiempo estimado:** 3-4 horas

---

## 🔄 Flujo del Callback

```
1. Usuario hace clic "Conectar con Meta" en tu app
2. Se redirige a Meta OAuth
3. Usuario autoriza
4. Meta redirige a: https://[project-ref].supabase.co/functions/v1/meta-oauth-callback?code=XXX&state=YYY
5. Edge Function procesa:
   - Valida state
   - Intercambia code por access_token
   - Obtiene datos de Graph API
   - Crea cuenta en BD
   - Retorna datos o QR
```

---

## 📋 Tareas a Implementar

### 1. Estructura Base
- [ ] Crear `supabase/functions/meta-oauth-callback/index.ts`
- [ ] Configurar Deno imports
- [ ] Manejar GET y POST requests

### 2. Validación de State
- [ ] Recibir `state` del query string
- [ ] Validar `state` (seguridad contra CSRF)
- [ ] Retornar error si state inválido

### 3. Intercambiar Code por Access Token
- [ ] Recibir `code` del query string
- [ ] Hacer request a Meta para intercambiar code por access_token
- [ ] Manejar errores de Meta

### 4. Obtener Datos de Graph API
- [ ] Obtener Business Account ID
- [ ] Obtener Phone Numbers
- [ ] Obtener Phone Number ID
- [ ] Generar Access Token permanente (opcional)

### 5. Proceso de Coexistencia
- [ ] Verificar si número necesita coexistencia
- [ ] Iniciar proceso de coexistencia si necesario
- [ ] Obtener QR o código de verificación

### 6. Crear Cuenta en BD
- [ ] Insertar en `whatsapp_accounts`
- [ ] Guardar todos los datos obtenidos
- [ ] Marcar `connection_method = 'oauth'`

### 7. Retornar Respuesta
- [ ] Si necesita QR: Retornar QR URL
- [ ] Si no: Retornar datos de cuenta creada
- [ ] Manejar errores y retornar mensajes claros

---

## 📁 Archivos a Crear

1. `supabase/functions/meta-oauth-callback/index.ts` - Función principal
2. `supabase/functions/meta-oauth-callback/README.md` - Documentación

---

## 🔧 Dependencias Necesarias

```typescript
// Deno imports
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
```

---

## 📋 Estructura del Código

```typescript
serve(async (req) => {
  // 1. Validar método (GET para verificación, POST para callback)
  // 2. Obtener code y state del query string
  // 3. Validar state
  // 4. Intercambiar code por access_token
  // 5. Obtener datos de Graph API
  // 6. Procesar coexistencia
  // 7. Crear cuenta en BD
  // 8. Retornar respuesta
})
```

---

## 🚀 Próximo Paso

**¿Empezamos a crear la Edge Function?**

Voy a crear el código base y luego lo vamos refinando paso a paso.

