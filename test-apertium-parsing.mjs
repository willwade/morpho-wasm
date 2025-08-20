import { morph, configureMorphRuntime, configureMorphHfst } from './dist/index.js';
import fs from 'fs';

console.log('🔧 Testing Apertium format parsing...');

// Configure with French pack to test Apertium parsing
const indexPath = '../../packs/index.json';
const idx = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
const entry = idx['fr-FR'];

if (entry?.analysis) {
  const params = new URLSearchParams();
  if (entry.sha256) params.set('sha256', entry.sha256);
  
  const baseUrl = 'file://' + process.cwd() + '/../..';
  const packUrl = baseUrl + entry.analysis + (params.toString() ? `?${params}` : '');
  
  configureMorphRuntime('hfst');
  configureMorphHfst({ packUrl });
  
  console.log('🔧 Loading French pack...');
  await morph.load('fr-FR');
  console.log('🔧 Load complete');
  
  // Test morphological analysis parsing
  console.log('\n🔧 Testing morphological analysis parsing:');
  const testWords = ['je', 'aime', 'le', 'homme'];
  
  for (const word of testWords) {
    console.log(`\n📝 Analyzing: ${word}`);
    const result = await morph.analyse(word, 'fr-FR');
    console.log(`   Raw result: ${JSON.stringify(result, null, 2)}`);
    
    if (result.length > 0 && result[0].tags.length > 0) {
      console.log(`   ✅ Successfully parsed Apertium tags: [${result[0].tags.join(', ')}]`);
    } else {
      console.log(`   ❌ No tags parsed`);
    }
  }
  
  // Test FST-based join with proper morphological analysis
  console.log('\n🔧 Testing FST-based join with Apertium morphological features:');
  const joinTests = [
    { prev: 'je', next: 'aime', expected: "j'aime" },
    { prev: 'le', next: 'homme', expected: "l'homme" },
    { prev: 'le', next: 'chat', expected: 'le chat' }
  ];
  
  for (const test of joinTests) {
    console.log(`\n📝 Testing join: ${test.prev} + ${test.next}`);
    const result = await morph.join(test.prev, test.next, 'fr-FR');
    const joined = `${result.surfacePrev}${result.joiner}${result.surfaceNext}`;
    console.log(`   Result: ${joined}`);
    console.log(`   Expected: ${test.expected}`);
    console.log(`   Match: ${joined === test.expected ? '✅' : '❌'}`);
    console.log(`   Reason: ${result.reason}`);
  }
  
} else {
  console.log('❌ French pack not configured properly');
}
