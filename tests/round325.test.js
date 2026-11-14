// Round 3.2.5 regression tests — the fixes the 3.2.4 live verification found:
// (1) inline-SVG word pictures render 0x0 (lessons.js word + haraka SVGs
// have no size); (2) letters quiz retry bounces to the picker
// (dataset.finished never reset); (3) tr_ar_15 (طاء) re-recorded with a
// drill input. Runtime tests use only Node builtins (vm), so they run in
// CI mode too — no test may reference files outside the repo.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const crypto = require("node:crypto");
const root = path.join(__dirname, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");

// ---------- FAIL 1: inline-SVG word pictures must render at emoji size ----------
test("word-picture SVGs render at emoji size, not 0x0 (round 3.2.5 FAIL 1)", () => {
  const styles = read("styles.css");
  // The sizing rule covers both SVG picture containers in lessons.js:
  // the word-example tiles and the haraka mark card.
  const rule = styles.match(/\.word-examples span svg,\.mark-card>span svg\{width:(\d+)px;height:(\d+)px/);
  assert.ok(rule, "styles.css must size .word-examples span svg and .mark-card>span svg");
  assert.ok(+rule[1] >= 30 && +rule[1] <= 38, "word-picture SVG width must be emoji size (30-38px), got " + rule[1]);
  assert.ok(+rule[2] >= 30 && +rule[2] <= 38, "word-picture SVG height must be emoji size (30-38px), got " + rule[2]);
  // Audit: every inline SVG in lessons.js is a word or haraka picture in
  // one of the sized containers (4 word + 3 haraka). A new unsized SVG
  // must come with a sizing rule — the count check makes it visible.
  const lessons = read("lessons.js");
  const svgCount = (lessons.match(/<svg /g) || []).length;
  assert.strictEqual(svgCount, 7, "lessons.js must have exactly 7 inline SVGs (4 word + 3 haraka), got " + svgCount);
  assert.ok(styles.includes(".explain-box p svg{width:1.5em;height:1.5em"), "explain-box SVG rule must stay (the inline sentence icon)");
  assert.ok(styles.includes(".answer-picture svg{width:38px;height:38px"), "main-quiz answer-picture SVG rule must stay");
});

// ---------- FAIL 2: letters quiz retry (finish -> retry -> q1 -> next = q2) ----------
function makeStubEl(tag) {
  return {
    tagName: (tag || "div").toUpperCase(),
    children: [],
    dataset: {},
    style: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    innerHTML: "",
    textContent: "",
    disabled: false,
    onclick: null,
    querySelectorAll: () => [],
    querySelector: () => makeStubEl("div"),
    appendChild(c) { this.children.push(c); return c; },
    append(c) { this.children.push(c); return c; },
    insertBefore(c) { this.children.push(c); return c; },
    addEventListener() {},
  };
}

function loadLetterSchool() {
  const byId = {};
  const created = [];
  const document = {
    getElementById: (id) => (byId[id] ||= makeStubEl("div")),
    createElement: (tag) => { const el = makeStubEl(tag); created.push(el); return el; },
    querySelector: () => makeStubEl("div"),
    querySelectorAll: () => [],
  };
  const window = { __qToken: 0 };
  const ctx = vm.createContext({ document, window, setTimeout: () => 0 });
  vm.runInContext(read("lessons.js"), ctx, { filename: "lessons.js" });
  const panel = created.find((e) => e.tagName === "SECTION");
  assert.ok(panel, "lessons.js must create the letterSchool panel section");
  return { byId, panel };
}

test("letters quiz retry: finish -> retry -> q1 -> next shows q2, not the picker (round 3.2.5 FAIL 2)", () => {
  const { byId, panel } = loadLetterSchool();
  const next = () => byId.lessonNext.onclick();
  // Start a quiz from the lesson screen (step starts at 0, so Next opens it).
  next();
  assert.ok(byId.lessonBody.innerHTML.includes("اختبار الملك ماثيو"), "q1 must show the quiz screen");
  assert.ok(byId.lessonStep.textContent.includes("١"), "q1 step must read 1 / 10, got " + byId.lessonStep.textContent);
  // Answer through all 10 questions: 9 Next taps reach q10, the 10th finishes.
  for (let i = 0; i < 9; i++) next();
  assert.ok(byId.lessonStep.textContent.includes("١٠"), "q10 step must read 10 / 10, got " + byId.lessonStep.textContent);
  next();
  assert.strictEqual(panel.dataset.finished, "1", "finishQuiz must mark the panel finished");
  assert.ok(byId.lessonBody.innerHTML.includes("اختبار جديد"), "finish screen must offer a retry");
  assert.strictEqual(typeof byId.retryLesson.onclick, "function", "retry button must have a handler");
  // Retry: a fresh quiz starts at q1.
  byId.retryLesson.onclick();
  assert.strictEqual(panel.dataset.finished, "0", "retry must reset dataset.finished (the 3.2.4 bug left it at 1)");
  assert.ok(byId.lessonStep.textContent.includes("١"), "retried quiz must start at q1, got " + byId.lessonStep.textContent);
  assert.ok(byId.lessonBody.innerHTML.includes("اختبار الملك ماثيو"), "retried quiz must show q1");
  // Next from retried q1 must show q2 — NOT bounce to the letter picker.
  next();
  assert.ok(byId.lessonStep.textContent.includes("٢"), "after retry, Next from q1 must show q2, got " + byId.lessonStep.textContent);
  assert.ok(byId.lessonBody.innerHTML.includes("اختبار الملك ماثيو"), "after retry, Next from q1 must stay in the quiz");
  assert.ok(!byId.lessonBody.innerHTML.includes("اختار حرف يا ملك ماثيو"), "after retry, Next from q1 must NOT return to the picker");
  assert.strictEqual(panel.dataset.finished, "0", "panel must stay unfinished during the retried quiz");
});

// ---------- FAIL 3: tr_ar_15 re-recorded with the drill input ----------
test("tr_ar_15 re-recorded with the طاء drill input (round 3.2.5 FAIL 3)", () => {
  const gen = read("gen6.js");
  assert.ok(gen.includes('tr_ar_15: "طاء، طاء."'), "gen6.js INPUT_OVERRIDES must drill tr_ar_15 like tr_ar_16");
  const corpus = JSON.parse(read("audio-src/corpus.json"));
  const entry = corpus.find((x) => x.key === "tr_ar_15");
  assert.ok(entry, "tr_ar_15 must exist in the corpus");
  assert.strictEqual(entry.text, "ط", "corpus text stays the bare glyph; only the TTS input is drilled");
  const oggPath = path.join(root, "audio-src/opus/tr_ar_15.ogg");
  const ogg = fs.readFileSync(oggPath);
  // The defective render was 1,268 B / 0.13 s audible; the drill render is
  // 3,645 B with two طاء utterances. A small file means the defect is back.
  assert.ok(ogg.length > 2500, "tr_ar_15 ogg must be the longer drill render, not the 1,268 B clipped one (got " + ogg.length + " B)");
  const oggMd5 = crypto.createHash("md5").update(ogg).digest("hex");
  assert.notStrictEqual(oggMd5, "bb18504574d35e67e1a196dbcd3e7da0", "tr_ar_15 ogg must not be the old defective render");
  // The shipped pack must carry the new clip, not the old one.
  // Round 3.2.8: the re-pack added a 17th chunk and chunk boundaries
  // shifted (tr_ar_15 moved to pack-17) — the requirement is that the
  // SHIPPED packs carry the new clip, not which file number holds it.
  const sandbox = { window: {} };
  sandbox.window = sandbox;
  const ctx = vm.createContext(sandbox);
  const packFiles = fs.readdirSync(root).filter((f) => /^voice-clips-pack-\d+\.js$/.test(f))
    .sort((a, b) => parseInt(a.match(/(\d+)\.js$/)[1], 10) - parseInt(b.match(/(\d+)\.js$/)[1], 10));
  for (const f of packFiles) vm.runInContext(read(f), ctx, { filename: f });
  const chunks = sandbox.__matthewClipData || [];
  const byKey = Object.assign({}, ...chunks);
  assert.ok(byKey.tr_ar_15, "the voice packs must contain tr_ar_15 (checked " + packFiles.join(", ") + ")");
  const packMd5 = crypto.createHash("md5").update(Buffer.from(byKey.tr_ar_15, "base64")).digest("hex");
  assert.strictEqual(packMd5, oggMd5, "packed tr_ar_15 must decode to the new ogg (pack md5 " + packMd5 + " vs ogg " + oggMd5 + ")");
});
