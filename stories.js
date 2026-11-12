// stories.js — «قصص الملك ماثيو الشجاع»: قصص مصوّرة ومروية من مسودة
// كاتب القصص (Round 3.2.1)، مختلفة عن مغامرات rescue.js الأربع.
// ١) الملك ماثيو ينقذ أخوه مارك — ٥ نجوم
// ٢) الملك ماثيو الشجاع وحيوانات الغابة — ١٠ نجوم
// ٣) الملك ماثيو يحمي مارك ومريم — ١٥ نجمة
// القصص تعلّم ماثيو يحب أخوه مارك وبنت عمه مريم ويحميهم
// (الملك الحامي: الغيرة ← الحب والحماية). الراوية هي مس نانسي، معلمة
// ماثيو الحقيقية: تفتتح كل قصة بنفسها وبحبها لماثيو. كل سطور القصة
// والأسئلة والإجابات لها مقاطع صوتية مسجلة بصوت الميس (CORPUS أدناه، ar_EG).
// بطل القصة: الملك ماثيو راكب حصانه وماسك سيفه (SVG متحرك)، ووجهه
// في عنصر مستقل class="hero-face" ليتبدل بصورة ماثيو الحقيقية لاحقاً.
//
// بنية الأسئلة: سؤالان في كل مرحلة (٢ × ٤ = ٨ أسئلة لكل قصة)، وكل سؤال
// مرتبط بمرحلته — buildRun يخلط ترتيب السؤالين داخل المرحلة فقط، ولا
// يفكّ الربط بين السؤال ومشهد مرحلته أبداً.
// قاعدة الصور (تدقيق الصور): إيموجي السؤال لا يكشف إجابته ولا يصوّر
// اختياراً خاطئاً — حيثما كان يكشف صار 🤔. إجابات الأرقام أرقام عربية
// مشرقية (١ ٢ ٣) فقط — بلا أصابع وبلا أرقام لاتينية.
"use strict";
(function (root, factory) {
  const api = factory();
  root.MatthewBraveStories = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function () {

  // ---------- star total: the hero shows localStorage "matthewStars"
  // (quizzes / math / rescue / tracing all write there); the crown store
  // "matthewCrownV1" counts the same correct answers a second way, so we
  // take the MAX of the two instead of summing (no double counting). ----------
  function starTotal(store) {
    const s = store || (typeof localStorage !== "undefined" ? localStorage : null);
    let total = 0;
    if (s) {
      try { total = Math.max(total, Number(s.getItem("matthewStars") || 0) || 0); } catch (_) {}
      try {
        const crown = JSON.parse(s.getItem("matthewCrownV1") || "{}");
        total = Math.max(total, Number(crown.stars) || 0);
      } catch (_) {}
    }
    return total;
  }
  function isUnlocked(story, total) {
    const t = typeof total === "number" ? total : starTotal();
    return t >= (story.stars || 0);
  }

  // ---------- helpers ----------
  const arabicDigits = value => String(value).replace(/[0-9]/g, d => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
  const shuffle = arr => {
    const b = [...arr];
    for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
    return b;
  };

  // ---------- story data (all Arabic; draft stories, verbatim except where
  // a fix is noted inline) ----------
  const PICKER_LINE = "أنا مس نانسي وبحبك يا ماثيو! أهلاً بيك في قصصك الشجاعة! اختار قصة، واجمع نجوم عشان تفتح قصص جديدة! كل قصة هتعلّمك تحب أخوك وتحميه!";
  const LOCKED_LINE = "مس نانسي بتقولك: لسه شوية يا بطل! اجمع نجوم أكتر من الألعاب والأسئلة، والقصة دي هتتفتح لك قريب! أنت تقدر يا ملك ماثيو!";
  // Round 3.2.1 note 25b (Miss Nancy draft): short generic lead-ins spoken
  // BEFORE a story's own intro on the first stage — rotating, so each
  // story opening feels fresh. Each story's intro already opens with
  // Nancy + horse/sword/rescue, so these are lead-ins, not replacements.
  const STORY_OPENERS = [
    "قصة جديدة يا ملك ماثيو الشجاع! أنا مس نانسي، اركب حصانك وخد سيفك، ويلا ننقذ مارك ومريم مع بعض!",
    "يلا يا ملك ماثيو! أنا مس نانسي، مغامرة جديدة في الغابة، أنت البطل اللي هينقذ أخوه مارك!"
  ];

  const STORIES = [
    {
      id: "rescue-mark", title: "الملك ماثيو ينقذ أخوه مارك", icon: "🐴", scene: "forest", stars: 5, goal: "👶",
      desc: "ماثيو الشجاع يركب حصانه وينقذ أخوه الصغير مارك التايه في الغابة",
      intro: "أهلاً يا ملك ماثيو! أنا مس نانسي وبحبك أوي! أخوك الصغير مارك تاه في الغابة لوحده، وانت البطل الوحيد اللي يقدر ينقذه! اركب حصانك، خد سيفك، ويلا بينا يا بطل!",
      stages: [
        { name: "بوابة الغابة", icon: "🌲", scene: "forest", line: "ماثيو وصل بوابة الغابة على حصانه. الشجر طويل والدنيا هادية. فجأة سمع صوت صغير بيعيط: ده مارك! ماثيو قال: متخافش يا مارك، أخوك الكبير جاي!",
          questions: [
            { q: "ماثيو راكب إيه؟", e: "🤔", a: ["حصان", "عربية", "مركب"], c: 0 },
            { q: "كم شجرة قدام البوابة؟", e: "🤔", a: ["١", "٢", "٣"], c: 1 }
          ] },
        { name: "النهر الصغير", icon: "🛶", scene: "river", line: "ماثيو وصل النهر. المية بتجري بسرعة. حصانه نط النهر نطة كبيرة! على الضفة التانية لقى جزمة مارك الصغيرة. ده معناه إن مارك قريب!",
          questions: [
            { q: "حصان ماثيو عمل إيه عند النهر؟", e: "🐴", a: ["نام", "رجع البيت", "نط النهر"], c: 2 },
            { q: "لون المية إيه؟", e: "🤔", a: ["أزرق", "أحمر", "أصفر"], c: 0 }
          ] },
        { name: "الكهف المظلم", icon: "🕯️", scene: "forest", line: "ماثيو دخل الكهف المظلم. كان خايف شوية، بس قال: أنا شجاع ومش هسيب أخويا! ولّع الشمعة وشاف آثار رجلين صغيرة على الأرض. مارك كان هنا!",
          questions: [
            { q: "ماثيو ولّع إيه في الكهف؟", e: "🤔", a: ["كتاب", "شمعة", "كورة"], c: 1 },
            // FIX (note 4 — self-answering question): the draft asked
            // «ماثيو كان شجاع ولا خايف؟» which speaks both answers aloud.
            // Reworded so the spoken question never contains its answer.
            { q: "ماثيو كان إيه في الكهف؟", e: "🤔", a: ["نعسان", "خايف", "شجاع"], c: 2 }
          ] },
        { name: "الشجرة الكبيرة", icon: "🌳", scene: "forest", line: "ماثيو وصل الشجرة الكبيرة. وهناك لقى مارك قاعد تحت الشجرة وبيعيط! ماثيو نزل من الحصان وحضن أخوه وقال: لقيتك يا مارك! أنا بحبك أوي! مارك ضحك وبطّل عياط.",
          questions: [
            { q: "ماثيو عمل إيه لما لقى مارك؟", e: "🤔", a: ["حضنه", "سابه ومشي", "زعقله"], c: 0 },
            { q: "مارك عنده كام سنة؟", e: "👶", a: ["٢", "١", "٣"], c: 1 }
          ] }
      ],
      closer: "عدّيت مرحلة يا بطل! كمّل كده، مارك مستنيّك وفرحان بيك!",
      winTitle: "أنقذت مارك يا بطل! 🎉",
      win: "عملتها يا بطل! أنقذت أخوك مارك! انت أحلى أخ كبير في الدنيا، ومارك بيحبك أوي!",
      winStory: "ماثيو رجع البيت ومارك في حضنه. ماما فرحت أوي وقالت: ده أذكى وأشجع أخ في الدنيا!"
    },
    {
      id: "brave-animals", title: "الملك ماثيو الشجاع وحيوانات الغابة", icon: "🦁", scene: "forest", stars: 10, goal: "👑",
      desc: "ماثيو الشجاع يواجه الأسد والثعلب والدب والنمر ويكسبهم بشجاعته وطيبته",
      intro: "أهلاً يا ملك ماثيو! أنا مس نانسي وبحبك أوي! حيوانات الغابة مستنياك تتحداها! الأسد والثعلب والدب والنمر… جاوب صح وكسبهم بشجاعتك وطيبتك يا بطل!",
      stages: [
        { name: "تحدي الأسد", icon: "🦁", scene: "forest", line: "الأسد ملك الغابة واقف قدام ماثيو وزأر بصوت عالي! ماثيو مخافش، وقال: أنا الملك ماثيو الشجاع! الأسد ضحك وقال: شجاع فعلاً! جاوب على أسئلتي وعدّي.",
          questions: [
            { q: "الأسد ملك إيه؟", e: "🤔", a: ["البحر", "الغابة", "السما"], c: 1 },
            { q: "الأسد بياكل إيه؟", e: "🤔", a: ["تفاح", "عسل", "لحمة"], c: 2 }
          ] },
        { name: "تحدي الثعلب المكار", icon: "🦊", scene: "forest", line: "الثعلب المكار جه يجري وقال: أنا أذكى واحد! بس ماثيو كان أذكى منه، وجاوب على كل أسئلته. الثعلب قال: انت فعلاً ذكي يا ملك! خد تفاحة هدية مني.",
          questions: [
            { q: "الثعلب ادى ماثيو إيه هدية؟", e: "🤔", a: ["تفاحة", "كورة", "كتاب"], c: 0 },
            { q: "لون الثعلب إيه؟", e: "🤔", a: ["أزرق", "برتقالي", "أخضر"], c: 1 }
          ] },
        { name: "تحدي الدب الكبير", icon: "🐻", scene: "forest", line: "الدب الكبير كان واقف في الطريق وبيقول: مش هعدّي حد! ماثيو قال له: متزعلش يا دب، تعالى نلعب سوا! الدب ضحك ولعب معاه، وبعدين قال: انت طيب أوي يا ملك! عدّي يا بطل!",
          questions: [
            { q: "ماثيو قال للدب إيه؟", e: "🤔", a: ["امشي بعيد", "أنا خايف", "تعالى نلعب سوا"], c: 2 },
            { q: "الدب بيحب ياكل إيه؟", e: "🤔", a: ["عسل", "كتاب", "حذاء"], c: 0 }
          ] },
        { name: "تحدي النمر السريع", icon: "🐯", scene: "forest", line: "النمر السريع جه يجري بسرعة الصاروخ! ماثيو قال: أنا مش خايف، أنا شجاع! وجاوب على كل الأسئلة بسرعة. النمر قال: انت أسرع وأشجع ملك شفته! كل الحيوانات بقت أصحاب ماثيو.",
          questions: [
            { q: "النمر بيجري بسرعة إيه؟", e: "🤔", a: ["السلحفاة", "الصاروخ", "الحلزون"], c: 1 },
            { q: "حيوانات الغابة بقت إيه لماثيو؟", e: "🤔", a: ["خايفين منه", "نايمين", "أصحابه"], c: 2 }
          ] }
      ],
      closer: "عدّيت حيوان يا بطل! كمّل كده، الغابة كلها بتحيّيك!",
      winTitle: "كسبت كل الحيوانات! 👑",
      win: "برافو يا ملك ماثيو! كسبت كل حيوانات الغابة بشجاعتك وطيبتك، وبقوا كلهم أصحابك!",
      winStory: "الأسد والثعلب والدب والنمر بقوا أصحاب ماثيو، وكل يوم يلعبوا سوا في الغابة. الشجاعة والطيبة بيكسبوا دايماً!"
    },
    {
      id: "love-family", title: "الملك ماثيو يحمي مارك ومريم", icon: "🤴👶👧", scene: "forest", stars: 15, goal: "🏠",
      desc: "ماثيو الملك الحامي ياخد مارك ومريم نزهة ويحميهم ويحبهم بدل الغيرة",
      intro: "أهلاً يا ملك ماثيو! أنا مس نانسي وبحبك أوي! النهارده انت الملك الحامي! مارك ومريم صغيرين ومحتاجينك تحميهم وتحبهم. يلا نروح المغامرة سوا!",
      stages: [
        { name: "نزهة في الحديقة", icon: "🌳", scene: "forest", line: "ماثيو خد مارك ومريم نزهة في الحديقة. مارك بيضحك ومريم بتجري ورا الفراشات. ماثيو قال: أنا الملك الحامي، هحافظ عليكم!",
          questions: [
            { q: "مريم بتجري ورا إيه؟", e: "🤔", a: ["الكتاب", "السيارة", "الفراشات"], c: 2 },
            { q: "ماثيو الملك إيه؟", e: "🤔", a: ["الحامي", "النعسان", "الزعلان"], c: 0 }
          ] },
        { name: "لعبة الكرة", icon: "⚽", scene: "forest", line: "مارك ومريم بيلعبوا بالكرة، والكرة طارت بعيد! ماثيو جري بسرعة وجاب الكرة ورجعها لهم. مارك ومريم صقفوا وقالوا: شكراً يا ماثيو!",
          questions: [
            { q: "ماثيو جاب الكرة لمين؟", e: "🤔", a: ["للأسد", "لمارك ومريم", "للثعلب"], c: 1 },
            { q: "لون الكرة إيه؟", e: "🤔", a: ["أحمر", "أزرق", "أبيض وأسود"], c: 2 }
          ] },
        { name: "وقت الغدا", icon: "🍎", scene: "castle", line: "جه وقت الغدا! ماثيو قسّم التفاح: تفاحة لمارك، وتفاحة لمريم، وتفاحة ليه هو. مريم قالت: ماثيو بيحبنا أوي! وماثيو قال: أنا بحبكم أكتر!",
          questions: [
            { q: "ماثيو قسّم كام تفاحة؟", e: "🤔", a: ["٣", "١", "٢"], c: 0 },
            { q: "مين اللي بيحب ماثيو؟", e: "🤔", a: ["الأسد", "مارك ومريم", "الثعلب"], c: 1 }
          ] },
        { name: "العودة للبيت", icon: "🏠", scene: "castle", line: "خلصت النزهة ورجعوا البيت. ماما قالت: ماثيو أحلى أخ كبير في الدنيا! مارك ومريم ناموا في حضن ماثيو، وماثيو قال: أنا بحب أخواتي أوي، وأنا الملك الحامي بتاعهم!",
          questions: [
            { q: "ماثيو بيحب مين؟", e: "🤔", a: ["الأسد", "التليفزيون", "مارك ومريم"], c: 2 },
            { q: "مارك ومريم ناموا فين؟", e: "🤔", a: ["في حضن ماثيو", "في الغابة", "في النهر"], c: 0 }
          ] }
      ],
      closer: "عدّينا محطة جميلة يا بطل! كمّل النزهة، مارك ومريم فرحانين بيك!",
      winTitle: "أحلى أخ كبير! 🏠",
      win: "برافو يا ملك ماثيو! انت أحلى أخ كبير في الدنيا! مارك ومريم بيحبوك أوي، وانت بتحميهم وبتحبهم!",
      winStory: "من النهارده ماثيو هو الملك الحامي: بيحمي مارك ومريم وبيحبهم، وهما بيحبوه أكتر وأكتر!"
    }
  ];
  const PER_STAGE = 2; // سؤالان في كل مرحلة × ٤ مراحل = ٨ أسئلة في الجولة

  // ---------- corpus: every spoken string in this module, ar_EG ----------
  // Key scheme (per the draft, §4 — parallel for all three stories):
  //   story<Mark|Animals|Family>Intro | story…S1…S4 (stage lines)
  //   story…Closer | story…Win
  //   story…S<n>Q<1|2> (questions) | story…S<n>Q<q>A<1..3> (answers)
  // NOTE: the draft header wrote the animals intro as "storyAnimals2Intro";
  // normalised here to "storyAnimalsIntro" so the scheme is parallel —
  // the coordinator generates from THIS list, not the header.
  // The coordinator adds these to build-corpus.js so the teacher-voice
  // clips cover the stories; nothing here may fall back to the tablet's
  // silent device TTS. Clip keys stay stable: Miss Nancy's real recordings
  // / a cloned voice will drop in under these same keys later.
  const CORPUS_PREFIX = { "rescue-mark": "Mark", "brave-animals": "Animals", "love-family": "Family" };
  const CORPUS = [];
  const addClip = (key, text) => CORPUS.push({ key, text, lang: "ar_EG" });
  addClip("story_picker", PICKER_LINE);
  addClip("story_locked", LOCKED_LINE);
  // Round 3.2.1 note 25b: the story openers (§4 of the Nancy draft).
  addClip("nancy_intro_story", STORY_OPENERS[0]);
  addClip("nancy_intro_story_2", STORY_OPENERS[1]);
  STORIES.forEach(s => {
    const p = "story" + CORPUS_PREFIX[s.id];
    addClip(p + "Intro", s.intro);
    s.stages.forEach((st, i) => {
      addClip(p + "S" + (i + 1), st.line);
      st.questions.forEach((q, qi) => {
        addClip(p + "S" + (i + 1) + "Q" + (qi + 1), q.q);
        q.a.forEach((ans, ai) => addClip(p + "S" + (i + 1) + "Q" + (qi + 1) + "A" + (ai + 1), ans));
      });
    });
    addClip(p + "Closer", s.closer);
    addClip(p + "Win", s.win);
  });

  // ---------- pictured answers: story-specific words not in AnswerPics ----------
  // Notes 26/27/28: number answers are Arabic-Indic DIGITS (١ ٢ ٣) in the
  // Cairo form — never number words, Latin keycap digits, or mixed hand
  // emojis. STORY_PICS wins over the shared AnswerPics for this reason
  // (and still maps number WORDS to digits if a word answer ever appears).
  // "نط النهر" is a DRAWN jumping horse (audit Table 4a): the draft's 💦
  // splash and its 🐴 both failed the depiction test, so the action gets
  // its own drawn picture — a horse leaping over the river.
  // "الغابة" / "في الغابة" are a GROUP of trees 🌲🌲 (audit Table 4a):
  // one tree is a شجرة, not a غابة.
  const STORY_PICS = {
    "واحد": "١", "واحدة": "١", "اثنان": "٢", "اثنتان": "٢", "ثلاثة": "٣", "أربعة": "٤", "خمسة": "٥",
    "١": "١", "٢": "٢", "٣": "٣", "٤": "٤", "٥": "٥", "١٠": "١٠", "١٢": "١٢",
    "مارك": "👶", "مريم": "👧", "ماثيو": "👑",
    "حصان": "🐴", "عربية": "🚗", "مركب": "⛵",
    "نام": "😴", "رجع البيت": "🏠", "نط النهر": "<svg viewBox='0 0 64 64' aria-hidden='true'><path d='M2 54 q8 -6 16 0 t16 0 t16 0 t12 0 v8 H2 Z' fill='#69b7ff'/><path d='M6 26 q5 -7 12 -7' stroke='#b5651d' stroke-width='2.5' fill='none' stroke-linecap='round'/><path d='M4 34 q5 -7 12 -7' stroke='#b5651d' stroke-width='2.5' fill='none' stroke-linecap='round'/><path d='M16 30 q-10 -2 -12 8 q7 3 12 -3 Z' fill='#8a5a24'/><rect x='16' y='24' width='28' height='13' rx='6' fill='#b5793b'/><path d='M40 26 q10 -10 14 -2 q2 8 -6 10 l-8 -2 Z' fill='#b5793b'/><circle cx='52' cy='22' r='2' fill='#4a2f14'/><path d='M42 18 q6 -8 2 -12 q8 4 4 12 Z' fill='#8a5a24'/><path d='M40 35 L50 42' stroke='#8a5a24' stroke-width='5' stroke-linecap='round'/><path d='M44 35 L54 40' stroke='#8a5a24' stroke-width='5' stroke-linecap='round'/><path d='M20 35 L12 44' stroke='#8a5a24' stroke-width='5' stroke-linecap='round'/><path d='M25 35 L19 45' stroke='#8a5a24' stroke-width='5' stroke-linecap='round'/></svg>",
    "أزرق": "🟦", "أحمر": "🟥", "أصفر": "🟨", "برتقالي": "🟧", "أخضر": "🟩",
    "كتاب": "📘", "الكتاب": "📘", "شمعة": "🕯️", "كورة": "⚽",
    "نعسان": "😴", "النعسان": "😴", "خايف": "😨", "أنا خايف": "😨", "شجاع": "🦁",
    "حضنه": "🤗", "سابه ومشي": "🚶", "زعقله": "😠", "الزعلان": "😠",
    "البحر": "🌊", "الغابة": "🌲🌲", "في الغابة": "🌲🌲", "السما": "☁️",
    "تفاح": "🍎", "تفاحة": "🍎", "عسل": "🍯", "لحمة": "🍖",
    "امشي بعيد": "😠", "تعالى نلعب سوا": "🧸", "حذاء": "👟",
    "السلحفاة": "🐢", "الصاروخ": "🚀", "الحلزون": "🐌",
    "خايفين منه": "😨", "نايمين": "😴", "أصحابه": "👫",
    "السيارة": "🚗", "الفراشات": "🦋", "الحامي": "🛡️",
    "للأسد": "🦁", "الأسد": "🦁", "لمارك ومريم": "👶👧", "مارك ومريم": "👶👧",
    "للثعلب": "🦊", "الثعلب": "🦊", "أبيض وأسود": "⚽", "التليفزيون": "📺",
    "في حضن ماثيو": "🤗", "في النهر": "🌊"
  };
  function answerPic(text, q) {
    if (STORY_PICS[text]) return STORY_PICS[text];
    if (typeof window !== "undefined" && window.answerPic) {
      try { const p = window.answerPic(text, q); if (p && p !== "⭐") return p; } catch (_) {}
    }
    return (q && q.e) || "⭐";
  }

  // ---------- scene per stage: reuse the existing forest/river/castle
  // variants (styles.css .brave-scene.scene-*); no new art. ----------
  function sceneFor(story, stageIndex) {
    const st = story.stages[Math.min(stageIndex, story.stages.length - 1)];
    return (st && st.scene) || story.scene || "forest";
  }

  // ---------- variability: a fresh shuffled run every time ----------
  // Each stage asks ITS OWN 2 questions (per-stage mapping preserved);
  // only the order of the two within a stage varies, and the choices are
  // shuffled again at display time in nextQuestion().
  function buildRun(story) {
    return { story, stages: story.stages.map(s => ({ stage: s, questions: shuffle(s.questions) })) };
  }

  // ---------- hero: King Matthew riding his horse, sword raised ----------
  // The face lives in its own <g class="hero-face"> so the user's photo of
  // Matthew can be swapped in later (replace the group with an <image>).
  function heroSVG() {
    return '<svg class="brave-hero-svg" viewBox="0 0 220 150" aria-hidden="true">' +
      '<ellipse cx="110" cy="140" rx="100" ry="10" fill="#8bd9a7"/>' +
      '<g class="brave-horse">' +
      '<path d="M52 108 q-14 4 -12 22 l10 -4 q-2 -10 6 -14 Z" fill="#8a5a24"/>' +
      '<rect x="66" y="118" width="9" height="24" rx="4" fill="#8a5a24"/>' +
      '<rect x="128" y="118" width="9" height="24" rx="4" fill="#8a5a24"/>' +
      '<rect x="58" y="88" width="92" height="34" rx="17" fill="#b5793b"/>' +
      '<path d="M142 90 q22 -14 24 4 q1 12 -12 14 l-14 -4 Z" fill="#b5793b"/>' +
      '<circle cx="162" cy="88" r="4" fill="#4a2f14"/>' +
      '<path d="M146 82 q10 -10 4 -18 q12 6 6 20 Z" fill="#8a5a24"/>' +
      '<rect x="88" y="78" width="34" height="15" rx="6" fill="#e14b6d"/>' +
      '</g>' +
      '<g class="brave-king">' +
      '<rect x="98" y="44" width="17" height="38" rx="7" fill="#5b3cc4"/>' +
      '<g class="hero-sword"><path d="M100 52 L74 78 l6 6 L104 64 Z" fill="#ffd9b3"/><path d="M76 76 L52 102 l4 4 L82 82 Z" fill="#cfd6dd"/><path d="M52 102 l-6 8 l12 -2 Z" fill="#ffb340"/></g>' +
      '<path d="M93 26 L95 14 L102 23 L107 12 L112 23 L119 14 L121 26 Z" fill="#ffb340" stroke="#e08e00" stroke-width="2" stroke-linejoin="round"/>' +
      '<g class="hero-face"><circle cx="106" cy="34" r="14" fill="#ffd9b3"/><circle cx="101" cy="34" r="2" fill="#4a2f14"/><circle cx="112" cy="34" r="2" fill="#4a2f14"/><path d="M101 42 q6 5 11 0" stroke="#b5651d" stroke-width="2" fill="none" stroke-linecap="round"/></g>' +
      '</g></svg>';
  }

  // ---------- pure HTML builders (DOM-free, unit-testable) ----------
  function sceneHTML(story, stageIndex) {
    const st = story.stages[Math.min(stageIndex, story.stages.length - 1)];
    return '<span class="brave-sun">☀️</span><span class="brave-cloud c1">☁️</span><span class="brave-cloud c2">☁️</span>' +
      '<span class="brave-badge">' + st.icon + '</span>' +
      '<span class="brave-hero" id="braveHero">' + heroSVG() + '</span>' +
      '<span class="brave-goal" id="braveGoal">' + story.goal + '</span>' +
      '<span class="brave-ground"></span>';
  }
  function pickerHTML(total) {
    return '<div class="brave-stars-line">معاك ⭐ ' + arabicDigits(total) + ' نجمة — اجمع نجوم من الألعاب والأسئلة عشان تفتح قصص جديدة!</div>' +
      '<div class="science-grid story-grid">' + STORIES.map(s => {
        const open = isUnlocked(s, total);
        const need = Math.max(0, (s.stars || 0) - total);
        let best = 0;
        try { best = Number(localStorage.getItem("matthewBraveBest:" + s.id) || 0); } catch (_) {}
        return '<button type="button" class="science-card story-card brave-card s' + s.id + (open ? "" : " brave-locked") + '" data-brave-story="' + s.id + '">' +
          '<span>' + (open ? s.icon : "🔒") + '</span><b>' + s.title + '</b>' +
          '<small>' + s.desc + '</small>' +
          (open
            ? '<small class="brave-open-hint">يلا نبدأ المغامرة ←' + (best ? ' — ⭐'.repeat(Math.min(5, best)) : '') + '</small>'
            : '<small class="brave-lock-hint">🔒 محتاج ' + arabicDigits(need) + ' نجمة كمان — معاك ' + arabicDigits(total) + ' نجمة، قرّبت يا بطل!</small>') +
          '</button>';
      }).join("") + '</div>';
  }
  function questionHTML(q, choices) {
    return '<div class="question-emoji">' + q.e + '</div>' +
      '<h3 class="brave-question">' + arabicDigits(q.q) + '</h3>' +
      '<button type="button" class="voice-button brave-replay" id="braveReplay">🔊 اسمع السؤال</button>' +
      '<div class="answers" id="braveAnswers">' + choices.map(item =>
        '<button type="button" class="answer" data-answer="' + item.text + '">' +
        '<span class="answer-picture">' + answerPic(item.text, q) + '</span>' +
        '<span class="answer-label">' + arabicDigits(item.text) + '</span></button>'
      ).join("") + '</div>' +
      '<p class="feedback" id="braveFeedback"></p>' +
      '<button type="button" class="primary hidden" id="braveNext">كمّل المغامرة ←</button>';
  }

  // ---------- DOM wiring (browser only; mirrors rescue.js) ----------
  if (typeof document !== "undefined") {
    const main = document.querySelector("main");
    const gameList = document.getElementById("gameList");
    if (main && gameList) {
      const speak = (text, key) => {
        try { if (key && window.MatthewClips && window.MatthewClips.playKey(key)) return; } catch (_) {}
        window.MatthewVoice?.speak(text, "ar-EG");
      };
      const speakSeq = list => {
        if (window.MatthewVoice?.speakSequence) window.MatthewVoice.speakSequence(list, "ar-EG");
        else window.MatthewVoice?.speak(list.join("، "), "ar-EG");
      };

      const panel = document.createElement("section");
      panel.id = "bravePanel";
      panel.className = "quiz-panel hidden";
      panel.setAttribute("aria-live", "polite");
      panel.innerHTML =
        '<div class="quiz-top"><button id="braveBack" class="back" type="button">→ رجوع</button><strong>📖 قصص الملك ماثيو الشجاع</strong><span id="braveProgress"></span></div>' +
        '<div class="brave-map" id="braveMap" aria-hidden="true"></div>' +
        '<div class="brave-scene scene-forest" id="braveScene">' + sceneHTML(STORIES[0], 0) + '</div>' +
        '<h2 id="braveTitle">اختار قصتك!</h2>' +
        '<p id="braveStory" class="brave-story"></p>' +
        '<div id="bravePlay"></div>';
      main.insertBefore(panel, document.querySelector("footer"));
      const $ = id => panel.querySelector("#" + id);

      let story = null, run = null, stage = 0, inStage = 0, current = null, currentChoices = [];
      let answered = false, score = 0, total = 0, qToken = 0;
      let openerIndex = 0;

      const focusMode = on => {
        try {
          [...main.children].forEach(el => { if (el !== panel) el.style.display = on ? "none" : ""; });
          document.body.classList.toggle("brave-focus", on);
        } catch (_) {}
      };
      const hideOthers = () => {
        gameList.classList.add("hidden");
        document.getElementById("learningList")?.classList.add("hidden");
        document.getElementById("quiz")?.classList.add("hidden");
        document.getElementById("result")?.classList.add("hidden");
        ["numbersPanel", "englishMathPanel", "scienceAcademy", "interactivePanel", "parentPanel", "tracingPanel", "readingPanel", "pronunciationChallenge", "lessonHub", "lessonView", "rescuePanel"].forEach(id => document.getElementById(id)?.classList.add("hidden"));
      };

      const openPicker = () => {
        story = null;
        focusMode(true);
        hideOthers();
        panel.classList.remove("hidden");
        panel.classList.remove("brave-celebrate");
        $("braveMap").innerHTML = "";
        $("braveScene").className = "brave-scene scene-forest";
        $("braveScene").innerHTML = sceneHTML(STORIES[0], 0);
        $("braveProgress").textContent = "";
        $("braveTitle").textContent = "اختار قصتك يا ملك! 📖";
        $("braveStory").textContent = PICKER_LINE;
        speak(PICKER_LINE, "story_picker");
        const play = $("bravePlay");
        const totalStars = starTotal();
        play.innerHTML = pickerHTML(totalStars);
        play.querySelectorAll("[data-brave-story]").forEach(b => b.addEventListener("click", () => {
          const s = STORIES.find(x => x.id === b.dataset.braveStory);
          if (!s) return;
          if (!isUnlocked(s, starTotal())) { speak(LOCKED_LINE, "story_locked"); return; }
          startStory(s);
        }));
        window.scrollTo({ top: 0, behavior: "smooth" });
      };

      const clipKey = (kind, stageIndex, qIndex, aIndex) => {
        const p = "story" + CORPUS_PREFIX[story.id];
        if (kind === "intro") return p + "Intro";
        if (kind === "stage") return p + "S" + (stageIndex + 1);
        if (kind === "closer") return p + "Closer";
        if (kind === "win") return p + "Win";
        if (kind === "q") return p + "S" + (stageIndex + 1) + "Q" + (qIndex + 1);
        if (kind === "a") return p + "S" + (stageIndex + 1) + "Q" + (qIndex + 1) + "A" + (aIndex + 1);
        return null;
      };

      const startStory = chosen => {
        focusMode(true);
        story = chosen;
        run = buildRun(story);
        stage = 0; inStage = 0; score = 0; total = 0;
        hideOthers();
        panel.classList.remove("hidden");
        panel.classList.remove("brave-celebrate");
        $("braveScene").className = "brave-scene scene-" + sceneFor(story, 0);
        $("braveScene").innerHTML = sceneHTML(story, 0);
        startStage(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      };

      const renderMap = () => {
        $("braveMap").innerHTML = story.stages.map((s, i) =>
          '<span class="brave-stop' + (i < stage ? " done" : i === stage ? " now" : "") + '">' + (i < stage ? "⭐" : s.icon) + '</span>'
        ).join('<span class="brave-path">- - -</span>') + '<span class="brave-stop goal">' + story.goal + '</span>';
        const hero = $("braveHero");
        if (hero) hero.style.insetInlineStart = (4 + stage * 19) + "%";
        $("braveProgress").textContent = arabicDigits("المرحلة " + Math.min(stage + 1, story.stages.length) + " من " + story.stages.length);
      };

      const startStage = first => {
        renderMap();
        const s = story.stages[stage];
        $("braveScene").className = "brave-scene scene-" + sceneFor(story, stage);
        $("braveScene").innerHTML = sceneHTML(story, stage);
        renderMap();
        $("braveTitle").textContent = s.icon + " " + s.name;
        if (first && stage === 0) {
          $("braveStory").textContent = story.intro;
          // Round 3.2.1 note 25b: Nancy's opener first, then the story
          // intro after ~4.5s (the opener's length). Guarded by stage +
          // story identity, so leaving stage 0 early cancels the intro.
          const opener = STORY_OPENERS[openerIndex++ % STORY_OPENERS.length];
          const openerKey = opener === STORY_OPENERS[0] ? "nancy_intro_story" : "nancy_intro_story_2";
          speak(opener, openerKey);
          const st = stage, stStory = story;
          setTimeout(() => { if (story !== stStory || stage !== st) return; speak(story.intro, clipKey("intro")); }, 4500);
        } else {
          $("braveStory").textContent = s.line;
          speak(s.line, clipKey("stage", stage));
        }
        nextQuestion();
      };

      const narrateQuestion = () => {
        if (!current) return;
        setTimeout(() => speakSeq([current.q, ...currentChoices.map(c => c.text)]), 350);
      };

      const nextQuestion = () => {
        qToken++;
        answered = false;
        current = run.stages[stage].questions[inStage];
        currentChoices = shuffle(current.a.map((text, i) => ({ text, correct: i === current.c })));
        const play = $("bravePlay");
        play.innerHTML = questionHTML(current, currentChoices);
        narrateQuestion();
        const answers = play.querySelector("#braveAnswers");
        play.querySelector("#braveReplay").addEventListener("click", () => speakSeq([current.q, ...currentChoices.map(c => c.text)]));
        answers.querySelectorAll(".answer").forEach(b => b.addEventListener("click", () => choose(b, b.dataset.answer === current.a[current.c], answers)));
        play.querySelector("#braveNext").addEventListener("click", advance);
      };

      const choose = (button, correct, answers) => {
        if (answered) return;
        answered = true; total++;
        try { window.MatthewMastery?.record("brave:" + current.q, correct); window.MatthewMastery?.record("brave", correct); } catch (_) {}
        answers.querySelectorAll(".answer").forEach(b => { b.disabled = true; });
        const feedback = $("bravePlay").querySelector("#braveFeedback");
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
        $("bravePlay").querySelector("#braveNext").classList.remove("hidden");
        const tk = qToken, cq = current;
        setTimeout(() => {
          if (qToken !== tk || !answered || !cq) return;
          speakSeq(["الإجابة الصحيحة هي", cq.a[cq.c]]);
        }, 2600);
      };

      const advance = () => {
        inStage++;
        if (inStage < PER_STAGE) { nextQuestion(); return; }
        inStage = 0; stage++;
        if (stage >= story.stages.length) { win(); return; }
        renderMap();
        const s = story.stages[stage];
        $("braveTitle").textContent = "قرّبت يا بطل! 🎉";
        $("braveStory").textContent = "عدّيت مرحلة! كمّل كده وانت هتوصل…";
        speak(story.closer, clipKey("closer"));
        const play = $("bravePlay");
        play.innerHTML = '<div class="question-emoji">' + s.icon + '</div><h3 class="brave-question">المرحلة اللي جاية: ' + s.name + '</h3><button type="button" class="primary" id="braveGo">يلا كمّل ←</button>';
        play.querySelector("#braveGo").addEventListener("click", () => startStage(false));
      };

      const win = () => {
        renderMap();
        const hero = $("braveHero");
        if (hero) hero.style.insetInlineStart = "76%";
        panel.classList.add("brave-celebrate");
        $("braveTitle").textContent = story.winTitle;
        $("braveStory").textContent = story.winStory;
        speak(story.win, clipKey("win"));
        window.MatthewVoice?.feedback("correct");
        const stars = Math.max(1, Math.round((score / Math.max(1, total)) * 5));
        try {
          const old = Number(localStorage.getItem("matthewStars") || 0);
          localStorage.setItem("matthewStars", old + stars);
          const trophies = Number(localStorage.getItem("matthewTrophies") || 0);
          localStorage.setItem("matthewTrophies", trophies + 1);
          const bestKey = "matthewBraveBest:" + story.id;
          localStorage.setItem(bestKey, Math.max(Number(localStorage.getItem(bestKey) || 0), stars));
          let history = [];
          try { history = JSON.parse(localStorage.getItem("matthewHistory") || "[]"); if (!Array.isArray(history)) history = []; } catch (_) { history = []; }
          history.unshift({ category: story.title, score, total, stars, points: score * 10, at: Date.now() });
          localStorage.setItem("matthewHistory", JSON.stringify(history.slice(0, 30)));
        } catch (_) {}
        const play = $("bravePlay");
        play.innerHTML =
          '<div class="question-emoji brave-win-burst">' + story.icon + story.goal + '🎉</div>' +
          '<div class="result-stars">' + "⭐".repeat(stars) + "☆".repeat(5 - stars) + '</div>' +
          '<p class="feedback">جاوبت صح على ' + arabicDigits(score) + ' من ' + arabicDigits(total) + ' أسئلة</p>' +
          '<button type="button" class="primary" id="braveAgain">العب القصة دي تاني ←</button>' +
          '<button type="button" class="secondary" id="braveStories">اختار قصة تانية 📖</button>' +
          '<button type="button" class="secondary" id="braveHome">العودة للمملكة</button>';
        play.querySelector("#braveAgain").addEventListener("click", () => startStory(story));
        play.querySelector("#braveStories").addEventListener("click", openPicker);
        play.querySelector("#braveHome").addEventListener("click", close);
      };

      const close = () => {
        focusMode(false);
        panel.classList.add("hidden");
        panel.classList.remove("brave-celebrate");
        gameList.classList.remove("hidden");
        document.getElementById("learningList")?.classList.remove("hidden");
        try { window.MatthewVoice?.stop(); } catch (_) {}
        if (typeof updateStats === "function") { try { updateStats(); } catch (_) {} }
      };
      // Hierarchical back (note 16): inside a story → the story list;
      // on the list itself → home. Never jumps straight home from a story.
      $("braveBack").addEventListener("click", () => { if (story) openPicker(); else close(); });

      const card = document.querySelector("[data-brave-stories]");
      if (card) card.addEventListener("click", openPicker);
    }
  }

  return {
    STORIES, CORPUS, PICKER_LINE, LOCKED_LINE, PER_STAGE, STORY_OPENERS,
    starTotal, isUnlocked, buildRun, heroSVG, sceneHTML, sceneFor, pickerHTML, questionHTML, answerPic, shuffle, arabicDigits
  };
});
