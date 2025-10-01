// Snowball stemmers are loaded lazily to avoid browser import resolution issues
let Snowball: any;
async function ensureSnowball() {
  // Avoid dynamic import in the browser demo context; only load in Node/server
  if (isBrowser) return;
  if (!Snowball) {
    const mod: any = await import("snowball-stemmers");
    Snowball = mod?.default ?? mod;
  }
}
const isBrowser = typeof window !== "undefined" && typeof document !== "undefined";


export type LangCode =
  | "fr-FR"
  | "es-ES"
  | "es-MX"
  | "en-US"
  | "de-DE"
  | "it-IT"
  | "fi-FI"
  | "cy-GB" // Welsh
  | "eu-ES"; // Basque

const snowballMap: Record<LangCode, string> = {
  "fr-FR": "french",
  "es-ES": "spanish",
  "es-MX": "spanish",
  "en-US": "english",
  "de-DE": "german",
  "it-IT": "italian",
  "fi-FI": "finnish",
  "cy-GB": "welsh",
  "eu-ES": "basque",
};

const baseLangAliases: Record<string, LangCode> = {
  fr: "fr-FR",
  es: "es-ES",
  en: "en-US",
  de: "de-DE",
  it: "it-IT",
  fi: "fi-FI",
  cy: "cy-GB",
  eu: "eu-ES",
};

const langAliasMap: Record<string, LangCode> = {};
for (const code of Object.keys(snowballMap) as LangCode[]) {
  const lower = code.toLowerCase();
  langAliasMap[lower] = code;
  langAliasMap[lower.replace(/-/g, "_")] = code;
}
for (const [alias, canonical] of Object.entries(baseLangAliases)) {
  langAliasMap[alias] = canonical;
}

function normalizeLangCode(lang: LangCode | string): LangCode {
  const key = (lang || "").toLowerCase().replace(/_/g, "-");
  return langAliasMap[key] ?? langAliasMap[key.split('-')[0]] ?? (lang as LangCode);
}

const stemmers: Partial<Record<LangCode, any>> = {};

function getStemmer(lang: LangCode | string) {
  const canonical = normalizeLangCode(lang);
  if (!stemmers[canonical]) {
    const name = snowballMap[canonical];
    if (!name) throw new Error(`Unsupported language: ${lang}`);
    // Make Snowball unavailability obvious instead of silent fallback
    if (!Snowball) {
      stemmers[canonical] = {
        stem: (s: string) => `SNOWBALL_UNAVAILABLE_IN_BROWSER:${s}`
      } as any;
    } else {
      stemmers[canonical] = Snowball.newStemmer(name);
    }
  }
  return stemmers[canonical];
}

function pluralize(lemma: string, lang: LangCode): string {
  switch (lang) {
    case "en-US":
      if (/[^aeiou]y$/.test(lemma)) return lemma.replace(/y$/, "ies");
      if (/(s|x|z|ch|sh)$/.test(lemma)) return lemma + "es";
      return lemma + "s";
    case "es-ES":
    case "es-MX":
      return /[aeiou]$/.test(lemma) ? lemma + "s" : lemma + "es";
    case "fr-FR":
      return lemma.endsWith("al") ? lemma.slice(0, -2) + "aux" : lemma + "s";
    case "de-DE":
      return lemma + "e";
    case "it-IT":
      if (lemma.endsWith("o")) return lemma.slice(0, -1) + "i";
      if (lemma.endsWith("a")) return lemma.slice(0, -1) + "e";
      return lemma + "i";
    case "fi-FI":
      return lemma + "t";
    default:
      return lemma;
  }
}

export type Analyse = {
  lemma: string;
  tags: string[];
  surface: string;
  error?: string; // Optional error message for HFST failures
};

export type GenerateInput = {
  lemma: string;
  tags: string[];
};

export type JoinDecision = {
  surfacePrev: string;
  surfaceNext: string;
  joiner: '' | ' ' | '-' | "'";
  noSpace: boolean;
  reason: string;
};

export interface HFSTJoinAdapter {
  applyJoin(prev: string, next: string, lang: string): Promise<JoinDecision | null>;
}

/**
 * HFST-based join decision function.
 * This function delegates to HFST models when available, or returns an error when not.
 */
async function decideJoin(
  prev: string,
  next: string,
  lang: string,
  options?: { hfst?: HFSTJoinAdapter }
): Promise<JoinDecision> {
  // If HFST adapter is provided, use it
  if (options?.hfst) {
    try {
      const result = await options.hfst.applyJoin(prev, next, lang);
      if (result) {
        return result;
      }
    } catch {
      // Fall through to error case below
    }
  }

  // No HFST join model available - return clear error
  return {
    surfacePrev: prev,
    surfaceNext: next,
    joiner: " ",
    noSpace: false,
    reason: `no join model loaded for ${lang}`
  };
}

export interface Morph {
  load(lang: LangCode): Promise<void>;
  analyse(surface: string, lang: LangCode): Promise<Analyse[]>;
  generate(input: GenerateInput, lang: LangCode): Promise<string[]>;
  join(prev: string, next: string, lang: LangCode): Promise<JoinDecision>;
}

// Runtime selection: default to rules; allow switching to an HFST stub
let activeRuntime: Morph;

const ruleRuntime: Morph = {
  async load(lang) {
    if (!isBrowser) {
      await ensureSnowball();
      getStemmer(lang);
    }
  },
  async analyse(surface, lang) {
    const stemmer = getStemmer(lang);
    const lemma = stemmer.stem(surface);
    return [
      {
        lemma,
        surface,
        tags: ["STEM"],
      },
    ];
  },
  async generate(input, lang) {
    if (input.tags.includes("PL")) {
      return [pluralize(input.lemma, lang)];
    }
    return [input.lemma];
  },
  async join(prev, next, lang) {
    // Use built-in join logic (no HFST adapter)
    return decideJoin(prev, next, lang);
  },
};


import { HFSTWorkerClient } from "./workerClient.js";
const hfstClient = new HFSTWorkerClient();
let hfstWasmUrl = "./wasm/hfst.wasm";

// HFST adapter that delegates to the worker client
class HFSTWorkerJoinAdapter {
  async applyJoin(prev: string, next: string, lang: string): Promise<JoinDecision | null> {
    const result = await hfstClient.applyJoin(prev, next, lang);
    return result;
  }
}
// Debug: expose last raw HFST outputs
export let lastHfstUpRaw: string[] = [];
export let lastHfstDownRaw: string[] = [];

let hfstPackUrl: string | undefined = undefined;


export function configureMorphHfst(options: { wasmUrl?: string; packUrl?: string } = {}) {
  if (options.wasmUrl) hfstWasmUrl = options.wasmUrl;
  if (options.packUrl) hfstPackUrl = options.packUrl;
}

// Tag ordering policy for generate(); default is flexible
export type TagOrderPolicy = 'strict' | 'flexible';
let tagOrderPolicy: TagOrderPolicy = 'flexible';
// Optional canonical order map; lower number = earlier
const canonicalTagOrder: Record<string, number> = {
  // Example categories: adjust/extend per language
  // Part of speech comes first
  'N': 5, 'V': 5, 'ADJ': 5, 'ADV': 5, 'PREP': 5, 'CONJ': 5,
  // Gender before Number, then Case/Person/Tense etc.
  'FEM': 10, 'MASC': 10, 'NEUT': 10,
  // Tense and aspect come before person/number for verbs
  'PRS': 20, 'PST': 20, 'FUT': 20, 'pres': 20, 'past': 20, 'inf': 20,
  'pprs': 25, 'pp': 25, 'imp': 25, 'ger': 25,
  // Number and person
  'PL': 30, 'SG': 30, 'pl': 30, 'sg': 30,
  '1': 35, '2': 35, '3': 35, 'p3': 35,
  'NOM': 40, 'ACC': 40, 'DAT': 40, 'GEN': 40,
  // Comparison
  'comp': 50, 'sup': 50,
};

export function configureTagOrdering(policy: TagOrderPolicy) {
  tagOrderPolicy = policy;
}

function orderTagsForGenerate(tags: string[]): string[] {
  if (tagOrderPolicy === 'strict') return tags.slice(); // preserve input order
  // flexible: sort using canonical order, then alpha fallback
  return tags.slice().sort((a, b) => {
    const ra = canonicalTagOrder[a] ?? 999;
    const rb = canonicalTagOrder[b] ?? 999;
    if (ra !== rb) return ra - rb;
    return a.localeCompare(b);
  });
}

const hfstRuntimeStub: Morph = {
  async load(lang) {
    // Init Worker (no-op in Node). urls are configurable.
    await hfstClient.init(hfstWasmUrl, hfstPackUrl);

    // Load pack from explicit configuration or CDN manifest
    // Note: This is a browser-first WASM library. For server-side usage,
    // configure packUrl explicitly or use Bun which has better WASM support.
    if (hfstPackUrl) {
      await hfstClient.loadPack(hfstPackUrl);
    }
    // Also prep the stemmer fallback to mirror current behavior
    await ruleRuntime.load(lang);
  },
  async analyse(surface, lang) {
    // Use HFST applyUp; NO fallback to rules - make failures obvious
    const lines = await hfstClient.applyUp(surface);
    lastHfstUpRaw = lines || [];
    if (!lines || lines.length === 0) {
      // Return clear error instead of falling back to rules
      return [{
        lemma: surface,
        surface,
        tags: ["HFST_ANALYSIS_FAILED"],
        error: `HFST analysis failed for '${surface}' in ${lang} - no HFST model loaded or model returned no results`
      }];
    }
    const out: Analyse[] = lines.map((line: string) => {
      const first = (line || '').trim().split(/\s+/)[0] || '';
      const parts = first.split('+').filter(Boolean);
      const lemma = parts.shift() || surface;
      const tags = parts;
      return { lemma, surface, tags };
    });
    return out;
  },
  async generate(input, lang) {
    // Use HFST applyDown; NO fallback to rules - make failures obvious
    const tags = orderTagsForGenerate(input.tags || []);
    const joinedPlus = [input.lemma, ...tags].join('+');
    const lines = await hfstClient.applyDown(joinedPlus);
    lastHfstDownRaw = lines || [];
    if (!lines || lines.length === 0) {
      // Return clear error instead of falling back to rules
      return [`HFST_GENERATION_FAILED:${joinedPlus}:no_HFST_model_loaded_or_no_results_for_${lang}`];
    }
    return lines;
  },
  async join(prev, next, lang) {
    // Use HFST-based joins with worker adapter
    const adapter = new HFSTWorkerJoinAdapter();
    return decideJoin(prev, next, lang, { hfst: adapter });
  },
};

activeRuntime = ruleRuntime;

export function configureMorphRuntime(mode: "rules" | "hfst") {
  activeRuntime = mode === "hfst" ? hfstRuntimeStub : ruleRuntime;
}

export const morph: Morph = {
  async load(lang) {
    const canonical = normalizeLangCode(lang);
    return activeRuntime.load(canonical);
  },
  async analyse(surface, lang) {
    const canonical = normalizeLangCode(lang);
    return activeRuntime.analyse(surface, canonical);
  },
  async generate(input, lang) {
    const canonical = normalizeLangCode(lang);
    return activeRuntime.generate(input, canonical);
  },
  async join(prev, next, lang) {
    const canonical = normalizeLangCode(lang);
    return activeRuntime.join(prev, next, canonical);
  },
};

/**
 * Clean up resources and terminate workers.
 * Important for Node.js environments to prevent hanging processes.
 */
export function cleanup(): void {
  hfstClient.terminate();
}



export type Token = {
  surface: string;
  lang: LangCode;
  flags?: { joinLeft?: boolean; joinRight?: boolean };
};
