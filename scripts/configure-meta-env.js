/**
 * Script para configurar variables de entorno de Meta en Supabase Edge Functions
 */

import { config } from 'dotenv';
import { existsSync } from 'fs';

// Cargar .env.local si existe
if (existsSync('.env.local')) {
  config({ path: '.env.local' });
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const META_APP_ID = process.env.META_APP_ID;
const META_APP_SECRET = process.env.META_APP_SECRET;

if (!SUPABASE_URL || !SUPABASE_ACCESS_TOKEN) {
  console.error('❌ Faltan variables de entorno:');
  console.error('   - VITE_SUPABASE_URL o SUPABASE_URL');
  console.error('   - SUPABASE_ACCESS_TOKEN');
  process.exit(1);
}

if (!META_APP_ID || !META_APP_SECRET) {
  console.error('❌ Faltan credenciales de Meta:');
  console.error('   - META_APP_ID');
  console.error('   - META_APP_SECRET');
  console.error('');
  console.error('Agrégalas a .env.local:');
  console.error('   META_APP_ID=tu_app_id');
  console.error('   META_APP_SECRET=tu_app_secret');
  process.exit(1);
}

const PROJECT_REF = SUPABASE_URL.replace('https://', '').replace('.supabase.co', '');
const REDIRECT_URI = `https://${PROJECT_REF}.supabase.co/functions/v1/meta-oauth-callback`;

console.log('🔐 Configurando variables de entorno de Meta en Supabase...\n');
console.log('   Proyecto:', PROJECT_REF);
console.log('   App ID:', META_APP_ID.substring(0, 10) + '...');
console.log('   Redirect URI:', REDIRECT_URI);
console.log('');

async function configureSecrets() {
  try {
    // Nota: La API de Supabase para configurar secrets de Edge Functions
    // puede requerir un endpoint específico. Intentemos con la API de Management.
    
    console.log('📤 Configurando secrets...');
    
    // Intentar usar la API de Supabase Management para configurar secrets
    // Nota: Esta API puede no estar disponible públicamente, pero intentemos
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${PROJECT_REF}/secrets`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          secrets: [
            { name: 'META_APP_ID', value: META_APP_ID },
            { name: 'META_APP_SECRET', value: META_APP_SECRET },
            { name: 'META_OAUTH_REDIRECT_URI', value: REDIRECT_URI },
          ],
        }),
      }
    );

    if (response.ok) {
      console.log('✅ Secrets configurados exitosamente!');
      console.log('');
      console.log('📋 Variables configuradas:');
      console.log('   ✅ META_APP_ID');
      console.log('   ✅ META_APP_SECRET');
      console.log('   ✅ META_OAUTH_REDIRECT_URI');
      console.log('');
      console.log('🔄 Ahora redespliega la función para que tome efecto.');
      return;
    }

    // Si la API no funciona, mostrar instrucciones manuales
    if (response.status === 404 || response.status === 403) {
      console.log('⚠️  La API de Management no está disponible para configurar secrets automáticamente.');
      console.log('');
      console.log('📋 Configura manualmente desde el Dashboard:');
      console.log('');
      console.log('1. Ve a: https://supabase.com/dashboard/project/' + PROJECT_REF + '/settings/functions');
      console.log('2. Busca la sección "Secrets" o "Environment Variables"');
      console.log('3. Agrega estas variables:');
      console.log('');
      console.log('   Nombre: META_APP_ID');
      console.log('   Valor:', META_APP_ID);
      console.log('');
      console.log('   Nombre: META_APP_SECRET');
      console.log('   Valor:', META_APP_SECRET);
      console.log('');
      console.log('   Nombre: META_OAUTH_REDIRECT_URI');
      console.log('   Valor:', REDIRECT_URI);
      console.log('');
      console.log('4. Guarda los cambios');
      console.log('5. Redespliega la función');
      return;
    }

    const error = await response.text();
    throw new Error(`Error ${response.status}: ${error}`);

  } catch (error) {
    console.error('❌ Error al configurar secrets:', error.message);
    console.log('');
    console.log('📋 Configura manualmente desde el Dashboard:');
    console.log('   https://supabase.com/dashboard/project/' + PROJECT_REF + '/settings/functions');
    process.exit(1);
  }
}

configureSecrets();

