// Lantern and Stormvane in a given state: the subject is put on the showcase stage, forced into the state, and its own
// update() is stepped for a while with the camera following it.
//   node tools/run.mjs tools/s_states.mjs --w 640 --h 560 --states "lantern:charge:.5,lantern:stun:1.5:60,storm:gidle:1.5:35:15"
// item = kind:state:seconds[:angle[:distance[:height offset[:camera elevation in degrees[:head|tail|wing|foot (Stormvane part to centre on)]]]]]     then: python tools/sheet.py state 4
// Extra Lantern states: low (pulled down by gunfire), link (shielding an ally). Extra Stormvane state: fly (circling, mid flap).
const DEF = 'lantern:float:1,lantern:float:1:160,lantern:charge:.55,lantern:stagger:.15,lantern:stun:1.6,lantern:low:3,lantern:link:1.2:-40,' +
  'storm:fly:1.2:30,storm:fly:1.55:150,storm:fly:1.9:90:20:3,storm:gidle:1.6:30,storm:gidle:1.6:120,storm:stun:1.5:40,storm:wsw:.75:20,storm:wsws:.2:20,storm:bite:.6:60,storm:tail:.5:150,storm:perch:1.5:30,storm:breath:1.5:20,storm:dpass:.72:40';
export default async ({ page, shot, ev, log }) => {
  const i = process.argv.indexOf('--states'); const list = (i > 0 ? process.argv[i + 1] : DEF).split(',');
  let n = 0;
  for (const item of list) {
    const [kind, state, secs = '1', a = '25', d = '', h = '0', el = '9', tgt = ''] = item.split(':');
    const r = await ev(([kind, state, secs, a, d, h, el, tgt]) => { try {
      HX.show(kind, { a }); const e = HX.stage, p = G.player, cx = 0, cz = 109, storm = kind === 'storm'; HX.upd = null; p.hp = 1e9; p.invuln = 1e9;
      p.pos.set(cx, 0, cz - (storm ? 12 : 9)); p.prev.copy(p.pos);
      if (storm) { e.C.set(cx, 0, cz); e.cd = 99; e.pos.set(cx, state === 'fly' || state === 'breath' ? 8 : 2.1, cz); e.yaw = Math.PI; e.th = 0;
        if (state === 'fly') { e.go('circle'); e.gy = -4; e.C.set(cx, -4, cz - 24); e.pos.set(cx, 6, cz); e.yaw = Math.PI / 2; }
        else if (state === 'stun') { e.stunT = 99; e.go('stun'); } else if (state === 'perch') { e.go('perch'); e.shieldOn = true; e.pos.y = 9; }
        else if (state === 'dpass') { e.go('dpre'); e.t = 1.05; } else e.go(state);
      } else { e.pos.set(cx, 4.2, cz); e.root.scale.setScalar(1); e.fireCd = 99; e.state = state === 'low' || state === 'link' ? 'float' : state; e.t = 0;
        if (state === 'low') { e.low = 2.6; e.lowT = 99; }
        if (state === 'link') { e.forced = true; e.link = { pos: p.pos.clone().set(cx + 7, 0, cz - 4), cy: () => 1.2, dead: false }; } }
      const steps = Math.round(secs * 60); for (let k = 0; k < steps; k++) { if (storm && state === 'stun') e.t = Math.min(e.t, 3); if (storm && state === 'fly') e.th = 0; G.rt += 1 / 60; e.update(1 / 60); if (storm && state === 'dpass' && e.state === 'dshot') break; }
      const P = tgt === 'head' ? e.head(p.pos.clone()) : tgt === 'tail' ? e.t3.getWorldPosition(p.pos.clone()) : tgt === 'wing' ? e.wing[0].s2.getWorldPosition(p.pos.clone()) : tgt === 'foot' ? e.leg[0].f.getWorldPosition(p.pos.clone()) : e.pos, D = d ? +d : storm ? 15 : 4.6, A = (+a) * Math.PI / 180 + (storm ? Math.PI - e.yaw : 0), E = el * Math.PI / 180, ty = P.y + (+h) + (storm ? 0 : -.35);
      HX.orbit = null; HX.view(P.x + Math.sin(A) * Math.cos(E) * D, ty + Math.sin(E) * D, P.z - Math.cos(A) * Math.cos(E) * D, P.x, ty, P.z);
      for (let k = 0; k < 3; k++) HX.render(); return e.state;
    } catch (err) { return String(err.stack || err); } }, [kind, state, +secs, a, d, h, +el, tgt]);
    log(item, '->', r);
    await shot(`state_${String(n++).padStart(2, '0')}_${kind}_${state}_${secs.replace('.', '')}`);
  }
};
