(() => {
  const speak = async (text, lang) => {
    const native = window.MatthewNativeTTS;
    if (window.Capacitor && typeof window.Capacitor.isNativePlatform === "function" && window.Capacitor.isNativePlatform() && native) {
      try {
        const result = await native.getSupportedVoices();
        const voices = result.voices || [];
        const prefix = lang.slice(0, 2).toLowerCase();
        const matches = voices.map((voice, index) => ({ voice, index })).filter(x => x.voice.lang && x.voice.lang.toLowerCase().startsWith(prefix));
        const femalePattern = /female|woman|fem|zira|samantha|susan|karen|moira|victoria|tessa/i;
        const femaleLocal = matches.find(x => x.voice.localService && femalePattern.test((x.voice.voiceURI || "") + " " + (x.voice.name || "")));
        const female = matches.find(x => femalePattern.test((x.voice.voiceURI || "") + " " + (x.voice.name || "")));
        const local = matches.find(x => x.voice.localService);
        const selected = femaleLocal || female || local || matches[0];
        await native.speak({
          text,
          lang,
          rate: lang.startsWith("ar") ? 0.72 : 0.82,
          pitch: 1.05,
          volume: 1,
          ...(selected ? { voice: selected.index } : {})
        });
        return;
      } catch (error) {
        const status = document.getElementById("speechResult") || document.getElementById("lessonStatus");
        if (status) status.textContent = "تعذر تشغيل الصوت الداخلي. تأكد من تثبيت صوت اللغة على الهاتف.";
      }
    }
    const synth = window.speechSynthesis;
    if (!synth || !window.SpeechSynthesisUtterance) {
      const status = document.getElementById("speechResult") || document.getElementById("lessonStatus");
      if (status) status.textContent = "الصوت مش متاح دلوقتي. محتاجين نثبت صوت العربي على الموبايل.";
      return;
    }
    synth.cancel();
    let started = false;
    const launch = () => {
      if (started) return;
      started = true;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = lang.startsWith("ar") ? 0.72 : 0.82;
      utterance.pitch = 1.05;
      utterance.volume = 1;
      const voices = synth.getVoices();
      const prefix = lang.slice(0, 2).toLowerCase();
      const localeVoices = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith(prefix));
      const femalePattern = /female|woman|zira|samantha|susan|karen|moira|victoria|tessa/i;
      const match = localeVoices.find(v => femalePattern.test(v.name || "")) || localeVoices[0];
      if (match) utterance.voice = match;
      utterance.onerror = () => {
        const status = document.getElementById("speechResult") || document.getElementById("lessonStatus");
        if (status) status.textContent = "الصوت مش شغال دلوقتي. اتأكد إن صوت العربي المصري متثبت على الموبايل.";
      };
      try { synth.resume(); synth.speak(utterance); }
      catch (error) {
        const status = document.getElementById("speechResult") || document.getElementById("lessonStatus");
        if (status) status.textContent = "تعذر تشغيل الصوت على هذا الجهاز.";
      }
    };
    if (synth.getVoices().length) launch();
    else {
      synth.addEventListener("voiceschanged", launch, { once: true });
      setTimeout(launch, 900);
    }
  };
  window.MatthewVoice = { speak };
  const observer = new MutationObserver(() => {
    const area = document.querySelector(".question-area");
    if (!area || area.querySelector(".speak-question")) return;
    const button = document.createElement("button");
    button.className = "voice-button speak-question";
    button.type = "button";
    button.textContent = "🔊 اسمع السؤال بالمصري";
    button.addEventListener("click", () => {
      const questionEl = document.getElementById("questionText");
      const question = questionEl?.textContent || "";
      const answers = [...document.querySelectorAll(".answer")].map(x => x.textContent).join(". ");
      const lang = questionEl?.lang === "en" ? "en-US" : "ar-EG";
      speak(question + ". " + answers, lang);
    });
    area.insertBefore(button, area.querySelector(".question-emoji"));
  });
  observer.observe(document.body, {childList:true,subtree:true});
  const card = document.createElement("button");
  card.className = "game-card pink";
  card.type = "button";
  card.innerHTML = '<span class="game-icon">🎙️</span><strong>تحدي النطق</strong><small>اسمع الكلمة وانطقها بالعربي أو الإنجليزي</small><span class="play">ابدأ التدريب ←</span>';
  card.addEventListener("click", openPractice);
  document.getElementById("gameList")?.append(card);
  const words = {
    ar: [{word:"أسد",meaning:"حيوان قوي",emoji:"🦁"},{word:"تفاحة",meaning:"فاكهة لذيذة",emoji:"🍎"},{word:"قمر",meaning:"ينير الليل",emoji:"🌙"},{word:"مدرسة",meaning:"مكان التعلم",emoji:"🏫"},{word:"سيارة",meaning:"وسيلة مواصلات",emoji:"🚗"},{word:"فراشة",meaning:"حشرة جميلة",emoji:"🦋"},{word:"كتاب",meaning:"نقرأ فيه",emoji:"📘"},{word:"شمس",meaning:"تنير النهار",emoji:"☀️"}],
    en: [{word:"Apple",meaning:"تفاحة",emoji:"🍎"},{word:"Cat",meaning:"قطة",emoji:"🐱"},{word:"Sun",meaning:"شمس",emoji:"☀️"},{word:"Book",meaning:"كتاب",emoji:"📘"},{word:"Ball",meaning:"كرة",emoji:"⚽"},{word:"Dog",meaning:"كلب",emoji:"🐶"},{word:"Milk",meaning:"حليب",emoji:"🥛"},{word:"Fish",meaning:"سمكة",emoji:"🐟"}]
  };
  let lang="en", item=null, recognition=null, score=0, attempts=0;
  function openPractice() {
    document.getElementById("gameList").classList.add("hidden");
    document.getElementById("quiz").classList.add("hidden");
    document.getElementById("result").classList.add("hidden");
    let panel=document.getElementById("pronunciation");
    if(!panel){
      panel=document.createElement("section"); panel.id="pronunciation"; panel.className="quiz-panel";
      panel.innerHTML='<div class="quiz-top"><button id="voiceBack" class="back" type="button">→ رجوع</button><strong>🎙️ تحدي النطق</strong><span id="voiceScore">0 / 0</span></div><div class="language-switch"><button id="arabicMode" class="secondary" type="button">العربية</button><button id="englishMode" class="primary" type="button">English</button></div><div class="pronounce-card"><div id="wordEmoji" class="question-emoji">🍎</div><h2 id="targetWord">Apple</h2><p id="wordMeaning">تفاحة</p><button id="listenWord" class="voice-button" type="button">🔊 اسمع النطق</button><button id="recordWord" class="primary" type="button">🎤 اضغط واتكلم</button><p id="speechResult" class="feedback" aria-live="polite">اسمع الكلمة ثم حاول تقولها بصوت واضح</p><button id="nextWord" class="secondary" type="button">كلمة جديدة ↻</button></div><p class="voice-note">ملاحظة: التعرف على الصوت يحتاج متصفحاً يدعمه وقد يحتاج إنترنت أو إذن الميكروفون.</p>';
      document.querySelector("main").insertBefore(panel,document.querySelector("footer"));
      panel.querySelector("#voiceBack").onclick=()=>{panel.classList.add("hidden");document.getElementById("gameList").classList.remove("hidden")};
      panel.querySelector("#arabicMode").onclick=()=>setLang("ar");
      panel.querySelector("#englishMode").onclick=()=>setLang("en");
      panel.querySelector("#listenWord").onclick=()=>item&&speak(item.word,lang==="ar"?"ar-EG":"en-US");
      panel.querySelector("#nextWord").onclick=next;
      panel.querySelector("#recordWord").onclick=record;
    }
    panel.classList.remove("hidden"); setLang("en"); next();
  }
  function setLang(value){lang=value;document.getElementById("arabicMode").className=value==="ar"?"primary":"secondary";document.getElementById("englishMode").className=value==="en"?"primary":"secondary";next()}
  function next(){const list=words[lang];let candidate=list[Math.floor(Math.random()*list.length)];if(item&&list.length>1)while(candidate.word===item.word)candidate=list[Math.floor(Math.random()*list.length)];item=candidate;document.getElementById("wordEmoji").textContent=item.emoji;document.getElementById("targetWord").textContent=item.word;document.getElementById("wordMeaning").textContent=item.meaning;document.getElementById("speechResult").textContent="اسمع الكلمة ثم حاول تقولها بصوت واضح";document.getElementById("voiceScore").textContent=score+" / "+attempts}
  function record(){
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){document.getElementById("speechResult").textContent="المتصفح لا يدعم تسجيل النطق. استخدم زر اسمع النطق للتدريب.";return}
    if(recognition)try{recognition.abort()}catch(e){}
    recognition=new SR();recognition.lang=lang==="ar"?"ar-EG":"en-US";recognition.interimResults=false;recognition.maxAlternatives=3;
    const btn=document.getElementById("recordWord");btn.disabled=true;btn.textContent="🎙️ سامعك...";
    recognition.onresult=e=>{const heard=e.results[0][0].transcript.trim();const clean=x=>x.toLocaleLowerCase().replace(/[ًٌٍَُِّْـ.,!?؟]/g,"").trim();const ok=e.results[0].some(v=>clean(v.transcript)===clean(item.word));attempts++;if(ok)score++;document.getElementById("speechResult").textContent=(ok?"👏 ممتاز! نطق جميل. ":"محاولة حلوة! ")+"سمعت: "+heard+" — الكلمة المطلوبة: "+item.word;document.getElementById("voiceScore").textContent=score+" / "+attempts};
    recognition.onerror=e=>{document.getElementById("speechResult").textContent=e.error==="not-allowed"?"اسمح للمتصفح باستخدام الميكروفون من إعدادات الموقع.":"مش قادر أسمع بوضوح. جرّب مرة تانية.";};
    recognition.onend=()=>{btn.disabled=false;btn.textContent="🎤 اضغط واتكلم"};
    try{recognition.start()}catch(e){btn.disabled=false;btn.textContent="🎤 اضغط واتكلم"}
  }
})();