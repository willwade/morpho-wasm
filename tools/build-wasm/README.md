# HFST WASM build (plan)

This repository vendors canonical `hfst-optimized-lookup.cc/.h` under `third_party/hfst-optimized-lookup/`.
We will compile these with Emscripten to produce a WebAssembly module for the browser Worker.

## Layout
- third_party/hfst-optimized-lookup/hfst-optimized-lookup.cc
- third_party/hfst-optimized-lookup/hfst-optimized-lookup.h
- packages/core/src/worker.ts (the Worker)
- packages/core/src/workerClient.ts (client)
- packages/core/public/wasm/ (output target for wasm)

## Draft emcc command (to adapt)

```bash
emcc \
  third_party/hfst-optimized-lookup/hfst-optimized-lookup.cc \
  -O3 -sMODULARIZE=1 -sEXPORT_ES6=1 -sENVIRONMENT=web,worker \
  -sALLOW_MEMORY_GROWTH=1 \
  -sEXPORTED_FUNCTIONS="['_malloc','_free']" \
  -o packages/core/public/wasm/hfst.js
```

Notes:
- We’ll add any exported C functions once we wrap apply_up/apply_down in a C shim.
- For .hfstol loading, we can either compile file I/O into the module and mount a path using Emscripten FS, or expose a load-from-buffer API.

## Next steps
- Write a minimal C shim to expose `extern "C"` functions for:
  - loadTransducerFromBuffer(ptr,len)
  - apply_up(ptr,len) → ptr/len of result list
  - apply_down(ptr,len)
- Update Worker `init` to fetch the wasm and transducer, initialize the module, and call the shim.
- Keep the ‘hfst’ runtime behind configureMorphRuntime('hfst') until stable.
