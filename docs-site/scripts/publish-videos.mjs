#!/usr/bin/env node
// Uploads rendered videos under static/video/ to R2, where the site plays them from.
// Renders stay on disk (git ignores them). Usage: npm run videos:publish [-- <file.mp4> ...]
import {readdirSync, statSync} from 'node:fs';
import {dirname, join, relative, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {MEDIA_BUCKET, mediaUrl} from './media.mjs';

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const staticDir = join(siteRoot, 'static');
const TYPES = {mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime'};

function walk(dir) {
  return readdirSync(dir, {withFileTypes: true}).flatMap(e =>
    e.isDirectory() ? walk(join(dir, e.name)) : TYPES[e.name.split('.').pop()] ? [join(dir, e.name)] : []);
}

const files = process.argv.length > 2 ? process.argv.slice(2).map(f => resolve(f)) : walk(join(staticDir, 'video'));
let failed = 0;
for (const file of files) {
  const sitePath = '/' + relative(staticDir, file).split(sep).join('/');
  const type = TYPES[file.split('.').pop()];
  if (!sitePath.startsWith('/video/') || !type) {
    console.error(`skip ${file}: not a video under static/video/`);
    failed++;
    continue;
  }
  const mb = (statSync(file).size / 1048576).toFixed(1);
  const put = spawnSync('npx', ['wrangler', 'r2', 'object', 'put', `${MEDIA_BUCKET}${sitePath}`, '--file', file,
    '--content-type', type, '--cache-control', 'public, max-age=3600, stale-while-revalidate=86400', '--remote'],
  {stdio: ['ignore', 'ignore', 'inherit']});
  if (put.status === 0) console.log(`${mediaUrl(sitePath)} (${mb} MB)`);
  else failed++;
}
process.exit(failed ? 1 : 0);
