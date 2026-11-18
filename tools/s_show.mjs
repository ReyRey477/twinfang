// Showcase captures: node run.mjs s_show.mjs --kinds hero:25,hero:200,husk:25
// Options after the angle, separated by ';': d, h, clip, t, set (see ?show= in the README), and two for the foes:
//   shed=1   the Gatewarden with its armour off (phase 2)
//   em=0.9   force the armour's emissive level to preview a tell (0.9 = end of a wind-up) or a hit flash (1.8 = its first frame)
export default async ({ page, shot, ev, log }) => {
  const i = process.argv.indexOf('--kinds'); const list = (i > 0 ? process.argv[i + 1] : 'hero:25').split(',');
  for (const item of list) {
    const [kind, a = '25', extra = ''] = item.split(':');
    const o = { a }; for (const kv of extra.split(';')) { if (kv) { const [k, v] = kv.split('='); o[k] = v; } }
    const r = await ev(([kind, o]) => { try {
      HX.show(kind, o); const e = HX.stage, rig = e && e.rig;
      if (o.shed && rig) { for (const m of rig.hide) m.visible = false; for (const m of rig.hot) m.visible = true; if (e.mats.dark) e.mats.dark.emissiveIntensity = .6; }
      if (o.em !== undefined && rig && e.mats.armor) { e.mats.armor.emissiveIntensity = +o.em; if (e.mats.dark && !o.shed) e.mats.dark.emissiveIntensity = +o.em * .7; rig.update(0); }
      for (let k = 0; k < 4; k++) HX.render(); return HX.stats(); } catch (e) { return String(e.stack || e); } }, [kind, o]);
    log(kind, a, JSON.stringify(r));
    await shot(`show_${kind}_${a}${extra ? '_' + extra.replace(/[^a-z0-9]/gi, '') : ''}`);
  }
};
