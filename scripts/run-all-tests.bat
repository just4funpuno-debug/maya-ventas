@echo off
REM ============================================================================
REM Script para ejecutar todos los tests de FASE 1 (Windows)
REM ============================================================================
REM 
REM Uso: scripts\run-all-tests.bat
REM ============================================================================

echo ========================================
echo   EJECUTANDO TESTS - FASE 1 WHATSAPP
echo ========================================
echo.

REM ============================================================================
REM 1. TESTS UNITARIOS (JavaScript)
REM ============================================================================

echo [1/2] Ejecutando tests unitarios...
echo.

where npm >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    npm test
    if %ERRORLEVEL% EQU 0 (
        echo [OK] Tests unitarios completados
    ) else (
        echo [WARN] Tests unitarios no disponibles o fallaron
        echo        Instala Vitest: npm install --save-dev vitest
    )
) else (
    echo [WARN] npm no encontrado, saltando tests unitarios
)

echo.

REM ============================================================================
REM 2. TESTS DE BASE DE DATOS (SQL)
REM ============================================================================

echo [2/2] Tests de base de datos...
echo.
echo [INFO] Ejecuta los scripts SQL manualmente desde Supabase Dashboard:
echo   - scripts\verify-schema.sql
echo   - scripts\test-functions.sql
echo   - scripts\test-realtime.sql
echo   - scripts\test-whatsapp-accounts.sql
echo.

echo ========================================
echo   TESTS COMPLETADOS
echo ========================================
echo.
echo Nota: Revisa los resultados arriba y ejecuta los tests manuales
echo       documentados en FASE_1_TESTING_COMPLETO.md
echo.

pause

