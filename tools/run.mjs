// Headless test runner.  node tools/run.mjs tools/<scenario>.mjs [--w 960 --h 540] [--q "debug&q=low"] [--out dir]
// A scenario is a module:  export default async ({page, shot, ev, log}) => { ... }   (see the s_*.mjs files next to this one)
// Setup once:  npm i -D playwright three@0.160.0  &&  npx playwright install chromium
// Environment: CHROME_PATH (use an installed Chrome), SOFTWARE=1 (software WebGL, for machines without a GPU),
//              THREE_DIR (a local copy of three, served in place of the CDN so the run works offline)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
const here = path.dirname(fileURLToPath(import.meta.url));
let chromium;
try { ({ chromium } = await import('playwright')); } catch { try { ({ chromium } = await import('playwright-core')); } catch { ({ chromium } = createRequire(process.env.PW_MODULES || '/opt/npm-tools/node_modules/')('playwright-core')); } }
// with playwright-core there is no bundled browser: fall back to an installed Edge or Chrome
const BROWSERS = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
const EXE = process.env.CHROME_PATH || (() => { try { const p = chromium.executablePath(); if (p && fs.existsSync(p)) return undefined; } catch {} return BROWSERS.find(p => fs.existsSync(p)); })();

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const ROOT = opt('root', path.resolve(here, '..'));
const OUT = opt('out', path.join(here, 'shots'));
const W = +opt('w', 960), H = +opt('h', 540);
const FILE = opt('file', 'twinfang.html'), Q = opt('q', 'debug');
const NOFONTS = args.includes('--nofonts');
const THREE_DIR = [process.env.THREE_DIR, path.join(here, 'node_modules/three'), path.join(ROOT, 'node_modules/three')].find(d => d && fs.existsSync(d));
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); res.end(d); });
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const browser = await chromium.launch({
  executablePath: EXE, headless: true,
  args: [...(process.env.SOFTWARE === '1' ? ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] : ['--enable-gpu']), '--ignore-gpu-blocklist', '--enable-webgl', '--autoplay-policy=no-user-gesture-required', '--mute-audio']
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', m => { const t = m.type(); if (t === 'error' || t === 'warning') errors.push(`[${t}] ${m.text().slice(0, 600)}`); else if (opt('verbose')) console.log('  [page]', m.text().slice(0, 300)); });
page.on('pageerror', e => errors.push('[pageerror] ' + String(e.stack || e).slice(0, 900)));
await page.route('**/*', route => {
  const u = route.request().url();
  const m = u.match(/cdn\.jsdelivr\.net\/npm\/three@[\d.]+\/(.*)$/);
  if (m && THREE_DIR) { const f = path.join(THREE_DIR, m[1]); return fs.existsSync(f) ? route.fulfill({ path: f, contentType: 'text/javascript' }) : route.abort(); }
  if (NOFONTS && /fonts\.(googleapis|gstatic)\.com/.test(u)) return route.fulfill({ status: 200, contentType: 'text/css', body: '' });   // --nofonts: offline runs; otherwise the real web fonts load, so interface pictures are true
  return route.continue();
});
const log = (...a) => console.log(...a);
const shot = async (name, o = {}) => { const f = path.join(OUT, name + '.png'); await page.screenshot({ path: f, ...o }); log('shot', f); return f; };
const ev = (fn, arg) => page.evaluate(fn, arg);
const t0 = Date.now();
await page.goto(`http://127.0.0.1:${port}/${FILE}?${Q}`, { waitUntil: 'load' });
let code = 0;
try {
  await page.waitForFunction(() => window.G && window.step, null, { timeout: 120000 });
  await page.evaluate(() => Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 6000))]));
  log('ready in', Date.now() - t0, 'ms');
  const scen = (await import(pathToFileURL(path.resolve(args[0])).href)).default;
  await scen({ page, shot, ev, log });
} catch (e) { console.log('SCENARIO FAILED:', String(e.stack || e).slice(0, 1500)); code = 1; }
const uniq = [...new Set(errors)].filter(e => !/GPU stall due to ReadPixels/.test(e));
log(`errors: ${uniq.length}`); for (const e of uniq.slice(0, 25)) log('  ' + e);
await browser.close(); server.close(); process.exit(code);
