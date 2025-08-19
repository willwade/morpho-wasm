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

const stemmers: Partial<Record<LangCode, any>> = {};

function getStemmer(lang: LangCode) {
  if (!stemmers[lang]) {
    const name = snowballMap[lang];
    if (!name) throw new Error(`Unsupported language: ${lang}`);
    // In browser demo context, Snowball may be unavailable; use identity stub
    if (!Snowball) {
      stemmers[lang] = { stem: (s: string) => s } as any;
    } else {
      stemmers[lang] = Snowball.newStemmer(name);
    }
  }
  return stemmers[lang];
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
};

export type GenerateInput = {
  lemma: string;
  tags: string[];
};

export type JoinDecision = {
  surfacePrev: string;
  surfaceNext: string;
  joiner: "" | " " | "-" | "’";
  noSpace: boolean;
  reason: string;
};

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
    const punct = [".", ",", "!", "?", ";", ":"];
    if (punct.includes(next)) {
      return { surfacePrev: prev, surfaceNext: next, joiner: "", noSpace: true, reason: "punctuation" };
    }

    const p = prev.toString();
    const n = next.toString();
    const pl = p.toLowerCase();
    const nl = n.toLowerCase();

    const startsWithVowel = (s: string) => /^[aeiouàáâäæéèêëîïìíôöòóœùúûüỳýÿ]/i.test(s);

    // Small exception list for FR h aspiré (expanded data below)
    const frHAspire = FR_H_ASPIRE;

    if (lang === "fr-FR") {
      const canElide = /^(je|le|la|ce|se)$/.test(pl);
      const nextIsVowelish = startsWithVowel(n) || (nl.startsWith("h") && !frHAspire.has(nl));
      if (canElide && nextIsVowelish) {
        const baseMap: Record<string, string> = { je: "j’", le: "l’", la: "l’", ce: "c’", se: "s’" };
        const base = baseMap[pl] || p;
        return { surfacePrev: base, surfaceNext: n, joiner: "", noSpace: true, reason: "FR elision" };
      }
    }

    if (lang === "it-IT") {
      if ((pl === "lo" && startsWithVowel(n)) || (pl === "una" && startsWithVowel(n))) {
        const base = pl === "lo" ? "l’" : "un’";
        return { surfacePrev: base, surfaceNext: n, joiner: "", noSpace: true, reason: "IT elision" };
      }
      if (nl === "mente") {
        return { surfacePrev: p, surfaceNext: n, joiner: "", noSpace: true, reason: "IT derivation -mente" };
      }
    }

    if (lang === "en-US") {
      if (pl === "a" && startsWithVowel(n)) {
        return { surfacePrev: "an", surfaceNext: n, joiner: " ", noSpace: false, reason: "EN article alternation" };
      }
      if (pl === "child" && nl === "ren") {
        return { surfacePrev: "children", surfaceNext: "", joiner: "", noSpace: true, reason: "EN irregular plural" };
      }
      if (["ing", "s"].includes(nl) || pl === "un") {
        return { surfacePrev: p, surfaceNext: n, joiner: "", noSpace: true, reason: "EN affix/concat" };
      }
    }

    if (lang === "cy-GB") {
      // Welsh: simple article and mutation hints (demonstrative only; not exhaustive)
      if (pl === "yr" && startsWithVowel(n)) {
        return { surfacePrev: "yr", surfaceNext: n, joiner: " ", noSpace: false, reason: "CY article before vowel" };
      }
      if (pl === "yn" && /^[A-Z]?[NnLlRrMmBbCcDdGgPpTtFf]/.test(n)) {
        return { surfacePrev: p, surfaceNext: n, joiner: " ", noSpace: false, reason: "CY mutation context" };
      }
    }

    if (lang === "eu-ES") {
      // Basque: token concatenation is rare; keep spacing, simple defaults
      return { surfacePrev: p, surfaceNext: n, joiner: " ", noSpace: false, reason: "EU default spacing" };
    }

    return { surfacePrev: prev, surfaceNext: next, joiner: " ", noSpace: false, reason: "default" };
  },
};


import { HFSTWorkerClient } from "./workerClient.js";
const hfstClient = new HFSTWorkerClient();
let hfstWasmUrl = "./wasm/hfst.wasm";
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
  // Gender before Number, then Case/Person/Tense etc.
  'FEM': 10, 'MASC': 10, 'NEUT': 10,
  'PL': 20, 'SG': 20,
  'NOM': 30, 'ACC': 30, 'DAT': 30, 'GEN': 30,
  '1': 40, '2': 40, '3': 40,
  'PRS': 50, 'PST': 50, 'FUT': 50,
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
    // Load pack from explicit configuration or manifest
    // Load pack only if explicitly provided via configuration; CDN manifest is used by the demo
    if (hfstPackUrl) {
      await hfstClient.loadPack(hfstPackUrl);
    }
    // Also prep the stemmer fallback to mirror current behavior
    await ruleRuntime.load(lang);
  },
  async analyse(surface, lang) {
    // Use HFST applyUp; map to Analyse[] with a simple heuristic
    const lines = await hfstClient.applyUp(surface);
    lastHfstUpRaw = lines || [];
    if (!lines || lines.length === 0) {
      // fallback to rule runtime if no analyses
      return ruleRuntime.analyse(surface, lang);
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
    // Use HFST applyDown when available; fall back to rules if empty
    const tags = orderTagsForGenerate(input.tags || []);
    const joinedPlus = [input.lemma, ...tags].join('+');
    const lines = await hfstClient.applyDown(joinedPlus);
    lastHfstDownRaw = lines || [];
    if (!lines || lines.length === 0) {
      return ruleRuntime.generate({ ...input, tags }, lang);
    }
    return lines;
  },
  async join(prev, next, lang) {
    // Join remains rule-based for now
    return ruleRuntime.join(prev, next, lang);
  },
};

activeRuntime = ruleRuntime;

export function configureMorphRuntime(mode: "rules" | "hfst") {
  activeRuntime = mode === "hfst" ? hfstRuntimeStub : ruleRuntime;
}

export const morph: Morph = {
  async load(lang) { return activeRuntime.load(lang); },
  async analyse(surface, lang) { return activeRuntime.analyse(surface, lang); },
  async generate(input, lang) { return activeRuntime.generate(input, lang); },
  async join(prev, next, lang) { return activeRuntime.join(prev, next, lang); },
};


// Expanded FR h-aspiré list (seed); in future, load from data or HFST features
const FR_H_ASPIRE = new Set<string>(["haricot","héros","honte","hache","hérisson"]);

export type Token = {
  surface: string;
  lang: LangCode;
  flags?: { joinLeft?: boolean; joinRight?: boolean };
};
