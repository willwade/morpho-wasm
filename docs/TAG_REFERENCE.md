# HFST Tag Quick Reference

Quick reference for common morphological tags used in morpho-wasm.

## How to Use This Reference

1. Find the morphological operation you want (e.g., "make plural", "past tense")
2. Look up the tags for your language
3. Use with `morph.generate({ lemma: 'word', tags: [...] }, 'lang')`

## English (en-US)

| Operation | Tags | Example Input | Example Output |
|-----------|------|---------------|----------------|
| Plural noun | `['n', 'pl']` | cat | cats |
| Singular noun | `['n', 'sg']` | cat | cat |
| Present 3rd person | `['vblex', 'pres', 'p3', 'sg']` | run | runs |
| Past tense | `['vblex', 'past']` | walk | walked |
| Present participle | `['vblex', 'pprs']` | walk | walking |
| Past participle | `['vblex', 'pp']` | walk | walked |
| Gerund | `['vblex', 'ger']` | walk | walking |
| Infinitive | `['vblex', 'inf']` | walk | walk |
| Imperative | `['vblex', 'imp']` | walk | walk |
| Comparative adjective | `['adj', 'sint', 'comp']` | big | bigger |
| Superlative adjective | `['adj', 'sint', 'sup']` | big | biggest |

### Irregular Forms (Automatic)

| Lemma | Tags | Output |
|-------|------|--------|
| go | `['vblex', 'past']` | went |
| be | `['vblex', 'past', 'p1', 'sg']` | was |
| be | `['vblex', 'past', 'p3', 'pl']` | were |
| mouse | `['n', 'pl']` | mice |
| child | `['n', 'pl']` | children |
| good | `['adj', 'sint', 'comp']` | better |
| good | `['adj', 'sint', 'sup']` | best |

## French (fr-FR)

| Operation | Tags | Example Input | Example Output |
|-----------|------|---------------|----------------|
| Masculine singular noun | `['n', 'm', 'sg']` | cheval | cheval |
| Masculine plural noun | `['n', 'm', 'pl']` | cheval | chevaux |
| Feminine singular noun | `['n', 'f', 'sg']` | maison | maison |
| Feminine plural noun | `['n', 'f', 'pl']` | maison | maisons |
| Present indicative 1st sg | `['vblex', 'pri', 'p1', 'sg']` | aimer | aime |
| Present indicative 3rd sg | `['vblex', 'pri', 'p3', 'sg']` | aimer | aime |
| Present indicative 1st pl | `['vblex', 'pri', 'p1', 'pl']` | aimer | aimons |
| Imperfect 1st sg | `['vblex', 'pii', 'p1', 'sg']` | aimer | aimais |
| Future 1st sg | `['vblex', 'fti', 'p1', 'sg']` | aimer | aimerai |
| Past participle masc sg | `['vblex', 'pp', 'm', 'sg']` | aimer | aimé |
| Past participle fem sg | `['vblex', 'pp', 'f', 'sg']` | aimer | aimée |
| Imperative 2nd sg | `['vblex', 'imp', 'p2', 'sg']` | aimer | aime |

## Spanish (es-ES)

| Operation | Tags | Example Input | Example Output |
|-----------|------|---------------|----------------|
| Masculine singular noun | `['n', 'm', 'sg']` | gato | gato |
| Masculine plural noun | `['n', 'm', 'pl']` | gato | gatos |
| Feminine singular noun | `['n', 'f', 'sg']` | casa | casa |
| Feminine plural noun | `['n', 'f', 'pl']` | casa | casas |
| Present indicative 1st sg | `['vblex', 'pri', 'p1', 'sg']` | hablar | hablo |
| Present indicative 3rd sg | `['vblex', 'pri', 'p3', 'sg']` | hablar | habla |
| Preterite 1st sg | `['vblex', 'ifi', 'p1', 'sg']` | hablar | hablé |
| Preterite 3rd sg | `['vblex', 'ifi', 'p3', 'sg']` | hablar | habló |
| Imperfect 1st sg | `['vblex', 'pii', 'p1', 'sg']` | hablar | hablaba |
| Future 1st sg | `['vblex', 'fti', 'p1', 'sg']` | hablar | hablaré |
| Gerund | `['vblex', 'ger']` | hablar | hablando |
| Past participle masc sg | `['vblex', 'pp', 'm', 'sg']` | hablar | hablado |

## German (de-DE)

| Operation | Tags | Example Input | Example Output |
|-----------|------|---------------|----------------|
| Neuter singular nominative | `['n', 'nt', 'sg', 'nom']` | Haus | Haus |
| Neuter plural nominative | `['n', 'nt', 'pl', 'nom']` | Haus | Häuser |
| Neuter singular accusative | `['n', 'nt', 'sg', 'acc']` | Haus | Haus |
| Neuter plural accusative | `['n', 'nt', 'pl', 'acc']` | Haus | Häuser |
| Masculine singular nominative | `['n', 'm', 'sg', 'nom']` | Mann | Mann |
| Masculine plural nominative | `['n', 'm', 'pl', 'nom']` | Mann | Männer |
| Feminine singular nominative | `['n', 'f', 'sg', 'nom']` | Frau | Frau |
| Feminine plural nominative | `['n', 'f', 'pl', 'nom']` | Frau | Frauen |

## Finnish (fi-FI)

Finnish has an extensive case system. Here are the most common cases:

| Operation | Tags | Example Input | Example Output |
|-----------|------|---------------|----------------|
| Singular nominative | `['n', 'sg', 'nom']` | talo | talo |
| Plural nominative | `['n', 'pl', 'nom']` | talo | talot |
| Singular genitive | `['n', 'sg', 'gen']` | talo | talon |
| Plural genitive | `['n', 'pl', 'gen']` | talo | talojen |
| Singular partitive | `['n', 'sg', 'par']` | talo | taloa |
| Plural partitive | `['n', 'pl', 'par']` | talo | taloja |
| Singular inessive (in) | `['n', 'sg', 'ine']` | talo | talossa |
| Plural inessive | `['n', 'pl', 'ine']` | talo | taloissa |
| Singular elative (out of) | `['n', 'sg', 'ela']` | talo | talosta |
| Singular illative (into) | `['n', 'sg', 'ill']` | talo | taloon |
| Singular adessive (at/on) | `['n', 'sg', 'ade']` | talo | talolla |
| Singular ablative (from) | `['n', 'sg', 'abl']` | talo | talolta |
| Singular allative (to) | `['n', 'sg', 'all']` | talo | talolle |

## Common Tag Abbreviations

### Part of Speech
- `n` - Noun
- `vblex` - Lexical verb
- `vbser` - "To be" verb
- `vbhaver` - "To have" verb
- `adj` - Adjective
- `adv` - Adverb
- `prn` - Pronoun
- `det` - Determiner
- `prep` - Preposition

### Number
- `sg` - Singular
- `pl` - Plural
- `sp` - Singular/Plural (invariant)

### Gender
- `m` - Masculine
- `f` - Feminine
- `nt` - Neuter
- `mf` - Masculine/Feminine (invariant)

### Person
- `p1` - First person (I, we)
- `p2` - Second person (you)
- `p3` - Third person (he/she/it, they)

### Tense/Mood (English)
- `pres` - Present
- `past` - Past
- `inf` - Infinitive
- `imp` - Imperative
- `pprs` - Present participle
- `pp` - Past participle
- `ger` - Gerund

### Tense/Mood (Romance Languages)
- `pri` - Present indicative
- `prs` - Present subjunctive
- `ifi` - Preterite/Simple past
- `pii` - Imperfect indicative
- `fti` - Future indicative
- `cni` - Conditional
- `imp` - Imperative

### Adjective Comparison
- `sint` - Synthetic (uses suffixes: -er, -est)
- `comp` - Comparative
- `sup` - Superlative

### Case (German, Finnish, etc.)
- `nom` - Nominative (subject)
- `acc` - Accusative (direct object)
- `gen` - Genitive (possessive)
- `dat` - Dative (indirect object)
- `par` - Partitive (Finnish: partial amount)
- `ine` - Inessive (Finnish: inside)
- `ela` - Elative (Finnish: out of)
- `ill` - Illative (Finnish: into)
- `ade` - Adessive (Finnish: at/on)
- `abl` - Ablative (Finnish: from)
- `all` - Allative (Finnish: to/towards)

## Tips for Finding Tags

### 1. Analyze Example Words

```typescript
const analyses = await morph.analyse('walked', 'en-US');
console.log(analyses[0].tags);  // ['vblex', 'past']
```

### 2. Use the HFST Playground

Open `/packages/demo/public/hfst.html` in your browser and analyze words interactively.

### 3. Command-Line Lookup

```bash
echo "cats" | hfst-lookup packages/packs/en-US/v1/analysis.hfstol
# Output: cats    cat<n><pl>    0.000000
```

### 4. Check Multiple Analyses

Many words have multiple valid analyses:

```typescript
const analyses = await morph.analyse('running', 'en-US');
// Returns multiple analyses:
// - running<n><sg> (noun: "a running")
// - run<vblex><pprs> (verb: present participle)
// - run<vblex><ger> (verb: gerund)
```

## Language-Specific Notes

### English
- Simple tag system
- Irregular forms handled automatically (go→went, mouse→mice)
- Adjectives use synthetic comparison (`<sint>`) for -er/-est forms

### French
- Gender agreement required for nouns and adjectives
- Complex verb conjugation system
- Elision handled by `morph.join()` (je + aime → j'aime)

### Spanish
- Gender agreement required
- Rich verb conjugation system
- Clitics attach to infinitives (dar + me → darme)

### German
- Gender, number, AND case required for nouns
- Four cases: nominative, accusative, dative, genitive
- Compound formation via `morph.join()`

### Finnish
- Extensive case system (15+ cases)
- No grammatical gender
- Cases express location, direction, possession, etc.

## See Also

- **[Morphological Generation Guide](MORPHOLOGICAL_GENERATION.md)** - Comprehensive guide with examples
- **[Developer Guide](README.md)** - API overview
- **[Apertium Tag Documentation](https://wiki.apertium.org/wiki/List_of_symbols)** - Full tag reference

