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
      id: "animals", title: "تحدي حيوانات الغابة", icon: "🦁", hero: "🤴🐴", goal: "👑", cats: ["world", "science"],
      desc: "واجه الأسد والثعلب والدب والنمر وكسبهم بذكائك",
      introClip: "rescueAnimalsIntro",
      intro: "الملك ماثيو دخل الغابة، وحيوانات الغابة عايزة تتحداه بأسئلة! جاوب صح يا بطل وعدّي كل حيوان!",
      stages: [
        { name: "تحدي الأسد", icon: "🦁", clip: "storyLion", line: "الأسد ملك الغابة بيقولك: جاوب على أسئلتي وعدّي يا شجاع!" },
        { name: "تحدي الثعلب المكار", icon: "🦊", clip: "storyFox", line: "الثعلب المكار بيحاول يلخبطك بأسئلة ملفوفة، ركّز يا بطل!" },
        { name: "تحدي الدب الكبير", icon: "🐻", clip: "storyBear", line: "الدب الكبير واقف في الطريق! جاوب صح وهو هيسيبك تعدّي." },
        { name: "تحدي النمر السريع", icon: "🐯", clip: "storyTiger", line: "آخر تحدي: النمر السريع! جاوب وخلّص المغامرة يا بطل!" }
      ],
      closers: ["storyAnimalsCloser1", "storyAnimalsCloser2", "rescueCloser3"],
      winClip: "rescueAnimalsWin", winTitle: "كسبت تحدي الحيوانات! 👑",
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
  // Same helper as the brave stories (stories.js): speak a list of texts
  // back-to-back, each resolved to its recorded clip. Round 3.2.3 item
  // 14a: optional onDone — fires when the sequence finishes, so the
  // rescue question can wait for the intro/stage line instead of cutting
  // it off. If the voice runtime is absent, it fires async (never hang).
  const speakSeq = (list, onDone) => {
    if (window.MatthewVoice?.speakSequence) window.MatthewVoice.speakSequence(list, "ar-EG", onDone);
    else if (typeof onDone === "function") setTimeout(onDone, 0);
  };
  const arabicDigits = value => String(value).replace(/[0-9]/g, d => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
  // حارس صور الأسئلة (تدقيق الصور، الجولة ٣.٢.١) — نفس قاعدة app.js:
  // صورة السؤال لازم ما تكشفش الإجابة الصح ولا ترسم اختيار غلط، ولو
  // حصل نعرض 🤔 بدلها. نسخة محلية هنا عشان المغامرات تشتغل من الباندل
  // من غير ما تعتمد على ترتيب تحميل app.js؛ والاختبار بيتأكد إن النسختين
  // متطابقتين على كل أسئلة البنك والقصص.
  const PIC_MEANS={"🌞":["الشمس"],"🌙":["القمر","قمر"],"🦊":["الثعلب","ثعلب","برتقالي"],"🐯":["النمر","نمر"],"🦋":["الفراشة","فراشة","جناحيها","الأجنحة"],"🌿":["الورقة","ورقة","العشب","أخضر"],"🌦":["بعد المطر","المطر"],"🏃":["نزقها برجلينا"],"🏖":["هتطفو فوق المية","هتطفو فوق","الماء","البحر"],"🌌":["بالليل","الليل","النجوم"],"❄":["بطريق","الثلج"],"🍌":["الموز","موز","أصفر"],"🍅":["الطماطم","طماطم","أحمر"],"🌱":["أخضر","العشب"],"🩺":["القلب"],"🟪":["مربع"],"🔺":["مثلث"]};
  const safeQuestionEmoji=q=>{if(!q||!q.e)return "🤔";if(/شكل|ضلع/.test(q.q||""))return "🤔";const strip=s=>String(s).replace(/\uFE0F/g,"");const shown=q.e;const clean=strip(shown);const pics=(typeof window!=="undefined"&&window.AnswerPics)||{};const depicts=word=>{if(!word)return false;if(String(word).length<=1)return false;/* single-letter answers: their AnswerPics entry is the mnemonic word-picture of the letter (ت→🍎), not a depiction of the glyph — it cannot reveal which letter is first. */if(strip(pics[word])===clean)return true;for(const key of Object.keys(PIC_MEANS)){if(clean.includes(strip(key))&&PIC_MEANS[key].includes(word))return true}return false};if(!q.a)return shown;for(let i=0;i<q.a.length;i++)if(depicts(q.a[i]))return "🤔";return shown};
  const shuffle = arr => { const b = [...arr]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

  const panel = document.createElement("section");
  panel.id = "rescuePanel";
  panel.className = "quiz-panel hidden";
  panel.setAttribute("aria-live", "polite");
  panel.innerHTML =
    '<div class="quiz-top"><button id="rescueBack" class="back" type="button">→ رجوع</button><strong>📖 قصص ومغامرات الملك ماثيو</strong><span id="rescueProgress"></span></div>' +
    '<div class="rescue-map" id="rescueMap" aria-hidden="true"></div>' +
    '<div class="rescue-scene" id="rescueScene"><span class="scene-sun">☀️</span><span class="scene-cloud c1">☁️</span><span class="scene-cloud c2">☁️</span><span class="scene-badge" id="rescueStageIcon">🌲</span><span class="rescue-king" id="rescueHero" role="img" aria-label="الملك ماثيو راكب حصانه وماسك سيفه"><svg viewBox="0 0 200 150" aria-hidden="true"><ellipse cx="100" cy="142" rx="68" ry="7" fill="#00000018"/><circle class="hero-dust" cx="152" cy="134" r="4" fill="#d8c9a3"/><circle class="hero-dust" cx="164" cy="138" r="3" fill="#d8c9a3"/><path d="M146 82 q24 2 20 24 q-2 10 -12 8 q8 -12 -2 -24 q-4 -6 -8 -6 Z" fill="#8a5a24"/><g class="horse-leg leg-b"><rect x="126" y="106" width="9" height="32" rx="4" fill="#8a5a24"/><rect x="126" y="132" width="9" height="7" rx="2" fill="#4a2f14"/></g><g class="horse-leg leg-b"><rect x="140" y="106" width="9" height="32" rx="4" fill="#8a5a24"/><rect x="140" y="132" width="9" height="7" rx="2" fill="#4a2f14"/></g><rect x="52" y="76" width="96" height="36" rx="17" fill="#b5793b"/><path d="M58 84 L40 52 L56 44 L74 78 Z" fill="#b5793b"/><ellipse cx="36" cy="46" rx="14" ry="10" transform="rotate(-25 36 46)" fill="#b5793b"/><ellipse cx="24" cy="52" rx="8" ry="6" fill="#c98d4e"/><path d="M34 34 l-3 -10 l8 7 Z" fill="#b5793b"/><path d="M46 40 q-8 -6 -14 0 l4 -8 q8 -4 12 4 Z" fill="#8a5a24"/><circle cx="33" cy="44" r="2" fill="#4a2f14"/><g class="horse-leg"><rect x="58" y="106" width="9" height="32" rx="4" fill="#8a5a24"/><rect x="58" y="132" width="9" height="7" rx="2" fill="#4a2f14"/></g><g class="horse-leg"><rect x="74" y="106" width="9" height="32" rx="4" fill="#8a5a24"/><rect x="74" y="132" width="9" height="7" rx="2" fill="#4a2f14"/></g><rect x="88" y="66" width="36" height="18" rx="6" fill="#e14b6d"/><rect x="94" y="62" width="24" height="10" rx="4" fill="#7c4a21"/><path class="hero-cape" d="M96 50 q-24 6 -28 26 q10 2 16 -6 q6 -10 12 -12 Z" fill="#d92b4f"/><rect x="94" y="44" width="22" height="34" rx="8" fill="#5b3cc4"/><path d="M114 52 L132 34" stroke="#ffd9b3" stroke-width="7" stroke-linecap="round"/><path d="M128 30 l8 8" stroke="#ffb340" stroke-width="4" stroke-linecap="round"/><path d="M132 34 L150 10" stroke="#e8edf2" stroke-width="5" stroke-linecap="round"/><path d="M150 10 l-8 1 l4 -6 Z" fill="#ffb340"/><g class="hero-face"><circle cx="105" cy="32" r="13" fill="#ffd9b3"/><circle cx="100" cy="31" r="1.8" fill="#4a2f14"/><circle cx="110" cy="31" r="1.8" fill="#4a2f14"/><path d="M100 38 q5 4 10 0" stroke="#b5651d" stroke-width="2" fill="none" stroke-linecap="round"/></g><path d="M93 24 L95 12 L101 20 L106 9 L111 20 L117 12 L118 24 Z" fill="#ffb340" stroke="#e08e00" stroke-width="2" stroke-linejoin="round"/><path d="M28 52 q22 14 54 26" stroke="#7c4a21" stroke-width="2" fill="none"/></svg></span><span class="rescue-kids" id="rescueGoal">👶👧</span><span class="scene-ground"></span></div>' +
    '<h2 id="rescueTitle">اختار مغامرتك!</h2>' +
    '<p id="rescueStory" class="rescue-story"></p>' +
    '<div id="rescuePlay"></div>';
  main.insertBefore(panel, document.querySelector("footer"));
  const $ = id => panel.querySelector("#" + id);

  let story = null, stage = 0, inStage = 0, questions = [], current = null, answered = false, score = 0, total = 0;
  let qToken = 0, lastChoices = [];
  // Round 3.2.3 item 13: a running story is one sub-screen level above
  // the story picker — the system back returns to the picker, not out of
  // the app. subPushed guards the push (a replay from the win screen
  // restarts the same story on the same level).
  let subPushed = false;
  const pushSub = () => {
    if (subPushed) return;
    subPushed = true;
    // Guarded for non-browser contexts (tests load rescue.js in node).
    if (typeof window !== "undefined") {
      window.__matthewBack = () => { subPushed = false; openPicker(); };
      window.MatthewNav?.pushSubscreen();
    }
  };
  const popSub = () => {
    if (!subPushed) return;
    subPushed = false;
    if (typeof window !== "undefined") window.MatthewNav?.popSubscreen();
  };

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
    $("rescueStageIcon").textContent = "📖";
    $("rescueGoal").textContent = "🏰";
    $("rescueProgress").textContent = "";
    $("rescueTitle").textContent = "اختار مغامرتك يا ملك! 📖";
    $("rescueStory").textContent = "أهلاً يا ملك ماثيو! كل قصة فيها مراحل وأسئلة جديدة كل مرة، اختار قصة وابدأ المغامرة يا بطل!";
    speak("أهلاً يا ملك ماثيو! كل قصة فيها مراحل وأسئلة جديدة كل مرة، اختار قصة وابدأ المغامرة يا بطل!", "storyPickerIntro");
    const play = $("rescuePlay");
    const brave = window.MatthewBraveStories;
    let braveCards = "";
    if (brave && Array.isArray(brave.STORIES)) {
      const total = brave.starTotal ? brave.starTotal() : 0;
      braveCards = brave.STORIES.map(bs => {
        const open = brave.isUnlocked ? brave.isUnlocked(bs, total) : true;
        return '<button type="button" class="science-card story-card brave s' + bs.id + '" data-brave="' + bs.id + '"><span>' + bs.icon + '</span><b>' + bs.title + '</b><small>' + (open ? 'قصة شجاعة عن مارك ومريم' : '🔒 محتاج ' + bs.stars + ' نجوم — معاك ' + total) + '</small></button>';
      }).join("");
    }
    play.innerHTML = '<div class="science-grid story-grid">' + STORIES.map((s, i) => {
      let best = 0;
      try { best = Number(localStorage.getItem("matthewStoryBest:" + s.id) || 0); } catch (_) {}
      return '<button type="button" class="science-card story-card s' + s.id + '" data-story="' + i + '"><span>' + s.icon + '</span><b>' + s.title + '</b><small>' + s.desc + (best ? ' — ⭐'.repeat(Math.min(5, best)) : '') + '</small></button>';
    }).join("") + braveCards + '</div>';
    play.querySelectorAll("[data-story]").forEach(b => b.addEventListener("click", () => startStory(STORIES[Number(b.dataset.story)])));
    if (brave) play.querySelectorAll("[data-brave]").forEach(b => b.addEventListener("click", () => {
      const bs = brave.STORIES.find(x => x.id === b.dataset.brave);
      if (!bs) return;
      // Round 3.2.6 item 5: no star gate — every story opens on tap.
      if (brave.openStory) brave.openStory(bs.id);
    }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const startStory = chosen => {
    focusMode(true);
    story = chosen;
    pushSub();
    const all = pool();
    if (!all.length) return;
    questions = shuffle(all);
    stage = 0; inStage = 0; score = 0; total = 0;
    hideOthers();
    panel.classList.remove("hidden");
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
      // Live verification 3.2.2 DEFECT 1 (same fix as the brave stories):
      // stage 1 used to show + speak ONLY the intro, so the stage line
      // never reached the child and the stage-1 answer could not be
      // derived from anything shown or spoken. Show the intro AND the
      // stage line, and speak them back-to-back (intro clip, then
      // stage-line clip) — no re-record needed: both clips already exist.
      $("rescueStory").textContent = story.intro + " " + s.line;
      // Round 3.2.3 item 14a: the question waits for the intro to
      // FINISH (real completion via onDone), not a guessed timeout —
      // the old immediate nextQuestion() let the 350ms auto-play cut
      // the intro off on the same single Audio element.
      speakSeq([story.intro, s.line], () => nextQuestion());
    } else {
      $("rescueStory").textContent = s.line;
      // Same wait for every stage: the stage line finishes before the
      // question speaks (the old speak()+immediate nextQuestion() cut
      // the stage line the same way). speakSeq resolves the line to its
      // recorded clip via the text map — all 20 stage lines are covered
      // (see tests/round323.test.js, item 14b).
      speakSeq([s.line], () => nextQuestion());
    }
  };

  const nextQuestion = () => {
    qToken++;
    answered = false;
    current = questions[(stage * PER_STAGE + inStage) % questions.length];
    const play = $("rescuePlay");
    play.innerHTML =
      '<div class="question-emoji">' + safeQuestionEmoji(current) + '</div>' +
      '<h3 class="rescue-question">' + arabicDigits(current.q) + '</h3>' +
      '<div class="answers" id="rescueAnswers"></div>' +
      '<p class="feedback" id="rescueFeedback"></p>' +
      '<button type="button" class="primary hidden" id="rescueNext">كمّل المغامرة <span class="pager-arrow">←</span></button>';
    const tk = qToken;
    setTimeout(() => {
      if (qToken !== tk) return;
      if (window.MatthewVoice?.speakSequence) window.MatthewVoice.speakSequence([current.q, ...lastChoices], "ar-EG");
      else window.MatthewVoice?.speak(current.q, "ar-EG");
    }, 350);
    const answers = play.querySelector("#rescueAnswers");
    const items = shuffle(current.a.map((text, i) => ({ text, correct: i === current.c })));
    lastChoices = items.map(x => x.text);
    const listenBtn = document.createElement("button");
    listenBtn.type = "button";
    listenBtn.className = "voice-button speak-question";
    listenBtn.textContent = "🔊 اسمع السؤال";
    const replayQ = current.q, replayChoices = [...lastChoices];
    listenBtn.addEventListener("click", () => {
      if (window.MatthewVoice?.speakSequence) window.MatthewVoice.speakSequence([replayQ, ...replayChoices], "ar-EG");
      else window.MatthewVoice?.speak(replayQ, "ar-EG");
    });
    play.insertBefore(listenBtn, answers);
    items.forEach(item => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "answer"; b.dataset.answer = item.text;
      b.innerHTML = '<span class="answer-picture">' + (window.answerPic ? window.answerPic(item.text, current) : current.e) + '</span><span class="answer-label">' + arabicDigits(item.text) + '</span>';
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
    const tk = qToken, cq = current;
    // Round 3.2.6 (integrator, item 4): the explanation chains on the
    // praise clip's end via feedback's onDone — the old fixed 2600ms
    // timer cut every praise clip (2.4–4.8s) mid-sentence.
    const explainAnswer = () => {
      if (qToken !== tk || !answered || !cq) return;
      // Numbers-once F3: a digit answer was already spoken in the options —
      // speak the prefix alone, never the digit a 2nd time in one turn.
      const ans = cq.a[cq.c];
      const isNum = /^[0-9٠-٩]+$/.test(String(ans).trim());
      if (window.MatthewVoice?.speakSequence) window.MatthewVoice.speakSequence(isNum ? ["الإجابة الصحيحة هي"] : ["الإجابة الصحيحة هي", ans], "ar-EG");
      else window.MatthewVoice?.speak(isNum ? "الإجابة الصحيحة هي" : "الإجابة الصحيحة هي " + ans, "ar-EG");
    };
    if (correct) {
      score++;
      button.classList.add("correct");
      feedback.textContent = "برافو يا بطل! إجابة صح ⭐";
      window.MatthewVoice?.feedback("correct", explainAnswer);
    } else {
      button.classList.add("wrong");
      feedback.textContent = "محاولة جميلة يا بطل! الإجابة الصح باللون الأخضر 💜";
      answers.querySelectorAll(".answer").forEach(b => { if (b.dataset.answer === current.a[current.c]) b.classList.add("correct"); });
      window.MatthewVoice?.feedback("wrong", explainAnswer);
    }
    $("rescuePlay").querySelector("#rescueNext").classList.remove("hidden");
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
    speak("عدّيت مرحلة! كمّل كده وانت هتوصل…");
    const play = $("rescuePlay");
    play.innerHTML = '<div class="question-emoji">' + s.icon + '</div><h3 class="rescue-question">المرحلة اللي جاية: ' + s.name + '</h3><button type="button" class="primary" id="rescueGo">يلا كمّل <span class="pager-arrow">←</span></button>';
    play.querySelector("#rescueGo").addEventListener("click", () => startStage(false));
  };

  const win = () => {
    renderMap();
    $("rescueHero").style.insetInlineStart = "76%";
    $("rescueTitle").textContent = story.winTitle;
    $("rescueStory").textContent = story.winStory;
    speak(story.winStory);
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
      '<button type="button" class="primary" id="rescueAgain">العب القصة دي تاني <span class="pager-arrow">←</span></button>' +
      '<button type="button" class="secondary" id="rescueStories">→ اختار قصة تانية 📖</button>' +
      '<button type="button" class="secondary" id="rescueHome">→ العودة للمملكة</button>';
    play.querySelector("#rescueAgain").addEventListener("click", () => startStory(story));
    play.querySelector("#rescueStories").addEventListener("click", openPicker);
    play.querySelector("#rescueHome").addEventListener("click", close);
  };

  const close = () => {
    subPushed = false;
    qToken++;
    focusMode(false);
    panel.classList.add("hidden");
    gameList.classList.remove("hidden");
    document.getElementById("learningList")?.classList.remove("hidden");
    try { window.MatthewVoice?.stop(); } catch (_) {}
    if (typeof updateStats === "function") { try { updateStats(); } catch (_) {} }
  };
  // Round 3.2.3 item 13: inside a story the back goes through history
  // when we own an entry (popstate returns to the picker via the hook);
  // with no entry it returns directly. From the picker it closes.
  $("rescueBack").addEventListener("click", () => { if (story) { if (!window.MatthewNav?.back()) { popSub(); openPicker(); } } else close(); });

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
      ".story-grid .story-card.streasure{background:linear-gradient(160deg,#fff3c4,#fff)}" +
      ".rescue-king svg{width:98px;height:auto;display:block;overflow:visible}" +
      ".rescue-king .horse-leg{transform-box:fill-box;transform-origin:50% 0;animation:rescueGallop .45s ease-in-out infinite alternate}" +
      ".rescue-king .leg-b{animation-delay:-.22s}" +
      "@keyframes rescueGallop{from{transform:rotate(-16deg)}to{transform:rotate(16deg)}}" +
      ".rescue-king .hero-cape{transform-box:fill-box;transform-origin:100% 50%;animation:rescueCape .7s ease-in-out infinite alternate}" +
      "@keyframes rescueCape{from{transform:rotate(-4deg) translateX(0)}to{transform:rotate(5deg) translateX(-3px)}}" +
      ".rescue-king .hero-dust{animation:rescueDust .9s ease-out infinite}" +
      "@keyframes rescueDust{0%{opacity:.7;transform:translate(0,0) scale(1)}100%{opacity:0;transform:translate(14px,-6px) scale(1.8)}}";
    document.head.append(style);
  }

  const storiesCard = document.querySelector("[data-stories]");
  if (storiesCard) storiesCard.addEventListener("click", openPicker);
  const rescueCard = document.querySelector("[data-rescue]");
  if (rescueCard) rescueCard.addEventListener("click", () => startStory(STORIES[0]));

  window.MatthewStories = { open: openPicker, startStory, stories: STORIES.map(s => ({ id: s.id, title: s.title, stages: s.stages.map(x => x.name) })) };
  window.MatthewRescue = { open: openPicker, close, stages: STORIES[0].stages.map(s => s.name) };
})();
