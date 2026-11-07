(() => {
  const speak = (text, lang = "ar-EG") => {
    const synth=window.speechSynthesis;
    const status=document.getElementById("speechResult")||document.getElementById("lessonStatus");
    if(!synth||!window.SpeechSynthesisUtterance){
      if(status)status.textContent="ميزة الصوت غير مدعومة في نسخة المتصفح الحالية. افتح التطبيق بمتصفح Chrome وحدّث خدمات تحويل النص إلى كلام.";
      return false;
    }
    synth.cancel();
    let started=false, finished=false;
    const launch=()=>{
      if(started)return;
      started=true;
      const utterance=new SpeechSynthesisUtterance(String(text||""));
      utterance.lang=lang;
      utterance.rate=lang.toLowerCase().startsWith("ar")?0.78:0.84;
      utterance.pitch=1;
      utterance.volume=1;
      const voices=synth.getVoices()||[];
      const prefix=lang.slice(0,2).toLowerCase();
      const selected=voices.find(v=>v.lang&&v.lang.toLowerCase()===lang.toLowerCase())||
        voices.find(v=>v.lang&&v.lang.toLowerCase().startsWith(prefix))||
        (prefix==="ar"?voices.find(v=>v.lang&&v.lang.toLowerCase().startsWith("ar")):null);
      if(selected)utterance.voice=selected;
      utterance.onstart=()=>{finished=true;if(status)status.textContent="🔊 اسمع كويس يا بطل";};
      utterance.onend=()=>{finished=true;};
      utterance.onerror=(event)=>{
        finished=true;
        if(status)status.textContent="الصوت لم يشتغل. فعّل محرك تحويل النص إلى كلام من إعدادات أندرويد وارفع صوت الوسائط.";
      };
      try{
        synth.resume();
        synth.speak(utterance);
        // بعض إصدارات WebView تحتاج استدعاء resume بعد وضع الجملة في الطابور.
        setTimeout(()=>{if(synth.paused)synth.resume();},250);
        setTimeout(()=>{
          if(!finished && synth.speaking===false && status)
            status.textContent="لم يبدأ الصوت. تأكد من تثبيت وتفعيل Speech Services by Google في الهاتف.";
        },1800);
      }catch(error){
        if(status)status.textContent="تعذر تشغيل الصوت. راجع إعدادات تحويل النص إلى كلام في الهاتف.";
        return false;
      }
      return true;
    };
    if(synth.getVoices().length)launch();
    else{
      const onVoices=()=>{synth.removeEventListener("voiceschanged",onVoices);launch();};
      synth.addEventListener("voiceschanged",onVoices);
      setTimeout(launch,1200);
    }
    return true;
  };
  window.MatthewVoice = { speak };
  const observer = new MutationObserver(() => {
    const area = document.querySelector(".question-area");
    if (!area || area.querySelector(".speak-question")) return;
    const button = document.createElement("button");
    button.className = "voice-button speak-question";
    button.type = "button";
    button.textContent = "🔊 اسمع السؤال";
    button.addEventListener("click", () => {
      // اقرأ نص السؤال فقط؛ لا تصف الصورة ولا تسرد الاختيارات تلقائياً.
      const question = document.getElementById("questionText")?.textContent?.trim() || "";
      if (question) speak(question, "ar-EG");
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
      panel.querySelector("#listenWord").onclick=()=>item&&speak(item.word,lang==="ar"?"ar-SA":"en-US");
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
    recognition=new SR();recognition.lang=lang==="ar"?"ar-SA":"en-US";recognition.interimResults=false;recognition.maxAlternatives=3;
    const btn=document.getElementById("recordWord");btn.disabled=true;btn.textContent="🎙️ سامعك...";
    recognition.onresult=e=>{const heard=e.results[0][0].transcript.trim();const clean=x=>x.toLocaleLowerCase().replace(/[ًٌٍَُِّْـ.,!?؟]/g,"").trim();const ok=e.results[0].some(v=>clean(v.transcript)===clean(item.word));attempts++;if(ok)score++;document.getElementById("speechResult").textContent=(ok?"👏 ممتاز! نطق جميل. ":"محاولة حلوة! ")+"سمعت: "+heard+" — الكلمة المطلوبة: "+item.word;document.getElementById("voiceScore").textContent=score+" / "+attempts};
    recognition.onerror=e=>{document.getElementById("speechResult").textContent=e.error==="not-allowed"?"اسمح للمتصفح باستخدام الميكروفون من إعدادات الموقع.":"مش قادر أسمع بوضوح. جرّب مرة تانية.";};
    recognition.onend=()=>{btn.disabled=false;btn.textContent="🎤 اضغط واتكلم"};
    try{recognition.start()}catch(e){btn.disabled=false;btn.textContent="🎤 اضغط واتكلم"}
  }
})();