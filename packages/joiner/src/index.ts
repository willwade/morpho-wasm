// Basic token join rules with punctuation awareness.
export function joinTokens(prev: string, next: string): string {
  const punct = [".", ",", "!", "?", ";", ":"];
  if (punct.includes(next)) {
    return prev + next;
  }
  return `${prev} ${next}`;
}


export type JoinDecision = {
  surfacePrev: string;
  surfaceNext: string;
  joiner: '' | ' ' | '-' | '’';
  noSpace: boolean;
  reason: string;
};

const FR_H_ASPIRE = new Set<string>(["haricot","héros","honte","hache","hérisson"]);

function startsWithVowel(s: string) {
  return /^[aeiouàáâäæéèêëîïìíôöòóœùúûüỳýÿ]/i.test(s);
}

export function decideJoin(prev: string, next: string, lang: string): JoinDecision {
  const punct = [".", ",", "!", "?", ";", ":"];
  if (punct.includes(next)) {
    return { surfacePrev: prev, surfaceNext: next, joiner: "", noSpace: true, reason: "punctuation" };
  }

  const p = String(prev);
  const n = String(next);
  const pl = p.toLowerCase();
  const nl = n.toLowerCase();

  if (lang === "fr-FR") {
    const canElide = /^(je|le|la|ce|se)$/.test(pl);
    const nextIsVowelish = startsWithVowel(n) || (nl.startsWith("h") && !FR_H_ASPIRE.has(nl));
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

  if (lang === "de-DE") {
    if (pl === "un") {
      return { surfacePrev: p, surfaceNext: n, joiner: "", noSpace: true, reason: "DE prefix concat" };
    }
  }

  if (lang === "cy-GB") {
    if ((pl === "y" || pl === "yr") && startsWithVowel(n)) {
      return { surfacePrev: "yr", surfaceNext: n, joiner: " ", noSpace: false, reason: "CY article before vowel (y→yr)" };
    }
    if (pl === "yn" && /^[A-Z]?[NnLlRrMmBbCcDdGgPpTtFf]/.test(n)) {
      return { surfacePrev: p, surfaceNext: n, joiner: " ", noSpace: false, reason: "CY mutation context" };
    }
  }

  if (lang === "eu-ES") {
    return { surfacePrev: p, surfaceNext: n, joiner: " ", noSpace: false, reason: "EU default spacing" };
  }

  return { surfacePrev: prev, surfaceNext: next, joiner: " ", noSpace: false, reason: "default" };
}
