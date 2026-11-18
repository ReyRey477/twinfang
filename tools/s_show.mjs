// Showcase captures: node run.mjs s_show.mjs --kinds hero:25,hero:200,husk:25
export default async ({ page, shot, ev, log }) => {
  const i = process.argv.indexOf('--kinds'); const list = (i > 0 ? process.argv[i + 1] : 'hero:25').split(',');
  for (const item of list) {
    const [kind, a = '25', extra = ''] = item.split(':');
    const o = { a }; for (const kv of extra.split(';')) { if (kv) { const [k, v] = kv.split('='); o[k] = v; } }
    const r = await ev(([kind, o]) => { try { HX.show(kind, o); for (let k = 0; k < 4; k++) HX.render(); return HX.stats(); } catch (e) { return String(e.stack || e); } }, [kind, o]);
    log(kind, a, JSON.stringify(r));
    await shot(`show_${kind}_${a}${extra ? '_' + extra.replace(/[^a-z0-9]/gi, '') : ''}`);
  }
};
