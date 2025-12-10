# 📋 SUBFASE 1.3: Instrucciones de Configuración

**Fecha:** 2025-01-30  
**Estado:** 🟡 En progreso  
**Duración estimada:** 1-2 horas

---

## 🎯 OBJETIVOS

1. ✅ Crear bucket `whatsapp-media` en Supabase Storage
2. ✅ Configurar políticas de acceso al bucket
3. ✅ Habilitar Realtime en tablas críticas
4. ✅ Verificar que todo funciona

---

## 📝 PASOS DE CONFIGURACIÓN

### PASO 1: Ejecutar Migración SQL

1. Abrir Supabase Dashboard > SQL Editor
2. Ejecutar: `supabase/migrations/003_storage_realtime.sql`
   - Este script creará las funciones auxiliares
   - Si las políticas fallan por permisos, es normal (ver PASO 1b)
3. Verificar que no hay errores en las funciones

### PASO 1b: Crear Políticas de Storage (si fallaron en PASO 1)

**Opción A: Desde Dashboard (Recomendado)**
1. Ir a **Supabase Dashboard** > **Storage** > **whatsapp-media** > **Policies**
2. Crear las 4 políticas según las instrucciones en el script

**Opción B: Ejecutar con Service Role**
1. Usar `supabase/migrations/003_storage_policies.sql`
2. Ejecutar con **SERVICE_ROLE key** (no anon key)
3. O ejecutar desde Dashboard > SQL Editor con permisos de admin

---

### PASO 2: Crear Bucket de Storage (MANUAL)

**⚠️ IMPORTANTE: Este paso debe hacerse desde la UI de Supabase**

1. Ir a **Supabase Dashboard** > **Storage**
2. Click en **"New bucket"**
3. Configurar:
   - **Nombre:** `whatsapp-media`
   - **Público:** ✅ Sí (para acceso a URLs de media)
   - **File size limit:** `10485760` (10MB en bytes)
   - **Allowed MIME types:** 
     ```
     image/*,video/*,audio/*,application/pdf
     ```
4. Click en **"Create bucket"**

**Verificación:**
- El bucket debe aparecer en la lista de buckets
- Debe tener el icono de "público" visible

---

### PASO 3: Habilitar Realtime (MANUAL)

**⚠️ IMPORTANTE: Este paso debe hacerse desde la UI de Supabase**

1. Ir a **Supabase Dashboard** > **Database** > **Replication**
2. Para cada tabla, habilitar Realtime:

   **Tabla: `whatsapp_contacts`**
   - Buscar en la lista
   - Toggle **Realtime** a **ON**
   - ✅ Habilitado

   **Tabla: `whatsapp_messages`**
   - Buscar en la lista
   - Toggle **Realtime** a **ON**
   - ✅ Habilitado

   **Tabla: `puppeteer_queue`**
   - Buscar en la lista
   - Toggle **Realtime** a **ON**
   - ✅ Habilitado

   **Tabla: `whatsapp_delivery_issues`**
   - Buscar en la lista
   - Toggle **Realtime** a **ON**
   - ✅ Habilitado

**Verificación:**
- Cada tabla debe mostrar "Realtime: ON" en la lista

---

### PASO 4: Ejecutar Script de Testing

1. Abrir Supabase Dashboard > SQL Editor
2. Ejecutar: `scripts/test-realtime.sql`
3. Verificar resultados:
   - ✅ Políticas de Storage creadas (4/4)
   - ✅ Funciones auxiliares creadas (2/2)
   - ✅ Tablas listadas para Realtime (4/4)

---

### PASO 5: Probar Subida de Archivo (OPCIONAL)

**Para verificar que Storage funciona:**

1. Ir a **Supabase Dashboard** > **Storage** > **whatsapp-media**
2. Click en **"Upload file"**
3. Subir un archivo de prueba (imagen pequeña)
4. Verificar que aparece en la lista
5. Click en el archivo para obtener URL pública
6. Verificar que la URL es accesible

**Ejemplo de URL:**
```
https://[project-ref].supabase.co/storage/v1/object/public/whatsapp-media/images/test.jpg
```

---

## ✅ CHECKLIST DE VERIFICACIÓN

- [ ] Migración `003_storage_realtime.sql` ejecutada sin errores
- [ ] Bucket `whatsapp-media` creado y configurado como público
- [ ] Realtime habilitado en `whatsapp_contacts`
- [ ] Realtime habilitado en `whatsapp_messages`
- [ ] Realtime habilitado en `puppeteer_queue`
- [ ] Realtime habilitado en `whatsapp_delivery_issues`
- [ ] Script de testing ejecutado exitosamente
- [ ] Políticas de Storage verificadas (4/4)
- [ ] Funciones auxiliares verificadas (2/2)
- [ ] (Opcional) Archivo de prueba subido y accesible

---

## 🔧 FUNCIONES CREADAS

### 1. `get_whatsapp_media_url(file_path, bucket_name)`

**Propósito:** Genera URL pública para archivos en bucket.

**Uso:**
```sql
SELECT get_whatsapp_media_url('images/test.jpg');
-- Retorna: /storage/v1/object/public/whatsapp-media/images/test.jpg
```

**Nota:** En producción, completar con dominio de Supabase en el frontend.

---

### 2. `validate_whatsapp_media_type(file_name, expected_type)`

**Propósito:** Valida que la extensión del archivo coincida con el tipo esperado.

**Uso:**
```sql
SELECT validate_whatsapp_media_type('test.jpg', 'image'); -- true
SELECT validate_whatsapp_media_type('test.mp4', 'video'); -- true
SELECT validate_whatsapp_media_type('test.jpg', 'video'); -- false
```

**Tipos soportados:**
- `image`: jpg, jpeg, png, gif, webp
- `video`: mp4, mov, avi, webm
- `audio`: mp3, ogg, wav, m4a
- `document`: pdf, doc, docx, txt

---

## 📋 POLÍTICAS DE STORAGE CREADAS

1. ✅ `whatsapp_media_public_read` - Lectura pública
2. ✅ `whatsapp_media_insert` - Inserción (service_role o authenticated)
3. ✅ `whatsapp_media_update` - Actualización (service_role o authenticated)
4. ✅ `whatsapp_media_delete` - Eliminación (service_role o authenticated)

---

## 🎯 PRÓXIMOS PASOS

Después de completar SUBFASE 1.3:

**SUBFASE 1.4: UI para Configurar Cuentas WhatsApp**

Tareas principales:
1. Crear componente `WhatsAppAccountManager.jsx`
2. Formulario para agregar cuenta
3. Lista de cuentas activas
4. Editar/eliminar cuentas

---

**✅ SUBFASE 1.3 - Instrucciones completas**

**Fecha:** 2025-01-30  
**Estado:** Listo para ejecutar

