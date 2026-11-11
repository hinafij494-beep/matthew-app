"use strict";
/*
 * MatthewMastery — per-skill mastery tracking with spaced repetition.
 *
 * Pedagogy (KG1): a skill is only "mastered" after repeated correct answers
 * spread over time, not after one lucky guess. Correct answers move a skill
 * up a ladder of review intervals (same session -> 1 day -> 3 days -> 1 week
 * -> 2 weeks). A wrong answer drops the skill one rung and schedules a
 * near-term review, so mistakes are revisited soon but without punishment.
 *
 * Storage: localStorage key "matthewMasteryV1"
 *   { "<skillId>": { seen, correct, wrong, streak, level, lastAt, nextReviewAt } }
 * The module is environment-agnostic so it can be unit-tested in Node.
 */
(function (root, factory) {
  const api = factory();
  root.MatthewMastery = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  const STORAGE_KEY = "matthewMasteryV1";
  const CROWN_KEY = "matthewCrownV1";
  const DAY = 24 * 60 * 60 * 1000;
  // Review ladder in days, indexed by level 0..4. Level 0 = review today.
  const INTERVALS_DAYS = [0, 1, 3, 7, 14];
  const MAX_LEVEL = INTERVALS_DAYS.length - 1;

  function storage() {
    try {
      if (typeof localStorage !== "undefined") return localStorage;
    } catch (_) { /* storage can throw in private mode */ }
    return null;
  }

  function load() {
    const store = storage();
    if (!store) return {};
    try {
      const raw = JSON.parse(store.getItem(STORAGE_KEY) || "{}");
      return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    } catch (_) {
      return {};
    }
  }

  function save(data) {
    const store = storage();
    if (!store) return;
    try { store.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (_) { /* quota */ }
  }

  // ---- Royal crown store (scope 10) ----
  // The crown decorates King Matthew for every correct answer: +1 star per
  // correct answer, +1 diamond whenever a skill climbs a mastery level.
  // It lives under its own key so the mastery ladder (level / streak /
  // accuracy / nextReviewAt) never changes shape or meaning.
  function loadCrown() {
    const store = storage();
    if (!store) return { stars: 0, diamonds: 0 };
    try {
      const raw = JSON.parse(store.getItem(CROWN_KEY) || "{}");
      const num = v => {
        const n = Number(v);
        return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
      };
      return { stars: raw && typeof raw === "object" ? num(raw.stars) : 0, diamonds: raw && typeof raw === "object" ? num(raw.diamonds) : 0 };
    } catch (_) {
      return { stars: 0, diamonds: 0 };
    }
  }

  function saveCrown(crownData) {
    const store = storage();
    if (!store) return;
    try {
      store.setItem(CROWN_KEY, JSON.stringify({
        stars: Math.max(0, Math.floor(Number(crownData.stars) || 0)),
        diamonds: Math.max(0, Math.floor(Number(crownData.diamonds) || 0))
      }));
    } catch (_) { /* quota */ }
  }

  // Current crown counts: { stars, diamonds } (zeros when nothing is stored).
  function crown() {
    return loadCrown();
  }

  // Add bonus stars / diamonds (e.g. +1 diamond for finishing a whole game).
  // Missing or negative amounts count as 0. Returns the updated counts.
  function awardCrown(stars, diamonds) {
    const current = loadCrown();
    current.stars += Math.max(0, Math.floor(Number(stars) || 0));
    current.diamonds += Math.max(0, Math.floor(Number(diamonds) || 0));
    saveCrown(current);
    return { stars: current.stars, diamonds: current.diamonds };
  }

  function blank(now) {
    return { seen: 0, correct: 0, wrong: 0, streak: 0, level: 0, lastAt: 0, nextReviewAt: now };
  }

  // Record one answered question for a skill. Returns the updated record.
  function record(skillId, isCorrect, now) {
    if (!skillId) return null;
    const at = typeof now === "number" ? now : Date.now();
    const data = load();
    const entry = data[skillId] || blank(at);
    const prevLevel = entry.level;
    entry.seen += 1;
    entry.lastAt = at;
    if (isCorrect) {
      entry.correct += 1;
      entry.streak += 1;
      // Two correct answers in a row are needed to climb one rung, so a
      // single lucky tap never marks a KG1 skill as learned.
      if (entry.streak >= 2 && entry.level < MAX_LEVEL) {
        entry.level += 1;
        entry.streak = 0;
      }
    } else {
      entry.wrong += 1;
      entry.streak = 0;
      if (entry.level > 0) entry.level -= 1;
    }
    entry.nextReviewAt = at + INTERVALS_DAYS[entry.level] * DAY;
    data[skillId] = entry;
    save(data);
    // Crown: a star for every correct answer, a diamond when the skill
    // climbs a rung. This only writes the separate crown key; the entry
    // returned above is exactly what the ladder computed.
    if (isCorrect) awardCrown(1, entry.level > prevLevel ? 1 : 0);
    return entry;
  }

  function get(skillId) {
    return load()[skillId] || null;
  }

  function all() {
    return load();
  }

  function accuracy(entry) {
    if (!entry || !entry.seen) return 0;
    return entry.correct / entry.seen;
  }

  // A skill counts as mastered at the top two rungs with solid accuracy.
  function isMastered(entry) {
    return !!entry && entry.level >= 3 && entry.seen >= 4 && accuracy(entry) >= 0.75;
  }

  // Skills whose review date has arrived, weakest first.
  function dueSkills(now) {
    const at = typeof now === "number" ? now : Date.now();
    return Object.entries(load())
      .filter(([, entry]) => entry.seen > 0 && entry.nextReviewAt <= at && !isMastered(entry))
      .sort((a, b) => (accuracy(a[1]) - accuracy(b[1])) || (a[1].nextReviewAt - b[1].nextReviewAt))
      .map(([skillId, entry]) => ({ skillId, ...entry }));
  }

  // Selection weight for question picking: due/weak skills surface more
  // often, new skills get a fair chance, mastered skills mostly rest.
  function weight(skillId, now) {
    const at = typeof now === "number" ? now : Date.now();
    const entry = load()[skillId];
    if (!entry || !entry.seen) return 3; // unseen: introduce it
    if (isMastered(entry)) return entry.nextReviewAt <= at ? 1 : 0.25;
    const dueBoost = entry.nextReviewAt <= at ? 3 : 1;
    return dueBoost * (1 + (1 - accuracy(entry)) * 2);
  }

  function summary(now) {
    const data = load();
    const skills = Object.entries(data).map(([skillId, entry]) => ({
      skillId,
      ...entry,
      accuracy: accuracy(entry),
      mastered: isMastered(entry)
    }));
    const seen = skills.reduce((sum, s) => sum + s.seen, 0);
    const correct = skills.reduce((sum, s) => sum + s.correct, 0);
    return {
      skills,
      totalSeen: seen,
      totalCorrect: correct,
      overallAccuracy: seen ? correct / seen : 0,
      masteredCount: skills.filter(s => s.mastered).length,
      dueCount: dueSkills(now).length,
      strengths: skills.filter(s => s.seen >= 4 && s.accuracy >= 0.8).sort((a, b) => b.accuracy - a.accuracy),
      needsPractice: skills.filter(s => s.seen >= 3 && s.accuracy < 0.6).sort((a, b) => a.accuracy - b.accuracy)
    };
  }

  function reset() {
    const store = storage();
    if (store) { try { store.removeItem(STORAGE_KEY); } catch (_) { /* ignore */ } }
  }

  return {
    STORAGE_KEY,
    CROWN_KEY,
    INTERVALS_DAYS,
    record,
    crown,
    awardCrown,
    get,
    all,
    accuracy,
    isMastered,
    dueSkills,
    weight,
    summary,
    reset
  };
});
