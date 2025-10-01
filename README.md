# morphgrid-wasm

WebAssembly runtime and API for HFST/GiellaLT morphology in web apps, with a simple, framework‑agnostic interface and static demos.

**✨ Now supporting 13 languages with full HFST morphological analysis including weighted transducers!**

## Documentation

- **[Developer Guide](docs/README.md)** - API overview and integration guide
- **[Morphological Generation Guide](docs/MORPHOLOGICAL_GENERATION.md)** - Comprehensive guide to word form generation and analysis with examples for all languages

## Packages
- packages/core – WASM loader + Web Worker + public API (ESM)
- packages/joiner – token join rules (used by core.join)
- packages/demo – static demo pages (no framework)

## Key features
- **HFST optimized lookup compiled to WASM** (hfst.wasm) with Web Worker wrapper
- **Weighted transducer support** for advanced morphological analysis
- **13 languages supported**: English, French, Spanish, Italian, German, Finnish, Estonian, Basque, Norwegian, Russian, Swedish, Catalan, Danish
- Lazy‑loaded language packs with SHA‑256 integrity; Cache Storage caching
- Minimal public API: load, analyse, generate, join
- **FST-based joins** using existing GiellaLT/Apertium morphological transducers
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

### Supported Languages (13 total)

#### With Full HFST Morphological Analysis:
1. 🇬🇧 **English** (en-US) - Converted from Apertium English
2. 🇫🇷 **French** (fr-FR) - Elision rules (`je + aime → j'aime`, `le + homme → l'homme`)
3. 🇪🇸 **Spanish** (es-ES) - Clitic attachment (`dar + me → darme`) and contractions (`de + el → del`)
4. 🇩🇪 **German** (de-DE) - Compound formation (`Haus + Tür → Haustür`)
5. 🇮🇹 **Italian** (it-IT)
6. 🇫🇮 **Finnish** (fi-FI)
7. 🇪🇪 **Estonian** (et-EE)
8. 🇪🇸 **Basque** (eu-ES)
9. 🇳🇴 **Norwegian** (no-NO)
10. 🇷🇺 **Russian** (ru-RU)
11. 🇸🇪 **Swedish** (sv-SE)
12. 🇪🇸 **Catalan** (ca-ES)
13. 🇩🇰 **Danish** (da-DK)

All languages use HFST weighted transducers for accurate morphological analysis.

**Note**: English transducer is converted from Apertium lttoolbox format and works perfectly in WASM! Handles irregular verbs (went→go), irregular plurals (mice→mouse, children→child), and complex morphology.

### Benefits
- **No custom rule files**: Uses existing, well-tested morphological transducers
- **Linguistically accurate**: Based on real morphological analysis
- **Extensible**: Easy to add new languages by implementing morphological feature logic
- **Robust**: Graceful fallback when FST analysis is unavailable

## Tests

### Running Tests:
```bash
# Build and run all tests
npm test

# Run specific package tests
npm -w packages/core test
```

### Test Types:
- **TSV gold tests** for joins (tests/test.tsv)
- **Morphology tests** for stemming/generation
- **HFST integration tests** (require Bun runtime)

### Important Note on HFST Tests:
HFST WASM tests **do not work in Node.js** due to WASM limitations. Use **Bun** for HFST testing:

```bash
# Install Bun (if not already installed)
curl -fsSL https://bun.sh/install | bash

# Run HFST tests with Bun
bun packages/core/test/bun-hfst-test.js
```

Browser-based HFST tests work perfectly - see the demos!

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
