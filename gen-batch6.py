import json, os, subprocess, sys, glob
os.makedirs("audio-src/tts-in", exist_ok=True); os.makedirs("audio-src/raw6", exist_ok=True); os.makedirs("audio-src/opus", exist_ok=True)
corpus = json.load(open("audio-src/corpus.json"))
todo = [e for e in corpus if not os.path.exists(f"audio-src/opus/{e['key']}.ogg")]
print(f"to generate: {len(todo)}", flush=True)
ok = bad = 0
for i, e in enumerate(todo, 1):
    key = e["key"]; raw = f"audio-src/raw6/{key}.mp3"; out = f"audio-src/opus/{key}.ogg"
    open(f"audio-src/tts-in/{key}.txt", "w").write(e["text"])
    done = False
    for attempt in range(3):
        try:
            subprocess.run(["node", "gen6.js", key, e["lang"]], check=True, capture_output=True, timeout=320)
            subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", raw, "-c:a", "libopus", "-b:a", "20k", "-ar", "24000", "-ac", "1", out], check=True, capture_output=True, timeout=120)
            d = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out], capture_output=True, text=True).stdout.strip())
            if d > len(e["text"]) / 5 and d > 12:
                print(f"REJECT {key}: {d:.1f}s for {len(e['text'])} chars (attempt {attempt+1})", flush=True); continue
            done = True; break
        except Exception as ex:
            print(f"ERR {key} attempt {attempt+1}: {str(ex)[:100]}", flush=True)
    if done: ok += 1
    else:
        bad += 1
        if os.path.exists(out): os.remove(out)
    if i % 25 == 0: print(f"progress {i}/{len(todo)} ok={ok} bad={bad}", flush=True)
print(f"DONE ok={ok} bad={bad}", flush=True)
