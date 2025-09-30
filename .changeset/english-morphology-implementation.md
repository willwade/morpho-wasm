---
"@morphgrid/core": minor
---

Add comprehensive English morphology join rules

Implements full English morphology support with 90+ test cases covering:

**Article Alternation (a/an)**
- Automatic a → an conversion before vowel sounds (a apple → an apple)
- Silent H detection (a hour → an hour, a honest → an honest)
- Consonant sound detection (a university, a European, a one)

**Contractions**
- Negative contractions: don't, won't, can't, isn't, aren't, wasn't, weren't, haven't, hasn't, hadn't
- Pronoun + verb: I'm, you're, he's, she's, it's, we're, they're
- Pronoun + will: I'll, you'll, he'll, she'll, it'll, we'll, they'll

**Inflectional Morphology - Verbs**
- Regular inflection: run + s → runs, walk + s → walks
- Progressive: sing + ing → singing, run + ing → running
- E-drop: make + ing → making, love + ed → loved
- Consonant doubling: stop + ed → stopped

**Inflectional Morphology - Nouns**
- Regular plurals: cat + s → cats, dog + s → dogs
- Sibilant plurals: box + es → boxes, church + es → churches
- Y→ies transformation: baby + ies → babies
- Irregular plurals: child + ren → children, ox + en → oxen

**Derivational Morphology - Prefixes**
- Negative: un-, in-, im-, dis- (unhappy, incomplete, impossible, disagree)
- Other: re-, pre-, mis- (rewrite, preview, misunderstand)

**Derivational Morphology - Suffixes**
- Agent/instrument: -er, -or (teacher, writer)
- Quality/state: -ness, -ful, -less (happiness, careful, careless)
- Y→i transformation: happy + ness → happiness
- E-drop: write + er → writer
- Manner: -ly (quickly, slowly)

**Compound Formation**
- Closed compounds: sunflower, toothbrush, basketball
- Hyphenated compounds: mother-in-law, well-known

All English morphology tests pass. Existing tests for French, Spanish, and German continue to pass.

