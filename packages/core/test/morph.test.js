import test from 'node:test';
import assert from 'node:assert';
import { morph } from '../dist/index.js';

// Note: Morphological analysis and generation tests are skipped because they require
// full HFST language models to be properly configured. The join functionality
// (which is the core feature) is thoroughly tested in other test files.

test('morph module loads successfully', async () => {
  // Basic smoke test to ensure the module loads
  assert.ok(typeof morph.load === 'function', 'morph.load should be a function');
  assert.ok(typeof morph.analyse === 'function', 'morph.analyse should be a function');
  assert.ok(typeof morph.generate === 'function', 'morph.generate should be a function');
  assert.ok(typeof morph.join === 'function', 'morph.join should be a function');
});
