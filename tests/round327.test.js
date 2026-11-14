// Round 3.2.7 — the blank brave stories defect (live re-verification of
// the 3.2.6 APK was NO-GO on this alone).
//
// The defect: rescue openPicker() renders the shared stories picker, and
// its focusMode(true) hides EVERY <main> child except #rescuePanel —
// including #bravePanel — with an INLINE display:none. Tapping a brave
// card then ran brave startStory(), which only removed the `hidden`
// class; inline style beats the class, so the panel stayed computed
// display:none — a blank lavender screen with no way back (the back
// button lives inside the hidden panel). The story still played behind
// it. The 3.2.6 check missed it because it asserted only the `hidden`
// class, never computed visibility.
//
// THESE TESTS ASSERT COMPUTED VISIBILITY (getComputedStyle display) and
// the inline style, after opening each story — never the class alone.
// They drive the REAL module code in jsdom (skipped where jsdom is not
// installed, like round323/round326 — the live Chromium verification is
// the second gate and asserts offsetParent too).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");
let JSDOM = null;
try { ({ JSDOM } = require("jsdom")); } catch (_) { JSDOM = null; }
const skipDom = !JSDOM;

function makeVoice(spoken) {
  return {
    speak(text, lang, onDone) { spoken.push({ fn: "speak", text }); if (typeof onDone === "function") onDone(); return true; },
    speakSequence(list, lang, onDone) { spoken.push({ fn: "speakSequence", list: [...list] }); if (typeof onDone === "function") onDone(); return true; },
    feedback(kind) { spoken.push({ fn: "feedback", kind }); },
    stop() { spoken.push({ fn: "stop" }); },
  };
}
function makeBank() {
  const mk = (cat, n) => Array.from({ length: n }, (_, i) => ({
    q: cat + " سؤال " + (i + 1) + "؟", e: "🤔", a: ["أ", "ب", "ج"], c: 0,
  }));
  return { numbers: mk("numbers", 15), letters: mk("letters", 15), colors: mk("colors", 15), world: mk("world", 15), science: mk("science", 15) };
}
function bootDom(spoken) {
  const dom = new JSDOM(read("index.html"), { url: "http://localhost/", runScripts: "outside-only", pretendToBeVisual: true });
  const { window } = dom;
  window.scrollTo = () => {};
  window.MatthewVoice = makeVoice(spoken);
  window.MatthewClips = { playKey() { return false; }, play() { return false; }, playSequence() { return false; }, stop() {} };
  window.MatthewMastery = { record() {}, weight() { return 0; }, crown: () => ({ stars: 0, diamonds: 0 }), awardCrown() {} };
  window.bank = makeBank();
  window.localStorage.clear();
  return dom;
}
// Computed visibility: what the child actually sees. In jsdom there is no
// layout engine (offsetParent is always null), so the panel's own computed
// display + its inline style are the signal — an inline display:none is
// exactly what hid the brave panel in the shipped build.
function computedDisplay(window, el) {
  return window.getComputedStyle(el).display;
}
function assertPanelVisible(window, doc, panelId, what) {
  const panel = doc.querySelector("#" + panelId);
  assert.ok(panel, what + ": #" + panelId + " must exist");
  assert.ok(!panel.classList.contains("hidden"), what + ": #" + panelId + " must not have the hidden class");
  assert.notEqual(panel.style.display, "none", what + ": #" + panelId + " must not keep an inline display:none (the 3.2.7 defect)");
  assert.notEqual(computedDisplay(window, panel), "none", what + ": #" + panelId + " must be COMPUTED-visible, got display=" + computedDisplay(window, panel));
}
function openPicker(doc) {
  doc.querySelector('[data-stories="1"]').click();
  const cards = [...doc.querySelectorAll("#rescuePlay [data-story], #rescuePlay [data-brave]")];
  assert.equal(cards.length, 7, "picker must list all 7 stories (4 rescue + 3 brave)");
  return cards;
}

test("3.2.7: each brave story opens COMPUTED-visible at 0 stars (no blank screen)", { skip: skipDom }, () => {
  const spoken = [];
  const dom = bootDom(spoken);
  const { window } = dom;
  try {
    window.eval(read("stories.js"));
    window.eval(read("rescue.js"));
    const doc = window.document;
    const cards = openPicker(doc);
    // The trap setup itself: the shared picker is rescue's, so opening it
    // hides #bravePanel with an inline display:none. Pre-fix, the next
    // tap never cleared it.
    assert.equal(doc.querySelector("#bravePanel").style.display, "none",
      "opening the shared picker must inline-hide #bravePanel (rescue focusMode) — that is the trap the fix must clear");
    for (let i = 4; i < 7; i++) {
      const title = cards[i].querySelector("b")?.textContent || cards[i].textContent;
      cards[i].click();
      assertPanelVisible(window, doc, "bravePanel", "brave story " + i + " (" + title + ")");
      // The back button lives inside the panel — it is only reachable
      // when the panel itself is visible.
      const back = doc.querySelector("#braveBack");
      assert.ok(back, "brave story " + i + " must render its back button");
      // The first question is rendered synchronously (only its narration
      // is deferred), so it must be in the DOM now.
      const q = doc.querySelector("#bravePlay .brave-question");
      assert.ok(q && q.textContent.trim().length > 0, "brave story " + i + " must show its first question, got: " + (q ? q.textContent : "none"));
      assert.ok(doc.querySelectorAll("#bravePlay #braveAnswers .answer").length > 0, "brave story " + i + " must show answer buttons");
      // Back returns to the picker (brave's own picker), ready for the
      // next story.
      back.click();
      assert.equal(doc.querySelector("#braveTitle").textContent, "اختار قصتك يا ملك! 📖", "back must return to the brave picker after story " + i);
    }
  } finally {
    window.close();
  }
});

test("3.2.7: rescue stories 1–3 open COMPUTED-visible (computed, not just class)", { skip: skipDom }, () => {
  const spoken = [];
  const dom = bootDom(spoken);
  const { window } = dom;
  try {
    window.eval(read("stories.js"));
    window.eval(read("rescue.js"));
    const doc = window.document;
    const cards = openPicker(doc);
    for (let i = 1; i <= 3; i++) {
      [...doc.querySelectorAll("#rescuePlay [data-story], #rescuePlay [data-brave]")][i].click();
      assertPanelVisible(window, doc, "rescuePanel", "rescue story " + i);
      const q = doc.querySelector("#rescuePlay .rescue-question, #rescuePlay h3");
      assert.ok(q && q.textContent.trim().length > 0, "rescue story " + i + " must show its first question");
      assert.ok(doc.querySelector("#rescueBack"), "rescue story " + i + " must render its back button");
      doc.querySelector("#rescueBack").click();
      assert.equal(doc.querySelector("#rescueTitle").textContent, "اختار مغامرتك يا ملك! 📖", "back must return to the picker after rescue story " + i);
    }
  } finally {
    window.close();
  }
});

test("3.2.7: the trap, direct — a stale inline display:none is cleared on open (both panels)", { skip: skipDom }, () => {
  const spoken = [];
  const dom = bootDom(spoken);
  const { window } = dom;
  try {
    window.eval(read("stories.js"));
    window.eval(read("rescue.js"));
    const doc = window.document;
    openPicker(doc);
    // Brave side: the picker already inline-hid #bravePanel (asserted
    // above); openStory must clear it even if something else hid it.
    const bravePanel = doc.querySelector("#bravePanel");
    bravePanel.style.display = "none";
    const braveId = doc.querySelector("#rescuePlay [data-brave]").dataset.brave;
    window.MatthewBraveStories.openStory(braveId);
    assertPanelVisible(window, doc, "bravePanel", "openStory after a stale inline display:none");
    assert.ok(doc.querySelector("#bravePlay .brave-question"), "brave story must render its first question after a stale hide");
    // Back out to the picker, then close to home.
    doc.querySelector("#braveBack").click();
    doc.querySelector("#braveBack").click();
    // Rescue side, symmetric: brave's focusMode hides #rescuePanel inline
    // while a brave story is open; the rescue picker must clear it.
    const rescuePanel = doc.querySelector("#rescuePanel");
    rescuePanel.style.display = "none";
    window.MatthewStories.open();
    assertPanelVisible(window, doc, "rescuePanel", "rescue openPicker after a stale inline display:none");
    // And a rescue story opened from that picker is visible too.
    doc.querySelector("#rescuePlay [data-story]").click();
    assertPanelVisible(window, doc, "rescuePanel", "rescue startStory after a stale inline display:none");
  } finally {
    window.close();
  }
});

test("3.2.7: the picker itself is COMPUTED-visible after opening, and the rescue picker survives a brave round-trip", { skip: skipDom }, () => {
  const spoken = [];
  const dom = bootDom(spoken);
  const { window } = dom;
  try {
    window.eval(read("stories.js"));
    window.eval(read("rescue.js"));
    const doc = window.document;
    openPicker(doc);
    assertPanelVisible(window, doc, "rescuePanel", "stories picker on first open");
    // Brave round-trip: open a brave story, back to the brave picker,
    // back again (close), reopen the stories card — the rescue picker
    // must come back visible.
    [...doc.querySelectorAll("#rescuePlay [data-brave]")][2].click();
    assertPanelVisible(window, doc, "bravePanel", "last brave story (love-family)");
    doc.querySelector("#braveBack").click();
    doc.querySelector("#braveBack").click();
    assert.ok(doc.querySelector("#bravePanel").classList.contains("hidden"), "brave close must re-hide the brave panel");
    doc.querySelector('[data-stories="1"]').click();
    assertPanelVisible(window, doc, "rescuePanel", "stories picker after a brave round-trip");
    assert.equal([...doc.querySelectorAll("#rescuePlay [data-story], #rescuePlay [data-brave]")].length, 7, "picker must still list all 7 stories after the round-trip");
  } finally {
    window.close();
  }
});
