/**
 * Script para verificar migración de Auth
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables de entorno no configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function verify() {
  console.log('🔍 Verificando usuarios en Supabase Auth...\n');
  
  try {
    // Listar usuarios (requiere service_role)
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
    
    console.log(`📊 Usuarios en Supabase Auth: ${users.length}\n`);
    
    users.forEach(user => {
      console.log(`  - ${user.email}`);
      console.log(`    ID: ${user.id}`);
      console.log(`    Creado: ${new Date(user.created_at).toLocaleString()}`);
      console.log('');
    });
    
    // Verificar usuarios en tabla users
    const { data: tableUsers } = await supabase.from('users').select('username');
    console.log(`📊 Usuarios en tabla users: ${tableUsers?.length || 0}\n`);
    
    if (tableUsers) {
      tableUsers.forEach(u => {
        console.log(`  - ${u.username}`);
      });
    }
    
    console.log('\n✅ Verificación completada');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verify();



