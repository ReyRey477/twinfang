"""Cut the game's sample set out of the raw recordings in samples_src/ (see tools/fetch_samples.py).

  python tools/make_samples.py        ->  src/samples/*.mp3 + src/samples/index.json

Each excerpt is trimmed to its onset, shortened, faded, levelled and encoded as mono MP3; build.py embeds them in the
built game as base64 (the game is opened from a file, where fetching side files is not allowed). Pitched samples get
their measured fundamental written to index.json so the music can tune them exactly.
Needs numpy, soundfile and ffmpeg.
"""
import json, os, subprocess, sys, tempfile
import numpy as np, soundfile as sf

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); SRC = os.path.join(root, "samples_src"); OUT = os.path.join(root, "src", "samples")
os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT):
    if f.endswith(".mp3"): os.remove(os.path.join(OUT, f))
SR = 44100; index = {}; total = [0.0, 0]

def load(path):
    x, sr = sf.read(path, always_2d=True); m = x.mean(1)
    if sr != SR:  # linear resample is fine for 48k -> 44.1k effects
        n = int(len(m) * SR / sr); m = np.interp(np.arange(n) * sr / SR, np.arange(len(m)), m)
    return m.astype(np.float64)

def cut(m, length, fade=.25, thr=.02, pre=.001):
    pk = np.abs(m).max() or 1; on = int(np.argmax(np.abs(m) > pk * thr)); a = max(0, on - int(pre * SR)); x = m[a:a + int(length * SR)].copy()
    n = max(int(.012 * SR), int(len(x) * fade)); x[-n:] *= np.linspace(1, 0, n) ** 1.5; return x

def f0(m, nominal):
    """fundamental near the nominal frequency, from the steady part of the note (autocorrelation, parabolic peak)"""
    x = m[int(.15 * SR):int(.75 * SR)]; x = x - x.mean(); n = 1 << int(np.ceil(np.log2(len(x) * 2)))
    ac = np.fft.irfft(np.abs(np.fft.rfft(x * np.hanning(len(x)), n)) ** 2)
    lo, hi = int(SR / (nominal * 2 ** (1.3 / 12))), int(SR / (nominal * 2 ** (-1.3 / 12))) + 1; k = lo + int(np.argmax(ac[lo:hi]))
    y0, y1, y2 = ac[k - 1], ac[k], ac[k + 1]; d = .5 * (y0 - y2) / (y0 - 2 * y1 + y2) if (y0 - 2 * y1 + y2) != 0 else 0
    return SR / (k + d)

def save(name, x, kbps=112, meta=None):
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as t: tmp = t.name
    sf.write(tmp, np.clip(x, -1, 1), SR, subtype="PCM_16"); dst = os.path.join(OUT, name + ".mp3")
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", tmp, "-ac", "1", "-c:a", "libmp3lame", "-b:a", "%dk" % kbps, dst], check=True); os.remove(tmp)
    total[0] += len(x) / SR; total[1] += os.path.getsize(dst)
    if meta: index[name] = meta

def group(prefix, items, length, fade=.25, kbps=112, peak=.9):
    """items: list of arrays; levelled together so round robins keep their natural differences"""
    xs = [cut(m, length, fade) for m in items]; k = peak / max(np.abs(x).max() for x in xs)
    for i, x in enumerate(xs): save("%s_%d" % (prefix, i + 1), x * k, kbps)

D = lambda piece, f: load(os.path.join(SRC, "drums", "Samples__" + piece.replace("/", "__") + "__" + f))
# ---------------- drums ----------------
group("kick", [D("kick_24/kick/kick", "k_vl14_rr%d.flac" % r) for r in (1, 2, 3, 4)], .38, .5)
group("kickb", [D("kick_24/kick/kick", "k_vl11_rr%d.flac" % r) for r in (1, 2)], .38, .5, peak=.7)
def snare(r):   # top and bottom microphones; the bottom one is usually wired in opposite polarity, so keep whichever sum has more body
    t, b = D("snare_14/rimshot/top", "sn_rims_vl6_rr%d.flac" % r), D("snare_14/rimshot/btm", "sn_rims_vl6_rr%d.flac" % r); n = min(len(t), len(b)); t, b = t[:n], b[:n]
    lowE = lambda x: (np.abs(np.fft.rfft(x[:8192]))[:60] ** 2).sum()
    return t + .55 * b if lowE(t + .55 * b) >= lowE(t - .55 * b) else t - .55 * b
group("sn", [snare(r) for r in (1, 2, 3, 4)], .5, .4)
group("snc", [D("snare_14/center/top", "sn_center_vl10_rr%d.flac" % r) for r in (1, 2, 3, 4)], .45, .4, peak=.8)
group("sng", [D("snare_14/center/top", "sn_center_vl6_rr%d.flac" % r) for r in (1, 2)], .35, .4, peak=.4)
for nm, piece, f, ln in (("t1", "tom_14/center/cl", "t14_vl6", .8), ("t2", "tom_15/center/cl", "t15_vl7", .9), ("t3", "tom_18/center/cl", "t18_vl8", 1.0), ("t4", "tom_22/center/cl", "t22_vl7", 1.2)):
    group(nm, [D(piece, "%s_rr%d.flac" % (f, r)) for r in (1, 2)], ln, .5)
group("hh", [D("hihat_14/cl/cl", "ht_cl_vl6_rr%d.flac" % r) for r in (1, 2, 3, 4)], .26, .5, 128)
group("hhs", [D("hihat_14/cl/cl", "ht_cl_vl4_rr%d.flac" % r) for r in (1, 2)], .22, .5, 128, peak=.5)
group("hht", [D("hihat_14/tc/cl", "ht_tc_vl8_rr%d.flac" % r) for r in (1, 2, 3, 4)], .16, .5, 128)
group("hho", [D("hihat_14/open/cl", "ht_open_vl6_rr%d.flac" % r) for r in (1, 2)], .9, .6, 128)
group("crash", [D("crash_17/cr/oh", "cr_vl5_rr%d.flac" % r) for r in (1, 2)], 2.6, .7, 128)
group("china", [D("china_18/cn/oh", "cn_vl5_rr%d.flac" % r) for r in (1, 2)], 1.9, .7, 128)
# ---------------- guitar (recorded direct; the amp is modelled in the game) ----------------
MIDI = dict(db2=37, e2=40, gb2=42, a2=45, c3=48, eb3=51, gb3=54, a3=57, c4=60, eb4=63, gb4=66, a4=69, c5=72, eb5=75, gb5=78, a5=81, c6=84, d6=86)
for note, m in MIDI.items():
    rrs = (1, 2, 3) if m <= 45 else (1, 2) if m <= 57 else (1,)
    for r in rrs:
        x = load(os.path.join(SRC, "guitar", "notes__%s_f_rr%d.wav" % (note, r))); nominal = 440 * 2 ** ((m - 69) / 12); y = cut(x, 2.0 if m <= 69 else 1.6, .3)
        save("g%d_%d" % (m, r), y * (.9 / np.abs(y).max()), 80, {"f": round(float(f0(x, nominal)), 2)})
group("gm", [load(os.path.join(SRC, "guitar", "noises__muted%d_rr%d.wav" % (k, r))) for k in (1, 2, 3) for r in (1, 2)], .3, .4, 96)
# ---------------- bass (names are written pitch: they sound an octave lower) ----------------
for note, m in dict(db2=25, e2=28, gb2=30, a2=33, c3=36, eb3=39).items():
    nominal = 440 * 2 ** ((m - 69) / 12)
    x = load(os.path.join(SRC, "bass", "sustain__%s_ff_rr1.wav" % note)); y = cut(x, 1.8, .3); save("bs%d_1" % m, y * (.9 / np.abs(y).max()), 80, {"f": round(float(f0(x, nominal)), 2)})
    for r in (1, 2):
        x = load(os.path.join(SRC, "bass", "staccato__%s_staccato_rr%d.wav" % (note, r))); y = cut(x, .45, .25)
        xs = x[int(.03 * SR):int(.25 * SR)]; xs = xs - xs.mean(); n = 1 << 16; ac = np.fft.irfft(np.abs(np.fft.rfft(xs * np.hanning(len(xs)), n)) ** 2); lo, hi = int(SR / (nominal * 1.08)), int(SR / (nominal / 1.08)) + 1
        save("bt%d_%d" % (m, r), y * (.9 / np.abs(y).max()), 80, {"f": round(SR / (lo + int(np.argmax(ac[lo:hi]))), 2)})
# ---------------- effects ----------------
S = os.path.join(SRC, "sfx"); sw = os.path.join(S, "swishes", "swishes"); mt = os.path.join(S, "100-CC0-wood-metal-SFX"); rp = os.path.join(S, "rpg_sound_pack", "RPG Sound Pack")
group("swl", [load(os.path.join(sw, "swish-%d.wav" % k)) for k in (10, 11, 12, 13)], .14, .3)                 # light, airy
group("swh", [load(os.path.join(sw, "swish-%d.wav" % k)) for k in (3, 4, 6, 7, 8, 9)], .22, .3)              # heavier
group("shing", [load(os.path.join(rp, "battle", "sword-unsheathe%s.wav" % k)) for k in ("", "2", "4", "5")], .28, .7)
group("mhit", [load(os.path.join(mt, "metal_hit_%02d.ogg" % k)) for k in (1, 2, 4, 5)] + [load(os.path.join(mt, "hammer_%02d.ogg" % k)) for k in (2, 3, 4)], .13, .75)   # kept very short: the strike without the ring
group("mbig", [load(os.path.join(mt, f + ".ogg")) for f in ("metal_slam_01", "metal_sheet_01", "metal_sheet_03", "metal_sheet_06", "metal_close_01")], .4, .7)
group("growl", [load(os.path.join(rp, "NPC", "giant", "giant%d.wav" % k)) for k in (2, 5)] + [load(os.path.join(rp, "NPC", "ogre", "ogre3.wav"))], .9, .3)
json.dump(index, open(os.path.join(OUT, "index.json"), "w"), indent=0, sort_keys=True)
n = len([f for f in os.listdir(OUT) if f.endswith(".mp3")])
print("%d samples, %.1f s of audio, %.0f KB of mp3 (%.0f KB as base64)" % (n, total[0], total[1] / 1024, total[1] / 1024 * 4 / 3))
print("tuning:", " ".join("%s=%.1f" % (k, v["f"]) for k, v in sorted(index.items()) if k.endswith("_1")))
