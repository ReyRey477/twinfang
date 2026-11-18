// Frame cost at fixed places: simulates and renders 90 frames back to back, forcing the GPU to finish each one
// (a one-pixel read-back), and reports milliseconds per frame, draw calls and triangles.
//   node tools/run.mjs tools/s_perf.mjs --w 1920 --h 1080 [--q "debug&q=high"]
// This is CPU + GPU time with nothing waiting on the display, so 1000 / ms is the frame rate the machine could reach.
export default async ({ ev, log }) => {
  await ev(() => { G.ts = 0; HX.begin(); HX.hud(false); });
  const S = {
    corridor: { tp: [0, 0, 30, 0] },
    'corridor fight': { tp: [0, 0, 20, 0], warm: 150 },
    hall: { tp: [0, 0, 93, 0], pre: () => { for (const d of DBG.ENCS) if (d.id[0] === 'c') d.done = true; DBG.door.open = true; DBG.door.k = 1; DBG.LOCKS.gate = false; } },
    'warden fight': { tp: [0, 0, 100, 0], warm: 260 },
    'room A fight': { tp: [22, 14, 190, 0], pre: () => { DBG.LOCKS.warden = false; for (const d of DBG.ENCS) if (d.id === 'warden' || d.id[0] === 'c') d.done = true; }, warm: 200 },
    'upper level': { tp: [0, 14, 217, 1.57], pre: () => { for (const d of DBG.ENCS) d.done = d.id !== 'storm'; } },
    'roof, storm fight': { tp: [0, 19, 290, 0], pre: () => { for (const d of DBG.ENCS) d.done = d.id !== 'storm'; DBG.LOCKS.upper = false; }, warm: 420 },
  };
  const size = await ev(() => { const gl = T3.renderer.getContext(), e = gl.getExtension('WEBGL_debug_renderer_info'); return [T3.renderer.domElement.width, T3.renderer.domElement.height, e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)]; });
  log('canvas', size[0] + 'x' + size[1], '|', size[2]);
  for (const [name, s] of Object.entries(S)) {
    const r = await ev(([s, pre]) => { try {
      G.resetCombat(); if (pre) eval('(' + pre + ')()'); HX.free(); HX.tp(...s.tp);
      for (let k = 0; k < (s.warm || 30); k++) G.update(1 / 60);
      const gl = T3.renderer.getContext(), px = new Uint8Array(4), N = 90, ms = [];
      for (let k = 0; k < 10; k++) { G.update(1 / 60); HX.render(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); }
      for (let k = 0; k < N; k++) { const t = performance.now(); G.update(1 / 60); HX.render(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); ms.push(performance.now() - t); }
      ms.sort((a, b) => a - b); const st = HX.stats();
      return { avg: ms.reduce((a, b) => a + b, 0) / N, med: ms[N >> 1], worst: ms[N - 1], calls: st.calls, tris: st.tris, foes: G.enemies.filter(e => !e.dead).length, errors: st.errors };
    } catch (e) { return String(e.stack || e); } }, [{ tp: s.tp, warm: s.warm }, s.pre ? s.pre.toString() : null]);
    if (typeof r === 'string') { log(name, r); continue; }
    log(`${name.padEnd(18)} avg ${r.avg.toFixed(1)} ms  median ${r.med.toFixed(1)}  worst ${r.worst.toFixed(1)}  => ${(1000 / r.avg).toFixed(0)} fps   calls ${r.calls}  tris ${r.tris}  foes ${r.foes}`);
  }
};
