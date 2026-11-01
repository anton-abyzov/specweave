const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
import { spawn } from 'node:child_process';
const [scene, dur, out, extra = ''] = process.argv.slice(2);
const stills = process.env.STILLS?.split(',').map(Number);
const b = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM, args: ['--allow-file-access-from-files'] });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await p.goto(`file://${new URL('../scene/index.html', import.meta.url).pathname}?scene=${scene}${extra}`);
await p.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(i => i.decode().catch(() => {}))); });
if (stills) {
  for (const t of stills) { await p.evaluate(t => seek(t), t); await p.screenshot({ path: `${out}-${t}.png` }); }
} else {
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', '30', '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', '-r', '30', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const n = Math.round(Number(dur) * 30);
  for (let i = 0; i < n; i++) { await p.evaluate(t => seek(t), i / 30); ff.stdin.write(await p.screenshot({ type: 'png' })); }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
}
await b.close();
