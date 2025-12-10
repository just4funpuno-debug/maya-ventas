# 🧪 Plan de Testing: FASE 3 OAuth Edge Function

## 📋 Objetivo

Asegurar que cada subfase funciona correctamente antes de continuar.

---

## 🎯 Testing por Subfase

### SUBFASE 3.1: Estructura Base

**Tests a Realizar:**
- [ ] GET request retorna respuesta correcta
- [ ] POST request retorna respuesta correcta
- [ ] State validation funciona
- [ ] Code extraction funciona
- [ ] Error handling básico funciona

**Cómo Probar:**
```bash
# GET request
curl https://[project-ref].supabase.co/functions/v1/meta-oauth-callback

# POST request con code y state
curl -X POST https://[project-ref].supabase.co/functions/v1/meta-oauth-callback?code=TEST&state=TEST
```

**Resultado Esperado:**
- GET: Respuesta 200 o mensaje de verificación
- POST: Respuesta con validación de state

---

### SUBFASE 3.2: Intercambiar Code

**Tests a Realizar:**
- [ ] Variables de entorno se obtienen correctamente
- [ ] Request a Meta API funciona
- [ ] Access token se obtiene correctamente
- [ ] Errores de Meta se manejan correctamente

**Cómo Probar:**
- Usar código real de OAuth (desde Meta)
- Verificar logs de Supabase
- Verificar que access_token se obtiene

**Resultado Esperado:**
- Access token válido obtenido
- Errores manejados correctamente

---

### SUBFASE 3.3: Graph API

**Tests a Realizar:**
- [ ] Business Account ID se obtiene
- [ ] Phone Numbers se obtienen
- [ ] Phone Number ID se extrae correctamente
- [ ] Información del número se obtiene

**Cómo Probar:**
- Verificar logs de Supabase
- Verificar datos en respuesta
- Validar estructura de datos

**Resultado Esperado:**
- Todos los datos obtenidos correctamente
- Estructura de datos válida

---

### SUBFASE 3.4: Generar Tokens

**Tests a Realizar:**
- [ ] Verify Token se genera correctamente
- [ ] Access Token permanente se genera (si aplica)
- [ ] Tokens tienen formato correcto

**Cómo Probar:**
- Verificar logs
- Validar formato de tokens

**Resultado Esperado:**
- Tokens generados correctamente
- Formato válido

---

### SUBFASE 3.5: Coexistencia

**Tests a Realizar:**
- [ ] Proceso de coexistencia se inicia
- [ ] QR o código se obtiene
- [ ] Estado se guarda en BD

**Cómo Probar:**
- Verificar logs
- Verificar BD
- Verificar respuesta

**Resultado Esperado:**
- Proceso iniciado correctamente
- QR/código disponible

---

### SUBFASE 3.6: Crear en BD

**Tests a Realizar:**
- [ ] Cuenta se crea en `whatsapp_accounts`
- [ ] Todos los campos se guardan correctamente
- [ ] `connection_method = 'oauth'`
- [ ] `meta_user_id` y `meta_app_id` guardados

**Cómo Probar:**
```sql
-- Verificar cuenta creada
SELECT * FROM whatsapp_accounts 
WHERE connection_method = 'oauth'
ORDER BY created_at DESC
LIMIT 1;
```

**Resultado Esperado:**
- Cuenta creada con todos los datos
- Campos correctos

---

### SUBFASE 3.7: Respuestas

**Tests a Realizar:**
- [ ] Respuesta JSON correcta
- [ ] QR se retorna si necesario
- [ ] Errores se manejan correctamente
- [ ] CORS headers correctos

**Cómo Probar:**
- Flujo completo end-to-end
- Verificar respuestas
- Probar errores

**Resultado Esperado:**
- Respuestas correctas
- Errores manejados

---

## 📊 Testing Final (E2E)

### Flujo Completo:
1. Usuario hace clic "Conectar con Meta"
2. Autoriza con Facebook
3. Meta redirige a callback
4. Edge Function procesa
5. Cuenta creada en BD
6. Respuesta retornada

**Verificar:**
- [ ] Flujo completo funciona
- [ ] Datos correctos en BD
- [ ] Respuesta correcta
- [ ] Sin errores en logs

---

## 📝 Documentación de Testing

Después de cada subfase:
- [ ] Documentar resultados
- [ ] Documentar errores encontrados
- [ ] Documentar soluciones
- [ ] Actualizar `FASE_3_TESTING_RESULTADOS.md`

---

## ✅ Criterios de Éxito

Cada subfase debe:
- ✅ Funcionar correctamente
- ✅ Manejar errores
- ✅ Tener logs claros
- ✅ Estar documentada

---

**¿Listo para empezar SUBFASE 3.1?**

