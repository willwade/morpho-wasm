import test from 'node:test';
import assert from 'node:assert';
import { morph } from '../dist/index.js';

await morph.load('es-ES');

 test('spanish stemming', async () => {
  const res = await morph.analyse('hablando', 'es-ES');
  assert.strictEqual(res[0].lemma, 'habl');
});

 test('english plural generation', async () => {
  const forms = await morph.generate({ lemma: 'cat', tags: ['PL'] }, 'en-US');
  assert.strictEqual(forms[0], 'cats');
});
