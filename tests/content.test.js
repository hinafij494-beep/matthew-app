const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");

test("code modules ship inside the interactive-games bundle; voice packs load as separate files", () => {
  // Round 3.2.1 bundle restructure: the Android workflow copies
  // interactive-games.js into the APK, but the old bundle inlined ALL
  // voice packs (base64 audio) and hit 29,522,344 bytes — over GitHub's
  // 25 MB per-file web-UI limit, so it could not be uploaded. Voice data
  // now loads as separate <script> files (see below); only the code
  // modules are inlined. This test runs that same build and keeps the
  // inlined parts byte-identical to the sources.
  const { execFileSync } = require("node:child_process");
  const bundlePath = path.join(root, "interactive-games.js");
  const originalBundle = fs.readFileSync(bundlePath, "utf8");
  let bundle = originalBundle;
  try {
    execFileSync("python3", [path.join(root, "build_bundle.py")], { stdio: "pipe" });
    bundle = fs.readFileSync(bundlePath, "utf8");
  } finally {
    fs.writeFileSync(bundlePath, originalBundle);
  }
  const html = read("index.html");
  const sw = read("sw.js");
  // Code modules only — voice packs/text chunks must NOT be inlined.
  const partFiles = ["voice-clips.js", "mastery.js", "parent.js", "tracing.js", "reading.js", "rescue.js", "color-games.js", "stories.js", "memory-game.js", "chess.js"];
  for (const file of partFiles) {
    assert.ok(fs.existsSync(path.join(root, file)), "missing source " + file);
    const source = read(file).trim();
    assert.ok(bundle.includes(source), "bundle is out of sync with " + file + " — regenerate it from the sources");
    assert.ok(!html.includes('src="./' + file + '"'), "page should load " + file + " via the bundle only");
    assert.ok(!sw.includes("./" + file), "offline cache must not list " + file + " (not a separate request any more)");
  }
  // Voice packs: separate files, loaded in numeric order BEFORE the
  // bundle (defer scripts run in document order, and voice-clips.js —
  // the first inlined module — snapshots window.__matthewClipData /
  // __matthewClipText / __matthewClipExact when it runs, so the packs
  // must already have executed). Each pack only pushes one object into
  // the shared array, so no pack depends on another pack's order.
  const packFiles = Array.from({ length: 16 }, (_, i) => "voice-clips-pack-" + (i + 1) + ".js");
  const textFiles = fs.readdirSync(root).filter(f => /^voice-clips-text-\d+\.js$/.test(f)).sort();
  assert.deepEqual(textFiles, ["voice-clips-text-1.js"], "expected exactly one voice text chunk file");
  const loadOrder = [...packFiles, ...textFiles, "interactive-games.js"];
  let lastPos = -1;
  for (const file of loadOrder) {
    const tag = 'src="./' + file + '"';
    const pos = html.indexOf(tag);
    assert.ok(pos > lastPos, "page must load " + file + " after the previous voice file and before the bundle");
    lastPos = pos;
    assert.ok(sw.includes("./" + file), "offline cache must precache " + file + " (separate request now)");
    assert.ok(!bundle.includes("// ==== bundled module: " + file + " ===="), "bundle must not inline " + file + " any more");
  }
  assert.ok(html.includes("interactive-games.js"), "page does not load the bundle file");
  assert.ok(sw.includes("./interactive-games.js"), "offline cache missing the bundle file");
  assert.match(sw, /king-matthew-v23/);
  assert.ok(sw.includes("./voice.bundle.js"), "offline cache must precache voice.bundle.js (round 3.2)");
  // The whole point of the restructure: the bundle must fit GitHub's
  // 25 MB per-file web-UI limit, with headroom.
  assert.ok(Buffer.byteLength(bundle, "utf8") < 25 * 1024 * 1024,
    "bundle must stay under 25 MB for GitHub web upload, got " + Buffer.byteLength(bundle, "utf8") + " bytes");
});

test("science topics are kept but taught simply, like a game (owner correction)", () => {
  const science = read("science.js");
  for (const topic of ["المغناطيس", "يطفو", "يغوص", "السكر بيختفي", "التلج والمية"]) {
    assert.ok(science.includes(topic), "science lesson missing kept topic: " + topic);
  }
  // the dry textbook phrasing the owner rejected must be gone
  for (const dry of ["يجذب بعض الأشياء المصنوعة من الحديد", "يجذب بعض المعادن", "حالات المادة", "الاهتزاز", "الخياشيم"]) {
    assert.ok(!science.includes(dry), "dry phrasing still present: " + dry);
  }
  const bank = read("app.js");
  assert.ok(bank.includes("مشبك معدن"), "quiz bank missing the simple magnet question");
  assert.ok(bank.includes("هتطفو فوق المية"), "quiz bank missing the simple float question");
});

test("science lessons are many and richly explained", () => {
  const src = read("science.js");
  const lessons = [...src.matchAll(/\["([^"]+)","([^"]+)","([^"]+)","([^"]+)"\]/g)];
  assert.ok(lessons.length >= 40, "expected at least 40 science lessons, got " + lessons.length);
  for (const [, title, , , long] of lessons) {
    assert.ok(long.length >= 100, "lesson explanation too short: " + title);
  }
});

test("recorded teacher voice clips exist and the rescue game uses real clip keys", () => {
  const clips = JSON.parse(read("audio-src/clips.json"));
  const keys = Object.keys(clips);
  assert.ok(keys.length >= 40, "expected at least 40 recorded clips");
  const voiceClips = read("voice-clips.js");
  assert.match(voiceClips, /window\.MatthewClips/);
  const fsx = require("node:fs");
  const chunkText = fsx.readdirSync(__dirname + "/..").filter(f => /^voice-clips-pack-\d+\.js$/.test(f)).map(f => read(f)).join("\n");
  for (const key of keys) assert.ok(chunkText.includes('"' + key + '":'), "clip data chunks missing clip " + key);
  const rescue = read("rescue.js");
  const used = [...rescue.matchAll(/(?:clip:\s*|introClip:\s*|winClip:\s*|playKey\(|speak\([^)]*?,\s*)"((?:rescue|story)(?:Stage|Closer|Intro|Win|Ask|Animals|Trip|Treasure|Lion|Fox|Bear|Tiger)[A-Za-z0-9]*)"/g)].map(m => m[1])
    .concat([...rescue.matchAll(/"((?:rescue|story)[A-Za-z]*Closer\d)"/g)].map(m => m[1]));
  assert.ok(new Set(used).size >= 20, "rescue.js should reference its story/stage/closer/win clips, got " + [...new Set(used)].join(","));
  for (const key of new Set(used)) assert.ok(keys.includes(key), "rescue.js uses unknown clip key " + key);
  assert.match(read("voice.js"), /MatthewClips/);
});

test("story adventures and the mixed surprise quiz are both on the home screen", () => {
  const html = read("index.html");
  assert.ok(html.includes('data-stories="1"'), "home is missing the stories card");
  // Round 3.2.2 P2: the mixed quiz is reachable again (6th card) — it was
  // removed when stories took its slot, leaving start("mixed") with no
  // entry point; both cards share the home screen now.
  assert.ok(html.includes('data-category="mixed"'), "home is missing the mixed surprise quiz card");
  assert.match(html, /data-category="mixed"[^<]*<span class="game-icon">🎲<\/span><strong>اختبار المفاجآت<\/strong>/);
  const rescue = read("rescue.js");
  for (const title of ["مغامرة الإنقاذ", "تحدي حيوانات الغابة", "رحلة الغابة مع مارك", "كنز الملك"]) {
    assert.ok(rescue.includes(title), "missing story: " + title);
  }
  assert.ok(rescue.includes("مارك") && rescue.includes("مريم"), "stories must star Mark and Maryam");
  assert.ok(rescue.includes("STORIES"), "stories engine must be story-based");
  assert.match(rescue, /questions = shuffle\(all\)/, "story questions must be reshuffled every run");
});

test("recorded teacher voice covers the whole quiz bank and the corpus", () => {
  const corpus = JSON.parse(read("audio-src/corpus.json"));
  assert.ok(corpus.length >= 600, "corpus should cover the app, got " + corpus.length);
  const fsy = require("node:fs");
  const textChunks = fsy.readdirSync(__dirname + "/..").filter(f => /^voice-clips-text-\d+\.js$/.test(f)).sort();
  assert.ok(textChunks.length >= 1, "missing voice-clips-text chunk files");
  const byText = {};
  for (const f of textChunks) {
    const src = read(f);
    {
      const start = src.indexOf("push(") + 5;
      let depth = 0, end = -1, inStr = false, esc = false;
      for (let i = start; i < src.length; i++) {
        const ch = src[i];
        if (inStr) { if (esc) esc = false; else if (ch === "\\") esc = true; else if (ch === '"') inStr = false; continue; }
        if (ch === '"') inStr = true;
        else if (ch === '{') depth++;
        else if (ch === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
      }
      Object.assign(byText, JSON.parse(src.slice(start, end)));
    }
  }
  const digits = { "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9" };
  const norm = s => String(s || "").replace(/[٠-٩]/g, c => digits[c]).replace(/[ً-ٰٟـ]/g, "").replace(/[^ء-يa-zA-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
  const src = read("app.js");
  const bank = vm.runInNewContext("(" + src.slice(src.indexOf("const bank=") + 11, src.indexOf("\nconst names=")).replace(/;\s*$/, "") + ")", Object.create(null));
  let checked = 0;
  for (const qs of Object.values(bank)) for (const q of qs) {
    assert.ok(byText[norm(q.q)], "no teacher clip for question: " + q.q);
    for (const a of q.a) assert.ok(byText[norm(a)], "no teacher clip for answer: " + a);
    checked++;
  }
  assert.ok(checked >= 85, "expected to check the whole bank, got " + checked);
  assert.ok(byText[norm("الإجابة الصحيحة هي")], "missing the correct-answer prefix clip");
});

test("every quiz answer has a picture (Matthew cannot read yet)", () => {
  const src = read("app.js");
  const m = src.match(/window\.AnswerPics=(\{.*?\});/s);
  assert.ok(m, "app.js is missing the AnswerPics map");
  const pics = JSON.parse(m[1]);
  const bank = vm.runInNewContext("(" + src.slice(src.indexOf("const bank=") + 11, src.indexOf("\nconst names=")).replace(/;\s*$/, "") + ")", Object.create(null));
  let checked = 0;
  for (const qs of Object.values(bank)) for (const q of qs) for (const a of q.a) {
    assert.ok(pics[a], "answer has no picture: " + a);
    checked++;
  }
  assert.ok(checked >= 350, "expected to check all bank answers, got " + checked);
  assert.ok(read("rescue.js").includes("answer-picture"), "story answers must show pictures too");
});

test("stories open in a clean full-screen focus with an animated scene", () => {
  const rescue = read("rescue.js");
  assert.ok(rescue.includes("focusMode"), "stories must hide the home clutter while open");
  assert.ok(rescue.includes("scene-ground") && rescue.includes("rescueBob"), "adventure scene must be illustrated and animated");
});

test("quizzes pronounce answers and speech never overlaps", () => {
  const html = read("index.html");
  assert.ok(!html.includes('id="listenAllBtn"'), "no tap-to-listen button: narration must be automatic (owner, round 3.1)");
  const app = read("app.js");
  // Round 3.2.1 (Nancy, note 25b): the Miss Nancy quiz intro is prepended
  // before the question on the FIRST question only — the question + choices
  // still follow it in order inside the same speakSequence call.
  assert.match(app, /speakSequence\(\[.*q\.q,\.\.\.lastChoices\]/, "main quiz must auto-narrate question + choices in order");
  assert.ok(!app.includes("answer-say"), "answers must not carry their own speaker buttons (owner, round 3.1)");
  const rescue = read("rescue.js");
  assert.ok(rescue.includes("speakSequence([current.q, ...lastChoices]"), "stories must auto-narrate question + choices too");
  assert.ok(!rescue.includes("answer-say") && !rescue.includes("rescueListen"), "stories must not carry listen buttons (owner, round 3.1)");
  const voice = read("voice.js");
  assert.ok(voice.includes("speakSequence"), "MatthewVoice must expose speakSequence");
  assert.match(voice, /if \(id === requestId[^}]*playKey\(key\)/, "delayed praise must yield to newer speech (no overlap)");
  assert.match(voice, /const speak = async[\s\S]{0,700}MatthewClips\?\.stop\(\)/, "speak() must stop a playing clip before TTS so voices never overlap");
  const vc = read("voice-clips.js");
  assert.ok(vc.includes("playSequence"), "recorded clips must support chained playback");
});

test("arabic letter lessons explain from zero with mouth hints", () => {
  const lessons = read("lessons.js");
  assert.match(lessons, /explainFor/);
  assert.match(lessons, /الميس بتشرح/);
  assert.match(lessons, /HINTS/);
});

// The Muse GitHub App cannot modify workflow files (GitHub reserves the
// "workflows" permission), so on the upgrade branch this check is skipped.
// The local copy of .github/workflows/android-apk.yml already lists the new
// modules in its trigger paths, www asset copy and esbuild validation; it
// must be applied by the repository owner — see UPGRADE_NOTES.md.
test("new modules are included in the Android APK build", { skip: "workflow file must be updated by the repo owner (workflows permission) — see UPGRADE_NOTES.md" }, () => {
  const workflow = read(".github/workflows/android-apk.yml");
  for (const file of ["mastery.js", "parent.js", "tracing.js", "reading.js"]) {
    assert.ok(workflow.includes(file), "APK workflow missing " + file);
  }
});

test("mastery ladder needs two correct in a row and punishes nothing", () => {
  const store = new Map();
  const context = {
    console,
    module: { exports: {} },
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k)
    }
  };
  context.window = context;
  vm.runInNewContext(read("mastery.js"), context);
  const mastery = context.module.exports;
  const day = 24 * 60 * 60 * 1000;
  const t0 = 1_000_000_000;

  let entry = mastery.record("letters:test", true, t0);
  assert.equal(entry.level, 0, "one correct answer must not level up");
  entry = mastery.record("letters:test", true, t0);
  assert.equal(entry.level, 1);
  assert.equal(entry.nextReviewAt, t0 + 1 * day);

  entry = mastery.record("letters:test", false, t0);
  assert.equal(entry.level, 0, "a mistake drops exactly one rung");
  assert.equal(entry.wrong, 1);
  assert.equal(mastery.accuracy(entry), 2 / 3);

  // Climb to mastery: levels 1..3 with clean streaks.
  for (let i = 0; i < 6; i++) mastery.record("letters:test", true, t0);
  entry = mastery.get("letters:test");
  assert.ok(mastery.isMastered(entry), "expected mastered at level >= 3 with accuracy >= 75%");
  assert.equal(mastery.dueSkills(t0).some(s => s.skillId === "letters:test"), false);
});

test("parent dashboard panel uses the shared parentPanel id and a gate", () => {
  const parent = read("parent.js");
  assert.match(parent, /parentPanel/);
  assert.match(parent, /لوحة ولي الأمر/);
  assert.match(parent, /MatthewMastery/);
});

test("tracing covers Arabic letters, English letters and both number sets", () => {
  const tracing = read("tracing.js");
  assert.match(tracing, /اكتب بإصبعك/);
  assert.match(tracing, /pointerdown/);
  assert.match(tracing, /pointermove/);
  for (const setId of ["arLetters", "enLetters", "arNumbers", "enNumbers"]) {
    assert.ok(tracing.includes(setId), "missing tracing set " + setId);
  }
});

test("reading module teaches syllables, blending and CVC words", () => {
  const reading = read("reading.js");
  assert.match(reading, /يلا نقرأ/);
  assert.match(reading, /syllablesFor/);
  assert.match(reading, /بَاب/);
  assert.match(reading, /CVC_WORDS/);
  for (const word of ["cat", "dog", "sun", "fish"]) {
    assert.ok(reading.includes('"' + word + '"') || reading.includes(word), "missing CVC word " + word);
  }
});

test("unified letter lessons do not reuse one emoji for two words (round 3.2.1)", () => {
  // Note 9 moved the Arabic-letter word examples from learning.js into
  // the unified lesson (lessons.js); the rule now applies per lesson:
  // the three word examples on one screen must have distinct pictures.
  const lessons = read("lessons.js");
  const m = lessons.match(/const lessons = (\[.*?\]);/s);
  assert.ok(m, "lessons array not found");
  const arr = vm.runInNewContext("(" + m[1] + ")", Object.create(null));
  assert.strictEqual(arr.length, 28, "expected 28 lessons");
  for (const l of arr) {
    assert.strictEqual(l.words.length, 3, "letter " + l.letter + " must have 3 example words");
    assert.strictEqual(new Set(l.emoji).size, 3, "letter " + l.letter + " reuses an emoji for two of its words");
  }
});

test("quiz answer handlers record mastery in every learning flow", () => {
  assert.match(read("app.js"), /MatthewMastery\?\.record/);
  assert.match(read("lessons.js"), /MatthewMastery\?\.record/);
  assert.match(read("math-journey.js"), /MatthewMastery\?\.record/);
  assert.match(read("math-english.js"), /MatthewMastery\?\.record/);
  assert.match(read("interactive-games.js"), /MatthewMastery\?\.record/);
  assert.match(read("reading.js"), /MatthewMastery\?\.record/);
  assert.match(read("tracing.js"), /MatthewMastery\?\.record/);
});

test("question pictures never reveal the answer (round 3.1)", () => {
  const src = read("app.js");
  const m = src.match(/window\.AnswerPics=(\{.*?\});/s);
  const pics = JSON.parse(m[1]);
  const bank = vm.runInNewContext("(" + src.slice(src.indexOf("const bank=") + 11, src.indexOf("\nconst names=")).replace(/;\s*$/, "") + ")", Object.create(null));
  for (const qs of Object.values(bank)) for (const q of qs) {
    const correct = q.a[q.c];
    // Round 3.2.2 §8 P1-6 (review §7): letter-bank questions show the question
    // word's picture for a child who cannot read (e.g. تفاحة 🍎). A single-letter
    // answer's AnswerPics entry is the letter's mnemonic word-picture (ت→🍎),
    // not a depiction of the glyph, so it cannot reveal which letter is first.
    // The questionEmojiSafe guard encodes the same rule; skip those here.
    if (String(correct).length === 1) continue;
    const correctPic = pics[correct];
    assert.notStrictEqual(q.e, correctPic, "question picture reveals its answer: " + q.q);
  }
  const hear = Object.values(bank).flat().find(q => q.q.startsWith("بماذا نسمع"));
  assert.strictEqual(hear.e, "🎵", "the hearing question must not show an ear");
});

test("letter-school quiz shuffles its answers (round 3.1)", () => {
  const lessons = read("lessons.js");
  assert.ok(lessons.includes("_shuffled"), "letter quiz must shuffle answers so the correct one is not always first");
  assert.match(lessons, /q\.c=order\.findIndex/, "the correct index must be remapped after shuffling");
});

test("tracing confines colour inside the letter and offers a colour palette (round 3.1)", () => {
  const tracing = read("tracing.js");
  assert.ok(tracing.includes("destination-in"), "finished strokes must be clipped to the glyph mask");
  assert.ok(tracing.includes("traceGuide"), "guide and strokes must be separate stacked canvases");
  assert.ok(tracing.includes("trace-color"), "a colour palette must be rendered");
  const colors = tracing.match(/#[0-9a-f]{6}/gi) || [];
  assert.ok(new Set(colors.map(c => c.toLowerCase())).size >= 6, "palette must offer at least six colours");
});

test("home is four big doors and the hero is an intro only (round 3.1)", () => {
  const app = read("app.js");
  for (const label of ["الدروس", "الأسئلة والاختبارات", "الألعاب", "الألوان والتلوين"])
    assert.ok(app.includes(label), "missing home door: " + label);
  assert.ok(app.includes("homeDoors"), "home doors navigation is missing");
  assert.match(app, /hero\.style\.display = \(!open && !current\)/, "hero must show only on the doors home, never inside a section");
  const css = read("styles.css");
  assert.match(css, /\.door-learn\{/, "doors need their own bright styles");
  assert.match(css, /\.back\{[^}]*padding:14px 24px/, "the back button must be big and clear");
});

// ---------------- Round 3.2 ----------------

test("science swaps the two removed lessons for lightning and soap bubbles (round 3.2)", () => {
  const src = read("science.js");
  for (const title of ["البرق والرعد", "فقاعات الصابون"]) {
    assert.ok(src.includes('["' + title + '"'), "missing new science lesson: " + title);
  }
  for (const title of ["قوس قزح", "اللعب بالعجينة"]) {
    assert.ok(!src.includes('["' + title + '"'), "removed science lesson still present: " + title);
  }
  assert.ok(src.includes("الفيل أكبر حيوان على اليابسة"), "mammals lesson must say the elephant is the biggest LAND animal");
  const lessons = [...src.matchAll(/\["([^"]+)","([^"]+)","([^"]+)","([^"]+)"\]/g)];
  assert.equal(lessons.length, 48, "expected 48 science lessons after adding أيام الأسبوع, got " + lessons.length);
});

test("question bank has no duplicates and covers the new science lessons (round 3.2)", () => {
  const src = read("app.js");
  const bank = vm.runInNewContext("(" + src.slice(src.indexOf("const bank=") + 11, src.indexOf("\nconst names=")).replace(/;\s*$/, "") + ")", Object.create(null));
  const seen = new Map();
  let total = 0;
  for (const [cat, qs] of Object.entries(bank)) for (const q of qs) {
    total++;
    assert.ok(!seen.has(q.q), "duplicate question in " + cat + " (also in " + seen.get(q.q) + "): " + q.q);
    seen.set(q.q, cat);
    assert.ok(q.a.length === 4 && q.c >= 0 && q.c < 4, "bad answers for: " + q.q);
  }
  assert.equal(total, 90, "expected 90 bank questions after cleanup, got " + total);
  const all = Object.values(bank).flat();
  assert.ok(all.some(q => q.q.includes("برق") && q.a[q.c].includes("رعد")), "missing the new lightning question");
  assert.ok(all.some(q => q.q.includes("فقاعات")), "missing the new soap-bubble question");
  assert.equal(all.filter(q => q.q.includes("قوس قزح")).length, 0, "Round 3.2.2 P0-7: no rainbow question anywhere in the bank");
  assert.ok(all.some(q => q.q.includes("الشمس بتطلع منين الصبح؟")), "missing the sunrise question that replaces the rainbow question");
  for (const q of all.filter(q => q.q.startsWith("ما ناتج"))) {
    assert.ok(!/[0-9٠-٩+−]/.test(q.q), "operation question must be fully spoken, no digits or symbols: " + q.q);
  }
});

test("reading teaches all 28 Arabic letters (round 3.2)", () => {
  const src = read("reading.js");
  const start = src.indexOf("const LETTERS = [");
  const end = src.indexOf("];", start) + 1;
  const letters = vm.runInNewContext("(" + src.slice(start + "const LETTERS = ".length, end).replace(/;\s*$/, "") + ")", Object.create(null));
  assert.equal(letters.length, 28, "expected 28 reading letters, got " + letters.length);
  assert.ok(letters.some(l => l.base === "ج"), "reading must include ج");
  assert.ok(letters.some(l => l.base === "ق"), "reading must include ق");
  assert.equal(new Set(letters.map(l => l.base)).size, 28, "reading letters must be unique");
});

test("colouring-games workshop is registered inside the Games door (round 3.2)", () => {
  const cg = read("color-games.js");
  for (const name of ["ورشة ألعاب وتلوين الملك ماثيو", "لوني العدد", "سحب لون الطبيعة", "أكمل تلوين النمط"]) {
    assert.ok(cg.includes(name), "workshop missing game: " + name);
  }
  assert.ok(cg.includes('setAttribute("data-workshop", "1")'), "workshop card must carry data-workshop");
  assert.ok(cg.includes("NUM_WINDOWS"), "numbers game must cover 1–20 in windows");
  assert.ok(cg.includes("NATURE") && cg.includes("PATTERN_TYPES"), "workshop must have nature and pattern games");
  assert.ok(!cg.includes("غلط"), "workshop must never use negative language");
  assert.ok(cg.includes("حاول تاني يا بطل"), "wrong answers must only get the gentle retry line");
  const app = read("app.js");
  assert.ok(app.includes("dataset.workshop"), "workshop card must classify into the Games door");
});

test("display panels stay fixed while the grid scrolls (round 3.2)", () => {
  const css = read("styles.css");
  assert.match(css, /\.sticky-panel\{position:sticky;top:0;z-index:5/, "sticky panel style missing");
  assert.ok(read("learning.js").includes("basic-focus sticky-panel"), "basic learning panel must be sticky");
  assert.ok(read("lessons.js").includes("big-letter sticky-panel"), "letter school panel must be sticky");
  assert.ok(read("reading.js").includes("position:sticky"), "reading panels must be sticky");
});

test("tracing is easy for a 5-year-old: chunky brush, gap-free strokes, low goal (round 3.2)", () => {
  const tracing = read("tracing.js");
  assert.match(tracing, /ctx\.lineWidth = 26/, "brush must be chunky (26px)");
  assert.match(tracing, /const GOAL = 0\.40/, "completion goal must be easy (40%)");
  assert.match(tracing, /Math\.ceil\(dist \/ 2\)/, "strokes must be interpolated in 2px steps");
  assert.ok(tracing.includes("destination-in"), "strokes must still be confined inside the outline");
  assert.ok(tracing.includes("trace-color"), "the 6-colour palette must stay");
});

test("games move: CSS keyframe animations and lively feedback (round 3.2)", () => {
  const css = read("styles.css");
  for (const kf of ["matthewBob", "matthewPopIn", "matthewCelebrate", "matthewSparkle", "matthewKingRide"]) {
    assert.ok(css.includes("@keyframes " + kf), "missing animation: " + kf);
  }
  assert.match(css, /@media \(prefers-reduced-motion/, "reduced-motion users must be respected");
});

test("royal crown rewards persist and praise only (round 3.2)", () => {
  const mastery = read("mastery.js");
  assert.ok(mastery.includes("matthewCrownV1"), "crown must persist in localStorage");
  assert.match(mastery, /awardCrown/, "crown must be awardable");
  assert.match(mastery, /awardCrown\(1,/, "correct answers must earn a star");
  assert.ok(read("color-games.js").includes("royalCrownShelf"), "the crown must be visible on the home hero");
});

test("letter names, sounds and syllables are recorded in Fusha (round 3.2)", () => {
  const bc = read("build-corpus.js");
  // Round 3.2.1 (phonetics expert): rd_intro_* and lsq_name_* are letter
  // names/sounds too — they were ar_EG, so ج was taught as [g] on the first
  // reading screen. The force regex was extended to cover them as well.
  assert.match(bc, /\/\^\(les_namesound\|rd_syl\|tr_ar\|rd_intro\|lsq_name\)_\//, "build-corpus must force ar_SA for letter/syllable keys");
  const corpus = JSON.parse(read("audio-src/corpus.json"));
  const sa = corpus.filter(e => e.lang === "ar_SA");
  assert.ok(sa.length >= 200, "expected 200+ Fusha clips, got " + sa.length);
  for (const prefix of ["les_namesound_", "rd_syl_", "tr_ar_", "rd_intro_", "lsq_name_"]) {
    assert.ok(sa.some(e => e.key.startsWith(prefix)), "missing Fusha clips for " + prefix);
  }
  const syl = corpus.filter(e => e.key.startsWith("rd_syl_"));
  assert.ok(syl.length >= 168, "expected 168 syllable clips (28 letters x 6), got " + syl.length);
});

test("voice-clip object-URL cache is capped (round 3.2)", () => {
  const vc = read("voice-clips.js");
  assert.match(vc, /URL_CACHE_MAX = 30/, "URL cache must be capped at 30");
  assert.ok(vc.includes("URL.revokeObjectURL"), "evicted clip URLs must be revoked");
  const template = read("build-voice-clips.py");
  assert.ok(template.includes("URL_CACHE_MAX = 30"), "the pack template must carry the same cap");
});

test("workshop spoken lines are in the voice corpus (round 3.2)", () => {
  const corpus = JSON.parse(read("audio-src/corpus.json"));
  const cg = corpus.filter(e => e.key.startsWith("cg_"));
  assert.ok(cg.length >= 150, "expected 150+ workshop clips in the corpus, got " + cg.length);
  for (const key of ["cg_instr_numbers", "cg_instr_nature", "cg_instr_patterns", "mem_try_1", "cg_num_intro_0", "cg_nat_q_0", "cg_pat_intro_1"]) {
    assert.ok(cg.some(e => e.key === key) || corpus.some(e => e.key === key), "corpus missing workshop clip " + key);
  }
  // "حاول تاني يا بطل" is the workshop try-again line too, but build-corpus
  // dedupes by text — the memory game's mem_try_1 (added first, §7) owns
  // that text now, so the old cg_try key is gone while the spoken line
  // (color-games speaks it by text) still resolves to a recorded clip.
  assert.ok(corpus.some(e => e.text === "حاول تاني يا بطل"), "workshop try-again line must have a recorded clip");
});

test("every tracing glyph speaks a recorded bare-glyph clip (round 3.2.1)", () => {
  // Round 3.2.1 (revised by the reading/tracing implementation): tracing
  // speaks each glyph by an EXPLICIT recorded clip key (SETS[].key(i)),
  // never by bare-text lookup — the text map structurally cannot tell en
  // "1" from ar "١" (same norm "1"), and bare Arabic glyphs collide with
  // damma syllables there (خَ/خِ/خُ all normalise to "خ", damma wins).
  // Pre-fix this was broken three ways: 11 English letters + "١٠" had no
  // clip at all (silent on the tablet), 12 Arabic letters resolved to a
  // damma syllable clip, and 16 resolved to Egyptian-dialect quiz-answer
  // clips (ج as "g"). The explicit key's clip must therefore be a BARE
  // glyph clip in the right language.
  const bare = s => String(s || "").replace(/[ـ]/g, "").toLowerCase();
  const parsePushes = src => {
    const out = [];
    let from = 0;
    for (;;) {
      const start = src.indexOf("push(", from);
      if (start < 0) break;
      let i = start + 5, depth = 0, inStr = false, esc = false, end = -1;
      for (; i < src.length; i++) {
        const ch = src[i];
        if (inStr) { if (esc) esc = false; else if (ch === "\\") esc = true; else if (ch === '"') inStr = false; continue; }
        if (ch === '"') inStr = true;
        else if (ch === "{") depth++;
        else if (ch === "}") { depth--; if (depth === 0) { end = i + 1; break; } }
      }
      assert.ok(end > 0, "unbalanced push JSON in voice pack");
      out.push({ kind: src.slice(Math.max(0, start - 40), start), obj: JSON.parse(src.slice(start + 5, end)) });
      from = end;
    }
    return out;
  };
  const byKey = new Set();
  for (const f of fs.readdirSync(root).filter(f => /^voice-clips-(pack|text)-\d+\.js$/.test(f)).sort()) {
    for (const { kind, obj } of parsePushes(read(f))) {
      if (kind.includes("__matthewClipData")) for (const k of Object.keys(obj)) byKey.add(k.split("~")[0]);
    }
  }
  const tsrc = read("tracing.js");
  // evaluate the SETS literal (object with items + key arrow functions)
  const setsStart = tsrc.indexOf("const SETS = {") + "const SETS = ".length;
  const setsSrc = tsrc.slice(setsStart, tsrc.indexOf("};", setsStart) + 1);
  const sets = vm.runInNewContext("(" + setsSrc + ")", Object.create(null));
  for (const id of ["arLetters", "enLetters", "arNumbers", "enNumbers"])
    assert.ok(typeof sets[id].key === "function", "tracing set " + id + " must map glyphs to explicit clip keys");
  assert.ok(tsrc.includes("speakKey("), "tracing must speak glyphs via the playKey-first speakKey helper");
  const corpus = JSON.parse(read("audio-src/corpus.json"));
  const byKeyEntry = new Map(corpus.map(e => [e.key, e]));
  const wantLang = { arLetters: "ar_SA", enLetters: "en_US", arNumbers: "ar_EG", enNumbers: "en_US" };
  let checked = 0;
  for (const [setId, set] of Object.entries(sets)) {
    set.items.forEach((glyph, i) => {
      const key = set.key(i);
      assert.ok(key, "no explicit clip key for tracing glyph " + glyph + " (" + setId + ")");
      const base = String(key).split("~")[0];
      assert.ok(byKey.has(base), "clip " + key + " for glyph " + glyph + " is not in the voice packs");
      const entry = byKeyEntry.get(base);
      assert.ok(entry, "clip " + key + " is missing from the corpus");
      assert.strictEqual(bare(entry.text), bare(glyph),
        "glyph " + glyph + " resolves to a non-bare clip (" + entry.key + ": " + entry.text + ")");
      assert.strictEqual(entry.lang, wantLang[setId],
        "glyph " + glyph + " clip " + entry.key + " is " + entry.lang + ", want " + wantLang[setId]);
      checked++;
    });
  }
  assert.ok(checked >= 74, "expected to check all tracing glyphs, got " + checked);
});

// ---------------- Round 3.2.1 ----------------

test("math in English and the English alphabet explain in Arabic (round 3.2.1)", () => {
  const me = read("math-english.js");
  // taught content stays English: number names and digits
  assert.ok(me.includes('["one","two","three"'), "English number names must stay");
  for (const s of ["عدّ الصور، فيه كام واحدة؟", "إيه الرقم اللي بعد", "إيه الرقم الأكبر", "فهمت! يلا نتدرب ⭐", "اسمع السؤال", "رجوع →", "الرياضيات بالإنجليزي", "برافو يا بطل! إجابة صح ⭐", "ولا يهمك، نتعلم سوا"])
    assert.ok(me.includes(s), "missing Arabic string in math-english.js: " + s);
  for (const s of ["Count the pictures", "What number comes after", "What number comes before", "Which number is bigger", "You have", "Listen to the question", "I understand! Start practice", "Great job!", "Amazing work!", "Try again", "See your result", "You finished Math", "Next level", "Continue to next lesson", "King Matthew Math", "Math in English"])
    assert.ok(!me.includes(s), "English instruction remains in math-english.js: " + s);
  assert.match(me, /speak\(t,"en-US"\)/, "math-english say() must speak in en-US (numbers-once F2-lang: English numbers under ar-EG resolve to Arabic clips)");
  assert.ok(!me.includes("SpeechSynthesisUtterance") && !me.includes("speechSynthesis.speak"), "math-english must not fall back to device TTS (round 3.2.2 P0-4: clips only)");
  const learning = read("learning.js");
  assert.ok(learning.includes("arabicMeanings"), "enLetters needs the Arabic meanings array");
  assert.ok(learning.includes("شكله الصغير"), "enLetters spoken line must use Arabic framing");
  assert.ok(learning.includes("زي كلمة"), "enLetters spoken line must frame the English word in Arabic");
  assert.ok(learning.includes("يعني"), "enLetters spoken line must give the Arabic meaning");
  assert.ok(!learning.includes(", lowercase "), "enLetters spoken line must not be all-English");
  for (const s of ["الحروف الإنجليزية", "الأرقام الإنجليزية", "الشكل الصغير:", "الصوت:", "اتعلم واسمع"])
    assert.ok(learning.includes(s), "missing Arabic label in learning.js: " + s);
  for (const s of ["English Alphabet", "English Numbers", "Learn to count in English", "Learn and listen", "Lowercase:", "Sound:"])
    assert.ok(!learning.includes(s), "English UI remains in learning.js: " + s);
  const reading = read("reading.js");
  for (const s of ["كلمات إنجليزية", "اضغط على كل صوت، وبعدين ادمجهم مع بعض", "تحدي القراءة", "اسمع واختار الكلمة", "قراءة جميلة! ⭐", "الكلمة دي "])
    assert.ok(reading.includes(s), "missing Arabic string in reading.js: " + s);
  for (const s of ["English CVC", "Tap each sound", "Reading Challenge", "Listen and choose the word", "Great reading!", "That word is"])
    assert.ok(!reading.includes(s), "English instruction remains in reading.js: " + s);
});

test("no English button, menu or instruction label remains (round 3.2.1)", () => {
  // String literals only: element ids like englishMathListen contain
  // "Listen" but are never shown, so they must not trip the scan. Single
  // words match on word boundaries; phrases match as substrings. Bare
  // "English" is intentionally NOT denied: voice.js has an العربية /
  // English language-name switch, which is a label, not an instruction.
  const DENY_PHRASES = ["Learn and listen", "Back to start", "Lowercase:", "Sound:", "New word", "Try again", "I understand", "Start practice", "Count the pictures", "Count each picture", "What number", "Which number", "You have", "Great job", "Amazing work", "Good try", "See your result", "You finished", "Tap each sound", "Listen and choose", "That word is", "Great reading", "Review the lesson", "Listen to the question", "English Alphabet", "English Numbers", "English CVC", "Math in English", "Reading Challenge", "King Matthew Math", "Learn to count", "Learn numbers", "Continue to next", "Next level", "Next question", "This is number", "You got", "is the bigger number", "comes after", "comes before", "How many are", "How many now", "are left", "apples and get", "disappear"];
  const DENY_WORDS = ["Listen", "Previous", "Next", "Challenge"];
  const FILES = ["index.html", "app.js", "lessons.js", "learning.js", "math-journey.js", "math-english.js", "science.js", "reading.js", "tracing.js", "rescue.js", "color-games.js", "parent.js", "mastery.js", "voice.js", "voice-web-fallback.js", "sw.js"];
  const extractLiterals = src => {
    const lits = [];
    const re = /'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g;
    let m;
    while ((m = re.exec(src))) lits.push(m[0].slice(1, -1));
    return lits;
  };
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  for (const f of FILES) {
    for (const lit of extractLiterals(read(f))) {
      for (const p of DENY_PHRASES)
        assert.ok(!lit.includes(p), "English UI remains in " + f + ": " + JSON.stringify(p) + " in " + JSON.stringify(lit.slice(0, 80)));
      for (const w of DENY_WORDS)
        assert.ok(!new RegExp("(^|[^A-Za-z])" + esc(w) + "([^A-Za-z]|$)").test(lit), "English UI word remains in " + f + ": " + JSON.stringify(w) + " in " + JSON.stringify(lit.slice(0, 80)));
    }
  }
});

test("no spoken quiz question contains its own correct answer (round 3.2.1)", () => {
  const digits = { "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9" };
  const norm = s => String(s || "").replace(/[٠-٩]/g, c => digits[c]).replace(/[ً-ٰٟـ]/g, "").replace(/[أإآٱ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/[^ء-يa-zA-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
  const src = read("app.js");
  const bank = vm.runInNewContext("(" + src.slice(src.indexOf("const bank=") + 11, src.indexOf("\nconst names=")).replace(/;\s*$/, "") + ")", Object.create(null));
  // Pattern completion is legitimate: the pattern is the given piece and
  // the next element is the asked piece — the child must still work out
  // the sequence rule, the answer is not handed over.
  const ALLOW = ["أكمل النمط: أحمر، أزرق، أحمر، أزرق، ..."];
  let checked = 0;
  for (const qs of Object.values(bank)) for (const q of qs) {
    if (ALLOW.includes(q.q)) continue;
    const nq = norm(q.q);
    const ans = q.a[q.c];
    const na = norm(ans);
    if (na.length >= 2) {
      assert.ok(!nq.includes(na), "question contains its answer: " + q.q + " => " + ans);
      for (const w of na.split(" ").map(w => w.replace(/^ال/, "")).filter(w => w.length >= 3))
        assert.ok(!nq.split(" ").includes(w), "question contains an answer word '" + w + "': " + q.q + " => " + ans);
    } else {
      // Single-letter answer: only a standalone token counts — a bare
      // glyph is a substring of almost any Arabic text, so a substring
      // check would flag every first/next-letter question, which are
      // legitimate (give the word, ask for its letter).
      assert.ok(!nq.split(" ").includes(na), "question names its single-letter answer: " + q.q + " => " + ans);
    }
    checked++;
  }
  assert.ok(checked >= 89, "expected to check the whole bank, got " + checked);
  // Letter-school quiz: the glyph/sample is visual only (q.show); the
  // spoken question is q.q + " اختار الإجابة الصحيحة" and never names it.
  const lessons = read("lessons.js");
  assert.ok(!lessons.includes('"ما اسم هذا الحرف؟ "+l.letter'), "letter quiz must not put the glyph in the spoken question");
  assert.ok(!lessons.includes('"ما اسم الحركة في "+m.sample'), "haraka quiz must not put the sample in the spoken question");
  assert.ok(lessons.includes("show:l.letter"), "letter quiz must show the glyph visually");
  assert.ok(lessons.includes("show:m.sample"), "haraka quiz must show the sample visually");
  assert.ok(lessons.includes("q.show?"), "showQuiz must render the visual glyph/sample display");
  assert.ok(lessons.includes("speakSequence([spoken,...q.a]"), "letter quiz must auto-narrate question then choices");
  assert.ok(!lessons.includes("questionSpeak"), "letter quiz must not use tap-to-listen for the question only");
});

test("letter-school pager buttons have big arrows under their labels (round 3.2.1)", () => {
  const lessons = read("lessons.js");
  assert.ok(lessons.includes("pager-arrow"), "pager buttons must carry the arrow spans");
  assert.match(lessons, /الحرف السابق[\s\S]{0,200}?→/, "previous button must show → under its label");
  assert.match(lessons, /الحرف التالي[\s\S]{0,200}?←/, "next button must show ← under its label");
  const css = read("styles.css");
  assert.match(css, /\.pager-arrow\{[^}]*font-size:44px/, "pager arrows must be large and clear");
  assert.match(css, /\.lesson-pager button\{[^}]*flex-direction:column/, "pager buttons must stack label over arrow");
});

test("letter lessons auto-speak the full explanation and narrate forms per position (round 3.2.1)", () => {
  const lessons = read("lessons.js");
  // Notes 10–11: the unified lesson builds the full explanation and
  // auto-speaks it on open; the short version is never spoken.
  assert.ok(lessons.includes("const ex=explainFor(l)"), "unified lesson must build the full explanation");
  assert.ok(lessons.includes("say(ex.spoken)"), "lesson must auto-speak the full explanation on open");
  assert.ok(!lessons.includes("explainFor(current).short"), "lesson must not auto-speak the short version");
  assert.ok(lessons.includes("formsListen"), "lesson must have a listen button for the forms narration");
  assert.ok(lessons.includes("في أول الكلمة"), "step 1 narration must name the first position");
  assert.ok(lessons.includes("وفي نص الكلمة"), "step 1 narration must name the middle position");
  assert.ok(lessons.includes("وفي آخر الكلمة"), "step 1 narration must name the last position");
  assert.ok(lessons.includes("زي كلمة"), "step 1 narration must give the example word per position");
  const corpus = JSON.parse(read("audio-src/corpus.json"));
  const byKey = new Map(corpus.map(e => [e.key, e]));
  for (let i = 0; i < 28; i++) {
    assert.ok(byKey.has("let_full_" + i), "missing full lesson clip for letter " + i);
    assert.ok(byKey.has("let_forms_" + i), "missing per-position forms clip for letter " + i);
    const f = byKey.get("let_forms_" + i).text;
    assert.ok(f.includes("في أول الكلمة") && f.includes("وفي نص الكلمة") && f.includes("وفي آخر الكلمة"),
      "forms narration for letter " + i + " must name all three positions");
  }
});

test("letter school opens with a picker of all 28 letters (round 3.2.1)", () => {
  const lessons = read("lessons.js");
  assert.ok(lessons.includes("renderPicker"), "letter school must have a picker screen");
  assert.ok(lessons.includes("step=-1"), "the school must open on the picker");
  assert.match(lessons, /step=-1;quiz=\[\];quizIndex=0;score=0;render\(\)/, "open() must start on the picker with a fresh quiz");
  assert.ok(lessons.includes("data-letter"), "picker tiles must carry the letter index");
  assert.ok(lessons.includes("letterIndex=Number(b.dataset.letter);step=0;render()"), "tapping a picker tile must open that letter's lesson");
  assert.ok(lessons.includes("basic-grid letter-picker"), "picker must use the app grid style");
  const m = lessons.match(/const lessons = (\[.*?\]);/s);
  assert.ok(m, "lessons array not found");
  const arr = vm.runInNewContext("(" + m[1] + ")", Object.create(null));
  assert.strictEqual(arr.length, 28, "picker must offer all 28 letters");
  assert.ok(lessons.includes("lessons.map((l,i)=>"), "picker grid must map over all lessons");
  // back from a lesson returns to the picker; back from the picker returns home
  assert.match(lessons, /lessonBack"\)\.onclick=\(\)=>\{if\(step===-1\)\{back\(\)\}else/, "back must go to the picker from a lesson and home from the picker");
  const css = read("styles.css");
  assert.match(css, /\.letter-picker \.basic-tile b\{[^}]*font-size:36px/, "picker glyphs must be big");
});

test("letter-quiz and Arabic-journey spoken strings are covered by the voice corpus (round 3.2.1)", () => {
  const corpus = JSON.parse(read("audio-src/corpus.json"));
  const digits = { "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9" };
  const norm = s => String(s || "").replace(/[٠-٩]/g, c => digits[c]).replace(/[ً-ٰٟـ]/g, "").replace(/[^ء-يa-zA-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
  const norms = new Set(corpus.map(e => norm(e.text)));
  const need = (t, why) => assert.ok(norms.has(norm(t)), "no corpus clip for " + why + ": " + t);
  need("ما اسم هذا الحرف؟ اختار الإجابة الصحيحة", "letter-quiz question");
  need("ما اسم الحركة في المقطع ده؟ اختار الإجابة الصحيحة", "haraka-quiz question");
  need("اختار حرف يا ملك ماثيو", "letter picker greeting");
  const lessonsSrc = read("lessons.js");
  const arr = vm.runInNewContext("(" + lessonsSrc.match(/const lessons = (\[.*?\]);/s)[1] + ")", Object.create(null));
  for (const l of arr) {
    need("أي شكل لحرف " + l.name + " في أول الكلمة؟ اختار الإجابة الصحيحة", "form question");
    need(l.name, "letter-name choice");
  }
  for (const h of ["الفتحة", "الضمة", "الكسرة", "السكون"]) {
    need("أي مقطع عليه " + h.replace(/^ال/, "") + "؟ اختار الإجابة الصحيحة", "syllable question");
    need(h, "haraka-name choice");
  }
  for (const d of ["حركة أخرى", "الشدة", "التنوين"]) need(d, "haraka distractor");
  // Arabic explanations are recorded in ar_EG, not en_US
  for (const e of corpus.filter(e => e.key.startsWith("math_en_q") || e.key.startsWith("basic_en_")))
    assert.strictEqual(e.lang, "ar_EG", e.key + " must be recorded in ar_EG");
  assert.ok(corpus.filter(e => e.key.startsWith("math_en_q")).length >= 100, "math_en_q coverage");
  assert.strictEqual(corpus.filter(e => e.key.startsWith("basic_en_")).length, 26, "basic_en_ coverage");
});

test("the Lessons door offers exactly one Arabic-letters entry: the unified school (round 3.2.1)", () => {
  const learning = read("learning.js");
  assert.ok(!learning.includes('id:"arLetters"'), "the duplicate Arabic-letters card must be gone from learning.js");
  assert.ok(!learning.includes("arabicLetters"), "the basic Arabic-letters data must be gone with the card");
  for (const id of ["enLetters", "arNumbers", "enNumbers"])
    assert.ok(learning.includes('id:"' + id + '"'), "learning.js must keep " + id);
  const lessons = read("lessons.js");
  assert.strictEqual((lessons.match(/dataset\.lessonEntry="true"/g) || []).length, 1, "exactly one letter-school entry card");
  assert.ok(lessons.includes("مدرسة الحروف"), "the single entry is the letter school");
  // the unified lesson holds everything about a letter on one screen
  for (const s of ["explain-box", "form-grid", "word-examples", "mark-tabs", "mark-card", "lesson-pager", "formsListen"])
    assert.ok(lessons.includes(s), "unified lesson is missing: " + s);
  assert.ok(lessons.includes("letterQuizBtn"), "the picker must offer the quiz directly");
  assert.ok(lessons.includes("🏆 اختبر نفسك"), "the lesson must offer the quiz directly");
});

test("lessons are unified on one screen with no step wizard or intro screens (round 3.2.1)", () => {
  const lessons = read("lessons.js");
  // no step wizard: the old per-step renderers and step branches are gone
  for (const s of ["renderLetter(", "renderForms(", "renderMarks(", "renderQuizIntro(", "step===1", "step===2", "step===3", "جاهز يا بطل"])
    assert.ok(!lessons.includes(s), "step wizard remains in lessons.js: " + s);
  assert.ok(lessons.includes("function renderLesson()"), "the unified lesson screen is missing");
  assert.ok(lessons.includes("function renderPicker()"), "the picker is missing");
  // taps from home to lesson content: door → school card → letter = 3 taps,
  // and the lesson screen itself holds everything (no further steps)
  assert.ok(lessons.includes("letterIndex=Number(b.dataset.letter);step=0;render()"), "picker tap must open the lesson directly");
  assert.ok(lessons.includes("letterQuizBtn"), "quiz must be one tap from the picker");
  // the quiz starts straight from the lesson or the picker — no intro screen
  assert.ok(!lessons.includes("أحسنت يا ماثيو. يلا نبدأ الاختبار"), "quiz-intro screen must be gone");
  // basic learning has no intro screen either: a category card opens straight on its first item
  const learning = read("learning.js");
  assert.match(learning, /function open\(cat\)\{active=cat;index=0;/, "basic learning must open straight on the first item");
});

test("number answers are Arabic-Indic digits and quizzes are script-consistent (round 3.2.1, notes 26-28)", () => {
  const src = read("app.js");
  const bank = vm.runInNewContext("(" + src.slice(src.indexOf("const bank=") + 11, src.indexOf("\nconst names=")).replace(/;\s*$/, "") + ")", Object.create(null));
  const numWords = /^(واحد|واحدة|اثنان|اثنتان|ثلاثة|ثلاث|أربعة|أربع|خمسة|خمس|ستة|سبعة|ثمانية|تسعة|عشرة|اثنا عشر)$/;
  for (const qs of Object.values(bank)) for (const q of qs) {
    for (const s of [q.q, ...q.a]) assert.ok(!/[0-9]/.test(s), "Latin digit in an Arabic quiz: " + q.q + " | " + s);
    for (const a of q.a) assert.ok(!numWords.test(a), "number answer must be a digit, not a word: " + q.q + " | " + a);
  }
  // AnswerPics: number words/digits picture as the Arabic-Indic digit itself,
  // never a finger emoji or a Latin keycap digit (same rule as stories.js)
  const pics = JSON.parse(src.match(/window\.AnswerPics=(\{.*?\});/s)[1]);
  const wordToDigit = { "واحد": "١", "واحدة": "١", "اثنان": "٢", "اثنتان": "٢", "ثلاثة": "٣", "ثلاث": "٣", "أربعة": "٤", "أربع": "٤", "خمسة": "٥", "خمس": "٥", "ستة": "٦", "سبعة": "٧", "ثمانية": "٨", "تسعة": "٩", "عشرة": "١٠", "اثنا عشر": "١٢" };
  for (const [w, d] of Object.entries(wordToDigit)) assert.strictEqual(pics[w], d, "number-word picture must be the Arabic digit: " + w);
  for (const d of ["١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩", "١٠", "١١", "١٢", "١٣", "١٤", "١٦", "١٧"]) assert.strictEqual(pics[d], d, "digit picture must be the Arabic digit itself: " + d);
  for (const [k, v] of Object.entries(pics)) {
    if (String(v).startsWith("<svg")) continue; // the مستطيل SVG carries viewBox coordinates
    assert.ok(!/[0-9]/.test(v) && v !== "🔟", "Latin digit picture in AnswerPics: " + k + " → " + v);
  }
});

test("مستطيل shows a plain rectangle, not a framed picture (round 3.2.1, note 29)", () => {
  const src = read("app.js");
  const pics = JSON.parse(src.match(/window\.AnswerPics=(\{.*?\});/s)[1]);
  const rect = pics["مستطيل"];
  assert.ok(String(rect).startsWith("<svg") && String(rect).includes("<rect"), "مستطيل must be a drawn rectangle SVG, got: " + rect);
  assert.ok(!String(rect).includes("🖼️"), "مستطيل must not be the framed-picture emoji");
  assert.strictEqual(pics["مربع"], "🟦", "مربع must be a square");
  assert.strictEqual(pics["مثلث"], "🔺", "مثلث must be a triangle");
  assert.strictEqual(pics["دائرة"], "🔵", "دائرة must be a circle");
  // rescue.js renders answers through the shared AnswerPics, so it gets the rectangle too
  assert.ok(read("rescue.js").includes("window.answerPic"), "stories must use the shared AnswerPics");
});

test("mark-tab narration names the letter's own sample, never ب (round 3.2.1, note 14)", () => {
  const corpus = JSON.parse(read("audio-src/corpus.json"));
  const byKey = {};
  for (const e of corpus) byKey[e.key] = e;
  // spoken string is "NAME، SAMPLE. HINT: SAMPLE" — the hint must end with
  // the letter's own sample (the sample after "، " and before ". ")
  let checked = 0;
  for (const e of corpus) {
    if (!e.key.startsWith("let_mark_")) continue;
    const m = e.text.match(/^[^،]+، ([^.]+)\. [^:]+: (.+)$/);
    assert.ok(m, "let_mark text has an unexpected shape: " + e.key + " " + e.text);
    assert.strictEqual(m[2], m[1], "mark hint ends with the wrong sample: " + e.key + " " + e.text);
    checked++;
  }
  assert.strictEqual(checked, 112, "expected 112 mark clips, got " + checked);
  const lessons = read("lessons.js");
  assert.ok(lessons.includes('say(m.name+"، "+markSample()+". "+m.hint+": "+markSample())'), "mark tap must speak name + own sample + hint + own sample");
  assert.ok(!lessons.includes('hint:"نفتح الفم قليلاً: بَ"') && !lessons.includes('hint:"نسكن الحرف بلا حركة: أَبْ"'), "marks must not hardcode the ب sample in their hints");
});

test("sukun syllable choices have recorded Fusha clips (round 3.2.1, note 14)", () => {
  const corpus = JSON.parse(read("audio-src/corpus.json"));
  const byKey = {};
  for (const e of corpus) byKey[e.key] = e;
  for (const [i, s] of ["بْ", "تْ", "مْ", "سْ"].entries()) {
    const e = byKey["lsq_syl_sukun_" + i];
    assert.ok(e, "missing sukun clip: lsq_syl_sukun_" + i);
    assert.strictEqual(e.text, s);
    assert.strictEqual(e.lang, "ar_SA");
  }
  const lessons = read("lessons.js");
  for (const s of ["بْ", "تْ", "مْ", "سْ"]) assert.ok(lessons.includes('"' + s + '"'), "quiz must offer the sukun choice " + s);
});
