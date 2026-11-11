#!/usr/bin/env python3
"""Round 3.2 parallel clip generation (mirrors gen-batch6.py, 3 workers).
Usage: python3 gen-parallel32.py [force-keys-file]
Generates every corpus entry whose opus is missing, plus any key listed in
the force file (text/lang changed -> stale audio must be re-recorded).
Same pace rule as gen-batch6.py: reject if d > len(text)/5 AND d > 12."""
import json, os, subprocess, sys
from concurrent.futures import ThreadPoolExecutor

os.makedirs("audio-src/tts-in", exist_ok=True)
os.makedirs("audio-src/raw6", exist_ok=True)
os.makedirs("audio-src/opus", exist_ok=True)

force = set()
if len(sys.argv) > 1:
    force = {l.strip() for l in open(sys.argv[1]) if l.strip()}
corpus = json.load(open("audio-src/corpus.json"))
todo = [e for e in corpus if e["key"] in force or not os.path.exists(f"audio-src/opus/{e['key']}.ogg")]
print(f"to generate: {len(todo)} (force={len(force)})", flush=True)
for e in todo:
    p = f"audio-src/opus/{e['key']}.ogg"
    if os.path.exists(p):
        os.remove(p)

def gen(e):
    key, lang, text = e["key"], e["lang"], e["text"]
    raw = f"audio-src/raw6/{key}.mp3"
    out = f"audio-src/opus/{key}.ogg"
    open(f"audio-src/tts-in/{key}.txt", "w").write(text)
    for attempt in range(3):
        try:
            subprocess.run(["node", "gen6.js", key, lang], check=True, capture_output=True, timeout=320)
            subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", raw, "-c:a", "libopus", "-b:a", "20k", "-ar", "24000", "-ac", "1", out], check=True, capture_output=True, timeout=120)
            d = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out], capture_output=True, text=True).stdout.strip())
            if d > len(text) / 5 and d > 12:
                print(f"REJECT {key}: {d:.1f}s for {len(text)} chars (attempt {attempt+1})", flush=True)
                continue
            return (key, True)
        except Exception as ex:
            print(f"ERR {key} attempt {attempt+1}: {str(ex)[:120]}", flush=True)
    if os.path.exists(out):
        os.remove(out)
    return (key, False)

ok = bad = 0
with ThreadPoolExecutor(max_workers=3) as ex:
    for i, (key, done) in enumerate(ex.map(gen, todo), 1):
        if done:
            ok += 1
        else:
            bad += 1
        if i % 25 == 0:
            print(f"progress {i}/{len(todo)} ok={ok} bad={bad}", flush=True)
print(f"DONE ok={ok} bad={bad}", flush=True)
