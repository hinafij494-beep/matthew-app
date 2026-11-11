// Audio-chain regression test — Round 3.2.1, notes 15 + 17.
//
// Why this test exists (KG1 teacher + child-psychology bar): Matthew is
// 5½ and cannot read yet, so he learns each letter ONLY from what he hears.
// A clip whose audio says a different letter does not merely sound wrong —
// it teaches him the wrong letter at the exact age he is learning to read.
// The text→key mapping was already verified correct, so a wrong sound can
// only hide in the AUDIO or in the runtime resolution. This test therefore
// verifies the REAL chain end to end, for every one of the 28 Arabic
// letters, in every clip family — never just "a key exists":
//
//   runtime text (recomputed from the REAL app sources: reading.js LETTERS
//     + syllablesFor, lessons.js lessons + explainFor, tracing.js glyphs)
//     → corpus text (must be identical — any drift means the recorded clip
//       no longer matches what the app says)
//     → runtime lookup keyFor() (EXACT[trim] first, else BY_TEXT[norm],
//       parsed from the REAL voice-clips-text-*.js files, never hardcoded)
//     → opus file audio-src/opus/<key>.ogg (must exist, valid Ogg/Opus,
//       sane duration and pace — see the pace rule below)
//     → voice pack voice-clips-pack-*.js (key present, ~segments rejoined
//       exactly like voice-clips.js does, bytes BYTE-IDENTICAL to the opus)
//
// Families covered: rd_intro_* (reading intro), les_namesound_* (letter
// school name+sound), let_full_* (full letter explanation), rd_syl_*
// (6 syllables per letter — both the key path tracing/reading use via
// playKey AND the text path used as fallback), tr_ar_* (tracing bare
// glyph, key path only — tracing never speaks by bare-text lookup),
// basic_ar_* (RETIRED by note 9: the basic-learning Arabic-letters card
// was subsumed by the unified letter lesson, so the family has no corpus
// entry and no live reference — and the pack builder only packs corpus
// entries, so the 28 clips are no longer shipped in the packs either. The
// retirement is therefore asserted as COMPLETE (no corpus entry, no code
// reference, no pack entry), so a future re-introduction cannot silently go
// unvoiced. The 28 opus files stay on disk as the audio archive).
//
// Pace rule (veteran-programmer note): a defective TTS rendering stretches
// the same text over many seconds. A clip is flagged ONLY when it is BOTH
// long (> 12 s) AND slow (< 5 letters/sec) — either alone is legitimate:
// let_full_* explanations are 21–34 s of fluent speech by design (the
// user forbids thinning explanations to shorten clips), and short letter
// clips are naturally slow because Miss Nancy speaks slowly for a child.
// Counting letters only (diacritics / tatweel / punctuation / spaces
// stripped) keeps the rate comparable across short and long texts.
//
// STT verdicts: /tmp/stt_results.json (produced by a separate transcription
// pass over the packed audio) is consumed if present. Whisper is noisy on
// 1–2 s clips, so ONLY a confident mismatch fails: the transcription
// contains the FULL NAME of a different letter (e.g. "الكاف" for a clip
// that must say "الخاء") while not containing the expected letter's name.
// Everything else is printed as a LOUD warning, never silently passed and
// never failed on mere noise. A missing STT file skips that test with a
// warning — it is not a pass of the audio content.
//
// A failure here is a REAL bug in the shipped app, not a test nit: if a
// pack lacks a key, MatthewClips.playKey returns false and the app falls
// back to device TTS (silent / robotic on his tablet) or to a WRONG clip
// via the text map. Do NOT weaken an assertion to make this file pass.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = name => fs.readFileSync(path.join(root, name), "utf8");
const readBuf = name => fs.readFileSync(path.join(root, name));

// ---------------------------------------------------------------- helpers
const ev = (code, sandbox = {}) => vm.runInNewContext(code, sandbox);

// Extract a top-level `const NAME = <array|object>;` declaration by bracket
// matching (string-aware, so nested arrays/objects are safe).
function extractDecl(src, name) {
  const start = src.indexOf("const " + name);
  assert.ok(start >= 0, "missing declaration: " + name);
  let i = src.indexOf("=", start) + 1;
  while (src[i] === " " || src[i] === "\n") i++;
  const open = src[i];
  const close = open === "[" ? "]" : open === "{" ? "}" : null;
  assert.ok(close, "unsupported declaration for " + name);
  let depth = 0, q = null, esc = false;
  for (let j = i; j < src.length; j++) {
    const c = src[j];
    if (q) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === "`") { q = c; continue; }
    if (c === open) depth++;
    else if (c === close) { depth--; if (depth === 0) return src.slice(start, j + 1) + ";"; }
  }
  throw new Error("unbalanced declaration: " + name);
}

// Extract a function definition starting at `declStart` (a `const x = ...`
// arrow function or a `function f(...)` declaration) by brace matching.
function extractFn(src, declStart) {
  const start = src.indexOf(declStart);
  assert.ok(start >= 0, "missing function: " + declStart);
  let i = src.indexOf("{", src.indexOf("=>", start) >= 0 && src.indexOf("=>", start) < src.indexOf("{", start) ? src.indexOf("=>", start) : start);
  let depth = 0, q = null, esc = false;
  for (let j = i; j < src.length; j++) {
    const c = src[j];
    if (q) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === "`") { q = c; continue; }
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) return src.slice(start, j + 1); }
  }
  throw new Error("unbalanced function: " + declStart);
}

// ------------------------------------------------------- runtime sources
// Reading letters + the REAL syllablesFor() from reading.js (not a mirror:
// الألف has special forms إِ / آ, and هـ carries a tatweel).
const readingSrc = read("reading.js");
const LETTERS = ev(extractDecl(readingSrc, "LETTERS") + "\nLETTERS;");
assert.equal(LETTERS.length, 28, "reading.js must define 28 letters");
const syllablesFor = ev(
  'const FATHA="َ",KASRA="ِ",DAMMA="ُ";\n' +
  extractFn(readingSrc, "function syllablesFor") + "\nsyllablesFor;"
);
const SYLLABLES = LETTERS.map(L => syllablesFor(L)); // [{text, say, label} × 6]
SYLLABLES.forEach((s, i) => assert.equal(s.length, 6, "letter " + i + " must have 6 syllables"));

// Letter-school data + the REAL explainFor() from lessons.js.
const lessonsSrc = read("lessons.js");
const LESSONS = ev(extractDecl(lessonsSrc, "lessons") + "\nlessons;");
assert.equal(LESSONS.length, 28, "lessons.js must define 28 letters");
const HINTS = ev(extractDecl(lessonsSrc, "HINTS") + "\nHINTS;");
const explainFor = ev(
  "const HINTS = " + JSON.stringify(HINTS) + ";\n" +
  "const explainFor = " + extractFn(lessonsSrc, "const explainFor").slice("const explainFor".length).replace(/^ *=/, "") + "\nexplainFor;"
);

// Tracing glyphs (tracing.js SETS.arLetters.items — the exact glyphs the
// child taps, including هـ with tatweel).
const tracingSrc = read("tracing.js");
const grabItems = setId => {
  const i = tracingSrc.indexOf(setId + ": {");
  assert.ok(i >= 0, "missing tracing set: " + setId);
  const line = tracingSrc.slice(tracingSrc.indexOf("items:", i)).split("\n")[0];
  return ev(line.slice("items:".length).replace(/,\s*$/, "").trim());
};
const TRACE_GLYPHS = grabItems("arLetters");
assert.equal(TRACE_GLYPHS.length, 28, "tracing must define 28 Arabic glyphs");

// Runtime texts, recomputed from the app sources above (these are the exact
// strings the app hands to the voice layer at runtime).
const runtimeText = {
  rd_intro: i => LETTERS[i].name + ". " + SYLLABLES[i][0].say + ". " + SYLLABLES[i][3].say,
  les_namesound: i => LESSONS[i].name + "، " + LESSONS[i].sound,
  let_full: i => explainFor(LESSONS[i]).spoken,
  rd_syl: (i, j) => SYLLABLES[i][j].say,
  tr_ar: i => TRACE_GLYPHS[i],
};

// ------------------------------------------------------------------ corpus
const corpus = JSON.parse(read("audio-src/corpus.json"));
const byKeyCorpus = new Map(corpus.map(e => [e.key, e]));

// ------------------------------------------------- real runtime clip maps
// Loaded exactly the way the app loads them: vm-evaluate the shipped
// voice-clips-text-*.js / voice-clips-pack-*.js files and merge the chunks
// in file order, rejoining key~N split segments exactly like
// voice-clips.js does. Nothing here is hardcoded from the corpus.
function loadWindowVar(filePattern, varName) {
  const sandbox = {};
  sandbox.window = sandbox;
  const ctx = vm.createContext(sandbox);
  const files = fs.readdirSync(root)
    .filter(f => filePattern.test(f))
    .sort((a, b) => parseInt(a.match(/(\d+)\.js$/)[1], 10) - parseInt(b.match(/(\d+)\.js$/)[1], 10));
  assert.ok(files.length > 0, "no files match " + filePattern);
  for (const f of files) vm.runInContext(read(f), ctx, { filename: f });
  return { chunks: sandbox[varName] || [], files };
}
const textLoad = loadWindowVar(/^voice-clips-text-\d+\.js$/, "__matthewClipText");
const exactLoad = loadWindowVar(/^voice-clips-text-\d+\.js$/, "__matthewClipExact");
const BY_TEXT = Object.assign({}, ...textLoad.chunks);
const EXACT = Object.assign({}, ...exactLoad.chunks);
const packLoad = loadWindowVar(/^voice-clips-pack-\d+\.js$/, "__matthewClipData");
const BY_KEY_RAW = Object.assign({}, ...packLoad.chunks);
// voice-clips.js rejoin, verbatim: key~N segments concatenate in order.
const BY_KEY = Object.assign({}, BY_KEY_RAW);
for (const k of Object.keys(BY_KEY)) {
  const t = k.indexOf("~");
  if (t > 0) { const base = k.slice(0, t); BY_KEY[base] = (BY_KEY[base] || "") + BY_KEY[k]; delete BY_KEY[k]; }
}

// keyFor(), verbatim replica of voice-clips.js:
// EXACT[trimmed text] first (short vocalised texts), else BY_TEXT[norm(text)].
const DIGITS = { "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9" };
const norm = value => String(value || "").replace(/[٠-٩]/g, c => DIGITS[c]).replace(/[ً-ٰٟـ]/g, "").replace(/[^ء-يa-zA-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
const keyFor = text => EXACT[String(text || "").trim()] || BY_TEXT[norm(text)];

// ------------------------------------------------------------ opus audio
// Ogg/Opus duration from the last page's granule position (Opus is always
// 48 kHz). Validated against ffprobe on this tree (e.g. rd_intro_0:
// granule 1.494 s vs ffprobe 1.4945 s; let_full_0: 31.398 vs 31.3985).
function opusDuration(buf) {
  if (buf.length < 27 || buf.slice(0, 4).toString("latin1") !== "OggS") return NaN;
  let lastGranule = 0, pos = 0;
  while (pos + 27 <= buf.length) {
    if (buf.slice(pos, pos + 4).toString("latin1") !== "OggS") break;
    const nsegs = buf[pos + 26];
    const segTable = buf.subarray(pos + 27, pos + 27 + nsegs);
    let segLen = 0;
    for (const s of segTable) segLen += s;
    const granule = Number(buf.readBigInt64LE(pos + 6));
    if (granule > 0) lastGranule = granule;
    pos += 27 + nsegs + segLen;
  }
  return lastGranule / 48000;
}
// Letters only, for the pace rate (diacritics/tatweel/punctuation/spaces
// stripped so short and long texts are comparable).
const paceChars = text => String(text || "").replace(/[ً-ٰٟـ]/g, "").replace(/[^ء-يa-zA-Z0-9]/g, "").length;

// One chain check for a single clip key. `text` is the exact runtime string
// that must resolve to the key. Returns an array of failure messages
// (empty = the whole chain holds for this clip).
function checkChain(key, text, { checkTextLookup = true } = {}) {
  const failures = [];
  const entry = byKeyCorpus.get(key);
  if (entry && entry.text !== text) {
    failures.push(`${key}: CORPUS DRIFT — corpus text ${JSON.stringify(entry.text)} != runtime text ${JSON.stringify(text)} (the recorded clip no longer matches what the app says)`);
  }
  if (checkTextLookup) {
    const got = keyFor(text);
    if (got !== key) {
      const gotText = got && byKeyCorpus.get(got) ? JSON.stringify(byKeyCorpus.get(got).text) : "?";
      failures.push(`${key}: TEXT LOOKUP resolves ${JSON.stringify(text)} → ${got || "undefined (falls back to silent/robotic device TTS)"} instead of ${key}${got ? ` (that clip's text is ${gotText})` : ""}`);
    }
  }
  let opusBuf = null;
  try { opusBuf = readBuf("audio-src/opus/" + key + ".ogg"); }
  catch (_) { failures.push(`${key}: MISSING opus file audio-src/opus/${key}.ogg`); }
  if (opusBuf) {
    if (opusBuf.slice(0, 4).toString("latin1") !== "OggS") failures.push(`${key}: opus file is not Ogg (bad magic)`);
    const dur = opusDuration(opusBuf);
    if (!Number.isFinite(dur) || dur <= 0.3) failures.push(`${key}: opus duration ${Number.isFinite(dur) ? dur.toFixed(2) + "s" : "unreadable"} — too short/empty to say the letter`);
    else {
      const cps = paceChars(text) / dur;
      if (dur > 12 && cps < 5) failures.push(`${key}: STRETCHED audio — ${dur.toFixed(1)}s for ${paceChars(text)} letters (${cps.toFixed(1)} chars/sec); re-record, do not thin the text`);
    }
    if (!BY_KEY[key]) failures.push(`${key}: MISSING from voice packs ${packLoad.files.join(", ")} — playKey() fails at runtime and the app falls back to device TTS / a wrong clip`);
    else {
      const packBuf = Buffer.from(BY_KEY[key], "base64");
      if (!packBuf.equals(opusBuf)) failures.push(`${key}: PACK BYTES differ from audio-src/opus/${key}.ogg (${packBuf.length} vs ${opusBuf.length} bytes) — the shipped clip is stale, not the recorded one`);
    }
  }
  return failures;
}

function assertNoFailures(failures, label) {
  assert.deepEqual(failures, [], `${label} — ${failures.length} chain failure(s):\n` + failures.join("\n"));
}

// ------------------------------------------------------------------- tests
test("audio chain: rd_intro_* — reading intro for all 28 letters (note 15)", () => {
  const failures = [];
  for (let i = 0; i < 28; i++) {
    const key = "rd_intro_" + i;
    const text = runtimeText.rd_intro(i);
    assert.ok(byKeyCorpus.has(key), "missing corpus entry " + key);
    assert.ok(text.startsWith(LETTERS[i].name), key + " must name its own letter " + LETTERS[i].name);
    failures.push(...checkChain(key, text));
  }
  console.log(`rd_intro: ${28 - new Set(failures.map(f => f.split(":")[0])).size}/28 chains clean (${failures.length} failure(s))`);
  assertNoFailures(failures, "rd_intro_*");
});

test("audio chain: les_namesound_* — letter-school name+sound, all 28 letters", () => {
  const failures = [];
  for (let i = 0; i < 28; i++) {
    const key = "les_namesound_" + i;
    const text = runtimeText.les_namesound(i);
    assert.ok(byKeyCorpus.has(key), "missing corpus entry " + key);
    failures.push(...checkChain(key, text));
  }
  console.log(`les_namesound: ${28 - new Set(failures.map(f => f.split(":")[0])).size}/28 chains clean (${failures.length} failure(s))`);
  assertNoFailures(failures, "les_namesound_*");
});

test("audio chain: let_full_* — full letter explanation, all 28 letters (note 6/14)", () => {
  const failures = [];
  for (let i = 0; i < 28; i++) {
    const key = "let_full_" + i;
    const text = runtimeText.let_full(i);
    assert.ok(byKeyCorpus.has(key), "missing corpus entry " + key);
    assert.ok(text.length > 100, key + " explanation looks truncated (" + text.length + " chars)");
    assert.ok(text.includes(LESSONS[i].name), key + " must name its letter");
    failures.push(...checkChain(key, text));
  }
  console.log(`let_full: ${28 - new Set(failures.map(f => f.split(":")[0])).size}/28 chains clean (${failures.length} failure(s))`);
  assertNoFailures(failures, "let_full_*");
});

test("audio chain: rd_syl_* — 6 syllables × 28 letters, key path AND text path", () => {
  const keyFailures = [], textFailures = [];
  for (let i = 0; i < 28; i++) {
    for (let j = 0; j < 6; j++) {
      const key = `rd_syl_${i}_${j}`;
      const text = runtimeText.rd_syl(i, j);
      assert.ok(byKeyCorpus.has(key), "missing corpus entry " + key);
      // Key path (what reading.js/tracing actually play first via playKey):
      // pack presence + byte identity + opus sanity, no text lookup.
      keyFailures.push(...checkChain(key, text, { checkTextLookup: false }));
      // Text path (the fallback when playKey misses, and what
      // speakSequence uses for the on-open narration): must resolve to
      // this exact key, never to another letter's clip.
      const got = keyFor(text);
      if (got !== key) {
        const gotText = got && byKeyCorpus.get(got) ? JSON.stringify(byKeyCorpus.get(got).text) : "?";
        textFailures.push(`${key}: TEXT LOOKUP resolves ${JSON.stringify(text)} → ${got || "undefined"} instead of ${key}${got ? ` (that clip's text is ${gotText})` : ""}`);
      }
    }
  }
  console.log(`rd_syl key path: ${168 - new Set(keyFailures.map(f => f.split(":")[0])).size}/168 clean (${keyFailures.length} failure(s)); text path: ${168 - new Set(textFailures.map(f => f.split(":")[0])).size}/168 clean (${textFailures.length} failure(s))`);
  assertNoFailures([...keyFailures, ...textFailures], "rd_syl_*");
});

test("audio chain: tr_ar_* — tracing bare glyph, all 28 letters (note 1)", () => {
  // Tracing speaks by EXPLICIT KEY (tracing.js speakKey → playKey), never
  // by bare-text lookup — the text map cannot tell a bare glyph from a
  // damma syllable. So pack presence is the whole ball game here, and the
  // fallback is checked too: if playKey misses, speak(glyph) must still
  // resolve to this key, never to another letter's clip.
  const failures = [];
  for (let i = 0; i < 28; i++) {
    const key = "tr_ar_" + i;
    const glyph = runtimeText.tr_ar(i);
    assert.ok(byKeyCorpus.has(key), "missing corpus entry " + key);
    assert.equal(byKeyCorpus.get(key).text, glyph, key + " corpus text must be the tracing glyph");
    failures.push(...checkChain(key, glyph, { checkTextLookup: false }));
    const fallback = keyFor(glyph);
    if (fallback !== key) {
      const fbText = fallback && byKeyCorpus.get(fallback) ? byKeyCorpus.get(fallback).text : "?";
      failures.push(`${key}: FALLBACK speaks the wrong clip — playKey misses (not in pack) and keyFor(${JSON.stringify(glyph)}) → ${fallback || "undefined"} (that clip's text is ${JSON.stringify(fbText)}), so tracing does NOT say the bare glyph`);
    }
  }
  console.log(`tr_ar: ${28 - new Set(failures.map(f => f.split(":")[0])).size}/28 chains clean (${failures.length} failure(s))`);
  assertNoFailures(failures, "tr_ar_*");
});

test("audio chain: basic_ar_* — retired family (note 9): retirement is complete", () => {
  // Note 9 retired the basic-learning Arabic-letters card (subsumed by the
  // unified letter lesson), so basic_ar_* has no corpus entry and no live
  // reference — and the pack builder only packs corpus entries, so the 28
  // clips are no longer shipped in the packs either. The retirement is
  // complete: no corpus entry, no code reference, no pack entry. The opus
  // files stay on disk as the audio archive.
  assert.equal(corpus.filter(e => e.key.startsWith("basic_ar_")).length, 0, "basic_ar_* must have no corpus entry (retired by note 9)");
  assert.ok(!read("learning.js").includes("basic_ar"), "learning.js must not reference basic_ar_* (retired by note 9)");
  for (let i = 0; i < 28; i++) {
    const key = "basic_ar_" + i;
    assert.ok(!BY_KEY[key], key + " must not be in the voice packs (retired — the pack builder only packs corpus entries)");
  }
  assert.ok(!Object.values(BY_TEXT).some(k => k.startsWith("basic_ar_")), "no BY_TEXT entry may point at a basic_ar_* clip (retired)");
  const opusCount = fs.readdirSync(path.join(root, "audio-src/opus")).filter(f => f.startsWith("basic_ar_")).length;
  assert.equal(opusCount, 28, "the 28 basic_ar_* opus files stay on disk as the audio archive");
  console.log("basic_ar: retired family, 0 corpus / 0 pack / 28 opus on disk (archive)");
});

test("audio chain: family cardinalities — 28 letters, 168 syllables", () => {
  const count = (list, prefix) => list.filter(k => k.startsWith(prefix)).length;
  const corpusKeys = corpus.map(e => e.key);
  const opusKeys = fs.readdirSync(path.join(root, "audio-src/opus")).filter(f => f.endsWith(".ogg")).map(f => f.slice(0, -4));
  const packKeys = Object.keys(BY_KEY);
  for (const [fam, n] of [["rd_intro_", 28], ["les_namesound_", 28], ["let_full_", 28], ["tr_ar_", 28]]) {
    assert.equal(count(corpusKeys, fam), n, "corpus " + fam + " count");
    assert.equal(count(opusKeys, fam), n, "opus " + fam + " count");
  }
  assert.equal(count(corpusKeys, "rd_syl_"), 168, "corpus rd_syl_ count");
  assert.equal(count(opusKeys, "rd_syl_"), 168, "opus rd_syl_ count");
  assert.equal(count(corpusKeys, "basic_ar_"), 0, "corpus basic_ar_ count (retired)");
  assert.equal(count(opusKeys, "basic_ar_"), 28, "opus basic_ar_ count (orphaned files still on disk)");
  assert.equal(count(packKeys, "rd_syl_"), 168, "pack rd_syl_ count");
  // Pack counts for the other families are asserted by their own chain
  // tests above (a missing pack key fails there with the exact key).
});

test("STT verdicts: fail only on transcriptions that CONFIDENTLY name a different letter", () => {
  const sttPath = "/tmp/stt_results.json";
  if (!fs.existsSync(sttPath)) {
    console.warn("STT verdict SKIPPED: /tmp/stt_results.json not present — audio CONTENT was not verified by this run (chain checks above still ran).");
    return;
  }
  const stt = JSON.parse(fs.readFileSync(sttPath, "utf8"));
  const entries = Object.values(stt);
  assert.ok(entries.length > 0, "STT file is empty");
  const strip = s => String(s || "").replace(/[ً-ٰٟـ]/g, "").replace(/[^ء-ي ]/g, " ").replace(/\s+/g, " ").trim();
  const NAMES = LETTERS.map(l => l.name);
  const expectedIndex = key => {
    let m = key.match(/^(?:rd_intro|les_namesound)_(\d+)$/);
    if (m) return Number(m[1]);
    m = key.match(/^rd_syl_(\d+)_\d+$/);
    if (m) return Number(m[1]);
    return null;
  };
  const confident = [], ambiguous = [], stale = [];
  for (const e of entries) {
    const i = expectedIndex(e.key);
    if (i === null || i < 0 || i >= 28) { ambiguous.push(`${e.key}: cannot map key to a letter (transcription ${JSON.stringify(e.transcription)})`); continue; }
    const corpusEntry = byKeyCorpus.get(e.key);
    if (corpusEntry && e.corpus_text && e.corpus_text !== corpusEntry.text) stale.push(`${e.key}: STT file's corpus_text ${JSON.stringify(e.corpus_text)} != current corpus ${JSON.stringify(corpusEntry.text)} — STT data may be stale for this clip`);
    const tx = strip(e.transcription);
    if (!tx) { ambiguous.push(`${e.key} (expect ${NAMES[i]}): empty/unreadable transcription ${JSON.stringify(e.transcription)}`); continue; }
    const found = NAMES.filter(n => tx.includes(strip(n)));
    if (found.length > 0 && !found.includes(NAMES[i])) {
      confident.push(`${e.key}: CONFIDENT MISMATCH — expected letter ${NAMES[i]} (${LETTERS[i].base}), transcription says ${JSON.stringify(e.transcription)} (names a different letter: ${found.join(", ")})`);
    } else if (found.length === 0) {
      ambiguous.push(`${e.key} (expect ${NAMES[i]}): no letter name in transcription ${JSON.stringify(e.transcription)} — whisper noise on a short clip, NOT a verdict`);
    } else if (found.length > 1) {
      ambiguous.push(`${e.key} (expect ${NAMES[i]}): mixed names in transcription ${JSON.stringify(e.transcription)} — found ${found.join(", ")}, expected present but not alone`);
    }
    // found === [expected] alone: the transcription confirms the letter.
  }
  if (stale.length) console.warn("STT staleness warnings:\n" + stale.join("\n"));
  if (ambiguous.length) console.warn(`STT ambiguous (noise, not failures — ${ambiguous.length}/${entries.length}):\n` + ambiguous.join("\n"));
  const confirmed = entries.length - confident.length - ambiguous.length;
  console.log(`STT: ${entries.length} clips checked — ${confirmed} confirm the expected letter, ${ambiguous.length} ambiguous (noise), ${confident.length} confident mismatch(es)`);
  assert.deepEqual(confident, [], `STT found ${confident.length} clip(s) whose audio CONFIDENTLY says a different letter — re-record these with the full text, do not thin the text:\n` + confident.join("\n"));
});
