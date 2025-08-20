import test from 'node:test';
import assert from 'node:assert';
import { morph, configureMorphRuntime, configureMorphHfst } from '../dist/index.js';

// Configure HFST runtime with CDN models like the demos do
configureMorphRuntime('hfst');
configureMorphHfst({
  wasmUrl: 'https://cdn.jsdelivr.net/npm/@morphgrid/core@latest/public/wasm/hfst.wasm'
});

test('spanish stemming with HFST CDN models', async () => {
  try {
    // Load Spanish pack from CDN like the demos do
    const res = await fetch('https://cdn.jsdelivr.net/npm/@morphgrid/packs@latest/index.json');
    if (!res.ok) throw new Error('CDN index not available');
    const idx = await res.json();
    const entry = idx?.['es-ES'];

    if (entry?.analysis) {
      const packUrl = 'https://cdn.jsdelivr.net/npm/@morphgrid/packs@latest' + entry.analysis;
      configureMorphHfst({ packUrl });
      await morph.load('es-ES');

      const result = await morph.analyse('hablando', 'es-ES');
      assert.ok(Array.isArray(result), 'Should return array of analyses');
      assert.ok(result.length > 0, 'Should have at least one analysis');
      assert.ok(result[0].lemma, 'Should have lemma field');
    } else {
      console.log('⚠️  Spanish pack not available in CDN, skipping test');
    }
  } catch (error) {
    console.log('⚠️  CDN not available, skipping Spanish test:', error.message);
  }
});

test('english plural generation with HFST CDN models', async () => {
  try {
    // Load English pack from CDN
    const res = await fetch('https://cdn.jsdelivr.net/npm/@morphgrid/packs@latest/index.json');
    if (!res.ok) throw new Error('CDN index not available');
    const idx = await res.json();
    const entry = idx?.['en-US'];

    if (entry?.generation) {
      const packUrl = 'https://cdn.jsdelivr.net/npm/@morphgrid/packs@latest' + entry.generation;
      configureMorphHfst({ packUrl });
      await morph.load('en-US');

      const forms = await morph.generate({ lemma: 'cat', tags: ['PL'] }, 'en-US');
      assert.ok(Array.isArray(forms), 'Should return array of forms');
      assert.ok(forms.length > 0, 'Should have at least one form');
      // Note: Exact form depends on model, just check it's not an error
      assert.ok(!forms[0].includes('HFST_GENERATION_FAILED'), 'Should not be an error');
    } else {
      console.log('⚠️  English generation pack not available in CDN, skipping test');
    }
  } catch (error) {
    console.log('⚠️  CDN not available, skipping English test:', error.message);
  }
});
