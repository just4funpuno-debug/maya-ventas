#!/bin/bash
# Script de Test para process-sequences Edge Function
# Ejecutar en Terminal (Linux/Mac)

# ============================================
# CONFIGURACIÓN - REEMPLAZA CON TUS VALORES
# ============================================

# Tu project-ref (ya lo tenemos)
PROJECT_REF="alwxhiombhfyjyyziyxz"

# Tu anon key - OBTÉNLA DE:
# Supabase Dashboard → Settings → API → "anon public" key
ANON_KEY="TU_ANON_KEY_AQUI"

# ============================================
# NO MODIFICAR DE AQUÍ HACIA ABAJO
# ============================================

ENDPOINT="https://${PROJECT_REF}.supabase.co/functions/v1/process-sequences"

echo "========================================"
echo "Test de process-sequences Edge Function"
echo "========================================"
echo ""
echo "Endpoint: $ENDPOINT"
echo ""

if [ "$ANON_KEY" = "TU_ANON_KEY_AQUI" ]; then
    echo "⚠️  ERROR: Debes reemplazar TU_ANON_KEY_AQUI con tu anon key real"
    echo ""
    echo "Para obtener tu anon key:"
    echo "1. Ve a: https://supabase.com/dashboard/project/$PROJECT_REF/settings/api"
    echo "2. Copia la 'anon public' key"
    echo "3. Reemplázala en este script (línea 10)"
    echo ""
    exit 1
fi

echo "Enviando request..."
echo ""

response=$(curl -s -X POST "$ENDPOINT" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}')

if [ $? -eq 0 ]; then
    echo "✅ RESPUESTA EXITOSA:"
    echo ""
    echo "$response" | jq '.' 2>/dev/null || echo "$response"
    echo ""
    
    processed=$(echo "$response" | jq -r '.processed // 0' 2>/dev/null || echo "0")
    sent=$(echo "$response" | jq -r '.sent // 0' 2>/dev/null || echo "0")
    errors=$(echo "$response" | jq -r '.errors // 0' 2>/dev/null || echo "0")
    
    echo "Resumen:"
    echo "  - Procesados: $processed"
    echo "  - Enviados: $sent"
    echo "  - Errores: $errors"
    echo ""
    
    success=$(echo "$response" | jq -r '.success // false' 2>/dev/null || echo "false")
    if [ "$success" = "true" ]; then
        echo "✅ Función ejecutada correctamente!"
    else
        echo "⚠️  Función ejecutada pero con errores"
    fi
else
    echo "❌ ERROR al ejecutar la función"
    exit 1
fi

echo ""
echo "========================================"


