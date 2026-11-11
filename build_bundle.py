#!/usr/bin/env python3
"""Rebuild interactive-games.js as core + inlined modules.
The Android APK workflow copies interactive-games.js but the GitHub App
cannot edit workflow files, so modules that must ship in the APK are
inlined here in load order. Canonical sources stay as standalone files;
tests/content.test.js asserts byte-identity of each inlined part."""
import re, pathlib
root = pathlib.Path(__file__).parent
BUNDLE = root / "interactive-games.js"
PARTS = ["voice-clips-data-1.js", "voice-clips-data-2.js", "voice-clips-data-3.js", "voice-clips-data-4.js", "voice-clips-data-5.js", "voice-clips-data-6.js", "voice-clips-data-7.js", "voice-clips-data-8.js", "voice-clips-data-9.js", "voice-clips-data-10.js", "voice-clips-data-11.js", "voice-clips-data-12.js", "voice-clips-data-13.js", "voice-clips-data-14.js", "voice-clips-data-15.js", "voice-clips-data-16.js", "voice-clips-text-1.js", "voice-clips.js", "mastery.js", "parent.js", "tracing.js", "reading.js", "rescue.js"]
MARK = "// ==== bundled module: {name} ====\n"
def core_of(text):
    for name in PARTS:
        pat = re.compile(r"\n?" + re.escape(MARK.format(name=name)) + r".*?(?=\n// ==== bundled module: |\n// ==== interactive games core)" , re.S)
        text = pat.sub("", text)
    marker = "\n// ==== interactive games core ====\n"
    if marker in text: text = text.split(marker, 1)[1]
    return text.strip() + "\n"
core = core_of(BUNDLE.read_text())
out = []
for name in PARTS:
    out.append(MARK.format(name=name) + (root / name).read_text().strip() + "\n")
out.append("// ==== interactive games core ====\n" + core)
BUNDLE.write_text("\n".join(out))
print("bundle rebuilt:", BUNDLE.stat().st_size, "bytes")
