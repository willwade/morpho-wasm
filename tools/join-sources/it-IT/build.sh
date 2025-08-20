#!/bin/bash
# Build HFST join transducer for Italian

set -e

echo "Building join transducer for it-IT..."

# Compile lexc to hfst
hfst-lexc join.lexc -o join.hfst

# Apply twolc rules (if needed)
# hfst-twolc join.twolc -o join-rules.hfst
# hfst-compose-intersect join.hfst join-rules.hfst -o join-composed.hfst

# Optimize for lookup
hfst-fst2fst join.hfst -O -o join.hfstol

echo "✓ Created join.hfstol for it-IT"
