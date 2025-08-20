# @morphgrid/joiner

FST-based token joining with morphological analysis for intelligent text composition.

## Overview

This package provides the core join decision logic for the morpho-wasm system. Instead of using custom rule files, it leverages existing GiellaLT/Apertium morphological transducers to make linguistically accurate decisions about how tokens should be combined.

## Architecture

### FST-First Approach
The joiner uses a **morphological analysis-first** approach:

1. **Analyze tokens** using existing HFST transducers
2. **Extract morphological features** (e.g., `prn`, `det`, `vblex`)
3. **Apply language-specific logic** based on features
4. **Fall back gracefully** when FST analysis is unavailable

### No Custom Rules
Unlike traditional approaches that require maintaining separate rule files, this system:
- ✅ **Uses existing transducers** from GiellaLT/Apertium projects
- ✅ **Leverages proven morphological analysis** 
- ✅ **Reduces maintenance burden** - no custom rule files to maintain
- ✅ **Ensures linguistic accuracy** - based on real morphological features

## API

### `decideJoin(prev, next, lang, options?)`

Makes a join decision for two tokens in a given language.

```typescript
import { decideJoin } from '@morphgrid/joiner';

const decision = await decideJoin('je', 'aime', 'fr-FR', {
  hfst: hfstAdapter // Optional HFST adapter for morphological analysis
});

// Returns:
// {
//   surfacePrev: "j'",
//   surfaceNext: "aime", 
//   joiner: "",
//   noSpace: true,
//   reason: "French elision: je + aime → j'aime"
// }
```

### JoinDecision Interface

```typescript
interface JoinDecision {
  surfacePrev: string;  // Modified previous token
  surfaceNext: string;  // Modified next token  
  joiner: string;       // String to insert between tokens ('', ' ', '-', etc.)
  noSpace: boolean;     // Whether tokens should be joined without space
  reason: string;       // Human-readable explanation
}
```

## Language Support

### French (fr-FR)
- **Elision**: `je + aime → j'aime`, `le + homme → l'homme`
- **Morphological features**: Uses `prn`, `det`, `prep` tags to identify elision candidates
- **Vowel detection**: Handles elision before vowel sounds

### Spanish (es-ES)  
- **Contractions**: `de + el → del`, `a + el → al`
- **Clitic attachment**: `dar + me → darme` (basic, FST needed for accents)
- **Morphological features**: Uses verb and pronoun analysis

### German (de-DE)
- **Compound formation**: `Haus + Tür → Haustür`
- **Basic patterns**: Handles common compound types
- **Note**: Full compound formation with linking elements requires FST analysis

### Other Languages
- **Default spacing**: Intelligent fallback for unsupported languages
- **Extensible**: Easy to add new language-specific logic

## Error Handling

When HFST analysis is unavailable, the system:
1. **Falls back to language-specific rules** based on surface forms
2. **Provides clear error messages** instead of silent failures
3. **Maintains functionality** even without full morphological analysis

## Integration

This package is designed to work with the morpho-wasm core system:

```typescript
import { morph } from '@morphgrid/core';

// The core system automatically uses this joiner
const result = await morph.join('je', 'aime', 'fr-FR');
```

## Development

The joiner is designed to be:
- **Linguistically principled**: Based on real morphological analysis
- **Maintainable**: No custom rule files to update
- **Extensible**: Easy to add new languages
- **Robust**: Graceful degradation when FST unavailable
