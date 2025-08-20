#!/usr/bin/env node
// Quick test of UralicNLP availability for common languages

const ISO3_MAP = {
  en: 'eng', fr: 'fra', es: 'spa', de: 'deu', it: 'ita', fi: 'fin', sv: 'swe', 
  no: 'nob', da: 'dan', ru: 'rus', et: 'est', eu: 'eus', ca: 'cat', pt: 'por', 
  nl: 'nld', pl: 'pol', cs: 'ces', hu: 'hun', ro: 'ron'
};

async function checkLang(lang) {
  const iso2 = lang.split('-')[0];
  const iso3 = ISO3_MAP[iso2] || iso2;
  const base = `http://models.uralicnlp.com/nightly/${iso3}/`;
  
  try {
    const [ana, gen1, gen2] = await Promise.all([
      fetch(base + 'analyser-gt-desc.hfstol', { method: 'HEAD' }),
      fetch(base + 'generator-gt-norm.hfstol', { method: 'HEAD' }),
      fetch(base + 'generator-dict-gt-norm.hfstol', { method: 'HEAD' })
    ]);
    
    const hasAna = ana.ok;
    const hasGen = gen1.ok || gen2.ok;
    
    if (hasAna && hasGen) {
      console.log(`✅ ${lang} (${iso3}): Analysis + Generation`);
      return { lang, status: 'both' };
    } else if (hasAna) {
      console.log(`⚠️  ${lang} (${iso3}): Analysis only`);
      return { lang, status: 'analysis' };
    } else {
      console.log(`❌ ${lang} (${iso3}): No models`);
      return { lang, status: 'none' };
    }
  } catch (e) {
    console.log(`❌ ${lang} (${iso3}): Error - ${e.message}`);
    return { lang, status: 'error' };
  }
}

async function main() {
  const langs = [
    'fr-FR', 'en-US', 'es-ES', 'it-IT', 'de-DE', 'fi-FI', 'sv-SE', 'no-NO',
    'da-DK', 'ru-RU', 'et-EE', 'eu-ES', 'ca-ES', 'pt-PT', 'nl-NL', 'pl-PL',
    'cs-CZ', 'hu-HU', 'ro-RO'
  ];
  
  console.log('Checking UralicNLP models...\n');
  
  const results = [];
  for (const lang of langs) {
    const result = await checkLang(lang);
    results.push(result);
  }
  
  const both = results.filter(r => r.status === 'both');
  const analysisOnly = results.filter(r => r.status === 'analysis');
  
  console.log(`\n📊 Summary:`);
  console.log(`   ${both.length} languages with both analysis + generation`);
  console.log(`   ${analysisOnly.length} languages with analysis only`);
  console.log(`   ${results.length - both.length - analysisOnly.length} languages with no models`);
  
  if (both.length > 0) {
    console.log(`\n🎯 Good candidates for join models:`);
    both.forEach(r => console.log(`   ${r.lang}`));
  }
}

main().catch(console.error);
