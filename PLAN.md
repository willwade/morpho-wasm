Awesome — here’s a crisp, repo-ready plan you can copy into a README + initial issues.

Project: morphgrid-wasm (HFST/GiellaLT morphology for web apps)

1) Scope & Deliverables
	•	Standalone demo app: a single-page JS app that runs entirely offline and showcases:
	•	Token buffer → correct joins (apostrophes, hyphens, no-space) and inflection.
	•	Language switcher with multiple prebuilt packs (e.g., fr, es, en, de, it, fi).
	•	WASM runtime: HFST optimized lookup compiled to WASM in a Web Worker.
	•	Language packs: versioned, lazy-loaded .ol / .pmhfst files + metadata.
	•	Public API (tiny, framework-agnostic) and integration docs (Vue/React/Vanilla).
	•	Authoring/Debug inspector: type pairs, see analyses, generations, and join decisions.

2) Repo Structure

morphgrid-wasm/
├─ packages/
│  ├─ core/                # WASM loader + Worker + API (ESM)
│  ├─ joiner/              # token join rules using HFST
│  └─ demo/                # static demo app (no framework)
├─ packs/                  # language packs (downloaded at runtime)
│  ├─ fr-FR/v1/analysis.ol.br
│  ├─ es-ES/v1/analysis.ol.br
│  └─ ...
├─ tools/
│  ├─ build-wasm/          # scripts: build hfst-optimized-lookup → WASM
│  └─ pack-pipeline/       # compile/analyze/compress language packs
├─ docs/                   # integration guide, API, pack authoring
├─ tests/                  # gold tests per language + e2e (Playwright)
└─ LICENSE, README.md

3) Public API (minimal, framework-agnostic)

// core API
export type LangCode = "fr-FR"|"es-ES"|"en-US"|"de-DE"|"it-IT"|"fi-FI";

export type Analyse = {
  lemma: string;
  tags: string[];        // e.g., ["V","IND","PRS","SG","1"]
  surface: string;       // original
};

export type GenerateInput = {
  lemma: string;
  tags: string[];        // desired features
};

export type JoinDecision = {
  surfacePrev: string;   // possibly altered (e.g., "je" → "j’")
  surfaceNext: string;
  joiner: "" | " " | "-" | "’";  // render hint
  noSpace: boolean;      // convenience flag ("" or "’" often implies no space)
  reason: string;        // debugging (“FR: elision before vowel/mute h”)
};

export interface Morph {
  load(lang: LangCode): Promise<void>;                     // lazy load pack
  analyse(surface: string, lang: LangCode): Promise<Analyse[]>;
  generate(input: GenerateInput, lang: LangCode): Promise<string[]>;
  join(prev: string, next: string, lang: LangCode): Promise<JoinDecision>;
}

// token helper (optional)
export type Token = {
  surface: string;
  lang: LangCode;
  flags?: { joinLeft?: boolean; joinRight?: boolean };
};

Example usage (Vanilla JS)

<div>
  <select id="lang">
    <option>fr-FR</option><option>es-ES</option><option>en-US</option>
  </select>
  <input id="prev" placeholder="prev word" value="je">
  <input id="next" placeholder="next word" value="aime">
  <button id="run">Join</button>
  <pre id="out"></pre>
</div>
<script type="module">
  import { morph } from "./dist/core/index.js"; // ESM bundle

  const langSel = document.getElementById("lang");
  const prevEl = document.getElementById("prev");
  const nextEl = document.getElementById("next");
  const out = document.getElementById("out");

  await morph.load(langSel.value); // lazy load selected language pack

  document.getElementById("run").onclick = async () => {
    const lang = langSel.value;
    await morph.load(lang);
    const decision = await morph.join(prevEl.value, nextEl.value, lang);
    const rendered = decision.noSpace
      ? decision.surfacePrev + decision.surfaceNext
      : decision.surfacePrev + (decision.joiner || " ") + decision.surfaceNext;
    out.textContent = JSON.stringify({ decision, rendered }, null, 2);
  };
</script>

4) Demo App Features
	•	Language switcher; fast pack load indicator.
	•	“Subject → verb” playground (e.g., je + aimer → j’aime; me + lo + dar in ES clitic combos).
	•	Token buffer editor with live rendering and “show analyses/generations” panel.
	•	Join Inspector: shows prev/next analyses and why a join was chosen.

5) Integration Guide (docs/)
	•	Concepts: tokens, analyses vs generation, joining.
	•	Setup:
	•	import { morph } from "@morphgrid/core"
	•	await morph.load("fr-FR")
	•	Rendering:
	•	When a user taps a pronoun → store context (e.g., PRS SG 1).
	•	On verb tap → generate({lemma:"aimer", tags:["V","IND","PRS","SG","1"]}).
	•	Pass previous + next to join() to get spacing/apostrophe/hyphen rule.
	•	Pictograms: keep pictos separate; only the text uses join/render hints.
	•	Caching: packs cached in IndexedDB; versioned with a manifest (/packs/index.json).
	•	Fallback: if a pack is missing, degrade to simple spacing rules.

6) Language Packs (initial)
	•	French (fr-FR): elision + reflexive joins + mute-h vs h-aspiré.
	•	Spanish (es-ES): clitics (dámelo), imperative/enclisis.
	•	English (en-US/GB): articles (a/an), common derivation demo.
	•	German (de-DE): separable verbs demo + compounding sample.
	•	Italian (it-IT): elision & clitics.
	•	Finnish (fi-FI): rich inflection showcase (performance test).

Each pack: analysis.ol.br, optional generate.ol.br, manifest.json (name, version, licence, size, checksum).

7) Build & CI
	•	Build WASM: Emscripten target for hfst-optimized-lookup with a minimal C shim; export apply_up() / apply_down().
	•	Pack pipeline: scripts to compile/transduce → compress (Brotli) → emit manifest.
	•	Tests:
	•	Gold tests (TSV): input | tags | expected-surface | expected-join.
	•	E2E: Playwright runs demo in headless browser; snapshot the rendered text.
	•	CI: GitHub Actions cache WASM artifacts, run tests on PR, publish npm packages on tag.

8) Licences & Attribution
	•	Clearly list licences per language (GiellaLT analysers vary).
	•	Core code under MIT; include THIRD_PARTY_NOTICES for analysers.

9) Issue Backlog (cut/paste to GitHub)
	1.	WASM runtime: compile hfst-optimized-lookup and expose a Worker API.
	2.	Pack loader: fetch + IndexedDB caching + integrity check (SHA256).
	3.	Core API: load/analyse/generate/join with TypeScript types.
	4.	Join rules: implement FR apostrophe/no-space using analyser features.
	5.	Demo app: language switcher, token buffer, Join Inspector UI.
	6.	Docs: Quick start + Vue/React snippets + pack authoring guide.
	7.	Packs: fr-FR MVP; gold tests for je/j’ + mute-h.
	8.	Packs: es-ES clitic joining; sample verbs + tests.
	9.	Packs: en-GB article alternation and basic derivation demo.
	10.	Authoring tool: explorer to inspect analyses/generations for any word.
	11.	Perf pass: Worker pooling, streaming instantiation, memory caps.
	12.	Accessibility: keyboard and screen reader friendly demo.

⸻

If you want, I can generate the initial README.md and stub the Worker + ESM API files so you can create the repo and push in one go.
