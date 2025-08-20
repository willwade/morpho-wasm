#!/usr/bin/env node
// tools/check-available-models.mjs
// Check which languages have working HFST models available from UralicNLP and GiellaLT
// Usage: node tools/check-available-models.mjs

import { createHash } from "node:crypto";

// UralicNLP nightly models
const URALIC = {
  index: 'http://models.uralicnlp.com/nightly/',
  lang: (iso3) => `http://models.uralicnlp.com/nightly/${iso3}/`,
  files: [
    'analyser-gt-desc.hfstol',
    'generator-gt-norm.hfstol',
    'generator-dict-gt-norm.hfstol',
  ],
};

// GiellaLT biggies
const GIELLALT_TEMPLATES = {
  analyser: [
    "https://gtsvn.uit.no/biggies/trunk/bin/{iso}/tokeniser-disamb-gt-desc.pmhfst",
    "https://gtsvn.uit.no/biggies/trunk/bin/{iso}/{iso}.hfstol",
  ],
  grammar: "https://gtsvn.uit.no/biggies/trunk/bin/{iso}/disambiguator.cg3",
};

// Language mappings
const ISO3_MAP = {
  en: 'eng', fr: 'fra', es: 'spa', de: 'deu', it: 'ita', fi: 'fin', sv: 'swe', 
  no: 'nob', da: 'dan', nn: 'nno', is: 'isl', fo: 'fao', ru: 'rus', et: 'est', 
  eu: 'eus', ca: 'cat', pt: 'por', nl: 'nld', pl: 'pol', cs: 'ces', sk: 'slk',
  hu: 'hun', ro: 'ron', bg: 'bul', hr: 'hrv', sl: 'slv', lt: 'lit', lv: 'lav',
  mt: 'mlt', ga: 'gle', cy: 'cym', br: 'bre', gd: 'gla', kw: 'cor', 
  sme: 'sme', smj: 'smj', sma: 'sma', smn: 'smn', sms: 'sms'
};

function toISO3(lang) {
  const iso2 = lang.toLowerCase().includes("-") ? lang.split("-")[0] : lang.toLowerCase();
  return ISO3_MAP[iso2] || iso2;
}

async function fetchMaybe(url, method = "GET") {
  try {
    const res = await fetch(url, { method });
    if (!res.ok) return null;
    if (method === "HEAD") return { ok: true };
    return res;
  } catch (e) {
    return null;
  }
}

async function checkUralicLang(lang) {
  const iso3 = toISO3(lang);
  const base = URALIC.lang(iso3);
  
  const results = {
    lang,
    iso3,
    uralic: {
      analyser: false,
      generator: false,
      generatorDict: false
    }
  };
  
  // Check analyser
  const anaRes = await fetchMaybe(base + 'analyser-gt-desc.hfstol', 'HEAD');
  if (anaRes) results.uralic.analyser = true;
  
  // Check generators
  const gen1Res = await fetchMaybe(base + 'generator-gt-norm.hfstol', 'HEAD');
  if (gen1Res) results.uralic.generator = true;
  
  const gen2Res = await fetchMaybe(base + 'generator-dict-gt-norm.hfstol', 'HEAD');
  if (gen2Res) results.uralic.generatorDict = true;
  
  return results;
}

async function checkGiellaLTLang(lang) {
  const iso = lang.toLowerCase().includes("-") ? lang.split("-")[0] : lang.toLowerCase();
  
  const results = {
    lang,
    iso,
    giellalt: {
      pmhfst: false,
      hfstol: false,
      grammar: false
    }
  };
  
  // Check PMHFST analyser
  const pmhfstUrl = GIELLALT_TEMPLATES.analyser[0].replaceAll("{iso}", iso);
  const pmhfstRes = await fetchMaybe(pmhfstUrl, 'HEAD');
  if (pmhfstRes) results.giellalt.pmhfst = true;
  
  // Check HFSTOL analyser
  const hfstolUrl = GIELLALT_TEMPLATES.analyser[1].replaceAll("{iso}", iso);
  const hfstolRes = await fetchMaybe(hfstolUrl, 'HEAD');
  if (hfstolRes) results.giellalt.hfstol = true;
  
  // Check grammar
  const grammarUrl = GIELLALT_TEMPLATES.grammar.replaceAll("{iso}", iso);
  const grammarRes = await fetchMaybe(grammarUrl, 'HEAD');
  if (grammarRes) results.giellalt.grammar = true;
  
  return results;
}

async function main() {
  console.log('Checking available HFST models...\n');
  
  // Test common languages
  const testLangs = [
    'fr-FR', 'en-US', 'es-ES', 'it-IT', 'de-DE', 'fi-FI', 'sv-SE', 'no-NO', 
    'da-DK', 'is-IS', 'fo-FO', 'ru-RU', 'et-EE', 'eu-ES', 'ca-ES',
    'pt-PT', 'nl-NL', 'pl-PL', 'cs-CZ', 'sk-SK', 'hu-HU', 'ro-RO',
    'sme', 'smj', 'sma', 'smn', 'sms' // Sámi languages
  ];
  
  const results = [];
  
  for (const lang of testLangs) {
    console.log(`Checking ${lang}...`);
    
    const [uralic, giellalt] = await Promise.all([
      checkUralicLang(lang),
      checkGiellaLTLang(lang)
    ]);
    
    const combined = {
      lang,
      uralic: uralic.uralic,
      giellalt: giellalt.giellalt,
      hasAnalysis: uralic.uralic.analyser || giellalt.giellalt.pmhfst || giellalt.giellalt.hfstol,
      hasGeneration: uralic.uralic.generator || uralic.uralic.generatorDict,
      hasBoth: (uralic.uralic.analyser && (uralic.uralic.generator || uralic.uralic.generatorDict)) ||
               (giellalt.giellalt.pmhfst && uralic.uralic.generator)
    };
    
    results.push(combined);
  }
  
  console.log('\n=== SUMMARY ===\n');
  
  console.log('Languages with BOTH analysis and generation (good candidates for join models):');
  const bothLangs = results.filter(r => r.hasBoth);
  bothLangs.forEach(r => {
    const sources = [];
    if (r.uralic.analyser && r.uralic.generator) sources.push('UralicNLP (ana+gen)');
    if (r.uralic.analyser && r.uralic.generatorDict) sources.push('UralicNLP (ana+dict-gen)');
    if (r.giellalt.pmhfst) sources.push('GiellaLT (pmhfst)');
    console.log(`  ${r.lang}: ${sources.join(', ')}`);
  });
  
  console.log('\nLanguages with analysis only:');
  const analysisOnly = results.filter(r => r.hasAnalysis && !r.hasGeneration);
  analysisOnly.forEach(r => {
    const sources = [];
    if (r.giellalt.pmhfst) sources.push('GiellaLT (pmhfst)');
    if (r.giellalt.hfstol) sources.push('GiellaLT (hfstol)');
    console.log(`  ${r.lang}: ${sources.join(', ')}`);
  });
  
  console.log('\nLanguages with no models found:');
  const noModels = results.filter(r => !r.hasAnalysis);
  noModels.forEach(r => console.log(`  ${r.lang}`));
  
  console.log(`\nTotal: ${bothLangs.length} with both, ${analysisOnly.length} analysis-only, ${noModels.length} none`);
}

main().catch(console.error);
