#!/usr/bin/env bun
// Simple test with very common English words

import { Worker } from 'worker_threads';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../../..');

console.log('=== Simple English Word Test ===\n');

const workerPath = join(projectRoot, 'packages/core/dist-worker/worker.js');
const packPath = join(projectRoot, 'packages/packs/en-US/v1/analysis.hfstol');
const packUrl = `file://${packPath}`;

console.log('Worker path:', workerPath);
console.log('Pack path:', packPath);
console.log('Pack URL:', packUrl);

const worker = new Worker(workerPath);

let upResolve = null;

worker.on('message', (msg) => {
  if (msg.type === 'ready') {
    console.log('✓ Ready');
    return;
  }
  
  if (msg.type === 'up' && upResolve) {
    upResolve(msg);
    upResolve = null;
    return;
  }
});

function sendInit() {
  return new Promise((resolve) => {
    const handler = (msg) => {
      if (msg.type === 'ready') {
        worker.off('message', handler);
        resolve();
      }
    };
    worker.on('message', handler);
    worker.postMessage({ type: 'init' });
  });
}

function sendLoadPack(packUrl) {
  return new Promise((resolve) => {
    const handler = (msg) => {
      if (msg.type === 'ready') {
        worker.off('message', handler);
        resolve();
      }
    };
    worker.on('message', handler);
    worker.postMessage({ type: 'load_pack', packUrl });
  });
}

function sendApplyUp(input) {
  return new Promise((resolve, reject) => {
    upResolve = resolve;
    worker.postMessage({ type: 'apply_up', input });
    setTimeout(() => {
      if (upResolve) {
        upResolve = null;
        reject(new Error(`Timeout for: ${input}`));
      }
    }, 5000);
  });
}

async function testWord(word) {
  try {
    const result = await sendApplyUp(word);
    const outputs = result.outputs || [];
    console.log(`  "${word}" → [${outputs.join(', ')}]`);
    return outputs;
  } catch (error) {
    console.log(`  "${word}" → ERROR: ${error.message}`);
    return [];
  }
}

(async () => {
  try {
    console.log('\nInitializing...');
    await sendInit();
    
    console.log('Loading pack...');
    await sendLoadPack(packUrl);
    
    console.log('\nTesting very simple words:');
    await testWord('a');
    await testWord('the');
    await testWord('is');
    await testWord('I');
    await testWord('you');
    
    console.log('\nTesting simple nouns:');
    await testWord('cat');
    await testWord('dog');
    await testWord('man');
    await testWord('boy');
    
    console.log('\nTesting plurals:');
    await testWord('cats');
    await testWord('dogs');
    await testWord('men');
    await testWord('boys');
    
    console.log('\nTesting verbs:');
    await testWord('go');
    await testWord('run');
    await testWord('walk');
    
    console.log('\nTesting past tense:');
    await testWord('went');
    await testWord('ran');
    await testWord('walked');
    
    console.log('\nTesting with uppercase:');
    await testWord('Cat');
    await testWord('CAT');
    await testWord('The');
    
    console.log('\n=== Test Complete ===');
    worker.terminate();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    worker.terminate();
    process.exit(1);
  }
})();

