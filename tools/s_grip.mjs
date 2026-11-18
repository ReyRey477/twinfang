// Grip stability check: steps the hero through every clip with every weapon set and reports the largest single-step
// rotation of each hand and weapon. A hand that snaps round the grip, or a blade that flips, shows up as a jump of
// more than about half a radian in one 1/180 s step. Also reports how far each hand ends up from its grip.
export default async ({ ev, log }) => {
  const r = await ev(() => {
    const p = G.player, CL = DBG.CL, rig = p.rig, out = [], Q = () => new T3.scene.quaternion.constructor(), V3 = () => new T3.scene.position.constructor();
    HX.show('hero', {}); HX.upd = null;
    const sets = { 0: ['idle', 'run', 'air', 'dash', 'back', 'hurt', 'L1', 'L2', 'L3', 'L4', 'flurry', 'launch', 'rush', 'spike', 'slam', 'slamLand'], 1: ['idle', 'run', 'air', 'L1', 'S2', 'launch', 'spike'], 2: ['idle', 'run', 'air', 'M1', 'M2', 'M3', 'mCharge', 'mSmash', 'slam', 'slamLand', 'rush'] };
    const hq = [Q(), Q()], wq = [Q(), Q()], ph = [Q(), Q()], pw = [Q(), Q()], a = V3(), b = V3();
    for (const set in sets) for (const name of sets[set]) {
      p.set = p.wantSet = +set; rig.setWeapon(+set); rig.play(CL.idle, 0, true); for (let k = 0; k < 60; k++) rig.update(1 / 180);
      rig.play(CL[name], .05, true); const dur = Math.min(CL[name].dur || 1.2, 1.6); let mh = 0, mw = 0, th = 0, tw = 0, gap = 0, first = true;
      for (let t = 0; t < dur; t += 1 / 180) {
        if (name === 'run') rig.phase += 11 / 180; rig.update(1 / 180); rig.root.updateMatrixWorld(true);
        for (let s = 0; s < 2; s++) {
          rig.hand[s].getWorldQuaternion(hq[s]); rig.sword[s].getWorldQuaternion(wq[s]);
          if (!first) { const dh = hq[s].angleTo(ph[s]), dw = wq[s].angleTo(pw[s]); if (dh > mh) { mh = dh; th = t; } if (dw > mw) { mw = dw; tw = t; } }
          ph[s].copy(hq[s]); pw[s].copy(wq[s]);
          rig.hand[s].getWorldPosition(a); rig.sword[s].getWorldPosition(b); gap = Math.max(gap, a.distanceTo(b));
        }
        first = false;
      }
      out.push(`${set} ${name.padEnd(9)} hand ${mh.toFixed(2)} @${th.toFixed(2)}  weapon ${mw.toFixed(2)} @${tw.toFixed(2)}  gap ${gap.toFixed(3)}${mh > .5 || mw > .6 ? '   <-- JUMP' : ''}`);
    }
    return out;
  });
  for (const l of r) log(l);
};
