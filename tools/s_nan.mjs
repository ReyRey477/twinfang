// Invalid-pixel check: no view of the level may contain NaN, infinite or negative HDR pixels (bloom turns each into a black block).
// Checks both the raw scene and the frame handed to the final pass. Note: software renderers and Direct3D disagree about
// pow() of a negative number, so a pass here does not prove a real GPU is clean; the guards in 03-renderer and 04-textures do that.
export default async ({ page, shot, ev, log }) => {
  await ev(() => { G.ts = 0; HX.begin(); HX.hud(false); for (const d of DBG.ENCS) d.done = true; DBG.LOCKS.gate = DBG.LOCKS.warden = DBG.LOCKS.upper = false; DBG.door.open = true; });
  const V = { cor0: [0, 0, 7, 0], cor1: [0, 0, 18, .6], cor2: [3.5, 0, 44, -1.2], hall: [0, 0, 97, 0], hall2: [10, 0, 112, -2.2], stair: [0, 0, 134, 0], roomA: [22, 14, 190, .8], roomB: [-22, 14, 196, 2.4], upper: [0, 14, 217, 1.57], roomC: [0, 14, 236, 0], roof: [0, 19, 280, 0], roof2: [12, 19, 300, -1.6] };
  let total = 0;
  for (const [n, v] of Object.entries(V)) {
    const r = await ev(v => { HX.free(); HX.tp(...v); const out = []; for (const [dy, p] of [[0, .12], [1.3, -.25], [-1.1, .5]]) { cam.yaw = v[3] + dy; cam.pitch = p; for (let k = 0; k < 25; k++) G.update(1 / 60); if (v[1] === 19) G.storm.flash = 1; HX.render(); const raw = HX.nanCheck(), fin = HX.nanCheck(true); out.push({ bad: raw.bad + fin.bad, raw: raw.bad, final: fin.bad, peak: fin.peak }); } return out; }, v);
    const bad = r.reduce((a, b) => a + b.bad, 0); total += bad;
    log(n, 'bad', bad, 'peak', Math.max(...r.map(x => x.peak)), bad ? JSON.stringify(r) : '');
  }
  log(total ? `FAILED: ${total} invalid pixels` : 'NAN CHECK PASSED');
};
