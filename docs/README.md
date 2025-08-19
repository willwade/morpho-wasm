# morphgrid-wasm Documentation

This folder contains developer guides for:
- Integrators embedding the API (morph.load/analyse/generate/join)
- Contributors working on core/joiner/worker and language packs

See also: tests/test.tsv for join gold cases.

## 1. Public API (core)

Import from the ESM build:

```js
import {
  morph,
  configureMorphRuntime,     // 'rules' or 'hfst'
  configureMorphHfst,        // { wasmUrl, packUrl? }
  configureTagOrdering       // 'strict' | 'flexible'
} from '@morphgrid/core';
```

Types of interest:
- LangCode: 'fr-FR'|'es-ES'|'es-MX'|'en-US'|'de-DE'|'it-IT'|'fi-FI'
- Analyse: { lemma: string; tags: string[]; surface: string }
- GenerateInput: { lemma: string; tags: string[] }
- JoinDecision: { surfacePrev, surfaceNext, joiner, noSpace, reason }

Core methods:
- await morph.load(lang)
- await morph.analyse(surface, lang)
- await morph.generate({ lemma, tags }, lang)
- await morph.join(prev, next, lang)

Runtime selection:
- configureMorphRuntime('hfst') to use the HFST Worker stub + rules for join
- configureMorphHfst({ wasmUrl, packUrl? }) to set WASM and optional pack URL
  - If packUrl is omitted, core will fetch /packs/index.json and resolve by lang

Tag ordering policy (Asterics requirement):
- configureTagOrdering('strict') preserves tag order provided by UI (grid presses)
- configureTagOrdering('flexible') normalizes tags to a canonical order (default)

## 2. Language packs

- Packs are versioned under /packs/{lang}/vN
- /packs/index.json maps languages to analysis/generation files and SHA-256 checksums
- The Worker caches fetched pack files in Cache Storage ('morph-packs-v1') and verifies checksums when present
- Use packUrl param to override the analysis URL; generation can be hinted with gen= and gensha256=

## 3. Join rules and cohesive text

- morph.join is rule-based for now, with language-specific behavior
  - French: elision for je/le/la/ce/se before vowel or mute h; expanded h-aspiré list
  - English: a/an alternation, simple affix concatenations, child+ren → children
  - Italian: l’ and un’ elision; -mente derivation
- Token buffer demo: /packages/demo/public/token-buffer.html
  - Enter tokens and inspect JoinDecision chain to render cohesive text

## 4. Demos

- HFST demo: /packages/demo/public/hfst.html
  - Load a pack via packs/index.json, run analyse/generate, toggle raw HFST IO
  - Tag ordering selector affects generate()
- Cohesive text demo: /packages/demo/public/token-buffer.html

Serve the repo with a static server at project root.

## 5. Testing

- Node unit tests: npm -w packages/core test
  - tests/test.tsv contains gold join expectations
- Add Playwright E2E for cohesive text and tag ordering (planned)

## 6. Contributing

- Keep language-specific rules minimal and covered by TSV tests
- Prefer integrating HFST features to drive join decisions where possible
- Ensure Worker requests are serialized (queue implemented in workerClient)
- Discuss pack licensing (GiellaLT analysers vary); update THIRD_PARTY_NOTICES
