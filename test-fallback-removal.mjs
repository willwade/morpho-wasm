import { morph, configureMorphRuntime } from './dist/index.js';

console.log('Testing fallback removal...');

// Test 1: HFST mode with a language that has no models
configureMorphRuntime('hfst');

console.log('\n=== Testing HFST mode with unsupported language ===');
await morph.load('xx-XX'); // Non-existent language
console.log('Analysis test (unsupported):', await morph.analyse('test', 'xx-XX'));
console.log('Generation test (unsupported):', await morph.generate({lemma: 'test', tags: ['N']}, 'xx-XX'));

console.log('\n=== Testing rules mode (should still work) ===');
configureMorphRuntime('rules');
await morph.load('fr-FR');
console.log('Analysis test (rules):', await morph.analyse('parlant', 'fr-FR'));
console.log('Generation test (rules):', await morph.generate({lemma: 'chat', tags: ['PL']}, 'fr-FR'));
console.log('Join test (rules):', await morph.join('je', 'aime', 'fr-FR'));

console.log('\n=== Testing HFST mode with supported language ===');
configureMorphRuntime('hfst');
await morph.load('fr-FR');
console.log('Analysis test (HFST):', await morph.analyse('parlant', 'fr-FR'));
console.log('Generation test (HFST):', await morph.generate({lemma: 'chat', tags: ['PL']}, 'fr-FR'));
console.log('Join test (HFST):', await morph.join('je', 'aime', 'fr-FR'));
