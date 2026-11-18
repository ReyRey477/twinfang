// In-game views at fixed places, HUD hidden. --only name1,name2 to limit.
export default async ({ page, shot, ev, log }) => {
  const i = process.argv.indexOf('--only'); const only = i > 0 ? process.argv[i + 1].split(',') : null;
  await ev(() => { G.ts = 0; HX.begin(); HX.hud(false); });
  const S = {
    cor: { tp: [0, 0, 30, 0], n: 30 },
    corfight: { tp: [0, 0, 20, 0], n: 150 },
    hall: { tp: [0, 0, 93, 0], pre: () => { for (const d of DBG.ENCS) if (d.id[0] === 'c') d.done = true; DBG.door.open = true; DBG.door.k = 1; DBG.LOCKS.gate = false; }, n: 30, cam: [9, 5, 93, -2, 5, 112] },
    warden: { tp: [0, 0, 100, 0], n: 260 },
    stair: { tp: [0, 0, 132, 0], pre: () => { DBG.LOCKS.warden = false; for (const d of DBG.ENCS) if (d.id === 'warden') d.done = true; }, n: 30 },
    roomA: { tp: [22, 14, 184, 0], pre: () => { for (const d of DBG.ENCS) if (d.id === 'warden' || d.id[0] === 'c') d.done = true; }, n: 30, cam: [10, 17.5, 183.5, 30, 15, 202] },
    roomAfight: { tp: [22, 14, 190, 0], n: 200 },
    upper: { tp: [0, 14, 217, 1.57], pre: () => { for (const d of DBG.ENCS) d.done = d.id !== 'storm'; }, n: 30 },
    roof: { tp: [0, 19, 278, 0], pre: () => { for (const d of DBG.ENCS) d.done = d.id !== 'storm'; DBG.LOCKS.upper = false; }, n: 60 },
    storm: { tp: [0, 19, 290, 0], n: 420 },
  };
  for (const [name, s] of Object.entries(S)) {
    if (only && !only.includes(name)) continue;
    const r = await ev(([s, pre]) => { try { G.resetCombat(); if (pre) eval('(' + pre + ')()'); HX.free(); HX.tp(...s.tp); for (let k = 0; k < s.n; k++) G.update(1 / 60); if (s.cam) HX.view(...s.cam); HX.render(); HX.render(); return HX.stats(); } catch (e) { return String(e.stack || e); } }, [{ tp: s.tp, n: s.n, cam: s.cam }, s.pre ? s.pre.toString() : null]);
    log(name, JSON.stringify(r));
    await shot('scene_' + name);
  }
};
