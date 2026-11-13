// tests/round326-lessons.test.js — Round 3.2.6 items 2+3: tabbed lessons
// (📖 الدرس / 🧕 الشرح / 🏆 الاختبار) and per-lesson quizzes (each
// lesson's quiz contains ONLY questions about THAT lesson).
// REAL runtime tests: the real module code runs in a vm with a hand-rolled
// stub DOM (no jsdom — the suite must also pass with node_modules moved
// aside for CI). Every test drives the real flows: open the lesson, switch
// all 3 tabs, check the explanation is spoken, and take the quiz checking
// EVERY question belongs to that lesson.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");

// ---------------------------------------------------------------- stub DOM --
// A small HTML parser + element tree: enough for the modules' innerHTML
// paints (buttons, ids, classes, data-* attrs, inline SVG, canvas).
const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
function decodeEntities(s) {
  return String(s).replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ");
}
function parseAttrs(str) {
  const attrs = {};
  const re = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let m;
  while ((m = re.exec(str))) attrs[m[1]] = m[2] !== undefined ? m[2] : m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : "";
  return attrs;
}
function datasetFrom(attrs) {
  const ds = {};
  for (const k of Object.keys(attrs)) {
    if (k.startsWith("data-")) ds[k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = attrs[k];
  }
  return ds;
}
class El {
  constructor(tag) {
    this.tagName = (tag || "div").toUpperCase();
    this.childNodes = []; // {type:"text",value} | El
    this.parent = null;
    this._attrs = {};
    this.dataset = {};
    this.style = {};
    this._class = new Set();
    this._listeners = {};
    this.onclick = null;
    this.disabled = false;
    this._html = "";
  }
  get children() { return this.childNodes.filter((n) => n instanceof El); }
  get id() { return this._attrs.id || ""; }
  set id(v) { this._attrs.id = String(v); }
  get className() { return [...this._class].join(" "); }
  set className(v) { this._class = new Set(String(v || "").split(/\s+/).filter(Boolean)); this._attrs.class = this.className; }
  get classList() {
    const self = this;
    return {
      add: (...c) => { c.forEach((x) => self._class.add(x)); self._attrs.class = self.className; },
      remove: (...c) => { c.forEach((x) => self._class.delete(x)); self._attrs.class = self.className; },
      contains: (c) => self._class.has(c),
      toggle: (c, f) => { const on = f === undefined ? !self._class.has(c) : !!f; if (on) self._class.add(c); else self._class.delete(c); self._attrs.class = self.className; return on; },
    };
  }
  get textContent() {
    return this.childNodes.map((n) => (n instanceof El ? n.textContent : n.value)).join("");
  }
  set textContent(v) {
    this.childNodes = [{ type: "text", value: String(v) }];
    this._html = String(v);
  }
  get innerHTML() {
    // Serialize the parsed tree (children created by parsing have no
    // stored _html); elements whose innerHTML was assigned directly keep
    // the assigned string only when they have no children.
    if (!this.childNodes.length) return this._html;
    return this.childNodes.map(serializeNode).join("");
  }
  set innerHTML(html) {
    this._html = String(html);
    this.childNodes = parseHTML(this._html, this);
  }
  append(child) { if (child.parent) child.remove(); child.parent = this; this.childNodes.push(child); return child; }
  insertBefore(child, ref) {
    if (child.parent) child.remove();
    child.parent = this;
    const i = ref ? this.childNodes.indexOf(ref) : -1;
    if (i === -1) this.childNodes.push(child); else this.childNodes.splice(i, 0, child);
    return child;
  }
  remove() {
    if (!this.parent) return;
    const i = this.parent.childNodes.indexOf(this);
    if (i !== -1) this.parent.childNodes.splice(i, 1);
    this.parent = null;
  }
  addEventListener(type, fn) { (this._listeners[type] = this._listeners[type] || []).push(fn); }
  removeEventListener(type, fn) {
    const l = this._listeners[type];
    if (l) { const i = l.indexOf(fn); if (i !== -1) l.splice(i, 1); }
  }
  querySelector(sel) { return queryAll(this, sel, true)[0] || null; }
  querySelectorAll(sel) { return queryAll(this, sel, false); }
  getBoundingClientRect() { return { left: 0, top: 0, width: 320, height: 320, right: 320, bottom: 320 }; }
  setPointerCapture() {}
}
function serializeNode(n) {
  if (!(n instanceof El)) return n.value;
  const attrs = Object.entries(n._attrs).map(([k, v]) => ' ' + k + '="' + String(v).replace(/"/g, "&quot;") + '"').join("");
  const tag = n.tagName.toLowerCase();
  if (VOID.has(tag)) return "<" + tag + attrs + ">";
  return "<" + tag + attrs + ">" + n.childNodes.map(serializeNode).join("") + "</" + tag + ">";
}
function parseHTML(html, owner) {
  const nodes = [];
  const stack = [{ el: owner, nodes }];
  let i = 0;
  const pushText = (t) => {
    if (!t) return;
    stack[stack.length - 1].nodes.push({ type: "text", value: decodeEntities(t) });
  };
  while (i < html.length) {
    const lt = html.indexOf("<", i);
    if (lt === -1) { pushText(html.slice(i)); break; }
    if (lt > i) pushText(html.slice(i, lt));
    if (html.startsWith("<!--", lt)) {
      const end = html.indexOf("-->", lt + 4);
      i = end === -1 ? html.length : end + 3;
      continue;
    }
    const gt = html.indexOf(">", lt);
    if (gt === -1) break;
    const raw = html.slice(lt + 1, gt);
    i = gt + 1;
    if (raw[0] === "/") {
      const name = raw.slice(1).trim().toLowerCase();
      while (stack.length > 1 && stack[stack.length - 1].el.tagName.toLowerCase() !== name) stack.pop();
      if (stack.length > 1) stack.pop();
      continue;
    }
    const selfClose = raw.endsWith("/");
    const space = raw.search(/\s/);
    const name = (space === -1 ? raw : raw.slice(0, space)).replace(/\/$/, "").toLowerCase();
    const attrs = parseAttrs(space === -1 ? "" : raw.slice(space));
    const el = name === "canvas" ? new CanvasEl() : new El(name);
    el._attrs = attrs;
    el.dataset = datasetFrom(attrs);
    if (attrs.class) el._class = new Set(attrs.class.split(/\s+/).filter(Boolean));
    if (attrs.style) {
      for (const part of attrs.style.split(";")) {
        const [k, v] = part.split(":").map((s) => s && s.trim());
        if (k) el.style[k.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = v || "";
      }
    }
    stack[stack.length - 1].nodes.push(el);
    el.parent = stack[stack.length - 1].el;
    if (!selfClose && !VOID.has(name)) stack.push({ el, nodes: el.childNodes });
  }
  return nodes;
}
// Fake 2D canvas context: strokes paint a vertical bar (x 150–170 of 320)
// so a finger stroke down the middle covers the guide mask.
function makeFakeCtx() {
  const ctx = {
    fillStyle: "", strokeStyle: "", lineWidth: 1, lineCap: "", lineJoin: "",
    font: "", textAlign: "", textBaseline: "", globalCompositeOperation: "",
    clearRect() {}, fillRect() {}, fillText() {}, strokeText() {},
    beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, arc() {}, fill() {},
    save() {}, restore() {}, drawImage() {}, closePath() {}, setLineDash() {},
    getImageData(x, y, w, h) {
      const data = new Uint8ClampedArray(w * h * 4);
      const bx0 = Math.round((150 * w) / 320), bx1 = Math.round((170 * w) / 320);
      for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
        if (px >= bx0 && px < bx1) data[(py * w + px) * 4 + 3] = 255;
      }
      return { data, width: w, height: h };
    },
  };
  return ctx;
}
class CanvasEl extends El {
  constructor() { super("canvas"); this._ctx = null; }
  getContext() { if (!this._ctx) this._ctx = makeFakeCtx(); return this._ctx; }
}
// --- selector engine: #id, .class, tag, [attr], [attr="v"], compounds,
// descendant (space) and child (>) combinators -------------------------------
function matchSimple(el, sel) {
  if (!(el instanceof El)) return false;
  let rest = sel;
  const tag = rest.match(/^[a-zA-Z][a-zA-Z0-9-]*/);
  if (tag) { if (el.tagName.toLowerCase() !== tag[0].toLowerCase()) return false; rest = rest.slice(tag[0].length); }
  while (rest.length) {
    if (rest[0] === "#") {
      const m = rest.match(/^#([^\s.#[]+)/);
      if (!m || el.id !== m[1]) return false;
      rest = rest.slice(m[0].length);
    } else if (rest[0] === ".") {
      const m = rest.match(/^\.([^\s.#[]+)/);
      if (!m || !el._class.has(m[1])) return false;
      rest = rest.slice(m[0].length);
    } else if (rest[0] === "[") {
      const m = rest.match(/^\[([^\s=\]]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\]]+)))?\]/);
      if (!m) return false;
      const v = el._attrs[m[1]];
      if (v === undefined) return false;
      const want = m[2] !== undefined ? m[2] : m[3] !== undefined ? m[3] : m[4];
      if (want !== undefined && v !== want) return false;
      rest = rest.slice(m[0].length);
    } else return false;
  }
  return true;
}
function queryAll(root, selector, firstOnly) {
  const tokens = [];
  let buf = "", comb = " ";
  for (let i = 0; i < selector.length; i++) {
    const c = selector[i];
    if (c === ">") { if (buf.trim()) tokens.push([comb, buf.trim()]); buf = ""; comb = ">"; }
    else if (c === " ") { if (buf.trim()) { tokens.push([comb, buf.trim()]); buf = ""; comb = " "; } }
    else buf += c;
  }
  if (buf.trim()) tokens.push([comb, buf.trim()]);
  const out = [];
  const walk = (el) => {
    for (const ch of el.children) {
      if (matchesChain(ch, tokens.length - 1)) { out.push(ch); if (firstOnly) return true; }
      if (walk(ch) && firstOnly) return true;
    }
    return false;
  };
  function matchesChain(el, ti) {
    if (ti < 0) return true;
    const [comb, sel] = tokens[ti];
    if (!matchSimple(el, sel)) return false;
    if (ti === 0) return true;
    if (comb === ">") return el.parent ? matchesChain(el.parent, ti - 1) : false;
    let p = el.parent;
    while (p) { if (matchesChain(p, ti - 1)) return true; p = p.parent; }
    return false;
  }
  walk(root);
  return out;
}

// ------------------------------------------------------------------- world --
function makeWorld() {
  const voiceLog = [];
  const voice = {
    log: voiceLog,
    speak(text, lang) { voiceLog.push({ kind: "speak", text: String(text), lang }); },
    speakSequence(list, lang) { voiceLog.push({ kind: "sequence", list: [...list].map(String), lang }); },
    stop() { voiceLog.push({ kind: "stop" }); },
    feedback(kind) { voiceLog.push({ kind: "feedback", text: kind }); },
  };
  const masteryLog = [];
  const body = new El("body");
  const main = new El("main");
  const footer = new El("footer");
  const gameList = new El("div"); gameList.id = "gameList";
  const learningList = new El("div"); learningList.id = "learningList";
  const quizEl = new El("div"); quizEl.id = "quiz";
  const resultEl = new El("div"); resultEl.id = "result";
  const parentPanel = new El("div"); parentPanel.id = "parentPanel";
  body.append(main); body.append(gameList); body.append(learningList);
  body.append(quizEl); body.append(resultEl); body.append(parentPanel); body.append(footer);
  main.append(footer);
  const store = new Map();
  const localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(String(k), String(v)),
    removeItem: (k) => store.delete(k),
  };
  const doc = {
    _root: body,
    createElement: (tag) => (tag.toLowerCase() === "canvas" ? new CanvasEl() : new El(tag)),
    querySelector: (sel) => queryAll(body, sel, true)[0] || null,
    querySelectorAll: (sel) => queryAll(body, sel, false),
    getElementById: (id) => queryAll(body, "#" + id, true)[0] || null,
  };
  const startCalls = [];
  const sandbox = {
    console,
    setTimeout, clearTimeout,
    Math, JSON,
    document: doc,
    localStorage,
    MatthewVoice: voice,
    MatthewClips: { playKey: () => false, playSequence: () => false },
    MatthewMastery: { record: (...a) => masteryLog.push(a) },
    MatthewMoveBreak: null,
    MatthewNav: { pushSubscreen: () => {}, popSubscreen: () => {}, back: () => false },
    scrollTo: () => {},
    start: (bank) => startCalls.push(bank),
    updateStats: () => {},
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  const api = {
    sandbox, voice, voiceLog, masteryLog, startCalls, doc,
    main, gameList, learningList, quizEl, resultEl,
    load(name) { vm.runInContext(read(name), sandbox, { filename: name }); },
    loadBank() {
      const m = read("app.js").match(/const bank\s*=\s*(\{[\s\S]*?\n\});/);
      assert.ok(m, "bank found in app.js");
      sandbox.bank = vm.runInContext("(" + m[1] + ")", sandbox);
    },
  };
  return api;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function click(el) {
  assert.ok(el, "clicked element exists");
  const ev = { preventDefault() {}, stopPropagation() {} };
  if (typeof el.onclick === "function") el.onclick(ev);
  (el._listeners.click || []).forEach((f) => f(ev));
}
function fire(el, type, x, y) {
  const ev = { clientX: x, clientY: y, pointerId: 1, preventDefault() {} };
  (el._listeners[type] || []).forEach((f) => f(ev));
}
function cardByText(w, text) {
  const cards = w.learningList.children.filter((c) => c.textContent.includes(text));
  assert.equal(cards.length, 1, "one card contains " + text);
  return cards[0];
}
function tabButtons(panel) {
  return [...panel.querySelectorAll(".lesson-tab")];
}
function tabPanel(panel, name) {
  return panel.querySelector('[data-tab-panel="' + name + '"]');
}
function spokenTexts(w) {
  const out = [];
  for (const e of w.voiceLog) {
    if (e.kind === "speak") out.push(e.text);
    if (e.kind === "sequence") out.push(...e.list);
  }
  return out;
}
function panelOf(w, id) {
  const p = w.doc.getElementById(id);
  assert.ok(p, "panel #" + id + " exists");
  return p;
}

// ------------------------------------------------------------------- tests --
test("lesson list has the 7 lesson entries in order", () => {
  const w = makeWorld();
  ["lessons.js", "learning.js", "math-journey.js", "math-english.js", "science.js", "reading.js", "tracing.js"].forEach((f) => w.load(f));
  const titles = w.learningList.children.map((c) => c.textContent);
  assert.equal(titles.length, 7, "7 lesson cards, got: " + JSON.stringify(titles));
  const expect = ["مدرسة الحروف", "الحروف الإنجليزية", "الحساب بالعربي", "الرياضيات بالإنجليزي", "عالم العلوم", "يلا نقرأ", "اكتب بإصبعك"];
  expect.forEach((t, i) => assert.ok(titles[i].includes(t), "card " + i + " is " + t + ": " + titles[i]));
});

test("tab CSS: big tabs (>=56px) defined once in styles.css", () => {
  const css = read("styles.css");
  for (const sel of [".lesson-tabs", ".lesson-tab", ".lesson-tab.active", ".tab-panel"]) assert.ok(css.includes(sel), "styles.css has " + sel);
  const rule = css.match(/\.lesson-tab\s*\{[^}]*\}/);
  assert.ok(rule, ".lesson-tab rule found");
  assert.ok(/min-height:\s*56px/.test(rule[0]), ".lesson-tab min-height 56px: " + rule[0]);
  assert.ok(css.includes("Round 3.2.6"), "tab styles are in a clearly-marked 3.2.6 section");
});

const B_SAMPLES = ["بَ", "بُ", "بِ", "بْ"];
const HARAKA = ["الفتحة", "الضمة", "الكسرة", "السكون"];
async function answerLettersQuiz(panel, n) {
  const records = [];
  for (let i = 0; i < n; i++) {
    const qp = tabPanel(panel, "quiz");
    const qText = qp.querySelector("h2").textContent;
    const showEl = qp.querySelector(".big-letter");
    const show = showEl ? showEl.textContent : "";
    const choices = [...qp.querySelectorAll("[data-answer]")].map((b) => b.querySelector(".answer-label").textContent);
    assert.equal(choices.length, 4, "4 choices for question " + (i + 1));
    click(qp.querySelectorAll("[data-answer]")[0]);
    const correctEl = [...qp.querySelectorAll("[data-answer]")].find((b) => b.classList.contains("correct"));
    assert.ok(correctEl, "correct choice is marked for question " + (i + 1));
    records.push({ qText, show, choices, correct: correctEl.querySelector(".answer-label").textContent });
    click(panel.querySelector("#lessonNext"));
    await sleep(60);
  }
  return records;
}
function assertLettersRecordsScoped(records) {
  assert.equal(records.length, 10, "10 questions");
  const types = records.map((r) => r.qText);
  assert.equal(types.filter((t) => t === "ما اسم هذا الحرف؟").length, 1, "one name question");
  assert.equal(types.filter((t) => t.startsWith("أي شكل لحرف")).length, 1, "one form question");
  assert.equal(types.filter((t) => t === "ما اسم الحركة في المقطع ده؟").length, 4, "four haraka questions");
  assert.equal(types.filter((t) => t.startsWith("أي مقطع عليه")).length, 4, "four syllable questions");
  for (const r of records) {
    if (r.qText === "ما اسم هذا الحرف؟") {
      assert.equal(r.correct, "الباء", "name question correct is الباء");
      assert.equal(r.show, "ب", "name question shows ب");
    } else if (r.qText.startsWith("أي شكل لحرف")) {
      assert.equal(r.correct, "بـ", "form question correct is بـ");
      assert.ok(r.qText.includes("الباء"), "form question asks about الباء");
    } else if (r.qText === "ما اسم الحركة في المقطع ده؟") {
      assert.ok(HARAKA.includes(r.correct), "haraka question correct is a haraka name: " + r.correct);
      assert.ok(B_SAMPLES.includes(r.show), "haraka question shows a ب sample: " + r.show);
    } else if (r.qText.startsWith("أي مقطع عليه")) {
      assert.ok(B_SAMPLES.includes(r.correct), "syllable question correct is a ب sample: " + r.correct);
      assert.ok(r.choices.every((c) => B_SAMPLES.includes(c)), "all syllable choices are ب samples: " + r.choices);
    } else assert.fail("unexpected question: " + r.qText);
  }
}

test("letters: tabs, spoken explanation, 10-question quiz scoped to ب (+ retry)", async () => {
  const w = makeWorld();
  w.load("lessons.js");
  click(cardByText(w, "مدرسة الحروف"));
  const panel = panelOf(w, "letterSchool");
  const tiles = panel.querySelectorAll("[data-letter]");
  assert.equal(tiles.length, 28, "28 letter tiles");
  click(tiles[1]); // ب
  // 3 tabs, lesson active
  let tabs = tabButtons(panel);
  assert.equal(tabs.length, 3, "3 tabs");
  assert.ok(tabs[0].classList.contains("active"), "lesson tab active first");
  assert.ok(tabPanel(panel, "lesson").classList.contains("active"), "lesson panel visible");
  // explain tab auto-plays the explanation once
  click(tabs[1]);
  await sleep(400);
  let said = spokenTexts(w);
  assert.ok(said.some((t) => t.includes("بنقفل شفايفنا")), "ب explanation spoken on الشرح tab: " + JSON.stringify(said));
  // quiz tab: 10 questions, all about ب
  tabs = tabButtons(panel);
  click(tabs[2]);
  await sleep(100);
  const records = await answerLettersQuiz(panel, 10);
  assertLettersRecordsScoped(records);
  assert.ok(panel.innerHTML.includes("من ١٠"), "result shows X من ١٠");
  // retry regression (round325): retry -> q1, next -> q2 (not the picker)
  click(panel.querySelector("#retryLesson"));
  await sleep(60);
  assert.ok(panel.querySelector("#lessonStep").textContent.includes("١ / ١٠"), "retry restarts at q1: " + panel.querySelector("#lessonStep").textContent);
  const qp = tabPanel(panel, "quiz");
  click(qp.querySelectorAll("[data-answer]")[0]);
  click(panel.querySelector("#lessonNext"));
  await sleep(60);
  assert.ok(panel.querySelector("#lessonStep").textContent.includes("٢ / ١٠"), "next after retry goes to q2: " + panel.querySelector("#lessonStep").textContent);
});

test("letters picker quiz button opens a scoped quiz for one letter", async () => {
  const w = makeWorld();
  w.load("lessons.js");
  click(cardByText(w, "مدرسة الحروف"));
  const panel = panelOf(w, "letterSchool");
  click(panel.querySelector("#letterQuizBtn"));
  await sleep(100);
  const records = await answerLettersQuiz(panel, 10);
  // The quiz is about ONE letter: derive it from the name question, then
  // every syllable/haraka show + choice must be that letter's own data.
  const nameQ = records.find((r) => r.qText === "ما اسم هذا الحرف؟");
  assert.ok(nameQ, "name question present");
  const glyph = nameQ.show;
  const base = (s) => String(s).replace(/[ً-ٰٟـ]/g, "").charAt(0).replace("إ", "أ");
  for (const r of records) {
    if (r.qText === "ما اسم الحركة في المقطع ده؟") assert.equal(base(r.show), glyph, "haraka show is the letter's sample: " + r.show);
    if (r.qText.startsWith("أي مقطع عليه")) assert.ok(r.choices.every((c) => base(c) === glyph), "syllable choices are the letter's samples: " + r.choices);
  }
  const formQ = records.find((r) => r.qText.startsWith("أي شكل لحرف"));
  assert.ok(formQ.correct.includes(glyph), "form answer belongs to the same letter: " + formQ.correct);
});

test("english letters: tabs, spoken explanation, 6-question quiz scoped to A", async () => {
  const w = makeWorld();
  w.load("learning.js");
  click(cardByText(w, "الحروف الإنجليزية"));
  const panel = panelOf(w, "basicLearning");
  // starts at A (index 0)
  let tabs = tabButtons(panel);
  assert.equal(tabs.length, 3, "3 tabs");
  assert.ok(tabs[0].classList.contains("active"), "lesson tab active first");
  // explain tab auto-plays the explanation once
  click(tabs[1]);
  await sleep(400);
  let said = spokenTexts(w);
  assert.ok(said.some((t) => t.includes("حرف A")), "A explanation spoken on الشرح tab: " + JSON.stringify(said));
  // quiz tab: 6 questions, all about A
  tabs = tabButtons(panel);
  click(tabs[2]);
  await sleep(100);
  const seen = [];
  for (let i = 0; i < 6; i++) {
    const qp = panel.querySelector('[data-en-panel="quiz"]');
    const qText = qp.querySelector("h2").textContent;
    const show = qp.querySelector(".big-letter") ? qp.querySelector(".big-letter").textContent : "";
    const choices = [...qp.querySelectorAll("[data-en-answer]")].map((b) => b.querySelector(".answer-label").textContent);
    assert.equal(choices.length, 4, "4 choices for EN q" + (i + 1));
    click(qp.querySelectorAll("[data-en-answer]")[0]);
    const correctEl = [...qp.querySelectorAll("[data-en-answer]")].find((b) => b.classList.contains("correct"));
    assert.ok(correctEl, "correct choice marked for EN q" + (i + 1));
    seen.push({ qText, show, choices, correct: correctEl.querySelector(".answer-label").textContent });
    click(panel.querySelector("#enQuizNext"));
    await sleep(60);
  }
  assert.ok(panel.innerHTML.includes("من ٦"), "EN result shows X من ٦");
  // scoping: every correct answer is A-data; every show is A or Apple
  const A_DATA = ["A", "a", "Apple", "تفاحة", "short a"];
  for (const s of seen) {
    assert.ok(A_DATA.includes(s.correct), "EN q correct is A-data: " + s.qText + " -> " + s.correct);
    assert.ok(s.show === "A" || s.show === "Apple", "EN q show is A/Apple, got: " + JSON.stringify(s.show));
  }
  const qs = seen.map((s) => s.qText);
  assert.equal(new Set(qs).size, 6, "6 distinct EN questions: " + JSON.stringify(qs));
  // the 5 new EN question texts (no clip yet — parent records them)
  const EN_Q_NEW = ["ما الشكل الصغير لهذا الحرف؟", "أي كلمة تبدأ بهذا الحرف؟", "أي حرف تبدأ به هذه الكلمة؟", "ما معنى هذه الكلمة؟", "ما صوت هذا الحرف؟"];
  for (const q of EN_Q_NEW) assert.ok(qs.includes(q), "EN quiz has new question: " + q);
});

// Level-5 exercise templates: questions(n) builds 6 candidates for the
// level (count / after / before / add / sub / compare, all with
// level-derived numbers) and serves 4. A scoped quiz is exactly 4 of
// THESE templates with the level-derived correct answers — never a
// general-bank question.
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const arNum = (s) => Number([...String(s)].map((d) => AR_DIGITS.indexOf(d)).join(""));
const EN_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20 };
const EN_WORD_RE = /\b(seventeen|eighteen|nineteen|thirteen|fourteen|fifteen|sixteen|eleven|twelve|twenty|seven|eight|nine|three|four|five|six|ten|one|two)\b/g;
function classifyMathQuestion(qText, spec) {
  if (qText === spec.count) return { template: "count", expected: 5 };
  if (qText === spec.after) return { template: "after", expected: 6 };
  if (qText === spec.before) return { template: "before", expected: 5 };
  if (qText === spec.compare) return { template: "compare", expected: 5 };
  if (qText.startsWith("معانا ") && qText.includes("، بقوا كام؟")) {
    const ops = spec.parseOperands(qText);
    assert.equal(ops.length, 2, "add has 2 operands: " + qText);
    assert.ok(ops.every((n) => n >= 1 && n <= 10), "add operands near level 5: " + qText);
    return { template: "add", expected: ops[0] + ops[1] };
  }
  if (qText.startsWith("كان معانا ") && qText.includes("، فاضل كام؟")) {
    const ops = spec.parseOperands(qText);
    assert.equal(ops.length, 2, "sub has 2 operands: " + qText);
    assert.ok(ops.every((n) => n >= 1 && n <= 10), "sub operands near level 5: " + qText);
    return { template: "sub", expected: ops[0] - ops[1] };
  }
  return null;
}
const MATH_AR5 = {
  count: "عدّ الصور: كام واحدة؟", after: "إيه الرقم اللي بعد ٥؟", before: "إيه الرقم اللي قبل ٦؟", compare: "اختار العدد الأكبر: ٥ ولا ٤",
  parseOperands: (q) => [...q.matchAll(/[٠-٩]+/g)].map((m) => arNum(m[0])).concat(Array((q.match(/واحدة/g) || []).length).fill(1)),
  readChoice: (b) => arNum(b.querySelector("b").textContent),
};
const MATH_EN5 = {
  count: "عدّ الصور، فيه كام واحدة؟", after: "إيه الرقم اللي بعد five؟", before: "إيه الرقم اللي قبل six؟", compare: "إيه الرقم الأكبر: five ولا four؟",
  parseOperands: (q) => [...q.matchAll(EN_WORD_RE)].map((m) => EN_WORDS[m[0]]).concat(Array((q.match(/واحدة/g) || []).length).fill(1)),
  readChoice: (b) => Number(b.querySelector("b").textContent),
};
async function driveMathQuiz(panel, nextId, spec) {
  const seenTemplates = [];
  for (let i = 0; i < 4; i++) {
    const qp = tabPanel(panel, "quiz");
    const qText = qp.querySelector("h2").textContent;
    const found = classifyMathQuestion(qText, spec);
    assert.ok(found, "exercise is a level-5 template: " + qText);
    const choices = qp.querySelectorAll("[data-value]");
    assert.ok(choices.length >= 3, "choices present for exercise " + (i + 1));
    click(choices[0]);
    const correctEl = [...choices].find((b) => b.classList.contains("correct"));
    assert.ok(correctEl, "correct choice marked for exercise " + (i + 1));
    assert.equal(spec.readChoice(correctEl), found.expected, found.template + " correct is " + found.expected + ": " + qText);
    seenTemplates.push(found.template);
    click(panel.querySelector("#" + nextId));
    await sleep(60);
  }
  assert.equal(new Set(seenTemplates).size, 4, "4 distinct level-5 exercises: " + seenTemplates);
  return seenTemplates;
}

test("arabic numbers: tabs, spoken explanation, level-5 exercises, finish repoints to own quiz", async () => {
  const w = makeWorld();
  w.load("math-journey.js");
  click(cardByText(w, "الحساب بالعربي"));
  const panel = panelOf(w, "mathJourney");
  click(panel.querySelector('[data-level="5"]'));
  let tabs = tabButtons(panel);
  assert.equal(tabs.length, 3, "3 tabs");
  assert.ok(panel.innerHTML.includes("خمسة"), "lesson shows خمسة");
  click(tabs[1]);
  await sleep(300);
  assert.ok(spokenTexts(w).some((t) => t.includes("يلا نعدّ الصور سوا")), "counting explanation spoken: " + JSON.stringify(spokenTexts(w)));
  tabs = tabButtons(panel);
  click(tabs[2]);
  await sleep(200);
  await driveMathQuiz(panel, "mathNext", MATH_AR5);
  assert.ok(panel.innerHTML.includes("🏆 اختبر نفسك في الأرقام ⭐"), "finish has the quiz button");
  click(panel.querySelector("#mathQuiz"));
  await sleep(200);
  assert.deepEqual(w.startCalls, [], "start() never called — no general numbers bank");
  const qp = tabPanel(panel, "quiz");
  assert.ok(qp.querySelector("h2"), "finish quiz button opens the level's own exercises");
  assert.ok(classifyMathQuestion(qp.querySelector("h2").textContent, MATH_AR5), "reopened exercise is a level-5 template");
});

test("english numbers: tabs, spoken explanation, level-5 exercises, finish quiz button", async () => {
  const w = makeWorld();
  w.load("math-english.js");
  click(cardByText(w, "الرياضيات بالإنجليزي"));
  const panel = panelOf(w, "englishMathJourney");
  click(panel.querySelector('[data-level="5"]'));
  let tabs = tabButtons(panel);
  assert.equal(tabs.length, 3, "3 tabs");
  assert.ok(panel.innerHTML.includes("five"), "lesson shows five");
  click(tabs[1]);
  await sleep(300);
  assert.ok(spokenTexts(w).some((t) => t.includes("يلا نعد مع بعض!")), "counting explanation spoken: " + JSON.stringify(spokenTexts(w)));
  tabs = tabButtons(panel);
  click(tabs[2]);
  await sleep(200);
  await driveMathQuiz(panel, "englishMathNext", MATH_EN5);
  assert.ok(panel.querySelector("#englishMathQuiz"), "finish has its own quiz button");
  click(panel.querySelector("#englishMathQuiz"));
  await sleep(200);
  assert.deepEqual(w.startCalls, [], "start() never called — no general bank");
  const qp = tabPanel(panel, "quiz");
  assert.ok(qp.querySelector("h2"), "finish quiz button opens the level's own exercises");
  assert.ok(classifyMathQuestion(qp.querySelector("h2").textContent, MATH_EN5), "reopened exercise is a level-5 template");
});

function scienceApi(w) {
  w.sandbox.module = { exports: {} };
  const src = read("science.js");
  const head = src.slice(0, src.indexOf('if (typeof document === "undefined") return;')) + "\n})();";
  vm.runInContext(head, w.sandbox, { filename: "science.js" });
  return w.sandbox.module.exports;
}

test("science: bank maps 26/26 to exactly one subject; every subject quiz is 6", () => {
  const w = makeWorld();
  w.loadBank();
  const api = scienceApi(w);
  const bank = w.sandbox.bank;
  assert.equal(bank.science.length, 26, "26 bank science questions");
  const counts = {};
  for (const q of bank.science) {
    const subj = api.scienceSubjectFor(q);
    assert.ok(subj, "bank question maps to a subject: " + q.q);
    counts[subj] = (counts[subj] || 0) + 1;
  }
  assert.deepEqual(counts, { animals: 4, plants: 2, body: 3, physics: 6, chemistry: 4, universe: 5, coding: 2 });
  for (const id of Object.keys(api.scienceQuizKeywords)) {
    const quiz = api.scienceSubjectQuiz(id, 0);
    assert.equal(quiz.length, 6, id + " quiz is 6 questions");
    assert.ok(quiz.every((x) => x.a.length === 4), id + " quiz has 4 choices each");
    // Round 3.2.6 live catch: the bank stores the correct index as `c`,
    // not `correct` — mapping q.correct left every bank question with
    // correct: undefined, so it could never be answered right and the
    // feedback literally said "الإجابة الصح: undefined".
    for (const x of quiz) {
      assert.ok(Number.isInteger(x.correct) && x.correct >= 0 && x.correct < 4,
        id + " question has a valid correct index: " + x.q + " -> " + x.correct);
      assert.ok(typeof x.a[x.correct] === "string" && x.a[x.correct].length > 0,
        id + " correct answer is a real choice: " + x.q);
    }
  }
  // no-bank fallback still builds a quiz from the subject's own lessons
  const w2 = makeWorld();
  const api2 = scienceApi(w2);
  assert.equal(api2.scienceSubjectQuiz("animals", 0).length, 6, "no-bank animals quiz is 6");
  assert.equal(api2.scienceSubjectQuiz("coding", 0).length, 5, "no-bank coding quiz is 5 (only 5 lessons)");
});

async function driveScienceQuiz(panel) {
  const seen = [];
  const fillerChoices = [];
  for (let i = 0; i < 6; i++) {
    const qp = tabPanel(panel, "quiz");
    const qText = qp.querySelector("h2").textContent;
    seen.push(qText);
    const choices = qp.querySelectorAll("[data-value]");
    assert.equal(choices.length, 4, "4 choices for science q" + (i + 1));
    if (qText === "اسمع الدرس واختار صورته") fillerChoices.push([...choices].map((b) => b.textContent));
    click(choices[0]);
    click(panel.querySelector("#scienceNextQ"));
    await sleep(60);
  }
  return { seen, fillerChoices };
}

test("science animals: tabs, spoken explanation, subject-scoped 6-question quiz", async () => {
  const w = makeWorld();
  w.loadBank();
  w.load("science.js");
  click(cardByText(w, "عالم العلوم"));
  const panel = panelOf(w, "scienceAcademy");
  click(panel.querySelector('[data-subject="animals"]'));
  await sleep(60);
  click(panel.querySelector('[data-lesson="0"]'));
  let tabs = tabButtons(panel);
  assert.equal(tabs.length, 3, "3 tabs");
  assert.ok(panel.innerHTML.includes("الثدييات"), "lesson shows الثدييات");
  click(tabs[1]);
  await sleep(300);
  assert.ok(spokenTexts(w).some((t) => t.includes("الثدييات")), "lesson text spoken on الشرح tab: " + JSON.stringify(spokenTexts(w)));
  tabs = tabButtons(panel);
  click(tabs[2]);
  await sleep(100);
  const { seen, fillerChoices } = await driveScienceQuiz(panel);
  assert.ok(panel.innerHTML.includes("من ٦"), "science result shows X من ٦");
  const api = w.sandbox.MatthewScienceScenes;
  const animalsQs = w.sandbox.bank.science.filter((q) => api.scienceSubjectFor(q) === "animals").map((q) => q.q);
  const animalsLessons = api.subjectLessons.find((s) => s.id === "animals").lessons;
  for (const q of seen) assert.ok(animalsQs.includes(q) || q === "اسمع الدرس واختار صورته", "science q is animals-scoped: " + q);
  assert.ok(seen.some((q) => animalsQs.includes(q)), "animals quiz includes bank questions");
  assert.ok(seen.some((q) => q === "اسمع الدرس واختار صورته"), "animals quiz includes lesson-built fillers");
  for (const fc of fillerChoices) for (const c of fc) assert.ok(animalsLessons.some((l) => c.includes(l)), "filler choice is an animals lesson: " + c);
  assert.deepEqual(w.startCalls, [], "start() never called — no general science bank");
});

test("science quiz: answering a bank question correctly scores, feedback never says undefined", async () => {
  const w = makeWorld();
  w.loadBank();
  w.load("science.js");
  click(cardByText(w, "عالم العلوم"));
  const panel = panelOf(w, "scienceAcademy");
  click(panel.querySelector('[data-subject="animals"]'));
  await sleep(60);
  click(panel.querySelector('[data-lesson="0"]'));
  const api = w.sandbox.MatthewScienceScenes;
  const expected = api.scienceSubjectQuiz("animals", 0);
  const bankCount = expected.filter((x) => x.kind === "bank").length;
  assert.ok(bankCount >= 1, "animals quiz has bank questions");
  const tabs = tabButtons(panel);
  click(tabs[2]);
  await sleep(100);
  let bankRight = 0;
  for (let i = 0; i < 6; i++) {
    const qp = tabPanel(panel, "quiz");
    const qText = qp.querySelector("h2").textContent;
    const q = expected[i];
    assert.equal(qText, q.q, "quiz question " + (i + 1) + " is the expected one");
    const choices = qp.querySelectorAll("[data-value]");
    // Bank questions are deterministic (bank order, choices unshuffled),
    // so answer the known-correct one; fillers are reshuffled per build,
    // so just answer the first and only check the feedback text.
    click(choices[q.kind === "bank" ? q.correct : 0]);
    const fb = panel.querySelector("#scienceFeedback").textContent;
    assert.ok(!fb.includes("undefined"), "feedback never says undefined: " + fb);
    if (q.kind === "bank") {
      assert.ok(fb.includes("برافو"), "correct bank answer is praised: " + fb);
      bankRight++;
    }
    click(panel.querySelector("#scienceNextQ"));
    await sleep(60);
  }
  assert.equal(bankRight, bankCount, "every bank question can be answered correctly");
  assert.ok(panel.innerHTML.includes("من ٦"), "science result shows X من ٦");
});

test("science plants: 2 bank questions topped up to 6 with own-lesson fillers", async () => {
  const w = makeWorld();
  w.loadBank();
  w.load("science.js");
  click(cardByText(w, "عالم العلوم"));
  const panel = panelOf(w, "scienceAcademy");
  click(panel.querySelector('[data-subject="plants"]'));
  await sleep(60);
  click(panel.querySelector('[data-lesson="0"]'));
  const tabs = tabButtons(panel);
  click(tabs[2]);
  await sleep(100);
  const { seen, fillerChoices } = await driveScienceQuiz(panel);
  const bankCount = seen.filter((q) => q !== "اسمع الدرس واختار صورته").length;
  const fillerCount = seen.filter((q) => q === "اسمع الدرس واختار صورته").length;
  assert.equal(bankCount, 2, "plants has 2 bank questions: " + JSON.stringify(seen));
  assert.equal(fillerCount, 4, "plants has 4 lesson-built fillers");
  const api = w.sandbox.MatthewScienceScenes;
  const plantsLessons = api.subjectLessons.find((s) => s.id === "plants").lessons;
  for (const fc of fillerChoices) for (const c of fc) assert.ok(plantsLessons.some((l) => c.includes(l)), "filler choice is a plants lesson: " + c);
});

test("reading syllables: tabs, spoken explanation, quiz scoped to ب syllables", async () => {
  const w = makeWorld();
  w.load("reading.js");
  click(cardByText(w, "يلا نقرأ"));
  const panel = panelOf(w, "readingPanel");
  click(panel.querySelectorAll("[data-letter]")[1]); // ب
  const lessonTab = tabPanel(panel, "lesson");
  const sylTexts = [...lessonTab.querySelectorAll("[data-syl]")].map((b) => b.querySelector("b").textContent);
  assert.equal(sylTexts.length, 6, "6 syllables for ب");
  const sayValues = sylTexts.map((t) => t.replace(/ـ/g, ""));
  let tabs = tabButtons(panel);
  assert.equal(tabs.length, 3, "3 tabs");
  click(tabs[1]);
  await sleep(400);
  const said = spokenTexts(w);
  assert.ok(said.some((t) => t.includes("الباء")), "letter name spoken on الشرح tab: " + JSON.stringify(said));
  assert.ok(sayValues.every((s) => said.some((t) => t.includes(s))), "all syllables spoken: " + JSON.stringify(said));
  tabs = tabButtons(panel);
  click(tabs[2]);
  await sleep(100);
  let checkpoint = w.voiceLog.length;
  for (let r = 0; r < 4; r++) {
    await sleep(300);
    const fresh = w.voiceLog.slice(checkpoint).filter((e) => e.kind === "speak");
    assert.ok(fresh.length >= 1, "round " + (r + 1) + " speaks its prompt");
    const prompt = fresh[0].text;
    assert.equal(prompt.replace(/[ً-ٰٟـ]/g, "").charAt(0), "ب", "round prompt is a ب syllable: " + prompt);
    const choices = [...panel.querySelectorAll("[data-choice]")];
    assert.equal(choices.length, 4, "4 choices");
    for (const c of choices) assert.equal(c.dataset.choice.replace(/[ً-ٰٟـ]/g, "").charAt(0), "ب", "choice is a ب syllable: " + c.dataset.choice);
    click(choices[0]);
    const correctEl = choices.find((b) => b.classList.contains("correct"));
    assert.ok(correctEl, "correct choice marked");
    click(panel.querySelector("#readQuizNext"));
    await sleep(80);
    checkpoint = w.voiceLog.length;
  }
  assert.ok(panel.innerHTML.includes("من 4"), "reading result shows X من 4");
});

test("reading arabic words: quiz scoped to بَاب (word or its blend only)", async () => {
  const w = makeWorld();
  w.load("reading.js");
  click(cardByText(w, "يلا نقرأ"));
  const panel = panelOf(w, "readingPanel");
  click(panel.querySelector('[data-mode="ar-words"]'));
  await sleep(60);
  click(panel.querySelectorAll("[data-word]")[0]);
  const word = panel.querySelector("#readWhole").textContent;
  assert.equal(word, "بَاب", "word 0 is بَاب");
  const parts = [...panel.querySelectorAll("[data-part]")].map((b) => b.textContent);
  const blend = parts.join("، ") + ". " + word;
  click(panel.querySelector("#readQuizOffer"));
  await sleep(100);
  let checkpoint = w.voiceLog.length;
  for (let r = 0; r < 4; r++) {
    await sleep(300);
    const fresh = w.voiceLog.slice(checkpoint).filter((e) => e.kind === "speak");
    assert.ok(fresh.length >= 1, "round " + (r + 1) + " speaks its prompt");
    assert.ok(fresh[0].text === word || fresh[0].text === blend, "round prompt is the word or its blend: " + fresh[0].text);
    const choices = [...panel.querySelectorAll("[data-choice]")];
    assert.equal(choices.length, 4, "4 choices");
    click(choices[0]);
    const correctEl = choices.find((b) => b.classList.contains("correct"));
    assert.ok(correctEl, "correct choice marked");
    assert.equal(correctEl.dataset.choice, word, "correct choice is بَاب");
    click(panel.querySelector("#readQuizNext"));
    await sleep(80);
    checkpoint = w.voiceLog.length;
  }
  assert.ok(panel.innerHTML.includes("من 4"), "reading result shows X من 4");
});

test("reading cvc: quiz scoped to cat, back returns to the lesson", async () => {
  const w = makeWorld();
  w.load("reading.js");
  click(cardByText(w, "يلا نقرأ"));
  const panel = panelOf(w, "readingPanel");
  click(panel.querySelector('[data-mode="en-cvc"]'));
  await sleep(60);
  click(panel.querySelectorAll("[data-cvc]")[0]);
  const word = panel.querySelector("#readWholeEn").textContent;
  assert.equal(word, "cat", "cvc word 0 is cat");
  const sounds = [...panel.querySelectorAll("[data-sound]")].map((b) => b.textContent);
  const blend = sounds.join(", ") + ". " + word;
  let tabs = tabButtons(panel);
  click(tabs[2]);
  await sleep(100);
  let checkpoint = w.voiceLog.length;
  await sleep(300);
  let fresh = w.voiceLog.slice(checkpoint).filter((e) => e.kind === "speak");
  assert.ok(fresh.length >= 1, "first round speaks its prompt");
  assert.ok(fresh[0].text === word || fresh[0].text === blend, "cvc prompt is the word or its blend: " + fresh[0].text);
  // back from the quiz returns to the same word's lesson tab
  click(panel.querySelector("#readBack"));
  await sleep(60);
  assert.ok(panel.querySelector("#readWholeEn"), "back returns to the word lesson");
  assert.equal(panel.querySelector("#readWholeEn").textContent, "cat");
  assert.ok(tabPanel(panel, "lesson").classList.contains("active"), "lesson tab active after back");
  // reopen the quiz and finish all 4 rounds
  tabs = tabButtons(panel);
  click(tabs[2]);
  await sleep(100);
  checkpoint = w.voiceLog.length;
  for (let r = 0; r < 4; r++) {
    await sleep(300);
    fresh = w.voiceLog.slice(checkpoint).filter((e) => e.kind === "speak");
    assert.ok(fresh.length >= 1, "round " + (r + 1) + " speaks its prompt");
    assert.ok(fresh[0].text === word || fresh[0].text === blend, "cvc prompt scoped: " + fresh[0].text);
    const choices = [...panel.querySelectorAll("[data-choice]")];
    assert.equal(choices.length, 4, "4 choices");
    click(choices[0]);
    const correctEl = choices.find((b) => b.classList.contains("correct"));
    assert.ok(correctEl, "correct choice marked");
    assert.equal(correctEl.dataset.choice, word, "correct choice is cat");
    click(panel.querySelector("#readQuizNext"));
    await sleep(80);
    checkpoint = w.voiceLog.length;
  }
  assert.ok(panel.innerHTML.includes("من 4"), "reading result shows X من 4");
});

test("tracing: tabs, spoken explanation, 3-glyph trace challenge from the set", async () => {
  const w = makeWorld();
  w.load("tracing.js");
  click(cardByText(w, "اكتب بإصبعك"));
  const panel = panelOf(w, "tracingPanel");
  click(panel.querySelectorAll("[data-glyph]")[1]); // ب
  let tabs = tabButtons(panel);
  assert.equal(tabs.length, 3, "3 tabs");
  assert.ok(panel.querySelector("#traceCanvas"), "lesson canvas present");
  click(tabs[1]);
  await sleep(400);
  assert.ok(spokenTexts(w).some((t) => t.includes("يلا نتتبع الحرف")), "Nancy intro spoken on الشرح tab: " + JSON.stringify(spokenTexts(w)));
  tabs = tabButtons(panel);
  click(tabs[2]);
  await sleep(100);
  click(panel.querySelector("#traceQuizStart"));
  await sleep(300);
  const expected = ["ب", "ت", "ث"];
  for (let g = 0; g < 3; g++) {
    const qp = tabPanel(panel, "quiz");
    assert.ok(qp.innerHTML.includes("تحدّي " + (g + 1) + " من ٣"), "challenge glyph " + (g + 1) + " of 3");
    assert.ok(qp.innerHTML.includes("اكتب " + expected[g] + " بإصبعك"), "challenge glyph is " + expected[g]);
    const canvas = qp.querySelector("#traceCanvas2");
    assert.ok(canvas, "challenge canvas present");
    fire(canvas, "pointerdown", 160, 20);
    for (let y = 20; y <= 300; y += 4) fire(canvas, "pointermove", 160, y);
    fire(canvas, "pointerup", 160, 300);
    await sleep(1500); // celebration + advance to the next glyph
  }
  assert.ok(panel.innerHTML.includes("من ٣"), "challenge result shows X من ٣");
  assert.ok(panel.innerHTML.includes("كتبت صح 3 من ٣"), "challenge scored 3/3");
});

test("switching tabs stops the current audio", async () => {
  const w = makeWorld();
  w.load("lessons.js");
  click(cardByText(w, "مدرسة الحروف"));
  const panel = panelOf(w, "letterSchool");
  click(panel.querySelectorAll("[data-letter]")[1]);
  const tabs = tabButtons(panel);
  click(tabs[1]); // explain: auto-play starts
  await sleep(400);
  assert.ok(spokenTexts(w).length > 0, "explanation started");
  const stopsBefore = w.voiceLog.filter((e) => e.kind === "stop").length;
  click(tabButtons(panel)[0]); // back to the lesson tab
  assert.ok(w.voiceLog.filter((e) => e.kind === "stop").length > stopsBefore, "switching tabs calls MatthewVoice.stop()");
});

test("panel back button returns to the lesson list", () => {
  const w = makeWorld();
  w.load("math-journey.js");
  click(cardByText(w, "الحساب بالعربي"));
  const panel = panelOf(w, "mathJourney");
  assert.ok(!panel.classList.contains("hidden"), "journey open");
  assert.ok(w.learningList.classList.contains("hidden"), "list hidden while learning");
  click(panel.querySelector("#mathBack"));
  assert.ok(panel.classList.contains("hidden"), "journey closed");
  assert.ok(!w.learningList.classList.contains("hidden"), "list back");
  assert.ok(!w.gameList.classList.contains("hidden"), "home back");
});

test("round 3.2.6 (integrator): EN quiz questions + science filler heading have recorded clips", () => {
  const corpus = JSON.parse(read("audio-src/corpus.json"));
  const byText = new Map(corpus.map((e) => [e.text, e]));
  // The EN quiz speaks q.q + " اختار الإجابة الصحيحة" as ONE sequence
  // element (same pattern as the AR letters quiz, lsq_q_*), so the clip
  // text must be the COMBINED string — a bare-question clip would never
  // match. Without these the app is clips-only by design and the EN quiz
  // questions stay silent in the APK.
  const learning = read("learning.js");
  const m = learning.match(/const EN_Q_NEW=\[([\s\S]*?)\];/);
  assert.ok(m, "EN_Q_NEW must exist in learning.js");
  const qs = [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
  assert.equal(qs.length, 5, "EN_Q_NEW must have 5 question texts, got " + qs.length);
  for (const q of qs) {
    const spoken = q + " اختار الإجابة الصحيحة";
    const e = byText.get(spoken);
    assert.ok(e, "corpus must contain a clip for «" + spoken + "»");
    assert.equal(e.lang, "ar_EG", "EN quiz question clips are Arabic (the question is Arabic)");
    assert.ok(fs.existsSync(path.join(root, "audio-src/opus", e.key + ".ogg")),
      "opus audio must exist for " + e.key);
  }
  // The science filler question speaks its heading bare (speakSeq([lessonText, q.q])).
  const sci = byText.get("اسمع الدرس واختار صورته");
  assert.ok(sci, "corpus must contain a clip for «اسمع الدرس واختار صورته»");
  assert.ok(fs.existsSync(path.join(root, "audio-src/opus", sci.key + ".ogg")),
    "opus audio must exist for " + sci.key);
});
