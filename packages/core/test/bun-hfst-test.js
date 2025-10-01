/**
 * Test HFST pack loading with Bun
 * Run with: bun run packages/core/test/bun-hfst-test.js
 */

import { morph, configureMorphRuntime, configureMorphHfst } from '../dist/index.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

console.log('=== Bun HFST Test ===\n');

// Get the absolute path to the pack file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../../..');
const packPath = join(projectRoot, 'packages/packs/de-DE/v1/analysis.hfstol');
const genPath = join(projectRoot, 'packages/packs/de-DE/v1/generate.hfstol');

console.log('Project root:', projectRoot);
console.log('Pack path:', packPath);
console.log('Gen path:', genPath);

// Configure HFST mode with explicit pack URL
configureMorphRuntime('hfst');

// Create file URL with generation transducer
const packUrl = `file://${packPath}?gen=file://${genPath}`;
console.log('Pack URL:', packUrl);
console.log();

configureMorphHfst({ packUrl });

console.log('Loading German pack...');
await morph.load('de-DE');
console.log('✓ Load completed\n');

console.log('Waiting 2 seconds for WASM to fully initialize...');
await new Promise(resolve => setTimeout(resolve, 2000));
console.log('✓ Wait completed\n');

// Test German words
console.log('Testing German words:');
const germanWords = [
  { word: 'Häuser', expected: 'Haus' },
  { word: 'laufen', expected: 'laufen' },
  { word: 'gegangen', expected: 'gehen' },
  { word: 'Bücher', expected: 'Buch' },
];

for (const { word, expected } of germanWords) {
  const result = await morph.analyse(word, 'de-DE');
  const lemma = result[0]?.lemma;
  const status = lemma === expected ? '✅' : '❌';
  console.log(`  ${status} ${word} → ${lemma} (expected: ${expected})`);
  if (result.length > 0) {
    console.log(`    Full result: ${JSON.stringify(result[0])}`);
  }
}

console.log();

// Test more German words
console.log('Testing German verbs:');
const germanVerbs = [
  { word: 'laufe', expected: 'laufen' },
  { word: 'läuft', expected: 'laufen' },
  { word: 'gelaufen', expected: 'laufen' },
];

for (const { word, expected } of germanVerbs) {
  const result = await morph.analyse(word, 'de-DE');
  const lemma = result[0]?.lemma;
  const status = lemma === expected ? '✅' : '❌';
  console.log(`  ${status} ${word} → ${lemma} (expected: ${expected})`);
  if (result.length > 0) {
    console.log(`    Full result: ${JSON.stringify(result[0])}`);
  }
}

console.log();

// Test German nouns
console.log('Testing German nouns:');
const germanNouns = [
  { word: 'Haus', expected: 'Haus' },
  { word: 'Buch', expected: 'Buch' },
  { word: 'Kind', expected: 'Kind' },
];

for (const { word, expected } of germanNouns) {
  const result = await morph.analyse(word, 'de-DE');
  const lemma = result[0]?.lemma;
  const status = lemma === expected ? '✅' : '❌';
  console.log(`  ${status} ${word} → ${lemma} (expected: ${expected})`);
  if (result.length > 0) {
    console.log(`    Full result: ${JSON.stringify(result[0])}`);
  }
}

console.log('\n=== Test Complete ===');
process.exit(0);

