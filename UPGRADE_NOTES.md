# ملاحظات الترقية — خطوة يدوية واحدة للمطوّر

## لماذا توجد هذه الملاحظة؟

تطبيق GitHub الخاص بـ Muse لا يملك صلاحية `workflows`، لذلك لم يستطع تعديل
`.github/workflows/android-apk.yml` على فرع الترقية (GitHub يرد 403).
بقية الملفات الـ15 رُفعت بنجاح.

## المطلوب (مرة واحدة، من حساب صاحب المستودع)

انسخ ملف `.github/workflows/android-apk.yml` من النسخة المحلية المرفقة
(أو طبّق التعديلات التالية يدويًا على GitHub):

1. في `on.push.paths` أضف:
   - "mastery.js", "parent.js", "tracing.js", "reading.js", "tests/content.test.js"
2. في خطوة `cp ... www/` أضف الملفات الأربعة الجديدة إلى قائمة النسخ:
   `mastery.js parent.js tracing.js reading.js`
3. في خطوة `npx esbuild ...` أضف نفس الملفات الأربعة إلى قائمة التحقق.

بدون هذه الخطوة، نسخة الويب (GitHub Pages) ستعمل كاملة، لكن الـ APK المبني
من `main` لن يضم الوحدات الجديدة.
