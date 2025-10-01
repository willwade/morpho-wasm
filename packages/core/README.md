# @morphgrid/core

**Browser-first** WebAssembly runtime and API for HFST/GiellaLT morphology with FST-based token joining.

## Overview

The core package provides a complete morphological analysis and generation system with intelligent token joining capabilities. It uses HFST (Helsinki Finite-State Technology) compiled to WebAssembly for high-performance morphological processing.

**Primary Environment**: Modern web browsers
**CLI/Testing**: Use [Bun](https://bun.sh/) for excellent WASM support
**Production Servers**: Use [UralicNLP](https://github.com/mikahama/uralicNLP) or [HFST CLI tools](https://hfst.github.io/)

## Key Features

- **HFST WASM Runtime**: High-performance morphological analysis and generation
- **Web Worker Architecture**: Non-blocking processing in browsers
- **FST-based Joins**: Intelligent token combination using morphological analysis
- **Language Pack System**: Lazy-loaded transducers with integrity verification
- **Comprehensive API**: Simple interface for complex morphological operations
- **Full Irregular Forms**: Proper handling of irregular verbs and nouns via HFST transducers

## Quick Start

```typescript
import { morph, configureMorphRuntime, configureMorphHfst } from '@morphgrid/core';

// Configure the runtime
configureMorphRuntime('hfst');
configureMorphHfst({ 
  wasmUrl: '/path/to/hfst.wasm',
  packUrl: '/path/to/packs/' 
});

// Load a language
await morph.load('fr-FR');

// Analyze words
const analyses = await morph.analyse('aime', 'fr-FR');
// Returns: [{ lemma: 'aimer', surface: 'aime', tags: ['vblex', 'pri', 'p1', 'sg'] }]

// Generate word forms  
const forms = await morph.generate({ lemma: 'cheval', tags: ['PL'] }, 'fr-FR');
// Returns: ['chevaux']

// Join tokens intelligently
const decision = await morph.join('je', 'aime', 'fr-FR');
// Returns: { surfacePrev: "j'", surfaceNext: 'aime', joiner: '', noSpace: true, ... }
```

## Morphological Generation

The `morph.generate()` API creates different word forms from a base lemma by applying morphological tags.

### English Examples

```typescript
await morph.load('en-US');

// Plural nouns
await morph.generate({ lemma: 'cat', tags: ['n', 'pl'] }, 'en-US');
// → ['cats']

// Verb conjugation
await morph.generate({ lemma: 'run', tags: ['vblex', 'pres', 'p3', 'sg'] }, 'en-US');
// → ['runs']

await morph.generate({ lemma: 'walk', tags: ['vblex', 'past'] }, 'en-US');
// → ['walked']

await morph.generate({ lemma: 'walk', tags: ['vblex', 'pprs'] }, 'en-US');
// → ['walking']

// Adjective comparison
await morph.generate({ lemma: 'big', tags: ['adj', 'sint', 'comp'] }, 'en-US');
// → ['bigger']

await morph.generate({ lemma: 'big', tags: ['adj', 'sint', 'sup'] }, 'en-US');
// → ['biggest']

// Irregular forms work automatically
await morph.generate({ lemma: 'go', tags: ['vblex', 'past'] }, 'en-US');
// → ['went']

await morph.generate({ lemma: 'mouse', tags: ['n', 'pl'] }, 'en-US');
// → ['mice']
```

### Reverse Operation: Analysis

```typescript
// Analyze surface forms to discover lemmas and tags
const analyses = await morph.analyse('cats', 'en-US');
// → [{ lemma: 'cat', tags: ['n', 'pl'], surface: 'cats' }]

const analyses = await morph.analyse('bigger', 'en-US');
// → [{ lemma: 'big', tags: ['adj', 'sint', 'comp'], surface: 'bigger' }]

const analyses = await morph.analyse('went', 'en-US');
// → [{ lemma: 'go', tags: ['vblex', 'past'], surface: 'went' }]
```

### Multilingual Examples

```typescript
// French: Gender and number agreement
await morph.generate({ lemma: 'cheval', tags: ['n', 'm', 'pl'] }, 'fr-FR');
// → ['chevaux']

await morph.generate({ lemma: 'aimer', tags: ['vblex', 'pri', 'p1', 'sg'] }, 'fr-FR');
// → ['aime']

// Spanish: Verb conjugation
await morph.generate({ lemma: 'hablar', tags: ['vblex', 'ger'] }, 'es-ES');
// → ['hablando']

await morph.generate({ lemma: 'casa', tags: ['n', 'f', 'pl'] }, 'es-ES');
// → ['casas']

// German: Case declensions
await morph.generate({ lemma: 'Haus', tags: ['n', 'nt', 'pl', 'nom'] }, 'de-DE');
// → ['Häuser']
```

### Discovering Available Tags

The best way to discover tags is to analyze example words:

```typescript
// Want to know the tags for past tense? Analyze a past tense verb:
const analyses = await morph.analyse('walked', 'en-US');
console.log(analyses[0].tags);  // ['vblex', 'past']

// Now use those tags for generation:
await morph.generate({ lemma: 'run', tags: ['vblex', 'past'] }, 'en-US');
// → ['ran']
```

**📚 For comprehensive documentation, tag reference tables, and advanced examples, see:**
**[Morphological Generation Guide](../../docs/MORPHOLOGICAL_GENERATION.md)**

## API Reference

### Configuration

#### `configureMorphRuntime(mode: 'hfst' | 'rules')`
Sets the morphological processing mode. Use `'hfst'` for FST-based processing.

#### `configureMorphHfst(options: HfstConfig)`
Configures HFST-specific settings:
```typescript
interface HfstConfig {
  wasmUrl?: string;  // Path to hfst.wasm file
  packUrl?: string;  // Base URL for language packs
}
```

### Core Operations

#### `morph.load(lang: string): Promise<void>`
Loads morphological transducers for a language.

#### `morph.analyse(surface: string, lang: string): Promise<MorphAnalysis[]>`
Analyzes a surface form into morphological components.

#### `morph.generate(input: MorphInput, lang: string): Promise<string[]>`
Generates surface forms from morphological specification.

**Example:**
```typescript
// Generate plural noun
await morph.generate({ lemma: 'cat', tags: ['n', 'pl'] }, 'en-US');
// → ['cats']

// Generate past tense verb
await morph.generate({ lemma: 'walk', tags: ['vblex', 'past'] }, 'en-US');
// → ['walked']

// Generate comparative adjective
await morph.generate({ lemma: 'big', tags: ['adj', 'sint', 'comp'] }, 'en-US');
// → ['bigger']
```

**See [Morphological Generation Guide](../../docs/MORPHOLOGICAL_GENERATION.md) for comprehensive examples and tag reference.**

#### `morph.join(prev: string, next: string, lang: string): Promise<JoinDecision>`
Determines how two tokens should be joined using morphological analysis.

## FST-based Join System

The join system represents a major advancement in computational morphology for text composition:

### Traditional Approach (Avoided)
```
Custom rule files → Manual maintenance → Language-specific implementations
```

### Our FST-based Approach
```
Existing GiellaLT/Apertium transducers → Morphological analysis → Feature-based decisions
```

### Benefits

1. **Linguistic Accuracy**: Based on proven morphological analysis
2. **Reduced Maintenance**: No custom rule files to maintain
3. **Extensibility**: Easy to add new languages
4. **Robustness**: Graceful fallback when FST unavailable

### Language Support

- **French**: Comprehensive elision (`je + aime → j'aime`)
- **Spanish**: Clitics and contractions (`de + el → del`)
- **German**: Compound formation (`Haus + Tür → Haustür`)
- **Others**: Intelligent default spacing

## Architecture

### Web Worker Design
```
Main Thread ←→ Web Worker ←→ HFST WASM
     ↑              ↑            ↑
   Public API   Message Bus   Morphology
```

### Language Packs
- **Lazy Loading**: Transducers loaded on demand
- **Integrity Verification**: SHA-256 checksums
- **Caching**: Browser Cache Storage for performance
- **Format**: HFST optimized lookup (.hfstol)

## Error Handling

The system provides clear error messages instead of silent failures:

```typescript
// When FST analysis unavailable
const result = await morph.analyse('word', 'unsupported-lang');
// Returns: [{ lemma: 'HFST_TRANSDUCER_NOT_LOADED:word', surface: 'word', tags: [] }]

// When generation fails
const forms = await morph.generate({ lemma: 'invalid', tags: ['INVALID'] }, 'fr-FR');
// Returns: ['HFST_GENERATION_FAILED:invalid+INVALID:no_HFST_model_loaded_or_no_results_for_fr-FR']
```

## Testing

The package includes comprehensive tests:

```bash
npm test                    # Run all tests
npm run test:gold          # TSV gold standard tests  
npm run test:comprehensive # Language-specific join tests
npm run test:hfst          # FST functionality tests
```

## Browser vs Node.js

The package works in both environments:

- **Browser**: Uses Web Workers for non-blocking processing
- **Node.js**: Uses worker_threads with proper WASM loading
- **Unified API**: Same interface regardless of environment
