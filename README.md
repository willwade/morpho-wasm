# morphgrid-wasm

WebAssembly runtime and API for HFST/GiellaLT morphology in web apps, with a simple, framework‑agnostic interface and a static demo. See docs/README.md for the developer guide and roadmap highlights.

## Packages
- packages/core – WASM loader + Web Worker + public API (ESM)
- packages/joiner – token join rules (used by core.join)
- packages/demo – static demo pages (no framework)

## Key features
- HFST optimized lookup compiled to WASM (hfst.wasm) with a Worker wrapper
- Lazy‑loaded language packs with SHA‑256 integrity; Cache Storage caching
- Minimal public API: load, analyse, generate, join
- **FST-based joins using existing GiellaLT/Apertium morphological transducers**
- Language-specific join logic: French elision, Spanish clitics, German compounds
- Intelligent fallback system when FST analysis is unavailable
- Grid‑set tag ordering control (strict vs flexible) for generation
- Token buffer “cohesive text” rendering demo

## Quick start (integration)
1) Install and build
- npm install
- npm -w packages/core test (optional)

2) Use the API (vanilla ESM example)

```html
<script type="module">
  import { morph, configureMorphRuntime, configureMorphHfst, configureTagOrdering } from '/packages/core/dist/index.js';
  configureMorphRuntime('hfst');
  configureMorphHfst({ wasmUrl: '/packages/core/public/wasm/hfst.wasm' });
  configureTagOrdering('flexible'); // or 'strict'
  await morph.load('fr-FR');
  const analyses = await morph.analyse('aime', 'fr-FR');
  const forms = await morph.generate({ lemma: 'cheval', tags: ['PL'] }, 'fr-FR');
  const dec = await morph.join('je', 'aime', 'fr-FR'); // -> j’aime
</script>
```

3) Language packs
- packs/index.json maps LangCode to analysis/generation transducers and checksums
- core auto‑resolves when you call morph.load(lang)
- Worker uses Cache Storage and verifies sha256 when present
- **Join decisions use morphological analysis from existing transducers, not separate join files**

## Demos
- **🪄 Smart Writing Assistant**: /packages/demo/public/smart-writing.html
  - **User-friendly interface** with clear examples and explanations
  - **Interactive language tabs** (French, Spanish, German, English, Italian)
  - **Real-time text transformation** with visual feedback
  - **Perfect for non-technical users** - no confusing terminology
- HFST playground: /packages/demo/public/hfst.html
  - Technical interface for developers
  - Analyse/applyDown, choose language pack, toggle raw HFST output
  - Tag ordering selector for generation
- Cohesive text: /packages/demo/public/token-buffer.html
  - Enter tokens, select language/policy, view join decisions and final render

Serve the repo root with any static server and open the URLs above (e.g. http://localhost:8080/packages/demo/public/hfst.html).

## FST-based Join System

The join system uses existing GiellaLT/Apertium morphological transducers to make intelligent decisions about how tokens should be combined:

### How it works
1. **Morphological Analysis**: Analyzes tokens using existing analysis transducers (e.g., `je` → `je<prn><tn><p1><mf><sg>`)
2. **Feature-based Decisions**: Uses morphological features to determine join behavior
3. **Language-specific Logic**: Implements rules for each language based on linguistic patterns
4. **Intelligent Fallback**: Falls back to language-specific rules when FST analysis is unavailable

### Supported Languages
- **French**: Elision rules (`je + aime → j'aime`, `le + homme → l'homme`)
- **Spanish**: Clitic attachment (`dar + me → darme`) and contractions (`de + el → del`)
- **German**: Compound formation (`Haus + Tür → Haustür`)
- **Other languages**: Default spacing with potential for future expansion

### Benefits
- **No custom rule files**: Uses existing, well-tested morphological transducers
- **Linguistically accurate**: Based on real morphological analysis
- **Extensible**: Easy to add new languages by implementing morphological feature logic
- **Robust**: Graceful fallback when FST analysis is unavailable

## Tests
- Node tests: npm -w packages/core test
  - TSV gold tests for joins (tests/test.tsv)
  - Sample stemming/generation tests

## Asterics Grid notes
- Tag ordering control (grid‑set level): configureTagOrdering('strict'|'flexible')
- Automatic French elision in cohesive mode via core.join; expanded h‑aspiré list with room to grow

## Contributing
- Repo structure and plan: PLAN.md
- Core TypeScript builds to dist/ and dist-worker/
- WASM artifacts in packages/core/public/wasm
- PRs: add unit tests for joins (TSV) and language‑specific rules


## Release & versioning (Changesets)
We use Changesets for multi‑package versioning and publishing.
- Create a changeset locally: npm run changeset (pick packages and bump types; write notes)
- On push to main, GitHub Actions opens/updates a “Version Packages” PR
- Merge that PR to tag versions and publish to npm (requires NPM_TOKEN secret)
- Manual: npm run version-packages to apply bumps; npm run release to publish

CI workflows:
- .github/workflows/CI (build/test)
- .github/workflows/release.yml (Changesets PR / publish)

## License
MIT
