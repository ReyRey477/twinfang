# Test tools

Headless checks for TWINFANG. They load the built `twinfang.html` in Chrome, drive it through the developer harness (`src/15-harness.js`) and write screenshots to `tools/shots/`.

Setup once, from the repository root:

```bash
npm i --no-save playwright-core three@0.160.0     # uses an installed Edge or Chrome
```

(or `npm i -D playwright three@0.160.0` and `npx playwright install chromium` for a bundled browser)

Then build (`python build.py`) and run any of:

```bash
node tools/run.mjs tools/s_bot.mjs                       # random-input bot plays every encounter; must end with RUN COMPLETE and errors: 0
node tools/run.mjs tools/s_audio.mjs                     # synthesises the whole sound bank and checks every buffer
node tools/run.mjs tools/s_nan.mjs                       # looks around every area for invalid (NaN / infinite) pixels; must end with NAN CHECK PASSED
node tools/run.mjs tools/s_scenes.mjs --only cor,roof    # in-game views at fixed places (cor, hall, warden, stair, roomA, upper, roof, storm ...)
node tools/run.mjs tools/s_show.mjs --kinds "hero:30:d=2.5;h=1,warden:25:d=6.5;h=2.4"   # showcase captures: kind:angle:options
```

More checks:

```bash
node tools/run.mjs tools/s_poses.mjs --w 420 --h 420      # the hero stepped to chosen clip times with each weapon set (--poses "clip:time:set:angle[:dist[:height]],...")
python tools/sheet.py pose 6                              # tile any group of shots (pose_*, show_*, scene_*) into one contact sheet
node tools/run.mjs tools/s_grip.mjs                       # steps every hero clip and reports hands or blades that snap round in one step
node tools/run.mjs tools/s_states.mjs --w 560 --h 520     # the Lantern and the Stormvane forced into each of their states (then: python tools/sheet.py state 4)
node tools/run.mjs tools/s_ctx.mjs                        # those two in their real rooms, with the invalid-pixel count taken while they are in view
node tools/run.mjs tools/s_perf.mjs --w 1920 --h 1080     # milliseconds per frame, draw calls and triangles at seven places, and which GPU rendered them
node tools/audio_lab.mjs                                  # runs the sound engine alone and writes every sound, the music and the ambience to WAV files
python tools/audio_view.py                                # spectrogram sheets and a table (length, peak, loudness, tonalness, ring time) for those WAVs
```

The pictures a reviewer should judge, and the sample set:

```bash
python tools/review.py r1                                 # builds, then photographs the interface, about 40 combat moments and every character into tools/shots/review/r1 with a manifest of captions
python tools/audio_bands.py mus_combat2 mix_fight         # octave-band balance of the lab's rendered scenes against a rough target for a metal mix
python tools/fetch_samples.py                             # downloads the raw CC0 recordings into samples_src/ (git-ignored, about 70 MB)
python tools/make_samples.py                              # cuts, levels, tunes and encodes them into src/samples/ (needs ffmpeg and the soundfile module)
```

`audio_view.py` needs numpy, scipy and Pillow. Its `ring` column is the longest time a narrow spectral peak above 250 Hz holds its pitch: the signature of a bell. Keep it under about 60 ms.

Every run prints the page's console errors at the end. A scenario is a small module, so adding a check means adding a file.

The scripts run on Linux with software rendering (`SOFTWARE=1`) and on Windows with the real GPU (tested with Edge through Direct3D).
