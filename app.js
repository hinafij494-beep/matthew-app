const bank={
numbers:[
{skill:"counting",q:"كم عدد أصابع اليد الواحدة؟",e:"🖐️",a:["٥","٣","٧","١٠"],c:0,explain:"اليد الواحدة فيها خمسة أصابع. عدّها واحداً واحداً."},
{skill:"counting",q:"كم عدد عيون الإنسان؟",e:"👀",a:["١","٢","٣","٤"],c:1,explain:"لدينا عينان."},
{skill:"counting",q:"كم عجلة في الدراجة العادية؟",e:"🚲",a:["٢","٣","٤","٦"],c:0,explain:"الدراجة العادية لها عجلتان."},
{skill:"sequence",q:"ما العدد الذي يأتي بعد ٤؟",e:"🔢",a:["٣","٥","٦","٢"],c:1,explain:"بعد أربعة يأتي خمسة."},
{skill:"sequence",q:"ما العدد الذي يأتي قبل ٧؟",e:"🔢",a:["٦","٨","٥","٩"],c:0,explain:"قبل سبعة يأتي ستة."},
{skill:"addition",q:"معك تفاحتان وأخذت تفاحة أخرى. كم تفاحة معك؟",e:"🍎",a:["٢","٣","٤","١"],c:1,explain:"اثنتان زائد واحدة تساوي ثلاث تفاحات."},
{skill:"addition",q:"ما ناتج ٢ + ٢؟",e:"➕",a:["٣","٤","٥","٦"],c:1,explain:"ابدأ من اثنين وعدّ خطوتين: ثلاثة، أربعة."},
{skill:"comparison",q:"أي عدد أكبر؟",e:"🦁",a:["٢","٨","٥","١"],c:1,explain:"ثمانية أكبر من خمسة واثنين وواحد."},
{skill:"shapes",q:"كم ضلعاً للمثلث؟",e:"🔺",a:["٣","٤","٥","٦"],c:0,explain:"المثلث له ثلاثة أضلاع."},
{skill:"subtraction",q:"كان معك ٤ مكعبات وأعطيت صديقك واحداً. كم بقي؟",e:"🧱",a:["٢","٣","٤","٥"],c:1,explain:"أربعة ناقص واحد يساوي ثلاثة."}
],
math:[
{language:"en",skill:"math-count",q:"How many fingers are on one hand?",e:"🖐️",a:["5","3","7","10"],c:0,explain:"One hand has five fingers. Count them: 1, 2, 3, 4, 5."},
{language:"en",skill:"math-count",q:"How many eyes do you have?",e:"👀",a:["1","2","3","4"],c:1,explain:"You have two eyes."},
{language:"en",skill:"math-add",q:"What is 2 + 1?",e:"🍎",a:["2","3","4","1"],c:1,explain:"Two plus one makes three. Count: 1, 2, 3."},
{language:"en",skill:"math-add",q:"What is 2 + 2?",e:"➕",a:["3","4","5","6"],c:1,explain:"Two plus two equals four."},
{language:"en",skill:"math-number",q:"What number comes after 4?",e:"🔢",a:["3","5","6","2"],c:1,explain:"After four comes five."},
{language:"en",skill:"math-number",q:"What number comes before 7?",e:"🔢",a:["6","8","5","9"],c:0,explain:"Before seven comes six."},
{language:"en",skill:"math-shape",q:"How many sides does a triangle have?",e:"🔺",a:["3","4","5","6"],c:0,explain:"A triangle has three sides."},
{language:"en",skill:"math-compare",q:"Which number is bigger?",e:"🦁",a:["2","8","5","1"],c:1,explain:"Eight is bigger than five, two and one."},
{language:"en",skill:"math-subtract",q:"You have 4 blocks. Give 1 away. How many are left?",e:"🧱",a:["2","3","4","5"],c:1,explain:"Four take away one equals three."},
{language:"en",skill:"math-count",q:"How many wheels does a bicycle have?",e:"🚲",a:["2","3","4","6"],c:0,explain:"A bicycle has two wheels."}
],
letters:[
{skill:"initial-letter",q:"كلمة (أسد) تبدأ بحرف؟",e:"🦁",a:["أ","ب","ت","م"],c:0,explain:"أسد تبدأ بحرف الألف: أَسَد."},
{skill:"initial-letter",q:"أي كلمة تبدأ بحرف م؟",e:"🍌",a:["قمر","موز","تفاح","باب"],c:1,explain:"موز تبدأ بحرف الميم."},
{skill:"initial-letter",q:"ما أول حرف في كلمة باب؟",e:"🚪",a:["س","ب","ر","ن"],c:1,explain:"باب تبدأ بحرف الباء."},
{skill:"sequence-letter",q:"أي حرف يأتي بعد الألف؟",e:"🔤",a:["ت","ج","ب","د"],c:2,explain:"في ترتيب الحروف: أ، ب، ت."},
{skill:"final-letter",q:"أي كلمة تنتهي بتاء مربوطة؟",e:"🌸",a:["مدرسة","قلم","كتاب","باب"],c:0,explain:"مدرسة تنتهي بالتاء المربوطة (ة)."},
{skill:"initial-letter",q:"ما الحرف الأول من كلمة تفاحة؟",e:"🍎",a:["ف","ت","ح","ا"],c:1,explain:"تفاحة تبدأ بحرف التاء."},
{skill:"initial-letter",q:"أي كلمة تبدأ بحرف س؟",e:"🐟",a:["قطة","سمكة","موز","باب"],c:1,explain:"سمكة تبدأ بحرف السين."},
{skill:"word-length",q:"كم حرفاً في كلمة (أم)؟",e:"👩",a:["١","٢","٣","٤"],c:1,explain:"كلمة أم تتكون من حرفين: أ، م."}
],
colors:[
{skill:"colors",q:"ما لون الموز الناضج؟",e:"🍌",a:["أزرق","أصفر","أحمر","أسود"],c:1,explain:"الموز الناضج غالباً لونه أصفر."},
{skill:"shapes",q:"ما شكل الكرة؟",e:"⚽",a:["مربع","مثلث","دائرة","مستطيل"],c:2,explain:"نرى الكرة مستديرة مثل الدائرة."},
{skill:"colors",q:"ما اللون الناتج من خلط الأحمر والأصفر؟",e:"🎨",a:["أخضر","برتقالي","بنفسجي","أزرق"],c:1,explain:"الأحمر مع الأصفر يصنعان اللون البرتقالي."},
{skill:"shapes",q:"كم ضلعاً للمربع؟",e:"🟪",a:["٣","٤","٥","٦"],c:1,explain:"للمربع أربعة أضلاع متساوية."},
{skill:"colors",q:"ما لون العشب غالباً؟",e:"🌱",a:["أخضر","وردي","بنفسجي","رمادي"],c:0,explain:"العشب غالباً أخضر."},
{skill:"shapes",q:"أي شكل له أربعة أضلاع متساوية؟",e:"🟪",a:["دائرة","مربع","مثلث","نجمة"],c:1,explain:"المربع له أربعة أضلاع متساوية."},
{skill:"colors",q:"ما لون السماء في يوم صافٍ؟",e:"☀️",a:["أزرق","بني","أحمر","أسود"],c:0,explain:"تبدو السماء زرقاء في يوم صافٍ."},
{skill:"colors",q:"أي شيء لونه أحمر غالباً؟",e:"🍓",a:["فراولة","ليمونة","خيار","لبن"],c:0,explain:"الفراولة الناضجة غالباً حمراء."}
],
world:[
{skill:"animals",q:"أي حيوان يقول مياو؟",e:"🐾",a:["كلب","قطة","بقرة","حصان"],c:1,explain:"القطة تقول مياو."},
{skill:"habitats",q:"أين تعيش الأسماك؟",e:"🐟",a:["في الماء","على الشجرة","في الصحراء","في السحاب"],c:0,explain:"تعيش الأسماك في الماء."},
{skill:"health",q:"ماذا نشرب عندما نعطش؟",e:"🥤",a:["رمل","ماء","ورق","حجر"],c:1,explain:"نشرب الماء عندما نعطش."},
{skill:"animals",q:"أي حيوان يُلقب بملك الغابة؟",e:"🦁",a:["فيل","أسد","أرنب","سلحفاة"],c:1,explain:"الأسد يُلقب بملك الغابة."},
{skill:"body",q:"بماذا نرى الأشياء؟",e:"👀",a:["الأذن","الأنف","العين","القدم"],c:2,explain:"نستخدم العينين لنرى."},
{skill:"daily-life",q:"ماذا نلبس في القدم؟",e:"👟",a:["قبعة","حذاء","قميص","ساعة"],c:1,explain:"نلبس الحذاء في القدم."},
{skill:"animals",q:"أي طائر لا يستطيع الطيران؟",e:"🐧",a:["نسر","عصفور","بطريق","حمامة"],c:2,explain:"البطريق طائر لا يطير."},
{skill:"animals",q:"ماذا تعطينا النحلة؟",e:"🐝",a:["عسلاً","حليباً","خبزاً","ماء"],c:0,explain:"تصنع النحلة العسل."}
]
};
const names={numbers:"الحساب بالعربي",math:"Math in English",letters:"حروف وكلمات",colors:"الألوان والأشكال",world:"معلومات ممتعة",mixed:"اختبار المفاجآت"};
const $=id=>document.getElementById(id);
let category="mixed",questions=[],index=0,score=0,answered=false,installEvent=null,startedAt=0;
const shuffle=a=>{const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]]}return b};
const isEnglish=()=>category==="math";
const digits=value=>isEnglish()?String(value):String(value).replace(/[0-9]/g,d=>"٠١٢٣٤٥٦٧٨٩"[Number(d)]);
function start(cat){category=cat;const source=cat==="mixed"?[...bank.numbers,...bank.math,...bank.letters,...bank.colors,...bank.world]:bank[cat];questions=shuffle(source).slice(0,8);index=0;score=0;startedAt=Date.now();$("gameList").classList.add("hidden");$("parentPanel").classList.add("hidden");$("result").classList.add("hidden");$("quiz").classList.remove("hidden");$("categoryName").textContent=names[cat];document.documentElement.lang=isEnglish()?"en":"ar";document.documentElement.dir="rtl";showQuestion();window.scrollTo({top:0,behavior:"smooth"})}
function showQuestion(){answered=false;const q=questions[index],englishQuestion=q.language==="en"||isEnglish();$("questionEmoji").textContent=q.e;$("questionText").textContent=q.q;$("questionText").lang=englishQuestion?"en":"ar";$("questionText").dir=englishQuestion?"ltr":"rtl";$("answers").dir=englishQuestion?"ltr":"rtl";$("questionCount").textContent=digits((index+1)+" / "+questions.length);$("progressBar").style.width=(index/questions.length*100)+"%";$("feedback").textContent="";$("nextBtn").classList.add("hidden");const choices=shuffle(q.a.map((text,i)=>({text,correct:i===q.c})));$("answers").replaceChildren();choices.forEach(item=>{const b=document.createElement("button");b.className="answer"+(q.skill==="animals"?" animal-answer":"");b.type="button";b.lang=englishQuestion?"en":"ar";if(q.skill==="animals"){const animalPictures={"أسد":"🦁","فيل":"🐘","أرنب":"🐰","سلحفاة":"🐢","كلب":"🐶","قطة":"🐱","حصان":"🐴","نسر":"🦅","عصفور":"🐦","بطريق":"🐧","حمامة":"🕊️"};const picture=document.createElement("span");picture.className="animal-picture";picture.textContent=animalPictures[item.text]||"🐾";const label=document.createElement("span");label.className="animal-label";label.textContent=item.text;b.append(picture,label)}else b.textContent=item.text;b.addEventListener("click",()=>choose(b,item.correct));$("answers").append(b)})}
function readStats(){try{return JSON.parse(localStorage.getItem("matthewLearningStats")||"{}")}catch(e){return {}}}
function recordAttempt(skill,correct){const data=readStats(),s=data[skill]||{attempts:0,correct:0,streak:0,history:[]};s.attempts++;if(correct){s.correct++;s.streak++}else{s.streak=0}s.history.push({correct,at:Date.now()});s.history=s.history.slice(-30);data[skill]=s;localStorage.setItem("matthewLearningStats",JSON.stringify(data))}
function choose(button,correct){
 if(answered)return;
 answered=true;
 document.querySelectorAll(".answer").forEach(b=>b.disabled=true);
 const q=questions[index],englishQuestion=q.language==="en"||isEnglish();
 recordAttempt(q.skill,correct);
 if(correct){score++;button.classList.add("correct");$("feedback").textContent=englishQuestion?"Great job! You got it right! ⭐":"برافو عليك! إجابة صحيحة ⭐"}
 else{button.classList.add("wrong");$("feedback").textContent=(englishQuestion?"Good try! Let's learn together. ":"محاولة جميلة! نتعلمها معاً. ")+q.explain;document.querySelectorAll(".answer").forEach(b=>{if(b.textContent===q.a[q.c])b.classList.add("correct")})}
 $("nextBtn").textContent=index===questions.length-1?(englishQuestion?"See your result 🏆":"شوف نتيجتك 🏆"):(englishQuestion?"Next question →":"السؤال التالي ←");
 $("nextBtn").classList.remove("hidden");
}
function finish(){$("quiz").classList.add("hidden");$("result").classList.remove("hidden");const stars=Math.max(1,Math.round(score/questions.length*5)),duration=Math.max(0,Math.round((Date.now()-startedAt)/60000));$("resultText").textContent=isEnglish()?"You got "+score+" out of "+questions.length+" right. Learning time: "+duration+" min.":digits("جاوبت صح على "+score+" من "+questions.length+" أسئلة · وقت التعلم "+duration+" دقيقة");$("resultStars").textContent="⭐".repeat(stars)+"☆".repeat(5-stars);const old=Number(localStorage.getItem("matthewBest")||0),total=Number(localStorage.getItem("matthewStars")||0);localStorage.setItem("matthewBest",Math.max(old,score));localStorage.setItem("matthewStars",total+stars);const sessions=JSON.parse(localStorage.getItem("matthewSessions")||"[]");sessions.push({category,score,total:questions.length,minutes:duration,at:Date.now()});localStorage.setItem("matthewSessions",JSON.stringify(sessions.slice(-100)));updateStats();window.scrollTo({top:0,behavior:"smooth"})}
function updateStats(){$("totalStars").textContent=localStorage.getItem("matthewStars")||0;$("bestScore").textContent=localStorage.getItem("matthewBest")||0}
function showParent(){ $("gameList").classList.add("hidden");$("quiz").classList.add("hidden");$("result").classList.add("hidden");$("parentPanel").classList.remove("hidden");const data=readStats(),sessions=JSON.parse(localStorage.getItem("matthewSessions")||"[]");const labels={counting:"العد",sequence:"ترتيب الأعداد",addition:"الجمع",comparison:"المقارنة",shapes:"الأشكال",subtraction:"الطرح","math-count":"Math: Counting","math-add":"Math: Addition","math-number":"Math: Numbers","math-shape":"Math: Shapes","math-compare":"Math: Comparing","math-subtract":"Math: Subtraction","initial-letter":"بداية الكلمة","sequence-letter":"ترتيب الحروف","final-letter":"نهاية الكلمة","word-length":"تكوين الكلمات",colors:"الألوان",animals:"الحيوانات",habitats:"البيئات",health:"الصحة",body:"أعضاء الجسم","daily-life":"الحياة اليومية"};let rows=Object.entries(data).map(([key,s])=>{const pct=Math.round(s.correct/s.attempts*100),mastered=s.attempts>=5&&pct>=80;return '<div class="report-row"><div><b>'+ (labels[key]||key)+'</b><small>'+s.correct+' إجابة صحيحة من '+s.attempts+'</small></div><strong>'+pct+'% '+(mastered?'🏅':'')+'</strong><div class="report-bar"><span style="width:'+pct+'%"></span></div><small>'+(mastered?'متقن مبدئياً':s.attempts<5?'نحتاج محاولات أكثر':'يحتاج مراجعة وشرحاً إضافياً')+'</small></div>'}).join("");const mins=sessions.reduce((n,s)=>n+(s.minutes||0),0);$("parentSummary").innerHTML='<div class="parent-kpis"><div><b>'+sessions.length+'</b><small>جولة مكتملة</small></div><div><b>'+mins+'</b><small>دقيقة تعلم</small></div><div><b>'+Object.values(data).filter(s=>s.attempts>=5&&s.correct/s.attempts>=.8).length+'</b><small>مهارة متقنة مبدئياً</small></div></div><h3>متابعة المهارات</h3>'+(rows||'<p>لسه مفيش بيانات. ابدأوا أول درس وبعدها هتظهر النتائج هنا.</p>')+'<p class="parent-note">الإتقان المبدئي يحتاج ٥ محاولات على الأقل ودقة ٨٠٪. المؤشر إرشادي وليس تشخيصاً تعليمياً.</p><h3>آخر الجولات</h3>'+sessions.slice(-8).reverse().map(s=>'<p class="session-row">'+(names[s.category]||s.category)+' — '+s.score+'/'+s.total+' — '+s.minutes+' دقيقة</p>').join("")}
$("gameList").addEventListener("click",e=>{const card=e.target.closest("[data-category]");if(card)start(card.dataset.category)});
$("nextBtn").addEventListener("click",()=>{if(index<questions.length-1){index++;showQuestion()}else finish()});
$("backBtn").addEventListener("click",()=>{$("quiz").classList.add("hidden");$("gameList").classList.remove("hidden")});
$("homeBtn").addEventListener("click",()=>{$("result").classList.add("hidden");$("gameList").classList.remove("hidden")});
$("againBtn").addEventListener("click",()=>start(category));
$("parentBtn").addEventListener("click",showParent);
$("parentBack").addEventListener("click",()=>{$("parentPanel").classList.add("hidden");$("gameList").classList.remove("hidden")});
updateStats();
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();installEvent=e;$("installBtn").classList.remove("hidden")});
$("installBtn").addEventListener("click",async()=>{if(!installEvent)return;installEvent.prompt();await installEvent.userChoice;installEvent=null;$("installBtn").classList.add("hidden")});
if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
