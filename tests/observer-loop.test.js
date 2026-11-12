// Round 3.2.2 P0 freeze regression test — MutationObserver / apply() loop.
//
// The defect: apply() wrote list.classList.add("hidden") with NO guard,
// while a MutationObserver watched exactly those lists' class attribute and
// called apply() on every mutation. In Chromium 157 a NO-OP classList.add()
// (class already present) STILL fires a mutation record, so each apply()
// triggered the next forever and the real page never loaded (evaluate
// TIMEOUT, renderer ~72% CPU). Unit tests missed it because their mock
// MutationObserver did nothing.
//
// jsdom's MutationObserver does NOT fire on no-op writes, so a plain "real
// observer" test cannot catch this either. This test therefore uses a STRICT
// mock observer that invokes its callback on EVERY classList.add/remove call
// on an observed element — Chrome-157 semantics — and asserts the real
// apply() terminates (bounded observer-callback count) through the full
// home -> door -> activity -> goHome -> door -> back sequence.
//
// Verified: this test FAILS on the pre-fix app.js (observer callback cap
// exceeded — the infinite loop) and PASSES on the fixed app.js.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");

// Chrome-157 semantics: no-op add/remove fires a record, no-op toggle does not.
const OBSERVER_CALL_CAP = 200;

function runDoorsStrict() {
  let observerCalls = 0;
  const observed = []; // { cb, target }
  const fireClassMutation = (el) => {
    for (const o of observed.slice()) {
      if (o.target !== el) continue;
      observerCalls++;
      if (observerCalls > OBSERVER_CALL_CAP) {
        throw new Error(
          "P0 freeze: MutationObserver/apply() loop — observer callback invoked "
          + "more than " + OBSERVER_CALL_CAP + " times; apply() must not write "
          + "a class that is already in its target state",
        );
      }
      o.cb();
    }
  };

  function makeEl(tag) {
    const e = {
      tagName: tag, id: "", children: [], style: {}, dataset: {},
      textContent: "", parentElement: null, _cls: new Set(), _listeners: {},
    };
    e.classList = {
      // Strict Chrome-157 mock: EVERY add/remove on an observed element
      // fires the observer callback, even when the class set does not change.
      add: (c) => { e._cls.add(c); fireClassMutation(e); },
      remove: (c) => { e._cls.delete(c); fireClassMutation(e); },
      toggle: (c, f) => {
        let changed;
        if (f === undefined) { if (e._cls.has(c)) e._cls.delete(c); else e._cls.add(c); changed = true; }
        else if (f) { changed = !e._cls.has(c); if (changed) e._cls.add(c); }
        else { changed = e._cls.has(c); if (changed) e._cls.delete(c); }
        if (changed) fireClassMutation(e);
      },
      contains: (c) => e._cls.has(c),
    };
    e.setAttribute = (k, v) => { if (k === "id") e.id = v; else e.dataset[k] = v; };
    e.getAttribute = (k) => (k === "id" ? e.id : e.dataset[k]);
    e.appendChild = (c) => { e.children.push(c); c.parentElement = e; return c; };
    e.append = (...cs) => cs.forEach((c) => e.appendChild(c));
    e.insertBefore = (c, ref) => {
      const i = ref ? e.children.indexOf(ref) : -1;
      if (i >= 0) e.children.splice(i, 0, c); else e.children.push(c);
      c.parentElement = e;
    };
    e.after = (c) => {
      if (e.parentElement) {
        const sibs = e.parentElement.children;
        sibs.splice(sibs.indexOf(e) + 1, 0, c); c.parentElement = e.parentElement;
      }
    };
    e.remove = () => {
      if (e.parentElement) {
        const i = e.parentElement.children.indexOf(e);
        if (i >= 0) e.parentElement.children.splice(i, 1);
        e.parentElement = null;
      }
    };
    e.addEventListener = (ev, fn) => { (e._listeners[ev] = e._listeners[ev] || []).push(fn); };
    e.click = () => (e._listeners.click || []).forEach((fn) => fn());
    e.closest = (sel) => {
      let n = e;
      while (n) {
        if (sel === "#gameList" && n.id === "gameList") return n;
        if (sel === "#learningList" && n.id === "learningList") return n;
        n = n.parentElement;
      }
      return null;
    };
    e.querySelector = (sel) => {
      if (sel === "#doorTitle") return e._doorTitle || (e._doorTitle = makeEl("strong"));
      if (sel === "#doorBack") return e._doorBack || (e._doorBack = makeEl("button"));
      return null;
    };
    e.querySelectorAll = (sel) => (sel === "[data-door]" ? (e._doors || []) : []);
    Object.defineProperty(e, "innerHTML", {
      get: () => e._html || "",
      set: (v) => {
        e._html = v;
        const doors = [...String(v).matchAll(/data-door="([^"]+)"/g)].map((m) => {
          const b = makeEl("button"); b.dataset.door = m[1]; return b;
        });
        if (doors.length) e._doors = doors;
        if (/id="doorBack"/.test(v)) e._doorBack = makeEl("button");
        if (/id="doorTitle"/.test(v)) e._doorTitle = makeEl("strong");
      },
    });
    return e;
  }

  const src = read("app.js");
  const start = src.indexOf("(function initHomeDoors() {");
  const end = src.lastIndexOf("})();") + 4;
  const code = src.slice(start, end);
  const main = makeEl("main");
  const learnList = makeEl("section"); learnList.id = "learningList";
  const gameList = makeEl("section"); gameList.id = "gameList";
  const hero = makeEl("div");
  main.appendChild(learnList); main.appendChild(gameList);
  const learnCard = makeEl("button"); learnList.appendChild(learnCard);
  const quizCard = makeEl("button"); quizCard.dataset.category = "numbers"; gameList.appendChild(quizCard);
  const chessCard = makeEl("button"); chessCard.dataset.chess = "1"; gameList.appendChild(chessCard);
  const quizPanel = makeEl("section"); quizPanel.id = "quiz";
  quizPanel.classList.add("quiz-panel"); quizPanel.classList.add("hidden");
  main.appendChild(quizPanel);
  const sections = [learnList, gameList, quizPanel];
  const docListeners = {};
  const documentStub = {
    querySelector: (sel) => {
      if (sel === "main") return main;
      if (sel === ".hero") return hero;
      return null;
    },
    querySelectorAll: (sel) => {
      if (sel === ".section-head") return [];
      if (sel === "main > section") return sections.slice();
      if (/quiz-panel|academy-panel|result-panel/.test(sel)) {
        return sections.filter((s) => ["quiz-panel", "academy-panel", "result-panel"].some((c) => s.classList.contains(c)));
      }
      return [];
    },
    getElementById: (id) => (id === "learningList" ? learnList : id === "gameList" ? gameList : null),
    createElement: (tag) => {
      const el = makeEl(tag);
      if (tag === "section") sections.push(el);
      return el;
    },
    addEventListener: (ev, fn) => { (docListeners[ev] = docListeners[ev] || []).push(fn); },
  };
  const ctx = {
    document: documentStub,
    window: {
      scrollTo: () => {},
      addEventListener: () => {},
      MatthewVoice: { stop: () => {} },
    },
    localStorage: {
      _m: new Map(),
      getItem: function (k) { return this._m.has(k) ? this._m.get(k) : null; },
      setItem: function (k, v) { this._m.set(k, String(v)); },
    },
    // STRICT mock: observe() registers the real callback against the target;
    // classList writes on stub elements invoke it (see fireClassMutation).
    MutationObserver: class {
      constructor(cb) { this.cb = cb; }
      observe(target) { observed.push({ cb: this.cb, target }); }
      disconnect() {}
    },
    setTimeout: (fn, ms) => { if (ms === 0) fn(); return 0; },
    saveQuizProgress: () => {},
    console,
  };
  vm.runInNewContext(code, ctx);
  const nav = main.children.find((c) => c.id === "homeDoors");
  const fab = main.children.find((c) => c.id === "homeFab");
  return {
    main, learnList, gameList, hero, nav, fab, quizPanel,
    observerCalls: () => observerCalls,
    door: (id) => nav.querySelectorAll("[data-door]").find((b) => b.dataset.door === id),
    fireBackButton: () => (docListeners.backbutton || []).forEach((fn) => fn()),
  };
}

test("P0-freeze: apply() terminates under a strict (Chrome-157) MutationObserver through the full home/door/activity/back flow", () => {
  const d = runDoorsStrict();
  // Load alone must settle: the pre-fix code loops here (cap exceeded).
  assert.ok(d.observerCalls() <= 20, "observer callbacks after load must be bounded, got " + d.observerCalls());
  assert.ok(d.learnList.classList.contains("hidden"), "home: learningList hidden");
  assert.ok(d.gameList.classList.contains("hidden"), "home: gameList hidden");

  // Open the quiz door, then an activity, then go home via the 🏠 FAB.
  d.door("quiz").click();
  assert.ok(!d.gameList.classList.contains("hidden"), "quiz door: gameList visible");
  d.quizPanel.classList.remove("hidden"); // activity opens (start())
  d.main.click(); // main click listener -> apply()
  assert.ok(d.gameList.classList.contains("hidden"), "activity open: gameList hidden");
  assert.equal(d.fab.style.display, "", "FAB shows while an activity is open");
  d.fab.click(); // goHome(): hides panels, then apply()
  assert.ok(d.quizPanel.classList.contains("hidden"), "goHome: activity panel hidden");
  assert.notEqual(d.nav.style.display, "none", "goHome: doors return");

  // Lessons door after quiz + back, then Android back to home.
  d.door("learn").click();
  assert.ok(!d.learnList.classList.contains("hidden"), "learn door: learningList visible");
  d.fireBackButton();
  assert.ok(d.learnList.classList.contains("hidden"), "back button: learningList hidden again");

  // The whole flow — including repeated apply() calls — must stay bounded.
  // (Pre-fix: the cap of 200 throws inside the first apply() at load.)
  assert.ok(d.observerCalls() <= 20,
    "observer callbacks over the full flow must stay bounded, got " + d.observerCalls());
});

test("P0-freeze: apply() never writes a class that is already in its target state (static guard check)", () => {
  const app = read("app.js");
  const applySrc = app.slice(app.indexOf("function apply() {"), app.indexOf("nav.querySelectorAll"));
  // Every classList.add/remove on the observed lists inside apply() must be
  // preceded by a contains() guard on the same block — a bare add/remove is
  // the loop fuel under Chrome-157 observer semantics.
  assert.ok(!/list\.classList\.add\("hidden"\)/.test(applySrc.replace(/if \(!list\.classList\.contains\("hidden"\)\) list\.classList\.add\("hidden"\)/g, "")),
    "apply() must not contain an unguarded list.classList.add(\"hidden\")");
  assert.ok(!/list\.classList\.remove\("hidden"\)/.test(applySrc.replace(/if \(list\.classList\.contains\("hidden"\)\) list\.classList\.remove\("hidden"\)/g, "")),
    "apply() must not contain an unguarded list.classList.remove(\"hidden\")");
  assert.ok(!/list\.classList\.toggle\("hidden"/.test(applySrc),
    "apply() must not use toggle(\"hidden\") on the lists (guarded add/remove instead, so the rule is explicit)");
});
