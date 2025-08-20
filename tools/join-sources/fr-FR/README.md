# HFST Join Transducer for French

This directory contains the source files for building an HFST join transducer for fr-FR.

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

- je elision before vowel: `je VOWEL` → `j' VOWEL`
- le elision before vowel: `le VOWEL` → `l' VOWEL`
- la elision before vowel: `la VOWEL` → `l' VOWEL`
- ce elision before vowel: `ce VOWEL` → `c' VOWEL`
- se elision before vowel: `se VOWEL` → `s' VOWEL`
- de elision before vowel: `de VOWEL` → `d' VOWEL`
- ne elision before vowel: `ne VOWEL` → `n' VOWEL`
- que elision before vowel: `que VOWEL` → `qu' VOWEL`
- h aspiré exception: `le haricot` → `le haricot`
- h aspiré exception: `le héros` → `le héros`
- h aspiré exception: `le hérisson` → `le hérisson`
