/**
 * Test manual de cityUtils para FASE 5.4
 * 
 * Ejecutar con: node scripts/test-fase-5-4-city-utils.js
 */

import { normalizeCity, denormalizeCity } from '../src/utils/cityUtils.js';

console.log('🧪 Testing cityUtils...\n');

// Test 1: normalizeCity
console.log('📝 Test 1: normalizeCity');
const testCases = [
  { input: 'EL ALTO', expected: 'el_alto' },
  { input: 'La Paz', expected: 'la_paz' },
  { input: 'SANTA CRUZ', expected: 'santa_cruz' },
  { input: '  EL ALTO  ', expected: 'el_alto' },
  { input: null, expected: null },
  { input: undefined, expected: null },
  { input: '', expected: null },
];

let passed = 0;
let failed = 0;

testCases.forEach(({ input, expected }, index) => {
  const result = normalizeCity(input);
  if (result === expected) {
    console.log(`  ✅ Test ${index + 1}: normalizeCity("${input}") = "${result}"`);
    passed++;
  } else {
    console.log(`  ❌ Test ${index + 1}: normalizeCity("${input}") = "${result}", expected "${expected}"`);
    failed++;
  }
});

// Test 2: denormalizeCity
console.log('\n📝 Test 2: denormalizeCity');
const testCases2 = [
  { input: 'el_alto', expected: 'EL ALTO' },
  { input: 'la_paz', expected: 'LA PAZ' },
  { input: 'santa_cruz', expected: 'SANTA CRUZ' },
  { input: null, expected: null },
  { input: undefined, expected: undefined },
  { input: '', expected: '' },
];

testCases2.forEach(({ input, expected }, index) => {
  const result = denormalizeCity(input);
  if (result === expected) {
    console.log(`  ✅ Test ${index + 1}: denormalizeCity("${input}") = "${result}"`);
    passed++;
  } else {
    console.log(`  ❌ Test ${index + 1}: denormalizeCity("${input}") = "${result}", expected "${expected}"`);
    failed++;
  }
});

// Test 3: Round-trip
console.log('\n📝 Test 3: Round-trip (normalize → denormalize)');
const roundTripCases = ['EL ALTO', 'La Paz', 'SANTA CRUZ', 'EL  ALTO'];

roundTripCases.forEach((input, index) => {
  const normalized = normalizeCity(input);
  const denormalized = denormalizeCity(normalized);
  // normalizeCity normaliza múltiples espacios a un solo guion bajo
  // así que "EL  ALTO" → "el_alto" → "EL ALTO" (no "EL  ALTO")
  const expected = input.trim().replace(/\s+/g, ' ').toUpperCase();
  if (denormalized === expected) {
    console.log(`  ✅ Test ${index + 1}: "${input}" → "${normalized}" → "${denormalized}"`);
    passed++;
  } else {
    console.log(`  ❌ Test ${index + 1}: "${input}" → "${normalized}" → "${denormalized}", expected "${expected}"`);
    failed++;
  }
});

// Resumen
console.log(`\n📊 Resumen:`);
console.log(`  ✅ Tests pasados: ${passed}`);
if (failed > 0) {
  console.log(`  ❌ Tests fallidos: ${failed}`);
  process.exit(1);
} else {
  console.log(`  ✅ Todos los tests pasaron!`);
  process.exit(0);
}

