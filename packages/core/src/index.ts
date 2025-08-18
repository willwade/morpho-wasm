import Snowball from "snowball-stemmers";

export type LangCode =
  | "fr-FR"
  | "es-ES"
  | "es-MX"
  | "en-US"
  | "de-DE"
  | "it-IT"
  | "fi-FI";

const snowballMap: Record<LangCode, string> = {
  "fr-FR": "french",
  "es-ES": "spanish",
  "es-MX": "spanish",
  "en-US": "english",
  "de-DE": "german",
  "it-IT": "italian",
  "fi-FI": "finnish",
};

const stemmers: Partial<Record<LangCode, any>> = {};

function getStemmer(lang: LangCode) {
  if (!stemmers[lang]) {
    const name = snowballMap[lang];
    if (!name) throw new Error(`Unsupported language: ${lang}`);
    stemmers[lang] = Snowball.newStemmer(name);
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

export const morph: Morph = {
  async load(lang) {
    getStemmer(lang);
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
  async join(prev, next, _lang) {
    const punct = [".", ",", "!", "?", ";", ":"];
    if (punct.includes(next)) {
      return {
        surfacePrev: prev,
        surfaceNext: next,
        joiner: "",
        noSpace: true,
        reason: "punctuation",
      };
    }
    return {
      surfacePrev: prev,
      surfaceNext: next,
      joiner: " ",
      noSpace: false,
      reason: "default",
    };
  },
};

export type Token = {
  surface: string;
  lang: LangCode;
  flags?: { joinLeft?: boolean; joinRight?: boolean };
};
