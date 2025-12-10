# Script PowerShell para desplegar la Edge Function delete-user en Supabase
# Ejecutar desde la raíz del proyecto

Write-Host "🚀 Desplegando Edge Function 'delete-user' en Supabase..." -ForegroundColor Cyan

# Verificar que Supabase CLI esté instalado
$supabaseInstalled = Get-Command supabase -ErrorAction SilentlyContinue
if (-not $supabaseInstalled) {
    Write-Host "❌ Supabase CLI no está instalado." -ForegroundColor Red
    Write-Host "   Instálalo con: npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

# Verificar que estemos en el directorio correcto
if (-not (Test-Path "supabase\functions\delete-user\index.ts")) {
    Write-Host "❌ No se encontró la función delete-user." -ForegroundColor Red
    Write-Host "   Asegúrate de estar en la raíz del proyecto." -ForegroundColor Yellow
    exit 1
}

# Verificar autenticación
Write-Host "`n📋 Verificando autenticación con Supabase..." -ForegroundColor Cyan
$authCheck = supabase projects list 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  No estás autenticado en Supabase CLI." -ForegroundColor Yellow
    Write-Host "   Ejecuta: supabase login" -ForegroundColor Yellow
    $login = Read-Host "¿Quieres iniciar sesión ahora? (s/n)"
    if ($login -eq "s" -or $login -eq "S") {
        supabase login
    } else {
        exit 1
    }
}

# Verificar vinculación al proyecto
Write-Host "`n📋 Verificando vinculación al proyecto..." -ForegroundColor Cyan
if (-not (Test-Path ".supabase\config.toml")) {
    Write-Host "⚠️  El proyecto no está vinculado." -ForegroundColor Yellow
    Write-Host "   Necesitas vincular tu proyecto primero." -ForegroundColor Yellow
    Write-Host "   Ejecuta: supabase link --project-ref TU_PROJECT_REF" -ForegroundColor Yellow
    Write-Host "   Puedes obtener el project-ref desde la URL de tu proyecto en Supabase Dashboard" -ForegroundColor Yellow
    exit 1
}

# Desplegar la función
Write-Host "`n🚀 Desplegando función..." -ForegroundColor Cyan
supabase functions deploy delete-user

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Función desplegada exitosamente!" -ForegroundColor Green
    Write-Host "`n📝 Próximos pasos:" -ForegroundColor Cyan
    Write-Host "   1. Verifica que la función esté disponible en Supabase Dashboard" -ForegroundColor White
    Write-Host "   2. Prueba eliminando un usuario desde la aplicación" -ForegroundColor White
    Write-Host "   3. Revisa los logs si hay algún problema" -ForegroundColor White
} else {
    Write-Host "`n❌ Error al desplegar la función." -ForegroundColor Red
    Write-Host "   Revisa los mensajes de error arriba." -ForegroundColor Yellow
    exit 1
}


