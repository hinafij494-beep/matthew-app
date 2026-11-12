// tests/generalization2.test.js — Round 3.2.1 generalization (notes 16, 19a, 21–25):
// science pager + pickers + universe voice coverage, rescue listen button +
// spoken/displayed match + horseback hero, voice single-narration + replay
// button + pronunciation auto-speak, result narration + quiz back target.
// Static + corpus-resolution checks (no browser needed).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = name => fs.readFileSync(path.join(root, name), "utf8");

// Same normalisation as voice-clips.js keyFor(): Arabic-Indic digits folded,
// diacritics stripped, punctuation -> space, lower-cased.
const DIGITS = { "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9" };
const norm = value => String(value || "")
  .replace(/[٠-٩]/g, c => DIGITS[c])
  .replace(/[ً-ٰٟـ]/g, "")
  .replace(/[^ء-يa-zA-Z0-9 ]/g, " ")
  .replace(/\s+/g, " ")
  .trim()
  .toLowerCase();

const corpus = JSON.parse(read("audio-src/corpus.json"));
const corpusNorms = new Set(corpus.map(e => norm(e.text)));
const corpusKeys = new Set(corpus.map(e => e.key));

const packedText = read("voice-clips-text-1.js");
const byText = {};
for (const m of packedText.matchAll(/__matthewClipText\.push\((\{.*?\})\);/gs)) {
  Object.assign(byText, JSON.parse(m[1]));
}

const sliceFn = (src, startMarker, endMarker) => {
  const start = src.indexOf(startMarker);
  const end = src.indexOf(endMarker, start);
  assert.ok(start >= 0, "missing " + startMarker);
  assert.ok(end > start, "missing " + endMarker);
  return src.slice(start, end);
};

// ---------- science.js ----------

test("science pager: stacked arrows under labels, last lesson points back to the list", () => {
  const science = read("science.js");
  assert.ok(science.includes('السابق<span class="pager-arrow">→</span>'), "prev needs a stacked → arrow");
  assert.ok(science.includes('"الدرس التالي"+\'<span class="pager-arrow">←</span>\''), "next needs a stacked ← arrow");
  assert.ok(science.includes('"→ اختار درساً آخر"'), "last lesson returns to the list, so its arrow points back (→)");
  assert.ok(!science.includes('اختار درساً آخر":"الدرس التالي")+\' ←'), "old forward arrow on the last-lesson button is gone");
  const css = read("styles.css");
  assert.ok(css.includes(".science-nav button{display:flex;flex-direction:column;align-items:center;gap:0}"), "stacked pager arrows need the flex-column rule");
});

test("science pickers are narrated on open", () => {
  const science = read("science.js");
  assert.ok(science.includes('speak("اختار عالم يا ملك ماثيو")'), "subject picker greeting");
  assert.ok(science.includes('speak("اختار درس يا ملك ماثيو")'), "lesson picker greeting");
});

test("science back navigation is hierarchical: lesson -> list -> subjects -> home", () => {
  const science = read("science.js");
  assert.ok(science.includes('querySelector("#scienceBack").onclick=renderLessons;'), "lesson back goes to its lesson list");
  assert.ok(science.includes('querySelector("#scienceBack").onclick=renderSubjects;'), "lesson-list back goes to subjects");
  assert.ok(science.includes('querySelector("#scienceBack").onclick=back;'), "subjects back goes home (never straight home from a lesson)");
});

test("universe lessons: every spoken string resolves to a recorded clip", () => {
  const science = read("science.js");
  const block = sliceFn(science, '{ id:"universe"', '{ id:"coding"');
  const lessons = [...block.matchAll(/\["(.*?)","(.*?)","(.*?)","(.*?)"\]/g)].map(m => m.slice(1));
  assert.equal(lessons.length, 8, "universe has 8 lessons (أيام الأسبوع added in 3.2.2)");
  lessons.forEach((lesson, i) => {
    const spoken = lesson[0] + ". " + lesson[2] + " " + lesson[3];
    assert.ok(corpusKeys.has("sci_5_" + i), "corpus key sci_5_" + i + " exists");
    assert.ok(corpusNorms.has(norm(spoken)), "universe lesson " + i + " resolves in the corpus: " + lesson[0]);
    assert.ok(norm(spoken) in byText, "universe lesson " + i + " resolves in the packed BY_TEXT map: " + lesson[0]);
  });
});

// ---------- rescue.js ----------

test("rescue questions have a '🔊 اسمع السؤال' replay button (question then choices)", () => {
  const rescue = read("rescue.js");
  const nextQuestion = sliceFn(rescue, "const nextQuestion", "const choose");
  assert.ok(nextQuestion.includes('textContent = "🔊 اسمع السؤال"'), "replay button label");
  assert.ok(nextQuestion.includes("speakSequence([replayQ, ...replayChoices]"), "replay speaks the question then the choices");
  assert.ok(!nextQuestion.includes("إعادة سماع السؤال"), "old replay label is gone");
});

test("rescue advance(): the spoken line matches the displayed interstitial", () => {
  const rescue = read("rescue.js");
  const advance = sliceFn(rescue, "const advance", "const win");
  assert.ok(advance.includes('textContent = "عدّيت مرحلة! كمّل كده وانت هتوصل…"'), "interstitial is displayed");
  assert.ok(advance.includes('speak("عدّيت مرحلة! كمّل كده وانت هتوصل…")'), "the same interstitial text is spoken");
  assert.ok(!advance.includes("closers"), "advance no longer plays a different closer clip");
});

test("rescue speaks the picker greeting and the displayed win story", () => {
  const rescue = read("rescue.js");
  assert.ok(rescue.includes('speak("أهلاً يا ملك ماثيو! كل قصة فيها مراحل وأسئلة جديدة كل مرة، اختار قصة وابدأ المغامرة يا بطل!", "storyPickerIntro")'), "picker greeting is spoken on open (reworded 3.2.2 P1-1, keyed clip)");
  const win = sliceFn(rescue, "const win", "const close");
  assert.ok(win.includes("speak(story.winStory)"), "win speaks the displayed winStory text");
  assert.ok(!win.includes("story.win,"), "win no longer speaks the (different) win text");
  assert.ok(!win.includes('feedback("correct")'), "no praise clip cutting the win narration off");
  assert.ok(rescue.includes("→ اختار قصة تانية 📖"), "story-list button points back");
  assert.ok(rescue.includes("→ العودة للمملكة"), "home button points back");
});

test("rescue stage/intro/win clips referenced by the stories exist in the corpus", () => {
  const rescue = read("rescue.js");
  const keys = new Set([
    ...[...rescue.matchAll(/introClip: "([^"]+)"/g)].map(m => m[1]),
    ...[...rescue.matchAll(/clip: "([^"]+)"/g)].map(m => m[1]),
    ...[...rescue.matchAll(/winClip: "([^"]+)"/g)].map(m => m[1]),
  ]);
  assert.ok(keys.size >= 20, "expected story clip keys, found " + keys.size);
  for (const key of keys) assert.ok(corpusKeys.has(key), "missing corpus clip: " + key);
});

test("rescue hero is Matthew on horseback with a sword, animated, face swappable", () => {
  const rescue = read("rescue.js");
  assert.ok(rescue.includes("<svg"), "hero is an illustrated SVG, not an emoji");
  assert.ok(rescue.includes('class="hero-face"'), "face is a separate swappable hero-face element");
  assert.ok(rescue.includes("horse-leg"), "horse has animated legs");
  assert.ok(rescue.includes("rescueGallop"), "gallop animation exists");
  assert.ok(rescue.includes("hero-cape"), "king has a flowing cape");
  assert.ok(rescue.includes("L150 10"), "king holds a raised sword");
  assert.ok(!rescue.includes('$("rescueHero").textContent'), "nothing overwrites the SVG hero with emoji text");
  assert.ok(rescue.includes('$("rescueHero").style.insetInlineStart'), "hero advances as stages complete");
  assert.ok(rescue.includes("stage * 19"), "hero position is by stage index");
});

// ---------- voice.js ----------

test("voice: the question is spoken once — no observer re-speak", () => {
  const voice = read("voice.js");
  assert.ok(!voice.includes("questionTimer"), "no 180ms re-speak timer left");
  assert.ok(!voice.includes("lastAutoQuestion"), "no duplicate-question guard left");
  const observer = sliceFn(voice, "const observeQuestions", "const observer =");
  assert.ok(!observer.includes("speak("), "observeQuestions no longer speaks at all");
  assert.ok(observer.includes("ensureQuestionButton(area)"), "observer still keeps the replay button present");
  assert.ok(!voice.includes("إعادة سماع السؤال"), "old replay label is gone everywhere in voice.js");
  assert.ok(voice.includes('button.textContent = "🔊 اسمع السؤال"'), "replay button label is standardised");
});

test("voice: مس نانسي joins the praise rotation fairly, old praise clips untouched", () => {
  const voice = read("voice.js");
  for (const key of ["praise1", "praise2", "praise3", "praise4", "praise5"]) {
    assert.ok(voice.includes('"' + key + '"'), key + " still in the rotation");
  }
  assert.ok(voice.includes('"praise_nancy"'), "praise_nancy in the rotation");
  const rotation = voice.match(/const praiseKeys = \[[^\]]+\]/);
  assert.ok(rotation, "praise rotation array exists");
  assert.equal((rotation[0].match(/"/g) || []).length, 12, "six praise keys (1-in-6 Nancy, not every time)");
  assert.ok(voice.includes('key === "praise_nancy"'), "falls back to praise1 if the Nancy clip is not packed yet");
});

test("voice: Nancy praise + gentle retry lines woven into feedback (note 25b)", () => {
  const voice = read("voice.js");
  const fallback = read("voice-web-fallback.js");
  for (let i = 1; i <= 10; i++) {
    assert.ok(voice.includes('"nancy_praise_' + i + '"'), "nancy_praise_" + i + " missing from the praise rotation");
  }
  for (let i = 1; i <= 5; i++) {
    assert.ok(voice.includes('"nancy_retry_' + i + '"'), "nancy_retry_" + i + " missing from the retry rotation");
  }
  assert.ok(voice.includes("const nancyPraiseKeys = ["), "Nancy praise lines live in their own rotation array (praiseKeys keeps its 6 keys)");
  assert.ok(voice.includes("const nancyRetryKeys = ["), "Nancy retry lines live in their own rotation array");
  assert.ok(voice.includes("correctCount % 3"), "Nancy praise every 3rd correct answer — regular, not every time");
  assert.ok(voice.includes("wrongCount % 2"), "Nancy retry every 2nd wrong answer");
  assert.ok(voice.includes('key.startsWith("nancy_praise_")'), "unpacked Nancy praise falls back to praise1, never silence");
  assert.ok(voice.includes('key.startsWith("nancy_retry_")'), "unpacked Nancy retry falls back to try1, never silence");
  assert.ok(fallback.includes('"nancy_praise_1"') && fallback.includes('"nancy_retry_1"'), "web fallback mirrors the Nancy rotation");
});

test("voice: pronunciation auto-speaks on open/new word, Arabic UI kept", () => {
  const voice = read("voice.js");
  const nextWord = sliceFn(voice, "const nextWord", "const setLanguage");
  assert.ok(nextWord.includes("speak(current.word"), "new word is pronounced automatically");
  assert.ok(voice.includes('كلمة جديدة<span class="pager-arrow">←</span>'), "new-word button has a stacked arrow");
  assert.ok(!voice.includes("كلمة جديدة ↻"), "old ↻ label is gone");
  assert.ok(voice.includes("الإنجليزية"), "English language button stays Arabic");
});

// ---------- app.js ----------

test("app finish(): result screen is narrated (score line + tip)", () => {
  const app = read("app.js");
  const finish = sliceFn(app, "function finish()", "function updateStats");
  // Round 3.2.2 P1-7: second-try correct answers score +0.5, so the line
  // uses fmtScore (Arabic digits + " ونص") — displayed and spoken are the
  // same construction.
  assert.ok(finish.includes('"جاوبت صح على "+fmtScore(score)+" من "+arabicDigits(questions.length)+" أسئلة"'), "score line is built as displayed");
  assert.ok(finish.includes("speakSequence([resultLine,resultTip]"), "score line + tip are narrated in order");
  assert.ok(finish.includes("برافو يا ملك ماثيو! انت بطل شاطر أوي!"), "pass tip present");
  assert.ok(finish.includes("محاولة جميلة يا بطل ماثيو! العب تاني وهتجيب نجوم أكتر!"), "encouraging retry tip present (no negative language)");
});

test("app quiz back button returns to the quiz category grid, not home", () => {
  const app = read("app.js");
  assert.ok(app.includes('$("backBtn").addEventListener("click",()=>{$("quiz").classList.add("hidden");$("gameList").classList.remove("hidden");'), "back shows the quiz category grid");
  const backLine = app.slice(app.indexOf('$("backBtn")'), app.indexOf('$("homeBtn")'));
  assert.ok(!backLine.includes("learningList"), "back does not unhide the learning list (home)");
});
