---
"@morphgrid/core": patch
---

Fix: allow the demo to run the Web Worker when importing the library from a CDN.

- Detect cross-origin worker URL (CDN vs GitHub Pages) and spin up a same-origin
  module Worker via a Blob that re-exports the CDN worker (`import '<cdn-url>'`).
- This avoids the browser SecurityError from constructing a cross-origin Worker.

