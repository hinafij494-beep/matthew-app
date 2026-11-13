// tests/science-chunking.test.js — Round 3.2.2 §7 / P2: long science lessons
// are chunked into steps.
//
// Review 3.2.2 §7: 7 science lessons are over 50 words (longest 71) and show
// as one long wall of text/speech. The fix is DISPLAY-ONLY: the lesson text
// is never changed (full written explanation stays intact, every sci_* clip
// still maps to title + short + long), the presentation is sliced into 2-3
// steps at sentence boundaries, and the lesson's ONE clip still plays once
// (auto-play on the first step only; 🔊 اسمع الشرح replays the whole lesson
// from any step).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const api = require(path.join(root, "science.js"));
const src = fs.readFileSync(path.join(root, "science.js"), "utf8");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
// jsdom is a dev-only dependency (see package.json). CI runs `npm test`
// with no install step, so the two live-DOM tests below skip there and
// run wherever jsdom is installed (local dev — full suite is 212 pass).
let JSDOM = null;
try {
  ({ JSDOM } = require("jsdom"));
} catch {
  JSDOM = null;
}
const skipDom = !JSDOM;

const wc = (t) => String(t).trim().split(/\s+/).filter(Boolean).length;
const lessons = [...src.matchAll(/\["([^"]+)","([^"]+)","([^"]+)","([^"]+)"\]/g)]
  .map((m) => ({ title: m[1], icon: m[2], short: m[3], long: m[4] }));
const byTitle = new Map(lessons.map((l) => [l.title, l]));

// The 7 long lessons from review 3.2.2 §7, with their exact word counts
// (counted on the long explanation text, lesson[3] — the longest is 71).
const LONG_SEVEN = [
  ["المغناطيس العجيب", 66, [32, 19, 15]],
  ["يطفو ولا يغوص؟", 71, [27, 24, 20]],
  ["البرق والرعد", 55, [23, 12, 20]],
  ["فقاعات الصابون", 52, [26, 26]],
  ["السكر بيختفي في المية", 60, [18, 20, 22]],
  ["التلج والمية", 62, [20, 28, 14]],
  ["الشمس", 56, [27, 29]],
];

test("exactly the 7 review-§7 lessons are over 50 words, with the review's counts", () => {
  assert.equal(lessons.length, 48, "expected 48 lessons, got " + lessons.length);
  const over = lessons.filter((l) => wc(l.long) > 50);
  assert.deepEqual(
    over.map((l) => [l.title, wc(l.long)]),
    LONG_SEVEN.map(([t, w]) => [t, w]),
    "the >50-word set must match review 3.2.2 §7 exactly",
  );
  assert.equal(Math.max(...lessons.map((l) => wc(l.long))), 71, "longest lesson is 71 words");
});

test("each of the 7 long lessons splits into 2-3 steps, nothing dropped or added", () => {
  for (const [title, total, stepWords] of LONG_SEVEN) {
    const steps = api.scienceStepsFor(byTitle.get(title).long);
    assert.ok(steps.length >= 2 && steps.length <= 3,
      title + ": expected 2-3 steps, got " + steps.length);
    assert.deepEqual(steps.map(wc), stepWords, title + ": step word counts");
    // Joining the steps rebuilds the original text EXACTLY (same sentences,
    // same order, nothing dropped, nothing added).
    assert.equal(steps.join(" "), byTitle.get(title).long, title + ": steps must rebuild the full text");
    assert.equal(steps.reduce((n, s) => n + wc(s), 0), total, title + ": total words preserved");
    // No step is a wall of text any more, and no sentence is cut in half.
    for (const s of steps) {
      assert.ok(wc(s) <= 35, title + ": step too long (" + wc(s) + " words): " + s.slice(0, 40));
      assert.match(s, /[.!؟]$/, title + ": each step must end at a sentence boundary");
    }
  }
});

test("the other 41 lessons stay a single step, text untouched", () => {
  const longTitles = new Set(LONG_SEVEN.map(([t]) => t));
  for (const l of lessons) {
    if (longTitles.has(l.title)) continue;
    assert.ok(wc(l.long) <= 50, l.title + ": short lesson over 50 words?");
    assert.deepEqual(api.scienceStepsFor(l.long), [l.long],
      l.title + ": short lessons must render as one step, exactly as before");
  }
});

test("chunkScienceSteps: sentence grouping, 3-step cap, no mid-sentence cuts", () => {
  // One sentence never splits, even when it alone exceeds the step cap.
  const oneLong = "كلمة ".repeat(40).trim() + ".";
  assert.deepEqual(api.chunkScienceSteps(oneLong), [oneLong]);
  // Short text stays one step.
  assert.deepEqual(api.chunkScienceSteps("الشمس بتنور الدنيا."), ["الشمس بتنور الدنيا."]);
  // Five 29-word sentences would greedily make 5 steps — capped at 3,
  // still whole sentences, still rebuilding the original exactly.
  const five = Array.from({ length: 5 },
    () => "واحد اثنان ثلاثة أربعة خمسة ستة سبعة ثمانية تسعة عشرة أحد عشر اثنا عشر ثلاثة عشر أربعة عشر خمسة عشر ستة عشر سبعة عشر ثمانية عشر تسعة عشر عشرون.").join(" ");
  assert.equal(wc(five), 145);
  const capped = api.chunkScienceSteps(five);
  assert.equal(capped.length, 3, "must cap at 3 steps, got " + capped.length);
  assert.equal(capped.join(" "), five, "capped steps must rebuild the full text");
  for (const s of capped) assert.match(s, /\.$/, "each merged step ends at a sentence boundary");
  // The 50-word boundary: 50 words stays one step, 51 words steps.
  const fifty = Array.from({ length: 5 }, () => "كلمة كلمة كلمة كلمة كلمة كلمة كلمة كلمة كلمة كلمة.").join(" ");
  assert.equal(wc(fifty), 50);
  assert.deepEqual(api.scienceStepsFor(fifty), [fifty]);
  assert.ok(api.scienceStepsFor(fifty + " كلمة.").length >= 2, "51 words must step");
});

test("lesson texts are untouched: the 7 long explanations keep their anchors", () => {
  const anchors = {
    "المغناطيس العجيب": "زي السحر بالظبط",
    "يطفو ولا يغوص؟": "يا ترى دي هتطفو ولا هتغوص؟",
    "البرق والرعد": "ما تخافش من الرعد",
    "فقاعات الصابون": "الفقاعة دي كرة صغيرة من الصابون",
    "السكر بيختفي في المية": "الذوبان يعني الحاجة بتذوب",
    "التلج والمية": "المية والتلج هما نفس الحاجة",
    "الشمس": "والشمس في الحقيقة نجم كبير",
  };
  for (const [title, anchor] of Object.entries(anchors)) {
    assert.ok(byTitle.get(title).long.includes(anchor), title + ": explanation text changed?");
  }
});

test("renderLesson shows one step at a time with Next/Back controls (source)", () => {
  const fn = src.slice(src.indexOf("function renderLesson"));
  assert.ok(fn.includes("scienceStepsFor(lesson[3])"), "renderLesson must step the long text");
  assert.ok(fn.includes('<p class="science-detail">\'+steps[step]+\'</p>'),
    "detail paragraph must show the current step, not the whole text");
  assert.ok(fn.includes('scienceStepPrev'), "step Back button missing");
  assert.ok(fn.includes('scienceStepNext'), "step Next button missing");
  assert.ok(fn.includes('science-step-indicator'), "step indicator (خطوة ١ من ٣) missing");
  assert.ok(fn.includes('science-step-dots'), "step dots missing");
  assert.ok(fn.includes("الخطوة اللي قبلها"), "step Back label must be Arabic");
  assert.ok(fn.includes("الخطوة اللي بعدها"), "step Next label must be Arabic");
  assert.ok(fn.includes("دي آخر خطوة"), "last step must say so instead of offering a next step");
  assert.ok(fn.includes('renderLesson(index,step-1,false)'), "step Back must re-render without auto-play");
  assert.ok(fn.includes('renderLesson(index,step+1,false)'), "step Next must re-render without auto-play");
  // The lesson pager itself is untouched (pinned by generalization2.test.js):
  // lesson Prev/Next still open the neighbouring lesson at step 0.
  assert.ok(fn.includes('renderLesson(Math.max(0,index-1))'), "lesson Prev must reset to step 0");
  assert.ok(fn.includes('renderLesson(index+1)'), "lesson Next must reset to step 0");
});

test("audio: the ONE sci_* clip still plays once — auto-play on step 0 only, Listen replays the whole lesson", () => {
  const fn = src.slice(src.indexOf("function renderLesson"));
  // The full lesson text (title + short + long) is spoken in exactly two
  // places: the 🔊 button and the guarded auto-play — never per step.
  // Round 3.2.3 item 9: the auto-play goes through a lessonText const so
  // the quiz offer can follow it in one sequence on the last lesson.
  assert.ok(fn.includes('const lessonText=lesson[0]+". "+lesson[2]+" "+lesson[3];'),
    "renderLesson must build the full-lesson text once");
  const fullSpeaks = [...fn.matchAll(/speak\(lessonText\)/g)];
  assert.equal(fullSpeaks.length, 1,
    "full-lesson speak via lessonText must appear once (auto-play), got " + fullSpeaks.length);
  assert.ok(fn.includes("speakSeq([lessonText,QUIZ_OFFER])"),
    "last lesson must sequence lesson then offer");
  assert.ok(fn.includes('panel.querySelector("#scienceListen").onclick=()=>speak(lesson[0]+". "+lesson[2]+" "+lesson[3]);'),
    "🔊 اسمع الشرح must keep playing the WHOLE lesson from any step");
  assert.ok(fn.includes("if(autoSpeak&&step===0){const tkN=++sciToken;setTimeout"),
    "auto-play must be guarded to the first step only");
  assert.ok(!fn.includes("speak(steps[step]"), "audio must never be split per step");
  assert.ok(fn.includes("else {sciToken++;"),
    "a step change must cancel a pending first-step auto-play timer");
});

test("step controls are big and styled like the lesson pager (CSS)", () => {
  assert.ok(css.includes(".science-steps{display:grid;grid-template-columns:1fr 1fr;gap:9px;"),
    "step buttons sit in the same 2-column grid as the lesson pager");
  assert.ok(css.includes(".science-steps button{display:flex;flex-direction:column;align-items:center;gap:0}"),
    "step buttons stack their arrow under the label like the lesson pager");
  assert.ok(css.includes(".science-step-indicator"), "step indicator styling missing");
  assert.ok(css.includes(".science-step-dots"), "step dots styling missing");
  assert.ok(css.includes(".science-steps button:disabled{opacity:.45"),
    "disabled step button must look disabled");
});

// --- Live DOM behaviour: drive the real renderLesson in jsdom ------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function openScienceDom() {
  const dom = new JSDOM(
    '<!DOCTYPE html><html><body><main><div id="gameList"></div>'
    + '<div id="learningList"></div><footer></footer></main></body></html>',
    { url: "http://localhost/", runScripts: "outside-only" },
  );
  const { window } = dom;
  const spoken = [];
  window.MatthewVoice = { speak: (t) => spoken.push(t), stop: () => {} };
  window.eval(src);
  const q = (s) => window.document.querySelector(s);
  return { window, spoken, q };
}

test("DOM: stepping through يطفو ولا يغوص؟ (71 words) — Next/Back, indicator, clip once", { skip: skipDom }, async () => {
  const { spoken, q } = openScienceDom();
  const lesson = byTitle.get("يطفو ولا يغوص؟");
  const full = lesson.title + ". " + lesson.short + " " + lesson.long;
  const steps = api.scienceStepsFor(lesson.long);
  assert.equal(steps.length, 3);

  q("#learningList .game-card").click();
  q('[data-subject="physics"]').click();
  q('[data-lesson="5"]').click();
  await sleep(250);

  // Step 1: first slice only, indicator ١ من ٣, Back disabled, clip played once.
  assert.equal(q(".science-detail").textContent, steps[0]);
  assert.ok(q(".science-step-indicator").textContent.includes("خطوة ١ من ٣"),
    "indicator must read خطوة ١ من ٣, got: " + q(".science-step-indicator").textContent);
  assert.equal(q(".science-step-dots").textContent, "●○○");
  assert.equal(q("#scienceStepPrev").disabled, true);
  assert.equal(q("#scienceStepNext").disabled, false);
  assert.equal(spoken.filter((t) => t === full).length, 1, "full clip must auto-play exactly once on open");

  // Step 2: Next shows the second slice, no re-play.
  q("#scienceStepNext").click();
  assert.equal(q(".science-detail").textContent, steps[1]);
  assert.ok(q(".science-step-indicator").textContent.includes("خطوة ٢ من ٣"));
  assert.equal(q(".science-step-dots").textContent, "○●○");
  assert.equal(q("#scienceStepPrev").disabled, false);
  assert.equal(spoken.filter((t) => t === full).length, 1, "stepping must not replay the clip");

  // Step 3: last slice, Next disabled and labelled as the last step.
  q("#scienceStepNext").click();
  assert.equal(q(".science-detail").textContent, steps[2]);
  assert.ok(q(".science-step-indicator").textContent.includes("خطوة ٣ من ٣"));
  assert.equal(q(".science-step-dots").textContent, "○○●");
  assert.equal(q("#scienceStepNext").disabled, true);
  assert.ok(q("#scienceStepNext").textContent.includes("دي آخر خطوة"));
  assert.equal(spoken.filter((t) => t === full).length, 1);

  // Back returns to step 2 with its exact text, still no re-play.
  q("#scienceStepPrev").click();
  assert.equal(q(".science-detail").textContent, steps[1]);
  assert.ok(q(".science-step-indicator").textContent.includes("خطوة ٢ من ٣"));
  assert.equal(spoken.filter((t) => t === full).length, 1);

  // 🔊 اسمع الشرح replays the WHOLE lesson from a middle step.
  q("#scienceListen").click();
  assert.equal(spoken.filter((t) => t === full).length, 2,
    "Listen must replay the full lesson clip from any step");

  // Lesson Next leaves the stepped lesson for the next one, at its step 0.
  q("#scienceNext").click();
  await sleep(250);
  const rain = byTitle.get("المطر");
  const rainFull = rain.title + ". " + rain.short + " " + rain.long;
  assert.equal(q(".science-detail").textContent, rain.long,
    "short lesson (29 words) shows its whole text in one step");
  assert.equal(q("#scienceStepNext"), null, "short lessons show no step controls");
  assert.equal(spoken.filter((t) => t === rainFull).length, 1,
    "the next lesson auto-plays its own clip once on open");

  // Lesson Prev returns to the stepped lesson, reset to step 1.
  q("#sciencePrev").click();
  await sleep(250);
  assert.equal(q(".science-detail").textContent, steps[0]);
  assert.ok(q(".science-step-indicator").textContent.includes("خطوة ١ من ٣"));
  assert.equal(spoken.filter((t) => t === full).length, 3,
    "re-opening a lesson auto-plays its clip once again (once per open, never per step)");
});

test("DOM: a short lesson has no step controls and speaks once (المطر, 29 words)", { skip: skipDom }, async () => {
  const { spoken, q } = openScienceDom();
  const lesson = byTitle.get("المطر");
  const full = lesson.title + ". " + lesson.short + " " + lesson.long;
  q("#learningList .game-card").click();
  q('[data-subject="physics"]').click();
  q('[data-lesson="6"]').click();
  await sleep(250);
  assert.equal(q(".science-detail").textContent, lesson.long);
  assert.equal(q("#scienceStepNext"), null);
  assert.equal(q("#scienceStepPrev"), null);
  assert.equal(q(".science-step-indicator"), null);
  assert.equal(spoken.filter((t) => t === full).length, 1);
});
