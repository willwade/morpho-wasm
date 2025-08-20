# HFST Join Transducer for Spanish

This directory contains the source files for building an HFST join transducer for es-ES.

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

- de + el contraction: `de el` → `del`
- a + el contraction: `a el` → `al`
