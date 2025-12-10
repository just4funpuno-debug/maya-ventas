# Desplegar Edge Function detect-blocks

## Pasos para Desplegar

### 1. Ir al Dashboard de Supabase

1. Abre tu navegador y ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto

### 2. Navegar a Edge Functions

1. En el menú lateral, haz clic en **Edge Functions**
2. Verás la lista de funciones existentes

### 3. Crear Nueva Función

1. Haz clic en **Create a new function** o **New Function**
2. Nombre: `detect-blocks`
3. Haz clic en **Create function**

### 4. Copiar el Código

1. Abre el archivo `supabase/functions/detect-blocks/index.ts` en tu editor
2. Copia **TODO** el contenido del archivo
3. Pega el código en el editor de la Edge Function en Supabase

### 5. Configurar Variables de Entorno

La función necesita estas variables (ya deberían estar configuradas):
- `SUPABASE_URL` - Se configura automáticamente
- `SUPABASE_SERVICE_ROLE_KEY` - Se configura automáticamente

**Nota:** Si necesitas configurarlas manualmente:
1. Ve a **Settings** → **Edge Functions** → **Secrets**
2. Agrega:
   - `SUPABASE_URL` = `https://alwxhiombhfyjyyziyxz.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` = (tu service_role key)

### 6. Desplegar

1. Haz clic en **Deploy** o **Save**
2. Espera a que se complete el despliegue (verás un mensaje de éxito)

### 7. Verificar Despliegue

1. Deberías ver la función en la lista con estado **Active**
2. Puedes hacer clic en la función para ver logs y detalles

## Probar la Función

### Opción 1: Usar el Script PowerShell

```powershell
.\test-detect-blocks.ps1
```

### Opción 2: Usar curl (PowerShell)

```powershell
$headers = @{
    "Authorization" = "Bearer [TU_ANON_KEY]"
    "Content-Type" = "application/json"
}

Invoke-RestMethod -Uri "https://alwxhiombhfyjyyziyxz.supabase.co/functions/v1/detect-blocks" `
    -Method Post `
    -Headers $headers `
    -Body '{}'
```

### Opción 3: Desde el Dashboard

1. Ve a **Edge Functions** → **detect-blocks**
2. Haz clic en **Invoke** o **Test**
3. Verás la respuesta en la consola

## Respuesta Esperada

```json
{
  "success": true,
  "checked": 10,
  "blocked": 2,
  "probable": 3,
  "errors": 0,
  "details": [
    {
      "contactId": "uuid",
      "phone": "+1234567890",
      "isBlocked": true,
      "probability": 85,
      "consecutiveUndelivered": 5
    }
  ]
}
```

## Troubleshooting

### Error: Function not found

- Verifica que la función esté desplegada
- Verifica que el nombre sea exactamente `detect-blocks`

### Error: Unauthorized

- Verifica que estés usando el `anon_key` correcto
- Verifica que el header `Authorization` esté bien formado

### Error: Internal server error

- Revisa los logs de la Edge Function en el Dashboard
- Verifica que las variables de entorno estén configuradas
- Verifica que la función tenga acceso a la base de datos

### La función retorna 0 contactos verificados

- Esto es normal si no hay mensajes enviados hace más de 72 horas
- La función solo verifica mensajes antiguos con status "sent"
- Puedes crear datos de prueba para verificar

## Siguiente Paso

Una vez que la función esté desplegada y probada:

1. Ejecutar `SQL_CRON_DETECT_BLOCKS.sql` para configurar el cron job
2. Verificar que el cron job se creó correctamente
3. Esperar la primera ejecución automática (o ejecutar manualmente)


