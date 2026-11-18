# Test tools

Headless checks for TWINFANG. They load the built `twinfang.html` in Chrome, drive it through the developer harness (`src/15-harness.js`) and write screenshots to `tools/shots/`.

Setup once, from the repository root:

```bash
npm i -D playwright three@0.160.0
npx playwright install chromium
```

Then build (`python build.py`) and run any of:

```bash
node tools/run.mjs tools/s_bot.mjs                       # random-input bot plays every encounter; must end with RUN COMPLETE and errors: 0
node tools/run.mjs tools/s_audio.mjs                     # synthesises the whole sound bank and checks every buffer
node tools/run.mjs tools/s_nan.mjs                       # looks around every area for invalid (NaN / infinite) pixels; must end with NAN CHECK PASSED
node tools/run.mjs tools/s_scenes.mjs --only cor,roof    # in-game views at fixed places (cor, hall, warden, stair, roomA, upper, roof, storm ...)
node tools/run.mjs tools/s_show.mjs --kinds "hero:30:d=2.5;h=1,warden:25:d=6.5;h=2.4"   # showcase captures: kind:angle:options
```

Every run prints the page's console errors at the end. A scenario is a small module, so adding a check means adding a file.

These scripts were written and run on Linux with software rendering (`SOFTWARE=1`). They have not been run on Windows; the Playwright calls are platform-neutral, but treat the first run there as a test of the tools themselves.
