# Pack Pipeline (scaffold)

This directory will contain scripts to build language packs (analysis/generation transducers) and emit manifests.

## Inputs
- An HFST analyser (e.g., from GiellaLT)
- HFST CLI tools (`hfst-fst2fst`, etc.) installed on your machine

## Build steps (analysis → optimized lookup)

1) Compile your analyser as an HFST transducer (`.hfst`) if you don’t already have one.

2) Convert to optimized lookup format (`.hfstol`):

```bash
hfst-fst2fst --optimized-lookup input.hfst -o analysis.hfstol
```

3) Optional: compress with Brotli (`.ol.br`):

```bash
brotli -f -o analysis.ol.br analysis.hfstol
```

4) Place the file under packs/<lang>/v1/ and write a manifest.json:

```json
{
  "name": "French (fr-FR)",
  "version": "v1",
  "files": {
    "analysis": "analysis.hfstol"
  },
  "license": "...",
  "sha256": "...",
  "size": 123456
}
```

5) Update packs/index.json so core can discover the pack:

```json
{
  "fr-FR": { "version": "v1", "analysis": "/packs/fr-FR/v1/analysis.hfstol" }
}
```

## Next steps
- Add a Node script to compute sha256 and write manifest.json automatically
- Support generation transducer (downward) and include in manifest
- Add integrity checks in core when fetching packs
- Cache packs in IndexedDB for offline use
