# 🧪 Testing: SUBFASE 3.1 - Estructura Base

## 📋 Objetivo

Verificar que la Edge Function responde correctamente a requests y valida parámetros básicos.

---

## ✅ Tests a Realizar

### Test 1: GET Request (Verificación Básica)

**Comando:**
```bash
curl https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/meta-oauth-callback
```

**Resultado Esperado:**
- Status: 200 o 400
- Respuesta JSON

**Verificar:**
- [ ] La función responde (no hay error 404)
- [ ] Respuesta es JSON válido
- [ ] CORS headers presentes

---

### Test 2: POST Request con Code y State

**Comando:**
```bash
curl -X POST "https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/meta-oauth-callback?code=TEST_CODE_123&state=TEST_STATE_456"
```

**Resultado Esperado:**
```json
{
  "success": true,
  "message": "Callback recibido correctamente",
  "code_received": true,
  "state_received": true,
  "next_step": "SUBFASE 3.2: Intercambiar code por access_token"
}
```

**Verificar:**
- [ ] Status: 200
- [ ] `success: true`
- [ ] `code_received: true`
- [ ] `state_received: true`

---

### Test 3: Request sin Code (Error Esperado)

**Comando:**
```bash
curl -X POST "https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/meta-oauth-callback?state=TEST_STATE"
```

**Resultado Esperado:**
```json
{
  "success": false,
  "error": "missing_code_or_state",
  "message": "Code o state faltante en la URL"
}
```

**Verificar:**
- [ ] Status: 400
- [ ] `success: false`
- [ ] `error: "missing_code_or_state"`

---

### Test 4: Request sin State (Error Esperado)

**Comando:**
```bash
curl -X POST "https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/meta-oauth-callback?code=TEST_CODE"
```

**Resultado Esperado:**
```json
{
  "success": false,
  "error": "missing_code_or_state",
  "message": "Code o state faltante en la URL"
}
```

**Verificar:**
- [ ] Status: 400
- [ ] `success: false`
- [ ] Error apropiado

---

### Test 5: Request con Error de OAuth

**Comando:**
```bash
curl -X POST "https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/meta-oauth-callback?error=access_denied&error_description=User%20denied"
```

**Resultado Esperado:**
```json
{
  "success": false,
  "error": "access_denied",
  "error_description": "User denied"
}
```

**Verificar:**
- [ ] Status: 400
- [ ] `success: false`
- [ ] `error: "access_denied"`
- [ ] `error_description` presente

---

### Test 6: OPTIONS Request (CORS Preflight)

**Comando:**
```bash
curl -X OPTIONS https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/meta-oauth-callback
```

**Resultado Esperado:**
- Status: 200
- CORS headers presentes

**Verificar:**
- [ ] Status: 200
- [ ] CORS headers en respuesta

---

## 📊 Resultados

### Después de cada test:
- [ ] Anotar resultado
- [ ] Verificar logs en Supabase Dashboard
- [ ] Documentar cualquier error

---

## ✅ Criterios de Éxito

SUBFASE 3.1 está completa cuando:
- ✅ Todos los tests pasan
- ✅ La función responde correctamente
- ✅ Validaciones funcionan
- ✅ Errores se manejan apropiadamente
- ✅ Logs son claros

---

## 🚀 Próximo Paso

Una vez completado el testing de SUBFASE 3.1:
- Continuar con **SUBFASE 3.2:** Intercambiar Code por Access Token

---

**¿Listo para hacer el testing?**

Ejecuta los tests y avísame los resultados.

