---
"@morphgrid/core": minor
"@morphgrid/packs": minor
"@morphgrid/demo": patch
"@morphgrid/joiner": patch
---

# English Language Support & WASM Bug Fixes

## 🎉 New Features

### English Language Support (en-US)
- Added full HFST morphological analysis for English
- Converted from Apertium English (apertium-eng) to HFST format
- Supports irregular verbs: `went → go<vblex><past>`
- Supports irregular plurals: `mice → mouse<n><pl>`, `children → child<n><pl>`
- 74,628 state transducer with comprehensive vocabulary
- All demos now include English language option

## 🐛 Bug Fixes

### Critical WASM Fixes
1. **Multi-transducer loading issue**: Fixed `TransducerFile` to properly load single-transducer files. Previously loaded only the first transducer from multi-transducer Apertium exports.

2. **Weighted transducer accumulation bug**: Fixed results accumulating between lookups in weighted transducers (`TransducerW`). Added `display_map.clear()` to `TransducerW::analyze()` method.

## 📦 Package Updates

### @morphgrid/core
- Rebuilt WASM module with bug fixes (hfst.wasm)
- Updated worker to handle new English transducer
- All 13 languages now working perfectly

### @morphgrid/packs
- Added English language pack: `en-US/v1/analysis.hfstol` (3.4MB, 74,628 states)
- Updated `index.json` with English metadata and SHA256
- Single-transducer format for optimal WASM loading

### @morphgrid/demo
- Updated all demo pages with English language support
- Smart Writing Assistant includes English tab
- HFST Playground includes English examples
- Test All Languages page tests all 13 languages

## 🌍 Supported Languages (13 Total)

Now supporting: English, French, Spanish, German, Italian, Finnish, Estonian, Basque, Norwegian, Russian, Swedish, Catalan, Danish

## 🔧 Technical Details

### Apertium to HFST Conversion
- Extracted main transducer from multi-transducer lttoolbox export
- Converted to HFST optimized lookup weighted format
- Verified with command-line `hfst-lookup` and WASM integration tests

### WASM Library Improvements
- Fixed `third_party/hfst-optimized-lookup/hfst-optimized-lookup.h`
- Ensures clean state between morphological lookups
- Prevents result accumulation in weighted transducers

## ✅ Testing

- All lint checks passing
- All build checks passing
- Bun WASM tests passing for English
- Browser integration tests successful
- Command-line verification complete

## 📚 Documentation

- Updated README.md with 13 language count
- Updated English status note (now "works perfectly in WASM!")
- Package documentation includes English examples

