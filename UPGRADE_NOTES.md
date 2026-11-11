# ملاحظات الترقية — خطوة يدوية واحدة للمطوّر

## لماذا توجد هذه الملاحظة؟

تطبيق GitHub الخاص بـ Muse لا يملك صلاحية `workflows`، لذلك لم يستطع تعديل
`.github/workflows/android-apk.yml` على فرع الترقية (GitHub يرد 403).
بقية الملفات الـ15 رُفعت بنجاح.

## تحديث: لم يعد شرطًا لاكتمال الـ APK
تم تضمين الوحدات الجديدة داخل `interactive-games.js` الذي ينسخه سير العمل الحالي أصلًا، فأصبح الـ APK مكتملًا دون تعديل سير العمل. التعديل التالي أصبح **مُستحسنًا فقط** (لإطلاق البناء عند تغيّر ملفات المصادر وحدها)، ولم يعد إلزاميًا.

## المطلوب (مرة واحدة، من حساب صاحب المستودع) — اختياري الآن

انسخ ملف `.github/workflows/android-apk.yml` من النسخة المحلية المرفقة
(أو طبّق التعديلات التالية يدويًا على GitHub):

1. في `on.push.paths` أضف:
   - "mastery.js", "parent.js", "tracing.js", "reading.js", "tests/content.test.js"
2. في خطوة `cp ... www/` أضف الملفات الأربعة الجديدة إلى قائمة النسخ:
   `mastery.js parent.js tracing.js reading.js`
3. في خطوة `npx esbuild ...` أضف نفس الملفات الأربعة إلى قائمة التحقق.

بدون هذه الخطوة، نسخة الويب (GitHub Pages) ستعمل كاملة، لكن الـ APK المبني
من `main` لن يضم الوحدات الجديدة.

## Round 2 — teacher voice, rescue adventure, simpler science, richer lessons (2026-11-11)

Owner feedback implemented:
- **Voice**: 44 pre-recorded natural female teacher clips (Egyptian dialect) in
  `voice-clips.js` (Opus, ~0.5 MB, generated from `audio-src/clips.json`).
  `MatthewVoice.speak` plays a clip when the sentence matches, and
  `feedback("correct"/"wrong")` speaks rotating praise/try-again clips.
  Remaining dynamic speech keeps device TTS with softer settings
  (Arabic rate 0.95, pitch 1.15; browser prefers a female voice).
- **Rescue adventure**: `rescue.js` turns the old surprise quiz into a story —
  King Matthew rides to rescue Mark (1) and Maryam (2) through 4 forest stages
  (3 questions each from the same bank), with a progress map and clip voice lines.
- **Science simplified for KG1**: magnetism, dissolving, float/sink, vibration
  and states of matter removed from lessons and the quiz bank; physics became
  "Play & Discover" (balloon, shadow, ball, water, rain, wind) and chemistry
  became "Colors & Play". Universe explanations rewritten observational.
- **More, richer lessons**: science grew 31 → 43 lessons, every explanation is
  now several simple Egyptian sentences. Arabic letter school explains each
  letter from zero (`explainFor` + mouth `HINTS`, "الميس بتشرح" box).
- **Home decluttered**: hero stats trimmed to 4 chips, custom SVG king-on-horse
  artwork, rescue card first, airier cards.
- Bundle: `interactive-games.js` now also inlines `voice-clips.js` and
  `rescue.js` (regenerate with `python3 build_bundle.py`). SW cache: v17.
