// HFST Web Worker that wraps HFST WASM calls.
// Compatible with both Web Workers and Node.js worker_threads.
class TempFSTJoinCoordinator {
    async applyJoin(prev, next, lang, analysisFunction) {
        const prevAnalysis = await analysisFunction(prev);
        const nextAnalysis = await analysisFunction(next);
        // Reduced logging to avoid serialization issues
        console.log(`🔧 FST Analysis - ${prev}: ${prevAnalysis.length} results`);
        console.log(`🔧 FST Analysis - ${next}: ${nextAnalysis.length} results`);
        // Check if we have real morphological analysis (Apertium tags like "prn", "det", "vblex", etc.)
        const hasRealPrevAnalysis = prevAnalysis.some(a => a.tags.length > 0 &&
            !a.tags.includes('HFST_ANALYSIS_FAILED') &&
            a.tags.some(tag => ['prn', 'det', 'vblex', 'n', 'adj', 'adv', 'prep', 'conj'].includes(tag)));
        const hasRealNextAnalysis = nextAnalysis.some(a => a.tags.length > 0 &&
            !a.tags.includes('HFST_ANALYSIS_FAILED') &&
            a.tags.some(tag => ['prn', 'det', 'vblex', 'n', 'adj', 'adv', 'prep', 'conj'].includes(tag)));
        if (hasRealPrevAnalysis && hasRealNextAnalysis) {
            // Use TRUE FST-based analysis
            return this.morphologyBasedJoin(prev, next, lang, prevAnalysis, nextAnalysis);
        }
        else {
            // Fall back to language-specific logic when FST analysis isn't available
            return this.languageSpecificJoin(prev, next, lang);
        }
    }
    async morphologyBasedJoin(prev, next, lang, prevAnalysis, nextAnalysis) {
        // TRUE FST-based joins using morphological features from existing GiellaLT/Apertium transducers
        // Extract morphological features from the best analysis (first result)
        const prevFeatures = prevAnalysis[0]?.tags || [];
        const nextFeatures = nextAnalysis[0]?.tags || [];
        // Language-specific FST-based join rules using real morphological features
        switch (lang) {
            case 'fr-FR':
                return this.frenchMorphologyJoin(prev, next, prevFeatures, nextFeatures);
            case 'it-IT':
                return this.italianMorphologyJoin(prev, next, prevFeatures, nextFeatures);
            case 'es-ES':
                return this.spanishMorphologyJoin(prev, next, prevFeatures, nextFeatures);
            default:
                // Generic morphology-based join for other languages
                return this.genericMorphologyJoin(prev, next, lang, prevFeatures, nextFeatures);
        }
    }
    async frenchMorphologyJoin(prev, next, prevTags, nextTags) {
        // French FST-based elision using Apertium morphological features
        // Check if prev is a function word that can elide (determiners, pronouns, prepositions, etc.)
        const canElide = prevTags.some(tag => tag === 'det' || // determiner (le, la, de)
            tag === 'prn' || // pronoun (je, me, te, se, ce)
            tag === 'prep' || // preposition (de)
            tag === 'conj' || // conjunction (que)
            tag === 'adv' // adverb (ne)
        );
        // Check if next starts with vowel sound (approximated by morphological features)
        const startsWithVowel = /^[aeiouàáâäèéêëìíîïòóôöùúûüÿh]/i.test(next);
        if (canElide && startsWithVowel) {
            // Apply elision based on morphological analysis
            const elisionMap = new Map([
                ['je', 'j\u2019'], ['le', 'l\u2019'], ['la', 'l\u2019'], ['de', 'd\u2019'],
                ['ne', 'n\u2019'], ['me', 'm\u2019'], ['te', 't\u2019'], ['se', 's\u2019'],
                ['ce', 'c\u2019'], ['que', 'qu\u2019']
            ]);
            const elided = elisionMap.get(prev.toLowerCase());
            if (elided) {
                return {
                    surfacePrev: elided,
                    surfaceNext: next,
                    joiner: '',
                    noSpace: true,
                    reason: `French FST-based elision using Apertium morphological features: ${prev}[${prevTags.join(',')}] + ${next}[${nextTags.join(',')}]`
                };
            }
        }
        // Default: space separation
        return {
            surfacePrev: prev,
            surfaceNext: next,
            joiner: ' ',
            noSpace: false,
            reason: `French FST-based join (no elision): ${prev}[${prevTags.join(',')}] + ${next}[${nextTags.join(',')}]`
        };
    }
    async italianMorphologyJoin(prev, next, prevTags, nextTags) {
        // Italian FST-based joins using morphological features
        // TODO: Implement Italian-specific morphological join rules
        return {
            surfacePrev: prev,
            surfaceNext: next,
            joiner: ' ',
            noSpace: false,
            reason: `Italian FST-based join: ${prev}[${prevTags.join(',')}] + ${next}[${nextTags.join(',')}]`
        };
    }
    async spanishMorphologyJoin(prev, next, prevTags, nextTags) {
        // Spanish FST-based joins using morphological features
        // TODO: Implement Spanish-specific morphological join rules
        return {
            surfacePrev: prev,
            surfaceNext: next,
            joiner: ' ',
            noSpace: false,
            reason: `Spanish FST-based join: ${prev}[${prevTags.join(',')}] + ${next}[${nextTags.join(',')}]`
        };
    }
    async genericMorphologyJoin(prev, next, lang, prevTags, nextTags) {
        // Generic FST-based join using morphological features
        return {
            surfacePrev: prev,
            surfaceNext: next,
            joiner: ' ',
            noSpace: false,
            reason: `Generic FST-based join for ${lang}: ${prev}[${prevTags.join(',')}] + ${next}[${nextTags.join(',')}]`
        };
    }
    async languageSpecificJoin(prev, next, lang) {
        switch (lang) {
            case 'fr-FR':
                const frenchResult = await this.frenchElision(prev, next);
                if (frenchResult)
                    return frenchResult;
                break;
            case 'es-ES':
                const spanishResult = await this.spanishCliticJoin(prev, next);
                if (spanishResult)
                    return spanishResult;
                break;
            case 'de-DE':
                const germanResult = await this.germanCompoundJoin(prev, next);
                if (germanResult)
                    return germanResult;
                break;
            case 'en-US':
                const englishResult = await this.englishMorphologyJoin(prev, next);
                if (englishResult)
                    return englishResult;
                break;
        }
        // Default: space separation
        return {
            surfacePrev: prev,
            surfaceNext: next,
            joiner: ' ',
            noSpace: false,
            reason: `No join rule found for ${lang}: ${prev} + ${next}`
        };
    }
    async spanishCliticJoin(prev, next) {
        // Spanish clitic joining logic (fallback when FST analysis isn't available)
        // Handle pronoun attachment and contractions
        // Spanish contractions
        const contractions = new Map([
            ['de+el', 'del'],
            ['a+el', 'al']
        ]);
        const contractionKey = `${prev}+${next}`;
        if (contractions.has(contractionKey)) {
            return {
                surfacePrev: contractions.get(contractionKey),
                surfaceNext: '',
                joiner: '',
                noSpace: true,
                reason: `Spanish contraction: ${prev} + ${next} → ${contractions.get(contractionKey)}`
            };
        }
        // Spanish clitic pronouns (simplified - would need FST for full accent placement)
        const infinitiveEndings = /r$/;
        const clitics = ['me', 'te', 'se', 'le', 'la', 'lo', 'nos', 'os', 'les', 'las', 'los'];
        if (infinitiveEndings.test(prev) && clitics.includes(next)) {
            // Simple concatenation for infinitive + clitic (real FST would handle accents)
            return {
                surfacePrev: prev,
                surfaceNext: next,
                joiner: '',
                noSpace: true,
                reason: `Spanish clitic attachment: ${prev} + ${next} (FST needed for proper accent placement)`
            };
        }
        return null; // No Spanish-specific join rule found
    }
    async germanCompoundJoin(prev, next) {
        // German compound formation logic (fallback when FST analysis isn't available)
        // Handle basic compound formation and linking elements
        // Common German compound patterns (simplified - real FST would handle full morphology)
        const compoundPatterns = new Map([
            // Common compounds
            ['Haus+Tür', 'Haustür'],
            ['Auto+Bahn', 'Autobahn'],
            ['Bahn+Hof', 'Bahnhof'],
            ['Wasser+Fall', 'Wasserfall'],
            // With linking elements
            ['Liebe+s+Lied', 'Liebeslied'],
            ['Hund+e+Hütte', 'Hundehütte']
        ]);
        const compoundKey = `${prev}+${next}`;
        if (compoundPatterns.has(compoundKey)) {
            return {
                surfacePrev: compoundPatterns.get(compoundKey),
                surfaceNext: '',
                joiner: '',
                noSpace: true,
                reason: `German compound: ${prev} + ${next} → ${compoundPatterns.get(compoundKey)}`
            };
        }
        // Basic compound formation (no linking element)
        // In real implementation, FST would determine if linking element is needed
        const isNoun = /^[A-ZÄÖÜ]/.test(prev) && /^[A-ZÄÖÜ]/.test(next);
        if (isNoun) {
            return {
                surfacePrev: prev,
                surfaceNext: next,
                joiner: '',
                noSpace: true,
                reason: `German compound formation: ${prev} + ${next} (FST needed for linking elements)`
            };
        }
        return null; // No German-specific join rule found
    }
    async frenchElision(prev, next) {
        // French elision logic (fallback when FST analysis isn't available)
        // Use curly quotes to match test data expectations (character code 8217)
        const elisionWords = new Map([
            ['je', "j\u2019"],
            ['le', "l\u2019"],
            ['la', "l\u2019"],
            ['de', "d\u2019"],
            ['ne', "n\u2019"],
            ['me', "m\u2019"],
            ['te', "t\u2019"],
            ['se', "s\u2019"],
            ['ce', "c\u2019"],
            ['que', "qu\u2019"],
            ['si', "s\u2019"] // only before "il/ils"
        ]);
        const prevLower = prev.toLowerCase();
        const nextLower = next.toLowerCase();
        // Check if prev can elide
        if (!elisionWords.has(prevLower)) {
            return null; // No elision
        }
        // Special case for "si" - only elides before "il/ils"
        if (prevLower === 'si' && !['il', 'ils'].includes(nextLower)) {
            return null;
        }
        // Check if next starts with vowel or h muet
        const startsWithVowel = /^[aeiouàáâäèéêëìíîïòóôöùúûüÿ]/i.test(next);
        const startsWithHMuet = /^h[aeiou]/i.test(next) && !this.isHAspire(nextLower);
        if (startsWithVowel || startsWithHMuet) {
            const elided = elisionWords.get(prevLower);
            return {
                surfacePrev: elided,
                surfaceNext: next,
                joiner: '',
                noSpace: true,
                reason: `French elision: ${prev} + ${next} → ${elided}${next}`
            };
        }
        return null; // No elision
    }
    isHAspire(word) {
        // Common h aspiré words that prevent elision
        const hAspireWords = ['haricot', 'héros', 'hibou', 'honte', 'hurler'];
        return hAspireWords.some(h => word.startsWith(h));
    }
    async englishMorphologyJoin(prev, next) {
        const prevLower = prev.toLowerCase();
        const nextLower = next.toLowerCase();
        // 1. Article alternation: a/an
        if (prevLower === 'a') {
            // Check if next word starts with vowel sound
            const vowelSounds = /^[aeiou]/i;
            // Silent H words (hour, honest, honor, heir)
            const silentHWords = ['hour', 'honest', 'honor', 'honour', 'heir', 'heiress'];
            const hasSilentH = silentHWords.some(w => nextLower.startsWith(w));
            const consonantSoundU = /^u[nst]/i; // university, use, usual (yoo sound)
            const consonantSoundE = /^eu/i; // European (yoo sound)
            const consonantSoundO = /^one/i; // one (wun sound)
            const startsWithVowelSound = (vowelSounds.test(nextLower) && !consonantSoundU.test(nextLower) && !consonantSoundE.test(nextLower) && !consonantSoundO.test(nextLower)) ||
                hasSilentH;
            if (startsWithVowelSound) {
                return {
                    surfacePrev: 'an',
                    surfaceNext: next,
                    joiner: ' ',
                    noSpace: false,
                    reason: `English article alternation: a + ${next} → an ${next}`
                };
            }
            // Keep "a" for consonant sounds
            return {
                surfacePrev: 'a',
                surfaceNext: next,
                joiner: ' ',
                noSpace: false,
                reason: `English article: a + ${next} (consonant sound)`
            };
        }
        // 2. Contractions with "not"
        if (nextLower === 'not') {
            const contractions = {
                'do': "don't",
                'does': "doesn't",
                'did': "didn't",
                'will': "won't", // irregular
                'would': "wouldn't",
                'should': "shouldn't",
                'can': "can't",
                'could': "couldn't",
                'is': "isn't",
                'are': "aren't",
                'was': "wasn't",
                'were': "weren't",
                'have': "haven't",
                'has': "hasn't",
                'had': "hadn't",
            };
            const contraction = contractions[prevLower];
            if (contraction) {
                return {
                    surfacePrev: contraction,
                    surfaceNext: '',
                    joiner: '',
                    noSpace: true,
                    reason: `English contraction: ${prev} + not → ${contraction}`
                };
            }
        }
        // 3. Pronoun + verb contractions
        const pronounVerbContractions = {
            'i': { 'am': "I'm", 'will': "I'll", 'have': "I've", 'had': "I'd", 'would': "I'd" },
            'you': { 'are': "you're", 'will': "you'll", 'have': "you've", 'had': "you'd", 'would': "you'd" },
            'he': { 'is': "he's", 'will': "he'll", 'has': "he's", 'had': "he'd", 'would': "he'd" },
            'she': { 'is': "she's", 'will': "she'll", 'has': "she's", 'had': "she'd", 'would': "she'd" },
            'it': { 'is': "it's", 'will': "it'll", 'has': "it's", 'had': "it'd", 'would': "it'd" },
            'we': { 'are': "we're", 'will': "we'll", 'have': "we've", 'had': "we'd", 'would': "we'd" },
            'they': { 'are': "they're", 'will': "they'll", 'have': "they've", 'had': "they'd", 'would': "they'd" },
        };
        const contraction = pronounVerbContractions[prevLower]?.[nextLower];
        if (contraction) {
            return {
                surfacePrev: contraction,
                surfaceNext: '',
                joiner: '',
                noSpace: true,
                reason: `English contraction: ${prev} + ${next} → ${contraction}`
            };
        }
        // 4. Inflectional morphology - verb suffixes
        if (['s', 'es', 'ing', 'ed'].includes(nextLower)) {
            return this.englishInflection(prev, next);
        }
        // 5. Inflectional morphology - noun plurals
        if (['ies', 'ren', 'en'].includes(nextLower)) {
            return this.englishNounPlural(prev, next);
        }
        // 6. Derivational morphology - prefixes
        const prefixes = ['un', 'in', 'im', 'dis', 're', 'pre', 'mis', 'non', 'anti', 'de', 'over', 'under'];
        if (prefixes.includes(prevLower)) {
            return {
                surfacePrev: prev + next,
                surfaceNext: '',
                joiner: '',
                noSpace: true,
                reason: `English prefix: ${prev} + ${next} → ${prev}${next}`
            };
        }
        // 7. Derivational morphology - suffixes
        const suffixes = ['er', 'or', 'ness', 'ful', 'less', 'ly', 'ment', 'tion', 'able', 'ible', 'ous', 'ive'];
        if (suffixes.includes(nextLower)) {
            return this.englishDerivationalSuffix(prev, next);
        }
        // 8. Compound formation
        // 8a. Hyphenated compounds (mother + in-law → mother-in-law)
        const hyphenatedCompounds = [
            'mother+in-law', 'father+in-law', 'sister+in-law', 'brother+in-law',
            'well+known', 'self+aware', 'up+to-date', 'state+of-the-art'
        ];
        const hyphenatedKey = `${prevLower}+${nextLower}`;
        if (hyphenatedCompounds.includes(hyphenatedKey)) {
            return {
                surfacePrev: prev,
                surfaceNext: next,
                joiner: '-',
                noSpace: false,
                reason: `English hyphenated compound: ${prev} + ${next} → ${prev}-${next}`
            };
        }
        // 8b. Closed compounds (no space)
        const compoundWords = [
            'sun+flower', 'tooth+brush', 'basket+ball', 'foot+ball', 'base+ball',
            'bed+room', 'class+room', 'bath+room', 'book+case', 'note+book'
        ];
        const compoundKey = `${prevLower}+${nextLower}`;
        if (compoundWords.includes(compoundKey)) {
            return {
                surfacePrev: prev + next,
                surfaceNext: '',
                joiner: '',
                noSpace: true,
                reason: `English compound: ${prev} + ${next} → ${prev}${next}`
            };
        }
        return null; // No English-specific join rule found
    }
    async englishInflection(stem, suffix) {
        const stemLower = stem.toLowerCase();
        const suffixLower = suffix.toLowerCase();
        let result = stem + suffix;
        let reason = `English inflection: ${stem} + ${suffix}`;
        // Handle different suffix types
        if (suffixLower === 'ing') {
            // Drop final 'e' before -ing (make → making)
            if (stem.endsWith('e') && !stem.endsWith('ee')) {
                result = stem.slice(0, -1) + suffix;
                reason += ` (e-drop) → ${result}`;
            }
            // Double final consonant for CVC pattern (run → running)
            else if (/[^aeiou][aeiou][^aeiouwxy]$/.test(stemLower)) {
                result = stem + stem.slice(-1) + suffix;
                reason += ` (doubling) → ${result}`;
            }
            else {
                result = stem + suffix;
                reason += ` → ${result}`;
            }
        }
        else if (suffixLower === 'ed') {
            // Drop final 'e' before -ed (love → loved)
            if (stem.endsWith('e')) {
                result = stem.slice(0, -1) + suffix;
                reason += ` (e-drop) → ${result}`;
            }
            // Double final consonant for CVC pattern (stop → stopped)
            else if (/[^aeiou][aeiou][^aeiouwxy]$/.test(stemLower)) {
                result = stem + stem.slice(-1) + suffix;
                reason += ` (doubling) → ${result}`;
            }
            else {
                result = stem + suffix;
                reason += ` → ${result}`;
            }
        }
        else if (suffixLower === 's' || suffixLower === 'es') {
            result = stem + suffix;
            reason += ` → ${result}`;
        }
        return {
            surfacePrev: result,
            surfaceNext: '',
            joiner: '',
            noSpace: true,
            reason
        };
    }
    async englishNounPlural(stem, suffix) {
        const suffixLower = suffix.toLowerCase();
        let result = stem + suffix;
        let reason = `English plural: ${stem} + ${suffix}`;
        if (suffixLower === 'ies') {
            // baby + ies → babies (consonant + y → ies)
            // Check if stem ends in consonant + y
            if (stem.length >= 2 && stem.endsWith('y') && !/[aeiou]/.test(stem[stem.length - 2])) {
                result = stem.slice(0, -1) + suffix;
                reason += ` (y→ies) → ${result}`;
            }
            else {
                result = stem + suffix;
                reason += ` → ${result}`;
            }
        }
        else if (suffixLower === 'ren') {
            // child + ren → children
            result = stem + suffix;
            reason += ` → ${result}`;
        }
        else if (suffixLower === 'en') {
            // ox + en → oxen
            result = stem + suffix;
            reason += ` → ${result}`;
        }
        return {
            surfacePrev: result,
            surfaceNext: '',
            joiner: '',
            noSpace: true,
            reason
        };
    }
    async englishDerivationalSuffix(stem, suffix) {
        const suffixLower = suffix.toLowerCase();
        let result = stem + suffix;
        let reason = `English derivation: ${stem} + ${suffix}`;
        // Y → i before -ness (happy + ness → happiness)
        if (suffixLower === 'ness' && stem.length >= 2 && stem.endsWith('y') && !/[aeiou]/.test(stem[stem.length - 2])) {
            result = stem.slice(0, -1) + 'i' + suffix;
            reason += ` (y→i) → ${result}`;
        }
        // Drop final 'e' before vowel-initial suffixes (write + er → writer)
        else if (stem.endsWith('e') && /^[aeiou]/.test(suffix)) {
            result = stem.slice(0, -1) + suffix;
            reason += ` (e-drop) → ${result}`;
        }
        else {
            result = stem + suffix;
            reason += ` → ${result}`;
        }
        return {
            surfacePrev: result,
            surfaceNext: '',
            joiner: '',
            noSpace: true,
            reason
        };
    }
}
// Node.js worker_threads compatibility
let parentPort = null;
let isNodeWorker = false;
// Initialize Node.js worker support
async function initNodeWorker() {
    try {
        if (typeof process !== 'undefined' && process.versions?.node) {
            const { parentPort: nodeParentPort } = await import('worker_threads');
            parentPort = nodeParentPort;
            isNodeWorker = true;
            console.log('🔧 Worker running in Node.js worker_threads mode');
            return true;
        }
    }
    catch {
        // Running in browser - use Web Worker APIs
        console.log('🔧 Worker running in Web Worker mode');
    }
    return false;
}
// Universal message posting function
function postMessage(message) {
    if (isNodeWorker && parentPort) {
        parentPort.postMessage(message);
    }
    else if (typeof self !== 'undefined') {
        self.postMessage(message);
    }
    else {
        console.error('No message posting mechanism available');
    }
}
let wasmUrlCache = null;
let ready = false;
let transducerLoaded = false;
let ModuleFactory = null;
let Module = null;
// FST-based join coordinator
const fstJoinCoordinator = new TempFSTJoinCoordinator();
// Helper function to perform HFST analysis within worker
async function performAnalysis(surface) {
    if (!ready || !Module || !transducerLoaded) {
        return [{ lemma: surface, surface, tags: [] }];
    }
    try {
        const fn = Module.cwrap('applyUp', 'number', ['string', 'number', 'number']);
        if (!fn)
            return [{ lemma: surface, surface, tags: [] }];
        // Get required buffer size
        const needed = fn(surface, 0, 0);
        if (needed <= 0)
            return [{ lemma: surface, surface, tags: [] }];
        // Allocate buffer and perform analysis
        const outPtr = Module._malloc(needed + 1);
        fn(surface, outPtr, needed + 1);
        const result = Module.UTF8ToString(outPtr);
        Module._free(outPtr);
        if (!result)
            return [{ lemma: surface, surface, tags: [] }];
        // Parse HFST output in Apertium format: "surface\tlemma<tag1><tag2><tag3>ε\tweight"
        const analyses = [];
        const lines = result.split('\n').filter((line) => line.trim());
        for (const line of lines) {
            // Expected format: "surface\tlemma<tag1><tag2>ε\tweight"
            const parts = line.split('\t');
            if (parts.length >= 2) {
                const analysis = parts[1];
                // Remove epsilon symbol and weight if present
                const cleanAnalysis = analysis.replace(/ε.*$/, '').trim();
                // Extract lemma and tags from Apertium format: lemma<tag1><tag2><tag3>
                const tagMatch = cleanAnalysis.match(/^([^<]+)(.*)$/);
                if (tagMatch) {
                    const lemma = tagMatch[1];
                    const tagString = tagMatch[2];
                    // Extract tags from angle brackets: <tag1><tag2> → ["tag1", "tag2"]
                    const tags = [];
                    const tagRegex = /<([^>]+)>/g;
                    let match;
                    while ((match = tagRegex.exec(tagString)) !== null) {
                        tags.push(match[1]);
                    }
                    analyses.push({ lemma, surface, tags });
                }
                else {
                    // No tags found, treat as lemma only
                    analyses.push({ lemma: cleanAnalysis, surface, tags: [] });
                }
            }
        }
        return analyses.length > 0 ? analyses : [{ lemma: surface, surface, tags: [] }];
    }
    catch (error) {
        console.warn('Analysis error:', error);
        return [{ lemma: surface, surface, tags: [] }];
    }
}
async function initWasm(wasmUrl, _packUrl) {
    if (!ModuleFactory) {
        // hfst.js is generated by emcc with -sMODULARIZE=1 -sEXPORT_ES6=1
        if (isNodeWorker) {
            // Node.js environment - use file system paths
            const { fileURLToPath } = await import('url');
            const path = await import('path');
            const currentDir = path.dirname(fileURLToPath(import.meta.url));
            const hfstJsPath = path.resolve(currentDir, '../public/wasm/hfst.js');
            console.log(`🔧 Loading HFST module from: ${hfstJsPath}`);
            ModuleFactory = (await import(hfstJsPath)).default;
        }
        else {
            // Browser environment - use relative URL
            const modUrl = new URL('../public/wasm/hfst.js', import.meta.url);
            ModuleFactory = (await import(/* @vite-ignore */ modUrl.href)).default;
        }
    }
    // Handle WASM loading for Node.js vs Browser
    if (isNodeWorker) {
        // Node.js environment - read WASM file directly and provide as ArrayBuffer
        const { fileURLToPath } = await import('url');
        const path = await import('path');
        const fs = await import('fs');
        const currentDir = path.dirname(fileURLToPath(import.meta.url));
        const wasmPath = path.resolve(currentDir, '../public/wasm/hfst.wasm');
        console.log(`🔧 Reading WASM file: ${wasmPath}`);
        const wasmBuffer = fs.readFileSync(wasmPath);
        console.log(`🔧 WASM file loaded: ${wasmBuffer.length} bytes`);
        Module = await ModuleFactory({
            wasmBinary: wasmBuffer,
            locateFile: (p) => {
                // All files should be provided directly, no fetching needed
                console.log(`🔧 locateFile called for: ${p}`);
                return p;
            }
        });
    }
    else {
        // Browser environment - use standard locateFile approach
        Module = await ModuleFactory({
            locateFile: (p) => {
                if (p.endsWith('.wasm')) {
                    return wasmUrl;
                }
                return p;
            }
        });
    }
    // Pack loading is now handled separately in the 'load_pack' message handler
    // This function only initializes the WASM module
}
// Universal message handler for both Web Workers and Node.js worker_threads
async function handleMessage(msg) {
    console.log(`🔧 Worker received message: ${msg.type}`);
    try {
        switch (msg.type) {
            case 'init': {
                wasmUrlCache = msg.wasmUrl;
                await initWasm(msg.wasmUrl, msg.packUrl);
                ready = true;
                postMessage({ type: 'ready' });
                break;
            }
            case 'load_pack': {
                if (!Module)
                    await initWasm(wasmUrlCache, msg.packUrl);
                else if (msg.packUrl) {
                    try {
                        console.log('🔧 Loading pack from URL:', msg.packUrl);
                        const u = new URL(msg.packUrl, isNodeWorker ? 'file:///' : self.location.origin);
                        console.log('🔧 Resolved URL:', u.toString());
                        const expectedSha = u.searchParams.get('sha256') || undefined;
                        const genParam = u.searchParams.get('gen');
                        const genSha = u.searchParams.get('gensha256');
                        // Handle file loading differently for Node.js vs browser
                        let res;
                        if (isNodeWorker && u.protocol === 'file:') {
                            // Node.js: use fs to read local files
                            const fs = await import('fs');
                            const { fileURLToPath } = await import('url');
                            const filePath = fileURLToPath(u);
                            console.log('🔧 Reading file:', filePath);
                            try {
                                const buffer = fs.readFileSync(filePath);
                                console.log('🔧 File read successfully, size:', buffer.length);
                                // Create a mock Response object
                                res = {
                                    ok: true,
                                    headers: {
                                        get: (name) => name === 'content-length' ? buffer.length.toString() : null
                                    },
                                    arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
                                };
                            }
                            catch (error) {
                                console.log('🔧 File read error:', error);
                                res = { ok: false };
                            }
                        }
                        else if (!isNodeWorker && typeof self !== 'undefined' && self.caches) {
                            // Browser: use cache storage
                            res = await self.caches.open('morph-packs-v1').then(async (c) => {
                                const urlStr = u.toString();
                                const m = await c.match(urlStr);
                                if (m)
                                    return m;
                                const r = await fetch(urlStr);
                                if (r && r.ok) {
                                    await c.put(urlStr, r.clone());
                                    return r;
                                }
                                return r;
                            }).catch(() => fetch(u.toString()));
                        }
                        else {
                            // Fallback: direct fetch
                            res = await fetch(u.toString());
                        }
                        if (res && res.ok) {
                            console.log('🔧 Pack downloaded successfully, size:', res.headers.get('content-length'));
                            const buf = new Uint8Array(await res.arrayBuffer());
                            console.log('🔧 Buffer size:', buf.length);
                            if (expectedSha) {
                                const digest = await crypto.subtle.digest('SHA-256', buf);
                                const hex = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
                                if (hex !== expectedSha.toLowerCase())
                                    throw new Error(`Integrity mismatch`);
                            }
                            const lower = u.pathname.toLowerCase();
                            const mountPath = lower.endsWith('.pmhfst') ? '/analysis.pmhfst' : '/analysis.hfstol';
                            console.log('🔧 Writing transducer to:', mountPath);
                            // Check if the file is GZIP compressed and decompress if needed
                            let finalBuf = buf;
                            if (buf.length > 2 && buf[0] === 0x1f && buf[1] === 0x8b) {
                                console.log('🔧 Detected GZIP compressed file, decompressing...');
                                try {
                                    if (isNodeWorker) {
                                        // Node.js environment - use zlib
                                        const zlib = await import('zlib');
                                        finalBuf = zlib.gunzipSync(buf);
                                        console.log('🔧 Decompressed:', buf.length, '→', finalBuf.length, 'bytes');
                                    }
                                    else {
                                        // Browser environment - use DecompressionStream if available
                                        if (typeof DecompressionStream !== 'undefined') {
                                            const stream = new DecompressionStream('gzip');
                                            const writer = stream.writable.getWriter();
                                            const reader = stream.readable.getReader();
                                            writer.write(buf);
                                            writer.close();
                                            const chunks = [];
                                            let done = false;
                                            while (!done) {
                                                const { value, done: readerDone } = await reader.read();
                                                done = readerDone;
                                                if (value)
                                                    chunks.push(value);
                                            }
                                            const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
                                            finalBuf = new Uint8Array(totalLength);
                                            let offset = 0;
                                            for (const chunk of chunks) {
                                                finalBuf.set(chunk, offset);
                                                offset += chunk.length;
                                            }
                                            console.log('🔧 Decompressed:', buf.length, '→', finalBuf.length, 'bytes');
                                        }
                                        else {
                                            console.log('🔧 GZIP detected but DecompressionStream not available in browser');
                                            // Fall back to original buffer - will likely fail but at least we tried
                                        }
                                    }
                                }
                                catch (error) {
                                    console.log('🔧 Decompression failed:', error);
                                    // Fall back to original buffer
                                }
                            }
                            Module.FS.writeFile(mountPath, finalBuf);
                            // Verify the file was written correctly
                            try {
                                const stat = Module.FS.stat(mountPath);
                                console.log('🔧 File written, size:', stat.size);
                                // Check if file is readable
                                const testRead = Module.FS.readFile(mountPath);
                                console.log('🔧 File readable, first 10 bytes:', Array.from(testRead.slice(0, 10)));
                            }
                            catch (e) {
                                console.log('🔧 File verification error:', e);
                            }
                            console.log('🔧 Calling loadTransducer...');
                            // Check if loadTransducer function exists and call it
                            let loadResult = 90408; // Default error code
                            const loadTransducerFn = Module.cwrap('loadTransducer', 'number', ['string']);
                            if (!loadTransducerFn) {
                                console.log('🔧 loadTransducer function not found in WASM module');
                                console.log('🔧 Available functions:', Object.keys(Module).filter(k => typeof Module[k] === 'function'));
                            }
                            else {
                                console.log('🔧 loadTransducer function found, calling with:', mountPath);
                                loadResult = loadTransducerFn(mountPath);
                                console.log('🔧 loadTransducer returned:', loadResult);
                                // Try alternative function names if this one fails
                                if (loadResult !== 0) {
                                    console.log('🔧 Trying alternative function names...');
                                    try {
                                        const altFn1 = Module.cwrap('load_transducer', 'number', ['string']);
                                        if (altFn1) {
                                            const altResult1 = altFn1(mountPath);
                                            console.log('🔧 load_transducer returned:', altResult1);
                                            if (altResult1 === 0)
                                                loadResult = altResult1;
                                        }
                                    }
                                    catch {
                                        console.log('🔧 load_transducer not available');
                                    }
                                    try {
                                        const altFn2 = Module.cwrap('hfst_load', 'number', ['string']);
                                        if (altFn2) {
                                            const altResult2 = altFn2(mountPath);
                                            console.log('🔧 hfst_load returned:', altResult2);
                                            if (altResult2 === 0)
                                                loadResult = altResult2;
                                        }
                                    }
                                    catch {
                                        console.log('🔧 hfst_load not available');
                                    }
                                }
                            }
                            if (loadResult === 0) {
                                transducerLoaded = true;
                                console.log('🔧 Main transducer loaded successfully');
                            }
                            else {
                                console.log('🔧 Failed to load main transducer, error code:', loadResult);
                                // List all available WASM functions for debugging
                                console.log('🔧 Available WASM functions:');
                                const wasmFunctions = Object.keys(Module).filter(k => typeof Module[k] === 'function' && k.startsWith('_'));
                                console.log('🔧 WASM functions:', wasmFunctions.slice(0, 20)); // First 20 functions
                                // Try to get more information about the error
                                try {
                                    const errorFn = Module.cwrap('getLastError', 'string', []);
                                    if (errorFn) {
                                        const errorMsg = errorFn();
                                        console.log('🔧 HFST error message:', errorMsg);
                                    }
                                }
                                catch {
                                    console.log('🔧 Could not get HFST error message');
                                }
                            }
                            // Load generator if specified
                            if (genParam) {
                                console.log('🔧 Loading generator from:', genParam);
                                let genBuffer = null;
                                if (isNodeWorker) {
                                    // Node.js: read generator file directly
                                    try {
                                        const genUrl = new URL(genParam, 'file:///');
                                        if (genUrl.protocol === 'file:') {
                                            const fs = await import('fs');
                                            const { fileURLToPath } = await import('url');
                                            const genFilePath = fileURLToPath(genUrl);
                                            console.log('🔧 Reading generator file:', genFilePath);
                                            const genFileBuffer = fs.readFileSync(genFilePath);
                                            genBuffer = new Uint8Array(genFileBuffer);
                                            console.log('🔧 Generator file read successfully, size:', genBuffer.length);
                                        }
                                    }
                                    catch (error) {
                                        console.log('🔧 Failed to read generator file:', error);
                                    }
                                }
                                else {
                                    // Browser: use cache and fetch
                                    try {
                                        const r2 = await self.caches?.open?.('morph-packs-v1').then(async (c) => {
                                            const m = await c.match(genParam);
                                            if (m)
                                                return m;
                                            const r = await fetch(genParam);
                                            if (r && r.ok) {
                                                await c.put(genParam, r.clone());
                                                return r;
                                            }
                                            return r;
                                        }).catch(() => fetch(genParam));
                                        if (r2 && r2.ok) {
                                            genBuffer = new Uint8Array(await r2.arrayBuffer());
                                        }
                                    }
                                    catch (error) {
                                        console.log('🔧 Failed to fetch generator:', error);
                                    }
                                }
                                if (genBuffer) {
                                    // Verify SHA if provided
                                    if (genSha) {
                                        const d2 = await crypto.subtle.digest('SHA-256', genBuffer.buffer);
                                        const hex2 = [...new Uint8Array(d2)].map(b => b.toString(16).padStart(2, '0')).join('');
                                        if (hex2 !== genSha.toLowerCase())
                                            throw new Error('Generator integrity mismatch');
                                    }
                                    // Check if generator is GZIP compressed and decompress if needed
                                    let finalGenBuf = genBuffer;
                                    if (genBuffer.length > 2 && genBuffer[0] === 0x1f && genBuffer[1] === 0x8b) {
                                        console.log('🔧 Generator is GZIP compressed, decompressing...');
                                        try {
                                            if (isNodeWorker) {
                                                const zlib = await import('zlib');
                                                finalGenBuf = new Uint8Array(zlib.gunzipSync(genBuffer));
                                                console.log('🔧 Generator decompressed:', genBuffer.length, '→', finalGenBuf.length, 'bytes');
                                            }
                                            else {
                                                // Browser decompression would go here if needed
                                                console.log('🔧 Browser GZIP decompression not implemented');
                                            }
                                        }
                                        catch (error) {
                                            console.log('🔧 Generator decompression failed:', error);
                                            finalGenBuf = genBuffer; // Use original if decompression fails
                                        }
                                    }
                                    const genPath = genParam.toLowerCase().endsWith('.pmhfst') ? '/generate.pmhfst' : '/generate.hfstol';
                                    console.log('🔧 Writing generator to:', genPath);
                                    Module.FS.writeFile(genPath, finalGenBuf);
                                    console.log('🔧 Calling loadGenerator...');
                                    const loadGenResult = Module.cwrap('loadGenerator', 'number', ['string'])(genPath);
                                    console.log('🔧 loadGenerator returned:', loadGenResult);
                                    if (loadGenResult === 0) {
                                        console.log('🔧 Generator loaded successfully!');
                                    }
                                    else {
                                        console.log('🔧 Failed to load generator, error code:', loadGenResult);
                                    }
                                }
                                else {
                                    console.log('🔧 Failed to load generator buffer');
                                }
                            }
                        }
                    }
                    catch (error) {
                        console.log('🔧 Pack loading error:', error);
                    }
                }
                postMessage({ type: 'ready' });
                break;
            }
            case 'apply_up': {
                // Reduced logging to avoid serialization issues
                const outputs = (ready && transducerLoaded) ? (() => {
                    // Simplified apply_up logic
                    if (Module?.cwrap) {
                        try {
                            const fn = Module.cwrap('applyUp', 'number', ['string', 'number', 'number']);
                            if (!fn)
                                return [`HFST_WASM_NOT_LOADED:${msg.input}`];
                            // two-call pattern: first to get size, then allocate buffer
                            const needed = fn(msg.input, 0, 0);
                            if (needed <= 0)
                                return []; // No analysis found
                            const outPtr = Module._malloc(needed + 1);
                            fn(msg.input, outPtr, needed + 1);
                            const s = Module.UTF8ToString(outPtr);
                            Module._free(outPtr);
                            return s ? s.split('\n').filter(Boolean) : [];
                        }
                        catch {
                            return [`HFST_WASM_ERROR:${msg.input}`];
                        }
                    }
                    else {
                        return [`HFST_WASM_NOT_LOADED:${msg.input}`];
                    }
                })() : transducerLoaded ? [`HFST_WASM_NOT_LOADED:${msg.input}`] : [`HFST_TRANSDUCER_NOT_LOADED:${msg.input}`];
                postMessage({ type: 'up', outputs });
                break;
            }
            case 'apply_down': {
                const outputs = ready ? (() => {
                    const fn = Module?.cwrap?.('applyDown', 'number', ['string', 'number', 'number']);
                    if (!fn)
                        return [`HFST_WASM_NOT_LOADED:${msg.input}`];
                    const getSize = Module.cwrap('applyDown', 'number', ['string', 'number', 'number']);
                    const needed = getSize(msg.input, 0, 0);
                    const outPtr = Module._malloc(needed + 1);
                    fn(msg.input, outPtr, needed + 1);
                    const s = Module.UTF8ToString(outPtr);
                    Module._free(outPtr);
                    // Clean up HFST WASM output: remove spaces between characters
                    const results = s ? s.split('\n').map((line) => line.replace(/\s+/g, '')) : [];
                    return results;
                })() : [];
                postMessage({ type: 'down', outputs });
                break;
            }
            case 'apply_join': {
                // Use FST-based join system
                const decision = await fstJoinCoordinator.applyJoin(msg.prev, msg.next, msg.lang, performAnalysis);
                // Ensure we only serialize plain data (no functions or complex objects)
                const serializedDecision = {
                    surfacePrev: String(decision.surfacePrev),
                    surfaceNext: String(decision.surfaceNext),
                    joiner: String(decision.joiner),
                    noSpace: Boolean(decision.noSpace),
                    reason: String(decision.reason)
                };
                postMessage({ type: 'join', decision: serializedDecision });
                break;
            }
            default:
                postMessage({ type: 'error', message: 'unknown message' });
        }
    }
    catch (e) {
        postMessage({ type: 'error', message: String(e?.message || e) });
    }
}
// Set up message listeners for both environments
async function setupMessageListeners() {
    const nodeInitialized = await initNodeWorker();
    if (nodeInitialized && parentPort) {
        // Node.js worker_threads
        parentPort.on('message', (data) => {
            handleMessage(data);
        });
    }
    else {
        // Web Worker
        self.onmessage = async (ev) => {
            await handleMessage(ev.data);
        };
    }
}
// Initialize message listeners
setupMessageListeners().catch(console.error);
export {};
