#!/usr/bin/env node
// Build HFST join transducers for all languages - simplified version

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';

const HFST_BIN = './hfst/bin';

// Simplified join rules - just the most important ones for each language
const JOIN_RULES = {
  'fr-FR': ['je aime:j\'aime', 'le homme:l\'homme', 'ce est:c\'est'],
  'en-US': ['a apple:an apple', 'sing ing:singing', 'un happy:unhappy'],
  'it-IT': ['lo amico:l\'amico', 'bella mente:bellamente'],
  'es-ES': ['de el:del', 'a el:al'],
  'de-DE': ['un glücklich:unglücklich', 'vor sehen:vorsehen'],
  'fi-FI': ['katu valo:katuvalo', 'auto tie:autotie'],
  'sv-SE': ['bil väg:bilväg', 'hem stad:hemstad'],
  'no-NO': ['bil vei:bilvei', 'hjem by:hjemby'],
  'da-DK': ['bil vej:bilvej', 'hjem by:hjemby'],
  'ru-RU': ['не хорошо:нехорошо', 'пре красный:прекрасный'],
  'et-EE': ['auto tee:autotee', 'kodu linn:kodulinn'],
  'eu-ES': ['etxe tegi:etxetegi', 'lan toki:lantoki'],
  'ca-ES': ['de el:del', 'la aigua:l\'aigua'],
  'pt-PT': ['de o:do', 'em o:no'],
  'nl-NL': ['auto weg:autoweg', 'huis dier:huisdier'],
  'cs-CZ': ['ne dobrý:nedobrý', 'před chůze:předchůze'],
  'hu-HU': ['ház állat:házállat', 'munka hely:munkahely'],
  'ro-RO': ['auto drum:autodrum', 'loc muncă:locmuncă']
};

function runHfstCommand(command, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { stdio: ['inherit', 'pipe', 'pipe'] });
    
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', (data) => stdout += data);
    proc.stderr.on('data', (data) => stderr += data);
    
    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`${command} failed (${code}): ${stderr}`));
      }
    });
  });
}

async function buildJoinTransducer(langCode) {
  const rules = JOIN_RULES[langCode];
  if (!rules) {
    console.log(`⚠️  No join rules for ${langCode}`);
    return null;
  }
  
  console.log(`🔧 Building ${langCode} (${rules.length} rules)...`);
  
  const workDir = `tools/hfst-join-build/${langCode}`;
  await fs.promises.mkdir(workDir, { recursive: true });
  
  // Create pairs file
  const pairsContent = rules.join('\n') + '\n';
  const pairsFile = path.join(workDir, 'pairs.txt');
  await fs.promises.writeFile(pairsFile, pairsContent);
  
  try {
    // Build FST
    const fstFile = path.join(workDir, 'join.hfst');
    await runHfstCommand(`${HFST_BIN}/hfst-strings2fst`, ['-i', pairsFile, '-o', fstFile]);
    
    // Optimize
    const hfstolFile = path.join(workDir, 'join.hfstol');
    await runHfstCommand(`${HFST_BIN}/hfst-fst2fst`, ['-i', fstFile, '-o', hfstolFile, '-O']);
    
    // Copy to packs
    const targetDir = `packs/${langCode}/v1`;
    await fs.promises.mkdir(targetDir, { recursive: true });
    const targetFile = path.join(targetDir, 'join.hfstol');
    await fs.promises.copyFile(hfstolFile, targetFile);
    
    // Copy to packages/packs
    const packagesDir = `packages/packs/${langCode}/v1`;
    await fs.promises.mkdir(packagesDir, { recursive: true });
    const packagesFile = path.join(packagesDir, 'join.hfstol');
    await fs.promises.copyFile(hfstolFile, packagesFile);
    
    // Calculate hash
    const content = await fs.promises.readFile(targetFile);
    const hash = createHash('sha256').update(content).digest('hex');
    
    console.log(`  ✓ ${langCode}: ${content.length} bytes, SHA256: ${hash.substring(0, 8)}...`);
    
    return { langCode, hash, rules: rules.length };
    
  } catch (error) {
    console.error(`  ❌ ${langCode} failed: ${error.message}`);
    return null;
  }
}

async function updateIndex(results) {
  console.log('\n📝 Updating index files...');
  
  const indexPaths = ['packs/index.json', 'packages/packs/index.json'];
  
  for (const indexPath of indexPaths) {
    try {
      const raw = await fs.promises.readFile(indexPath, 'utf8');
      const idx = JSON.parse(raw);
      
      for (const result of results) {
        if (result && idx[result.langCode]) {
          idx[result.langCode].join = `/packs/${result.langCode}/v1/join.hfstol`;
          idx[result.langCode].joinSha256 = result.hash;
        }
      }
      
      await fs.promises.writeFile(indexPath, JSON.stringify(idx, null, 2));
      console.log(`  ✓ Updated ${indexPath}`);
    } catch (e) {
      console.warn(`  ⚠️  Failed to update ${indexPath}: ${e.message}`);
    }
  }
}

async function main() {
  console.log('🚀 Building HFST join transducers for all languages...\n');
  
  const languages = Object.keys(JOIN_RULES);
  const results = [];
  
  // Build one by one to avoid overwhelming the system
  for (const lang of languages) {
    const result = await buildJoinTransducer(lang);
    if (result) results.push(result);
    
    // Small delay between builds
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  await updateIndex(results);
  
  console.log(`\n🎉 Summary:`);
  console.log(`   Built ${results.length}/${languages.length} HFST join transducers`);
  results.forEach(r => {
    console.log(`   ${r.langCode}: ${r.rules} rules`);
  });
  
  console.log(`\n✅ All HFST join transducers ready!`);
}

main().catch(console.error);
