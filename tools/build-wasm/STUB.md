# HFST WASM build (stub)

This is a placeholder for the build pipeline that will compile `hfst-optimized-lookup` to WebAssembly.

Planned steps:
- Fetch or build `hfst-optimized-lookup` with a minimal C shim exposing `apply_up` / `apply_down`
- Compile with Emscripten to `{ hfst.wasm, hfst.js }`
- Place artifacts under `packages/core/public/wasm/` or similar and load in the Worker

For now, Phase 3 scaffolding in code can toggle between a rules runtime and a `hfst` runtime stub via `configureMorphRuntime('hfst')`.
