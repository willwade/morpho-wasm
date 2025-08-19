// tools/pack-fetcher.mjs
// Fetch GiellaLT "biggies" analysers + CG grammars, then Brotli-compress HFST files.
// Usage:
//   node tools/pack-fetcher.mjs fr-FR es-ES nob sme
//   node tools/pack-fetcher.mjs --out packs --version v1 fin rus
//
// Notes:
// - Primary analyser: tokeniser-disamb-gt-desc.pmhfst
// - Fallback analyser: {iso}.hfstol (if present for some langs)
// - Grammar: disambiguator.cg3
// - Special case: sme also needs semsets.cg3
//
// Licences vary per language – verify before redistribution.

import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { createBrotliCompress } from "node:zlib";
import { createHash } from "node:crypto";

const DEFAULT_OUTDIR = "packs";
const DEFAULT_VERSION = "v1";

// Real endpoints (GiellaLT biggies)
const TEMPLATES = {
  analyser: [
    "https://gtsvn.uit.no/biggies/trunk/bin/{iso}/tokeniser-disamb-gt-desc.pmhfst",
    "https://gtsvn.uit.no/biggies/trunk/bin/{iso}/{iso}.hfstol", // fallback, morphology-only in some langs
  ],
  grammar: "https://gtsvn.uit.no/biggies/trunk/bin/{iso}/disambiguator.cg3",
  semsets_sme: "https://gtsvn.uit.no/biggies/trunk/bin/sme/semsets.cg3",
};

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

function parseArgs(argv) {
  const a = argv.slice(2);
  const out = { outDir: DEFAULT_OUTDIR, version: DEFAULT_VERSION, langs: [] };
  for (let i = 0; i < a.length; i++) {
    const t = a[i];
    if (t === "--out") out.outDir = a[++i] ?? DEFAULT_OUTDIR;
    else if (t === "--version") out.version = a[++i] ?? DEFAULT_VERSION;
    else if (t.startsWith("--")) throw new Error(`Unknown flag: ${t}`);
    else out.langs.push(t);
  }
  if (!out.langs.length) {
    console.error("Usage: node tools/pack-fetcher.mjs [--out packs] [--version v1] <lang...>");
    console.error("Example: node tools/pack-fetcher.mjs fr-FR es-ES nob sme");
    process.exit(1);
  }
  return out;
}

// Map BCP-47 -> ISO2 and ISO3
function toISO(lang) {
  const lower = lang.toLowerCase();
  return lower.includes("-") ? lower.split("-")[0] : lower;
}
const ISO3_MAP = {
  en: 'eng', fr: 'fra', es: 'spa', de: 'deu', it: 'ita', fi: 'fin', sv: 'swe', no: 'nob', da: 'dan', nn: 'nno', is: 'isl', fo: 'fao', ru: 'rus', et: 'est', eu: 'eus', ca: 'cat'
};
function toISO3(lang) {
  const iso2 = toISO(lang);
  return ISO3_MAP[iso2] || iso2; // best-effort fallback
}

async function fetchMaybe(url, method = "GET") {
  const res = await fetch(url, { method });
  if (!res.ok) return null;
  if (method === "HEAD") return { ok: true };
  if (!res.body) return null;
  const chunks = [];
  for await (const c of res.body) chunks.push(c);
  return Buffer.concat(chunks);
}

async function tryFirst(urls) {
  for (const u of urls) {
    // some servers don't support HEAD; try HEAD then GET
    const head = await fetchMaybe(u, "HEAD");
    if (head || u.endsWith(".cg3")) {
      const buf = await fetchMaybe(u, "GET");
      if (buf) return { url: u, buf };
    }
  }
  return null;
}

function sha256(buf) {
  const h = createHash("sha256");
  h.update(buf);
  return h.digest("hex");
}

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function writeAndBr(pathRaw, buf) {
  await fs.promises.writeFile(pathRaw, buf);
  const brPath = pathRaw + ".br";
  await pipeline(
    fs.createReadStream(pathRaw),
    createBrotliCompress(),
    fs.createWriteStream(brPath)
  );
  return brPath;
}

async function fetchPack(lang, outDir, version) {
  const iso = toISO(lang);
  const baseDir = path.join(outDir, lang, version);
  await ensureDir(baseDir);

  const analyserUrls = TEMPLATES.analyser.map((tpl) => tpl.replaceAll("{iso}", iso));
  let analyser = await tryFirst(analyserUrls);
  let uralic = null;
  let from = 'biggies';

  if (!analyser) {
    uralic = await tryUralic(lang, baseDir);
    from = 'uralic';
    if (!uralic) {
      console.warn(`[SKIP] ${lang}: no analyser found at GiellaLT endpoints or UralicNLP nightly`);
      return { lang, status: "not-found" };
    }
  }

  let analyserName, analyserPath, analyserBr, analyserSha;
  if (analyser) {
    const isPMHFST = analyser.url.endsWith(".pmhfst");
    analyserName = isPMHFST ? "analysis.pmhfst" : "analysis.hfstol";
    analyserPath = path.join(baseDir, analyserName);
    analyserBr = await writeAndBr(analyserPath, analyser.buf);
    analyserSha = sha256(analyser.buf);
  } else {
    analyserName = path.basename(uralic.anaPath);
    analyserPath = uralic.anaPath;
    analyserBr = uralic.anaBr;
    analyserSha = uralic.anaSha;
  }

  // Grammar (may be absent for some languages like rus)
  const grammarUrl = TEMPLATES.grammar.replaceAll("{iso}", iso);
  const grammarBuf = await fetchMaybe(grammarUrl, "GET");
  let grammarPath = null;
  if (grammarBuf) {
    grammarPath = path.join(baseDir, "disambiguator.cg3");
    await fs.promises.writeFile(grammarPath, grammarBuf);
  } else {
    console.warn(`[INFO] ${lang}: no disambiguator.cg3 found (morphology-only pack?)`);
  }

  // Special case: North Sámi needs semsets.cg3
  let semsetsPath = null;
  if (iso === "sme") {
    const semBuf = await fetchMaybe(TEMPLATES.semsets_sme, "GET");
    if (semBuf) {
      semsetsPath = path.join(baseDir, "semsets.cg3");
      await fs.promises.writeFile(semsetsPath, semBuf);
    } else {
      console.warn(`[INFO] sme: semsets.cg3 not found`);
    }
  }

  const manifest = {
    language: lang,
    iso,
    version,
    created_at: new Date().toISOString(),
    source: {
      analyser_url: analyser ? analyser.url : uralic?.anaUrl || null,
      generator_url: uralic?.genUrl || null,
      grammar_url: grammarBuf ? grammarUrl : null,
      semsets_url: iso === "sme" ? TEMPLATES.semsets_sme : null,
    },
    files: {
      analyser: path.basename(analyserPath),
      analyser_br: path.basename(analyserBr),
      generator: uralic?.genPath ? path.basename(uralic.genPath) : null,
      grammar: grammarPath ? path.basename(grammarPath) : null,
      semsets: semsetsPath ? path.basename(semsetsPath) : null,
    },
    checksums: {
      analyser_sha256: analyserSha,
      generator_sha256: uralic?.genSha || null,
      grammar_sha256: grammarBuf ? sha256(grammarBuf) : null,
      semsets_sha256: null,
    },
    notes: uralic ?
      "UralicNLP nightly build. Verify per-language licence before bundling." :
      "GiellaLT biggies build. Verify per-language licence before bundling.",
  };

  if (semsetsPath) {
    const semBuf = await fs.promises.readFile(semsetsPath);
    manifest.checksums.semsets_sha256 = sha256(semBuf);
  }

  await fs.promises.writeFile(
    path.join(baseDir, "manifest.json"),
    JSON.stringify(manifest, null, 2)
  );

  console.log(
    `[OK] ${lang}: ${path.relative(".", analyserPath)} (+.br)` +
      (grammarPath ? `, ${path.relative(".", grammarPath)}` : "") +
      (semsetsPath ? `, ${path.relative(".", semsetsPath)}` : "")
  );
  return { lang, status: "ok" };
}

async function tryUralic(lang, baseDir) {
  const iso3 = toISO3(lang);
  const base = URALIC.lang(iso3);
  // Try analyser first
  const anaUrl = base + 'analyser-gt-desc.hfstol';
  const genUrl1 = base + 'generator-gt-norm.hfstol';
  const genUrl2 = base + 'generator-dict-gt-norm.hfstol';

  const anaBuf = await fetchMaybe(anaUrl, 'GET');
  if (!anaBuf) return null;

  const anaPath = path.join(baseDir, 'analysis.hfstol');
  const anaBr = await writeAndBr(anaPath, anaBuf);

  let genPicked = null;
  const gen1 = await fetchMaybe(genUrl1, 'GET');
  if (gen1) genPicked = { url: genUrl1, buf: gen1 };
  else {
    const gen2 = await fetchMaybe(genUrl2, 'GET');
    if (gen2) genPicked = { url: genUrl2, buf: gen2 };
  }

  let genPath = null;
  let genSha = null;
  let genUrl = null;
  if (genPicked) {
    genPath = path.join(baseDir, 'generate.hfstol');
    await fs.promises.writeFile(genPath, genPicked.buf);
    genSha = sha256(genPicked.buf);
    genUrl = genPicked.url;
  }

  return { anaPath, anaBr, anaSha: sha256(anaBuf), anaUrl, genPath, genUrl, genSha };
}

async function updateIndex(outDir, lang, version, analyserName, sha256Hex, genName = null, genSha = null) {
  const indexPath = path.join(outDir, 'index.json');
  let idx = {};
  try {
    const raw = await fs.promises.readFile(indexPath, 'utf8');
    idx = JSON.parse(raw);
  } catch {}
  const analysisRel = `/packs/${lang}/${version}/${analyserName}`;
  const generationRel = genName ? `/packs/${lang}/${version}/${genName}` : undefined;
  idx[lang] = { version, analysis: analysisRel, sha256: sha256Hex };
  if (genName && genSha) {
    idx[lang].generation = generationRel;
    idx[lang].generationSha256 = genSha;
  }
  await fs.promises.writeFile(indexPath, JSON.stringify(idx, null, 2));
  console.log(`[INDEX] ${lang} → ${analysisRel}` + (genName ? ` + gen ${generationRel}` : ''));
}

async function main() {
  const { outDir, version, langs } = parseArgs(process.argv);
  for (const lang of langs) {
    try {
      const res = await fetchPack(lang, outDir, version);
      if (res && res.status === 'ok') {
        // Determine analyser filename based on what was saved
        const baseDir = path.join(outDir, lang, version);
        let analyserName = 'analysis.hfstol';
        let sha = null;
        try {
          const p = path.join(baseDir, 'analysis.hfstol');
          const statH = await fs.promises.stat(p);
          if (!statH.isFile()) throw new Error();
          const buf = await fs.promises.readFile(p);
          sha = sha256(buf);
        } catch {
          analyserName = 'analysis.pmhfst';
          const p2 = path.join(baseDir, 'analysis.pmhfst');
          const buf2 = await fs.promises.readFile(p2);
          sha = sha256(buf2);
        }
        // If Uralic provided a generator, include it in index.json
        let genName = null, genSha = null;
        try {
          const pgen = path.join(baseDir, 'generate.hfstol');
          const st = await fs.promises.stat(pgen);
          if (st.isFile()) {
            genName = 'generate.hfstol';
            const b = await fs.promises.readFile(pgen);
            genSha = sha256(b);
          }
        } catch {}
        await updateIndex(outDir, lang, version, analyserName, sha, genName, genSha);
      }
    } catch (e) {
      console.error(`[ERROR] ${lang}: ${e.message}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});