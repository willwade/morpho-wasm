#!/usr/bin/env node
// Add all available UralicNLP languages to the index without downloading
// This gives us the infrastructure to test join models

import fs from 'node:fs';
import path from 'node:path';

const ISO3_MAP = {
  en: 'eng', fr: 'fra', es: 'spa', de: 'deu', it: 'ita', fi: 'fin', sv: 'swe', 
  no: 'nob', da: 'dan', ru: 'rus', et: 'est', eu: 'eus', ca: 'cat', pt: 'por', 
  nl: 'nld', cs: 'ces', hu: 'hun', ro: 'ron'
};

// Languages we confirmed have both analysis + generation
const AVAILABLE_LANGS = [
  'fr-FR', 'en-US', 'es-ES', 'it-IT', 'de-DE', 'fi-FI', 'sv-SE', 'no-NO',
  'da-DK', 'ru-RU', 'et-EE', 'eu-ES', 'ca-ES', 'pt-PT', 'nl-NL', 
  'cs-CZ', 'hu-HU', 'ro-RO'
];

function toISO3(lang) {
  const iso2 = lang.split('-')[0];
  return ISO3_MAP[iso2] || iso2;
}

async function updateIndex() {
  const indexPath = 'packs/index.json';
  let idx = {};
  
  try {
    const raw = await fs.promises.readFile(indexPath, 'utf8');
    idx = JSON.parse(raw);
  } catch (e) {
    console.log('Creating new index.json');
  }
  
  for (const lang of AVAILABLE_LANGS) {
    if (idx[lang]) {
      console.log(`✓ ${lang} already in index`);
      continue;
    }
    
    const iso3 = toISO3(lang);
    const baseUrl = `http://models.uralicnlp.com/nightly/${iso3}`;
    
    // Add entry with UralicNLP URLs and placeholder join
    idx[lang] = {
      version: "v1",
      analysis: `/packs/${lang}/v1/analysis.hfstol`,
      sha256: "placeholder-sha256-for-" + lang.toLowerCase() + "-analysis",
      generation: `/packs/${lang}/v1/generate.hfstol`, 
      generationSha256: "placeholder-sha256-for-" + lang.toLowerCase() + "-generation",
      join: `/packs/${lang}/v1/join.hfstol`,
      joinSha256: "placeholder-sha256-for-" + lang.toLowerCase() + "-join",
      source: {
        analysis_url: `${baseUrl}/analyser-gt-desc.hfstol`,
        generation_url: `${baseUrl}/generator-gt-norm.hfstol`,
        notes: "UralicNLP nightly build - models not yet downloaded"
      }
    };
    
    console.log(`+ Added ${lang} to index`);
  }
  
  await fs.promises.writeFile(indexPath, JSON.stringify(idx, null, 2));
  console.log(`\n📝 Updated ${indexPath} with ${AVAILABLE_LANGS.length} languages`);
  
  // Also update packages/packs/index.json
  const packagesIndexPath = 'packages/packs/index.json';
  await fs.promises.writeFile(packagesIndexPath, JSON.stringify(idx, null, 2));
  console.log(`📝 Updated ${packagesIndexPath}`);
}

async function createPlaceholderDirs() {
  console.log('\n📁 Creating placeholder directories...');
  
  for (const lang of AVAILABLE_LANGS) {
    const dir = `packs/${lang}/v1`;
    const packagesDir = `packages/packs/${lang}/v1`;
    
    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.mkdir(packagesDir, { recursive: true });
    
    // Create placeholder join files
    const joinContent = `# Placeholder HFST join model for ${lang}
# This will be replaced with actual HFST join transducer
# Source: UralicNLP models + custom join logic`;
    
    const joinPath = path.join(dir, 'join.hfstol');
    const packagesJoinPath = path.join(packagesDir, 'join.hfstol');
    
    if (!await fs.promises.access(joinPath).then(() => true).catch(() => false)) {
      await fs.promises.writeFile(joinPath, joinContent);
    }
    if (!await fs.promises.access(packagesJoinPath).then(() => true).catch(() => false)) {
      await fs.promises.writeFile(packagesJoinPath, joinContent);
    }
  }
  
  console.log(`✓ Created directories and placeholder join files for ${AVAILABLE_LANGS.length} languages`);
}

async function main() {
  console.log('Adding UralicNLP languages to morpho-wasm...\n');
  
  await updateIndex();
  await createPlaceholderDirs();
  
  console.log('\n🎯 Next steps:');
  console.log('1. Download actual models: node tools/pack-fetcher.mjs <lang>');
  console.log('2. Create HFST join transducers for each language');
  console.log('3. Test join functionality with real models');
  
  console.log('\n📊 Available languages:');
  AVAILABLE_LANGS.forEach(lang => console.log(`   ${lang}`));
}

main().catch(console.error);
