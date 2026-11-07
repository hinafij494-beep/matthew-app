(() => {
  const arabicLetters = [
    ["أ","أَسَد","🦁"],["ب","بَطَّة","🦆"],["ت","تُفَّاحَة","🍎"],["ث","ثَعْلَب","🦊"],
    ["ج","جَمَل","🐪"],["ح","حِصَان","🐎"],["خ","خَرُوف","🐑"],["د","دُبّ","🐻"],
    ["ذ","ذِئْب","🐺"],["ر","رُمَّان","🍎"],["ز","زَرَافَة","🦒"],["س","سَمَكَة","🐟"],
    ["ش","شَمْس","☀️"],["ص","صَقْر","🦅"],["ض","ضِفْدَع","🐸"],["ط","طَائِر","🐦"],
    ["ظ","ظَرْف","✉️"],["ع","عُصْفُور","🐤"],["غ","غَزَال","🦌"],["ف","فِيل","🐘"],
    ["ق","قِطَّة","🐱"],["ك","كِتَاب","📘"],["ل","لَبَن","🥛"],["م","مَوْز","🍌"],
    ["ن","نَمِر","🐅"],["هـ","هُدْهُد","🐦"],["و","وَرْدَة","🌹"],["ي","يَد","✋"]
  ].map(x => ({value:x[0],word:x[1],emoji:x[2],speak:x[0]+"، "+x[1]}));
  const englishWords = ["Apple","Ball","Cat","Dog","Elephant","Fish","Grapes","House","Ice cream","Juice","Kite","Lion","Monkey","Nest","Orange","Pencil","Queen","Rabbit","Sun","Tiger","Umbrella","Van","Watch","Xylophone","Yo-yo","Zebra"];
  const englishLetters = englishWords.map((word,i) => {
    const letter=String.fromCharCode(65+i);
    return {value:letter,word,emoji:["🍎","⚽","🐱","🐶","🐘","🐟","🍇","🏠","🍦","🧃","🪁","🦁","🐵","🪺","🍊","✏️","👑","🐰","☀️","🐯","☂️","🚐","⌚","🎵","🪀","🦓"][i],speak:letter+" for "+word};
  });
  const arabicNames=["واحد","اتنين","تلاتة","أربعة","خمسة","ستة","سبعة","تمانية","تسعة","عشرة","حداشر","اتناشر","تلتاشر","أربعتاشر","خمستاشر","ستاشر","سبعتاشر","تمنتاشر","تسعتاشر","عشرين"];
  const arabicDigits=["١","٢","٣","٤","٥","٦","٧","٨","٩","١٠","١١","١٢","١٣","١٤","١٥","١٦","١٧","١٨","١٩","٢٠"];
  const englishNames=["one","two","three","four","five","six","seven","eight","nine","ten","eleven","twelve","thirteen","fourteen","fifteen","sixteen","seventeen","eighteen","nineteen","twenty"];
  const arabicNumbers=arabicDigits.map((n,i)=>({value:n,word:arabicNames[i],emoji:"🔢",speak:arabicNames[i]+"، "+n}));
  const englishNumbers=englishNames.map((n,i)=>({value:String(i+1),word:n,emoji:"🔢",speak:n}));
  const categories=[
    {id:"arLetters",title:"الحروف العربية (أ - ي)",subtitle:"٢٨ حرفًا مع النطق والكلمات",items:arabicLetters,lang:"ar-EG"},
    {id:"enLetters",title:"English Alphabet (A - Z)",subtitle:"26 letters with a word for each letter",items:englishLetters,lang:"en-US"},
    {id:"arNumbers",title:"الأرقام العربية (١ - ٢٠)",subtitle:"نتعلم العدّ باللهجة المصرية",items:arabicNumbers,lang:"ar-EG"},
    {id:"enNumbers",title:"English Numbers (1 - 20)",subtitle:"Learn to count in English",items:englishNumbers,lang:"en-US"}
  ];
  const main=document.querySelector("main"),gameList=document.getElementById("gameList");
  if(!main||!gameList)return;
  const panel=document.createElement("section");
  panel.id="basicLearning";panel.className="academy-panel hidden";panel.dir="rtl";
  main.insertBefore(panel,document.querySelector("footer"));
  const speak=(text,lang)=>{if(window.MatthewVoice&&window.MatthewVoice.speak)window.MatthewVoice.speak(text,lang);else if("speechSynthesis"in window){speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang=lang;speechSynthesis.speak(u)}};
  let active=null,index=0;
  categories.forEach((cat,i)=>{
    const card=document.createElement("button");card.type="button";card.className="game-card "+["orange","blue","green","purple"][i];
    card.innerHTML='<span class="game-icon">'+["📖","🔤","🔢","🔢"][i]+'</span><strong>'+cat.title+'</strong><small>'+cat.subtitle+'</small><span class="play">ابدأ التعلم ←</span>';
    card.addEventListener("click",()=>open(cat));gameList.append(card);
  });
  function open(cat){active=cat;index=0;gameList.classList.add("hidden");document.getElementById("quiz")?.classList.add("hidden");document.getElementById("result")?.classList.add("hidden");panel.classList.remove("hidden");render()}
  function render(){
    const item=active.items[index];
    const heading=active.lang==="en-US"?"Learn and listen":"اتعلم واسمع";
    panel.innerHTML='<div class="quiz-top"><button id="basicBack" class="back" type="button">🏠 الرئيسية</button><strong>'+active.title+'</strong><span>'+String(index+1).replace(/[0-9]/g,d=>"٠١٢٣٤٥٦٧٨٩"[+d])+' / '+active.items.length.toLocaleString(active.lang==="en-US"?"en-US":"ar-EG")+'</span></div><div class="progress"><div style="width:'+((index+1)/active.items.length*100)+'%"></div></div><div class="basic-focus"><div class="basic-emoji">'+item.emoji+'</div><div class="basic-value">'+item.value+'</div><h2>'+item.word+'</h2><p>'+heading+'</p><button id="basicListen" class="voice-button" type="button">🔊 '+(active.lang==="en-US"?"Listen":"اسمع")+'</button></div><div class="basic-grid">'+active.items.map((x,i)=>'<button type="button" class="basic-tile '+(i===index?"active":"")+'" data-index="'+i+'"><span>'+x.emoji+'</span><b>'+x.value+'</b><small>'+x.word+'</small></button>').join("")+'</div><div class="basic-nav"><button id="basicPrev" class="secondary" type="button" '+(index===0?"disabled":"")+'>'+(active.lang==="en-US"?"Previous":"السابق")+'</button><button id="basicNext" class="primary" type="button">'+(index===active.items.length-1?(active.lang==="en-US"?"Back to start":"ارجع للبداية"):(active.lang==="en-US"?"Next":"التالي"))+' ←</button></div>';
    panel.querySelector("#basicBack").onclick=close;
    panel.querySelector("#basicListen").onclick=()=>speak(item.speak,active.lang);
    panel.querySelector("#basicPrev").onclick=()=>{index=Math.max(0,index-1);render()};
    panel.querySelector("#basicNext").onclick=()=>{index=index===active.items.length-1?0:index+1;render()};
    panel.querySelectorAll("[data-index]").forEach(b=>b.onclick=()=>{index=Number(b.dataset.index);render()});
  }
  function close(){panel.classList.add("hidden");gameList.classList.remove("hidden");window.speechSynthesis?.cancel()}
})();