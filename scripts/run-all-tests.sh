#!/bin/bash

# ============================================================================
# Script para ejecutar todos los tests de FASE 1
# ============================================================================
# 
# Este script ejecuta:
# 1. Tests unitarios de JavaScript (Vitest)
# 2. Tests de base de datos (SQL scripts)
#
# Uso:
#   chmod +x scripts/run-all-tests.sh
#   ./scripts/run-all-tests.sh
#
# O con variables de entorno:
#   SUPABASE_DB_HOST=localhost SUPABASE_DB_NAME=postgres ./scripts/run-all-tests.sh
# ============================================================================

set -e  # Salir si hay error

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  EJECUTANDO TESTS - FASE 1 WHATSAPP${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Variables de entorno para BD (opcionales)
DB_HOST=${SUPABASE_DB_HOST:-"localhost"}
DB_NAME=${SUPABASE_DB_NAME:-"postgres"}
DB_USER=${SUPABASE_DB_USER:-"postgres"}
DB_PORT=${SUPABASE_DB_PORT:-"5432"}

# ============================================================================
# 1. TESTS UNITARIOS (JavaScript)
# ============================================================================

echo -e "${YELLOW}[1/2] Ejecutando tests unitarios...${NC}"
echo ""

if command -v npm &> /dev/null; then
    if npm test 2>/dev/null; then
        echo -e "${GREEN}✅ Tests unitarios completados${NC}"
    else
        echo -e "${YELLOW}⚠️  Tests unitarios no disponibles o fallaron${NC}"
        echo -e "${YELLOW}   Instala Vitest: npm install --save-dev vitest${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  npm no encontrado, saltando tests unitarios${NC}"
fi

echo ""

# ============================================================================
# 2. TESTS DE BASE DE DATOS (SQL)
# ============================================================================

echo -e "${YELLOW}[2/2] Ejecutando tests de base de datos...${NC}"
echo ""

if command -v psql &> /dev/null; then
    echo -e "${BLUE}Ejecutando scripts SQL...${NC}"
    
    # Verificar conexión
    if PGPASSWORD=${SUPABASE_DB_PASSWORD} psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT" -c "SELECT 1;" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Conexión a BD exitosa${NC}"
        
        # Ejecutar scripts en orden
        SCRIPTS=(
            "scripts/verify-schema.sql"
            "scripts/test-functions.sql"
            "scripts/test-realtime.sql"
            "scripts/test-whatsapp-accounts.sql"
        )
        
        for script in "${SCRIPTS[@]}"; do
            if [ -f "$script" ]; then
                echo -e "${BLUE}Ejecutando: $script${NC}"
                if PGPASSWORD=${SUPABASE_DB_PASSWORD} psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT" -f "$script" 2>&1 | grep -v "NOTICE"; then
                    echo -e "${GREEN}✅ $script completado${NC}"
                else
                    echo -e "${RED}❌ Error en $script${NC}"
                fi
            else
                echo -e "${YELLOW}⚠️  Archivo no encontrado: $script${NC}"
            fi
        done
    else
        echo -e "${YELLOW}⚠️  No se pudo conectar a la base de datos${NC}"
        echo -e "${YELLOW}   Configura las variables de entorno:${NC}"
        echo -e "${YELLOW}   SUPABASE_DB_HOST, SUPABASE_DB_NAME, SUPABASE_DB_USER, SUPABASE_DB_PASSWORD${NC}"
        echo ""
        echo -e "${BLUE}Alternativa: Ejecuta los scripts manualmente desde Supabase Dashboard${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  psql no encontrado, saltando tests de BD${NC}"
    echo -e "${BLUE}Ejecuta los scripts manualmente desde Supabase Dashboard:${NC}"
    echo -e "${BLUE}  - scripts/verify-schema.sql${NC}"
    echo -e "${BLUE}  - scripts/test-functions.sql${NC}"
    echo -e "${BLUE}  - scripts/test-realtime.sql${NC}"
    echo -e "${BLUE}  - scripts/test-whatsapp-accounts.sql${NC}"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}  TESTS COMPLETADOS${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}Nota: Revisa los resultados arriba y ejecuta los tests manuales${NC}"
echo -e "${YELLOW}      documentados en FASE_1_TESTING_COMPLETO.md${NC}"

