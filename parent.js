"use strict";
/*
 * Parent dashboard (لوحة ولي الأمر) — id "parentPanel".
 * Other modules already hide #parentPanel when they open, so the panel uses
 * exactly that id. Entry is gated by a simple adult arithmetic question so a
 * KG1 child does not wander in and reset progress by accident.
 * All figures come from MatthewMastery (per-skill records) plus the existing
 * matthewHistory / matthewMathProgress keys — nothing new is collected.
 */
(() => {
  const main = document.querySelector("main");
  const learningList = document.getElementById("learningList");
  const gameList = document.getElementById("gameList");
  if (!main || !learningList || document.getElementById("parentPanel")) return;

  const LABELS = {
    "numbers": "عالم الأرقام",
    "letters": "حروف وكلمات",
    "colors": "الألوان والأشكال",
    "world": "معلومات ممتعة",
    "science": "العلوم والكون",
    "mixed": "اختبار المفاجآت",
    "arabic-letters": "مدرسة الحروف العربية",
    "math-ar": "رحلة الحساب بالعربي",
    "math-en": "Math in English",
    "listening": "اسمع واختار",
    "tracing": "تتبّع الكتابة",
    "reading-ar": "بداية القراءة بالعربي",
    "reading-en": "English CVC reading"
  };
  const digits = value => String(value).replace(/[0-9]/g, d => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
  const pct = value => digits(Math.round(value * 100)) + "٪";

  const panel = document.createElement("section");
  panel.id = "parentPanel";
  panel.className = "academy-panel hidden";
  main.insertBefore(panel, document.querySelector("footer"));

  const card = document.createElement("button");
  card.type = "button";
  card.className = "game-card blue";
  card.innerHTML = '<span class="game-icon">👨‍👩‍👦</span><strong>لوحة ولي الأمر</strong><small>تقدم ماثيو ونقاط القوة والمراجعة</small><span class="play">للكبار فقط ←</span>';
  learningList.append(card);

  let gateA = 0, gateB = 0;

  function open() {
    gameList.classList.add("hidden");
    learningList.classList.add("hidden");
    document.getElementById("quiz")?.classList.add("hidden");
    document.getElementById("result")?.classList.add("hidden");
    panel.classList.remove("hidden");
    renderGate();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function close() {
    panel.classList.add("hidden");
    gameList.classList.remove("hidden");
    learningList.classList.remove("hidden");
  }

  function renderGate() {
    gateA = 6 + Math.floor(Math.random() * 7); // 6..12
    gateB = 5 + Math.floor(Math.random() * 6); // 5..10
    panel.innerHTML =
      '<div class="quiz-top"><button id="parentBack" class="back" type="button">🏠 الرئيسية</button><strong>لوحة ولي الأمر</strong><span>للكبار</span></div>' +
      '<div class="basic-focus"><div class="basic-emoji">🔐</div><h2>سؤال سريع للكبار</h2>' +
      '<p>كام ناتج ' + digits(gateA) + ' + ' + digits(gateB) + '؟</p>' +
      '<div class="parent-gate"><input id="parentGateInput" inputmode="numeric" autocomplete="off" aria-label="ناتج الجمع">' +
      '<button id="parentGateBtn" class="primary" type="button">دخول</button></div>' +
      '<p id="parentGateMsg" class="feedback" aria-live="polite"></p></div>';
    panel.querySelector("#parentBack").onclick = close;
    const check = () => {
      const value = Number(String(panel.querySelector("#parentGateInput").value).replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d)));
      if (value === gateA + gateB) renderDashboard();
      else panel.querySelector("#parentGateMsg").textContent = "الإجابة مش صح، ركّز وجرب تاني.";
    };
    panel.querySelector("#parentGateBtn").onclick = check;
    panel.querySelector("#parentGateInput").addEventListener("keydown", e => { if (e.key === "Enter") check(); });
  }

  function topLevelSkills(summary) {
    // Collapse granular skills like "letters:<question>" into their category.
    const byCategory = new Map();
    for (const skill of summary.skills) {
      const category = skill.skillId.split(":")[0];
      if (skill.skillId.includes(":") && LABELS[skill.skillId]) continue; // safety
      const agg = byCategory.get(category) || { category, seen: 0, correct: 0, wrong: 0, mastered: false };
      // Category rows recorded directly carry the totals; granular rows are
      // already included in them, so only add granular rows for categories
      // that have no direct row (e.g. arabic-letter:ب).
      agg.seen += skill.seen; agg.correct += skill.correct; agg.wrong += skill.wrong;
      agg.mastered = agg.mastered || skill.mastered;
      byCategory.set(category, agg);
    }
    const direct = new Set(summary.skills.filter(s => !s.skillId.includes(":")).map(s => s.skillId.split(":")[0]));
    return [...byCategory.values()].map(row => {
      // Avoid double counting: if a direct category row exists it already
      // includes its granular children because both are recorded per answer;
      // in that case prefer the direct row only.
      if (direct.has(row.category)) {
        const directRow = summary.skills.find(s => s.skillId === row.category);
        return { ...row, seen: directRow.seen, correct: directRow.correct, wrong: directRow.wrong, mastered: directRow.mastered };
      }
      return row;
    }).filter(row => row.seen > 0).sort((a, b) => b.seen - a.seen);
  }

  function renderDashboard() {
    const mastery = window.MatthewMastery;
    const summary = mastery ? mastery.summary() : { skills: [], totalSeen: 0, totalCorrect: 0, overallAccuracy: 0, masteredCount: 0, dueCount: 0, strengths: [], needsPractice: [] };
    const rows = topLevelSkills(summary);
    let history = [];
    try { history = JSON.parse(localStorage.getItem("matthewHistory") || "[]"); if (!Array.isArray(history)) history = []; } catch (_) { history = []; }

    const rowsHtml = rows.length ? rows.map(row => {
      const acc = row.seen ? row.correct / row.seen : 0;
      const state = row.mastered ? "أتقنها 🏆" : acc >= 0.8 && row.seen >= 4 ? "قوي 💪" : acc < 0.6 && row.seen >= 3 ? "يحتاج تدريب 🌱" : "بيتعلم 📚";
      return '<div class="parent-row"><strong>' + (LABELS[row.category] || row.category) + '</strong>' +
        '<span>' + digits(row.correct) + ' صح من ' + digits(row.seen) + ' (' + pct(acc) + ')</span>' +
        '<span>' + state + '</span></div>';
    }).join("") : '<p class="academy-hint">لسه مفيش محاولات مسجلة. أول ما ماثيو يلعب، التقدم هيظهر هنا.</p>';

    const due = mastery ? mastery.dueSkills().slice(0, 5) : [];
    const dueHtml = due.length ? '<ul class="parent-list">' + due.map(s => '<li>' + (LABELS[s.skillId.split(":")[0]] || s.skillId) + ' — دقة ' + pct(s.seen ? s.correct / s.seen : 0) + '</li>').join("") + '</ul>'
      : '<p>مفيش مهارات مستحقة للمراجعة دلوقتي. 👍</p>';

    const weak = summary.needsPractice[0];
    const recommendation = !summary.totalSeen
      ? "ابدأ بجلسة قصيرة (٥–١٠ دقائق) في الحروف أو الأرقام، وخلي النهاية دايمًا على لعبة بيحبها."
      : weak
        ? "ركّز الجلسة الجاية على «" + (LABELS[weak.skillId.split(":")[0]] || weak.skillId) + "» بجلسات قصيرة ومتكررة، والتطبيق هيرجّع له أسئلتها تلقائيًا بنظام التكرار المتباعد."
        : summary.strengths.length
          ? "ماثيو ثابت في مهارات قوية. خليه يكمل بنفس الإيقاع، وجرّب قسمًا جديدًا هذا الأسبوع لتوسيع اهتماماته."
          : "الاستمرارية أهم من طول الجلسة: ١٠ دقائق يوميًا أفضل من ساعة مرة واحدة في الأسبوع.";

    const historyHtml = history.length ? '<ul class="parent-list">' + history.slice(0, 5).map(h =>
      '<li>' + h.category + ': ' + digits(h.score) + ' من ' + digits(h.total) + ' — ' + new Date(h.at).toLocaleDateString("ar-EG") + '</li>').join("") + '</ul>'
      : '<p>لسه مفيش جلسات اختبار مسجلة.</p>';

    panel.innerHTML =
      '<div class="quiz-top"><button id="parentBack" class="back" type="button">🏠 الرئيسية</button><strong>لوحة ولي الأمر</strong><span>📊</span></div>' +
      '<div class="stats parent-stats"><span>🎯 محاولات <b>' + digits(summary.totalSeen) + '</b></span>' +
      '<span>✅ دقة عامة <b>' + pct(summary.overallAccuracy) + '</b></span>' +
      '<span>🏆 مهارات أتقنها <b>' + digits(summary.masteredCount) + '</b></span>' +
      '<span>⏰ للمراجعة اليوم <b>' + digits(summary.dueCount) + '</b></span></div>' +
      '<h3>التقدم حسب القسم</h3>' + rowsHtml +
      '<h3>مستحق للمراجعة (تكرار متباعد)</h3>' + dueHtml +
      '<h3>توصية الجلسة الجاية</h3><p class="math-tip">' + recommendation + '</p>' +
      '<h3>آخر جلسات الاختبار</h3>' + historyHtml +
      '<button id="parentResetMastery" class="secondary" type="button">تصفير بيانات الإتقان فقط</button>';
    panel.querySelector("#parentBack").onclick = close;
    panel.querySelector("#parentResetMastery").onclick = () => {
      if (window.MatthewMastery) window.MatthewMastery.reset();
      renderDashboard();
    };
  }

  card.addEventListener("click", open);
})();
