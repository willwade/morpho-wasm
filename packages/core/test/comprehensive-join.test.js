import test from 'node:test';
import assert from 'node:assert';
import { morph, configureMorphRuntime } from '../dist/index.js';

test('Comprehensive join tests for all languages', async () => {
  // Switch to HFST mode
  configureMorphRuntime('hfst');

  // Test French elision
  await test('French elision tests', async () => {
    await morph.load('fr-FR');
    
    const frenchTests = [
      { prev: 'je', next: 'aime', expected: 'j\u2019aime', desc: 'pronoun elision' },
      { prev: 'le', next: 'homme', expected: 'l\u2019homme', desc: 'article elision' },
      { prev: 'de', next: 'eau', expected: 'd\u2019eau', desc: 'preposition elision' },
      { prev: 'ce', next: 'est', expected: 'c\u2019est', desc: 'demonstrative elision' },
      { prev: 'se', next: 'il', expected: 's\u2019il', desc: 'conditional elision' },
      { prev: 'le', next: 'chat', expected: 'le chat', desc: 'no elision with consonant' }
    ];
    
    for (const testCase of frenchTests) {
      const result = await morph.join(testCase.prev, testCase.next, 'fr-FR');
      const joined = `${result.surfacePrev}${result.joiner}${result.surfaceNext}`;
      assert.strictEqual(joined, testCase.expected, 
        `French ${testCase.desc}: ${testCase.prev} + ${testCase.next} should be ${testCase.expected}, got ${joined}`);
    }
  });

  // Test Spanish clitic joining
  await test('Spanish clitic and contraction tests', async () => {
    await morph.load('es-ES');
    
    const spanishTests = [
      { prev: 'de', next: 'el', expected: 'del', desc: 'de + el contraction' },
      { prev: 'a', next: 'el', expected: 'al', desc: 'a + el contraction' },
      { prev: 'dar', next: 'me', expected: 'darme', desc: 'infinitive + clitic' },
      { prev: 'hablar', next: 'te', expected: 'hablarte', desc: 'infinitive + clitic' },
      { prev: 'casa', next: 'grande', expected: 'casa grande', desc: 'no join for adjectives' }
    ];
    
    for (const testCase of spanishTests) {
      const result = await morph.join(testCase.prev, testCase.next, 'es-ES');
      const joined = `${result.surfacePrev}${result.joiner}${result.surfaceNext}`;
      assert.strictEqual(joined, testCase.expected, 
        `Spanish ${testCase.desc}: ${testCase.prev} + ${testCase.next} should be ${testCase.expected}, got ${joined}`);
    }
  });

  // Test German compound formation
  await test('German compound formation tests', async () => {
    await morph.load('de-DE');
    
    const germanTests = [
      { prev: 'Haus', next: 'Tür', expected: 'Haustür', desc: 'basic compound' },
      { prev: 'Auto', next: 'Bahn', expected: 'Autobahn', desc: 'transport compound' },
      { prev: 'Wasser', next: 'Fall', expected: 'Wasserfall', desc: 'nature compound' },
      { prev: 'der', next: 'Mann', expected: 'der Mann', desc: 'no join for articles' }
    ];
    
    for (const testCase of germanTests) {
      const result = await morph.join(testCase.prev, testCase.next, 'de-DE');
      const joined = `${result.surfacePrev}${result.joiner}${result.surfaceNext}`;
      assert.strictEqual(joined, testCase.expected, 
        `German ${testCase.desc}: ${testCase.prev} + ${testCase.next} should be ${testCase.expected}, got ${joined}`);
    }
  });

  // Test fallback behavior for other languages
  await test('Language fallback tests', async () => {
    const fallbackTests = [
      { lang: 'en-US', prev: 'test', next: 'word', expected: 'test word', desc: 'English default spacing' },
      { lang: 'it-IT', prev: 'test', next: 'word', expected: 'test word', desc: 'Italian default spacing' },
      { lang: 'fi-FI', prev: 'test', next: 'word', expected: 'test word', desc: 'Finnish default spacing' }
    ];
    
    for (const testCase of fallbackTests) {
      await morph.load(testCase.lang);
      const result = await morph.join(testCase.prev, testCase.next, testCase.lang);
      const joined = `${result.surfacePrev}${result.joiner}${result.surfaceNext}`;
      assert.strictEqual(joined, testCase.expected, 
        `${testCase.desc}: ${testCase.prev} + ${testCase.next} should be ${testCase.expected}, got ${joined}`);
    }
  });

  // Test join decision structure consistency
  await test('Join decision structure consistency', async () => {
    await morph.load('fr-FR');
    const result = await morph.join('je', 'aime', 'fr-FR');
    
    // Verify all required fields are present
    assert.ok(typeof result.surfacePrev === 'string', 'surfacePrev should be string');
    assert.ok(typeof result.surfaceNext === 'string', 'surfaceNext should be string');
    assert.ok(typeof result.joiner === 'string', 'joiner should be string');
    assert.ok(typeof result.noSpace === 'boolean', 'noSpace should be boolean');
    assert.ok(typeof result.reason === 'string', 'reason should be string');
    
    // Verify logical consistency
    if (result.noSpace) {
      assert.ok(result.joiner === '' || result.joiner === "'" || result.joiner === '-', 
        'noSpace=true should have empty, apostrophe, or hyphen joiner');
    } else {
      assert.strictEqual(result.joiner, ' ', 'noSpace=false should have space joiner');
    }
  });
});

test('FST-based morphological join behavior', async () => {
  configureMorphRuntime('hfst');
  
  // Test that the system correctly identifies when FST analysis is available vs fallback
  await test('FST vs fallback detection', async () => {
    await morph.load('fr-FR');
    
    // Test with French (should use language-specific fallback since FST analysis fails to load)
    const result = await morph.join('je', 'aime', 'fr-FR');
    assert.ok(result.reason.includes('French elision'), 'Should use French-specific logic');
    
    // Verify the result is correct regardless of whether FST or fallback is used
    const joined = `${result.surfacePrev}${result.joiner}${result.surfaceNext}`;
    assert.strictEqual(joined, 'j\u2019aime', 'Result should be correct regardless of method');
  });
});
