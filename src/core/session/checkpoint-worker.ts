/** A detached supervisor enforces the wall-clock budget even while Git blocks synchronously. */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { CHECKPOINT_WORKER_TIMEOUT_MS, cleanupCheckpointRequest, runSessionCheckpoint } from './session-checkpoint.js';

const requestPath = process.argv[2];
if (requestPath) {
  if (process.argv[3] === '--capture') {
    void runSessionCheckpoint(requestPath).then(() => process.exit(0), () => process.exit(1));
  } else {
    const child = spawn(process.execPath, [fileURLToPath(import.meta.url), requestPath, '--capture'], {
      stdio: 'ignore', windowsHide: true,
    });
    const timer = setTimeout(() => { child.kill('SIGKILL'); }, CHECKPOINT_WORKER_TIMEOUT_MS);
    const finish = () => {
      clearTimeout(timer);
      cleanupCheckpointRequest(requestPath);
    };
    child.once('error', finish);
    child.once('exit', finish);
  }
}
