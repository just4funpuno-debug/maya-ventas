# 🔑 Cómo Obtener tu Anon Key de Supabase

## Pasos Rápidos:

1. **Abre Supabase Dashboard:**
   - Ve a: https://supabase.com/dashboard
   - Selecciona tu proyecto

2. **Navega a Settings → API:**
   - Click en **Settings** (icono de engranaje) en el menú lateral
   - Click en **API** en el submenú
   - O directamente: https://supabase.com/dashboard/project/alwxhiombhfyjyyziyxz/settings/api

3. **Copia la "anon public" key:**
   - Busca la sección **"Project API keys"**
   - Encuentra **"anon public"** (es la primera, con el ícono de ojo)
   - Click en el ícono de **copiar** (📋) o selecciona y copia manualmente
   - ⚠️ Esta key es pública y segura para usar en el frontend

4. **Úsala en el script de test:**
   - Abre `test-process-sequences.ps1` (PowerShell) o `test-process-sequences.sh` (Linux/Mac)
   - Reemplaza `TU_ANON_KEY_AQUI` con la key que copiaste
   - Guarda el archivo

## Ejemplo de cómo se ve:

```
Project API keys

anon public
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsd3hoaW9tYmhmeWp5eXppeXoiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY5ODk2NzIwMCwiZXhwIjoyMDE0NTQzMjAwfQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
[📋 Copiar]
```

## Nota de Seguridad:

- ✅ **anon key**: Segura para usar en frontend y scripts de test
- ⚠️ **service_role key**: SOLO para backend/cron jobs, NUNCA exponerla


