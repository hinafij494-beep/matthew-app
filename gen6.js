const fs = require("fs"), { execFileSync } = require("child_process");
const key = process.argv[2], lang = process.argv[3] || "ar_EG";
const text = fs.readFileSync("audio-src/tts-in/" + key + ".txt", "utf8");
let input = text;
if (lang === "ar_EG") {
  // Strip diacritics AND tatweel (ـ U+0640): the tatweel is a visual stretch
  // character, not a sound — the TTS backend drawls it into a ~39s clip
  // (let_forms_* form glyphs like "ـبـ" rendered 39s for 113 chars).
  input = text.replace(/[ً-ٰٟـ]/g, "");
  input = input.replace(/([ء-ي])\1{2,}/g, (m, c) => Array(4).fill(c).join(" "));
}
// A bare single letter ("مُ", "آ") can return empty audio: drill it twice
// for the synthesis input only — the corpus text stays a single syllable.
const bareLetter = input.replace(/[ً-ٰٟـ]/g, "").trim();
if (/^[ء-ي]$/.test(bareLetter)) { const t = input.trim(); input = t + "، " + t; }
// Very short Fusha syllables ("با", "تا") often come back empty from the
// backend: a trailing full stop gives the synthesiser a sentence boundary
// and makes them render reliably. Corpus text is unchanged.
if (lang === "ar_SA" && bareLetter.length <= 2 && !/[.!؟]$/.test(input.trim())) input = input.trim() + ".";
// Two bare glyphs never render as-is, however often retried (12 failures
// each across two runs): the backend drops a lone "و" (the conjunction)
// and a lone "Z". Speak the letter name instead — the corpus text and the
// clip key stay the bare glyph, so lookups are unchanged.
// Round 3.2.1 (Arabic phonetics expert): the ت+ط cluster (بتطير /
// بتطلع / هتطفو) is mis-segmented by the TTS G2P as an extra ت — a straight
// re-record reproduces it, so these keys get LEXICAL overrides (participle
// طايرة/طالعة, ي-prefix, or a safe synonym) applied to the synthesis input
// only; the corpus text is unchanged. The 7 pace drills (rd_syl_*/tr_ar_*
// ans_67) replace a lone drawled syllable/letter with a short name drill
// (same proven pattern as rd_syl_1_3 "با بو بي"). ar_EG overrides are
// diacritic-stripped, matching what gen6.js feeds the backend; ar_SA
// drills keep their harakat. story_trip_* overrides were NOT added —
// those keys are gone (old stories replaced by the draft); no بتطير
// remains in the new stories. No ض override: Whisper cannot hear
// isolated ض even in a fresh reference, so ض is a human-ear check.
const INPUT_OVERRIDES = {
  ans_113: "واو، واو.",
  ans_198: "الخبز",
  ans_248: "هتطفو فوق المية", // Round 3.2.2: was "هتفضل فوق المية" — the override itself fed the wrong word (audit §2); corpus text is هتطفو
  ans_51: "اتناشر", // Round 3.2.2: bare «١٢» reads ambiguously (Whisper "اتنا عشرة") — force the Egyptian word, same precedent as ans_34 «حداشر»
  ans_253: "هتفضل فوق",
  ans_254: "طايرة",
  ans_326: "الخبز",
  ans_67: "ميم، ميم.",
  cg_nat_all_4: "السحابة بيضا وطايرة في السما! السحاب الأبيض بيجيب المطر! برافو يا ملك ماثيو! لونت كل حاجات الطبيعة صح! خدت ألماسة جديدة لتاجك!",
  cg_nat_ok_4: "السحابة بيضا وطايرة في السما! السحاب الأبيض بيجيب المطر! برافو يا بطل!",
  qb_world_9: "أي وسيلة مواصلات طايرة في السما؟",
  rd_intro_9: "الراء. رَ. ريشة",
  rd_syl_0_1: "إِ أَ أُ.",
  rd_syl_18_0: "غَ غِ غُ.",
  rd_syl_1_3: "با بو بي",
  rd_syl_3_5: "ثو ثا ثي.",
  rd_syl_9_0: "رَ رِ رُ.",
  rd_part_9_0: "تا تو تي.", // Round 3.2.2: bare 2-char syllable returns empty audio even drilled twice ("تا، تا.") — three-vowel drill renders (proven rd_syl pattern)
  sciSun: "الشمس طالعة الصبح وتنور الدنيا وتدفينا.",
  sci_0_1: "الطيور. الطيور لها ريش ومنقار، وكثير منها يطير. الطيور جسمها متغطي بالريش الخفيف، وعندها منقار بدل السنان، وجناحين بيطيروا بيهم. العصفورة والحمامة بيطيروا، بس البطريق والنعامة ما بيطيروش. الطيور بتبيض وبتقعد على البيض لحد ما يفقس ويطلع الكتكوت.",
  sci_0_6: "الحشرات الصغيرة. الفراشة عندها أجنحة ملونة وطايرة من وردة لوردة. الحشرات صغيرة بس مهمة: الفراشة شكلها جميل وطايرة بين الورد، والنحلة بتعمل عسل حلو وبتساعد النباتات تكبر، والنملة نشيطة وبتشيل أكل أكبر منها. بنتفرج على الحشرات وما نمسكهاش بإيدينا.",
  sci_1_0: "أجزاء النبات. للنبات جذر وساق وأوراق خضرا، وساعات بيطلع ورد جميل. النبات زيه زينا عايش وبيكبر. الجذر تحت الأرض وبيشرب المية، والساق واقفة وشايلة الورق، والورق الأخضر هو اللي بيكبر النبتة. وساعات النبتة طالعة ورد ملون شكله حلو وريحته جميلة.",
  sci_1_1: "ماذا يحتاج النبات؟. النبات يحتاج إلى الماء والضوء والهواء. عشان النبتة تكبر وتفضل خضرا وحلوة، لازم نسقيها مية ونحطها في مكان فيه شمس وهوا. لو عطشت هتدبل وتنشف، ولو اهتمينا بيها هتكبر وتعمل ورد وثمار. جرب تزرع نبتة صغيرة واهتم بيها كل يوم.",
  sci_3_5: "يطفو ولا يغوص؟. في حاجات بتقعد فوق المية وحاجات بتنزل تحت. دي لعبة مية ممتعة بنلعبها في الحمام أو في حوض صغير مع شخص كبير: بنحط حاجات مختلفة في المية ونشوف بعنينا مين هيعوم فوق ومين هينزل تحت. الكرة الخفيفة والبالونة والفلين وورقة الشجر بيقعدوا فوق المية، وده بنسميه بيطفو. والحجرة الصغيرة والعملة المعدنية والمفتاح بيغوصوا وينزلوا لتحت خالص، وده بنسميه بيغوص. قبل ما تحط كل حاجة خمن معايا: يا ترى دي هتفضل فوق ولا هتغوص؟ وبعدين جرب وشوف أنت صح ولا لأ.",
  sci_3_7: "الهواء والريح. الهوا حوالينا في كل مكان وبنتنفسه عشان نعيش. الهوا موجود حوالينا في كل حتة مع إننا ما بنشوفهوش، وبنتنفسه كل لحظة عشان نعيش. لما الهوا بيتحرك بنسميه رياح: بتهز ورق الشجر وبتعلي الطيارة الورق في السما. جرب تنفخ في إيدك أو عالبالونة وهتحس بالهوا بنفسك.",
  sci_4_0: "خلط الألوان. الأصفر مع الأزرق يعطينا الأخضر في ألوان الرسم. ألوان الرسم لما بنخلطها ببعض بتعمل ألوان جديدة جميلة: الأصفر مع الأزرق يدينا أخضر زي لون الورق، والأحمر مع الأصفر يدينا برتقالي، والأحمر مع الأبيض يدينا وردي. جرب تخلط الألوان المية بالفرشة بنفسك وشوف السحر!",
  sci_4_2: "فقاعات الصابون. بننفخ هوا في مية وصابون فبتعمل فقاعات شفافة طايرة في الهوا. جرب اللعبة الجميلة دي مع ماما: حط شوية صابون سايل في كباية مية وقلبهم، وبعدين انفخ بالشاليموه أو بالحلقة فهتعمل فقاعات شفافة وملونة طايرة في الهوا. الفقاعة دي كرة صغيرة من الصابون جواها هوا، وبتعكس ألوان جميلة وهي طايرة. جرب تنفخ براحة عشان الفقاعة تكبر، وشوف هتفضل طايرة لحد فين قبل ما تفرقع!",
  sci_5_1: "الشمس. الشمس طالعة الصبح وتنور الدنيا وتدفينا. الشمس كرة كبيرة وملتهبة وبعيدة أوي في السما، طالعة كل صبح من الشرق فتنور الدنيا ونتدفى، وآخر النهار الأرض بتلف فالشمس بتبقى ورا الأفق والدنيا بتبدأ تضلم. نور الشمس وحرارتها بيخلوا النبات يكبر وبيدفوا جسمنا. ما نبصش للشمس بعينينا على طول أبدا. والشمس في الحقيقة نجم كبير وبعيد أوي، هي اللي بتنور كل الكواكب اللي حواليها.",
  sci_5_4: "الليل والنهار. الأرض بتلف فبييجي النهار والليل. الأرض بتلف حوالين نفسها زي النحلة وهي بتدور! والجزء اللي بيبقى ناحية الشمس بيبقى نهار: الدنيا بتنور وبنصحى ونفطر ونلعب ونتعلم. والجزء اللي بيبعد عن الشمس بيبقى ليل: الدنيا بتضلم وبيظهر القمر والنجوم، وبنتعشى وننام ونرتاح. الشمس ما بتختفيش، الأرض هي اللي بتلف. النهار للعب والتعلم، والليل للنوم والراحة.",
  tr_ar_12: "شين، شين.",
  tr_ar_15: "طاء، طاء.", // Round 3.2.5 FAIL 3: bare «ط» renders 0.13 s «طَ» — drill like tr_ar_16
  tr_ar_16: "ظاء، ظاء.",
  tr_ar_26: "واو، واو.",
  tr_en_25: "Z.",
  // Round 3.2.2: bare digits render as ENGLISH ("five") — speak the Arabic
  // word instead; corpus text stays the digit glyph, so lookups are unchanged.
  tr_num_1: "واحد",
  tr_num_2: "اتنين",
  tr_num_3: "تلاتة",
  tr_num_4: "أربعة",
  tr_num_5: "خمسة.", // Round 3.2.2 §8: bare "خمسة" deterministically returns the DEFECTIVE recording ("5 cigar", en 0.98 — TTS cached/deterministic for that input; regenerating it changed nothing). The trailing period yields a clean «خمسة» (AR pass, verified 2026-11-12). Do NOT drop the period — basic_arnum_4 derives from this same recording.
  tr_num_6: "ستة",
  tr_num_7: "سبعة",
  tr_num_8: "تمانية",
  tr_num_9: "تسعة",
  tr_num_10: "عشرة",
  num_digit_0: "صفر",
  num_digit_15: "خمستاشر",
  num_digit_18: "تمنتاشر",
  num_digit_19: "تسعتاشر",
  num_digit_20: "عشرين",
  // Audit-confirmed re-records: bare letter / digit glyphs need the spoken name.
  ans_87: "ألف",
  ans_34: "حداشر",
  // Round 3.2.2 (user-approved 2026-11-12 12:02 EET): bare «١٣/١٤/١٦/١٧»
  // read as English digits ("1 3 3" / "1 4" / "116" / "17") — force the
  // Egyptian words, same precedent as ans_34 «حداشر» / ans_51 «اتناشر».
  ans_59: "تلتاشر",
  ans_56: "أربعتاشر",
  ans_57: "ستاشر",
  ans_58: "سبعتاشر",
  // ans_260: Egyptian "مَيَّا" (water) — the shadda forces the Egyptian
  // reading; verify the result does not sound like "مئة" (100).
  ans_260: "ميّا",
  // Round 3.2.4 blocker 4: bare corpus text renders «العسكرية» (feminine)
  // deterministically — plain re-record is PCM-identical to the defective
  // clip. The comma pauses after each «العسكري» force the masculine
  // reading (verified ar + en: العسكري ×2, العسكرية 0×). Corpus text
  // unchanged; this override is TTS input only.
  chess_pawn_question: "حرك العسكري، لقدام يا بطل! دوس على العسكري، وبعدين دوس على المربع اللي قدامه!",
  // Round 3.2.3 let_full_9: the backend drawls bare «ر» (88 s for 269
  // chars, deterministic). The shipped clip (35.6 s, 7.57 ch/s) was
  // rendered from the harakat-kept input below; gen6.js strips diacritics
  // for ar_EG, so without this override a re-run re-introduces the drawl.
  let_full_9: "ده حرف الراء، وصوته رَ. لساننا بيهتز وبيتكرر بسرعة: رررر، زي صوت العربية وهي ماشية. شكله بيتغير حسب مكانه في الكلمة: في أول الكلمة بيبقى ر، وفي نص الكلمة ـر، وفي آخر الكلمة ـر. بنشوفه في كلمات بنعرفها زي رِيشَة وقِرْد وقَمَر. يلا نقول صوته مع بعض بصوت عالي: رَ، رَ، رَ!"
};
if (INPUT_OVERRIDES[key]) input = INPUT_OVERRIDES[key];
input = input.replace(/\s+/g, " ").trim();
execFileSync("/opt/hatch/bin/tts", ["speak", "--output", "audio-src/raw6/" + key + ".mp3", "--voice", "avocado_v2:MAI_01", "--language", lang, "--text-stdin"], { input, stdio: ["pipe", "inherit", "inherit"], timeout: 180000 });
