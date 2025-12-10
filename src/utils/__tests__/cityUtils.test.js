/**
 * Tests para cityUtils.js
 * 
 * Ejecutar con: node src/utils/__tests__/cityUtils.test.js
 */

import { normalizeCity, denormalizeCity } from '../cityUtils.js';

// Colores para output en consola
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`${GREEN}✅${RESET} ${name}`);
    testsPassed++;
  } catch (error) {
    console.log(`${RED}❌${RESET} ${name}`);
    console.log(`   Error: ${error.message}`);
    testsFailed++;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, but got ${actual}`);
  }
}

console.log(`${YELLOW}🧪 Ejecutando tests de cityUtils...${RESET}\n`);

// ============================================================================
// Tests de normalizeCity
// ============================================================================

test('normalizeCity: "EL ALTO" → "el_alto"', () => {
  assertEqual(normalizeCity('EL ALTO'), 'el_alto');
});

test('normalizeCity: "La Paz" → "la_paz"', () => {
  assertEqual(normalizeCity('La Paz'), 'la_paz');
});

test('normalizeCity: "SANTA CRUZ" → "santa_cruz"', () => {
  assertEqual(normalizeCity('SANTA CRUZ'), 'santa_cruz');
});

test('normalizeCity: "EL  ALTO" (múltiples espacios) → "el_alto"', () => {
  assertEqual(normalizeCity('EL  ALTO'), 'el_alto');
});

test('normalizeCity: "  EL ALTO  " (con espacios) → "el_alto"', () => {
  assertEqual(normalizeCity('  EL ALTO  '), 'el_alto');
});

test('normalizeCity: null → null', () => {
  assertEqual(normalizeCity(null), null);
});

test('normalizeCity: undefined → null', () => {
  assertEqual(normalizeCity(undefined), null);
});

test('normalizeCity: "" (string vacío) → null', () => {
  assertEqual(normalizeCity(''), null);
});

test('normalizeCity: "   " (solo espacios) → null', () => {
  assertEqual(normalizeCity('   '), null);
});

// ============================================================================
// Tests de denormalizeCity
// ============================================================================

test('denormalizeCity: "el_alto" → "EL ALTO"', () => {
  assertEqual(denormalizeCity('el_alto'), 'EL ALTO');
});

test('denormalizeCity: "la_paz" → "LA PAZ"', () => {
  assertEqual(denormalizeCity('la_paz'), 'LA PAZ');
});

test('denormalizeCity: "santa_cruz" → "SANTA CRUZ"', () => {
  assertEqual(denormalizeCity('santa_cruz'), 'SANTA CRUZ');
});

test('denormalizeCity: "el_alto_central" → "EL ALTO CENTRAL"', () => {
  assertEqual(denormalizeCity('el_alto_central'), 'EL ALTO CENTRAL');
});

test('denormalizeCity: null → null', () => {
  assertEqual(denormalizeCity(null), null);
});

test('denormalizeCity: undefined → undefined', () => {
  assertEqual(denormalizeCity(undefined), undefined);
});

test('denormalizeCity: "" (string vacío) → ""', () => {
  assertEqual(denormalizeCity(''), '');
});

// ============================================================================
// Tests de round-trip (normalizar y desnormalizar)
// ============================================================================

test('Round-trip: "EL ALTO" → normalize → denormalize → "EL ALTO"', () => {
  const original = 'EL ALTO';
  const normalized = normalizeCity(original);
  const denormalized = denormalizeCity(normalized);
  assertEqual(denormalized, original);
});

test('Round-trip: "La Paz" → normalize → denormalize → "LA PAZ"', () => {
  const original = 'La Paz';
  const normalized = normalizeCity(original);
  const denormalized = denormalizeCity(normalized);
  assertEqual(denormalized, 'LA PAZ'); // Nota: se convierte a mayúsculas
});

test('Round-trip: "SANTA CRUZ" → normalize → denormalize → "SANTA CRUZ"', () => {
  const original = 'SANTA CRUZ';
  const normalized = normalizeCity(original);
  const denormalized = denormalizeCity(normalized);
  assertEqual(denormalized, original);
});

// ============================================================================
// Resumen
// ============================================================================

console.log(`\n${YELLOW}📊 Resumen:${RESET}`);
console.log(`${GREEN}✅ Tests pasados: ${testsPassed}${RESET}`);
if (testsFailed > 0) {
  console.log(`${RED}❌ Tests fallidos: ${testsFailed}${RESET}`);
} else {
  console.log(`${GREEN}✅ Todos los tests pasaron!${RESET}`);
}

process.exit(testsFailed > 0 ? 1 : 0);


