"""Download the raw CC0 recordings the sound is built from, into samples_src/ (git-ignored).

  python tools/fetch_samples.py

Sources (all Creative Commons CC0 1.0, public-domain dedication):
  Big Rusty Drums, Emilyguitar, Growlybass  - Karoryfer Samples, github.com/sfzinstruments
  Swishes Sound Pack, RPG Sound Pack        - artisticdude, opengameart.org
  100 CC0 metal and wood SFX                - rubberduck, opengameart.org
Only short, processed excerpts of these end up in the game (see tools/make_samples.py and src/samples/CREDITS.md).
"""
import json, os, re, subprocess, sys, urllib.request, zipfile

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); dst = os.path.join(root, "samples_src")
UA = {"User-Agent": "Mozilla/5.0 (sample fetch script)"}

def get(url, path):
    if os.path.exists(path) and os.path.getsize(path) > 0: return os.path.getsize(path)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    # curl rather than urllib: it uses the system certificate store, which a conda Python may not have
    subprocess.run(["curl", "-sSLf", "--retry", "3", "-A", UA["User-Agent"], "-o", path, url], check=True)
    return os.path.getsize(path)

def tree(repo, branch):
    cache = os.path.join(dst, "_trees", repo + ".json")
    if not os.path.exists(cache):
        os.makedirs(os.path.dirname(cache), exist_ok=True)
        get("https://api.github.com/repos/sfzinstruments/%s/git/trees/%s?recursive=1" % (repo, branch), cache)
    return [t["path"] for t in json.load(open(cache, encoding="utf-8"))["tree"] if t["type"] == "blob"]

def pick(repo, branch, sub, patterns):
    files = tree(repo, branch); n = 0; size = 0
    for pat in patterns:
        rx = re.compile(pat)
        for p in files:
            if rx.fullmatch(p):
                size += get("https://raw.githubusercontent.com/sfzinstruments/%s/%s/%s" % (repo, branch, urllib.request.quote(p)), os.path.join(dst, sub, p.replace("/", "__"))); n += 1
    print("%-10s %3d files %6.1f MB  (%s)" % (sub, n, size / 1e6, repo)); return n

# ---- drums: the loudest layers, a few round robins each; close mics for drums, overheads for cymbals ----
D = "Samples/"
pick("karoryfer.big-rusty-drums", "main", "drums", [
    D + r"kick_24/kick/kick/k_vl(14|11)_rr[1-4]\.flac",
    D + r"snare_14/rimshot/(top|btm)/sn_rims_vl6_rr[1-4]\.flac",
    D + r"snare_14/center/top/sn_center_vl(10|6)_rr[1-4]\.flac",
    D + r"tom_14/center/cl/t14_vl6_rr[12]\.flac", D + r"tom_15/center/cl/t15_vl7_rr[12]\.flac",
    D + r"tom_18/center/cl/t18_vl8_rr[12]\.flac", D + r"tom_22/center/cl/t22_vl7_rr[12]\.flac",
    D + r"hihat_14/cl/cl/ht_cl_vl(6|4)_rr[1-4]\.flac", D + r"hihat_14/tc/cl/ht_tc_vl8_rr[1-4]\.flac", D + r"hihat_14/open/cl/ht_open_vl6_rr[12]\.flac",
    D + r"crash_17/cr/oh/cr_vl5_rr[12]\.flac", D + r"china_18/cn/oh/cn_vl5_rr[12]\.flac",
    D + r"ride_22/rd/cl/rd_vl10_rr[12]\.flac", D + r"ride_22/bl/cl/rd_bl_vl4_rr[12]\.flac",
])
# ---- guitar, recorded direct: forte notes across the range, dead-note and pick noises ----
pick("karoryfer.emilyguitar", "master", "guitar", [
    r"notes/(db2|e2|gb2|a2|c3|eb3|gb3|a3)_f_rr[1-3]\.wav", r"notes/(c4|eb4|gb4|a4)_f_rr[12]\.wav", r"notes/(c5|eb5|gb5|a5|c6|d6)_f_rr1\.wav",
    r"noises/muted[1-3]_rr[12]\.wav", r"noises/pickrest1_rr1\.wav",
])
# ---- bass: hard sustained and staccato low notes ----
pick("karoryfer.growlybass", "master", "bass", [r"sustain/(db2|e2|gb2|a2|c3|eb3)_ff_rr[12]\.wav", r"staccato/(db2|e2|gb2|a2|c3|eb3)_staccato_rr[1-3]\.wav"])
# ---- effects packs ----
for name in ("swishes.zip", "100-CC0-wood-metal-SFX.zip", "rpg_sound_pack.zip"):
    z = os.path.join(dst, "_zips", name); size = get("https://opengameart.org/sites/default/files/" + name, z); out = os.path.join(dst, "sfx", name[:-4])
    if not os.path.isdir(out):
        with zipfile.ZipFile(z) as f: f.extractall(out)
    print("%-10s %s %.1f MB -> %d files" % ("sfx", name, size / 1e6, sum(len(fs) for _, _, fs in os.walk(out))))
