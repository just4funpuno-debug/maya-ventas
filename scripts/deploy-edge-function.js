/**
 * Script para desplegar Edge Function usando Supabase API
 * Permite desplegar sin necesidad de CLI instalado
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import { existsSync } from 'fs';

// Cargar .env.local si existe
if (existsSync('.env.local')) {
  config({ path: '.env.local' });
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Obtener variables de entorno
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!SUPABASE_URL || !SUPABASE_ACCESS_TOKEN) {
  console.error('❌ Faltan variables de entorno:');
  console.error('   - VITE_SUPABASE_URL o SUPABASE_URL');
  console.error('   - SUPABASE_ACCESS_TOKEN');
  console.error('');
  console.error('Obtén SUPABASE_ACCESS_TOKEN desde:');
  console.error('   https://supabase.com/dashboard/account/tokens');
  process.exit(1);
}

const PROJECT_REF = SUPABASE_URL.replace('https://', '').replace('.supabase.co', '');
const FUNCTION_NAME = 'meta-oauth-callback';
const FUNCTION_PATH = join(__dirname, '..', 'supabase', 'functions', FUNCTION_NAME, 'index.ts');

async function deployFunction() {
  try {
    console.log('📦 Verificando código de la función...');
    
    if (!existsSync(FUNCTION_PATH)) {
      throw new Error(`No se encontró el archivo: ${FUNCTION_PATH}`);
    }
    
    const code = readFileSync(FUNCTION_PATH, 'utf-8');
    console.log(`   ✅ Código leído (${code.length} caracteres)`);
    
    console.log('🚀 Desplegando función usando Supabase CLI...');
    console.log(`   Proyecto: ${PROJECT_REF}`);
    console.log(`   Función: ${FUNCTION_NAME}`);
    
    // Usar npx supabase para desplegar (no requiere instalación global)
    const { execSync } = await import('child_process');
    
    // Configurar variables de entorno para Supabase CLI
    process.env.SUPABASE_ACCESS_TOKEN = SUPABASE_ACCESS_TOKEN;
    process.env.SUPABASE_DB_PASSWORD = ''; // No necesario para funciones
    
    try {
      // Intentar desplegar usando npx supabase
      console.log('   📤 Subiendo función...');
      const output = execSync(
        `npx --yes supabase functions deploy ${FUNCTION_NAME} --project-ref ${PROJECT_REF}`,
        { 
          cwd: join(__dirname, '..'),
          stdio: 'inherit',
          env: {
            ...process.env,
            SUPABASE_ACCESS_TOKEN: SUPABASE_ACCESS_TOKEN,
          }
        }
      );
      
      console.log('✅ Función desplegada exitosamente!');
      console.log(`   URL: https://${PROJECT_REF}.supabase.co/functions/v1/${FUNCTION_NAME}`);
      
    } catch (cliError) {
      // Si falla, mostrar instrucciones manuales
      console.log('');
      console.log('⚠️  No se pudo desplegar automáticamente con CLI');
      console.log('');
      console.log('📋 Despliega manualmente desde el Dashboard:');
      console.log(`   1. Ve a: https://supabase.com/dashboard/project/${PROJECT_REF}/functions`);
      console.log(`   2. Haz clic en "Create a new function"`);
      console.log(`   3. Nombre: ${FUNCTION_NAME}`);
      console.log(`   4. Copia el código desde: ${FUNCTION_PATH}`);
      console.log(`   5. Pega en el editor y haz clic en "Deploy"`);
      console.log('');
      console.log('💡 O instala Supabase CLI:');
      console.log('   npm install -g supabase');
      console.log('   supabase login');
      console.log(`   supabase link --project-ref ${PROJECT_REF}`);
      console.log(`   supabase functions deploy ${FUNCTION_NAME}`);
      console.log('');
      throw cliError;
    }
    
  } catch (error) {
    console.error('❌ Error al desplegar:', error.message);
    process.exit(1);
  }
}

deployFunction();

