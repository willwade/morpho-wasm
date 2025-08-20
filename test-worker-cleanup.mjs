import { morph, configureMorphRuntime, configureMorphHfst, cleanup } from './packages/core/dist/index.js';

console.log('🔧 Starting worker cleanup test...');

// Configure HFST runtime
configureMorphRuntime('hfst');
configureMorphHfst({
  wasmUrl: 'https://cdn.jsdelivr.net/npm/@morphgrid/core@latest/public/wasm/hfst.wasm'
});

console.log('🔧 Loading Spanish...');
await morph.load('es-ES');

console.log('🔧 Running a simple analysis...');
const result = await morph.analyse('test', 'es-ES');
console.log('🔧 Analysis result:', result);

console.log('🔧 Calling cleanup...');
cleanup();

console.log('🔧 Cleanup called, waiting 2 seconds...');
await new Promise(resolve => setTimeout(resolve, 2000));

console.log('🔧 Test complete - process should exit now');
