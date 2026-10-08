/** A detached supervisor enforces the wall-clock budget even while Git blocks synchronously. */
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { CHECKPOINT_WORKER_TIMEOUT_MS, cleanupCheckpointRequest, runSessionCheckpoint } from './session-checkpoint.js';

const requestPath = process.argv[2];
if (requestPath) {
  if (process.argv[3] === '--capture') {
    void runSessionCheckpoint(requestPath).then(() => process.exit(0), () => process.exit(1));
  } else {
    const child = spawn(process.execPath, [fileURLToPath(import.meta.url), requestPath, '--capture'], {
      stdio: 'ignore', windowsHide: true, detached: process.platform !== 'win32',
    });
    const stopOwnProcessTree = () => {
      if (!child.pid) return;
      try {
        if (process.platform === 'win32') {
          spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true, timeout: 1000 });
        } else {
          // This process group was created above. It also contains any Git
          // helpers orphaned when a timed-out synchronous Git call was killed.
          process.kill(-child.pid, 'SIGKILL');
        }
      } catch { /* already exited */ }
    };
    const timer = setTimeout(stopOwnProcessTree, CHECKPOINT_WORKER_TIMEOUT_MS);
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      stopOwnProcessTree();
      cleanupCheckpointRequest(requestPath);
    };
    child.once('error', finish);
    child.once('exit', finish);
  }
}
