#!/usr/bin/env node
// Build real HFST join transducers using the HFST tools in hfst/bin

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';

const HFST_BIN = './hfst/bin';

// Join rules for different languages - these will become real HFST transducers
const JOIN_RULES = {
  'fr-FR': {
    name: 'French',
    pairs: [
      // Elision rules: input:output format for HFST
      'je aime:j\'aime',
      'le homme:l\'homme',
      'la ami:l\'ami',
      'ce est:c\'est',
      'se hydrate:s\'hydrate',
      'de autre:d\'autre',
      'ne est:n\'est',
      'que est:qu\'est',
      // H aspiré exceptions (no elision)
      'le hérisson:le hérisson',
      'le haricot:le haricot',
      'le héros:le héros',
    ]
  },
  'en-US': {
    name: 'English',
    pairs: [
      // Article alternation
      'a apple:an apple',
      'a orange:an orange',
      'a umbrella:an umbrella',
      'a elephant:an elephant',
      'a hour:an hour',
      // Morphological joins (no space)
      'sing ing:singing',
      'run s:runs',
      'child ren:children',
      'un happy:unhappy',
      'pre fix:prefix',
      're do:redo',
    ]
  },
  'it-IT': {
    name: 'Italian',
    pairs: [
      // Elision
      'lo amico:l\'amico',
      'la amica:l\'amica',
      'una amica:un\'amica',
      'lo uomo:l\'uomo',
      'la ora:l\'ora',
      // Derivation (no space)
      'bella mente:bellamente',
      'rapida mente:rapidamente',
      'vera mente:veramente',
    ]
  },
  'es-ES': {
    name: 'Spanish',
    pairs: [
      // Contractions
      'de el:del',
      'a el:al',
      // Morphological joins
      'pre fijo:prefijo',
      're hacer:rehacer',
    ]
  },
  'de-DE': {
    name: 'German',
    pairs: [
      // Prefix attachment (no space)
      'un glücklich:unglücklich',
      'vor sehen:vorsehen',
      'nach denken:nachdenken',
      'über setzen:übersetzen',
      'unter schreiben:unterschreiben',
      'aus gehen:ausgehen',
    ]
  },
  'fi-FI': {
    name: 'Finnish',
    pairs: [
      // Compound formation
      'katu valo:katuvalo',
      'auto tie:autotie',
      'koti maa:kotimaa',
      'työ paikka:työpaikka',
      'sana kirja:sanakirja',
    ]
  },
  'sv-SE': {
    name: 'Swedish',
    pairs: [
      // Compound formation
      'bil väg:bilväg',
      'hem stad:hemstad',
      'arbete plats:arbetsplats',
      'ord bok:ordbok',
      'hus djur:husdjur',
    ]
  },
  'no-NO': {
    name: 'Norwegian',
    pairs: [
      // Compound formation
      'bil vei:bilvei',
      'hjem by:hjemby',
      'arbeids plass:arbeidsplass',
      'ord bok:ordbok',
      'hus dyr:husdyr',
    ]
  },
  'da-DK': {
    name: 'Danish',
    pairs: [
      // Compound formation
      'bil vej:bilvej',
      'hjem by:hjemby',
      'arbejds plads:arbejdsplads',
      'ord bog:ordbog',
      'hus dyr:husdyr',
    ]
  },
  'ru-RU': {
    name: 'Russian',
    pairs: [
      // Prefix attachment
      'не хорошо:нехорошо',
      'пре красный:прекрасный',
      'под земный:подземный',
      'над строить:надстроить',
    ]
  },
  'et-EE': {
    name: 'Estonian',
    pairs: [
      // Compound formation
      'auto tee:autotee',
      'kodu linn:kodulinn',
      'töö koht:töökoht',
      'sõna raamat:sõnaraamat',
    ]
  },
  'eu-ES': {
    name: 'Basque',
    pairs: [
      // Compound formation
      'etxe tegi:etxetegi',
      'lan toki:lantoki',
      'hitz liburu:hitzliburu',
      'auto bide:autobide',
    ]
  },
  'ca-ES': {
    name: 'Catalan',
    pairs: [
      // Elision and contractions
      'de el:del',
      'a el:al',
      'per el:pel',
      'la aigua:l\'aigua',
      'la hora:l\'hora',
    ]
  },
  'pt-PT': {
    name: 'Portuguese',
    pairs: [
      // Contractions
      'de o:do',
      'de a:da',
      'em o:no',
      'em a:na',
      'por o:pelo',
      'por a:pela',
    ]
  },
  'nl-NL': {
    name: 'Dutch',
    pairs: [
      // Compound formation
      'auto weg:autoweg',
      'huis dier:huisdier',
      'werk plaats:werkplaats',
      'woord boek:woordenboek',
      'thee pot:theepot',
    ]
  },
  'cs-CZ': {
    name: 'Czech',
    pairs: [
      // Prefix attachment
      'ne dobrý:nedobrý',
      'před chůze:předchůze',
      'pod zemní:podzemní',
      'nad stavba:nadstavba',
    ]
  },
  'hu-HU': {
    name: 'Hungarian',
    pairs: [
      // Compound formation
      'ház állat:házállat',
      'munka hely:munkahely',
      'szó tár:szótár',
      'auto út:autóút',
    ]
  },
  'ro-RO': {
    name: 'Romanian',
    pairs: [
      // Compound formation
      'auto drum:autodrum',
      'casă animal:casăanimal',
      'loc muncă:locmuncă',
      'carte cuvinte:cartecuvinte',
    ]
  }
};

function runHfstCommand(command, args, input = null) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { 
      stdio: input ? ['pipe', 'pipe', 'pipe'] : ['inherit', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', (data) => stdout += data);
    proc.stderr.on('data', (data) => stderr += data);
    
    if (input) {
      proc.stdin.write(input);
      proc.stdin.end();
    }
    
    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`${command} failed (${code}): ${stderr}`));
      }
    });
  });
}

async function buildJoinTransducer(langCode, rules) {
  console.log(`🔧 Building HFST join transducer for ${rules.name} (${langCode})`);
  
  const workDir = `tools/hfst-join-build/${langCode}`;
  await fs.promises.mkdir(workDir, { recursive: true });
  
  // Create string pairs file for hfst-strings2fst
  const pairsContent = rules.pairs.join('\n') + '\n';
  const pairsFile = path.join(workDir, 'pairs.txt');
  await fs.promises.writeFile(pairsFile, pairsContent);
  
  console.log(`  📝 Created pairs file with ${rules.pairs.length} rules`);
  
  try {
    // Step 1: Create FST from string pairs
    const fstFile = path.join(workDir, 'join.hfst');
    await runHfstCommand(`${HFST_BIN}/hfst-strings2fst`, [
      '-i', pairsFile,
      '-o', fstFile
    ]);
    console.log(`  ✓ Created FST: ${fstFile}`);
    
    // Step 2: Convert to optimized lookup format
    const hfstolFile = path.join(workDir, 'join.hfstol');
    await runHfstCommand(`${HFST_BIN}/hfst-fst2fst`, [
      '-i', fstFile,
      '-o', hfstolFile,
      '-O'  // Optimize for lookup
    ]);
    console.log(`  ✓ Created optimized lookup: ${hfstolFile}`);
    
    // Step 3: Copy to packs directory
    const targetDir = `packs/${langCode}/v1`;
    await fs.promises.mkdir(targetDir, { recursive: true });
    const targetFile = path.join(targetDir, 'join.hfstol');
    await fs.promises.copyFile(hfstolFile, targetFile);
    
    // Also copy to packages/packs
    const packagesDir = `packages/packs/${langCode}/v1`;
    await fs.promises.mkdir(packagesDir, { recursive: true });
    const packagesFile = path.join(packagesDir, 'join.hfstol');
    await fs.promises.copyFile(hfstolFile, packagesFile);
    
    // Calculate SHA256
    const content = await fs.promises.readFile(targetFile);
    const hash = createHash('sha256').update(content).digest('hex');
    
    console.log(`  ✓ Installed: ${targetFile}`);
    console.log(`  📊 SHA256: ${hash}`);
    
    return { langCode, hash, rules: rules.pairs.length };
    
  } catch (error) {
    console.error(`  ❌ Failed to build ${langCode}: ${error.message}`);
    return null;
  }
}

async function updateIndexWithRealJoinModels(results) {
  console.log('\n📝 Updating index files with real HFST join models...');
  
  const indexPaths = ['packs/index.json', 'packages/packs/index.json'];
  
  for (const indexPath of indexPaths) {
    try {
      const raw = await fs.promises.readFile(indexPath, 'utf8');
      const idx = JSON.parse(raw);
      
      for (const result of results) {
        if (result && idx[result.langCode]) {
          idx[result.langCode].join = `/packs/${result.langCode}/v1/join.hfstol`;
          idx[result.langCode].joinSha256 = result.hash;
          console.log(`  ✓ Updated ${result.langCode} in ${indexPath}`);
        }
      }
      
      await fs.promises.writeFile(indexPath, JSON.stringify(idx, null, 2));
    } catch (e) {
      console.warn(`  ⚠️  Failed to update ${indexPath}: ${e.message}`);
    }
  }
}

async function main() {
  console.log('🚀 Building real HFST join transducers...\n');
  
  // Check if HFST tools are available
  try {
    await runHfstCommand(`${HFST_BIN}/hfst-strings2fst`, ['--version']);
  } catch (e) {
    console.error('❌ HFST tools not found in hfst/bin/');
    console.error('   Make sure HFST is properly installed');
    process.exit(1);
  }
  
  const languages = Object.keys(JOIN_RULES);
  const results = [];
  
  for (const lang of languages) {
    const result = await buildJoinTransducer(lang, JOIN_RULES[lang]);
    if (result) results.push(result);
  }
  
  await updateIndexWithRealJoinModels(results);
  
  console.log(`\n🎉 Summary:`);
  console.log(`   Built ${results.length}/${languages.length} real HFST join transducers`);
  results.forEach(r => {
    console.log(`   ${r.langCode}: ${r.rules} join rules`);
  });
  
  console.log(`\n✅ Real HFST join models are now ready!`);
  console.log(`🎯 These are actual .hfstol files that can be loaded by the HFST WASM module`);
  console.log(`🔧 Next: Update worker to load these with loadTransducer() instead of text parsing`);
}

main().catch(console.error);
