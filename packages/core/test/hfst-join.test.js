import test from 'node:test';
import assert from 'node:assert';
import { morph, configureMorphRuntime } from '../dist/index.js';

test('FST-based French elision works correctly', async () => {
  // Switch to HFST mode
  configureMorphRuntime('hfst');

  // Load French language
  await morph.load('fr-FR');

  // Test French elision - should work with our new FST-based system
  const decision = await morph.join('je', 'aime', 'fr-FR');

  // Verify French elision works (using curly quotes to match TSV test data)
  assert.strictEqual(decision.surfacePrev, "j\u2019");
  assert.strictEqual(decision.surfaceNext, 'aime');
  assert.strictEqual(decision.joiner, '');
  assert.strictEqual(decision.noSpace, true);
  assert.ok(decision.reason.includes('French elision'));
});

test('French elision handles various cases correctly', async () => {
  configureMorphRuntime('hfst');
  await morph.load('fr-FR');

  // Test various French elision cases
  const testCases = [
    { prev: 'le', next: 'homme', expected: "l'", shouldElide: true },
    { prev: 'de', next: 'eau', expected: "d'", shouldElide: true },
    { prev: 'le', next: 'chat', expected: 'le', shouldElide: false },
    { prev: 'si', next: 'il', expected: "s'", shouldElide: true },
    { prev: 'si', next: 'elle', expected: 'si', shouldElide: false }
  ];

  for (const testCase of testCases) {
    const decision = await morph.join(testCase.prev, testCase.next, 'fr-FR');

    if (testCase.shouldElide) {
      assert.strictEqual(decision.surfacePrev, testCase.expected);
      assert.strictEqual(decision.joiner, '');
      assert.strictEqual(decision.noSpace, true);
      assert.ok(decision.reason.includes('French elision'));
    } else {
      assert.strictEqual(decision.surfacePrev, testCase.prev);
      assert.strictEqual(decision.joiner, ' ');
      assert.strictEqual(decision.noSpace, false);
    }
  }
});

test('Non-French languages use default spacing', async () => {
  configureMorphRuntime('hfst');

  // Test that non-French languages use default spacing
  const languages = ['en-US', 'it-IT', 'es-ES', 'de-DE'];

  for (const lang of languages) {
    await morph.load(lang);
    const decision = await morph.join('test', 'word', lang);

    // Should use default spacing for languages without specific join logic
    assert.strictEqual(decision.surfacePrev, 'test');
    assert.strictEqual(decision.surfaceNext, 'word');
    assert.strictEqual(decision.joiner, ' ');
    assert.strictEqual(decision.noSpace, false);
    assert.ok(decision.reason.includes(`No join rule found for ${lang}`));
  }
});

test('Join decision structure is consistent', async () => {
  configureMorphRuntime('hfst');
  await morph.load('fr-FR');

  const decision = await morph.join('je', 'aime', 'fr-FR');

  // Verify all required fields are present
  assert.ok(typeof decision.surfacePrev === 'string');
  assert.ok(typeof decision.surfaceNext === 'string');
  assert.ok(typeof decision.joiner === 'string');
  assert.ok(typeof decision.noSpace === 'boolean');
  assert.ok(typeof decision.reason === 'string');

  // Verify joiner is one of the allowed values
  const allowedJoiners = ['', ' ', '-', "'"];
  assert.ok(allowedJoiners.includes(decision.joiner));
});
