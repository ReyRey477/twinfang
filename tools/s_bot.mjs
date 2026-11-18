// Full playthrough with the repo's random-input bot (devtest.js). Reports errors and every state/move seen.
import fs from 'node:fs';
export default async ({ page, shot, ev, log }) => {
  const src = fs.readFileSync(new URL('../devtest.js', import.meta.url), 'utf8');
  log(await ev(s => (0, eval)(s), src));
  await ev(() => { HX.hud(true); window.requestAnimationFrame = () => 0; });
  const seen = new Set(); let last = '';
  for (let k = 0; k < 40; k++) {
    const r = await ev(() => bot(3000, { dmg: 45 }));
    const j = JSON.parse(r.slice(0, r.indexOf('} {') + 1)), info = JSON.parse(r.slice(r.indexOf('} {') + 2));
    j.seen.split(' ').forEach(s => seen.add(s));
    const line = `${k} done=[${info.done}] enc=${info.enc} gs=${info.gs} hp=${info.hp} boss=${JSON.stringify(info.boss)} errs=${await ev(() => window.__errors.length)}`;
    if (line !== last) log(line); last = line;
    if (j.err) { log('BOT ERROR', j.err); break; }
    if (k === 1 || k === 6 || (info.boss && !globalThis.__b1 && (globalThis.__b1 = 1))) { await ev(() => { look(5.5, 2.6, .18); HX.render(); }); await shot('bot_' + k); }
    if (info.gs === 'done') { log('RUN COMPLETE'); break; }
    if (info.gs === 'dead') await ev(() => G.respawn());
  }
  log('seen:', [...seen].sort().join(' '));
  log('stats', JSON.stringify(await ev(() => HX.stats())));
};
