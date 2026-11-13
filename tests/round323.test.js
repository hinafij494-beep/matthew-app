// Round 3.2.3 regression tests — the fixes the 3.2.3 live diagnosis found.
// Static source checks run always; the live-DOM digit test needs jsdom
// (dev-only dependency) and skips where it is not installed, like
// tests/science-chunking.test.js.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");
const root = path.join(__dirname, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");
let JSDOM = null;
try { ({ JSDOM } = require("jsdom")); } catch (_) { JSDOM = null; }
const skipDom = !JSDOM;

// ---------- shared: real runtime clip maps (same loader as audio-chain.test.js) ----------
// Loaded lazily — only the audio tests (14b, 19, 21) pay the ~56MB pack cost.
let _clipMaps = null;
function getClipMaps() {
  if (_clipMaps) return _clipMaps;
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
  const BY_KEY = Object.assign({}, BY_KEY_RAW);
  for (const k of Object.keys(BY_KEY)) {
    const t = k.indexOf("~");
    if (t > 0) { const base = k.slice(0, t); BY_KEY[base] = (BY_KEY[base] || "") + BY_KEY[k]; delete BY_KEY[k]; }
  }
  const DIGITS = { "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9" };
  const norm = value => String(value || "").replace(/[٠-٩]/g, c => DIGITS[c]).replace(/[ً-ٰٟـ]/g, "").replace(/[^ء-يa-zA-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
  const keyFor = text => EXACT[String(text || "").trim()] || BY_TEXT[norm(text)];
  _clipMaps = { BY_TEXT, EXACT, BY_KEY, keyFor };
  return _clipMaps;
}
const ansKeysUniverse = () => {
  const { BY_TEXT } = getClipMaps();
  const corpus = JSON.parse(read("audio-src/corpus.json"));
  const keys = new Set();
  for (const v of Object.values(BY_TEXT)) if (typeof v === "string" && v.startsWith("ans_")) keys.add(v);
  for (const e of corpus) if (typeof e.key === "string" && e.key.startsWith("ans_")) keys.add(e.key);
  return keys;
};

// ---------- ITEM 8: numbers lessons are no longer repeated ----------
test("item 8: learning.js keeps only the English-letters card; the journeys are the numbers lessons", () => {
  const learning = read("learning.js");
  assert.ok(learning.includes('id:"enLetters"'), "enLetters must stay");
  assert.ok(!learning.includes('id:"arNumbers"'), "arNumbers card must be gone");
  assert.ok(!learning.includes('id:"enNumbers"'), "enNumbers card must be gone");
  // The data stays (round321 numbers-once test + the journeys' spoken names).
  assert.ok(learning.includes("speak:arabicNames[i]"), "arabicNumbers data must stay");
  assert.ok(learning.includes("speak:n"), "englishNumbers data must stay");
  // Exactly 2 numbers-related cards on الدروس: the two journeys.
  assert.ok(read("math-journey.js").includes("الحساب بالعربي: الأرقام ١–٢٠"), "Arabic journey card must exist");
  assert.ok(read("math-english.js").includes("الرياضيات بالإنجليزي: 1–20"), "English journey card must exist");
  // The quiz card is renamed so the lesson/quiz split is obvious.
  assert.ok(read("index.html").includes("اختبر نفسك في الأرقام"), "quiz card must be renamed in index.html");
  assert.ok(!read("index.html").includes("<strong>عالم الأرقام</strong>"), "old quiz card name must be gone");
  const app = read("app.js");
  assert.ok(app.includes('numbers:"اختبر نفسك في الأرقام"'), "names.numbers must match the renamed card");
});

// ---------- ITEM 9: lesson → quiz flow ----------
// The shared pattern: a big pictured 🏆 offer, spoken aloud when it
// appears, and the calling lesson panel is hidden before start() —
// start() itself does not hide lesson panels.
test("item 9: letter school speaks the quiz offer after the lesson (never text-only)", () => {
  const lessons = read("lessons.js");
  assert.ok(lessons.includes("QUIZ_OFFER"), "lessons.js must define the offer text");
  assert.ok(lessons.includes("دوس على الكاس"), "offer must tell the child where to tap");
  assert.ok(lessons.includes("saySeq([ex.spoken,QUIZ_OFFER])"), "offer must follow the lesson in the same spoken sequence");
  assert.ok(lessons.includes("🏆 اختبر نفسك ⭐"), "the quiz button stays pictured");
  assert.ok(!/setTimeout\(\(\)=>\{[^}]*say\(ex\.spoken\)\},120\)/.test(lessons), "the old offer-less auto-speak must be gone");
});

test("item 9: math journey finish offers the numbers quiz and hides its panel first", () => {
  const mj = read("math-journey.js");
  assert.ok(mj.includes('id="mathQuiz"'), "finish screen must have a quiz button");
  assert.ok(mj.includes("🏆 اختبر نفسك في الأرقام ⭐"), "quiz button must be big and pictured");
  assert.ok(mj.includes('start("numbers")'), "quiz button must open the numbers bank");
  const handler = mj.slice(mj.indexOf("#mathQuiz"));
  assert.ok(handler.includes('panel.classList.add("hidden")'), "panel must be hidden before start()");
  assert.ok(mj.includes("QUIZ_OFFER_NUMBERS"), "offer text must be defined");
  assert.ok(mj.includes("QUIZ_OFFER_NUMBERS]),150)"), "offer must be spoken in the finish sequence");
  assert.ok(mj.includes("يلا نختبر نفسك في الأرقام"), "offer must name the numbers quiz");
});

test("item 9: science lessons offer the science quiz on every lesson; the offer is spoken on the last lesson's last step", () => {
  const sci = read("science.js");
  assert.ok(sci.includes('id="scienceQuiz"'), "every lesson screen must have a quiz button");
  assert.ok(sci.includes("🏆 اختبر نفسك في العلوم ⭐"), "quiz button must be big and pictured");
  assert.ok(sci.includes('start("science")'), "quiz button must open the science bank");
  const handler = sci.slice(sci.indexOf("#scienceQuiz"));
  assert.ok(handler.includes('panel.classList.add("hidden")'), "panel must be hidden before start()");
  assert.ok(sci.includes("QUIZ_OFFER"), "offer text must be defined");
  assert.ok(sci.includes("speakSeq([lessonText,QUIZ_OFFER])"), "single-step last lesson must sequence lesson then offer");
  assert.ok(sci.includes("isLastLesson&&isLastStep"), "offer must fire on the last lesson's last step");
  assert.ok(sci.includes("→ اختار درساً آخر"), "the old next-lesson navigation must stay untouched");
});

test("item 9: reading lesson screens surface the existing quiz with a big pictured button, spoken on first entry", () => {
  const rd = read("reading.js");
  for (const fn of ["renderSyllables", "renderArWord", "renderCvc"])
    assert.ok(rd.includes("quizOfferButton()"), fn + " must render the quiz-offer button");
  assert.ok(rd.includes("🏆 تحدي القراءة ⭐"), "quiz button must be big and pictured");
  assert.ok(rd.includes('mode = "quiz"; render();'), "quiz button must open the existing reading quiz");
  assert.ok(rd.includes("QUIZ_OFFER"), "offer text must be defined");
  assert.ok(rd.includes("seq.push(QUIZ_OFFER)"), "syllables screen must append the offer to its narration");
  assert.ok(rd.includes("speakSequence([blend, QUIZ_OFFER]"), "word screens must append the offer to the blend narration");
  assert.ok(rd.includes("offerSpoken = false"), "offer must be spoken once per panel open");
  // The header tab stays as a second way in.
  assert.ok(rd.includes("تحدي القراءة"), "the header tab must stay");
});

test("item 9: English lessons NEVER route to the Arabic quiz banks", () => {
  // No English quiz category exists in the bank — misrouting an English
  // lesson at the Arabic bank would quiz a child in the wrong language.
  const learning = read("learning.js");
  assert.ok(!learning.includes("start("), "learning.js must not call the main quiz at all");
  assert.ok(learning.includes("EN_DONE"), "English lessons end with a spoken completion, not a quiz offer");
  assert.ok(learning.includes("خلصت كل الحروف الإنجليزية"), "completion must be spoken");
  assert.ok(learning.includes("🎉 خلصت الدرس! ⭐"), "last item must show a completion state, not a wrap-around");
  assert.ok(!learning.includes("ارجع للبداية"), "the silent wrap-around label must be gone");
  const me = read("math-english.js");
  assert.ok(!me.includes('start("numbers")') && !me.includes('start("science")') && !me.includes('start("letters")'),
    "English journey must not point at any Arabic bank");
  assert.ok(me.includes("englishMathContinue"), "English journey keeps its own next-level flow");
  // The Arabic journey DOES route (its bank exists).
  assert.ok(read("math-journey.js").includes('start("numbers")'), "Arabic journey must route to the numbers bank");
});

test("item 9: every quiz offer hides its lesson panel before start() (start() does not)", () => {
  const app = read("app.js");
  const startBody = app.slice(app.indexOf("function start(cat)"), app.indexOf("function showQuestion"));
  assert.ok(!startBody.includes("basicLearning") && !startBody.includes("scienceAcademy") &&
    !startBody.includes("readingPanel") && !startBody.includes("mathJourney"),
    "start() itself does not hide lesson panels (guard: the callers must)");
  for (const [file, panel] of [["math-journey.js", "mathJourney"], ["science.js", "scienceAcademy"]]) {
    const src = read(file);
    const i = src.indexOf('start("');
    assert.ok(src.slice(0, i).includes('panel.classList.add("hidden")'), file + " must hide its panel before start()");
  }
});

// ---------- SIDE FINDING: numbers-quiz digits render once, not twice ----------
test("side finding: showQuestion renders a pure-digit answer label-only (no picture slot)", () => {
  const app = read("app.js");
  assert.ok(app.includes("isDigitAnswer"), "showQuestion must detect pure-digit answers");
  assert.ok(app.includes('/^[0-9٠-٩]+$/'), "digit detection must cover Arabic-Indic and Western digits");
  assert.ok(app.includes('isDigitAnswer?`<span class="answer-label">'), "digit answers must render label-only");
  // The AnswerPics digit self-maps stay (stories.js relies on them; the
  // doubling was in the RENDER, not the map).
  assert.ok(app.includes('"٥": "٥"'), "AnswerPics digit self-maps must stay");
});

test("side finding (live DOM): digit answers show once, word answers keep their picture", { skip: skipDom }, () => {
  const html = read("index.html");
  const dom = new JSDOM(html, { url: "http://localhost/", runScripts: "outside-only", pretendToBeVisual: true });
  const { window } = dom;
  window.MatthewVoice = { speak() {}, speakSequence() {}, feedback() {}, stop() {} };
  window.MatthewMastery = { record() {}, weight() { return 0; } };
  try {
    window.eval(read("app.js"));
    // Numbers quiz: every answer is a digit — none may render a picture slot.
    window.start("numbers");
    const numButtons = [...window.document.querySelectorAll("#answers .answer")];
    assert.equal(numButtons.length, 4, "numbers question must render 4 answers");
    for (const b of numButtons) {
      const digit = b.dataset.answer;
      assert.match(digit, /^[0-9٠-٩]+$/, "numbers answer must be a digit: " + digit);
      assert.equal(b.querySelector(".answer-picture"), null, "digit answer must have no picture slot: " + digit);
      assert.equal(b.querySelectorAll(".answer-label").length, 1, "digit answer must have exactly one label");
      assert.equal((b.textContent.match(new RegExp(digit.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length, 1,
        "digit must appear exactly once in the button: " + b.textContent);
      assert.ok(b.classList.contains("digit-only"), "digit button must carry the digit-only class");
    }
    // Letters quiz: non-digit answers must still get their picture.
    window.start("letters");
    const letButtons = [...window.document.querySelectorAll("#answers .answer")];
    assert.equal(letButtons.length, 4, "letters question must render 4 answers");
    let pictured = 0, digitOnly = 0;
    for (const b of letButtons) {
      if (/^[0-9٠-٩]+$/.test(b.dataset.answer)) { digitOnly++; assert.equal(b.querySelector(".answer-picture"), null); }
      else { pictured++; assert.ok(b.querySelector(".answer-picture"), "word/letter answer must keep its picture: " + b.dataset.answer); }
    }
    assert.ok(pictured > 0, "letters question must include at least one pictured answer");
  } finally {
    window.close();
  }
});

// ---------- ITEM 1: chess board is a real 8x8 board ----------
test("item 1: chess board picture is a real 8x8 SVG (64 squares), never the ▦ glyph", () => {
  const chess = require(path.join(root, "chess.js"));
  const svg = chess.boardIconSVG();
  assert.equal((svg.match(/<rect/g) || []).length, 65, "board icon must be 1 wood border + 64 cells, got " + (svg.match(/<rect/g) || []).length);
  assert.equal((svg.match(/#f0d9b5/g) || []).length, 32, "board must have 32 light squares");
  assert.equal((svg.match(/#b58863/g) || []).length, 32, "board must have 32 dark squares");
  // The menu and the lesson hero both use the real board (no ▦ anywhere
  // in the code except the comment explaining the old defect).
  assert.ok(chess.menuHTML(99).includes("<svg viewBox=\"0 0 68 68\""), "menu board lesson must show the real board");
  assert.ok(!chess.menuHTML(99).includes("▦"), "menu must not contain the ▦ glyph");
  const src = read("chess.js").replace(/\/\/[^\n]*/g, "");
  assert.ok(!src.includes("▦"), "chess.js must not render the ▦ glyph anywhere (code, not comments)");
  assert.ok(src.includes("l.id === \"board\" ? boardIconSVG()"), "lesson hero must use the real board");
  // Picture-by-picture: every lesson's hero is its own piece/board.
  assert.ok(src.includes("l.id === \"cookies\" ? '<span style=\"font-size:96px\">🍪</span>'"), "cookies lesson hero must be cookies");
  assert.ok(src.includes("l.id === \"race\" ? pieceSVG(\"p\", \"w\")"), "race lesson hero must be the pawn");
});

// ---------- ITEM 20: chess simplified for a 5 1/2-year-old; pawn is العسكري ----------
test("item 20: chess is simplified for a 5-year-old; the pawn is العسكري everywhere", () => {
  const chess = require(path.join(root, "chess.js"));
  assert.equal(chess.LESSONS.length, 11, "still 11 lessons");
  const src = read("chess.js");
  assert.ok(!src.includes("بيدق") && !src.includes("بيادق"), "no بيدق/بيادق may remain anywhere in chess.js");
  assert.ok((src.match(/العسكري/g) || []).length >= 10, "العسكري must be the pawn's name throughout");
  const pawn = chess.LESSONS.find(l => l.id === "pawn");
  assert.ok(pawn.title.includes("العسكري"), "pawn lesson must be titled العسكري, got " + pawn.title);
  const board = chess.LESSONS.find(l => l.id === "board");
  assert.ok(!board.lesson.includes("أربعة وستين") && !board.lesson.includes("64"), "board lesson must not do 64-arithmetic for a 5-year-old");
  for (const l of chess.LESSONS) {
    assert.ok(l.lesson.length >= 200, "lesson " + l.id + " must still meet the 200-char rule");
    assert.ok(!/بيدق|بيادق/.test(l.lesson + l.title + l.intro), "lesson " + l.id + " must not mention بيدق");
  }
  // The spoken corpus carries the new wording too (re-record list).
  const corpusText = chess.CORPUS.map(c => c.text || c).join(" ");
  assert.ok(!/بيدق|بيادق/.test(corpusText), "chess spoken corpus must not mention بيدق");
  assert.ok(corpusText.includes("العسكري"), "chess spoken corpus must call the pawn العسكري");
  // The full old→new clip list exists for the audio worker.
  const listPath = path.join(root, "..", "fix-round-323", "chess-reword-list.md");
  assert.ok(fs.existsSync(listPath), "chess-reword-list.md must exist for the audio worker");
  const list = fs.readFileSync(listPath, "utf8");
  assert.ok(list.includes("العسكري") && list.includes("chess_"), "reword list must map clip keys to the new wording");
});

// ---------- ITEM 2: letters F1-F7 ----------
test("item 2 (F1/F1b): inline SVGs in the explain box are emoji-sized; ث مثال is a picture that shows an example", () => {
  const styles = read("styles.css");
  assert.ok(styles.includes(".explain-box p svg{width:1.5em;height:1.5em;vertical-align:-.35em;display:inline-block}"),
    "explain-box SVGs must be constrained to ~emoji size");
  const lessons = read("lessons.js");
  const thaa = lessons.match(/\{letter:"ث",name:"الثاء",forms:\[[^\]]*\],words:\[[^\]]*\],emoji:\[[^\]]*\]/);
  assert.ok(thaa, "ث entry not found");
  assert.ok(thaa[0].includes('"📝"'), "ث مثال must be pictured 📝 (a written example), not the confusing chalkboard sum");
  assert.ok(!thaa[0].includes("1+1") && !thaa[0].includes("١+١"), "the confusing «١+١=٢» chalkboard must be gone");
});

test("item 2 (F2/F3): haraka distractors and syllable answers get the neutral 🔤 tile", () => {
  const lessons = read("lessons.js");
  assert.ok(lessons.includes('if (a === "حركة أخرى") return "🔤";'), "«حركة أخرى» must not borrow the horse picture");
  assert.ok(lessons.includes('if (/^[ء-ي][ً-ٟ]?$/.test(String(a || ""))) return "🔤";'), "syllable answers must get the neutral tile, not one shared picture");
});

test("item 2 (F4/F5/F6): quiz pictures use the lesson's own mnemonics; distinct words per letter", () => {
  const app = read("app.js");
  const pics = JSON.parse(app.slice(app.indexOf("window.AnswerPics=") + "window.AnswerPics=".length, app.indexOf("};", app.indexOf("window.AnswerPics=")) + 1).replace(/^window\.AnswerPics=/, ""));
  // F4: letter → its lesson's first-word picture.
  assert.equal(pics["ح"], "🐎", "ح must use the lesson picture 🐎");
  assert.equal(pics["ق"], "🐱", "ق must use the lesson picture 🐱 (قطة), not 🌙");
  assert.equal(pics["ك"], "📘", "ك must use the lesson picture 📘 (كتاب), not 🐶");
  assert.equal(pics["ن"], "🐅", "ن must use the lesson picture 🐅 (نمر), not ⭐");
  assert.equal(pics["ع"], "🐦", "ع must use the lesson picture 🐦 (عصفور), not 🐤");
  assert.equal(pics["ل"], "🥛", "ل must have a picture at all (it was missing)");
  // F5: the س question must not be pictured with a سيارة.
  assert.ok(app.includes('{q:"أي كلمة تبدأ بحرف س؟",e:"🔤"'), "س question must use the neutral 🔤 emoji");
  // F6: the easy distinct-word swaps (word → its picture, per letter).
  const lessons = read("lessons.js");
  const entry = letter => {
    const m = lessons.match(new RegExp("\\{letter:\"" + letter + '",name:"[^"]*",forms:\\[[^\\]]*\\],words:\\[([^\\]]*)\\],emoji:\\[([^\\]]*)\\]'));
    assert.ok(m, "letter entry not found: " + letter);
    return { words: JSON.parse("[" + m[1] + "]"), emoji: JSON.parse("[" + m[2] + "]") };
  };
  const expectWord = (letter, word, pic) => {
    const e = entry(letter);
    const i = e.words.indexOf(word);
    assert.ok(i >= 0, letter + " must use the distinct word " + word);
    assert.equal(e.emoji[i], pic, letter + " " + word + " must be pictured " + pic);
  };
  expectWord("س", "قَوْس", "🏹");
  expectWord("ر", "قِرْد", "🐒");
  expectWord("ف", "سَفِينَة", "🚢");
  expectWord("ك", "مَلِك", "👑");
  expectWord("م", "عَلَم", "🚩");
  expectWord("ي", "سَيَّارَة", "🚗");
  expectWord("ب", "بَاب", "🚪");
  expectWord("ط", "مِطْبَخ", "🍳");
  expectWord("ل", "عَسَل", "🍯");
  expectWord("ن", "لَوْن", "🎨");
  // F7: عصفور is a bird, not a chick.
  const ain = entry("ع");
  assert.equal(ain.emoji[ain.words.indexOf("عُصْفُور")], "🐦", "عصفور must be 🐦");
});

// ---------- ITEM 3: pronunciation challenge, parent-judged ----------
test("item 3: pronunciation challenge is parent-judged — no dead mic, no «غير مدعومة»", () => {
  const voice = read("voice.js").replace(/\/\/[^\n]*/g, "");
  assert.ok(!voice.includes("SpeechRecognition"), "no SpeechRecognition may remain in voice.js");
  assert.ok(!voice.includes("غير مدعومة"), "the «غير مدعومة» message must be gone");
  assert.ok(voice.includes('id="pronounceCorrect"'), "parent-judged 👍 button must exist");
  assert.ok(voice.includes("👍 نطقها صح"), "correct button must be labelled 👍 نطقها صح");
  assert.ok(voice.includes('id="pronounceRetry"'), "🔄 try-again button must exist");
  assert.ok(voice.includes("🔄 جرّب تاني"), "retry button must be labelled 🔄 جرّب تاني");
  assert.ok(voice.includes("ماما أو بابا يسمعوا ماثيو"), "the parent instruction must be shown");
  assert.ok(voice.includes('id="pronounceListen"'), "listen button must stay");
});

// ---------- ITEM 10: yellow is a true clear yellow ----------
test("item 10: palette yellow is a true clear yellow, distinct from orange; the number glyph stays readable", () => {
  const cg = read("color-games.js");
  const yellow = cg.match(/\{ id: "yellow", name: "أصفر", hex: "([^"]+)", text: "([^"]+)"(?:, glyph: "([^"]+)")? \}/);
  assert.ok(yellow, "yellow palette entry not found");
  assert.equal(yellow[1], "#ffeb3b", "yellow hex must be true clear yellow #ffeb3b, got " + yellow[1]);
  assert.equal(yellow[2], "#5b3c00", "yellow text must stay dark");
  assert.equal(yellow[3], "#f9a825", "yellow number glyph must use the dark amber (bright yellow on white is unreadable)");
  const rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const dist = (a, b) => Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0));
  assert.ok(dist(rgb("#ffeb3b"), rgb("#fb8c00")) > 100, "yellow and orange must be visually distinct (RGB distance > 100)");
  assert.ok(dist(rgb("#f9a825"), rgb("#fb8c00")) < 60, "guard: the OLD amber really was near-identical to orange");
  // No other #f9a825 fill may remain (only the glyph field).
  const noComments = cg.replace(/\/\/[^\n]*/g, "");
  assert.equal((noComments.match(/#f9a825/g) || []).length, 1, "#f9a825 must appear exactly once (the glyph field)");
  assert.ok(cg.includes("(col.glyph || col.hex)"), "split-button number must use the glyph tone");
});

// ---------- ITEM 11: the fish is gone from the colors game ----------
test("item 11: the 🐟 fish is removed from the nature game (8 items → 7)", () => {
  const cg = read("color-games.js");
  const nature = cg.slice(cg.indexOf("const NATURE = ["), cg.indexOf("const NATURE_PALETTE"));
  assert.equal((nature.match(/emoji: "/g) || []).length, 7, "NATURE must hold 7 items, got " + (nature.match(/emoji: "/g) || []).length);
  assert.ok(!nature.includes("🐟"), "no fish emoji may remain in NATURE");
  assert.ok(!nature.includes("سمكة"), "no سمكة item may remain in NATURE");
  assert.ok(!nature.includes("السمكة زرقا"), "the fish fact must be gone with the item");
});

// ---------- ITEM 12: coloring-workshop fixed-top layout ----------
test("item 12: coloring workshop pins the top (picture/round/question) and scrolls the colors below", () => {
  const cg = read("color-games.js");
  for (const fn of ["renderNumbers", "renderNature", "renderPatterns"]) {
    const start = cg.indexOf("function " + fn + "()");
    const end = cg.indexOf("\n  }", start);
    const body = cg.slice(start, end);
    const paletteAt = body.indexOf('<div class="cg-palette');
    const listenAt = body.indexOf("اسمع السؤال</button>");
    assert.ok(paletteAt > 0 && listenAt > 0, fn + " must have a palette and a listen button");
    assert.ok(paletteAt > listenAt, fn + ": the palette must come AFTER the sticky top (listen button), not inside it");
    assert.ok(body.includes('<div class="cg-sticky">'), fn + " must keep the sticky top");
    assert.ok(!body.includes('class="cg-palette"') || paletteAt > body.indexOf("</div>", body.indexOf("cg-sticky")),
      fn + ": the palette must sit outside the sticky container");
  }
});

// ---------- ITEM 13: system back button ----------
test("item 13: system back button — History API in app.js + MatthewNav sub-screens", () => {
  const app = read("app.js");
  assert.ok(app.includes("window.MatthewNav"), "MatthewNav must be exposed for the modules");
  assert.ok(app.includes("history.pushState"), "screens must push history states");
  assert.ok(app.includes('window.addEventListener("popstate"'), "popstate must be handled");
  assert.ok(app.includes("history.back()"), "system back must go through history");
  assert.ok(app.includes("history.go(-"), "closing a screen must unwind the stale history entries");
  assert.ok(app.includes("__matthewBack"), "popstate must run the same close as the on-screen back button");
  assert.ok(app.includes("pushSubscreen") && app.includes("popSubscreen"), "sub-screen push/pop must exist");
  assert.match(app, /const goHome[\s\S]*?history\.go\(-steps\)/, "goHome must unwind the history stack");
  assert.match(app, /"backbutton"[\s\S]*?if \(navDepth > 0\) \{ try \{ history\.back\(\)/, "Cordova back must go through history first");
  // Sub-screen wiring in the three owned modules: push on open, history
  // back on the on-screen back button, same close via the hook.
  for (const [f, hook] of [["chess.js", "openMenu"], ["rescue.js", "openPicker"], ["lessons.js", "toPicker"]]) {
    const src = read(f);
    assert.ok(src.includes("pushSubscreen()"), f + " must push a sub-screen entry");
    assert.ok(src.includes("MatthewNav?.back()"), f + " back must go through history");
    assert.ok(src.includes("popSubscreen()"), f + " direct closes must unwind the sub-screen entry");
  }
});

// ---------- ITEM 14a: rescue intro sequencing ----------
test("item 14a: rescue question waits for the intro to finish (onDone, not a timeout)", () => {
  const vc = read("voice-clips.js");
  assert.ok(vc.includes("playSequence = (texts, lang, onDone)"), "playSequence must take onDone");
  assert.match(vc, /audio\.onended = null; done\(\); return;/, "onDone must fire when the last clip ends");
  assert.ok(vc.includes("setTimeout(done, 0)"), "onDone must fire async when there is nothing to play");
  const voice = read("voice.js");
  assert.ok(voice.includes('speakSequence = (texts, lang = "ar-EG", onDone)'), "speakSequence must pass onDone through");
  assert.ok(voice.includes("playSequence(list, lang, onDone)"), "speakSequence must hand onDone to the clip runtime");
  const rescue = read("rescue.js");
  assert.ok(rescue.includes("speakSeq([story.intro, s.line], () => nextQuestion())"), "stage 0 must wait for intro+line to finish");
  assert.ok(rescue.includes("speakSeq([s.line], () => nextQuestion())"), "other stages must wait for the stage line to finish");
  const startStage = rescue.slice(rescue.indexOf("const startStage"), rescue.indexOf("const nextQuestion")).replace(/\/\/[^\n]*/g, "");
  assert.equal((startStage.match(/nextQuestion\(\)/g) || []).length, 2, "startStage must call nextQuestion only via the two onDone callbacks");
  assert.equal((startStage.match(/\(\) => nextQuestion\(\)/g) || []).length, 2, "both nextQuestion calls must be onDone callbacks");
});

// ---------- ITEM 14b: every rescue intro + stage line resolves to a recorded clip ----------
test("item 14b: every rescue intro + stage line resolves to a recorded clip in the packs", () => {
  const { BY_KEY, keyFor } = getClipMaps();
  const rescue = read("rescue.js");
  const texts = [...rescue.matchAll(/(?:intro|line): "([^"]+)"/g)].map(m => m[1]);
  assert.equal(texts.length, 20, "must find 4 intros + 16 stage lines, got " + texts.length);
  for (const t of texts) {
    const key = keyFor(t);
    assert.ok(key, "no clip resolves for rescue text: " + t);
    assert.ok(BY_KEY[key], "clip key " + key + " is not in the packs for: " + t);
  }
});

// ---------- ITEMS 4+17: Aria intros in the workshop; the game is لون العدد ----------
test("items 4+17: workshop intros are Aria clips (cg_intro_*) and the game is لون العدد", () => {
  const cg = read("color-games.js");
  assert.ok(cg.includes('const CG_INTRO_COLOR = "يلا نلوّن يا ملك ماثيو! اختار لون حلو ولوّن معايا!"'), "workshop opener must be the Aria clip");
  assert.ok(cg.includes('const CG_INTRO_NUM = "لعبة لون العدد يا بطلي ماثيو! شوف الرقم على التاج ودوس على نفس الرقم في الزر!"'), "numbers intro must be the Aria clip with the new name");
  assert.ok(!cg.includes("NANCY_INTRO") && !cg.includes("nancy_intro_color"), "no Nancy intro may remain in the workshop");
  assert.ok(cg.includes("🔢 لون العدد"), "tab must be named لون العدد");
  assert.ok(!cg.includes("لوني العدد"), "the old name لوني العدد must be gone");
  const { keyFor, BY_KEY } = getClipMaps();
  for (const t of ["يلا نلوّن يا ملك ماثيو! اختار لون حلو ولوّن معايا!", "لعبة لون العدد يا بطلي ماثيو! شوف الرقم على التاج ودوس على نفس الرقم في الزر!"]) {
    const key = keyFor(t);
    assert.ok(key, "no clip resolves for workshop intro: " + t);
    assert.ok(BY_KEY[key], "workshop intro clip " + key + " is not in the packs");
  }
});

// ---------- ITEM 18: exactly one listen button ----------
test("item 18: exactly one «اسمع السؤال» button in the main quiz", () => {
  const voice = read("voice.js");
  assert.ok(voice.includes('area.querySelector("#replayBtn")'), "ensureQuestionButton must check for the static #replayBtn");
  assert.match(voice, /if \(!area \|\| area\.querySelector\("\.speak-question"\) \|\| area\.querySelector\("#replayBtn"\)\) return;/,
    "guard must skip when either button already exists");
  assert.ok(read("index.html").includes('id="replayBtn"'), "static replay button must stay as the one working path");
});

// ---------- ITEM 19: tr_ar_* full letter names (pack bytes, not corpus text) ----------
test("item 19: tr_ar_* shipped packs must not contain the defective single-letter bytes", () => {
  // The 28 tr_ar_* clips were generated from single letters in ar_SA and
  // sound like English letter names (Whisper heard «B. B.» for ب). The
  // audio worker re-recorded them with full Arabic names (باء، تاء...);
  // the corpus text stays the bare letter, so this test guards the SHIPPED
  // PACK BYTES against the known-defective old bytes (md5 of the base64
  // clip, captured from the un-rebuilt packs before the fix shipped).
  const { BY_KEY } = getClipMaps();
  const DEFECTIVE = {
    "tr_ar_0": "3cb573621352531b6d7004927912e5b5", "tr_ar_1": "2fe71a1dc630d63138fc1e86af95a204",
    "tr_ar_2": "27963a4586ed1106655d62af1a0f32f9", "tr_ar_3": "684602407e94958bf14218e4e9c345a3",
    "tr_ar_4": "b8c06adaa643d4bda59ce4f34f0ecabe", "tr_ar_5": "0fd566b47f1648695127db1007416f4a",
    "tr_ar_6": "47249328d7fb3a2ce38a0878eaee4a1f", "tr_ar_7": "e21c8eccf2cf615dc6fee63c4f71f05a",
    "tr_ar_8": "746037b5d8a09f2d7bc7585b45ee2f8c", "tr_ar_9": "5150772bedcd7dbcb3f1602dba4a2596",
    "tr_ar_10": "881e65d8bbdaeb49d5a546ad62211c45", "tr_ar_11": "8d40633c7d8f57a60b792e6b681e9353",
    "tr_ar_12": "59ee9549b4fb15f3122702383bb54027", "tr_ar_13": "ed505a1ffa916348ed213e51a5f744f8",
    "tr_ar_14": "7bd7464b5bee2fc67997a689b7ba7491", "tr_ar_15": "e75421832eaec0e837c56177e82bfe05",
    "tr_ar_16": "f8aba0a59f8039586cf3fa755aa28521", "tr_ar_17": "2f357ef96499d80bd998cbe652a1fe23",
    "tr_ar_18": "e1a9b98ddb5b23e6bf741b574b81cfc5", "tr_ar_19": "0554aa48e7b93a4fd01852cc1695aead",
    "tr_ar_20": "2cc392cc123e374f690ba68eab1bb438", "tr_ar_21": "bf0ff1cad28832e95243b78c4272f345",
    "tr_ar_22": "9a7f92ea03fd3ea8bd3aa75294c4836c", "tr_ar_23": "e4b95b0d6b5fcb9e535e0c9fdb8f9019",
    "tr_ar_24": "6d148cc4627cc85456fc43422a5bd6ca", "tr_ar_25": "aa1750083808d6016b805151306d74bb",
    "tr_ar_26": "e4312329fd47b94315aeacca0334bf98", "tr_ar_27": "29f160ed9fd7d3c7ff25ad13c26feae0"
  };
  for (let i = 0; i < 28; i++) {
    const k = "tr_ar_" + i;
    assert.ok(BY_KEY[k], "pack must contain " + k);
    const md5 = crypto.createHash("md5").update(BY_KEY[k]).digest("hex");
    assert.notEqual(md5, DEFECTIVE[k], k + " still ships the defective single-letter bytes");
  }
});

// ---------- ITEM 21: ans_* audio shift ----------
test("item 21: every ans_* text-map entry resolves to a clip key present in the packs", () => {
  const { BY_KEY } = getClipMaps();
  const keys = ansKeysUniverse();
  assert.ok(keys.size >= 200, "ans_* universe must be ~207 keys, got " + keys.size);
  const missing = [...keys].filter(k => !BY_KEY[k]);
  assert.deepEqual(missing, [], "ans_* keys missing from the packs: " + missing.join(", "));
});

test("item 21: ans-audit.json records a verified status for EVERY ans_* key (hard test)", () => {
  const keys = ansKeysUniverse();
  // HARD: the audio worker's full ans_* audit must exist — if it is not
  // there yet, this test fails and the round reports it as pending; the
  // test is never weakened to pass without the audit.
  assert.ok(fs.existsSync(path.join(root, "audio-src", "ans-audit.json")),
    "audio-src/ans-audit.json is missing — the ans_* audit has not landed yet");
  const audit = JSON.parse(read("audio-src/ans-audit.json"));
  const OK = new Set(["match", "ok", "verified", "re-recorded", "remapped", "remapped-with-verification", "fixed"]);
  const missing = [], bad = [];
  for (const k of keys) {
    const entry = audit[k];
    if (!entry) { missing.push(k); continue; }
    const status = typeof entry === "string" ? entry : entry.status;
    if (!OK.has(status)) bad.push(k + "=" + status);
  }
  assert.deepEqual(missing, [], "ans_* keys missing from the audit: " + missing.slice(0, 10).join(", ") + (missing.length > 10 ? " …(+" + (missing.length - 10) + ")" : ""));
  assert.deepEqual(bad, [], "ans_* keys not verified: " + bad.slice(0, 10).join(", "));
  // The elephant question's answers are the proved shift case.
  const e336 = audit["ans_336"];
  assert.ok(e336 && OK.has(typeof e336 === "string" ? e336 : e336.status), "ans_336 (خرطومه) must be verified");
});

// ---------- LAYOUT OVERLAPS: home FAB + الرئيسية badge ----------
test("layout overlaps: content scrolls clear of the home FAB; the الرئيسية badge flows in the header", () => {
  const styles = read("styles.css");
  assert.ok(styles.includes("main{padding-bottom:110px}"), "main must have bottom padding clearing the 56px home FAB");
  assert.ok(styles.includes(".quiz-top{flex-wrap:wrap;gap:8px}"), "quiz-top must wrap instead of crowding the title");
  assert.ok(styles.includes(".quiz-top .back{"), "the header back button must be the small in-flow variant");
  assert.match(styles, /\.quiz-top strong\{flex:1 1 auto;min-width:0;text-align:center\}/, "the header title must flex and centre");
  assert.ok(styles.includes(".answer.digit-only{font-size:52px;font-weight:900}"), "digit-only answers must render big");
});

// ---------- COORDINATOR FIXES: tracing yellow, brave digit answers, brave sequencing ----------
// (code-worker flags: tracing.js:63 yellow, stories.js:318 digit doubling,
// stories.js intro→question 350ms cutoff — same defect class as rescue 14a)
test("tracing yellow is the true clear yellow, not the old amber", () => {
  const tracing = read("tracing.js");
  assert.ok(tracing.includes('{ c: "#ffeb3b", n: "أصفر" }'), "tracing yellow must be #ffeb3b like the palette");
  assert.ok(!tracing.includes("#f9a825"), "the old amber #f9a825 must not remain in tracing.js");
});

test("brave stories: pure-digit answers render label-only once (no picture slot)", () => {
  const stories = read("stories.js");
  const html = stories.slice(stories.indexOf("function questionHTML"), stories.indexOf("// ---------- DOM wiring"));
  assert.ok(html.includes("digit-only"), "questionHTML must mark digit answers digit-only");
  assert.ok(html.includes("/^[0-9٠-٩]+$/.test(String(item.text).trim())"), "questionHTML must detect pure-digit answers");
  assert.ok(html.includes("isDigit ? '<span class=\"answer-label\">'"), "digit answers must render label-only");
});

test("brave stories: intro chains by real completion (onDone), never by timeout", () => {
  const stories = read("stories.js");
  assert.ok(!stories.includes("}, 4500)"), "the guessed 4.5s intro timeout must be gone");
  assert.ok(stories.includes("playKey(key, onDone)"), "brave speak() must chain on playKey completion");
  assert.ok(stories.includes("speakSequence([text], \"ar-EG\", onDone)"), "brave speak() fallback must chain on sequence completion");
  const startStage = stories.slice(stories.indexOf("const startStage = first"), stories.indexOf("const narrateQuestion"));
  assert.ok(startStage.includes("speakSeq([story.intro, s.line], guard(() => nextQuestion()))"), "stage 0 must wait for intro+line to finish");
  assert.ok(startStage.includes("guard(() => nextQuestion())"), "later stages must wait for the stage line to finish");
  assert.equal((startStage.match(/nextQuestion\(\)/g) || []).length, 2, "startStage must call nextQuestion only via the two onDone callbacks");
});

test("playKey takes onDone and fires it once on end (or async when unplayable)", () => {
  const vc = read("voice-clips.js");
  assert.ok(vc.includes("const playKey = (key, onDone)"), "playKey must take onDone");
  assert.ok(vc.includes("audio.onended = typeof onDone === \"function\" ? done : null"), "playKey must fire onDone from audio.onended");
  assert.ok(vc.includes("setTimeout(done, 0); return false;"), "playKey must fire onDone async when there is nothing to play");
});

test("speakSequence debounce never swallows a chained (onDone) call", () => {
  const voice = read("voice.js");
  assert.ok(voice.includes('typeof onDone !== "function") return true'), "the 300ms debounce must not apply when onDone is present");
});
