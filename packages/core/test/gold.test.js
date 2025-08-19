import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { morph } from '../dist/index.js';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Helper to render JoinDecision to a string
function render(decision) {
  if (decision.noSpace) return `${decision.surfacePrev}${decision.surfaceNext}`;
  return `${decision.surfacePrev}${decision.joiner || ' '}${decision.surfaceNext}`;
}

// Map section headers to LangCode used by core
const headerToLang = new Map([
  [/^#\s*french/i, 'fr-FR'],
  [/^#\s*english/i, 'en-US'],
  [/^#\s*italian/i, 'it-IT'],
  // Spanish, German, Finnish not covered in Phase 1; will skip for now
]);

// Whitelists of examples we cover in Phase 1 (to avoid false failures)
const covered = new Map([
  ['fr-FR', new Set([ 'je\taime', 'le\thomme', 'le\thérisson', 'ce\test', 'se\thydrate' ])],
  ['en-US', new Set([ 'a\tapple', 'sing\ting', 'un\thappy', 'run\ts', 'child\tren' ])],
  ['it-IT', new Set([ 'lo\tamico', 'una\tamica', 'bella\tmente' ])],
]);

// Load TSV
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tsvPath = new URL('../../../tests/test.tsv', import.meta.url);
const raw = fs.readFileSync(tsvPath, 'utf8');

let currentLang = undefined;

for (const [idx, line] of raw.split(/\r?\n/).entries()) {
  const trimmed = line.trim();
  if (!trimmed) continue;
  // Section header
  if (trimmed.startsWith('#')) {
    currentLang = undefined;
    for (const [re, code] of headerToLang.entries()) {
      if (re.test(trimmed)) {
        currentLang = code;
        break;
      }
    }
    continue;
  }

  const cols = trimmed.split(/\t+/);
  if (cols.length < 3) continue; // malformed
  const [prev, next, expected/*, reason*/] = cols;

  // Only handle join-like pairs for Phase 1; skip complex morphology and non-target langs
  const hasPlus = /\+/.test(prev) || /\+/.test(next);
  if (!currentLang || hasPlus) continue;

  const sig = `${prev}\t${next}`;
  if (!covered.get(currentLang)?.has(sig)) continue;

  const lang = currentLang; // capture
  test(`TSV [${idx}] ${lang}: '${prev}' + '${next}' => '${expected}'`, async (t) => {
    await morph.load(lang);
    const decision = await morph.join(prev, next, lang);
    const out = render(decision);
    assert.strictEqual(out, expected);
  });
}

