// Round 3.2.4 regression tests — the fixes the 3.2.4 live diagnosis found:
// voice.js speakSequence ReferenceError (blocker 1 — its runtime test
// replaced the string-only test in tests/round323.test.js), the fake
// haraka distractor (blocker 2), and the 🏠 FAB covering the lesson
// screen (blocker 3). Runtime tests use only Node builtins (vm), so they
// run in CI mode too — no test may reference files outside the repo.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");

// ---------- blocker 2: haraka questions (runtime) ----------
const REAL_HARAKA = ["الفتحة", "الضمة", "الكسرة", "السكون", "الشدة", "التنوين"];
const FOUR_MARKS = ["الفتحة", "الضمة", "الكسرة", "السكون"];

// Extract the REAL makeQuiz() from lessons.js and run it in a vm with a
// stub showQuiz() that captures the built quiz — so the test exercises
// the real question generation (including its random distractor draw),
// not a copy of the logic.
function loadMakeQuiz() {
  const src = read("lessons.js");
  const start = src.indexOf("function makeQuiz(){");
  const end = src.indexOf("// Round 3.2.2 P0-6 (audit)", start);
  assert.ok(start > 0 && end > start, "makeQuiz() not found in lessons.js");
  const lessons = vm.runInNewContext(
    "(" + src.match(/const lessons = (\[.*?\]);/s)[1] + ")",
    Object.create(null),
  );
  const marks = vm.runInNewContext(
    "(" + src.match(/const marks = (\[[\s\S]*?\n  \]);/)[1] + ")",
    Object.create(null),
  );
  assert.strictEqual(marks.length, 4, "marks must be the four haraka");
  const captured = [];
  const sandbox = {
    lessons, marks,
    quiz: [], quizIndex: 0, score: 0, moveBreakShown: false, step: 0,
    // Round 3.2.5 FAIL 2: makeQuiz() resets panel.dataset.finished — the
    // stub panel stands in for the real letterSchool section.
    panel: { dataset: {} },
    pushSub: () => {},
    showQuiz: () => { captured.push(...sandbox.quiz); },
  };
  const ctx = vm.createContext(sandbox);
  vm.runInContext(src.slice(start, end), ctx, { filename: "lessons.js#makeQuiz" });
  return { run: () => vm.runInContext("makeQuiz()", ctx), captured };
}

test("haraka questions use only real haraka names — no fake distractor (round 3.2.4 blocker 2)", () => {
  const lessons = read("lessons.js");
  assert.ok(!lessons.includes("حركة أخرى"), "lessons.js must not contain the fake distractor anywhere");
  assert.ok(
    lessons.includes('marks.map(x=>x.name).filter(n=>n!==m.name),"الشدة","التنوين"'),
    "haraka distractors must be drawn from the other marks + الشدة + التنوين",
  );
  const { run, captured } = loadMakeQuiz();
  for (let i = 0; i < 60; i++) run();
  const haraka = captured.filter((q) => q.q === "ما اسم الحركة في المقطع ده؟");
  // ~40 haraka questions expected across 60 quizzes (4 of 60 in the pool,
  // 10 sampled per quiz); 5 is a far-below-mean floor, so this cannot
  // flake on randomness.
  assert.ok(haraka.length >= 5, `expected many haraka questions across 60 quizzes, got ${haraka.length}`);
  for (const q of haraka) {
    assert.strictEqual(q.a.length, 4, "haraka question must offer exactly 4 options");
    assert.strictEqual(new Set(q.a).size, 4, "haraka options must be distinct: " + q.a.join(", "));
    for (const opt of q.a) assert.ok(REAL_HARAKA.includes(opt), "haraka option must be a real haraka name: " + opt);
    assert.ok(FOUR_MARKS.includes(q.a[q.c]), "haraka correct answer must be one of the four marks");
    assert.ok(!q.a.includes("حركة أخرى"), "fake distractor must never appear");
  }
});

// ---------- blocker 3: lesson screen clears the floating 🏠 button ----------
test("lesson screen clears the floating home FAB: tight word-card rects, narrow forms-listen button, bottom clearance (round 3.2.4 blocker 3)", () => {
  const styles = read("styles.css");
  assert.ok(
    styles.includes(".word-examples>div{display:flex;flex-direction:column;align-items:center"),
    "word-example cards must be a centred flex column so the emoji/word rects hug their glyphs instead of spanning the whole card under the FAB",
  );
  assert.ok(
    styles.includes("#letterSchool #formsListen{max-width:420px"),
    "the forms-listen button must be narrowed so its rect ends clear of the FAB zone",
  );
  assert.ok(
    styles.includes("#letterSchool{padding-bottom:32px}"),
    "the lesson panel needs extra bottom clearance so its last row scrolls clear of the FAB",
  );
  assert.ok(styles.includes("main{padding-bottom:110px}"), "main bottom padding clearing the FAB must stay");
});
