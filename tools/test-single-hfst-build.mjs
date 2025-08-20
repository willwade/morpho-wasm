#!/usr/bin/env node
// Test building a single HFST join transducer

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';

const HFST_BIN = './hfst/bin';

function runHfstCommand(command, args, input = null) {
  return new Promise((resolve, reject) => {
    console.log(`Running: ${command} ${args.join(' ')}`);
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
      console.log(`Command finished with code: ${code}`);
      if (stderr) console.log(`stderr: ${stderr}`);
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`${command} failed (${code}): ${stderr}`));
      }
    });
  });
}

async function testBuild() {
  console.log('Testing single HFST join transducer build...');
  
  const workDir = 'tools/test-hfst-build';
  await fs.promises.mkdir(workDir, { recursive: true });
  
  // Create simple test pairs
  const pairs = [
    'je aime:j\'aime',
    'le homme:l\'homme'
  ];
  
  const pairsContent = pairs.join('\n') + '\n';
  const pairsFile = path.join(workDir, 'test-pairs.txt');
  await fs.promises.writeFile(pairsFile, pairsContent);
  
  console.log(`Created pairs file: ${pairsFile}`);
  console.log(`Content:\n${pairsContent}`);
  
  try {
    // Step 1: Create FST from string pairs
    const fstFile = path.join(workDir, 'test.hfst');
    await runHfstCommand(`${HFST_BIN}/hfst-strings2fst`, [
      '-i', pairsFile,
      '-o', fstFile
    ]);
    console.log(`✓ Created FST: ${fstFile}`);
    
    // Step 2: Convert to optimized lookup format
    const hfstolFile = path.join(workDir, 'test.hfstol');
    await runHfstCommand(`${HFST_BIN}/hfst-fst2fst`, [
      '-i', fstFile,
      '-o', hfstolFile,
      '-O'  // Optimize for lookup
    ]);
    console.log(`✓ Created optimized lookup: ${hfstolFile}`);
    
    // Check file size
    const stats = await fs.promises.stat(hfstolFile);
    console.log(`✓ File size: ${stats.size} bytes`);
    
    console.log('🎉 Single HFST build test successful!');
    
  } catch (error) {
    console.error(`❌ Build failed: ${error.message}`);
  }
}

testBuild().catch(console.error);
