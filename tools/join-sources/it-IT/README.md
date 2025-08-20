# HFST Join Transducer for Italian

This directory contains the source files for building an HFST join transducer for it-IT.

## Files

- `join.lexc` - Lexicon source with join rules
- `join.twolc` - Two-level rules for phonological processes  
- `build.sh` - Build script to compile the transducer
- `README.md` - This file

## Building

Requires HFST tools to be installed:

```bash
./build.sh
```

This will create `join.hfstol` which can be used by the morpho-wasm system.

## Rules

- lo elision before vowel: `lo VOWEL` → `l' VOWEL`
- la elision before vowel: `la VOWEL` → `l' VOWEL`
- una elision before vowel: `una VOWEL` → `un' VOWEL`
- adverb derivation: `ADJ mente` → `ADJ+mente`
