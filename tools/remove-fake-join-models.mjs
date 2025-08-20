#!/usr/bin/env node
// Remove fake join models from index.json to be honest about missing HFST join functionality

import fs from 'node:fs';

async function removeFakeJoinModels() {
  const indexPaths = ['packs/index.json', 'packages/packs/index.json'];
  
  for (const indexPath of indexPaths) {
    try {
      const raw = await fs.promises.readFile(indexPath, 'utf8');
      const idx = JSON.parse(raw);
      
      let modified = false;
      for (const lang of Object.keys(idx)) {
        if (idx[lang].join || idx[lang].joinSha256) {
          console.log(`Removing fake join model for ${lang}`);
          delete idx[lang].join;
          delete idx[lang].joinSha256;
          modified = true;
        }
      }
      
      if (modified) {
        await fs.promises.writeFile(indexPath, JSON.stringify(idx, null, 2));
        console.log(`✓ Updated ${indexPath}`);
      }
    } catch (e) {
      console.warn(`Failed to update ${indexPath}:`, e.message);
    }
  }
  
  console.log('\n✅ Removed fake join models from index files');
  console.log('💡 Join functionality will now correctly show "no join model loaded" errors');
  console.log('🎯 This makes the missing HFST join functionality obvious rather than hidden');
}

removeFakeJoinModels().catch(console.error);
