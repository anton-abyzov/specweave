import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../scripts/check-candidate-links.mjs', import.meta.url));
let missingCandidate = false;
let externalBroken = false;
let candidateHits = 0;
let externalHits = 0;
const external = createServer((_request, response) => {
  externalHits++;
  response.writeHead(externalBroken ? 404 : 200, { 'Content-Type': 'text/html' });
  response.end('External resource');
});
await new Promise(resolve => external.listen(0, '127.0.0.1', resolve));
const externalOrigin = `http://127.0.0.1:${external.address().port}`;
const candidate = createServer((request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname;
  if (path === '/') {
    const page = missingCandidate ? 'genuinely-missing' : 'jev';
    response.setHeader('Content-Type', 'text/html');
    response.end(`<html><head><link rel="canonical" href="https://spec-weave.com/${page}"></head><body><a href="https://www.spec-weave.com/${page}">Candidate page</a><a href="${externalOrigin}/resource">External</a></body></html>`);
  } else if (path === '/jev') {
    candidateHits++;
    response.setHeader('Content-Type', 'text/html');
    response.end('<html><body>New candidate Jev page</body></html>');
  } else {
    response.writeHead(404, { 'Content-Type': 'text/html' });
    response.end('Missing candidate page');
  }
});
await new Promise(resolve => candidate.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${candidate.address().port}`;
function check() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, origin], { stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', data => { output += data; });
    child.stderr.on('data', data => { output += data; });
    child.on('error', reject);
    child.on('close', code => resolve({ code, output }));
  });
}
async function close(server) {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
try {
  let result = await check();
  assert.equal(result.code, 0, result.output);
  assert.ok(candidateHits > 0, 'Absolute canonical link must request the candidate /jev route');
  assert.ok(externalHits > 0, 'External links must still be checked');
  missingCandidate = true;
  result = await check();
  assert.notEqual(result.code, 0, 'Missing first-party route must fail');
  assert.match(result.output, /genuinely-missing/);
  missingCandidate = false;
  externalBroken = true;
  result = await check();
  assert.notEqual(result.code, 0, 'Broken external link must still fail');
  assert.match(result.output, /resource/);
  console.log('Candidate link regression: new canonical route passes; missing candidate and external routes fail.');
} finally {
  await close(candidate);
  await close(external);
}
