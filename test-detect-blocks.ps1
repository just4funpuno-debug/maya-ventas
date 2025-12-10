# Script de prueba para Edge Function detect-blocks
# FASE 5: SUBFASE 5.2 - Detección Automática de Bloqueos

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🧪 TEST: detect-blocks Edge Function" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configuración
$supabaseUrl = "https://alwxhiombhfyjyyziyxz.supabase.co"
$functionName = "detect-blocks"
$anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsd3hoaW9tYmhmeWp5eXppeXh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNTcyNTYsImV4cCI6MjA3OTkzMzI1Nn0.NI9de8Dlt5wXP0LMWomv5fbo63RJEWVapNnHje77RuI"

# URL completa
$url = "$supabaseUrl/functions/v1/$functionName"

Write-Host "URL: $url" -ForegroundColor Yellow
Write-Host ""

# Headers
$headers = @{
    "Authorization" = "Bearer $anonKey"
    "Content-Type" = "application/json"
}

# Body (vacío, la función no requiere parámetros)
$body = @{} | ConvertTo-Json

Write-Host "Enviando request..." -ForegroundColor Yellow
Write-Host ""

try {
    # Realizar request
    $response = Invoke-RestMethod -Uri $url `
        -Method Post `
        -Headers $headers `
        -Body $body `
        -ContentType "application/json" `
        -ErrorAction Stop

    Write-Host "✅ RESPUESTA EXITOSA" -ForegroundColor Green
    Write-Host ""
    Write-Host "Resultado:" -ForegroundColor Cyan
    Write-Host ($response | ConvertTo-Json -Depth 10) -ForegroundColor White
    Write-Host ""

    # Mostrar resumen
    if ($response.success) {
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "📊 RESUMEN" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "Contactos verificados: $($response.checked)" -ForegroundColor White
        Write-Host "Bloqueados confirmados: $($response.blocked)" -ForegroundColor $(if ($response.blocked -gt 0) { "Red" } else { "Green" })
        Write-Host "Probables bloqueos: $($response.probable)" -ForegroundColor $(if ($response.probable -gt 0) { "Yellow" } else { "Green" })
        Write-Host "Errores: $($response.errors)" -ForegroundColor $(if ($response.errors -gt 0) { "Red" } else { "Green" })
        Write-Host ""

        # Mostrar detalles si hay
        if ($response.details -and $response.details.Count -gt 0) {
            Write-Host "Detalles (primeros 5):" -ForegroundColor Cyan
            $response.details | Select-Object -First 5 | ForEach-Object {
                Write-Host "  - Contacto: $($_.phone) | Bloqueado: $($_.isBlocked) | Probabilidad: $($_.probability)%" -ForegroundColor White
            }
            if ($response.details.Count -gt 5) {
                Write-Host "  ... y $($response.details.Count - 5) más" -ForegroundColor Gray
            }
        }
    } else {
        Write-Host "⚠️ La función retornó success: false" -ForegroundColor Yellow
        if ($response.error) {
            Write-Host "Error: $($response.error)" -ForegroundColor Red
        }
    }

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "✅ TEST COMPLETADO" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green

} catch {
    Write-Host "❌ ERROR" -ForegroundColor Red
    Write-Host ""
    Write-Host "Mensaje: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.ErrorDetails.Message) {
        Write-Host ""
        Write-Host "Detalles:" -ForegroundColor Yellow
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }

    Write-Host ""
    Write-Host "Verifica:" -ForegroundColor Yellow
    Write-Host "  1. Que la Edge Function esté desplegada" -ForegroundColor White
    Write-Host "  2. Que la URL sea correcta" -ForegroundColor White
    Write-Host "  3. Que el anon key sea válido" -ForegroundColor White
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
}

