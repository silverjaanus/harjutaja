import base64, json, os, sys
root = sys.argv[1]  # kaust, kus on test.json ja <hääl>/<id>.mp3
d = json.load(open(os.path.join(root, "test.json"), encoding="utf-8"))
audio = {}
for v in d["voices"]:
    audio[v] = {}
    vdir = os.path.join(root, v)
    for fn in sorted(os.listdir(vdir)):
        if fn.endswith(".mp3"):
            audio[v][fn[:-4]] = "data:audio/mpeg;base64," + base64.b64encode(open(os.path.join(vdir, fn), "rb").read()).decode()
t = open(os.path.join(os.path.dirname(__file__), "template.html"), encoding="utf-8").read()
t = t.replace("/*DATA*/null", json.dumps({"voices": d["voices"], "items": d["items"], "names": d.get("names", {}), "note": d.get("note")}, ensure_ascii=False))
t = t.replace("/*AUDIO*/null", json.dumps(audio))
open(sys.argv[2], "w", encoding="utf-8").write(t)
print("clips", {v: len(a) for v, a in audio.items()}, "bytes", len(t))
