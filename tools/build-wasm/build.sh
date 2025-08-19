#!/usr/bin/env bash
set -euo pipefail

# HFST WASM build using Emscripten
# Prereq: source the Emscripten env (e.g., source ~/emsdk/emsdk_env.sh)

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
OUT_DIR="$ROOT_DIR/packages/core/public/wasm"
SRC_DIR="$ROOT_DIR/third_party/hfst-optimized-lookup"
SHIM="$ROOT_DIR/tools/build-wasm/shim.cpp"

mkdir -p "$OUT_DIR"

# Build
emcc \
  "$SHIM" \
  "$SRC_DIR/hfst-optimized-lookup.cc" \
  -O3 -sMODULARIZE=1 -sEXPORT_ES6=1 -sENVIRONMENT=web,worker \
  -sALLOW_MEMORY_GROWTH=1 \
  -sEXPORTED_FUNCTIONS="['_malloc','_free','_loadTransducer','_loadGenerator','_applyUp','_applyDown','_unloadTransducer']" \
  -sEXPORTED_RUNTIME_METHODS="['cwrap','getValue','setValue','lengthBytesUTF8','stringToUTF8','UTF8ToString','FS']" \
  -o "$OUT_DIR/hfst.js"

echo "Built wasm + loader at: $OUT_DIR/hfst.js (+ hfst.wasm)"

