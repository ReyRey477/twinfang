"""Octave-band balance of rendered scenes, against a rough target for a modern metal mix.

  python tools/audio_bands.py [scene ...]      (WAVs from tools/audio_lab.mjs in tools/shots/audio/scenes)

Prints each octave band's level relative to the 125 Hz band, the target, and the crest factor (peak over RMS; a
finished rock mix sits around 10 to 14 dB, a lifeless over-compressed one under 8).
"""
import os, sys, numpy as np
from scipy.io import wavfile
d = os.path.join(os.path.dirname(os.path.abspath(__file__)), "shots", "audio", "scenes")
names = sys.argv[1:] or ["mus_combat0", "mus_combat2", "mus_combat4"]
BANDS = [31.5, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]; TARGET = [-8, -2, 0, -2, -4, -6, -8, -11, -16, -26]
print("%-14s " % "scene" + " ".join("%6s" % (("%g" % b) if b < 1000 else "%gk" % (b / 1000)) for b in BANDS) + "   crest  rms")
print("%-14s " % "target" + " ".join("%+6d" % t for t in TARGET))
for n in names:
    sr, x = wavfile.read(os.path.join(d, n + ".wav")); x = x.astype(np.float64) / 32768; m = x.mean(1) if x.ndim == 2 else x; m = m[int(sr * 1):]
    win = 16384; segs = [m[i:i + win] * np.hanning(win) for i in range(0, len(m) - win, win // 2)]; P = np.mean([np.abs(np.fft.rfft(s)) ** 2 for s in segs], 0); f = np.fft.rfftfreq(win, 1 / sr)
    lv = [10 * np.log10(P[(f >= b / 2 ** .5) & (f < b * 2 ** .5)].sum() + 1e-20) for b in BANDS]; ref = lv[2]
    rms = np.sqrt((m ** 2).mean()); print("%-14s " % n + " ".join("%+6.1f" % (v - ref) for v in lv) + "   %4.1f  %5.1f" % (20 * np.log10(np.abs(m).max() / rms), 20 * np.log10(rms)))
