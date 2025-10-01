#!/usr/bin/env bun
/**
 * Test English HFST morphological analysis with Bun
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Worker } from 'worker_threads';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../../..');

console.log('=== Bun English HFST Test ===\n');
console.log('Project root:', projectRoot);

// Construct paths
const packPath = join(projectRoot, 'packages/packs/en-US/v1/analysis.hfstol');
console.log('Pack path:', packPath);

const packUrl = `file://${packPath}`;
console.log('Pack URL:', packUrl);

// Create worker
const workerPath = join(projectRoot, 'packages/core/dist/worker.js');
const worker = new Worker(workerPath);

// Test words
const testWords = [
  { word: 'houses', expected: 'house' },
  { word: 'running', expected: 'run' },
  { word: 'went', expected: 'go' },
  { word: 'mice', expected: 'mouse' },
  { word: 'children', expected: 'child' },
  { word: 'better', expected: 'good' },
];

let messageId = 0;
const pendingMessages = new Map();
let readyResolve = null;
let upResolve = null;
let downResolve = null;

worker.on('message', (msg) => {
  // Handle ready message
  if (msg.type === 'ready' && readyResolve) {
    readyResolve(msg);
    readyResolve = null;
    return;
  }

  // Handle up message (apply_up response)
  if (msg.type === 'up' && upResolve) {
    upResolve(msg);
    upResolve = null;
    return;
  }

  // Handle down message (apply_down response)
  if (msg.type === 'down' && downResolve) {
    downResolve(msg);
    downResolve = null;
    return;
  }

  // Handle messages with ID
  if (msg.id && pendingMessages.has(msg.id)) {
    const { resolve } = pendingMessages.get(msg.id);
    pendingMessages.delete(msg.id);
    resolve(msg);
  }
});

function sendMessage(type, data = {}) {
  return new Promise((resolve, reject) => {
    // Special handling for init and load_pack messages (they return 'ready')
    if (type === 'init' || type === 'load_pack') {
      readyResolve = resolve;
      worker.postMessage({ type, ...data });
      setTimeout(() => {
        if (readyResolve) {
          readyResolve = null;
          reject(new Error(`Message ${type} timed out`));
        }
      }, 10000);
      return;
    }

    // Special handling for apply_up (returns 'up')
    if (type === 'apply_up') {
      upResolve = resolve;
      worker.postMessage({ type, ...data });
      setTimeout(() => {
        if (upResolve) {
          upResolve = null;
          reject(new Error(`Message ${type} timed out`));
        }
      }, 10000);
      return;
    }

    // Special handling for apply_down (returns 'down')
    if (type === 'apply_down') {
      downResolve = resolve;
      worker.postMessage({ type, ...data });
      setTimeout(() => {
        if (downResolve) {
          downResolve = null;
          reject(new Error(`Message ${type} timed out`));
        }
      }, 10000);
      return;
    }

    const id = ++messageId;
    pendingMessages.set(id, { resolve, reject });
    worker.postMessage({ id, type, ...data });

    // Timeout after 10 seconds
    setTimeout(() => {
      if (pendingMessages.has(id)) {
        pendingMessages.delete(id);
        reject(new Error(`Message ${type} timed out`));
      }
    }, 10000);
  });
}

async function runTests() {
  try {
    console.log('\nLoading English pack...');
    await sendMessage('init');
    console.log('✓ Init completed');

    await sendMessage('load_pack', { packUrl: packUrl });
    console.log('✓ Load completed');
    
    console.log('\nWaiting 2 seconds for WASM to fully initialize...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('✓ Wait completed');
    
    console.log('\nTesting English words:');
    for (const { word, expected } of testWords) {
      const result = await sendMessage('apply_up', { input: word });
      
      if (result.outputs && result.outputs.length > 0) {
        const firstResult = result.outputs[0];
        const lemma = firstResult.split('<')[0].split('+')[0];
        const match = lemma === expected;
        console.log(`  ${match ? '✅' : '❌'} ${word} → ${lemma} (expected: ${expected})`);
        if (!match) {
          console.log(`    Full result: ${firstResult}`);
        }
      } else {
        console.log(`  ❌ ${word} → NO RESULTS (expected: ${expected})`);
      }
    }
    
    console.log('\n=== Test Complete ===\n');
    worker.terminate();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    worker.terminate();
    process.exit(1);
  }
}

runTests();

