import test from 'node:test';
import assert from 'node:assert';
import { decideJoin } from '../dist/index.js';

test('decideJoin without HFST adapter returns error message', async () => {
  const decision = await decideJoin('test', 'word', 'fr-FR');
  
  assert.strictEqual(decision.surfacePrev, 'test');
  assert.strictEqual(decision.surfaceNext, 'word');
  assert.strictEqual(decision.joiner, ' ');
  assert.strictEqual(decision.noSpace, false);
  assert.ok(decision.reason.includes('no join model loaded'));
  assert.ok(decision.reason.includes('fr-FR'));
});

test('decideJoin with mock HFST adapter uses HFST result', async () => {
  // Mock HFST adapter that returns a specific result
  const mockAdapter = {
    async applyJoin(prev, next, lang) {
      if (prev === 'je' && next === 'aime' && lang === 'fr-FR') {
        return {
          surfacePrev: "j'",
          surfaceNext: 'aime',
          joiner: '',
          noSpace: true,
          reason: 'FR elision (HFST)'
        };
      }
      return null;
    }
  };
  
  const decision = await decideJoin('je', 'aime', 'fr-FR', { hfst: mockAdapter });
  
  assert.strictEqual(decision.surfacePrev, "j'");
  assert.strictEqual(decision.surfaceNext, 'aime');
  assert.strictEqual(decision.joiner, '');
  assert.strictEqual(decision.noSpace, true);
  assert.strictEqual(decision.reason, 'FR elision (HFST)');
});

test('decideJoin with failing HFST adapter falls back to error', async () => {
  // Mock HFST adapter that throws an error
  const failingAdapter = {
    async applyJoin(prev, next, lang) {
      throw new Error('HFST model not loaded');
    }
  };
  
  const decision = await decideJoin('test', 'word', 'en-US', { hfst: failingAdapter });
  
  assert.strictEqual(decision.surfacePrev, 'test');
  assert.strictEqual(decision.surfaceNext, 'word');
  assert.strictEqual(decision.joiner, ' ');
  assert.strictEqual(decision.noSpace, false);
  assert.ok(decision.reason.includes('no join model loaded'));
  assert.ok(decision.reason.includes('en-US'));
});

test('decideJoin with HFST adapter returning null falls back to error', async () => {
  // Mock HFST adapter that returns null (no match)
  const nullAdapter = {
    async applyJoin(prev, next, lang) {
      return null;
    }
  };
  
  const decision = await decideJoin('unknown', 'words', 'de-DE', { hfst: nullAdapter });
  
  assert.strictEqual(decision.surfacePrev, 'unknown');
  assert.strictEqual(decision.surfaceNext, 'words');
  assert.strictEqual(decision.joiner, ' ');
  assert.strictEqual(decision.noSpace, false);
  assert.ok(decision.reason.includes('no join model loaded'));
  assert.ok(decision.reason.includes('de-DE'));
});
