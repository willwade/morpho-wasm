# @morphgrid/core

WebAssembly runtime and API for HFST/GiellaLT morphology with FST-based token joining.

## Overview

The core package provides a complete morphological analysis and generation system with intelligent token joining capabilities. It uses HFST (Helsinki Finite-State Technology) compiled to WebAssembly for high-performance morphological processing.

## Key Features

- **HFST WASM Runtime**: High-performance morphological analysis and generation
- **Web Worker Architecture**: Non-blocking processing in browsers and Node.js
- **FST-based Joins**: Intelligent token combination using morphological analysis
- **Language Pack System**: Lazy-loaded transducers with integrity verification
- **Comprehensive API**: Simple interface for complex morphological operations

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
