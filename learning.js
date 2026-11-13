(() => {
  // Round 3.2.1 note 9: the Arabic-letters card is gone — the letter
  // school (lessons.js) is the one Arabic-letters entry now, with its
  // picker and unified lesson.
  // Round 3.2.3 item 8: the numbers cards are GONE too — the two journeys
  // (math-journey.js / math-english.js) are the only numbers entries now.
  // The arNumbers/enNumbers DATA stays below: the round321 numbers-once
  // test needs `speak:arabicNames[i]`, and the journeys speak the same
  // Egyptian names via the text map.
  const englishWords = ["Apple","Ball","Cat","Dog","Elephant","Fish","Grapes","House","Ice cream","Juice","Kite","Lion","Monkey","Nest","Orange","Pencil","Queen","Rabbit","Sun","Tiger","Umbrella","Van","Watch","Xylophone","Yo-yo","Zebra"];
  const arabicMeanings = ["تفاحة","كورة","قطة","كلب","فيل","سمكة","عنب","بيت","آيس كريم","عصير","طيارة ورق","أسد","قرد","عش","برتقالة","قلم رصاص","ملكة","أرنب","شمس","نمر","شمسية","عربية","ساعة","إكسيليفون","يويو","حمار وحشي"];
  const phonicsSounds=["short a","buh","kuh","duh","eh","fff","guh","huh","eye","juh","kuh","lll","mmm","nnn","o","puh","kwuh","rrr","sss","tuh","uh","vvv","wuh","zuh","yuh","zzz"];
  const englishLetters = englishWords.map((word,i) => {
    const letter=String.fromCharCode(65+i);
    return {value:letter,lowercase:letter.toLowerCase(),phonics:phonicsSounds[i],word,emoji:["🍎","⚽","🐱","🐶","🐘","🐟","🍇","🏠","🍦","🧃","🪁","🦁","🐵","🪺","🍊","✏️","👑","🐰","☀️","🐯","☂️","🚐","⌚","<svg viewBox='0 0 64 64' aria-hidden='true'><g stroke='#5b6067' stroke-width='1.5'><rect x='10' y='10' width='44' height='6' rx='3' fill='#e14b6d'/><rect x='12' y='18' width='40' height='6' rx='3' fill='#ff9d45'/><rect x='14' y='26' width='36' height='6' rx='3' fill='#ffd94d'/><rect x='16' y='34' width='32' height='6' rx='3' fill='#8bd9a7'/><rect x='18' y='42' width='28' height='6' rx='3' fill='#69b7ff'/></g><path d='M14 52 L26 34 M50 52 L40 30' stroke='#8a5a24' stroke-width='3' stroke-linecap='round'/><circle cx='26' cy='32' r='4' fill='#e14b6d'/><circle cx='40' cy='28' r='4' fill='#2169a8'/></svg>","🪀","🦓"][i],speak:"حرف "+letter+"، شكله الصغير "+letter.toLowerCase()+"، صوته "+phonicsSounds[i]+"، زي كلمة "+word+" يعني "+arabicMeanings[i]};
  });
  const arabicNames=["واحد","اتنين","تلاتة","أربعة","خمسة","ستة","سبعة","تمانية","تسعة","عشرة","حداشر","اتناشر","تلتاشر","أربعتاشر","خمستاشر","ستاشر","سبعتاشر","تمنتاشر","تسعتاشر","عشرين"];
  const arabicDigits=["١","٢","٣","٤","٥","٦","٧","٨","٩","١٠","١١","١٢","١٣","١٤","١٥","١٦","١٧","١٨","١٩","٢٠"];
  const englishNames=["one","two","three","four","five","six","seven","eight","nine","ten","eleven","twelve","thirteen","fourteen","fifteen","sixteen","seventeen","eighteen","nineteen","twenty"];
  const arabicNumbers=arabicDigits.map((n,i)=>({value:n,word:arabicNames[i],emoji:"🔢",speak:arabicNames[i]}));
  const englishNumbers=englishNames.map((n,i)=>({value:String(i+1),word:n,emoji:"🔢",speak:n}));
  const categories=[
    {id:"enLetters",title:"الحروف الإنجليزية (A - Z)",subtitle:"٢٦ حرف مع كلمة لكل حرف",items:englishLetters,lang:"ar-EG"}
  ];
  const main=document.querySelector("main"),gameList=document.getElementById("gameList"),learningList=document.getElementById("learningList")||gameList;
  if(!main||!gameList)return;
  const panel=document.createElement("section");
  panel.id="basicLearning";panel.className="academy-panel hidden";panel.dir="rtl";
  main.insertBefore(panel,document.querySelector("footer"));
  // Round 3.2.2 P0-4: recorded clips ONLY — no device speechSynthesis.
  const speak=(text,lang)=>{if(window.MatthewVoice&&window.MatthewVoice.speak)window.MatthewVoice.speak(text,lang)};
  const speakSeq=(list,lang)=>{if(window.MatthewVoice&&window.MatthewVoice.speakSequence)window.MatthewVoice.speakSequence(list,lang)};
  // Round 3.2.3 item 9: English lessons have NO quiz bank to offer (there
  // is no English category in the main quiz bank — never route an English
  // lesson at the Arabic banks). The last letter therefore ends with a
  // spoken completion instead of a quiz offer. NEW CLIP for the audio
  // worker: en_letters_done = this text (Aria, ar-EG).
  const EN_DONE="برافو يا بطل! خلصت كل الحروف الإنجليزية!";
  let active=null,index=0;
  categories.forEach((cat,i)=>{
    const card=document.createElement("button");card.type="button";card.className="game-card "+["orange","blue","green","purple"][i];
    card.innerHTML='<span class="game-icon">'+["📖","🔤","🔢","🔢"][i]+'</span><strong>'+cat.title+'</strong><small>'+cat.subtitle+'</small><span class="play">ابدأ التعلم ←</span>';
    card.addEventListener("click",()=>open(cat));learningList.append(card);
  });
  function open(cat){active=cat;index=0;enTab="lesson";enExplainSpoken=-1;enQuiz=null;gameList.classList.add("hidden");learningList.classList.add("hidden");document.getElementById("quiz")?.classList.add("hidden");document.getElementById("result")?.classList.add("hidden");panel.classList.remove("hidden");render()}
  // Round 3.2.6 item 2: the English-letter walk opens with three big tabs
  // — 📖 الدرس (the letter, its word and the A–Z grid), 🧕 الشرح (the full
  // explanation, spoken once when the tab opens), 🏆 الاختبار (a quiz
  // about THIS letter only). Item 3: the quiz is built from the 26-letter
  // data — the letter, its lowercase, its phonics, its word and its Arabic
  // meaning — never a general bank (there is no English bank at all).
  // Five of its six question texts are recorded as Aria clips enq_let_1..5
  // (round 3.2.6 integrator) — the quiz speaks each question as ONE
  // element, q.q + " اختار الإجابة الصحيحة", so the clip text is the
  // combined string. The pictured choices still play (capitals,
  // lowercases and English words all have clips). Phonics strings and
  // Arabic meanings have no bare clips either, so those two choice sets
  // are text-only for now.
  let enTab="lesson", enExplainSpoken=-1, enQuiz=null, enQuizIndex=0, enQuizScore=0;
  const EN_Q_NEW=[
    "ما الشكل الصغير لهذا الحرف؟",
    "أي كلمة تبدأ بهذا الحرف؟",
    "أي حرف تبدأ به هذه الكلمة؟",
    "ما معنى هذه الكلمة؟",
    "ما صوت هذا الحرف؟"
  ];
  const enTabsHTML=active=>`<div class="lesson-tabs" role="tablist"><button type="button" class="lesson-tab${active==="lesson"?" active":""}" data-en-tab="lesson" role="tab">📖 الدرس</button><button type="button" class="lesson-tab${active==="explain"?" active":""}" data-en-tab="explain" role="tab">🧕 الشرح</button><button type="button" class="lesson-tab${active==="quiz"?" active":""}" data-en-tab="quiz" role="tab">🏆 الاختبار</button></div>`;
  function resetEnTabs(){speakToken++;enTab="lesson";enExplainSpoken=-1;enQuiz=null;enQuizIndex=0;enQuizScore=0}
  function switchEnTab(name){
    if(name!=="lesson"&&name!=="explain"&&name!=="quiz")return;
    try{window.MatthewVoice?.stop()}catch(_){}
    speakToken++;
    enTab=name;
    if(name==="explain"&&enExplainSpoken!==index){enExplainSpoken=index;const item=active.items[index];const tk=++speakToken;setTimeout(()=>{if(tk!==speakToken)return;if(index===active.items.length-1)speakSeq([item.speak,EN_DONE],active.lang);else speak(item.speak,active.lang)},120);}
    if(name==="quiz"&&!enQuiz)buildEnQuiz();
    render();
  }
  function buildEnQuiz(){
    const item=active.items[index];
    const otherIdx=active.items.map((_,i)=>i).filter(i=>i!==index);
    const pick3=()=>[...otherIdx].sort(()=>Math.random()-.5).slice(0,3);
    const mk=(q,show,showPic,choices)=>{const order=choices.map((c,i)=>({c,ok:i===0})).sort(()=>Math.random()-.5);return {q,show,showPic,a:order.map(x=>x.c.t),pics:order.map(x=>x.c.pic),c:order.findIndex(x=>x.ok)};};
    const o3=pick3();
    const NEUTRAL="🔤";
    enQuiz=[
      mk("ما اسم هذا الحرف؟",item.value,"",[{t:item.value,pic:NEUTRAL},...o3.map(i=>({t:active.items[i].value,pic:NEUTRAL}))]),
      mk(EN_Q_NEW[0],item.value,"",[{t:item.lowercase,pic:NEUTRAL},...o3.map(i=>({t:active.items[i].lowercase,pic:NEUTRAL}))]),
      mk(EN_Q_NEW[1],item.value,"",[{t:item.word,pic:item.emoji},...o3.map(i=>({t:active.items[i].word,pic:active.items[i].emoji}))]),
      mk(EN_Q_NEW[2],item.word,"",[{t:item.value,pic:NEUTRAL},...o3.map(i=>({t:active.items[i].value,pic:NEUTRAL}))]),
      mk(EN_Q_NEW[3],item.word,item.emoji,[{t:arabicMeanings[index],pic:NEUTRAL},...o3.map(i=>({t:arabicMeanings[i],pic:NEUTRAL}))]),
      mk(EN_Q_NEW[4],item.value,"",[{t:item.phonics,pic:NEUTRAL},...o3.map(i=>({t:active.items[i].phonics,pic:NEUTRAL}))])
    ];
    enQuizIndex=0;enQuizScore=0;
  }
  function enQuizPanelHTML(){
    if(!enQuiz)return `<p>اختبر نفسك في حرف ${active.items[index].value} بس — من غير أي حرف تاني.</p><button id="enQuizStart" class="primary" type="button">🏆 اختبر نفسك ⭐</button>`;
    if(enQuizIndex>=enQuiz.length)return `<div class="lesson-title">برافو يا ملك ماثيو! 👑</div><div class="big-letter sticky-panel">🏆</div><h2>${enQuizScore.toLocaleString("ar-EG")} من ${enQuiz.length.toLocaleString("ar-EG")}</h2><p>${enQuizScore>=5?"ممتاز! أنت بطل الحروف الإنجليزية ⭐":"شاطر! نعيد الدرس ونجرب تاني 💜"}</p><button id="enQuizRetry" class="primary">اختبار جديد بأسئلة مختلفة</button><button id="enQuizBack" class="secondary">→ رجوع للدرس</button>`;
    const q=enQuiz[enQuizIndex];
    return `<div class="lesson-title">اختبار الملك ماثيو 👑</div>${q.showPic?`<div class="basic-emoji">${q.showPic}</div>`:""}<div class="big-letter sticky-panel">${q.show}</div><h2>${q.q}</h2><div class="lesson-answers">${q.a.map((a,i)=>`<button data-en-answer="${i}"><span class="answer-picture" aria-hidden="true">${q.pics[i]}</span><span class="answer-label">${a}</span></button>`).join("")}</div><p id="enQuizMsg" class="feedback" aria-live="polite"></p><button id="enQuizNext" class="primary hidden" type="button">السؤال التالي<span class="pager-arrow">←</span></button>`;
  }
  function bindEnQuizPanel(){
    const s=panel.querySelector("#enQuizStart");if(s)s.onclick=()=>{buildEnQuiz();render()};
    const r=panel.querySelector("#enQuizRetry");if(r)r.onclick=()=>{buildEnQuiz();render()};
    const b=panel.querySelector("#enQuizBack");if(b)b.onclick=()=>{enTab="lesson";render()};
    const q=enQuiz&&enQuiz[enQuizIndex];
    if(!q)return;
    const spoken=q.q+" اختار الإجابة الصحيحة";
    panel.querySelectorAll("[data-en-answer]").forEach(btn=>btn.onclick=()=>{
      if(panel.dataset.enDone==="1")return;panel.dataset.enDone="1";
      const ok=Number(btn.dataset.enAnswer)===q.c;
      try{window.MatthewMastery?.record("english-letters",ok);window.MatthewMastery?.record("english-letter:"+active.items[index].value,ok)}catch(_){}
      if(ok)enQuizScore++;
      panel.querySelectorAll("[data-en-answer]").forEach(x=>{x.disabled=true;if(Number(x.dataset.enAnswer)===q.c)x.classList.add("correct")});
      if(!ok)btn.classList.add("wrong");
      const msg=panel.querySelector("#enQuizMsg");if(msg)msg.textContent=ok?"برافو يا بطل! إجابة صحيحة ⭐":"محاولة جميلة! ركز وجرب السؤال التالي";
      const nx=panel.querySelector("#enQuizNext");if(nx){nx.classList.remove("hidden");nx.innerHTML=enQuizIndex===enQuiz.length-1?"النتيجة 🏆":"السؤال التالي<span class=\"pager-arrow\">←</span>";nx.onclick=()=>{panel.dataset.enDone="0";enQuizIndex++;render()}}
    });
    const tk=++speakToken;setTimeout(()=>{if(tk!==speakToken)return;speakSeq([spoken,...q.a],active.lang)},350);
  }
  function render(){
    const item=active.items[index];
    const heading="اتعلم واسمع";
    panel.innerHTML='<div class="quiz-top"><button id="basicBack" class="back" type="button">🏠 الرئيسية</button><strong>'+active.title+'</strong><span>'+String(index+1).replace(/[0-9]/g,d=>"٠١٢٣٤٥٦٧٨٩"[+d])+' / '+active.items.length.toLocaleString("ar-EG")+'</span></div><div class="progress"><div style="width:'+((index+1)/active.items.length*100)+'%"></div></div>'+enTabsHTML(enTab)
      +'<div class="tab-panel'+(enTab==="lesson"?" active":"")+'" data-en-panel="lesson"><div class="basic-focus sticky-panel"><div class="basic-emoji">'+item.emoji+'</div><div class="basic-value">'+item.value+'</div>'+(active.id==="enLetters"?'<div class="lowercase-letter">الشكل الصغير: '+item.lowercase+'</div><div class="phonics-note">الصوت: '+item.phonics+'</div>':'')+'<h2>'+item.word+'</h2><p>'+heading+'</p><button id="basicListen" class="voice-button" type="button">🔊 اسمع</button></div><div class="basic-grid">'+active.items.map((x,i)=>'<button type="button" class="basic-tile '+(i===index?"active":"")+'" data-index="'+i+'"><span>'+x.emoji+'</span><b>'+(x.lowercase?x.value+" / "+x.lowercase:x.value)+'</b><small>'+x.word+'</small></button>').join("")+'</div><div class="basic-nav"><button id="basicPrev" class="secondary" type="button" '+(index===0?"disabled":"")+'>السابق</button><button id="basicNext" class="primary" type="button">'+(index===active.items.length-1?"🎉 خلصت الدرس! ⭐":"التالي ←")+'</button></div></div>'
      +'<div class="tab-panel'+(enTab==="explain"?" active":"")+'" data-en-panel="explain"><div class="explain-box"><strong>🧕 الميس بتشرح لك من الصفر</strong><p>حرف <b>'+item.value+'</b>، شكله الصغير <b>'+item.lowercase+'</b>، صوته <b>'+item.phonics+'</b>، زي كلمة <b>'+item.word+'</b> يعني <b>'+arabicMeanings[index]+'</b> '+item.emoji+'</p><p>اسمع الشرح كويس وقول الحرف ورايا بصوت عالي، وبعدين جرّب 🏆 الاختبار على نفس الحرف!</p></div><button id="enExplainListen" class="voice-button" type="button">🔊 اسمع الشرح</button></div>'
      +'<div class="tab-panel'+(enTab==="quiz"?" active":"")+'" data-en-panel="quiz">'+enQuizPanelHTML()+'</div>';
    panel.querySelector("#basicBack").onclick=close;
    panel.querySelector("#basicListen").onclick=()=>speak(item.speak,active.lang);
    panel.querySelector("#basicPrev").onclick=()=>{index=Math.max(0,index-1);resetEnTabs();render()};
    panel.querySelector("#basicNext").onclick=()=>{index=index===active.items.length-1?0:index+1;resetEnTabs();render()};
    panel.querySelectorAll("[data-index]").forEach(b=>b.onclick=()=>{index=Number(b.dataset.index);resetEnTabs();render()});
    panel.querySelector("#enExplainListen").onclick=()=>speak(item.speak,active.lang);
    panel.querySelectorAll("[data-en-tab]").forEach(b=>b.onclick=()=>switchEnTab(b.dataset.enTab));
    bindEnQuizPanel();
  }
  let speakToken=0;
  function close(){speakToken++;panel.classList.add("hidden");gameList.classList.remove("hidden");learningList.classList.remove("hidden");window.MatthewVoice?.stop()}
})();