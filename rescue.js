// rescue.js — «قصص ومغامرات الملك ماثيو»: أربع مغامرات قصصية بمراحل،
// أسئلتها من بنك الاختبارات وتتغير كل مرة بالخلط العشوائي:
// ١) مغامرة الإنقاذ — ينقذ مارك ومريم التائهين في الغابة
// ٢) تحدي حيوانات الغابة — يواجه الأسد والثعلب والدب والنمر بأسئلة
// ٣) رحلة الغابة مع مارك — نزهة ومراحل حتى العودة للبيت
// ٤) كنز الملك — خريطة ومراحل حتى باب الكنز
(() => {
  const main = document.querySelector("main");
  const gameList = document.getElementById("gameList");
  if (!main || !gameList) return;

  const STORIES = [
    {
      id: "rescue", title: "مغامرة الإنقاذ", icon: "🐴", hero: "🤴🐴", goal: "👶👧", cats: null,
      desc: "ساعد الملك ماثيو ينقذ أخوه مارك وبنت عمه مريم التايهين في الغابة",
      introClip: "rescueIntro",
      intro: "يا خبر! مارك ومريم تايهين في الغابة! يلا يا ملك ماثيو، اركب حصانك وخد سيفك وروح أنقذهم!",
      stages: [
        { name: "بوابة الغابة", icon: "🌲", clip: "rescueStage1", line: "المرحلة الأولى: بوابة الغابة. جاوب على الأسئلة وعدّي البوابة يا بطل!" },
        { name: "النهر الكبير", icon: "🛶", clip: "rescueStage2", line: "المرحلة التانية: النهر الكبير. قرّبت من مارك ومريم يا بطل!" },
        { name: "الكهف", icon: "🕯️", clip: "rescueStage3", line: "المرحلة التالتة: الكهف. ما تخافش يا بطل، أنت شجاع!" },
        { name: "الشجرة الكبيرة", icon: "🌳", clip: "rescueStage4", line: "آخر مرحلة: الشجرة الكبيرة. مارك ومريم مستنيّينك هناك!" }
      ],
      closers: ["rescueCloser1", "rescueCloser2", "rescueCloser3"],
      winClip: "rescueWin", winTitle: "وصلت يا بطل! 🎉",
      win: "عملتها يا بطل! أنقذت مارك ومريم! أنت أحسن أخ في الدنيا!",
      winStory: "أنقذت مارك ومريم! هما بخير وفرحانين بيك أوي يا أحلى أخ في الدنيا!"
    },
    {
      id: "animals", title: "تحدي حيوانات الغابة", icon: "🦁", hero: "🤴🗡️", goal: "👑", cats: ["world", "science"],
      desc: "واجه الأسد والثعلب والدب والنمر وكسبهم بذكائك",
      introClip: "storyAnimalsIntro",
      intro: "الملك ماثيو دخل الغابة، وحيوانات الغابة عايزة تتحداه بأسئلة! جاوب صح يا بطل وعدّي كل حيوان!",
      stages: [
        { name: "تحدي الأسد", icon: "🦁", clip: "storyLion", line: "الأسد ملك الغابة بيقولك: جاوب على أسئلتي وعدّي يا شجاع!" },
        { name: "تحدي الثعلب المكار", icon: "🦊", clip: "storyFox", line: "الثعلب المكار بيحاول يلخبطك بأسئلة ملفوفة، ركّز يا بطل!" },
        { name: "تحدي الدب الكبير", icon: "🐻", clip: "storyBear", line: "الدب الكبير واقف في الطريق! جاوب صح وهو هيسيبك تعدّي." },
        { name: "تحدي النمر السريع", icon: "🐯", clip: "storyTiger", line: "آخر تحدي: النمر السريع! جاوب وخلّص المغامرة يا بطل!" }
      ],
      closers: ["storyAnimalsCloser1", "storyAnimalsCloser2", "rescueCloser3"],
      winClip: "storyAnimalsWin", winTitle: "كسبت كل الحيوانات! 👑",
      win: "برافو يا ملك ماثيو! كسبت كل حيوانات الغابة بذكائك وبقيت ملك الغابة الحقيقي!",
      winStory: "كل حيوانات الغابة بتحييك! الأسد نفسه قال: ده أذكى ملك شفته!"
    },
    {
      id: "trip", title: "رحلة الغابة مع مارك", icon: "🎒", hero: "🤴👶", goal: "🏠", cats: null,
      desc: "نزهة جميلة مع أخوك مارك: شجرة تفاح وبحيرة وتل وطريق البيت",
      introClip: "storyTripIntro",
      intro: "ماثيو خد أخوه الصغير مارك وطلعوا رحلة حلوة في الغابة! يلا نتمشى معاهم ونجاوب لحد ما نرجع البيت!",
      stages: [
        { name: "شجرة التفاح", icon: "🍎", clip: "storyTrip1", line: "أول محطة: شجرة التفاح الكبيرة! قطفنا تفاح حلو وكمّلنا المشوار." },
        { name: "البحيرة", icon: "🦆", clip: "storyTrip2", line: "وصلنا البحيرة! البط بيعوم ومارك فرحان أوي. كمّل يا بطل!" },
        { name: "التل الكبير", icon: "⛰️", clip: "storyTrip3", line: "طلعنا التل الكبير وشفنا الغابة كلها من فوق! منظر جميل!" },
        { name: "طريق البيت", icon: "🏠", clip: "storyTrip4", line: "آخر محطة: طريق البيت! قرّبنا نوصل ومارك عايز يحكي لماما عن الرحلة!" }
      ],
      closers: ["storyTripCloser1", "storyTripCloser2", "rescueCloser2"],
      winClip: "storyTripWin", winTitle: "وصلنا البيت! 🏠",
      win: "وصلنا البيت! كانت رحلة جميلة مع مارك، وأنت أحلى أخ كبير في الدنيا!",
      winStory: "ماما فرحانة بيكو أوي! مارك بيضحك وبيقول: عايز رحلة تانية مع أخويا الملك!"
    },
    {
      id: "treasure", title: "كنز الملك", icon: "💎", hero: "🤴🗺️", goal: "💎", cats: ["numbers", "letters"],
      desc: "خريطة كنز قديمة وألغاز: كهف وجسر وبرج وباب الكنز",
      introClip: "storyTreasureIntro",
      intro: "الملك ماثيو لقى خريطة كنز قديمة! يلا نسافر معاه ونجاوب على الألغاز لحد ما نوصل للكنز!",
      stages: [
        { name: "الكهف المظلم", icon: "🕯️", clip: "storyTreasure1", line: "أول لغز عند الكهف المظلم! فكّر كويس يا بطل والكنز هيقرّب." },
        { name: "الجسر القديم", icon: "🌉", clip: "storyTreasure2", line: "الجسر القديم بيهتز! جاوب صح وعدّي على مهلك." },
        { name: "البرج العالي", icon: "🗼", clip: "storyTreasure3", line: "طلعنا البرج العالي وشفنا باب الكنز من بعيد! فاضل شوية!" },
        { name: "باب الكنز", icon: "🗝️", clip: "storyTreasure4", line: "وصلنا باب الكنز! آخر ألغاز وهنفتح الباب سوا!" }
      ],
      closers: ["storyTreasureCloser1", "storyTreasureCloser2", "rescueCloser3"],
      winClip: "storyTreasureWin", winTitle: "فتحت الكنز! 💎",
      win: "فتحت باب الكنز يا بطل! والكنز الحقيقي هو شطارتك وعقلك الجميل!",
      winStory: "جوه الكنز لقيت تاج دهب ونجوم كتير، وورقة مكتوب عليها: لأشطر ملك في الدنيا!"
    }
  ];
  const PER_STAGE = 3;

  const speak = (text, key) => {
    try { if (key && window.MatthewClips && window.MatthewClips.playKey(key)) return; } catch (_) {}
    window.MatthewVoice?.speak(text, "ar-EG");
  };
  const arabicDigits = value => String(value).replace(/[0-9]/g, d => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
  const shuffle = arr => { const b = [...arr]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

  const panel = document.createElement("section");
  panel.id = "rescuePanel";
  panel.className = "quiz-panel hidden";
  panel.setAttribute("aria-live", "polite");
  panel.innerHTML =
    '<div class="quiz-top"><button id="rescueBack" class="back" type="button">→ رجوع</button><strong>📖 قصص ومغامرات الملك ماثيو</strong><span id="rescueProgress"></span></div>' +
    '<div class="rescue-map" id="rescueMap" aria-hidden="true"></div>' +
    '<div class="rescue-scene" id="rescueScene"><span class="scene-sun">☀️</span><span class="scene-cloud c1">☁️</span><span class="scene-cloud c2">☁️</span><span class="scene-badge" id="rescueStageIcon">🌲</span><span class="rescue-king" id="rescueHero">🤴🐴</span><span class="rescue-kids" id="rescueGoal">👶👧</span><span class="scene-ground"></span></div>' +
    '<h2 id="rescueTitle">اختار مغامرتك!</h2>' +
    '<p id="rescueStory" class="rescue-story"></p>' +
    '<div id="rescuePlay"></div>';
  main.insertBefore(panel, document.querySelector("footer"));
  const $ = id => panel.querySelector("#" + id);

  let story = null, stage = 0, inStage = 0, questions = [], current = null, answered = false, score = 0, total = 0;
  let qToken = 0, lastChoices = [];

  const pool = () => {
    try {
      if (typeof bank === "undefined" || !bank) return [];
      const cats = story && story.cats ? story.cats : ["numbers", "letters", "colors", "world", "science"];
      return cats.flatMap(cat => (bank[cat] || []).map(q => ({ ...q, cat })));
    } catch (_) { return []; }
  };

  const focusMode = on => {
    try {
      [...main.children].forEach(el => { if (el !== panel) el.style.display = on ? "none" : ""; });
      document.body.classList.toggle("story-focus", on);
    } catch (_) {}
  };

  const hideOthers = () => {
    gameList.classList.add("hidden");
    document.getElementById("learningList")?.classList.add("hidden");
    document.getElementById("quiz")?.classList.add("hidden");
    document.getElementById("result")?.classList.add("hidden");
    ["numbersPanel", "englishMathPanel", "scienceAcademy", "interactivePanel", "parentPanel", "tracingPanel", "readingPanel", "pronunciationChallenge", "lessonHub", "lessonView"].forEach(id => document.getElementById(id)?.classList.add("hidden"));
  };

  const openPicker = () => {
    story = null;
    focusMode(true);
    hideOthers();
    panel.classList.remove("hidden");
    $("rescueMap").innerHTML = "";
    $("rescueHero").textContent = "🤴🐴";
    $("rescueStageIcon").textContent = "📖";
    $("rescueGoal").textContent = "🏰";
    $("rescueProgress").textContent = "";
    $("rescueTitle").textContent = "اختار مغامرتك يا ملك! 📖";
    $("rescueStory").textContent = "كل قصة فيها مراحل وأسئلة جديدة كل مرة. اختار قصة وابدأ المغامرة!";
    const play = $("rescuePlay");
    play.innerHTML = '<div class="science-grid story-grid">' + STORIES.map((s, i) => {
      let best = 0;
      try { best = Number(localStorage.getItem("matthewStoryBest:" + s.id) || 0); } catch (_) {}
      return '<button type="button" class="science-card story-card s' + s.id + '" data-story="' + i + '"><span>' + s.icon + '</span><b>' + s.title + '</b><small>' + s.desc + (best ? ' — ⭐'.repeat(Math.min(5, best)) : '') + '</small></button>';
    }).join("") + '</div>';
    play.querySelectorAll("[data-story]").forEach(b => b.addEventListener("click", () => startStory(STORIES[Number(b.dataset.story)])));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const startStory = chosen => {
    focusMode(true);
    story = chosen;
    const all = pool();
    if (!all.length) return;
    questions = shuffle(all);
    stage = 0; inStage = 0; score = 0; total = 0;
    hideOthers();
    panel.classList.remove("hidden");
    $("rescueHero").textContent = story.hero;
    $("rescueGoal").textContent = story.goal;
    startStage(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const renderMap = () => {
    $("rescueMap").innerHTML = story.stages.map((s, i) =>
      '<span class="rescue-stop' + (i < stage ? " done" : i === stage ? " now" : "") + '">' + (i < stage ? "⭐" : s.icon) + '</span>'
    ).join('<span class="rescue-path">- - -</span>') + '<span class="rescue-stop goal">' + story.goal + '</span>';
    $("rescueHero").style.insetInlineStart = (4 + stage * 19) + "%";
    $("rescueStageIcon").textContent = story.stages[Math.min(stage, story.stages.length - 1)].icon;
    $("rescueProgress").textContent = arabicDigits("المرحلة " + Math.min(stage + 1, story.stages.length) + " من " + story.stages.length);
  };

  const startStage = first => {
    renderMap();
    const s = story.stages[stage];
    $("rescueTitle").textContent = s.icon + " " + s.name;
    if (first && stage === 0) {
      $("rescueStory").textContent = story.intro;
      speak(story.intro, story.introClip);
    } else {
      $("rescueStory").textContent = s.line;
      speak(s.line, s.clip);
    }
    nextQuestion();
  };

  const nextQuestion = () => {
    qToken++;
    answered = false;
    current = questions[(stage * PER_STAGE + inStage) % questions.length];
    const play = $("rescuePlay");
    play.innerHTML =
      '<div class="question-emoji">' + current.e + '</div>' +
      '<h3 class="rescue-question">' + arabicDigits(current.q) + '</h3>' +
      '<button type="button" class="voice-button" id="rescueListen">🔊 اسمع السؤال والاختيارات</button>' +
      '<div class="answers" id="rescueAnswers"></div>' +
      '<p class="feedback" id="rescueFeedback"></p>' +
      '<button type="button" class="primary hidden" id="rescueNext">كمّل المغامرة ←</button>';
    play.querySelector("#rescueListen").addEventListener("click", () => {
      if (window.MatthewVoice?.speakSequence) window.MatthewVoice.speakSequence([current.q, ...lastChoices], "ar-EG");
      else window.MatthewVoice?.speak(current.q + " " + lastChoices.join("، "), "ar-EG");
    });
    setTimeout(() => window.MatthewVoice?.speak(current.q, "ar-EG"), 350);
    const answers = play.querySelector("#rescueAnswers");
    const items = shuffle(current.a.map((text, i) => ({ text, correct: i === current.c })));
    lastChoices = items.map(x => x.text);
    items.forEach(item => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "answer"; b.dataset.answer = item.text;
      b.innerHTML = '<span class="answer-picture">' + (window.answerPic ? window.answerPic(item.text, current) : current.e) + '</span><span class="answer-label">' + arabicDigits(item.text) + '</span><span class="answer-say" title="اسمع الإجابة">🔊</span>';
      b.querySelector(".answer-say").addEventListener("click", e => { e.stopPropagation(); window.MatthewVoice?.speak(item.text, "ar-EG"); });
      b.addEventListener("click", () => choose(b, item.correct, answers));
      answers.append(b);
    });
    play.querySelector("#rescueNext").addEventListener("click", advance);
  };

  const choose = (button, correct, answers) => {
    if (answered) return;
    answered = true; total++;
    try { window.MatthewMastery?.record("story:" + current.q, correct); window.MatthewMastery?.record(current.cat + ":" + current.q, correct); } catch (_) {}
    answers.querySelectorAll(".answer").forEach(b => { b.disabled = true; });
    const feedback = $("rescuePlay").querySelector("#rescueFeedback");
    if (correct) {
      score++;
      button.classList.add("correct");
      feedback.textContent = "برافو يا بطل! إجابة صح ⭐";
      window.MatthewVoice?.feedback("correct");
    } else {
      button.classList.add("wrong");
      feedback.textContent = "محاولة جميلة يا بطل! الإجابة الصح باللون الأخضر 💜";
      answers.querySelectorAll(".answer").forEach(b => { if (b.dataset.answer === current.a[current.c]) b.classList.add("correct"); });
      window.MatthewVoice?.feedback("wrong");
    }
    $("rescuePlay").querySelector("#rescueNext").classList.remove("hidden");
    const tk = qToken, cq = current;
    setTimeout(() => {
      if (qToken !== tk || !answered || !cq) return;
      if (window.MatthewVoice?.speakSequence) window.MatthewVoice.speakSequence(["الإجابة الصحيحة هي", cq.a[cq.c]], "ar-EG");
      else window.MatthewVoice?.speak("الإجابة الصحيحة هي " + cq.a[cq.c], "ar-EG");
    }, 2600);
  };

  const advance = () => {
    inStage++;
    if (inStage < PER_STAGE) { nextQuestion(); return; }
    inStage = 0; stage++;
    if (stage >= story.stages.length) { win(); return; }
    renderMap();
    const s = story.stages[stage];
    $("rescueTitle").textContent = "قرّبت يا بطل! 🎉";
    $("rescueStory").textContent = "عدّيت مرحلة! كمّل كده وانت هتوصل…";
    speak(s.line, story.closers[Math.min(stage - 1, story.closers.length - 1)]);
    const play = $("rescuePlay");
    play.innerHTML = '<div class="question-emoji">' + s.icon + '</div><h3 class="rescue-question">المرحلة اللي جاية: ' + s.name + '</h3><button type="button" class="primary" id="rescueGo">يلا كمّل ←</button>';
    play.querySelector("#rescueGo").addEventListener("click", () => startStage(false));
  };

  const win = () => {
    renderMap();
    $("rescueHero").style.insetInlineStart = "76%";
    $("rescueTitle").textContent = story.winTitle;
    $("rescueStory").textContent = story.winStory;
    speak(story.win, story.winClip);
    window.MatthewVoice?.feedback("correct");
    const stars = Math.max(1, Math.round((score / Math.max(1, total)) * 5));
    try {
      const old = Number(localStorage.getItem("matthewStars") || 0);
      localStorage.setItem("matthewStars", old + stars);
      const trophies = Number(localStorage.getItem("matthewTrophies") || 0);
      localStorage.setItem("matthewTrophies", trophies + 1);
      const bestKey = "matthewStoryBest:" + story.id;
      localStorage.setItem(bestKey, Math.max(Number(localStorage.getItem(bestKey) || 0), stars));
      let history = [];
      try { history = JSON.parse(localStorage.getItem("matthewHistory") || "[]"); if (!Array.isArray(history)) history = []; } catch (_) { history = []; }
      history.unshift({ category: story.title, score, total, stars, points: score * 10, at: Date.now() });
      localStorage.setItem("matthewHistory", JSON.stringify(history.slice(0, 30)));
    } catch (_) {}
    const play = $("rescuePlay");
    play.innerHTML =
      '<div class="question-emoji">' + story.hero + story.goal + '</div>' +
      '<div class="result-stars">' + "⭐".repeat(stars) + "☆".repeat(5 - stars) + '</div>' +
      '<p class="feedback">جاوبت صح على ' + arabicDigits(score) + ' من ' + arabicDigits(total) + ' أسئلة</p>' +
      '<button type="button" class="primary" id="rescueAgain">العب القصة دي تاني ←</button>' +
      '<button type="button" class="secondary" id="rescueStories">اختار قصة تانية 📖</button>' +
      '<button type="button" class="secondary" id="rescueHome">العودة للمملكة</button>';
    play.querySelector("#rescueAgain").addEventListener("click", () => startStory(story));
    play.querySelector("#rescueStories").addEventListener("click", openPicker);
    play.querySelector("#rescueHome").addEventListener("click", close);
  };

  const close = () => {
    focusMode(false);
    panel.classList.add("hidden");
    gameList.classList.remove("hidden");
    document.getElementById("learningList")?.classList.remove("hidden");
    try { window.MatthewVoice?.stop(); } catch (_) {}
    if (typeof updateStats === "function") { try { updateStats(); } catch (_) {} }
  };
  $("rescueBack").addEventListener("click", () => { if (story) openPicker(); else close(); });

  if (!document.getElementById("rescueStyle")) {
    const style = document.createElement("style");
    style.id = "rescueStyle";
    style.textContent =
      "body.story-focus .topbar{display:none}" +
      "#rescuePanel{background:linear-gradient(180deg,#fdfbff,#f3efff);border-radius:28px;padding:18px 16px 26px;box-shadow:0 18px 50px #6a4fd322}" +
      ".rescue-map{display:flex;align-items:center;justify-content:center;gap:4px;margin:14px 0 6px;flex-wrap:nowrap}" +
      ".rescue-map .rescue-path{color:#c9bdf0;font-size:.8rem;letter-spacing:1px}" +
      ".rescue-map .rescue-stop{display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:50%;background:#fff;border:3px solid #e3dcff;font-size:1.25rem;opacity:.55;flex:0 0 auto}" +
      ".rescue-map .rescue-stop.done{opacity:1;background:#fff7d6;border-color:#ffd94d}" +
      ".rescue-map .rescue-stop.now{opacity:1;border-color:#7c5cff;transform:scale(1.18);box-shadow:0 0 0 6px #7c5cff22;animation:rescuePulse 1.2s ease-in-out infinite}" +
      ".rescue-map .rescue-stop.goal{opacity:1;background:#ffeef8;border-color:#ff8ac2}" +
      "@keyframes rescuePulse{0%,100%{transform:scale(1.18)}50%{transform:scale(1.3)}}" +
      ".rescue-scene{position:relative;height:158px;border-radius:24px;overflow:hidden;background:linear-gradient(180deg,#79c9ff 0%,#cdefff 55%,#e9ffd9 56%,#b7e39a 100%);margin:10px 0 4px;box-shadow:inset 0 -14px 24px #00000010}" +
      ".scene-sun{position:absolute;top:8px;inset-inline-end:14px;font-size:1.9rem;animation:rescueSpin 14s linear infinite}" +
      "@keyframes rescueSpin{to{transform:rotate(360deg)}}" +
      ".scene-cloud{position:absolute;font-size:1.6rem;opacity:.95;animation:rescueDrift 9s ease-in-out infinite alternate}" +
      ".scene-cloud.c1{top:12px;inset-inline-start:16%}" +
      ".scene-cloud.c2{top:30px;inset-inline-start:52%;animation-delay:-4s;font-size:1.25rem}" +
      "@keyframes rescueDrift{from{transform:translateX(0)}to{transform:translateX(16px)}}" +
      ".scene-ground{position:absolute;left:0;right:0;bottom:0;height:30px;background:repeating-linear-gradient(90deg,#8fce6e 0 26px,#85c765 26px 52px);border-top:4px solid #6fb354}" +
      ".scene-badge{position:absolute;top:10px;inset-inline-start:10px;width:52px;height:52px;border-radius:50%;background:#fff;border:3px solid #ffd94d;display:flex;align-items:center;justify-content:center;font-size:1.6rem;box-shadow:0 6px 16px #0002}" +
      ".rescue-king{position:absolute;bottom:26px;inset-inline-start:4%;font-size:3rem;transition:inset-inline-start .8s ease;animation:rescueBob 1s ease-in-out infinite;z-index:2;filter:drop-shadow(0 6px 4px #0003)}" +
      "@keyframes rescueBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}" +
      ".rescue-kids{position:absolute;bottom:28px;inset-inline-end:4%;font-size:1.9rem;z-index:2;animation:rescueWave 1.6s ease-in-out infinite}" +
      "@keyframes rescueWave{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(3deg) translateY(-3px)}}" +
      ".rescue-story{font-size:1.12rem;line-height:1.95;color:#4a3f75;background:#fff;border:2px dashed #d9d0ff;border-radius:18px;padding:10px 14px}" +
      ".rescue-question{font-size:1.4rem;margin:12px 0 6px;color:#372a63}" +
      "#rescuePlay .question-emoji{font-size:3.4rem;text-align:center;animation:rescueBob 1.4s ease-in-out infinite}" +
      "#rescuePlay .answers{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:10px}" +
      "#rescuePlay .answer{display:flex;flex-direction:column;align-items:center;gap:2px;padding:14px 8px;border-radius:22px}" +
      "#rescuePlay .answer-picture{font-size:2.5rem;line-height:1.15}" +
      "#rescuePlay .answer-label{font-size:1.15rem;font-weight:700}" +
      ".story-grid .story-card{border-radius:24px;padding:20px 14px;border:3px solid #fff;box-shadow:0 10px 26px #6a4fd326}" +
      ".story-grid .story-card span{font-size:3rem}" +
      ".story-grid .story-card.srescue{background:linear-gradient(160deg,#ffe3ec,#fff)}" +
      ".story-grid .story-card.sanimals{background:linear-gradient(160deg,#e2f7d9,#fff)}" +
      ".story-grid .story-card.strip{background:linear-gradient(160deg,#d9f2ff,#fff)}" +
      ".story-grid .story-card.streasure{background:linear-gradient(160deg,#fff3c4,#fff)}";
    document.head.append(style);
  }

  const storiesCard = document.querySelector("[data-stories]");
  if (storiesCard) storiesCard.addEventListener("click", openPicker);
  const rescueCard = document.querySelector("[data-rescue]");
  if (rescueCard) rescueCard.addEventListener("click", () => startStory(STORIES[0]));

  window.MatthewStories = { open: openPicker, startStory, stories: STORIES.map(s => ({ id: s.id, title: s.title, stages: s.stages.map(x => x.name) })) };
  window.MatthewRescue = { open: openPicker, close, stages: STORIES[0].stages.map(s => s.name) };
})();
