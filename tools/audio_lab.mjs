// Audio lab: runs the sound engine on its own (no game, no WebGL) and writes what it produces to WAV files, so the
// sound can be inspected without ears.   node tools/audio_lab.mjs [--src src/02-audio.js] [--out tools/shots/audio] [--only bank|scenes]
//   bank    every synthesised buffer            -> <out>/bank/<name>_<variant>.wav   (+ init / synthesis timings)
//   scenes  the real graph rendered offline     -> <out>/scenes/<scene>.wav          (music states, ambience, a scripted fight)
// Then:  python tools/audio_view.py   turns the WAVs into spectrogram sheets and a table of measurements.
// Needs playwright-core and an installed Edge or Chrome, exactly like tools/run.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const here = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(here, '..');
let chromium;
try { ({ chromium } = await import('playwright')); } catch { try { ({ chromium } = await import('playwright-core')); } catch { ({ chromium } = createRequire(process.env.PW_MODULES || '/opt/npm-tools/node_modules/')('playwright-core')); } }
const BROWSERS = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
const EXE = process.env.CHROME_PATH || (() => { try { const p = chromium.executablePath(); if (p && fs.existsSync(p)) return undefined; } catch {} return BROWSERS.find(p => fs.existsSync(p)); })();
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const SRC = path.resolve(ROOT, opt('src', 'src/02-audio.js')), OUT = path.resolve(ROOT, opt('out', 'tools/shots/audio')), ONLY = opt('only', '');
for (const d of ['bank', 'scenes']) { fs.rmSync(path.join(OUT, d), { recursive: true, force: true }); fs.mkdirSync(path.join(OUT, d), { recursive: true }); }

// the engine only needs the math helpers from 01-util.js (everything from the Math destructuring up to turnTo)
const util = fs.readFileSync(path.join(ROOT, 'src/01-util.js'), 'utf8').split(/\r?\n/);
const a = util.findIndex(l => l.startsWith('const {sin,cos')), b = util.findIndex(l => l.startsWith('const turnTo'));
const code = util.slice(a, b + 1).join('\n') + '\n' + fs.readFileSync(SRC, 'utf8');

const wav = (file, chans, sr) => {   // chans: Int16Array per channel
  const n = chans[0].length, nc = chans.length, buf = Buffer.alloc(44 + n * nc * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * nc * 2, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(nc, 22);
  buf.writeUInt32LE(sr, 24); buf.writeUInt32LE(sr * nc * 2, 28); buf.writeUInt16LE(nc * 2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * nc * 2, 40);
  for (let i = 0; i < n; i++) for (let c = 0; c < nc; c++) buf.writeInt16LE(chans[c][i], 44 + (i * nc + c) * 2);
  fs.writeFileSync(file, buf);
};
const unpack = s => { const raw = Buffer.from(s, 'base64'); return new Int16Array(raw.buffer, raw.byteOffset, raw.length / 2); };

const browser = await chromium.launch({ executablePath: EXE, headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] });
const page = await browser.newPage();
const errors = [];
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text().slice(0, 500)}`); });
page.on('pageerror', e => errors.push('[pageerror] ' + String(e.stack || e).slice(0, 900)));
await page.setContent('<!doctype html><html><body></body></html>');
await page.addScriptTag({ content: code + '\n;window.Sfx=Sfx;window.sfx=sfx;window.__errors=[];addEventListener("error",e=>__errors.push(String(e.message)));' });
await page.evaluate(() => {
  window.pack = f32 => { const i16 = new Int16Array(f32.length); for (let i = 0; i < f32.length; i++) i16[i] = Math.max(-32768, Math.min(32767, Math.round(f32[i] * 32767))); const u8 = new Uint8Array(i16.buffer); let s = ''; for (let i = 0; i < u8.length; i += 32768) s += String.fromCharCode.apply(null, u8.subarray(i, i + 32768)); return btoa(s); };
});
let code_ = 0;
try {
  if (ONLY !== 'scenes') {
    // ---- the bank, synthesised the way the game does it (sliced, real-time context) ----
    const initMs = await page.evaluate(() => { const t = performance.now(); sfx.init(); return performance.now() - t; });
    await page.waitForFunction(() => sfx.ready_ === true, null, { timeout: 120000 });
    const info = await page.evaluate(() => ({ sr: sfx.c.sampleRate, synth: Math.round(sfx.synthMs), maxSlice: +(sfx.maxSlice || 0).toFixed(1), names: Object.fromEntries(Object.entries(sfx.bank).map(([k, v]) => [k, v.length])) }));
    console.log(`init ${initMs.toFixed(1)} ms   synthesis ${info.synth} ms in slices (longest ${info.maxSlice} ms)   sample rate ${info.sr}   ${Object.values(info.names).reduce((p, q) => p + q, 0)} buffers in ${Object.keys(info.names).length} sounds`);
    for (const [name, n] of Object.entries(info.names)) for (let v = 0; v < n; v++) {
      const chs = await page.evaluate(([name, v]) => { const b = sfx.bank[name][v]; return [...Array(b.numberOfChannels)].map((_, c) => pack(b.getChannelData(c))); }, [name, v]);
      wav(path.join(OUT, 'bank', `${name}_${v}.wav`), chs.map(unpack), info.sr);
    }
    // every event once, to catch runtime errors in the play paths
    const state = await page.evaluate(() => { for (const m of ['whoosh', 'hurt', 'death', 'dodge', 'jump', 'step', 'glint', 'barrier', 'boom', 'gun', 'orb', 'deflect', 'roar', 'armorBreak', 'ready', 'swap', 'pickup', 'spawn', 'charge', 'coreCharge']) sfx[m]();
      sfx.whoosh(.4, 1.5); sfx.hit(.3); sfx.hit(.9); sfx.telegraph(true); sfx.land(.8); sfx.rankUp(2); sfx.thunder(1); sfx.slow(true); sfx.slow(false); sfx.noise({ f0: 200, f1: 1300, dur: .3 }); sfx.tone({ f0: 100, f1: 200, dur: .2 });
      for (let k = 0; k < 5; k++) { sfx.tick(true, k, .016); for (let i = 0; i < 128; i++) sfx.sched(i, sfx.c.currentTime + .1 + i * .02); } sfx.tick(false, 0, .016); return sfx.c.state; });
    console.log('events fired, context', state);
  }
  if (ONLY !== 'bank') {
    // ---- scenes: a fresh engine on an OfflineAudioContext, driven by the same tick() the game calls 60 times a second ----
    const S = {
      mus_explore: { dur: 20, f: `(s,t)=>s.tick(false,0,1/60)` },
      amb_hall: { dur: 10, pre: `s=>s.mGain.gain.value=0`, f: `(s,t)=>s.tick(false,0,1/60)` },
      mus_pad: { dur: 10, pre: `s=>s.bedHall.disconnect()`, f: `(s,t)=>s.tick(false,0,1/60)` },
      mus_combat0: { dur: 15, f: `(s,t)=>s.tick(true,0,1/60)` },
      mus_combat2: { dur: 15, f: `(s,t)=>s.tick(true,2,1/60)` },
      mus_combat4: { dur: 15, f: `(s,t)=>s.tick(true,4,1/60)` },
      amb_roof: { dur: 12, roof: true, f: `(s,t,at)=>{s.tick(false,0,1/60);if(at(4))s.thunder(1);if(at(9))s.thunder(.45);}` },
      mix_transition: { dur: 18, f: `(s,t)=>s.tick(t>4&&t<11,t>7?3:0,1/60)` },
      mix_fight: { dur: 15, f: `(s,t,at,ev)=>{s.tick(t>1&&t<12.2,2,1/60);
        if(t<2&&ev(.28))s.step();
        for(const k of [0,1,2])if(at(2+k*.3)){s.whoosh(1);}  for(const k of [0,1,2])if(at(2.05+k*.3))s.hit(.35);
        if(at(2.95))s.whoosh(.8,1.3); if(at(3))s.hit(.9);
        if(at(3.6))s.telegraph(false); if(at(4.15))s.whoosh(.72,1.1); if(at(4.25))s.hurt();
        if(at(5))s.dodge(); if(at(5.4))s.jump(); if(at(5.9))s.land(.2);
        for(let k=0;k<5;k++)if(at(6.2+k*.17))s.gun();
        if(at(7.4))s.rankUp(2); if(at(7.9))s.orb(); if(at(8.3))s.deflect(); if(at(8.9))s.death(); if(at(9.5))s.glint(); if(at(9.9))s.swap();
        if(at(10.3))s.whoosh(.5,1.3); if(at(10.5)){s.hit(.9);s.land(.7);} if(at(11))s.telegraph(true); if(at(11.6))s.armorBreak();
        if(at(12.2)){s.boom();s.slow(true);} if(at(13.4))s.slow(false); if(t>13.6&&ev(.28))s.step(); if(at(14))s.pickup();}` },
    };
    for (const [name, sc] of Object.entries(S)) {
      const r = await page.evaluate(async ([dur, f, roof, pre]) => {
        const sr = 48000, ctx = new OfflineAudioContext(2, sr * dur, sr); let T = 0, F = 0;
        Object.defineProperty(ctx, 'currentTime', { get: () => T, configurable: true });
        window.G = roof ? { player: { pos: { z: 300 } } } : undefined;
        const s = new Sfx(), t0 = performance.now(); s.init(ctx, true); const synth = performance.now() - t0; if (pre) eval(pre)(s);
        const fn = eval(f), at = x => Math.round(x * 60) === F, ev = p => Math.floor((F + 1) / 60 / p) !== Math.floor(F / 60 / p);
        for (F = 0; F < dur * 60; F++) { T = F / 60; fn(s, T, at, ev); }
        delete ctx.currentTime;
        const b = await ctx.startRendering();
        return { synth: Math.round(synth), chs: [pack(b.getChannelData(0)), pack(b.getChannelData(1))], errs: window.__errors.length };
      }, [sc.dur, sc.f, !!sc.roof, sc.pre || null]);
      wav(path.join(OUT, 'scenes', name + '.wav'), r.chs.map(unpack), 48000);
      console.log(`scene ${name}  ${sc.dur}s  (bank synthesised in one go: ${r.synth} ms)`);
    }
  }
} catch (e) { console.log('LAB FAILED:', String(e.stack || e).slice(0, 1500)); code_ = 1; }
const perr = await page.evaluate(() => window.__errors).catch(() => []);
const uniq = [...new Set([...errors, ...perr.map(e => '[error] ' + e)])];
console.log(`errors: ${uniq.length}`); for (const e of uniq.slice(0, 25)) console.log('  ' + e);
await browser.close(); process.exit(code_ || (uniq.length ? 1 : 0));
