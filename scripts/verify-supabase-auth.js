/**
 * Script para verificar autenticación de Supabase
 */

import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { existsSync } from 'fs';

// Cargar .env.local si existe
if (existsSync('.env.local')) {
  config({ path: '.env.local' });
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

console.log('🔍 Verificando configuración de Supabase...\n');

if (!SUPABASE_URL) {
  console.error('❌ Falta VITE_SUPABASE_URL o SUPABASE_URL');
  console.error('   Agrégalo a .env.local');
  process.exit(1);
}

if (!SUPABASE_ACCESS_TOKEN) {
  console.error('❌ Falta SUPABASE_ACCESS_TOKEN');
  console.error('   Obtén el token desde: https://supabase.com/dashboard/account/tokens');
  console.error('   Agrégalo a .env.local como: SUPABASE_ACCESS_TOKEN=tu_token');
  process.exit(1);
}

const PROJECT_REF = SUPABASE_URL.replace('https://', '').replace('.supabase.co', '');

console.log('✅ Variables encontradas:');
console.log(`   Project Reference: ${PROJECT_REF}`);
console.log(`   Access Token: ${SUPABASE_ACCESS_TOKEN.substring(0, 10)}...`);
console.log('');

// Verificar que el token funciona
console.log('🔐 Verificando token...');
try {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}`,
    {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
      },
    }
  );

  if (response.ok) {
    const project = await response.json();
    console.log('✅ Token válido!');
    console.log(`   Proyecto: ${project.name || PROJECT_REF}`);
    console.log('');
    console.log('🎉 Autenticación configurada correctamente!');
    console.log('   Ahora puedo desplegar y probar Edge Functions automáticamente.');
  } else {
    console.error('❌ Token inválido o sin permisos');
    console.error(`   Status: ${response.status}`);
    const error = await response.text();
    console.error(`   Error: ${error}`);
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Error al verificar token:', error.message);
  process.exit(1);
}

