// Debug harness: load the game with ?debug, then run this file's contents in the console (or fetch + eval it).
// It freezes real time and drives the game with a random-input bot, teleporting between encounters.
(() => {
  G.ts = 0;
  if (G.state === 'title') G.start();
  document.getElementById('title').style.display = 'none';
  for (const id of ['hud', 'end']) document.getElementById(id).style.transition = 'none';
  const p = (window.p = G.player);
  const GO = { c1: [0, 0, 20], c2: [0, 0, 52], warden: [0, 0, 99], A: [22, 14, 190], B: [-22, 14, 193], C: [0, 14, 241], storm: [0, 19, 291] };
  window.tp = (x, y, z) => { p.pos.set(x, y, z); p.prev.copy(p.pos); p.gy = y; p.grounded = true; p.vel.set(0, 0, 0); p.state = 'move'; };
  window.info = () => JSON.stringify({
    gs: G.state, st: p.state, set: p.set, mv: p.move && p.move.id, hp: p.hp | 0, pos: [p.pos.x, p.pos.y, p.pos.z].map(v => +v.toFixed(1)),
    enc: G.enc && G.enc.def.id + ':' + G.enc.wave, done: DBG.ENCS.filter(e => e.done).map(e => e.id).join(','), max: G.maxCombo, peak: G.style.peak, dmg: G.dmgTaken, t: G.runT | 0,
    boss: G.boss && [G.boss.state, G.boss.phase, G.boss.hp | 0, G.boss.armor | 0],
    en: G.enemies.filter(e => !e.boss).map(e => e.kind[0] + ':' + e.state + ':' + (e.hp | 0)).join(' ')
  });
  window.look = (d = 2.6, a = 2.6, pt = 0.1) => { cam.yaw = p.yaw + a; cam.pitch = pt; cam.dist = d; cam.cd = cam.ad = d; for (let i = 0; i < 40; i++) cam.update(1 / 60); step(0); };
  // opts: god (refill health), stop (predicate), noTp (never teleport), acts (action list), dmg (multiply player damage)
  window.bot = (frames, opts = {}) => {
    const acts = opts.acts || ['light', 'light', 'light', 'light', 'heavy', 'rush', 'dodge', 'jump', 'light', 'w0', 'w1', 'w2'];
    const seen = {}; let err = null, f = 0;
    for (; f < frames; f++) {
      const K = DBG.keys; K.KeyW = K.KeyS = K.KeyA = K.KeyD = false; cam.yaw = 0;
      if (opts.god !== false && p.hp < 60) p.hp = 100;
      if (opts.dmg && G.boss && f % 30 === 0 && G.boss.hp > 0 && !G.boss.ghost) G.boss.hp -= opts.dmg;
      let tg = null, bd = 1e9;
      for (const e of G.enemies) { if (e.dead || e.ghost) continue; const d = Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z); if (d < bd) { bd = d; tg = e; } }
      if (tg) { const dx = tg.pos.x - p.pos.x, dz = tg.pos.z - p.pos.z; if (bd > 2 + tg.radius) { if (dz > .4) K.KeyW = true; if (dz < -.4) K.KeyS = true; if (dx > .4) K.KeyA = true; if (dx < -.4) K.KeyD = true; } }
      else if (!G.enc && !G.enemies.length && !opts.noTp && G.state === 'play') {
        const d = DBG.ENCS.find(e => !e.done);
        if (d && !(d.id === 'warden' && DBG.LOCKS.gate) && !(d.id === 'storm' && DBG.LOCKS.upper)) { const g = GO[d.id]; tp(g[0], g[1], g[2]); }
      }
      if (f % 7 === 0) { const a = acts[(Math.random() * acts.length) | 0]; DBG.held.heavy = Math.random() < .6; DBG.held.rush = Math.random() < .5; if (tg || a === 'jump' || a === 'dodge' || a[0] === 'w') onAction(a); }
      try { G.update(1 / 60); } catch (e) { err = e.stack; break; }
      if (p.move) seen['m_' + p.move.id] = 1; seen['p_' + p.state] = 1;
      for (const e of G.enemies) seen[e.kind[0] + '_' + e.state + (e.boss ? e.phase : '')] = 1;
      if (opts.stop && opts.stop()) break; if (G.state !== 'play') break;
    }
    step(0); return JSON.stringify({ err, frames: f, seen: Object.keys(seen).sort().join(' ') }) + ' ' + info();
  };
  return 'harness ready';
})();
