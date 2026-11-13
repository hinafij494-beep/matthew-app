// tests/round326-voice.test.js — Round 3.2.6, worker A (voice items 1, 4, 7).
//
// Item 1: the pronunciation challenge is REMOVED completely — no card, no
// panel, no challengeSpeak, no SpeechRecognition anywhere in the sources.
// Item 4: voice playback is SERIALISED through the clips runtime — a
// praise/enrichment playKey waits for a running sequence instead of
// hijacking the shared Audio element (which used to kill the sequence's
// onDone chain: the intermittent "freezes, only force-close fixes it"
// hang). Praise waits 550ms so the correct-chime finishes first; the tap
// blip is gated while a voice clip plays.
// Item 7: regression — repeated navigation/answer cycles never strand a
// chain or throw, and the runtime stays usable afterwards.
//
// These are REAL runtime tests: the REAL voice-clips.js and the REAL
// voice.js (import line stubbed only) run in a vm against a FakeAudio
// whose ends the test drives by hand — never string assertions about
// behaviour. (The 3.2.3 speakSequence bug was missed exactly because its
// test only read code strings.)
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ------------------------------------------------------- fake audio layer
// Manual-end FakeAudio: play() records the key (via the blob-url map, as
// in numbers-once.test.js) and stays "playing" until the test ends it —
// so mid-playback states (a praise landing mid-sequence, a tap landing
// mid-clip) are real, drivable states, not sleeps.
function loadClips() {
  const keys = ["a", "b", "c", "win1",
    "praise1", "praise2", "praise3", "praise4", "praise5", "praise_nancy",
    "nancy_praise_1", "nancy_praise_2", "nancy_praise_3", "nancy_praise_4", "nancy_praise_5",
    "nancy_praise_6", "nancy_praise_7", "nancy_praise_8", "nancy_praise_9", "nancy_praise_10",
    "try1", "try2", "try3",
    "nancy_retry_1", "nancy_retry_2", "nancy_retry_3", "nancy_retry_4", "nancy_retry_5"];
  const data = {};
  for (const k of keys) data[k] = Buffer.from(k, "utf8").toString("base64");
  const byText = { alpha: "a", beta: "b", gamma: "c", win: "win1" };
  const exact = { Alpha: "a", Beta: "b", Gamma: "c", Win: "win1" };
  const plays = []; // [{key}] in play order
  const pauses = []; // src of every pause() call
  const created = new Map();
  let rejectNextPlay = false;
  class FakeBlob { constructor(parts) { this.parts = parts; } }
  class FakeAudio {
    constructor() {
      this.src = "";
      this.onended = null;
      this.onerror = null;
      this.paused = true;
      this.currentTime = 0;
      this._id = FakeAudio._n = (FakeAudio._n || 0) + 1;
    }
    canPlayType() { return "probably"; }
    pause() { this.paused = true; pauses.push(this.src); }
    play() {
      this.paused = false;
      plays.push({ key: created.get(this.src) || null, src: this.src, id: this._id });
      if (rejectNextPlay) { rejectNextPlay = false; return Promise.reject(new Error("NotAllowedError")); }
      return Promise.resolve();
    }
    end() { // simulate natural end of the current clip
      this.paused = true;
      if (this.onended) this.onended();
    }
    fail() { // simulate a load error
      if (this.onerror) this.onerror();
    }
  }
  const sandbox = {
    console,
    setTimeout,
    clearTimeout,
    atob: (s) => Buffer.from(s, "base64").toString("binary"),
    Blob: FakeBlob,
    URL: {
      createObjectURL: (blob) => {
        const key = Buffer.from(blob.parts[0]).toString("utf8");
        const url = "blob:" + key;
        created.set(url, key);
        return url;
      },
      revokeObjectURL: () => {},
    },
    Audio: FakeAudio,
  };
  sandbox.window = sandbox;
  sandbox.window.__matthewClipData = [data];
  sandbox.window.__matthewClipText = [byText];
  sandbox.window.__matthewClipExact = [exact];
  vm.createContext(sandbox);
  vm.runInContext(read("voice-clips.js"), sandbox);
  assert.ok(sandbox.window.MatthewClips, "voice-clips.js must expose MatthewClips");
  FakeAudio._instances = [];
  const OrigFakeAudio = FakeAudio;
  // Track instances: wrap the constructor used by the sandbox.
  sandbox.Audio = class extends OrigFakeAudio {
    constructor(...a) { super(...a); OrigFakeAudio._instances.push(this); }
  };
  return {
    clips: sandbox.window.MatthewClips,
    sandbox,
    plays,
    pauses,
    FakeAudio: sandbox.Audio,
    endCurrent() {
      const last = plays[plays.length - 1];
      assert.ok(last, "endCurrent: nothing is playing");
      const inst = OrigFakeAudio._instances.find((a) => a._id === last.id);
      assert.ok(inst, "endCurrent: audio instance not found");
      inst.end();
    },
    rejectNextPlay() { rejectNextPlay = true; },
    playedKeys() { return plays.map((p) => p.key); },
  };
}

// ------------------------------------------------------- real voice.js
// Runs the REAL voice.js IIFE in the same vm as the real clips runtime.
// Only the Capacitor import is stubbed (TextToSpeech is a platform API);
// everything else — speak, speakSequence, feedback, the tap handler, the
// MutationObserver wiring — is the shipped code.
function loadVoice(clipsCtx) {
  const pointerHandlers = [];
  const observerCbs = [];
  const oscStarts = []; // every oscillator start (tap blip + chimes)
  const createdEls = [];
  const elsById = new Map();
  const gameList = {
    id: "gameList", children: [],
    append(c) { this.children.push(c); },
    classList: { add() {}, remove() {}, contains: () => false },
    querySelector: () => null,
    addEventListener() {},
  };
  const mainEl = {
    children: [gameList],
    insertBefore(c) { createdEls.push(c); },
    querySelector: (sel) => (sel === "footer" ? null : null),
    addEventListener() {},
  };
  class FakeOsc {
    constructor() { this.type = ""; this.frequency = { setValueAtTime() {} }; }
    connect() {}
    start() { oscStarts.push(Date.now()); }
    stop() {}
  }
  class FakeGain {
    constructor() { this.gain = { setValueAtTime() {}, exponentialRampToValueAtTime() {} }; }
    connect() {}
  }
  const sandbox = clipsCtx.sandbox;
  sandbox.document = {
    getElementById: (id) => elsById.get(id) || null,
    querySelector: (sel) => {
      if (sel === "#gameList") return gameList;
      if (sel === "main") return mainEl;
      return null;
    },
    querySelectorAll: () => [],
    createElement: (tag) => {
      const el = {
        tag, id: "", children: [], textContent: "", innerHTML: "",
        classList: { add() {}, remove() {}, contains: () => false },
        style: {},
        setAttribute(k, v) { if (k === "id") { this.id = v; elsById.set(v, this); } },
        append(c) { this.children.push(c); },
        addEventListener() {},
        querySelector: () => null,
      };
      createdEls.push(el);
      return el;
    },
    addEventListener: (type, fn) => { if (type === "pointerdown") pointerHandlers.push(fn); },
    body: { tag: "body" },
  };
  sandbox.MutationObserver = class {
    constructor(cb) { observerCbs.push(cb); }
    observe() {}
    disconnect() {}
  };
  sandbox.AudioContext = class {
    constructor() { this.currentTime = 0; this.state = "running"; }
    resume() {}
    createOscillator() { return new FakeOsc(); }
    createGain() { return new FakeGain(); }
  };
  sandbox.window.AudioContext = sandbox.AudioContext;
  sandbox.window.speechSynthesis = { cancel() {} };
  sandbox.window.Capacitor = undefined;
  const src = read("voice.js")
    .replace(/^import \{ TextToSpeech \} from "@capacitor-community\/text-to-speech";\s*$/m,
      "const TextToSpeech = { stop: async () => {}, openInstall: async () => true };");
  assert.ok(!src.includes("from \"@capacitor-community"), "voice.js import must be stubbed for the vm run");
  vm.runInContext(src, sandbox);
  assert.ok(sandbox.window.MatthewVoice, "voice.js must expose MatthewVoice");
  return {
    voice: sandbox.window.MatthewVoice,
    pointerHandlers,
    observerCbs,
    oscStarts,
    createdEls,
    gameList,
    firePointerdown() {
      const ev = { target: { closest: () => ({}) } };
      for (const fn of pointerHandlers) fn(ev);
    },
    fireObserver() { for (const cb of observerCbs) cb(); },
  };
}

// ------------------------------------------------------- item 1: removal
test("item 1: no pronunciation challenge anywhere in the shipped sources", () => {
  const voice = read("voice.js");
  for (const s of ["addPronunciationChallenge", "challengeSpeak", "pronounceChallenge",
    "pronounceCorrect", "pronounceRetry", "pronounceListen", "pronounceNext",
    "تحدي النطق", "SpeechRecognition", "SpeechSynthesisUtterance", "waitForBrowserVoices"]) {
    assert.ok(!voice.includes(s), "voice.js must not contain " + s);
  }
  // Whole-tree check (sources only): generated bundles are rebuilt at
  // integration (voice.bundle.js / interactive-games.js), the corpus
  // builder keeps the orphaned practice-word clip keys, and tests may
  // mention the removal — everything else must be clean.
  const walk = (dir) => {
    for (const name of fs.readdirSync(dir)) {
      if (name === "node_modules" || name === "work" || name === ".git" || name === "tests") continue;
      const p = path.join(dir, name);
      const st = fs.statSync(p);
      if (st.isDirectory()) walk(p);
      else if (/\.(js|html)$/.test(name) && !name.startsWith("voice.bundle") && name !== "interactive-games.js") {
        const text = fs.readFileSync(p, "utf8");
        for (const s of ["addPronunciationChallenge", "challengeSpeak", "تحدي النطق"]) {
          assert.ok(!text.includes(s), p + " must not contain " + s);
        }
      }
    }
  };
  walk(root);
});

test("item 1 (runtime): loading voice.js creates no pronunciation card or panel", () => {
  const ctx = loadClips();
  const v = loadVoice(ctx);
  v.fireObserver(); // the MutationObserver callback runs on every DOM change
  assert.equal(v.gameList.children.length, 0, "voice.js must add no card to #gameList");
  assert.ok(!v.createdEls.some((e) => e.id === "pronunciationChallenge"),
    "voice.js must not create a #pronunciationChallenge panel");
  assert.ok(!v.createdEls.some((e) => (e.textContent || "").includes("تحدي النطق")),
    "voice.js must not create any pronunciation UI");
  for (const name of ["speak", "speakSequence", "stop", "test", "feedback"]) {
    assert.equal(typeof v.voice[name], "function", "MatthewVoice must keep " + name);
  }
});

test("item 1: practice-word clips stay orphaned in the packs (harmless, reported)", () => {
  // pron_apple etc. were recorded for the challenge; nothing in the app
  // references them now, so they ship unused until a future feature (or a
  // pack rebuild) drops them. Assert the orphaning, not the clips' absence.
  const voice = read("voice.js");
  assert.ok(!voice.includes("pron_"), "voice.js must not reference pron_* clips");
  const corpus = read("build-corpus.js");
  assert.ok(corpus.includes("pron_apple"), "corpus still carries the orphaned pron_* clips (expected)");
});

// ------------------------------------------------------- item 4: queueing
test("item 4: a playKey landing mid-sequence waits — sequence plays fully, then the praise", async () => {
  const ctx = loadClips();
  const { clips } = ctx;
  let done = false;
  assert.equal(clips.playSequence(["Alpha", "Beta", "Gamma"], "ar-EG", () => { done = true; }), true);
  assert.deepEqual(ctx.playedKeys(), ["a"], "sequence must start with its first clip");
  // Mid-sequence, a praise arrives (the old code hijacked the element here).
  assert.equal(clips.playKey("praise1"), true, "queued praise reports played (it will play)");
  assert.deepEqual(ctx.playedKeys(), ["a"], "praise must NOT cut in while the sequence runs");
  ctx.endCurrent(); // a ends -> b
  assert.deepEqual(ctx.playedKeys(), ["a", "b"]);
  ctx.endCurrent(); // b ends -> c
  assert.deepEqual(ctx.playedKeys(), ["a", "b", "c"]);
  ctx.endCurrent(); // c ends -> onDone, then the queued praise
  assert.equal(done, true, "sequence onDone must fire after the last clip");
  assert.deepEqual(ctx.playedKeys(), ["a", "b", "c", "praise1"], "praise plays only after the sequence finishes");
  ctx.endCurrent();
  assert.equal(clips.isPlaying(), false, "nothing playing after the queued clip ends");
});

test("item 4: the 3.2.5 hang mechanism — a mid-sequence playKey must not strand onDone", async () => {
  const ctx = loadClips();
  const { clips } = ctx;
  let done = false;
  clips.playSequence(["Alpha", "Beta"], "ar-EG", () => { done = true; });
  clips.playKey("nancy_praise_1"); // Nancy praise landing mid-sequence
  clips.playKey("try1"); // and another clip right behind it
  ctx.endCurrent(); // a
  ctx.endCurrent(); // b -> onDone fires, then queued praise
  assert.equal(done, true, "onDone must fire even though two playKeys landed mid-sequence");
  assert.deepEqual(ctx.playedKeys(), ["a", "b", "nancy_praise_1"], "first queued clip plays after the sequence");
  ctx.endCurrent(); // Nancy praise ends -> second queued clip plays
  assert.deepEqual(ctx.playedKeys(), ["a", "b", "nancy_praise_1", "try1"]);
  ctx.endCurrent();
  assert.equal(clips.isPlaying(), false);
});

test("item 4: playSequence keeps preempt-and-clear-queue semantics", async () => {
  const ctx = loadClips();
  const { clips } = ctx;
  let done1 = false, done2 = false;
  clips.playSequence(["Alpha", "Beta", "Gamma"], "ar-EG", () => { done1 = true; });
  clips.playKey("praise1"); // queued behind sequence 1
  // A user tap starts a new sequence: sequence 1 is preempted, its onDone
  // never fires, the queued praise is dropped, sequence 2 plays fully.
  assert.equal(clips.playSequence(["Beta", "Gamma"], "ar-EG", () => { done2 = true; }), true);
  assert.equal(done1, false, "preempted sequence onDone must not fire");
  ctx.endCurrent(); // b (seq 2)
  ctx.endCurrent(); // c (seq 2) -> done2
  assert.equal(done2, true, "new sequence onDone must fire");
  assert.deepEqual(ctx.playedKeys(), ["a", "b", "c"], "queued praise must be dropped by the preempt");
});

test("item 4: stop() cancels the pending onDone and clears the queue", async () => {
  const ctx = loadClips();
  const { clips } = ctx;
  let done = false;
  clips.playSequence(["Alpha", "Beta"], "ar-EG", () => { done = true; });
  clips.playKey("praise1");
  clips.stop();
  assert.equal(done, false, "stop() must cancel the pending onDone");
  assert.equal(clips.isPlaying(), false, "stop() must report idle");
  // The runtime stays usable after a stop.
  let done2 = false;
  clips.playSequence(["Gamma"], "ar-EG", () => { done2 = true; });
  ctx.endCurrent();
  assert.equal(done2, true, "a sequence after stop() must complete");
  assert.deepEqual(ctx.playedKeys(), ["a", "c"], "queued praise must not leak out after stop()");
});

test("item 4: a rejected play() (no gesture yet) advances the chain instead of stalling", async () => {
  const ctx = loadClips();
  const { clips } = ctx;
  let done = false;
  ctx.rejectNextPlay(); // the first clip's play() rejects (autoplay block)
  clips.playSequence(["Alpha", "Beta"], "ar-EG", () => { done = true; });
  await sleep(50); // the rejection handler advances async
  assert.deepEqual(ctx.playedKeys(), ["a", "b"], "chain must advance past the rejected clip");
  ctx.endCurrent(); // b ends
  assert.equal(done, true, "onDone must still fire after a rejected play()");
});

test("item 4: a load error advances the chain instead of stalling", async () => {
  const ctx = loadClips();
  const { clips } = ctx;
  let done = false;
  clips.playSequence(["Alpha", "Beta"], "ar-EG", () => { done = true; });
  const inst = ctx.FakeAudio._instances.find((a) => a._id === ctx.plays[ctx.plays.length - 1].id);
  inst.fail(); // first clip fails to load
  assert.deepEqual(ctx.playedKeys(), ["a", "b"], "chain must advance past the failed clip");
  ctx.endCurrent();
  assert.equal(done, true);
});

test("item 4: stopSequence() stops a question sequence but leaves a lone clip playing", async () => {
  const ctx = loadClips();
  const { clips } = ctx;
  // Lone context clip (the story win line): stopSequence must NOT pause it.
  assert.equal(clips.playKey("win1"), true);
  const pausesBefore = ctx.pauses.length;
  clips.stopSequence();
  assert.equal(ctx.pauses.length, pausesBefore, "stopSequence must not pause a lone clip");
  assert.equal(clips.isPlaying(), true, "the lone clip keeps playing");
  ctx.endCurrent();
  assert.equal(clips.isPlaying(), false);
  // A running sequence IS stopped by stopSequence.
  let done = false;
  clips.playSequence(["Alpha", "Beta"], "ar-EG", () => { done = true; });
  clips.stopSequence();
  assert.equal(done, false, "stopSequence must cancel a sequence onDone");
  assert.equal(clips.isPlaying(), false);
});

test("item 4: isPlaying() tracks real playback", async () => {
  const ctx = loadClips();
  const { clips } = ctx;
  assert.equal(clips.isPlaying(), false, "idle at start");
  clips.playKey("a");
  assert.equal(clips.isPlaying(), true, "playing after playKey");
  ctx.endCurrent();
  assert.equal(clips.isPlaying(), false, "idle after the clip ends");
  clips.playSequence(["Alpha", "Beta"], "ar-EG");
  assert.equal(clips.isPlaying(), true, "playing during a sequence");
  ctx.endCurrent();
  assert.equal(clips.isPlaying(), true, "still playing on the second clip");
  ctx.endCurrent();
  assert.equal(clips.isPlaying(), false, "idle after the sequence");
});

test("item 4 (runtime): feedback() praise waits 550ms for the chime, then plays fully", async () => {
  const ctx = loadClips();
  const v = loadVoice(ctx);
  v.voice.feedback("correct");
  await sleep(400);
  assert.deepEqual(ctx.playedKeys(), [], "no praise clip may start before ~500ms (chime still ringing)");
  await sleep(400);
  assert.equal(ctx.playedKeys().length, 1, "praise must play after the chime finishes");
  assert.ok(ctx.playedKeys()[0].startsWith("praise") || ctx.playedKeys()[0].startsWith("nancy_praise"),
    "praise clip must be a praise key, got " + ctx.playedKeys()[0]);
});

// Round 3.2.6 (integrator, item 4): the +2600ms explanation timer cut
// every praise clip mid-sentence — the explanation now chains on the
// praise clip's end via feedback's onDone.
test("item 4 (runtime): feedback(kind, onDone) fires the explanation only after the praise clip ends", async () => {
  const ctx = loadClips();
  const v = loadVoice(ctx);
  let explained = false;
  v.voice.feedback("correct", () => { explained = true; });
  await sleep(400);
  assert.equal(ctx.playedKeys().length, 0, "no praise yet (chime still ringing)");
  await sleep(400);
  assert.equal(ctx.playedKeys().length, 1, "praise plays after the chime");
  assert.equal(explained, false, "explanation must NOT fire while the praise plays");
  ctx.endCurrent(); // praise ends
  await sleep(20);
  assert.equal(explained, true, "explanation fires when the praise clip ends");
});

test("item 4 (runtime): feedback('wrong', onDone) also chains after the retry clip", async () => {
  const ctx = loadClips();
  const v = loadVoice(ctx);
  let explained = false;
  v.voice.feedback("wrong", () => { explained = true; });
  await sleep(800);
  assert.equal(ctx.playedKeys().length, 1, "retry clip plays after the chime");
  assert.equal(explained, false, "explanation must NOT fire while the retry clip plays");
  ctx.endCurrent(); // retry clip ends
  await sleep(20);
  assert.equal(explained, true, "explanation fires when the retry clip ends");
});

test("item 4 (integrator): answer explanations chain on the praise via feedback onDone — no fixed 2600ms timer", () => {
  for (const [file, correct, wrong] of [
    ["app.js", 'feedback("correct",explainAnswer)', 'feedback("wrong",explainAnswer)'],
    ["stories.js", 'feedback("correct", explainAnswer)', 'feedback("wrong", explainAnswer)'],
    ["rescue.js", 'feedback("correct", explainAnswer)', 'feedback("wrong", explainAnswer)'],
  ]) {
    const src = read(file);
    assert.ok(src.includes(correct), file + " must chain the explanation on the praise (correct)");
    assert.ok(src.includes(wrong), file + " must chain the explanation on the praise (wrong)");
    assert.ok(!src.includes("},2600)"), file + " must not cut the praise with a fixed 2600ms explanation timer");
  }
});

test("item 4 (runtime): feedback() stops a question sequence but not a lone win clip", async () => {
  const ctx = loadClips();
  const v = loadVoice(ctx);
  // Lone win clip (stories win() order: playKey then feedback).
  ctx.clips.playKey("win1");
  const pausesBefore = ctx.pauses.length;
  v.voice.feedback("correct");
  assert.equal(ctx.pauses.length, pausesBefore, "feedback must not pause the win clip");
  await sleep(700); // praise delay elapses while the win clip still plays
  assert.deepEqual(ctx.playedKeys(), ["win1"], "praise must queue behind the win clip, not cut it");
  ctx.endCurrent(); // win clip ends -> queued praise plays
  assert.equal(ctx.playedKeys().length, 2, "praise plays after the win clip finishes");
  // Question sequence: feedback DOES stop it, praise plays on schedule.
  ctx.plays.length = 0;
  let done = false;
  ctx.clips.playSequence(["Alpha", "Beta"], "ar-EG", () => { done = true; });
  const n0 = ctx.playedKeys().length; // 1: the sequence's first clip
  v.voice.feedback("correct");
  assert.equal(done, false, "feedback must stop the question sequence");
  assert.equal(ctx.clips.isPlaying(), false, "sequence must be stopped");
  await sleep(700);
  assert.equal(ctx.playedKeys().length, n0 + 1, "praise plays after stopping the sequence");
  assert.ok(ctx.playedKeys()[n0].startsWith("praise") || ctx.playedKeys()[n0].startsWith("nancy_praise"),
    "the extra play must be a praise clip, got " + ctx.playedKeys()[n0]);
});

test("item 4 (runtime): tap blip is gated while a voice clip plays", async () => {
  const ctx = loadClips();
  const v = loadVoice(ctx);
  v.firePointerdown();
  assert.equal(v.oscStarts.length, 1, "tap blip sounds when nothing plays");
  ctx.clips.playKey("win1");
  v.firePointerdown();
  v.firePointerdown();
  assert.equal(v.oscStarts.length, 1, "no tap blip while a voice clip plays");
  ctx.endCurrent();
  v.firePointerdown();
  assert.equal(v.oscStarts.length, 2, "tap blip returns once the clip ends");
});

test("item 4 (runtime): a newer speak() still yields a pending praise (no overlap)", async () => {
  const ctx = loadClips();
  const v = loadVoice(ctx);
  v.voice.feedback("correct"); // praise scheduled at +550ms
  await sleep(100);
  await v.voice.speak("Alpha", "ar-EG"); // newer speech wins
  await sleep(700);
  // The speak clip played; the stale praise (requestId guard) never did.
  assert.deepEqual(ctx.playedKeys(), ["a"], "stale praise must not play after newer speech");
});

// ------------------------------------------------------- item 7: regression
test("item 7: repeated navigation/answer cycles never strand a chain or throw", async () => {
  const ctx = loadClips();
  const v = loadVoice(ctx);
  const { clips } = ctx;
  // 20 cycles: open a question sequence, answer mid-narration (feedback),
  // tap next (new sequence = preempt), sometimes back out (stop), sometimes
  // a lone clip + feedback (win path). After every cycle the runtime must
  // be idle, with no uncaught error.
  for (let i = 0; i < 20; i++) {
    clips.playSequence(["Alpha", "Beta", "Gamma"], "ar-EG", () => {});
    if (i % 3 === 0) ctx.endCurrent(); // hear the first clip, then answer
    v.voice.feedback(i % 2 === 0 ? "correct" : "wrong");
    await sleep(650); // praise delay elapses
    if (i % 4 === 0) clips.stop(); // back out mid-praise
    else if (i % 4 === 1) clips.playKey("win1"); // lone clip, then feedback
    else clips.playSequence(["Beta"], "ar-EG", () => {}); // next question
    // Drain whatever is now playing to completion (at most 4 clips).
    for (let k = 0; k < 4 && clips.isPlaying(); k++) ctx.endCurrent();
    assert.equal(clips.isPlaying(), false, "cycle " + i + " must settle idle");
  }
  // The runtime stays usable: one final sequence completes end to end.
  let done = false;
  clips.playSequence(["Alpha", "Beta", "Gamma"], "ar-EG", () => { done = true; });
  ctx.endCurrent();
  ctx.endCurrent();
  ctx.endCurrent();
  assert.equal(done, true, "final sequence must complete after the stress cycles");
  assert.deepEqual(ctx.playedKeys().slice(-3), ["a", "b", "c"]);
});

test("item 7: the voice MutationObserver does not loop on DOM mutations", () => {
  const ctx = loadClips();
  const v = loadVoice(ctx);
  // Fire the observer callback repeatedly (every DOM mutation in the app
  // does this): it must only run the idempotent guards, never write DOM.
  for (let i = 0; i < 50; i++) v.fireObserver();
  assert.equal(v.gameList.children.length, 0, "observer must not add cards");
  assert.equal(v.createdEls.length, 0, "observer must not create elements");
});

test("fallback voice forwards onDone (integrator): story/explanation chains must not hang when voice.bundle.js is absent", () => {
  const fb = read("voice-web-fallback.js");
  // speakSequence passes the callback through to the clips runtime, and
  // fires it async when there is nothing to play — same contract as
  // voice.js. Before this fix the fallback dropped onDone entirely, so a
  // story intro played and its first question never arrived.
  assert.ok(fb.includes('const speakSequence = (texts, lang = "ar-EG", onDone)'), "fallback speakSequence takes onDone");
  assert.ok(fb.includes("window.MatthewClips.playSequence(list, lang, onDone)"), "fallback speakSequence passes onDone to playSequence");
  assert.ok(fb.includes('if (!list.length) { if (typeof onDone === "function") setTimeout(onDone, 0); return false; }'), "fallback speakSequence fires onDone async on an empty list");
  // feedback fires its callback when the praise clip ends (via playKey),
  // and async when no clip plays — never swallows a chained explanation.
  assert.ok(fb.includes("const feedback = (type, onDone)"), "fallback feedback takes onDone");
  assert.ok(fb.includes("c.playKey(key, doneOnce)"), "fallback feedback passes the completion callback to playKey");
  assert.ok(fb.includes("c.playKey(\"praise1\", doneOnce)"), "fallback praise1 fallback keeps the callback");
  assert.ok(fb.includes("c.playKey(\"try1\", doneOnce)"), "fallback try1 fallback keeps the callback");
  // The Nancy rotation is untouched by the fix.
  assert.ok(fb.includes('"nancy_praise_1"') && fb.includes('"nancy_retry_1"'), "fallback still mirrors the Nancy rotation");
});
