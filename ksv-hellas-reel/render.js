// RENDERER — serves the project, drives headless Chromium (Playwright) and pipes frames to ffmpeg.
//   node render.js                 full render -> out/<SCORE.NAME>.mp4 (needs out/music.wav from song.js)
//   node render.js --preview       key frames -> out/pregled.png (contact sheet) + out/preview/*.png
//   node render.js --still 12.5    one frame  -> out/still-12.50.png
//   options: --workers 2  --from 0 --to 15  --resume (keep frames already rendered)
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const { chromium } = require('playwright');
const SCORE = require('./score');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'out');
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf('--' + name); return i < 0 ? def : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true); };

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.png': 'image/png', '.json': 'application/json' };
function serve() {
  const server = http.createServer((req, res) => {
    const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}

async function openWorkers(n, port) {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const pages = [];
  for (let i = 0; i < n; i++) {
    const page = await browser.newPage({ viewport: { width: SCORE.W, height: SCORE.H }, deviceScaleFactor: 1 });
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log(`[w${i}] ${m.text()}`); });
    page.on('pageerror', (e) => console.log(`[w${i}] ${e.message}`));
    await page.goto(`http://127.0.0.1:${port}/index.html${opt('noui') ? '?noui' : ''}`);
    await page.waitForFunction(() => window.READY === true, null, { timeout: 120000 });
    pages.push(page);
  }
  return { browser, pages };
}

async function grab(page, t) {
  const url = await page.evaluate((tt) => window.renderAt(tt), t);
  return Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const server = await serve();
  const port = server.address().port;
  const t0 = Date.now();

  if (opt('still')) {
    const t = parseFloat(opt('still'));
    const { browser, pages } = await openWorkers(1, port);
    const f = path.join(OUT, `still-${t.toFixed(2)}.png`);
    fs.writeFileSync(f, await grab(pages[0], t));
    console.log('wrote', path.relative(ROOT, f));
    await browser.close(); server.close(); return;
  }

  if (opt('preview')) {
    const times = SCORE.previewTimes;
    const dir = path.join(OUT, 'preview');
    fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
    const { browser, pages } = await openWorkers(Math.min(4, times.length), port);
    let next = 0;
    await Promise.all(pages.map(async (page) => {
      while (next < times.length) {
        const i = next++;
        fs.writeFileSync(path.join(dir, `p${String(i).padStart(2, '0')}.png`), await grab(page, times[i]));
      }
    }));
    await browser.close(); server.close();
    const cols = Math.min(6, times.length);
    const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', path.join(dir, 'p%02d.png'),
      '-vf', `scale=360:640:flags=lanczos,tile=${cols}x${Math.ceil(times.length / cols)}:padding=8:color=0x111111`,
      '-frames:v', '1', path.join(OUT, 'pregled.png')], { stdio: 'inherit' });
    if (r.status) process.exit(r.status);
    console.log(`wrote out/pregled.png (${times.length} frames, ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
    return;
  }

  // full render
  const fps = SCORE.FPS;
  const from = Math.round(parseFloat(opt('from', 0)) * fps);
  const to = Math.round(parseFloat(opt('to', SCORE.DURATION)) * fps);
  // all pages share one software-GPU process, so more than 2 workers only thrash it
  const workers = parseInt(opt('workers', Math.min(2, os.cpus().length)), 10);
  const dir = path.join(OUT, 'frames');
  if (!opt('resume')) fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const frameFile = (f) => path.join(dir, `f${String(f).padStart(4, '0')}.png`);
  const { browser, pages } = await openWorkers(workers, port);
  let next = from, done = 0;
  await Promise.all(pages.map(async (page) => {
    while (next < to) {
      const f = next++;
      if (opt('resume') && fs.existsSync(frameFile(f))) { done++; continue; }
      fs.writeFileSync(frameFile(f), await grab(page, (f + 0.5) / fps));
      if (++done % 30 === 0) process.stdout.write(`  ${done}/${to - from} frames, ${((Date.now() - t0) / 1000).toFixed(0)}s\n`);
    }
  }));
  await browser.close(); server.close();

  const music = path.join(OUT, 'music.wav');
  const mp4 = path.join(OUT, `${SCORE.NAME}.mp4`);
  const ff = ['-v', 'error', '-y', '-framerate', String(fps), '-start_number', String(from), '-i', path.join(dir, 'f%04d.png')];
  if (fs.existsSync(music)) ff.push('-ss', String(from / fps), '-i', music, '-c:a', 'aac', '-b:a', '192k', '-shortest');
  ff.push('-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart', mp4);
  const r = spawnSync('ffmpeg', ff, { stdio: 'inherit' });
  if (r.status) process.exit(r.status);
  console.log(`wrote out/${SCORE.NAME}.mp4 (${to - from} frames, ${((Date.now() - t0) / 1000).toFixed(0)}s)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
