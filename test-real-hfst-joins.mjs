import { morph, configureMorphHfst } from './dist/index.js';
import fs from 'fs';

console.log('Testing REAL HFST join functionality...');

// Test Italian (one of the languages with real HFST join transducers)
const indexPath = '../../packs/index.json';
const idx = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
const entry = idx['it-IT'];

if (entry?.analysis && entry?.join) {
  const params = new URLSearchParams();
  if (entry.sha256) params.set('sha256', entry.sha256);
  if (entry.generation) params.set('gen', entry.generation);
  if (entry.generationSha256) params.set('gensha256', entry.generationSha256);
  if (entry.join) params.set('join', entry.join);
  if (entry.joinSha256) params.set('joinsha256', entry.joinSha256);
  
  const baseUrl = 'file://' + process.cwd() + '/../..';
  const packUrl = baseUrl + entry.analysis + (params.toString() ? `?${params}` : '');
  
  console.log('Pack URL:', packUrl);
  console.log('Join model:', entry.join);
  console.log('Join SHA256:', entry.joinSha256);
  
  configureMorphHfst({ packUrl });
  
  await morph.load('it-IT');
  
  console.log('\n=== Italian HFST Join Tests ===');
  console.log('Join test (lo + amico):', await morph.join('lo', 'amico', 'it-IT'));
  console.log('Join test (una + amica):', await morph.join('una', 'amica', 'it-IT'));
  console.log('Join test (bella + mente):', await morph.join('bella', 'mente', 'it-IT'));
  console.log('Join test (unknown):', await morph.join('test', 'word', 'it-IT'));
  
} else {
  console.log('❌ Italian pack not properly configured');
}

// Test Spanish too
console.log('\n=== Spanish HFST Join Tests ===');
const esEntry = idx['es-ES'];
if (esEntry?.join) {
  const esParams = new URLSearchParams();
  if (esEntry.sha256) esParams.set('sha256', esEntry.sha256);
  if (esEntry.generation) esParams.set('gen', esEntry.generation);
  if (esEntry.generationSha256) esParams.set('gensha256', esEntry.generationSha256);
  if (esEntry.join) esParams.set('join', esEntry.join);
  if (esEntry.joinSha256) esParams.set('joinsha256', esEntry.joinSha256);
  
  const baseUrl = 'file://' + process.cwd() + '/../..';
  const esPackUrl = baseUrl + esEntry.analysis + (esParams.toString() ? `?${esParams}` : '');
  
  configureMorphHfst({ packUrl: esPackUrl });
  await morph.load('es-ES');
  
  console.log('Join test (de + el):', await morph.join('de', 'el', 'es-ES'));
  console.log('Join test (a + el):', await morph.join('a', 'el', 'es-ES'));
  console.log('Join test (unknown):', await morph.join('test', 'word', 'es-ES'));
}
