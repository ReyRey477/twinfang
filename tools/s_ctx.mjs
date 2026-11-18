// Lantern and Stormvane in their real encounters and lighting (the showcase stage flatters everything).
//   node tools/run.mjs tools/s_ctx.mjs [--only roomA,roof]      then: python tools/sheet.py ctx 3
// Each step runs the whole game for a while (player made invulnerable), optionally forces a boss state, then captures either
// the normal game camera or a camera placed relative to the subject: [angle deg, distance, height offset, elevation deg].
export default async ({ page, shot, ev, log }) => {
  const i = process.argv.indexOf('--only'); const only = i > 0 ? process.argv[i + 1].split(',') : null;
  await ev(() => { G.ts = 0; HX.begin(); HX.hud(false); });
  const run = async (name, o) => {
    const r = await ev(o => { try {
      const p = G.player; p.hp = 1e9; p.invuln = 1e9;
      const b = G.boss, L = G.enemies.filter(e => e.kind === 'lantern' && !e.dead)[o.li || 0];
      if (o.go && b) { if (o.go === 'stun') { b.stunT = 99; } b.cd = o.cd ?? 99; b.go(o.go); }
      if (o.lstate && L) { L.state = o.lstate; L.t = 0; if (o.lstate === 'float') L.fireCd = 99; }
      if (o.low && L) { L.low = 2.6; L.lowT = 99; }
      for (let k = 0; k < (o.n || 0); k++) { p.hp = 1e9; p.invuln = 1e9; G.update(1 / 60); }
      const s = o.on === 'boss' ? G.boss : o.on === 'lantern' ? G.enemies.filter(e => e.kind === 'lantern' && !e.dead)[o.li || 0] : null;
      if (s && o.cam) { const [a, d, h, el] = o.cam, A = a * Math.PI / 180 + (s.yaw !== undefined ? Math.PI - s.yaw : 0), E = el * Math.PI / 180, P = s.pos;
        HX.view(P.x + Math.sin(A) * Math.cos(E) * d, P.y + h + Math.sin(E) * d, P.z - Math.cos(A) * Math.cos(E) * d, P.x, P.y + h, P.z); } else HX.free();
      if (!s || !o.cam) { for (let k = 0; k < 2; k++) G.update(0); }
      HX.render(); HX.render(); const nr = HX.nanCheck(), nf = HX.nanCheck(true); const st = HX.stats();
      return (G.boss ? 'boss ' + G.boss.state + ' ' : '') + `calls ${st.calls} tris ${st.tris} errors ${st.errors} invalid px raw ${nr.bad} final ${nf.bad}`;
    } catch (e) { return String(e.stack || e); } }, o);
    log(name, r); await shot('ctx_' + name);
  };
  if (!only || only.includes('roomA')) {
    await ev(() => { G.resetCombat(); for (const d of DBG.ENCS) d.done = d.id !== 'A'; HX.free(); HX.tp(22, 14, 189, 0); });
    await run('a0_room_game', { n: 150 });
    await run('a1_lantern', { n: 20, on: 'lantern', cam: [25, 4.6, -.3, 8], lstate: 'float' });
    await run('a2_lantern_side', { n: 1, on: 'lantern', cam: [120, 4.6, -.3, 8] });
    await run('a3_lantern_charge', { n: 30, on: 'lantern', cam: [20, 5.2, -.3, 6], lstate: 'charge' });
    await run('a4_lantern_game_dist', { n: 40, lstate: 'float' });
    await run('a5_lantern_low', { n: 150, on: 'lantern', cam: [30, 5, -.3, 10], low: 1, lstate: 'float' });
  }
  if (!only || only.includes('roof')) {
    await ev(() => { G.resetCombat(); for (const d of DBG.ENCS) d.done = d.id !== 'storm'; DBG.LOCKS.upper = false; HX.free(); HX.tp(0, 19, 290, 0); });
    await run('r0_intro_game', { n: 150 });
    await run('r1_circle_game', { n: 300 });
    await run('r2_circle_close', { n: 20, on: 'boss', cam: [40, 14, 0, -12] });
    await run('r3_circle_above', { n: 14, on: 'boss', cam: [150, 15, 0, 30] });
    await run('r4_ground_game', { go: 'land', n: 260, cd: 99 });
    await run('r5_ground_close', { n: 30, on: 'boss', cam: [35, 12, .3, 10] });
    await run('r6_ground_head', { n: 1, on: 'boss', cam: [55, 7.5, 1.4, 4] });
    await run('r7_ground_back', { n: 1, on: 'boss', cam: [150, 12, .3, 18] });
    await run('r8_stun', { go: 'stun', n: 70, on: 'boss', cam: [30, 12, 0, 16] });
    await run('r9_perch_game', { go: 'toperch', n: 200, cd: 99 });
  }
};
