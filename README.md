# morphgrid-wasm

Experimental WebAssembly runtime and API for HFST/GiellaLT morphology in web apps. This repository follows the plan in `PLAN.md` and now includes a minimal but functional stemmer-based implementation for several languages.

## Packages
- **core** – stemming runtime and public API
- **joiner** – token join rules
- **demo** – static demo application

## Getting Started
Install dependencies and run tests:

```bash
npm install
npm test
```

Packages use TypeScript and are published as ES modules. The core package currently provides stemming-based analysis and rule-driven plural generation for **French**, **Spanish** (including Mexican Spanish), **English**, **German**, **Italian**, and **Finnish**. Thai and other languages are not yet supported.

## Limitations and TODO
- Real HFST WebAssembly runtime and worker are not implemented yet.
- No support for loading HFST language packs.
- Limited to stemmer-based analysis; generation rules cover only simple English plurals.
- Language coverage currently excludes Thai and many others.


## License
MIT
