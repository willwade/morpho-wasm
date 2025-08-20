# HFST runtime scaffold

This package contains a runtime toggle and a Worker scaffold for integrating an HFST WebAssembly runtime.

- `configureMorphRuntime('hfst')` switches the core to use the HFST path with HFST-based joins.
- `configureMorphHfst({ wasmUrl })` lets you override the default WASM URL (`./wasm/hfst.wasm`).
- The Worker code lives in `src/worker.ts`; it is compiled with `npm run build:worker` to `dist-worker/worker.js`.
- A minimal Worker client is in `src/workerClient.ts`.

## Building the Worker

```bash
npm run -w @morphgrid/core build:worker
```

## Providing the WASM

Place a WebAssembly binary (e.g., `hfst.wasm`) in `packages/core/public/wasm/` (or override the URL at runtime).

You can scaffold the build steps with:

```bash
./tools/build-wasm/build.sh
```

(That script is currently a placeholder—fill in Emscripten commands and sources.)

## Using in a browser app (example)

```ts
import { morph, configureMorphRuntime, configureMorphHfst } from '@morphgrid/core';

configureMorphRuntime('hfst');
configureMorphHfst({ wasmUrl: '/wasm/hfst.wasm' });

await morph.load('fr-FR');
const analyses = await morph.analyse('aime', 'fr-FR');
```

Join functionality requires HFST join models to be available in language packs.

