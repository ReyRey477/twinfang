// Pose sheet for the hero: steps a clip to a given time (so springs and blade roll are what the game shows) and captures it.
// node tools/run.mjs tools/s_poses.mjs --w 420 --h 420 [--poses "idle:0:0:25,run:0:1:-70"]   (clip:time:weaponSet:angle[:dist[:height]])
// then: python tools/sheet.py pose   -> tools/shots/sheet_pose.png
const DEF = 'idle:1:0:25,idle:1:0:-110,idle:1:1:25,idle:1:1:-110,idle:1:2:25,idle:1:2:-110,run:.3:0:-60,run:.3:1:-60,run:.3:2:-60,run:.3:2:60,' +
  'L1:.06:0:30,L1:.13:0:30,L1:.2:0:30,L2:.2:0:30,L3:.1:0:30,L3:.22:0:30,L4:.3:0:30,launch:.08:0:-50,launch:.24:0:-50,rush:.25:0:-70,' +
  'S2:.06:1:30,S2:.2:1:30,M1:.14:2:30,M1:.3:2:30,M1:.45:2:30,M3:.3:2:-60,M3:.45:2:-60,mCharge:.8:2:-50,air:.2:0:30,air:.2:2:30';
export default async ({ page, shot, ev, log }) => {
  const i = process.argv.indexOf('--poses'); const list = (i > 0 ? process.argv[i + 1] : DEF).split(',');
  let n = 0;
  for (const item of list) {
    const [clip, t = '0', set = '0', a = '25', d = '2.9', h = '1.05'] = item.split(':');
    const r = await ev(([clip, t, set, a, d, h]) => { try {
      const p = G.player, CL = DBG.CL; HX.show('hero', { a, d, h }); p.set = p.wantSet = +set; p.rig.setWeapon(+set); HX.upd = null;
      const rig = p.rig; rig.phase = 0; rig.play(CL.idle, 0, true); for (let k = 0; k < 30; k++) rig.update(1 / 120);
      rig.play(CL[clip], .05, true); const loco = CL[clip].loco; let tt = 0;
      while (tt < t - 1e-6) { const dt = Math.min(1 / 240, t - tt); tt += dt; if (clip === 'run') rig.phase += dt * 11; rig.update(dt); }
      rig.root.updateMatrixWorld(true); for (let k = 0; k < 3; k++) HX.render(); return 'ok';
    } catch (e) { return String(e.stack || e); } }, [clip, +t, set, a, d, h]);
    if (r !== 'ok') log(item, r);
    await shot(`pose_${String(n++).padStart(2, '0')}_${clip}_${t.replace('.', '')}_s${set}`);
  }
};
