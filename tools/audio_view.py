"""Look at the sound without ears: spectrogram sheets and measurements for the WAVs written by tools/audio_lab.mjs.

  python tools/audio_view.py [dir]        (default dir: tools/shots/audio)

Writes <dir>/sheet_bank_short.png, sheet_bank_long.png (variant 0 of every sound, log frequency 40 Hz - 20 kHz, 70 dB range)
and <dir>/scene_<name>.png (spectrogram + loudness curve), and prints one row per sound:

  dur     length in seconds
  peak    largest sample
  l50     loudest 50 ms of the buffer, RMS in dBFS (compare sounds with this, not with the whole-buffer level)
  cent    spectral centroid in Hz (how bright it is)
  tonal   after the first 40 ms and above 250 Hz, the share of energy sitting in the 4 strongest narrow spectral peaks
          (0 when less than 5 % of the energy is above 250 Hz). Noise scores a few percent, a filtered saw whine 40-80,
          a bell or a chime close to 100. A high figure only says "pitched"; whether it rings is the next column.
  ring    the longest time (ms) one narrow peak above 250 Hz holds its frequency (within 1.5 %) while standing 10 dB clear
          of its surroundings and within 30 dB of the sound's loudest moment. This is the bell signature: a long thin
          horizontal line in the spectrogram. Noise and short clanks stay under ~60 ms; a gliding whine does not count
          because its harmonics keep moving.
Rows are flagged when ring > 60 ms.

For scenes it also prints the energy in five bands (dB relative to the loudest band): sub <60 Hz, low 60-250, lowmid 250-1k,
mid 1k-4k, high >4k.
"""
import glob, os, sys
import numpy as np
from scipy.io import wavfile
from PIL import Image, ImageDraw

root = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "shots", "audio")
FMIN, FMAX, DB = 40.0, 20000.0, 70.0


def load(f):
    sr, d = wavfile.read(f)
    d = d.astype(np.float64) / 32768.0
    return sr, (d if d.ndim == 2 else d[:, None])


def stft(x, win, hop):
    if len(x) < win:
        x = np.concatenate([x, np.zeros(win - len(x))])
    n = 1 + (len(x) - win) // hop
    idx = np.arange(win)[None, :] + hop * np.arange(n)[:, None]
    return np.abs(np.fft.rfft(x[idx] * np.hanning(win)[None, :], axis=1))  # frames x bins


def measure(x, sr):
    dur, peak = len(x) / sr, float(np.max(np.abs(x))) if len(x) else 0.0
    blk = int(sr * .05); xp = np.concatenate([x, np.zeros(blk)]); c = np.cumsum(np.concatenate([[0], xp * xp]))
    l50 = 10 * np.log10(max(1e-12, ((c[blk:] - c[:-blk]) / blk).max()))
    S = stft(x, 2048, 512) ** 2
    fr = np.fft.rfftfreq(2048, 1 / sr)
    cent = float((S.sum(0) * fr).sum() / max(1e-12, S.sum()))
    # tonal share after 40 ms, above 250 Hz only (low thumps are meant to be sines)
    H = S[:, fr > 250]; e = H.sum(1)
    t = (np.arange(len(e)) * 512 + 1024) / sr
    keep = (t > .04 + 1024 / sr) & (e > e.max() * 1e-4)
    ton = 0.0
    if keep.any() and H[keep].sum() > .05 * S[keep].sum():
        num = den = 0.0
        for row in H[keep]:
            r = row.copy(); top = 0.0
            for _ in range(4):
                k = int(np.argmax(r)); lo, hi = max(0, k - 1), min(len(r), k + 2); top += r[lo:hi].sum(); r[lo:hi] = 0
            num += top; den += row.sum()
        ton = 100 * num / max(1e-12, den)
    # longest narrow peak above 250 Hz that holds its frequency
    win, hop = 1024, 256
    M = stft(x, win, hop); f2 = np.fft.rfftfreq(win, 1 / sr)
    db = 20 * np.log10(M + 1e-9); gmax = db.max(); nb = db.shape[1]
    pad = np.pad(db, ((0, 0), (12, 12)), mode="edge")
    med = np.median(np.stack([pad[:, i:i + nb] for i in range(25)], 0), 0)
    pk = (db > np.roll(db, 1, 1)) & (db >= np.roll(db, -1, 1)) & (db > med + 10) & (db > gmax - 30) & (f2[None, :] > 250)
    pk[:, 0] = pk[:, -1] = False
    tracks = {}; best = 0; bestf = 0.0   # bin -> (frames, start frequency)
    for fi in range(db.shape[0]):
        new = {}
        for k in np.nonzero(pk[fi])[0]:
            a, b0, c0 = db[fi, k - 1], db[fi, k], db[fi, k + 1]; den = a - 2 * b0 + c0
            f = (k + (.5 * (a - c0) / den if den != 0 else 0)) * sr / win
            n, f0 = 1, f
            for j in (k, k - 1, k + 1):
                if j in tracks and abs(f - tracks[j][1]) < max(8.0, .015 * tracks[j][1]): n, f0 = tracks[j][0] + 1, tracks[j][1]; break
            new[k] = (n, f0)
            if n > best: best, bestf = n, f0
        tracks = new
    return dict(dur=dur, peak=peak, l50=l50, cent=cent, ton=ton, ring=best * hop / sr * 1000, ringf=bestf)


def cmap(v):  # 0..1 -> rgb, black / violet / orange / pale yellow
    stops = np.array([[0, 0, 4], [40, 11, 84], [120, 28, 109], [188, 55, 84], [237, 105, 37], [251, 180, 26], [252, 255, 164]], float)
    p = np.clip(v, 0, 1) * (len(stops) - 1); i = np.minimum(p.astype(int), len(stops) - 2); f = (p - i)[..., None]
    return (stops[i] * (1 - f) + stops[i + 1] * f).astype(np.uint8)


def spec_img(x, sr, w, h, span, ref=None):
    """log-frequency spectrogram of the first `span` seconds, w x h pixels"""
    win = 1024; hop = max(16, int(span * sr / w / 2))
    M = stft(np.concatenate([x, np.zeros(win)]), win, hop)
    db = 20 * np.log10(M + 1e-9); ref = db.max() if ref is None else ref
    fr = np.fft.rfftfreq(win, 1 / sr); edges = FMIN * (FMAX / FMIN) ** (np.arange(h + 1) / h)
    rows = np.empty((h, db.shape[0]))
    for r in range(h):
        lo, hi = np.searchsorted(fr, edges[r]), np.searchsorted(fr, edges[r + 1])
        rows[r] = db[:, lo:hi].max(1) if hi > lo else np.array([np.interp((edges[r] + edges[r + 1]) / 2, fr, d) for d in db])
    cols = np.clip((np.arange(w) * span / w * sr / hop).astype(int), 0, None)
    img = np.full((h, w), -200.0); ok = cols < rows.shape[1]; img[:, ok] = rows[:, cols[ok]]
    return Image.fromarray(cmap((img[::-1] - (ref - DB)) / DB)), ref


def fy(f, h):  # pixel row of a frequency
    return int(h - 1 - np.log(f / FMIN) / np.log(FMAX / FMIN) * h)


def sheet(items, span, name, tw=300, th=170, cols=6):
    if not items: return
    rows = (len(items) + cols - 1) // cols
    out = Image.new("RGB", (cols * tw, rows * (th + 14)), (0, 0, 0)); d = ImageDraw.Draw(out)
    for i, (label, x, sr, m) in enumerate(items):
        px, py = (i % cols) * tw, (i // cols) * (th + 14)
        im, _ = spec_img(x, sr, tw - 2, th, span); out.paste(im, (px, py + 14))
        for f in (100, 250, 1000, 4000, 10000): d.line([(px, py + 14 + fy(f, th)), (px + 5, py + 14 + fy(f, th))], fill=(120, 120, 120))
        bad = m["ring"] > 60
        d.text((px + 3, py + 1), "%s %.2fs ton%d ring%d" % (label, m["dur"], m["ton"], m["ring"]), fill=(255, 90, 90) if bad else (235, 235, 150))
    f = os.path.join(root, "sheet_%s.png" % name); out.save(f); print("wrote", f, out.size, "(%.1f s per tile, ticks at 100, 250, 1k, 4k, 10k Hz)" % span)


bank = sorted(glob.glob(os.path.join(root, "bank", "*.wav")))
if bank:
    print("%-11s %2s %5s %5s %6s %6s %5s %5s" % ("sound", "n", "dur", "peak", "l50", "cent", "tonal", "ring"))
    by = {}
    for f in bank:
        n, v = os.path.basename(f)[:-4].rsplit("_", 1); by.setdefault(n, []).append(f)
    short, long_, flagged = [], [], []
    for n, fs in by.items():
        ms = []; first = None
        for f in sorted(fs):
            sr, d = load(f); x = d.mean(1); m = measure(x, sr); ms.append(m)
            if first is None: first = (n, x, sr, m)
        w = max(ms, key=lambda m: m["ring"])
        flag = w["ring"] > 60
        if flag: flagged.append(n)
        print("%-11s %2d %5.2f %5.2f %6.1f %6.0f %5.1f %5.0f%s" % (n, len(fs), ms[0]["dur"], max(m["peak"] for m in ms), np.mean([m["l50"] for m in ms]), np.mean([m["cent"] for m in ms]),
                                                               max(m["ton"] for m in ms), w["ring"], "   <-- %d Hz" % w["ringf"] if flag else ""))
        (short if ms[0]["dur"] <= .72 else long_).append(first)
    sheet(short, .72, "bank_short"); sheet(long_, 3.4, "bank_long", tw=450, cols=4)
    print("flagged:", flagged or "none")

for f in sorted(glob.glob(os.path.join(root, "scenes", "*.wav"))):
    sr, d = load(f); x = d.mean(1); name = os.path.basename(f)[:-4]; dur = len(x) / sr
    W, H, G = 1500, 300, 110
    im, _ = spec_img(x, sr, W, H, dur)
    out = Image.new("RGB", (W, H + G + 16), (0, 0, 0)); out.paste(im, (0, 16)); dr = ImageDraw.Draw(out)
    for fq in (100, 250, 1000, 4000, 10000): dr.line([(0, 16 + fy(fq, H)), (8, 16 + fy(fq, H))], fill=(150, 150, 150))
    # loudness curve: RMS over 50 ms blocks, -60..0 dBFS
    blk = int(sr * .05); nblk = len(x) // blk; e = np.sqrt((d[:nblk * blk] ** 2).mean(1).reshape(nblk, blk).mean(1)); dbv = 20 * np.log10(e + 1e-9)
    pts = [(int(i * W / nblk), H + 16 + int(np.clip(-v / 60, 0, 1) * (G - 1))) for i, v in enumerate(dbv)]
    for v in (-12, -24, -36, -48): dr.line([(0, H + 16 + int(-v / 60 * (G - 1))), (W, H + 16 + int(-v / 60 * (G - 1)))], fill=(45, 45, 45))
    dr.line(pts, fill=(120, 230, 140))
    for s in range(0, int(dur) + 1): dr.line([(int(s * W / dur), H + 10), (int(s * W / dur), H + 16)], fill=(200, 200, 200))
    pk = np.abs(d).max(); rms = 20 * np.log10(np.sqrt((d ** 2).mean()) + 1e-9); hot = 100 * (np.abs(d) > .9).mean()
    corr = float(np.corrcoef(d[:, 0], d[:, 1])[0, 1]) if d.shape[1] > 1 and d[:, 0].std() > 0 and d[:, 1].std() > 0 else 1.0
    lo, hi = np.percentile(dbv, 10), np.percentile(dbv, 95)
    P = (stft(x, 4096, 2048) ** 2).sum(0); fq = np.fft.rfftfreq(4096, 1 / sr); bands = [P[(fq >= a) & (fq < b)].sum() for a, b in ((20, 60), (60, 250), (250, 1000), (1000, 4000), (4000, 24000))]
    bands = " ".join("%s %+.0f" % (n, 10 * np.log10(v / max(bands) + 1e-12)) for n, v in zip(("sub", "low", "lowmid", "mid", "high"), bands))
    dr.text((4, 2), "%s  %.0fs  peak %.2f  rms %.1f dB  loud(95%%) %.1f dB  quiet(10%%) %.1f dB  over .9: %.3f%%  L/R corr %.2f   (curve: 50 ms RMS, lines every 12 dB)" % (name, dur, pk, rms, hi, lo, hot, corr), fill=(235, 235, 150))
    o = os.path.join(root, "scene_%s.png" % name); out.save(o)
    print("%-15s %4.0fs peak %.2f rms %6.1f dB  loud %6.1f  quiet %6.1f  over.9 %.3f%%  corr %.2f  | %s" % (name, dur, pk, rms, hi, lo, hot, corr, bands))
