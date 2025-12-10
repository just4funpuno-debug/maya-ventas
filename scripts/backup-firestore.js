/**
 * Script de Backup Completo de Firestore
 * Fase 0.1: Exporta todas las colecciones a archivos JSON
 * 
 * Uso: node scripts/backup-firestore.js
 */

import admin from 'firebase-admin';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar serviceAccountKey
const serviceAccount = JSON.parse(
  await fs.readFile(path.join(__dirname, '../serviceAccountKey.json'), 'utf8')
);

// Inicializar Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Lista de colecciones a respaldar (según análisis del proyecto)
const COLLECTIONS = [
  'almacenCentral',
  'cityStock',
  'VentasSinConfirmar',
  'ventashistorico',
  'ventasporcobrar',
  'GenerarDeposito',
  'users',
  'despachos',
  'despachosHistorial',
  'numbers', // Firebase collection name (no cambiar, es el nombre en Firebase)
  'team_messages'
];

// Función para convertir Timestamp a ISO string
function serializeDoc(doc) {
  const data = doc.data();
  const serialized = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === 'object') {
      // Firebase Timestamp
      if (value.toDate && typeof value.toDate === 'function') {
        serialized[key] = value.toDate().toISOString();
      }
      // GeoPoint
      else if (value.latitude !== undefined && value.longitude !== undefined) {
        serialized[key] = { latitude: value.latitude, longitude: value.longitude };
      }
      // Array
      else if (Array.isArray(value)) {
        serialized[key] = value.map(item => {
          if (item && typeof item === 'object' && item.toDate) {
            return item.toDate().toISOString();
          }
          return item;
        });
      }
      // Object anidado
      else {
        serialized[key] = serializeValue(value);
      }
    } else {
      serialized[key] = value;
    }
  }
  
  return {
    id: doc.id,
    ...serialized
  };
}

function serializeValue(value) {
  if (value && typeof value === 'object') {
    if (value.toDate && typeof value.toDate === 'function') {
      return value.toDate().toISOString();
    }
    if (Array.isArray(value)) {
      return value.map(serializeValue);
    }
    const serialized = {};
    for (const [k, v] of Object.entries(value)) {
      serialized[k] = serializeValue(v);
    }
    return serialized;
  }
  return value;
}

async function backupCollection(collectionName) {
  console.log(`\n📦 Respaldando colección: ${collectionName}...`);
  
  try {
    const snapshot = await db.collection(collectionName).get();
    const docs = [];
    
    snapshot.forEach(doc => {
      docs.push(serializeDoc(doc));
    });
    
    const backupData = {
      collection: collectionName,
      timestamp: new Date().toISOString(),
      count: docs.length,
      documents: docs
    };
    
    // Crear directorio de backups si no existe
    const backupDir = path.join(__dirname, '../backups');
    await fs.mkdir(backupDir, { recursive: true });
    
    // Guardar archivo JSON
    const filename = path.join(backupDir, `${collectionName}-${Date.now()}.json`);
    await fs.writeFile(filename, JSON.stringify(backupData, null, 2), 'utf8');
    
    console.log(`✅ ${collectionName}: ${docs.length} documentos respaldados → ${filename}`);
    
    return {
      collection: collectionName,
      count: docs.length,
      filename,
      success: true
    };
  } catch (error) {
    console.error(`❌ Error respaldando ${collectionName}:`, error.message);
    return {
      collection: collectionName,
      count: 0,
      filename: null,
      success: false,
      error: error.message
    };
  }
}

async function main() {
  console.log('🚀 Iniciando backup completo de Firestore...');
  console.log(`📅 Fecha: ${new Date().toISOString()}`);
  console.log(`📊 Colecciones a respaldar: ${COLLECTIONS.length}\n`);
  
  const results = [];
  let totalDocs = 0;
  
  for (const collectionName of COLLECTIONS) {
    const result = await backupCollection(collectionName);
    results.push(result);
    if (result.success) {
      totalDocs += result.count;
    }
    
    // Pequeña pausa para no sobrecargar
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Crear resumen
  const summary = {
    timestamp: new Date().toISOString(),
    totalCollections: COLLECTIONS.length,
    totalDocuments: totalDocs,
    results: results
  };
  
  const summaryFile = path.join(__dirname, '../backups', `backup-summary-${Date.now()}.json`);
  await fs.writeFile(summaryFile, JSON.stringify(summary, null, 2), 'utf8');
  
  console.log('\n' + '='.repeat(60));
  console.log('📋 RESUMEN DEL BACKUP');
  console.log('='.repeat(60));
  console.log(`✅ Colecciones exitosas: ${results.filter(r => r.success).length}/${COLLECTIONS.length}`);
  console.log(`📄 Total de documentos: ${totalDocs}`);
  console.log(`📁 Resumen guardado en: ${summaryFile}`);
  
  // Mostrar resultados por colección
  console.log('\n📊 Detalle por colección:');
  results.forEach(r => {
    const status = r.success ? '✅' : '❌';
    console.log(`  ${status} ${r.collection}: ${r.count} documentos`);
    if (!r.success) {
      console.log(`     Error: ${r.error}`);
    }
  });
  
  console.log('\n✅ Backup completado!');
  
  // Verificar integridad
  const failed = results.filter(r => !r.success);
  if (failed.length > 0) {
    console.log(`\n⚠️  ADVERTENCIA: ${failed.length} colección(es) fallaron. Revisa los errores arriba.`);
    process.exit(1);
  }
  
  process.exit(0);
}

main().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});

