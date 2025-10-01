# Morphological Generation Guide

Complete guide to using morphological analysis and generation in morpho-wasm.

## Table of Contents
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [Analysis (Surface → Lemma + Tags)](#analysis-surface--lemma--tags)
- [Generation (Lemma + Tags → Surface)](#generation-lemma--tags--surface)
- [Language-Specific Examples](#language-specific-examples)
- [HFST Tag Reference](#hfst-tag-reference)
- [Discovering Tags](#discovering-tags)
- [Advanced Usage](#advanced-usage)

---

## Quick Start

```typescript
import { morph, configureMorphRuntime, configureMorphHfst } from '@morphgrid/core';

// Configure
configureMorphRuntime('hfst');
configureMorphHfst({ 
  wasmUrl: '/path/to/hfst.wasm',
  packUrl: '/path/to/packs/' 
});

// Load language
await morph.load('en-US');

// Analyze: surface form → lemma + tags
const analyses = await morph.analyse('cats', 'en-US');
// → [{ lemma: 'cat', tags: ['n', 'pl'], surface: 'cats' }]

// Generate: lemma + tags → surface form
const forms = await morph.generate({ lemma: 'cat', tags: ['n', 'pl'] }, 'en-US');
// → ['cats']
```

---

## Core Concepts

### Morphological Analysis
**Analysis** breaks down a surface form (the actual word) into:
- **Lemma**: Base dictionary form (e.g., "cat", "run", "big")
- **Tags**: Morphological features (e.g., plural, past tense, comparative)
- **Surface**: The original word form

### Morphological Generation
**Generation** creates surface forms from:
- **Lemma**: Base dictionary form
- **Tags**: Desired morphological features

### HFST Tags
Our system uses HFST (Helsinki Finite-State Technology) tag notation:
- Tags are enclosed in angle brackets: `<n>`, `<pl>`, `<vblex>`
- Multiple tags combine: `cat<n><pl>` = "cats"
- Tags are language-specific but follow common patterns

---

## Analysis (Surface → Lemma + Tags)

### Basic Analysis

```typescript
// English
const result = await morph.analyse('running', 'en-US');
// Returns multiple analyses:
// [
//   { lemma: 'running', tags: ['n', 'sg'], surface: 'running' },
//   { lemma: 'run', tags: ['vblex', 'pprs'], surface: 'running' },
//   { lemma: 'run', tags: ['vblex', 'subs'], surface: 'running' },
//   { lemma: 'run', tags: ['vblex', 'ger'], surface: 'running' }
// ]
```

### Handling Multiple Analyses

Many words have multiple valid analyses. Choose based on context:

```typescript
const analyses = await morph.analyse('runs', 'en-US');
// [
//   { lemma: 'run', tags: ['n', 'pl'], surface: 'runs' },           // noun: "runs" (plural)
//   { lemma: 'run', tags: ['vblex', 'pres', 'p3', 'sg'], surface: 'runs' }  // verb: "he runs"
// ]

// Filter by part of speech
const verbAnalysis = analyses.find(a => a.tags.includes('vblex'));
const nounAnalysis = analyses.find(a => a.tags.includes('n'));
```

### Irregular Forms

The system handles irregular forms automatically:

```typescript
await morph.analyse('went', 'en-US');
// → [{ lemma: 'go', tags: ['vblex', 'past'], surface: 'went' }]

await morph.analyse('mice', 'en-US');
// → [{ lemma: 'mouse', tags: ['n', 'pl'], surface: 'mice' }]

await morph.analyse('children', 'en-US');
// → [{ lemma: 'child', tags: ['n', 'pl'], surface: 'children' }]
```

---

## Generation (Lemma + Tags → Surface)

### Basic Generation

```typescript
// Generate plural noun
const forms = await morph.generate({ lemma: 'cat', tags: ['n', 'pl'] }, 'en-US');
// → ['cats']

// Generate past tense verb
const forms = await morph.generate({ lemma: 'walk', tags: ['vblex', 'past'] }, 'en-US');
// → ['walked']

// Generate comparative adjective
const forms = await morph.generate({ lemma: 'big', tags: ['adj', 'sint', 'comp'] }, 'en-US');
// → ['bigger']
```

### Multiple Results

Some lemma+tag combinations can produce multiple valid forms:

```typescript
const forms = await morph.generate({ lemma: 'walk', tags: ['vblex', 'past'] }, 'en-US');
// May return: ['walked'] (past tense and past participle use same form)
```

### Irregular Forms

Generation handles irregular forms automatically:

```typescript
await morph.generate({ lemma: 'go', tags: ['vblex', 'past'] }, 'en-US');
// → ['went']

await morph.generate({ lemma: 'mouse', tags: ['n', 'pl'] }, 'en-US');
// → ['mice']

await morph.generate({ lemma: 'good', tags: ['adj', 'sint', 'comp'] }, 'en-US');
// → ['better']
```

---

## Language-Specific Examples

### English (en-US)

#### Nouns
```typescript
// Plural
await morph.generate({ lemma: 'cat', tags: ['n', 'pl'] }, 'en-US');
// → ['cats']

// Irregular plural
await morph.generate({ lemma: 'child', tags: ['n', 'pl'] }, 'en-US');
// → ['children']
```

#### Verbs
```typescript
// Present 3rd person singular
await morph.generate({ lemma: 'run', tags: ['vblex', 'pres', 'p3', 'sg'] }, 'en-US');
// → ['runs']

// Past tense
await morph.generate({ lemma: 'walk', tags: ['vblex', 'past'] }, 'en-US');
// → ['walked']

// Present participle (progressive)
await morph.generate({ lemma: 'walk', tags: ['vblex', 'pprs'] }, 'en-US');
// → ['walking']

// Past participle
await morph.generate({ lemma: 'walk', tags: ['vblex', 'pp'] }, 'en-US');
// → ['walked']

// Gerund
await morph.generate({ lemma: 'walk', tags: ['vblex', 'ger'] }, 'en-US');
// → ['walking']
```

#### Adjectives
```typescript
// Comparative
await morph.generate({ lemma: 'big', tags: ['adj', 'sint', 'comp'] }, 'en-US');
// → ['bigger']

// Superlative
await morph.generate({ lemma: 'big', tags: ['adj', 'sint', 'sup'] }, 'en-US');
// → ['biggest']
```

### French (fr-FR)

#### Nouns with Gender and Number
```typescript
// Masculine plural
await morph.generate({ lemma: 'cheval', tags: ['n', 'm', 'pl'] }, 'fr-FR');
// → ['chevaux']

// Feminine plural
await morph.generate({ lemma: 'maison', tags: ['n', 'f', 'pl'] }, 'fr-FR');
// → ['maisons']
```

#### Verbs with Person and Tense
```typescript
// Present indicative, 1st person singular
await morph.generate({ lemma: 'aimer', tags: ['vblex', 'pri', 'p1', 'sg'] }, 'fr-FR');
// → ['aime']

// Past participle, masculine singular
await morph.generate({ lemma: 'aimer', tags: ['vblex', 'pp', 'm', 'sg'] }, 'fr-FR');
// → ['aimé']
```

### Spanish (es-ES)

#### Nouns with Gender
```typescript
// Feminine plural
await morph.generate({ lemma: 'casa', tags: ['n', 'f', 'pl'] }, 'es-ES');
// → ['casas']
```

#### Verbs
```typescript
// Gerund
await morph.generate({ lemma: 'hablar', tags: ['vblex', 'ger'] }, 'es-ES');
// → ['hablando']

// Preterite, 1st person singular
await morph.generate({ lemma: 'hablar', tags: ['vblex', 'ifi', 'p1', 'sg'] }, 'es-ES');
// → ['hablé']
```

### German (de-DE)

German has extensive case and gender systems:

```typescript
// Plural nominative
await morph.generate({ lemma: 'Haus', tags: ['n', 'nt', 'pl', 'nom'] }, 'de-DE');
// → ['Häuser']
```

### Finnish (fi-FI)

Finnish has an extensive case system (15+ cases):

```typescript
// Plural nominative
await morph.generate({ lemma: 'talo', tags: ['n', 'pl', 'nom'] }, 'fi-FI');
// → ['talot']

// Singular inessive (in/inside)
await morph.generate({ lemma: 'talo', tags: ['n', 'sg', 'ine'] }, 'fi-FI');
// → ['talossa']
```

---

## HFST Tag Reference

### Common Tag Categories

#### Part of Speech
- `<n>` - Noun
- `<vblex>` - Lexical verb
- `<vbser>` - "To be" verb
- `<vbhaver>` - "To have" verb
- `<adj>` - Adjective
- `<adv>` - Adverb
- `<prn>` - Pronoun
- `<det>` - Determiner
- `<prep>` - Preposition
- `<cnjcoo>` - Coordinating conjunction
- `<cnjsub>` - Subordinating conjunction

#### Number
- `<sg>` - Singular
- `<pl>` - Plural
- `<sp>` - Singular/Plural (invariant)

#### Gender (Romance languages, German)
- `<m>` - Masculine
- `<f>` - Feminine
- `<nt>` - Neuter
- `<mf>` - Masculine/Feminine (invariant)

#### Person
- `<p1>` - First person (I, we)
- `<p2>` - Second person (you)
- `<p3>` - Third person (he, she, it, they)

#### Tense (English)
- `<pres>` - Present
- `<past>` - Past
- `<inf>` - Infinitive
- `<imp>` - Imperative
- `<pprs>` - Present participle
- `<pp>` - Past participle
- `<ger>` - Gerund
- `<subs>` - Substantive (nominalized verb)

#### Tense (French/Spanish)
- `<pri>` - Present indicative
- `<prs>` - Present subjunctive
- `<ifi>` - Preterite/Simple past
- `<pii>` - Imperfect indicative
- `<fti>` - Future indicative
- `<cni>` - Conditional

#### Adjective Comparison
- `<sint>` - Synthetic comparison (uses suffixes)
- `<comp>` - Comparative (bigger, more)
- `<sup>` - Superlative (biggest, most)

#### Case (German, Finnish, etc.)
- `<nom>` - Nominative
- `<acc>` - Accusative
- `<gen>` - Genitive
- `<dat>` - Dative
- `<ine>` - Inessive (Finnish: inside)
- `<ela>` - Elative (Finnish: out of)
- `<ill>` - Illative (Finnish: into)

---

## Discovering Tags

### Method 1: Analyze Example Words

The best way to discover available tags is to analyze words in the form you want to generate:

```typescript
// Want to generate plurals? Analyze a plural word:
const analyses = await morph.analyse('cats', 'en-US');
console.log(analyses[0].tags);  // ['n', 'pl']

// Want comparative adjectives? Analyze one:
const analyses = await morph.analyse('bigger', 'en-US');
console.log(analyses[0].tags);  // ['adj', 'sint', 'comp']

// Want past tense? Analyze a past tense verb:
const analyses = await morph.analyse('walked', 'en-US');
console.log(analyses[0].tags);  // ['vblex', 'past']
```

### Method 2: Use the HFST Playground Demo

Visit the HFST Playground demo in your browser:
```
/packages/demo/public/hfst.html
```

1. Select your language
2. Enter a word in "Analyse" field
3. Click "Analyse" to see all tags
4. Use those tags for generation

### Method 3: Command-Line HFST Lookup

If you have HFST tools installed:

```bash
# Analyze words to see tags
echo "cats" | hfst-lookup packages/packs/en-US/v1/analysis.hfstol
# Output: cats    cat<n><pl>    0.000000

echo "bigger" | hfst-lookup packages/packs/en-US/v1/analysis.hfstol
# Output: bigger    big<adj><sint><comp>    0.000000
```

### Method 4: Check Language-Specific Documentation

Each language pack may have different tag sets. Common patterns:

**English**: Simple tag system
- Nouns: `<n><sg>`, `<n><pl>`
- Verbs: `<vblex><pres>`, `<vblex><past>`, `<vblex><pprs>`
- Adjectives: `<adj><sint><comp>`, `<adj><sint><sup>`

**French/Spanish**: Gender + number + complex verb conjugations
- Nouns: `<n><m><sg>`, `<n><f><pl>`
- Verbs: `<vblex><pri><p1><sg>`, `<vblex><ifi><p3><pl>`

**German**: Gender + case + number
- Nouns: `<n><m><sg><nom>`, `<n><nt><pl><acc>`

**Finnish**: Extensive case system
- Nouns: `<n><sg><nom>`, `<n><pl><ine>`, `<n><sg><ela>`

---

## Advanced Usage

### Working with Multiple Analyses

When a word has multiple analyses, you may need to disambiguate:

```typescript
const analyses = await morph.analyse('running', 'en-US');

// Filter by part of speech
const verbForm = analyses.find(a => a.tags.includes('vblex'));
const nounForm = analyses.find(a => a.tags.includes('n'));

// Filter by specific tag combination
const presentParticiple = analyses.find(a =>
  a.tags.includes('vblex') && a.tags.includes('pprs')
);
```

### Round-Trip Verification

Verify generation by analyzing the result:

```typescript
// Generate a form
const generated = await morph.generate({ lemma: 'cat', tags: ['n', 'pl'] }, 'en-US');
console.log(generated);  // ['cats']

// Verify by analyzing
const verified = await morph.analyse(generated[0], 'en-US');
console.log(verified[0].lemma);  // 'cat'
console.log(verified[0].tags);   // ['n', 'pl']
```

### Handling Generation Failures

Not all lemma+tag combinations are valid:

```typescript
const forms = await morph.generate({ lemma: 'cat', tags: ['vblex', 'past'] }, 'en-US');
// Returns: ['HFST_GENERATION_FAILED:cat+vblex+past:...']

// Check for failure
if (forms[0].startsWith('HFST_GENERATION_FAILED')) {
  console.error('Invalid lemma/tag combination');
  // Try alternative tags or lemma
}
```

### Tag Ordering

The system supports two tag ordering modes:

```typescript
import { configureTagOrdering } from '@morphgrid/core';

// Flexible mode (default): normalizes tags to canonical order
configureTagOrdering('flexible');
await morph.generate({ lemma: 'cat', tags: ['pl', 'n'] }, 'en-US');  // Works!

// Strict mode: requires exact tag order from transducer
configureTagOrdering('strict');
await morph.generate({ lemma: 'cat', tags: ['pl', 'n'] }, 'en-US');  // May fail
await morph.generate({ lemma: 'cat', tags: ['n', 'pl'] }, 'en-US');  // Works!
```

### Batch Processing

Process multiple words efficiently:

```typescript
await morph.load('en-US');  // Load once

const words = ['cat', 'dog', 'house', 'car'];
const plurals = await Promise.all(
  words.map(word => morph.generate({ lemma: word, tags: ['n', 'pl'] }, 'en-US'))
);

console.log(plurals);  // [['cats'], ['dogs'], ['houses'], ['cars']]
```

### Language-Specific Features

#### French Elision

French has special handling for elision in the join system:

```typescript
// Analysis shows elision-triggering features
await morph.analyse('je', 'fr-FR');
// → [{ lemma: 'je', tags: ['prn', 'tn', 'p1', 'mf', 'sg'], ... }]

// Use morph.join() for proper elision
const decision = await morph.join('je', 'aime', 'fr-FR');
// → { surfacePrev: "j'", surfaceNext: 'aime', joiner: '', noSpace: true }
```

#### Spanish Clitics

Spanish attaches clitics to infinitives:

```typescript
// Analyze to see clitic structure
await morph.analyse('darme', 'es-ES');
// → Shows clitic attachment

// Use morph.join() for proper clitic handling
const decision = await morph.join('dar', 'me', 'es-ES');
```

#### German Compounds

German forms compounds:

```typescript
// Use morph.join() for compound formation
const decision = await morph.join('Haus', 'Tür', 'de-DE');
// → { surfacePrev: 'Haus', surfaceNext: 'Tür', joiner: '', noSpace: true }
// Result: "HausTür"
```

---

## Complete Examples

### Example 1: Building a Conjugation Table

```typescript
async function buildConjugationTable(lemma: string, lang: string) {
  await morph.load(lang);

  const tenses = [
    { name: 'Present', tags: ['vblex', 'pres', 'p1', 'sg'] },
    { name: 'Past', tags: ['vblex', 'past'] },
    { name: 'Present Participle', tags: ['vblex', 'pprs'] },
    { name: 'Past Participle', tags: ['vblex', 'pp'] },
  ];

  const table = {};
  for (const tense of tenses) {
    const forms = await morph.generate({ lemma, tags: tense.tags }, lang);
    table[tense.name] = forms[0];
  }

  return table;
}

// Usage
const walkTable = await buildConjugationTable('walk', 'en-US');
// {
//   'Present': 'walk',
//   'Past': 'walked',
//   'Present Participle': 'walking',
//   'Past Participle': 'walked'
// }
```

### Example 2: Smart Text Inflection

```typescript
async function inflectText(text: string, targetTags: string[], lang: string) {
  await morph.load(lang);

  // Analyze the input
  const analyses = await morph.analyse(text, lang);
  if (analyses.length === 0) return text;

  const analysis = analyses[0];

  // Generate with new tags
  const forms = await morph.generate({
    lemma: analysis.lemma,
    tags: targetTags
  }, lang);

  return forms[0] || text;
}

// Usage
await inflectText('cat', ['n', 'pl'], 'en-US');      // → 'cats'
await inflectText('running', ['vblex', 'past'], 'en-US');  // → 'ran'
await inflectText('big', ['adj', 'sint', 'sup'], 'en-US'); // → 'biggest'
```

### Example 3: Lemmatization

```typescript
async function lemmatize(word: string, lang: string): Promise<string> {
  await morph.load(lang);

  const analyses = await morph.analyse(word, lang);
  if (analyses.length === 0) return word;

  return analyses[0].lemma;
}

// Usage
await lemmatize('cats', 'en-US');      // → 'cat'
await lemmatize('running', 'en-US');   // → 'run'
await lemmatize('better', 'en-US');    // → 'good'
await lemmatize('mice', 'en-US');      // → 'mouse'
```

---

## Troubleshooting

### Problem: Generation Returns Error String

```typescript
const forms = await morph.generate({ lemma: 'xyz', tags: ['n', 'pl'] }, 'en-US');
// → ['HFST_GENERATION_FAILED:xyz+n+pl:...']
```

**Solutions:**
1. Check if lemma exists in dictionary (analyze a known form first)
2. Verify tag combination is valid for that lemma
3. Check tag order (use `configureTagOrdering('flexible')`)
4. Ensure language pack is loaded

### Problem: Analysis Returns Empty Array

```typescript
const analyses = await morph.analyse('xyzabc', 'en-US');
// → []
```

**Solutions:**
1. Check spelling of the word
2. Verify the word exists in the language pack
3. Try analyzing a simpler/known word first
4. Check if language pack loaded successfully

### Problem: Unexpected Tags

```typescript
const analyses = await morph.analyse('running', 'en-US');
// Returns multiple analyses with different tags
```

**Solutions:**
1. This is normal! Many words have multiple valid analyses
2. Filter by part of speech: `analyses.find(a => a.tags.includes('vblex'))`
3. Use context to disambiguate
4. Check all analyses to understand the word's possibilities

---

## API Reference Summary

### `morph.analyse(surface: string, lang: string): Promise<MorphAnalysis[]>`

Analyzes a surface form into morphological components.

**Parameters:**
- `surface`: The word to analyze (e.g., "cats", "running")
- `lang`: Language code (e.g., "en-US", "fr-FR")

**Returns:** Array of analyses, each containing:
- `lemma`: Base dictionary form
- `tags`: Array of morphological tags
- `surface`: Original word

### `morph.generate(input: MorphInput, lang: string): Promise<string[]>`

Generates surface forms from lemma and tags.

**Parameters:**
- `input`: Object with `lemma` and `tags` array
- `lang`: Language code

**Returns:** Array of generated surface forms (usually one, sometimes multiple)

### `morph.load(lang: string): Promise<void>`

Loads morphological transducers for a language. Must be called before analysis/generation.

**Parameters:**
- `lang`: Language code (e.g., "en-US")

---

## Supported Languages

| Language | Code | Features |
|----------|------|----------|
| English | en-US | Plurals, verb conjugation, adjective comparison |
| French | fr-FR | Gender, number, verb conjugation, elision |
| Spanish | es-ES | Gender, number, verb conjugation, clitics |
| German | de-DE | Gender, case, number, compounds |
| Italian | it-IT | Gender, number, verb conjugation |
| Finnish | fi-FI | Extensive case system (15+ cases) |
| Estonian | et-EE | Case system |
| Basque | eu-ES | Ergative-absolutive case system |
| Norwegian | no-NO | Gender, number |
| Russian | ru-RU | Gender, case, number |
| Swedish | sv-SE | Gender, number |
| Catalan | ca-ES | Gender, number, verb conjugation |
| Danish | da-DK | Gender, number |

---

## Further Reading

- **HFST Documentation**: https://hfst.github.io/
- **Apertium Tag Documentation**: https://wiki.apertium.org/wiki/List_of_symbols
- **GiellaLT Project**: https://giellalt.uit.no/
- **Demo Pages**: `/packages/demo/public/hfst.html`

---

## Contributing

To add examples for additional languages or improve documentation:

1. Test with real transducers using `hfst-lookup`
2. Verify tags with `morph.analyse()`
3. Add examples to this guide
4. Submit a pull request

For questions or issues, please open an issue on GitHub.

