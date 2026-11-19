// Review capture: one fixed set of pictures of everything a critic should judge, written with a manifest of captions.
//   node tools/run.mjs tools/s_review.mjs --w 1280 --h 720 --out tools/shots/review/r1        (tools/review.py wraps this)
// hud_*   the interface: title, idle, combat with style rank, boss bar, messages, low health, defeat, results
// fx_*    combat moments caught as they happen: the bot plays every encounter and each tapped game event
//         (hit, telegraph, death, shot, shockwave, roar ...) is photographed a few frames later from a staged camera
// char_*  every rig character on the lit stage: front, back, close-up, plus the hero with each weapon set
// (the Lantern and the Stormvane are captured in their states by tools/s_states.mjs)
import fs from 'node:fs';
import path from 'node:path';
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i >= 0 ? process.argv[i + 1] : d; };
const OUT = arg('out', path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), 'shots'));
// event -> [how many pictures, frames to wait after the event before taking it, what the critic is looking at]
const QUOTA = {
  hitLight: [3, 2, 'a light hero attack connecting: hit spark, blade trail, hit-stop frame'],
  hitBig: [4, 2, 'a heavy hero attack connecting (launcher, finisher, maul): big hit effect, camera shake'],
  gun: [2, 1, 'the pistol firing: muzzle flash and tracer'],
  land: [2, 2, 'a ground impact (dive attack or maul smash): shock ring, dust, sparks'],
  telegraph: [3, 8, 'an enemy winding up: the warning flare the player must read'],
  telegraphBig: [3, 10, 'a heavy enemy or boss winding up: the big warning'],
  hurt: [2, 3, 'the hero being hit: damage flash and sparks'],
  death: [3, 4, 'an enemy destroyed: wreckage and burst'],
  boom: [3, 5, 'a finisher or encounter end: slow motion, flash, letterbox'],
  slow: [2, 6, 'slow motion (perfect dodge or finisher): screen treatment'],
  dodge: [2, 4, 'the hero dodging: thruster burst and afterimage'],
  orb: [2, 14, 'a Lantern orb in flight'],
  deflect: [1, 2, 'an orb slashed back at its Lantern'],
  spawn: [1, 22, 'enemies arriving: spawn rings'],
  barrier: [1, 24, 'the arena sealing: energy barrier'],
  armorBreak: [1, 4, 'armour breaking on a Brute or boss'],
  roar: [2, 16, 'a boss roaring or changing phase'],
  thunder: [2, 2, 'lightning on the roof'],
  charge: [1, 22, 'a Lantern charging a shot'],
  coreCharge: [1, 70, 'the Stormvane charging its core'],
  finisher: [2, 2, 'the finishing blow of an encounter, during its dark frames: the cut line through the target, letterbox'],
  finBurst: [2, 7, 'the finishing blow of an encounter just after the dark frames: the burst, radial blur, slow motion'],
};
export default async ({ page, shot, ev, log }) => {
  const man = []; const take = async (name, group, caption, o) => { await shot(name, o); man.push({ file: name + '.png', group, caption }); };
  const wait = ms => page.waitForTimeout(ms);
  // ---------- interface: title ----------
  await wait(600); await take('hud_00_title', 'hud', 'Title screen exactly as the player first sees it (public build).');
  // ---------- play: bot + event taps ----------
  const src = fs.readFileSync(new URL('../devtest.js', import.meta.url), 'utf8');
  await ev(s => (0, eval)(s), src);
  await ev(() => {
    HX.hud(true); window.requestAnimationFrame = () => 0; window.__ev = []; window.__want = new Set();
    window.__block = new Set();
    // a death is framed where it happened (the foe is gone by the time the picture is taken, and it may have been the last one)
    const tap = (k, key) => { const f = sfx[k].bind(sfx); sfx[k] = (...a) => { const n = key(a[0]); if (n && window.__want.has(n) && !(G.cineT > 0 && (n === 'roar' || n === 'thunder' || n === 'boom')) && !window.__block.has(n + '|' + (G.enc ? G.enc.def.id : '-'))) { window.__ev.push(n);
      if (n === 'death' && window.__ev.length === 1) { const e = G.enemies.find(e => e.gone && e.dead); if (e) window.__at = { pos: e.pos.clone().setY(e.gy || 0), scale: e.scale || 1, kind: e.kind, state: 'destroyed' }; } } return f(...a); }; };
    tap('hit', a => a >= .6 ? 'hitBig' : 'hitLight'); tap('land', a => a >= .7 ? 'land' : null); tap('telegraph', a => a ? 'telegraphBig' : 'telegraph'); tap('slow', a => a ? 'slow' : null);
    { const f = G.fin.bind(G), ok = n => window.__want.has(n) && !window.__block.has(n + '|' + (G.enc ? G.enc.def.id : '-')); G.fin = (...a) => { const n = ok('finisher') ? 'finisher' : ok('finBurst') ? 'finBurst' : null; if (n) window.__ev.push(n); return f(...a); }; }
    for (const k of ['gun', 'hurt', 'death', 'boom', 'dodge', 'orb', 'deflect', 'spawn', 'barrier', 'armorBreak', 'roar', 'thunder', 'charge', 'coreCharge']) if (sfx[k]) tap(k, () => k);
    // staged camera: frames the hero and the nearest foe together, from the side or from behind the hero
    window.__dir = mode => {
      const p = G.player, P = p.pos; let tg = null, bd = 1e9;
      for (const e of G.enemies) { if (e.dead || e.ghost) continue; const d = Math.hypot(e.pos.x - P.x, e.pos.z - P.z); if (d < bd) { bd = d; tg = e; } }
      if (window.__at) tg = window.__at;
      let dx = tg ? tg.pos.x - P.x : Math.sin(p.yaw), dz = tg ? tg.pos.z - P.z : Math.cos(p.yaw); const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
      const D = tg ? Math.min(l, 10) : 3, sc = tg ? (tg.scale || 1) : 1, mx = P.x + dx * D * .5, mz = P.z + dz * D * .5, ey = tg ? Math.min(tg.pos.y, P.y + 6) : P.y, ty = P.y + 1.05 + (ey - P.y) * .35 + (sc > 1.6 ? .7 : 0), R = 4 + D * .5 + sc * .9;
      const c = [[mx - dz * R, mz + dx * R], [mx + dz * R, mz - dx * R], [P.x - dx * (4.4 + D * .15) - dz * 1.3, P.z - dz * (4.4 + D * .15) + dx * 1.3], [P.x - dx * (4.4 + D * .15) + dz * 1.3, P.z - dz * (4.4 + D * .15) - dx * 1.3]];
      const order = mode === 'side' ? [0, 1, 2, 3] : [2, 3, 0, 1];
      for (const i of order) { const [x, z] = c[i]; if (DBG.walkable(x, z)) { HX.view(x, P.y + (i < 2 ? 1.7 : 2.3) + (sc > 1.6 ? 1 : 0), z, mx, ty, mz); HX.render(); HX.render(); return (i < 2 ? 'side view' : 'from behind the hero') + (tg ? ', nearest foe: ' + tg.kind + ' (' + tg.state + ')' : ''); } }
      HX.free(); HX.render(); HX.render(); return 'game camera';
    };
    // the real chase camera, turned to face the nearest foe
    window.__chase = () => { const p = G.player; let tg = null, bd = 1e9; for (const e of G.enemies) { if (e.dead || e.ghost) continue; const d = Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z); if (d < bd) { bd = d; tg = e; } }
      HX.free(); cam.yaw = tg ? Math.atan2(tg.pos.x - p.pos.x, tg.pos.z - p.pos.z) : p.yaw; cam.pitch = .2; cam.dist = cam.cd = cam.ad = 5.3; for (let i = 0; i < 40; i++) cam.update(1 / 60); G.updateHud(1 / 60); HX.render(); HX.render(); };
  });
  await ev(() => { for (let k = 0; k < 40; k++) G.update(1 / 60); window.__chase(); }); await wait(700);
  await take('hud_01_idle', 'hud', 'In play, out of combat, at the start of the corridor: vitality bar, weapon selector, key hints. Normal chase camera.');
  const left = Object.fromEntries(Object.entries(QUOTA).map(([k, v]) => [k, v[0]])); let n = 0, frames = 0; const hudDone = {}, per = {}, block = [];
  for (let guard = 0; guard < 220 && frames < 60000; guard++) {
    const want = Object.keys(left).filter(k => left[k] > 0); if (!want.length) break;
    const r = await ev(([want, block]) => { window.__want = new Set(want); window.__block = new Set(block); window.__ev.length = 0; window.__at = null; const o = JSON.parse(bot(1200, { dmg: 60, stop: () => window.__ev.length > 0 }).split('} {')[0] + '}');
      return { ev: window.__ev.slice(), f: o.frames, err: o.err, gs: G.state, enc: G.enc ? G.enc.def.id : null, set: G.player.set, done: DBG.ENCS.filter(d => d.done).length }; }, [want, block]);
    frames += r.f; if (r.err) { log('BOT ERROR', r.err); break; }
    if (r.gs === 'done') break; if (r.gs === 'dead') { await ev(() => G.respawn()); continue; }
    if (!r.ev.length) continue;
    const k = r.ev[0], [q, delay, what] = QUOTA[k]; left[k]--;
    const pk = k + '|' + (r.enc || '-'); per[pk] = (per[pk] || 0) + 1; if (per[pk] >= Math.ceil(q / 3)) block.push(pk);   // at most a third of a quota from one encounter
    // once per encounter: the same moment through the real camera with the interface up, style meter forced to a visible rank
    const hk = r.enc + (k.startsWith('telegraph') ? 't' : 'h');
    if (r.enc && !hudDone[r.enc] && k !== 'barrier' && k !== 'spawn') { hudDone[r.enc] = 1;
      const rank = await ev(() => { const s = G.style, v = { c1: 130, c2: 250, warden: 340, A: 210, B: 420, C: 460, storm: 380 }[G.enc.def.id] || 150; s.m = v; s.idle = 0; G.combo = 3 + ((v / 9) | 0); G.comboT = 0; for (let i = 0; i < 3; i++) G.update(1 / 60); window.__chase(); return document.getElementById('rank').textContent + ' ' + document.getElementById('rword').textContent; });
      await wait(450); await take(`hud_${String(10 + n).padStart(2, '0')}_combat_${r.enc}`, 'hud', `Interface during the ${r.enc} fight through the real chase camera: vitality, style rank "${rank}", combo counter, weapon selector${r.enc === 'warden' || r.enc === 'storm' ? ', boss health bar' : ''}.`); }
    const view = await ev(([delay, mode]) => { for (let i = 0; i < delay; i++) G.update(1 / 60); if (mode === 'game') { HX.free(); HX.render(); HX.render(); return 'the real game camera, as the player sees it'; } return window.__dir(mode); }, [delay, k.startsWith('fin') ? 'game' : n % 2 ? 'chase' : 'side']);
    await take(`fx_${String(n).padStart(2, '0')}_${k}_${r.enc || 'free'}`, 'fx', `${what}. Encounter ${r.enc || '-'}, weapon set ${['Twin Fangs', 'Blade & Pistol', 'Great Maul'][r.set]}; ${view}; taken ${delay} frames after the event.`);
    await ev(() => HX.free()); n++;
  }
  log('fx pictures', n, 'bot frames', frames, 'unfilled', JSON.stringify(Object.fromEntries(Object.entries(left).filter(([, v]) => v > 0))));
  // ---------- interface: low health, defeat, results ----------
  await ev(() => { G.reset(); HX.free(); HX.hud(true); const p = G.player; for (let k = 0; k < 30; k++) G.update(1 / 60); p.hp = 18; for (let k = 0; k < 20; k++) G.update(1 / 60); window.__chase(); }); await wait(500);
  await take('hud_90_lowhealth', 'hud', 'Low health (18 of 100): the warning treatment on screen and on the vitality bar.');
  await ev(() => { const p = G.player; p.invuln = 0; p.hp = 1; p.takeHit(50, { pos: p.pos.clone().setZ(p.pos.z + 1) }); for (let k = 0; k < 150; k++) G.update(1 / 60); HX.render(); }); await wait(2800);
  await take('hud_91_defeat', 'hud', 'Defeat screen after the hero falls.');
  await ev(() => { G.respawn(); G.maxCombo = 37; G.dmgTaken = 46; G.runT = 612; G.style.peak = 3; G.deaths = 1; if (G.finish) G.finish(); HX.render(); }); await wait(1500);
  await take('hud_92_results', 'hud', 'Results screen after the final boss (sample numbers).');
  // ---------- characters on the stage ----------
  await ev(() => { G.reset(); HX.hud(false); });
  const CH = [
    ['hero', 'front', { a: 25, d: 2.6, h: 1.05, set: 0 }, 'Hero with the Twin Fangs, three-quarter front, full body.'],
    ['hero', 'back', { a: 205, d: 2.6, h: 1.05, set: 0 }, 'Hero from behind, the angle seen for most of the game.'],
    ['hero', 'close', { a: 32, d: 1.2, h: 1.48, set: 0 }, 'Hero head and torso close-up.'],
    ['hero', 'pistol', { a: -50, d: 2.1, h: 1.15, set: 1 }, 'Hero with Blade & Pistol.'],
    ['hero', 'maul', { a: 25, d: 3, h: 1.2, set: 2 }, 'Hero with the Great Maul.'],
    ['husk', 'front', { a: 25, d: 2.9, h: 1.1, clip: 'eIdle' }, 'Husk (basic melee enemy), front.'], ['husk', 'back', { a: 205, d: 2.9, h: 1.1, clip: 'eIdle' }, 'Husk, back.'], ['husk', 'close', { a: 30, d: 1.35, h: 1.4, clip: 'eIdle' }, 'Husk close-up.'],
    ['brute', 'front', { a: 25, d: 4.6, h: 1.5, clip: 'eIdle' }, 'Brute (armoured heavy enemy), front.'], ['brute', 'back', { a: 205, d: 4.6, h: 1.5, clip: 'eIdle' }, 'Brute, back.'], ['brute', 'close', { a: 30, d: 2.2, h: 2, clip: 'eIdle' }, 'Brute close-up.'],
    ['stalker', 'front', { a: 25, d: 3, h: 1.1, clip: 'eIdle' }, 'Stalker (fast assassin enemy), front.'], ['stalker', 'back', { a: 205, d: 3, h: 1.1, clip: 'eIdle' }, 'Stalker, back.'], ['stalker', 'close', { a: 30, d: 1.4, h: 1.4, clip: 'eIdle' }, 'Stalker close-up.'],
    ['warden', 'front', { a: 25, d: 6.6, h: 2.3, clip: 'eIdle' }, 'Gatewarden boss in full armour, front.'], ['warden', 'back', { a: 205, d: 6.6, h: 2.3, clip: 'eIdle' }, 'Gatewarden, back.'], ['warden', 'close', { a: 28, d: 3.1, h: 3.2, clip: 'eIdle' }, 'Gatewarden head and chest close-up.'],
    ['warden', 'shed', { a: 25, d: 6.6, h: 2.3, clip: 'eIdle', shed: 1 }, 'Gatewarden in phase 2 with its armour shed: exposed frame and hot seams.'],
    ['all', 'lineup', { a: 8, d: 8, h: 2.3 }, 'The whole cast on one stage for scale: Lantern, Stalker, hero, Husk, Brute, Gatewarden behind.'],
  ];
  for (const [kind, tag, o, cap] of CH) {
    const r = await ev(([kind, o]) => { try { HX.show(kind, o); if (o.shed) { const r = HX.stage.rig; for (const m of r.hide) m.visible = false; for (const m of r.hot) m.visible = true; } for (let k = 0; k < 4; k++) HX.render(); return null; } catch (e) { return String(e.stack || e); } }, [kind, o]);
    if (r) log(kind, tag, r); await take(`char_${kind}_${tag}`, 'char', cap + ' Showcase stage with three lights; in play the lighting is darker and more coloured.');
  }
  fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(man, null, 1));
  log('manifest', man.length, 'pictures ->', path.join(OUT, 'manifest.json'));
};
