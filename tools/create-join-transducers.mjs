#!/usr/bin/env node
// Create HFST join transducers from linguistic rules
// This converts join logic into proper HFST transducers instead of rules

import fs from 'node:fs';
import path from 'node:path';

// Join rules for different languages
const JOIN_RULES = {
  'fr-FR': {
    name: 'French',
    rules: [
      // Elision rules
      { input: 'je VOWEL', output: "j' VOWEL", desc: 'je elision before vowel' },
      { input: 'le VOWEL', output: "l' VOWEL", desc: 'le elision before vowel' },
      { input: 'la VOWEL', output: "l' VOWEL", desc: 'la elision before vowel' },
      { input: 'ce VOWEL', output: "c' VOWEL", desc: 'ce elision before vowel' },
      { input: 'se VOWEL', output: "s' VOWEL", desc: 'se elision before vowel' },
      { input: 'de VOWEL', output: "d' VOWEL", desc: 'de elision before vowel' },
      { input: 'ne VOWEL', output: "n' VOWEL", desc: 'ne elision before vowel' },
      { input: 'que VOWEL', output: "qu' VOWEL", desc: 'que elision before vowel' },
      // H aspiré exceptions (no elision)
      { input: 'le haricot', output: 'le haricot', desc: 'h aspiré exception' },
      { input: 'le héros', output: 'le héros', desc: 'h aspiré exception' },
      { input: 'le hérisson', output: 'le hérisson', desc: 'h aspiré exception' },
    ]
  },
  'en-US': {
    name: 'English',
    rules: [
      // Article alternation
      { input: 'a VOWEL', output: 'an VOWEL', desc: 'a/an alternation before vowel' },
      // Contractions
      { input: 'do not', output: "don't", desc: 'do not contraction' },
      { input: 'will not', output: "won't", desc: 'will not contraction' },
      { input: 'can not', output: "can't", desc: 'can not contraction' },
      // Morphological joins
      { input: 'STEM ing', output: 'STEM+ing', desc: 'progressive suffix' },
      { input: 'STEM ed', output: 'STEM+ed', desc: 'past tense suffix' },
      { input: 'STEM s', output: 'STEM+s', desc: 'plural/3sg suffix' },
    ]
  },
  'it-IT': {
    name: 'Italian',
    rules: [
      // Elision
      { input: 'lo VOWEL', output: "l' VOWEL", desc: 'lo elision before vowel' },
      { input: 'la VOWEL', output: "l' VOWEL", desc: 'la elision before vowel' },
      { input: 'una VOWEL', output: "un' VOWEL", desc: 'una elision before vowel' },
      // Derivation
      { input: 'ADJ mente', output: 'ADJ+mente', desc: 'adverb derivation' },
    ]
  },
  'es-ES': {
    name: 'Spanish',
    rules: [
      // Contractions
      { input: 'de el', output: 'del', desc: 'de + el contraction' },
      { input: 'a el', output: 'al', desc: 'a + el contraction' },
    ]
  },
  'de-DE': {
    name: 'German',
    rules: [
      // Prefix attachment
      { input: 'un STEM', output: 'un+STEM', desc: 'negative prefix' },
      { input: 'vor STEM', output: 'vor+STEM', desc: 'prefix attachment' },
      { input: 'nach STEM', output: 'nach+STEM', desc: 'prefix attachment' },
    ]
  }
};

// HFST lexc format for join rules
function generateLexcSource(langCode, rules) {
  const { name, rules: ruleList } = rules;
  
  let lexc = `! HFST join transducer for ${name} (${langCode})
! Generated automatically from linguistic rules
! This transducer handles token joining for ${name}

Multichar_Symbols
+Join
VOWEL
STEM
ADJ

LEXICON Root
JoinRules ;

LEXICON JoinRules
! Default: space join
%<PREV%>%<SPACE%>%<NEXT%> # ;

`;

  // Add specific rules
  ruleList.forEach((rule, i) => {
    const comment = `! ${rule.desc}`;
    const input = rule.input.replace(/VOWEL/g, '%<VOWEL%>').replace(/STEM/g, '%<STEM%>').replace(/ADJ/g, '%<ADJ%>');
    const output = rule.output.replace(/VOWEL/g, '%<VOWEL%>').replace(/STEM/g, '%<STEM%>').replace(/ADJ/g, '%<ADJ%>');
    
    lexc += `${comment}
${input}:${output} # ;

`;
  });

  return lexc;
}

// HFST twolc format for phonological rules
function generateTwolcSource(langCode, rules) {
  const { name } = rules;
  
  return `! HFST twolc rules for ${name} (${langCode}) joins
! Phonological rules for token joining

Alphabet
a b c d e f g h i j k l m n o p q r s t u v w x y z
A B C D E F G H I J K L M N O P Q R S T U V W X Y Z
à á â ä æ é è ê ë î ï ì í ô ö ò ó œ ù ú û ü ỳ ý ÿ
ç ñ ß
' - + ;

Sets
Vowel = a e i o u à á â ä æ é è ê ë î ï ì í ô ö ò ó œ ù ú û ü ỳ ý ÿ
      A E I O U À Á Â Ä Æ É È Ê Ë Î Ï Ì Í Ô Ö Ò Ó Œ Ù Ú Û Ü Ỳ Ý Ÿ ;

Rules

! Example rule for ${name}
"Vowel context rule"
Vowel:Vowel <=> _ ;
`;
}

async function createJoinTransducer(langCode) {
  const rules = JOIN_RULES[langCode];
  if (!rules) {
    console.log(`⚠️  No join rules defined for ${langCode}`);
    return false;
  }
  
  console.log(`🔧 Creating join transducer for ${rules.name} (${langCode})`);
  
  // Create source directory
  const srcDir = `tools/join-sources/${langCode}`;
  await fs.promises.mkdir(srcDir, { recursive: true });
  
  // Generate lexc source
  const lexcSource = generateLexcSource(langCode, rules);
  await fs.promises.writeFile(path.join(srcDir, 'join.lexc'), lexcSource);
  
  // Generate twolc source  
  const twolcSource = generateTwolcSource(langCode, rules);
  await fs.promises.writeFile(path.join(srcDir, 'join.twolc'), twolcSource);
  
  // Create build script
  const buildScript = `#!/bin/bash
# Build HFST join transducer for ${rules.name}

set -e

echo "Building join transducer for ${langCode}..."

# Compile lexc to hfst
hfst-lexc join.lexc -o join.hfst

# Apply twolc rules (if needed)
# hfst-twolc join.twolc -o join-rules.hfst
# hfst-compose-intersect join.hfst join-rules.hfst -o join-composed.hfst

# Optimize for lookup
hfst-fst2fst join.hfst -O -o join.hfstol

echo "✓ Created join.hfstol for ${langCode}"
`;
  
  await fs.promises.writeFile(path.join(srcDir, 'build.sh'), buildScript);
  await fs.promises.chmod(path.join(srcDir, 'build.sh'), 0o755);
  
  // Create README
  const readme = `# HFST Join Transducer for ${rules.name}

This directory contains the source files for building an HFST join transducer for ${langCode}.

## Files

- \`join.lexc\` - Lexicon source with join rules
- \`join.twolc\` - Two-level rules for phonological processes  
- \`build.sh\` - Build script to compile the transducer
- \`README.md\` - This file

## Building

Requires HFST tools to be installed:

\`\`\`bash
./build.sh
\`\`\`

This will create \`join.hfstol\` which can be used by the morpho-wasm system.

## Rules

${rules.rules.map(r => `- ${r.desc}: \`${r.input}\` → \`${r.output}\``).join('\n')}
`;
  
  await fs.promises.writeFile(path.join(srcDir, 'README.md'), readme);
  
  console.log(`✓ Created source files in ${srcDir}`);
  return true;
}

async function main() {
  console.log('Creating HFST join transducers...\n');
  
  const languages = Object.keys(JOIN_RULES);
  let created = 0;
  
  for (const lang of languages) {
    if (await createJoinTransducer(lang)) {
      created++;
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   Created source files for ${created}/${languages.length} languages`);
  
  console.log(`\n🔧 Next steps:`);
  console.log(`1. Install HFST tools: apt-get install hfst (or brew install hfst)`);
  console.log(`2. Build transducers: cd tools/join-sources/<lang> && ./build.sh`);
  console.log(`3. Copy join.hfstol files to packs/<lang>/v1/`);
  console.log(`4. Update SHA256 checksums in index.json`);
  console.log(`5. Test join functionality`);
  
  console.log(`\n📁 Source files created in:`);
  languages.forEach(lang => console.log(`   tools/join-sources/${lang}/`));
}

main().catch(console.error);
