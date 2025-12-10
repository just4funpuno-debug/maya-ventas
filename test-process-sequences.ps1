# Script de Test para process-sequences Edge Function
# Ejecutar en PowerShell

# ============================================
# CONFIGURACIÓN - REEMPLAZA CON TUS VALORES
# ============================================

# Tu project-ref (ya lo tenemos)
$PROJECT_REF = "alwxhiombhfyjyyziyxz"

# Tu anon key - OBTÉNLA DE:
# Supabase Dashboard → Settings → API → "anon public" key
$ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsd3hoaW9tYmhmeWp5eXppeXh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNTcyNTYsImV4cCI6MjA3OTkzMzI1Nn0.NI9de8Dlt5wXP0LMWomv5fbo63RJEWVapNnHje77RuI"

# ============================================
# NO MODIFICAR DE AQUÍ HACIA ABAJO
# ============================================

$ENDPOINT = "https://$PROJECT_REF.supabase.co/functions/v1/process-sequences"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test de process-sequences Edge Function" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Endpoint: $ENDPOINT" -ForegroundColor Yellow
Write-Host ""

if ($ANON_KEY -eq "TU_ANON_KEY_AQUI") {
    Write-Host "⚠️  ERROR: Debes reemplazar TU_ANON_KEY_AQUI con tu anon key real" -ForegroundColor Red
    Write-Host ""
    Write-Host "Para obtener tu anon key:" -ForegroundColor Yellow
    Write-Host "1. Ve a: https://supabase.com/dashboard/project/$PROJECT_REF/settings/api" -ForegroundColor White
    Write-Host "2. Copia la 'anon public' key" -ForegroundColor White
    Write-Host "3. Reemplázala en este script (línea 10)" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "Enviando request..." -ForegroundColor Green
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri $ENDPOINT -Method Post -Headers @{
        "Authorization" = "Bearer $ANON_KEY"
        "apikey" = $ANON_KEY
        "Content-Type" = "application/json"
    } -Body '{}' -ContentType "application/json"

    Write-Host "✅ RESPUESTA EXITOSA:" -ForegroundColor Green
    Write-Host ""
    $response | ConvertTo-Json -Depth 10 | Write-Host -ForegroundColor White
    Write-Host ""
    
    Write-Host "Resumen:" -ForegroundColor Cyan
    Write-Host "  - Procesados: $($response.processed)" -ForegroundColor White
    Write-Host "  - Enviados: $($response.sent)" -ForegroundColor White
    Write-Host "  - Errores: $($response.errors)" -ForegroundColor White
    Write-Host ""
    
    if ($response.success) {
        Write-Host "✅ Función ejecutada correctamente!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Función ejecutada pero con errores" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ ERROR al ejecutar la función:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Detalles del error:" -ForegroundColor Yellow
    $_.Exception | Format-List -Force | Write-Host
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan

