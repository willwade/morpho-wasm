---
"@morphgrid/core": patch
---

Fix language code normalization for all API methods (analyse, generate, join)

Users can now pass short language codes like 'fr', 'es', 'de' instead of requiring full codes like 'fr-FR', 'es-ES', 'de-DE'. The system automatically normalizes language codes and supports:
- Short codes: 'fr' → 'fr-FR'
- Underscore format: 'fr_FR' → 'fr-FR'  
- Case insensitive: 'FR', 'Fr', 'fr' all work

This fixes the reported bug where French join operations were failing with "No join rule found" when using short language codes. The fix applies to all supported languages (French, Spanish, German, English, Italian, Finnish, Welsh, Basque).

