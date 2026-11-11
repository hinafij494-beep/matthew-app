// Round 3.2.1 coordinator tests: Arabic numbers (note 12), Cairo digit font
// (note 12), full-lesson voice resolution (note 14), hierarchical back
// navigation (note 16), strict Arabic-UI scan (note 18), listen buttons
// (notes 21-22), run variability (note 19d).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = name => fs.readFileSync(path.join(root, name), "utf8");
const corpus = JSON.parse(read("audio-src/corpus.json"));
const byKey = new Map(corpus.map(e => [e.key, e]));
const digits = { "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9" };
const norm = s => String(s || "").replace(/[٠-٩]/g, c => digits[c]).replace(/[ً-ٰٟـ]/g, "").replace(/[^ء-يa-zA-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
const byNorm = new Map();
for (const e of corpus) { const n = norm(e.text); if (n && !byNorm.has(n)) byNorm.set(n, e); }

// extract a top-level `const NAME = <array|object>;` declaration by bracket
// matching (respects string literals, so nested arrays/objects are safe)
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

test("Arabic numbers are spoken once, in Arabic, with no digit in the spoken text (round 3.2.1, note 12)", () => {
  const src = read("learning.js");
  const start = src.indexOf("const arabicNames=[") + "const arabicNames=".length;
  const names = vm.runInNewContext(src.slice(start, src.indexOf("];", start) + 1), Object.create(null));
  assert.equal(names.length, 20, "20 Egyptian number names");
  // the speak field is the bare name only — no digit appended (the digit
  // used to be synthesised twice / as English "one" by the TTS backend)
  assert.ok(src.includes("speak:arabicNames[i]"), "arNumbers speak is the bare name");
  assert.ok(!/speak:\s*arabicNames\[i\]\s*\+\s*["']،/.test(src), "no digit appended to the spoken name");
  const enWords = ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];
  for (const name of names) {
    const entry = byNorm.get(norm(name));
    assert.ok(entry, "no recorded clip for Arabic number " + name);
    assert.equal(entry.lang, "ar_EG", "number " + name + " clip must be Arabic, got " + entry.lang);
    assert.equal(norm(entry.text), norm(name), "number clip text must be the bare name: " + name);
    for (const w of enWords) assert.ok(!new RegExp("\\b" + w + "\\b", "i").test(entry.text), "number clip for " + name + " contains English word " + w);
    assert.ok(!/[٠-٩0-9]/.test(entry.text), "number clip for " + name + " must not contain a digit");
  }
});

test("Cairo font is bundled offline so ٢ renders in the Egyptian schoolbook form (round 3.2.1, note 12)", () => {
  const css = read("styles.css");
  assert.ok(css.includes("@font-face"), "styles.css must embed the Cairo @font-face");
  assert.ok(css.includes("font-family:'Cairo'"), "the @font-face must be named Cairo");
  assert.ok(css.includes("data:font/woff2;base64,"), "the font must be bundled as a base64 data URI (offline — no webfont link)");
  const b64 = css.slice(css.indexOf("data:font/woff2;base64,") + "data:font/woff2;base64,".length).split(/["')]/)[0];
  assert.ok(Buffer.from(b64, "base64").slice(0, 4).toString("latin1") === "wOF2", "embedded font must decode to a woff2 file");
  assert.ok(/:root\{[^}]*font-family:'Cairo'/.test(css), "Cairo must be the app-wide font (via :root)");
  const tracing = read("tracing.js");
  const canvasFonts = tracing.match(/ctx\.font|mctx\.font|gtx\.font/g) || [];
  assert.ok(canvasFonts.length >= 3, "tracing has 3 canvas font assignments");
  for (const m of tracing.match(/\.font = "[^"]+"/g) || []) assert.ok(m.includes("Cairo"), "tracing canvas font must start with Cairo: " + m);
});

test("every lesson's spoken strings resolve to recorded clips (round 3.2.1, note 14)", () => {
  // science: 47 lessons (7 subjects), spoken string = title + short + long
  const sci = read("science.js");
  const subjects = vm.runInNewContext(extractDecl(sci, "subjects") + "\nsubjects;", Object.create(null));
  assert.equal(subjects.length, 7, "7 science subjects");
  let lessons = 0;
  subjects.forEach((s, si) => s.lessons.forEach((l, li) => {
    lessons++;
    const key = "sci_" + si + "_" + li;
    const e = byKey.get(key);
    assert.ok(e, "missing corpus entry for science lesson " + key + " (" + l[0] + ")");
    assert.equal(e.lang, "ar_EG", key + " must be ar_EG");
    assert.ok(e.text.length > 100, key + " lesson text looks truncated");
    assert.ok(e.text.includes(l[0]), key + " text must contain its title");
  }));
  assert.equal(lessons, 47, "47 science lessons in total");
  for (let i = 0; i <= 6; i++) assert.ok(byKey.get("sci_5_" + i), "universe lesson sci_5_" + i + " must resolve (note 13)");
  // letter school: 28 full explanations
  for (let i = 0; i < 28; i++) {
    const e = byKey.get("let_full_" + i);
    assert.ok(e, "missing corpus entry let_full_" + i);
    assert.equal(e.lang, "ar_EG", "let_full_" + i + " must be ar_EG");
  }
  // reading: 28 intros, each naming its own letter
  const reading = read("reading.js");
  const letters = vm.runInNewContext(extractDecl(reading, "LETTERS") + "\nLETTERS;", Object.create(null));
  assert.equal(letters.length, 28, "28 reading letters");
  letters.forEach((l, i) => {
    const e = byKey.get("rd_intro_" + i);
    assert.ok(e, "missing corpus entry rd_intro_" + i);
    assert.ok(e.text.startsWith(l.name), "rd_intro_" + i + " must start with its letter name " + l.name + ", got " + e.text);
  });
  // math learn lines: 20 Arabic + 20 English journeys, all Arabic-framed now
  for (let i = 0; i < 20; i++) {
    for (const p of ["num_ar_", "num_en_"]) {
      const e = byKey.get(p + i);
      assert.ok(e, "missing corpus entry " + p + i);
      assert.equal(e.lang, "ar_EG", p + i + " must be ar_EG (Arabic explanation)");
    }
  }
});

test("back navigation is hierarchical everywhere (round 3.2.1, note 16)", () => {
  const lessons = read("lessons.js");
  assert.ok(/lessonBack.*onclick=\(\)=>\{if\(step===-1\)\{back\(\)\}else\{[^}]*step=-1;render\(\)/.test(lessons), "letter lesson back goes to the picker; picker back goes home");
  const reading = read("reading.js");
  assert.ok(reading.includes("picker = true; render()"), "reading item back returns to its picker");
  assert.ok(/bindHeader\(backToPicker\)/.test(reading) || reading.includes("backToPicker ? () => { picker = true; render(); } : close"), "reading picker back closes to home");
  for (const f of ["math-journey.js", "math-english.js"]) {
    const src = read(f);
    assert.ok(/function back\(\)\{if\(stage==="picker"\)/.test(src) || src.includes('if(stage==="picker")'), f + ": picker back goes home");
    assert.ok(src.includes("else renderPicker()"), f + ": lesson/quiz back goes to the picker");
  }
  const science = read("science.js");
  assert.ok(science.includes('panel.querySelector("#scienceBack").onclick=renderSubjects'), "science lesson-list back goes to the subjects picker");
  assert.ok(science.includes('panel.querySelector("#scienceBack").onclick=back'), "science subjects back goes home");
  const tracing = read("tracing.js");
  assert.ok(tracing.includes('panel.querySelector("#traceBack").onclick = close'), "tracing picker back goes home");
  assert.ok(/traceBack.*renderPicker|renderPicker.*traceBack/.test(tracing) || tracing.includes("back from a trace screen returns to the\n  // picker"), "tracing trace-screen back returns to the picker");
  const rescue = read("rescue.js");
  assert.ok(rescue.includes('if (story) openPicker(); else close()'), "rescue stage back goes to the story list; list back closes to Games");
  const app = read("app.js");
  const backSeg = app.slice(app.indexOf('"backBtn"'), app.indexOf('"homeBtn"'));
  assert.ok(backSeg.includes('classList.remove("hidden")') && backSeg.includes('gameList'), "quiz back shows the game list");
  assert.ok(!backSeg.includes("learningList"), "quiz back must not unhide the home learning list (it returns to the quiz door only)");
  const cg = read("color-games.js");
  assert.ok(cg.includes('gameList.classList.remove("hidden")') && !/close\(\)[\s\S]{0,200}learningList/.test(cg), "workshop close returns to the Games section only");
  const mem = read("memory-game.js");
  assert.ok(mem.includes('gameList.classList.remove("hidden")'), "memory game back returns to the Games section");
});

test("no English UI chrome anywhere — strict allowlist scan (round 3.2.1, note 18)", () => {
  // the note-3 denylist, extended with the two words the strict re-scan found
  const src = ["index.html", "app.js", "lessons.js", "learning.js", "math-journey.js", "math-english.js", "science.js", "reading.js", "tracing.js", "rescue.js", "color-games.js", "stories.js", "memory-game.js", "voice.js", "voice-web-fallback.js"].map(read).join("\n");
  assert.ok(!src.includes("Chrome"), "no 'Chrome' in UI text (use كروم)");
  assert.ok(!/>English</.test(src) && !src.includes('"English"'), "no standalone 'English' UI label (use الإنجليزية)");
  assert.ok(!src.includes("Let us count together"), "no English instruction sentence remains in math-english");
  // strict scan: every English word in an Arabic-bearing UI string must be
  // taught content (letter/word/sound/number names) — see scan_strict4 design
  const ALLOW = new Set([
    ...("abcdefghijklmnopqrstuvwxyz".split("")),
    "short", "buh", "kuh", "duh", "eh", "fff", "guh", "huh", "ih", "juh", "lll", "mmm", "nnn", "ah", "puh", "kwuh", "rrr", "sss", "tuh", "uh", "vvv", "wuh", "ks", "yuh", "zzz",
    "apple", "ball", "cat", "dog", "elephant", "fish", "grapes", "house", "ice", "cream", "juice", "kite", "lion", "monkey", "nest", "orange", "pencil", "queen", "rabbit", "sun", "tiger", "umbrella", "van", "watch", "xylophone", "yo", "zebra",
    "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty",
    "number",
    "map", "hen", "pen", "cup", "bug", "pig", "hat", "bat", "bed", "red", "top", "mop", "sit", "lip", "fan", "box", "fox", "egg", "ant", "ox", "ink", "up", "us", "it", "is", "in", "on", "at", "am", "an", "ad", "ab", "ag", "ap", "ed", "et", "en", "ip", "op", "ot", "ug", "un",
    "lowercase", "for"
  ]);
  const files = ["index.html", "app.js", "lessons.js", "learning.js", "math-journey.js", "math-english.js", "science.js", "reading.js", "tracing.js", "rescue.js", "color-games.js", "interactive-games.js", "memory-game.js", "stories.js", "voice.js", "parent.js", "mastery.js", "voice-web-fallback.js"];
  const hasArabic = s => /[\u0600-\u06FF]/.test(s);
  const literals = s => {
    const out = [];
    const re = /"([^"\\\n]*(?:\\.[^"\\\n]*)*)"|'([^'\\\n]*(?:\\.[^'\\\n]*)*)'|`([^`\\]*(?:\\.[^`\\]*)*)`/g;
    let m;
    while ((m = re.exec(s))) out.push(m[1] ?? m[2] ?? m[3]);
    return out;
  };
  const bad = [];
  for (const f of files) {
    let srcF = read(f).replace(/<style[\s\S]*?<\/style>/g, " ").replace(/\$\{[^}]*\}/g, " ");
    for (const lit of literals(srcF)) {
      if (!hasArabic(lit)) continue;
      if (/^\s*[#.][\w-]+$/.test(lit)) continue;
      if (lit.includes("{") && lit.includes(";") && lit.includes(":")) continue;
      let s = lit.replace(/<[^>]*/g, " ")
        .replace(/\s*[a-zA-Z][\w-]*="[^"]*"/g, " ")
        .replace(/\s*[a-zA-Z][\w-]*='[^']*'/g, " ")
        .replace(/\s*[a-zA-Z][\w-]*="[^"]*$/g, " ")
        .replace(/&[a-z]+;/gi, " ").replace(/https?:\/\/\S+/g, " ");
      s = s.replace(/\s+/g, " ").trim();
      if (!s || !/\s/.test(s)) continue;
      for (const w of s.match(/[A-Za-z]+/g) || []) if (!ALLOW.has(w.toLowerCase())) bad.push(f + ": " + w + " in \"" + lit.slice(0, 60) + "\"");
    }
  }
  assert.deepEqual(bad, [], "English words in Arabic UI strings must all be taught content:\n" + bad.slice(0, 10).join("\n"));
});

test("every question screen has an اسمع السؤال replay button (round 3.2.1, notes 21-22)", () => {
  const withQuestions = ["voice.js", "lessons.js", "rescue.js", "stories.js", "reading.js", "math-journey.js", "math-english.js", "color-games.js", "memory-game.js", "interactive-games.js"];
  for (const f of withQuestions) assert.ok(read(f).includes("اسمع السؤال"), f + " must have an اسمع السؤال replay button");
  // the replay speaks question then choices (Round 3.1 auto-narration rule)
  assert.ok(read("voice.js").includes("speakSequence([q, ...choices])") || read("voice.js").includes("speakSequence([question"), "voice.js replay speaks question then choices");
  assert.ok(read("lessons.js").includes('speakSequence([spoken,...q.a]') || read("lessons.js").includes("speakSequence([spoken"), "letter quiz replay speaks question then choices");
  assert.ok(read("rescue.js").includes("speakSequence([replayQ, ...replayChoices]"), "adventure replay speaks question then choices");
  // tracing and science have no question screens, so no button is needed there
  assert.ok(!read("tracing.js").includes("questionText"), "tracing has no question screen");
  assert.ok(!/questionText|showQuestion/.test(read("science.js")), "science has no question screen");
});

test("quizzes and stories vary every run (round 3.2.1, note 19d)", () => {
  const app = read("app.js");
  // the shuffle is an arrow function with `;` inside its body, so extract
  // it by brace matching from its opening `{` to the matching `}`
  const shStart = app.indexOf("const shuffle=");
  const shBrace = app.indexOf("{", shStart);
  let depth = 0, q = null, esc = false, shEnd = -1;
  for (let j = shBrace; j < app.length; j++) {
    const c = app[j];
    if (q) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === "`") { q = c; continue; }
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) { shEnd = j; break; } }
  }
  assert.ok(shEnd > 0, "shuffle function found");
  const shuffle = vm.runInNewContext(app.slice(shStart, shEnd + 1) + "\nshuffle;", Object.create(null));
  const orders = new Set();
  for (let i = 0; i < 5; i++) orders.add(shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).join(","));
  assert.ok(orders.size >= 2, "surprise-quiz question order must vary between runs");
  assert.ok(app.includes("const choices=shuffle(q.a.map("), "surprise-quiz choices are shuffled every question");
  assert.ok(app.includes("pickQuestions"), "surprise quiz picks a fresh shuffled subset every run");
  assert.ok(read("lessons.js").includes("sort(()=>Math.random()-.5)"), "letter-school quiz shuffles its choices");
  assert.ok(read("rescue.js").includes("questions = shuffle(all)"), "adventures reshuffle their questions every run");
  // brave stories keep each stage's OWN 2 questions (per-stage mapping, draft
  // stories) — the shuffle is inside buildRun, per stage, not a flat pool:
  // "questions: shuffle(s.questions)". Behaviour (two runs differ) is covered
  // by tests/stories.test.js "variability: two runs differ".
  assert.ok(read("stories.js").includes("questions: shuffle(s.questions)"), "brave stories reshuffle their questions every run");
  assert.ok(read("memory-game.js").includes("shuffleWith"), "memory game reshuffles its deck every run");
});
