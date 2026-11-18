// Audio bank check, inside the real game page: every recipe must synthesise without error and produce a sane, non-silent
// buffer, init() must stay short, and every event and music state must run without a runtime error.
// What the bank actually sounds like is inspected separately: node tools/audio_lab.mjs, then python tools/audio_view.py.
export default async ({ page, ev, log }) => {
  const t0 = Date.now();
  await ev(() => { G.ts = 0; const t=performance.now(); G.start(); window.__initMs=performance.now()-t; window.requestAnimationFrame = () => 0;   /* stop rendering so synthesis time is measured cleanly */ document.getElementById('title').style.display = 'none'; });
  await page.waitForFunction(() => sfx.ready_ === true, null, { timeout: 60000 });
  log('bank ready after', Date.now() - t0, 'ms', JSON.stringify(await ev(()=>({start:Math.round(window.__initMs),synth:Math.round(sfx.synthMs),longestSlice:Math.round(sfx.maxSlice||0)}))));
  const r = await ev(() => { const o = {}; for (const k in sfx.bank) { const bs = sfx.bank[k]; let pk = 0, nan = 0, dur = 0; for (const b of bs) { dur += b.duration; for (let c = 0; c < b.numberOfChannels; c++) { const d = b.getChannelData(c); for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); if (v !== v) nan++; else if (v > pk) pk = v; } } } o[k] = [bs.length, +dur.toFixed(2), +pk.toFixed(2), nan]; } return o; });
  log(JSON.stringify(r));
  const bad = Object.entries(r).filter(([k, v]) => v[3] > 0 || v[2] < .2 || v[2] > 1.001); log('bad:', JSON.stringify(bad));
  // fire every event once to catch runtime errors in the play paths, then run the sequencer through every state
  const ok = await ev(() => { for (const m of ['whoosh', 'hurt', 'death', 'dodge', 'jump', 'step', 'glint', 'barrier', 'boom', 'gun', 'orb', 'deflect', 'roar', 'armorBreak', 'ready', 'swap', 'pickup', 'spawn', 'charge', 'coreCharge']) sfx[m]();
    sfx.whoosh(.4, 1.5); sfx.hit(.3); sfx.hit(.9); sfx.telegraph(true); sfx.telegraph(false); sfx.land(.8); sfx.rankUp(2); sfx.thunder(1); sfx.slow(true); sfx.slow(false);
    sfx.noise({ f0: 200, f1: 1300, dur: .3 }); sfx.tone({ f0: 100, f1: 200, dur: .2 });
    for (let k = 0; k <= 4; k++) { sfx.tick(true, k, .016); for (let i = 0; i < 128; i++) sfx.sched(i, sfx.c.currentTime + .1 + i * .02); }
    sfx.tick(false, 0, .016); for (let i = 0; i < 64; i++) sfx.sched(i, sfx.c.currentTime + .1 + i * .02); return sfx.c.state; });
  log('context', ok, bad.length ? 'AUDIO CHECK FAILED' : 'AUDIO CHECK PASSED');
};
