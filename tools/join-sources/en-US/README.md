# HFST Join Transducer for English

This directory contains the source files for building an HFST join transducer for en-US.

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

- a/an alternation before vowel: `a VOWEL` → `an VOWEL`
- do not contraction: `do not` → `don't`
- will not contraction: `will not` → `won't`
- can not contraction: `can not` → `can't`
- progressive suffix: `STEM ing` → `STEM+ing`
- past tense suffix: `STEM ed` → `STEM+ed`
- plural/3sg suffix: `STEM s` → `STEM+s`
