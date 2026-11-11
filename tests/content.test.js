const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");

test("phase 1-2 modules ship inside the interactive-games bundle", () => {
  // The Android workflow copies interactive-games.js into the APK. The bundle
  // is far too large to commit through the API, so the workflow rebuilds it
  // from the canonical sources (build_bundle.py) before copying. This test
  // runs that same build and keeps the parts byte-identical to the sources.
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
  const partFiles = ["mastery.js", "parent.js", "tracing.js", "reading.js", "voice-clips.js", "rescue.js", "color-games.js",
    ...fs.readdirSync(root).filter(f => /^voice-clips-(pack|text)-\d+\.js$/.test(f)).sort()];
  for (const file of partFiles) {
    assert.ok(fs.existsSync(path.join(root, file)), "missing source " + file);
    const source = read(file).trim();
    assert.ok(bundle.includes(source), "bundle is out of sync with " + file + " — regenerate it from the sources");
    assert.ok(!html.includes('src="./' + file + '"'), "page should load " + file + " via the bundle only");
    assert.ok(!sw.includes("./" + file), "offline cache must not list " + file + " (not a separate request any more)");
  }
  assert.ok(html.includes("interactive-games.js"), "page does not load the bundle file");
  assert.ok(sw.includes("./interactive-games.js"), "offline cache missing the bundle file");
  assert.match(sw, /king-matthew-v20/);
  assert.ok(sw.includes("./voice.bundle.js"), "offline cache must precache voice.bundle.js (round 3.2)");
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

test("story adventures replace the plain surprise quiz on the home screen", () => {
  const html = read("index.html");
  assert.ok(html.includes('data-stories="1"'), "home is missing the stories card");
  assert.ok(!html.includes('data-category="mixed"'), "plain surprise quiz card still on home");
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
  assert.ok(app.includes("speakSequence([q.q,...lastChoices]"), "main quiz must auto-narrate question + choices in order");
  assert.ok(!app.includes("answer-say"), "answers must not carry their own speaker buttons (owner, round 3.1)");
  const rescue = read("rescue.js");
  assert.ok(rescue.includes("speakSequence([current.q, ...lastChoices]"), "stories must auto-narrate question + choices too");
  assert.ok(!rescue.includes("answer-say") && !rescue.includes("rescueListen"), "stories must not carry listen buttons (owner, round 3.1)");
  const voice = read("voice.js");
  assert.ok(voice.includes("speakSequence"), "MatthewVoice must expose speakSequence");
  assert.match(voice, /if \(id === requestId\) clips\.playKey\(key\)/, "delayed praise must yield to newer speech (no overlap)");
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

test("basic Arabic letter examples do not reuse one emoji for two words", () => {
  const learning = read("learning.js");
  const start = learning.indexOf("const arabicLetters");
  const end = learning.indexOf("].map", start);
  assert.ok(start >= 0 && end > start);
  const entries = [...learning.slice(start, end).matchAll(/\["([^"]+)","([^"]+)","([^"]+)"\]/g)]
    .map(m => ({ letter: m[1], word: m[2], emoji: m[3] }));
  assert.equal(entries.length, 28, "expected 28 basic letter examples");
  const byEmoji = new Map();
  for (const entry of entries) {
    assert.ok(!byEmoji.has(entry.emoji),
      `emoji ${entry.emoji} used for both ${byEmoji.get(entry.emoji)} and ${entry.word}`);
    byEmoji.set(entry.emoji, entry.word);
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
    const correctPic = pics[q.a[q.c]];
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
  assert.equal(lessons.length, 47, "expected 47 science lessons after the swap, got " + lessons.length);
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
  assert.equal(all.filter(q => q.q.includes("قوس قزح")).length, 1, "the rainbow bank question stays exactly once");
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
  assert.match(bc, /\/\^\(les_namesound\|basic_ar\|rd_syl\)_\//, "build-corpus must force ar_SA for letter/syllable keys");
  const corpus = JSON.parse(read("audio-src/corpus.json"));
  const sa = corpus.filter(e => e.lang === "ar_SA");
  assert.ok(sa.length >= 200, "expected 200+ Fusha clips, got " + sa.length);
  for (const prefix of ["les_namesound_", "basic_ar_", "rd_syl_"]) {
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
  for (const key of ["cg_instr_numbers", "cg_instr_nature", "cg_instr_patterns", "cg_try", "cg_num_intro_0", "cg_nat_q_0", "cg_pat_intro_1"]) {
    assert.ok(cg.some(e => e.key === key), "corpus missing workshop clip " + key);
  }
});
