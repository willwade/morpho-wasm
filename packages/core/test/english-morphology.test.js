/**
 * Comprehensive English Morphology Join Tests
 * 
 * Tests cover:
 * 1. Article alternation (a/an)
 * 2. Contractions (don't, won't, can't, etc.)
 * 3. Inflectional morphology (plurals, verb forms)
 * 4. Derivational morphology (prefixes, suffixes)
 * 5. Compound formation
 * 6. Irregular forms
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { morph, configureMorphRuntime } from '../dist/index.js';

test('English Article Alternation (a/an)', async () => {
  configureMorphRuntime('hfst');
  await morph.load('en-US');

  const tests = [
    // Vowel sounds - should use "an"
    { prev: 'a', next: 'apple', expected: 'an', desc: 'vowel: apple' },
    { prev: 'a', next: 'orange', expected: 'an', desc: 'vowel: orange' },
    { prev: 'a', next: 'umbrella', expected: 'an', desc: 'vowel: umbrella' },
    { prev: 'a', next: 'elephant', expected: 'an', desc: 'vowel: elephant' },
    { prev: 'a', next: 'igloo', expected: 'an', desc: 'vowel: igloo' },
    { prev: 'a', next: 'octopus', expected: 'an', desc: 'vowel: octopus' },
    
    // Silent h - should use "an"
    { prev: 'a', next: 'hour', expected: 'an', desc: 'silent h: hour' },
    { prev: 'a', next: 'honest', expected: 'an', desc: 'silent h: honest' },
    { prev: 'a', next: 'honor', expected: 'an', desc: 'silent h: honor' },
    
    // Consonant sounds - should use "a"
    { prev: 'a', next: 'cat', expected: 'a', desc: 'consonant: cat' },
    { prev: 'a', next: 'dog', expected: 'a', desc: 'consonant: dog' },
    { prev: 'a', next: 'house', expected: 'a', desc: 'consonant: house' },
    { prev: 'a', next: 'university', expected: 'a', desc: 'consonant sound: university (yoo)' },
    { prev: 'a', next: 'European', expected: 'a', desc: 'consonant sound: European (yoo)' },
    { prev: 'a', next: 'one', expected: 'a', desc: 'consonant sound: one (wun)' },
  ];

  for (const { prev, next, expected, desc } of tests) {
    const decision = await morph.join(prev, next, 'en-US');
    assert.strictEqual(
      decision.surfacePrev,
      expected,
      `${desc}: expected "${expected}" but got "${decision.surfacePrev}"`
    );
    assert.strictEqual(decision.surfaceNext, next);
    assert.strictEqual(decision.noSpace, false);
  }
});

test('English Contractions', async () => {
  configureMorphRuntime('hfst');
  await morph.load('en-US');

  const tests = [
    // Negative contractions
    { prev: 'do', next: 'not', expected: "don't", desc: 'do not → don\'t' },
    { prev: 'does', next: 'not', expected: "doesn't", desc: 'does not → doesn\'t' },
    { prev: 'did', next: 'not', expected: "didn't", desc: 'did not → didn\'t' },
    { prev: 'will', next: 'not', expected: "won't", desc: 'will not → won\'t (irregular)' },
    { prev: 'would', next: 'not', expected: "wouldn't", desc: 'would not → wouldn\'t' },
    { prev: 'should', next: 'not', expected: "shouldn't", desc: 'should not → shouldn\'t' },
    { prev: 'can', next: 'not', expected: "can't", desc: 'can not → can\'t' },
    { prev: 'could', next: 'not', expected: "couldn't", desc: 'could not → couldn\'t' },
    { prev: 'is', next: 'not', expected: "isn't", desc: 'is not → isn\'t' },
    { prev: 'are', next: 'not', expected: "aren't", desc: 'are not → aren\'t' },
    { prev: 'was', next: 'not', expected: "wasn't", desc: 'was not → wasn\'t' },
    { prev: 'were', next: 'not', expected: "weren't", desc: 'were not → weren\'t' },
    { prev: 'have', next: 'not', expected: "haven't", desc: 'have not → haven\'t' },
    { prev: 'has', next: 'not', expected: "hasn't", desc: 'has not → hasn\'t' },
    { prev: 'had', next: 'not', expected: "hadn't", desc: 'had not → hadn\'t' },
    
    // Pronoun + verb contractions
    { prev: 'I', next: 'am', expected: "I'm", desc: 'I am → I\'m' },
    { prev: 'you', next: 'are', expected: "you're", desc: 'you are → you\'re' },
    { prev: 'he', next: 'is', expected: "he's", desc: 'he is → he\'s' },
    { prev: 'she', next: 'is', expected: "she's", desc: 'she is → she\'s' },
    { prev: 'it', next: 'is', expected: "it's", desc: 'it is → it\'s' },
    { prev: 'we', next: 'are', expected: "we're", desc: 'we are → we\'re' },
    { prev: 'they', next: 'are', expected: "they're", desc: 'they are → they\'re' },
    
    // Verb + will contractions
    { prev: 'I', next: 'will', expected: "I'll", desc: 'I will → I\'ll' },
    { prev: 'you', next: 'will', expected: "you'll", desc: 'you will → you\'ll' },
    { prev: 'he', next: 'will', expected: "he'll", desc: 'he will → he\'ll' },
    { prev: 'she', next: 'will', expected: "she'll", desc: 'she will → she\'ll' },
    { prev: 'it', next: 'will', expected: "it'll", desc: 'it will → it\'ll' },
    { prev: 'we', next: 'will', expected: "we'll", desc: 'we will → we\'ll' },
    { prev: 'they', next: 'will', expected: "they'll", desc: 'they will → they\'ll' },
  ];

  for (const { prev, next, expected, desc } of tests) {
    const decision = await morph.join(prev, next, 'en-US');
    assert.strictEqual(
      decision.surfacePrev,
      expected,
      `${desc}: expected "${expected}" but got "${decision.surfacePrev}"`
    );
    assert.strictEqual(decision.surfaceNext, '');
    assert.strictEqual(decision.noSpace, true);
  }
});

test('English Inflectional Morphology - Verbs', async () => {
  configureMorphRuntime('hfst');
  await morph.load('en-US');

  const tests = [
    // Present tense 3rd person singular (-s)
    { prev: 'run', next: 's', expected: 'runs', desc: 'run + s → runs' },
    { prev: 'walk', next: 's', expected: 'walks', desc: 'walk + s → walks' },
    { prev: 'eat', next: 's', expected: 'eats', desc: 'eat + s → eats' },
    
    // -es for sibilants
    { prev: 'pass', next: 'es', expected: 'passes', desc: 'pass + es → passes' },
    { prev: 'watch', next: 'es', expected: 'watches', desc: 'watch + es → watches' },
    { prev: 'fix', next: 'es', expected: 'fixes', desc: 'fix + es → fixes' },
    
    // Present participle (-ing)
    { prev: 'sing', next: 'ing', expected: 'singing', desc: 'sing + ing → singing' },
    { prev: 'walk', next: 'ing', expected: 'walking', desc: 'walk + ing → walking' },
    { prev: 'run', next: 'ing', expected: 'running', desc: 'run + ing → running (doubling)' },
    { prev: 'make', next: 'ing', expected: 'making', desc: 'make + ing → making (e-drop)' },
    
    // Past tense (-ed)
    { prev: 'walk', next: 'ed', expected: 'walked', desc: 'walk + ed → walked' },
    { prev: 'play', next: 'ed', expected: 'played', desc: 'play + ed → played' },
    { prev: 'stop', next: 'ed', expected: 'stopped', desc: 'stop + ed → stopped (doubling)' },
    { prev: 'love', next: 'ed', expected: 'loved', desc: 'love + ed → loved (e-drop)' },
  ];

  for (const { prev, next, expected, desc } of tests) {
    const decision = await morph.join(prev, next, 'en-US');
    assert.strictEqual(
      decision.surfacePrev,
      expected,
      `${desc}: expected "${expected}" but got "${decision.surfacePrev}"`
    );
    assert.strictEqual(decision.surfaceNext, '');
    assert.strictEqual(decision.noSpace, true);
  }
});

test('English Inflectional Morphology - Nouns', async () => {
  configureMorphRuntime('hfst');
  await morph.load('en-US');

  const tests = [
    // Regular plurals (-s)
    { prev: 'cat', next: 's', expected: 'cats', desc: 'cat + s → cats' },
    { prev: 'dog', next: 's', expected: 'dogs', desc: 'dog + s → dogs' },
    
    // -es for sibilants
    { prev: 'box', next: 'es', expected: 'boxes', desc: 'box + es → boxes' },
    { prev: 'church', next: 'es', expected: 'churches', desc: 'church + es → churches' },
    
    // -ies for consonant + y
    { prev: 'baby', next: 'ies', expected: 'babies', desc: 'baby + ies → babies' },
    { prev: 'city', next: 'ies', expected: 'cities', desc: 'city + ies → cities' },
    
    // Irregular plurals
    { prev: 'child', next: 'ren', expected: 'children', desc: 'child + ren → children' },
    { prev: 'ox', next: 'en', expected: 'oxen', desc: 'ox + en → oxen' },
  ];

  for (const { prev, next, expected, desc } of tests) {
    const decision = await morph.join(prev, next, 'en-US');
    assert.strictEqual(
      decision.surfacePrev,
      expected,
      `${desc}: expected "${expected}" but got "${decision.surfacePrev}"`
    );
    assert.strictEqual(decision.surfaceNext, '');
    assert.strictEqual(decision.noSpace, true);
  }
});

test('English Derivational Morphology - Prefixes', async () => {
  configureMorphRuntime('hfst');
  await morph.load('en-US');

  const tests = [
    // Negative prefixes
    { prev: 'un', next: 'happy', expected: 'unhappy', desc: 'un + happy → unhappy' },
    { prev: 'un', next: 'able', expected: 'unable', desc: 'un + able → unable' },
    { prev: 'in', next: 'complete', expected: 'incomplete', desc: 'in + complete → incomplete' },
    { prev: 'im', next: 'possible', expected: 'impossible', desc: 'im + possible → impossible' },
    { prev: 'dis', next: 'agree', expected: 'disagree', desc: 'dis + agree → disagree' },
    
    // Other prefixes
    { prev: 're', next: 'write', expected: 'rewrite', desc: 're + write → rewrite' },
    { prev: 'pre', next: 'view', expected: 'preview', desc: 'pre + view → preview' },
    { prev: 'mis', next: 'understand', expected: 'misunderstand', desc: 'mis + understand → misunderstand' },
  ];

  for (const { prev, next, expected, desc } of tests) {
    const decision = await morph.join(prev, next, 'en-US');
    assert.strictEqual(
      decision.surfacePrev,
      expected,
      `${desc}: expected "${expected}" but got "${decision.surfacePrev}"`
    );
    assert.strictEqual(decision.surfaceNext, '');
    assert.strictEqual(decision.noSpace, true);
  }
});

test('English Derivational Morphology - Suffixes', async () => {
  configureMorphRuntime('hfst');
  await morph.load('en-US');

  const tests = [
    // Noun-forming suffixes
    { prev: 'teach', next: 'er', expected: 'teacher', desc: 'teach + er → teacher' },
    { prev: 'write', next: 'er', expected: 'writer', desc: 'write + er → writer' },
    { prev: 'happy', next: 'ness', expected: 'happiness', desc: 'happy + ness → happiness' },
    { prev: 'kind', next: 'ness', expected: 'kindness', desc: 'kind + ness → kindness' },
    
    // Adjective-forming suffixes
    { prev: 'care', next: 'ful', expected: 'careful', desc: 'care + ful → careful' },
    { prev: 'hope', next: 'ful', expected: 'hopeful', desc: 'hope + ful → hopeful' },
    { prev: 'care', next: 'less', expected: 'careless', desc: 'care + less → careless' },
    
    // Adverb-forming suffixes
    { prev: 'quick', next: 'ly', expected: 'quickly', desc: 'quick + ly → quickly' },
    { prev: 'slow', next: 'ly', expected: 'slowly', desc: 'slow + ly → slowly' },
  ];

  for (const { prev, next, expected, desc } of tests) {
    const decision = await morph.join(prev, next, 'en-US');
    assert.strictEqual(
      decision.surfacePrev,
      expected,
      `${desc}: expected "${expected}" but got "${decision.surfacePrev}"`
    );
    assert.strictEqual(decision.surfaceNext, '');
    assert.strictEqual(decision.noSpace, true);
  }
});

test('English Compound Formation', async () => {
  configureMorphRuntime('hfst');
  await morph.load('en-US');

  const tests = [
    // Closed compounds (no space)
    { prev: 'sun', next: 'flower', expected: 'sunflower', desc: 'sun + flower → sunflower' },
    { prev: 'tooth', next: 'brush', expected: 'toothbrush', desc: 'tooth + brush → toothbrush' },
    { prev: 'basket', next: 'ball', expected: 'basketball', desc: 'basket + ball → basketball' },
    
    // Hyphenated compounds
    { prev: 'mother', next: 'in-law', expected: 'mother-in-law', desc: 'mother + in-law → mother-in-law' },
    { prev: 'well', next: 'known', expected: 'well-known', desc: 'well + known → well-known' },
  ];

  for (const { prev, next, expected, desc } of tests) {
    const decision = await morph.join(prev, next, 'en-US');
    assert.strictEqual(
      decision.surfacePrev + decision.joiner + decision.surfaceNext,
      expected,
      `${desc}: expected "${expected}" but got "${decision.surfacePrev}${decision.joiner}${decision.surfaceNext}"`
    );
  }
});

test('English No Join Cases', async () => {
  configureMorphRuntime('hfst');
  await morph.load('en-US');

  const tests = [
    { prev: 'the', next: 'cat', desc: 'article + noun' },
    { prev: 'big', next: 'dog', desc: 'adjective + noun' },
    { prev: 'very', next: 'happy', desc: 'adverb + adjective' },
  ];

  for (const { prev, next, desc } of tests) {
    const decision = await morph.join(prev, next, 'en-US');
    assert.strictEqual(decision.surfacePrev, prev, `${desc}: prev should not change`);
    assert.strictEqual(decision.surfaceNext, next, `${desc}: next should not change`);
    assert.strictEqual(decision.joiner, ' ', `${desc}: should use space joiner`);
    assert.strictEqual(decision.noSpace, false, `${desc}: noSpace should be false`);
  }
});

