# build-wasm (scaffold)

This folder will contain scripts to build `hfst-optimized-lookup` into WebAssembly.

Plan outline:
1. Prepare a minimal C shim exposing `apply_up` and `apply_down` over HFST APIs.
2. Use Emscripten (emcc) to compile the shim + hfst-optimized-lookup to `hfst.wasm` and `hfst.js`.
3. Emit artifacts into `packages/core/public/wasm/` (or a similar folder) for loading by the Worker.
4. Optionally produce a small JS loader that initializes the WASM module.

For now, Phase 3 leaves these as TODO. The codebase is wired with:
- A Worker placeholder (packages/core/src/worker.ts)
- A Worker client (packages/core/src/workerClient.ts)
- A runtime toggle (configureMorphRuntime('hfst'))

