/**
 * Script de Análisis: cityStock
 * Fase 4.1: Analiza la estructura de cityStock en Firebase
 * 
 * Uso: node scripts/analyze-cityStock.js
 */

import admin from 'firebase-admin';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '../.env.local') });

// Inicializar Firebase Admin
const serviceAccount = JSON.parse(
  await fs.readFile(path.join(__dirname, '../serviceAccountKey.json'), 'utf8')
);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

async function analyzeCityStock() {
  console.log('🔍 Analizando estructura de cityStock...\n');

  try {
    // 1. Obtener todos los documentos de cityStock
    const snapshot = await db.collection('cityStock').get();
    
    if (snapshot.empty) {
      console.log('⚠️  No se encontraron documentos en cityStock');
      return;
    }

    console.log(`📊 Documentos encontrados: ${snapshot.size}\n`);

    // 2. Analizar cada ciudad
    const ciudades = [];
    const allSkus = new Set();
    const totalesPorCiudad = {};

    snapshot.forEach(doc => {
      const ciudad = doc.id;
      const data = doc.data();
      
      // Obtener todos los SKUs de esta ciudad
      const skus = Object.keys(data).filter(key => {
        // Filtrar campos que no son SKUs (como timestamps, etc.)
        const value = data[key];
        return typeof value === 'number' && value >= 0;
      });

      const totalStock = skus.reduce((sum, sku) => sum + (data[sku] || 0), 0);

      ciudades.push({
        ciudad,
        skus: skus.length,
        totalStock,
        skusList: skus
      });

      // Agregar SKUs al conjunto global
      skus.forEach(sku => allSkus.add(sku));

      // Calcular total por ciudad
      totalesPorCiudad[ciudad] = totalStock;
    });

    // 3. Mostrar análisis
    console.log('='.repeat(60));
    console.log('📋 ANÁLISIS DE cityStock');
    console.log('='.repeat(60));
    console.log(`\n🏙️  Ciudades encontradas: ${ciudades.length}`);
    ciudades.forEach(c => {
      console.log(`   - ${c.ciudad}: ${c.skus} SKUs, Total stock: ${c.totalStock}`);
    });

    console.log(`\n📦 SKUs únicos encontrados: ${allSkus.size}`);
    console.log(`   SKUs: ${Array.from(allSkus).sort().join(', ')}`);

    console.log(`\n📊 Total stock global: ${Object.values(totalesPorCiudad).reduce((a, b) => a + b, 0)}`);

    // 4. Comparar con almacenCentral
    console.log('\n' + '='.repeat(60));
    console.log('🔍 Comparación con almacenCentral');
    console.log('='.repeat(60));

    const productosSnapshot = await db.collection('almacenCentral').get();
    const productosSkus = new Set();
    productosSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.sku) productosSkus.add(data.sku);
    });

    console.log(`\n📦 SKUs en almacenCentral: ${productosSkus.size}`);
    console.log(`📦 SKUs en cityStock: ${allSkus.size}`);

    // SKUs en cityStock pero no en productos
    const skusSinProducto = Array.from(allSkus).filter(sku => !productosSkus.has(sku));
    if (skusSinProducto.length > 0) {
      console.warn(`\n⚠️  SKUs en cityStock sin producto correspondiente: ${skusSinProducto.length}`);
      console.warn(`   ${skusSinProducto.join(', ')}`);
    }

    // SKUs en productos pero no en cityStock
    const skusSinStock = Array.from(productosSkus).filter(sku => !allSkus.has(sku));
    if (skusSinStock.length > 0) {
      console.log(`\nℹ️  SKUs en productos sin stock en ciudades: ${skusSinStock.length}`);
      console.log(`   ${skusSinStock.join(', ')}`);
    }

    // 5. Estimar filas en Supabase
    let totalFilas = 0;
    ciudades.forEach(c => {
      totalFilas += c.skus;
    });

    console.log('\n' + '='.repeat(60));
    console.log('📊 ESTIMACIÓN DE MIGRACIÓN');
    console.log('='.repeat(60));
    console.log(`\n📝 Filas estimadas en tabla city_stock: ${totalFilas}`);
    console.log(`   (${ciudades.length} ciudades × promedio ${Math.round(totalFilas / ciudades.length)} SKUs por ciudad)`);

    console.log('\n✅ Análisis completado\n');

  } catch (error) {
    console.error('❌ Error en análisis:', error);
    process.exit(1);
  }
}

// Ejecutar análisis
analyzeCityStock()
  .then(() => {
    console.log('🎉 Proceso finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });



