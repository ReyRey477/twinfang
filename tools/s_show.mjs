// Showcase captures: node run.mjs s_show.mjs --kinds hero:25,hero:200,husk:25
// Options after the angle, separated by ';': d, h, clip, t, set (see ?show= in the README), and three for the foes:
//   shed=1   the Gatewarden with its armour off (phase 2)
//   heat=0.6 the steady rim glow the game gives a foe (0.6 = the Gatewarden in phases 2 and 3; see fx.rim)
//   em=0.9   force the armour's emissive level (Lantern and Stormvane tells; the rig characters no longer use it)
export default async ({ page, shot, ev, log }) => {
  const i = process.argv.indexOf('--kinds'); const list = (i > 0 ? process.argv[i + 1] : 'hero:25').split(',');
  for (const item of list) {
    const [kind, a = '25', extra = ''] = item.split(':');
    const o = { a }; for (const kv of extra.split(';')) { if (kv) { const [k, v] = kv.split('='); o[k] = v; } }
    const r = await ev(([kind, o]) => { try {
      HX.show(kind, o); const e = HX.stage, rig = e && e.rig;
      if (o.shed && rig) { for (const m of rig.hide) m.visible = false; for (const m of rig.hot) m.visible = true; rig.update(0); }
      if (o.heat !== undefined && rig) fx.rim(e, e.mats, 0, 0, 1, false, +o.heat, e.kind === 'warden' ? 0xff5a14 : e.baseEm);
      if (o.em !== undefined && rig && e.mats.armor) { e.mats.armor.emissiveIntensity = +o.em; rig.update(0); }
      for (let k = 0; k < 4; k++) HX.render(); return HX.stats(); } catch (e) { return String(e.stack || e); } }, [kind, o]);
    log(kind, a, JSON.stringify(r));
    await shot(`show_${kind}_${a}${extra ? '_' + extra.replace(/[^a-z0-9]/gi, '') : ''}`);
  }
};
