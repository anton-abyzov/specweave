import type http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { ProjectHubStore, HubError } from '../../../core/project-hub/store.js';
import { projectBrief } from '../../../core/project-hub/brief.js';
import { IntentStore, WorkError } from '../data/intent-store.js';
import { readBody, sendJson, type Router } from '../router.js';
import type { SSEManager } from '../sse-manager.js';

export function registerProjectHubRoutes(router: Router, resolveRoot: (req: http.IncomingMessage) => string | undefined, sse: SSEManager): void {
  const handle = (action: string) => async (req: http.IncomingMessage, res: http.ServerResponse, params: Record<string, string>) => {
    const root = resolveRoot(req);
    if (!root) return sendJson(res, { ok: false, error: 'No project selected' }, 404);
    try {
      const store = new ProjectHubStore(root);
      const work = new IntentStore(root);
      if (action === 'read') return sendJson(res, { ok: true, data: { hub: store.read(), work: work.board() } });
      if (action === 'brief') {
        const url = new URL(req.url!, 'http://localhost');
        const intentId = url.searchParams.get('intent');
        const intent = intentId ? work.board().items.find(item => item.id === intentId) : undefined;
        if (intentId && !intent) throw new HubError('Work item not found', 404);
        return sendJson(res, { ok: true, data: { text: projectBrief(store.read(), { intent,
          routineId: url.searchParams.get('routine') ?? undefined, harness: url.searchParams.get('harness') ?? undefined }) } });
      }
      if (action === 'download') {
        const artifact = store.read().artifacts.find(item => item.id === params.id && item.kind === 'file');
        if (!artifact) throw new HubError('File artifact not found', 404);
        const location = store.validateLocation(artifact.location);
        if (location.kind !== 'file') throw new HubError('Artifact is not a local file');
        const file = path.join(root, location.location);
        // Download, never execute or render user HTML in the dashboard origin.
        res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(path.basename(file))}`, 'X-Content-Type-Options': 'nosniff' });
        const stream = fs.createReadStream(file);
        stream.on('error', () => res.destroy());
        stream.pipe(res);
        return;
      }
      const input = await readBody(req);
      if (!input || typeof input !== 'object' || Array.isArray(input)) throw new HubError('Expected an object');
      const body = input as Record<string, unknown>;
      let result;
      if (action === 'profile') result = store.saveProfile(body);
      else if (action === 'artifact') result = store.addArtifact(body, work.board().items.map(item => item.id));
      else if (action === 'routine') result = store.addRoutine(body);
      else if (action === 'work') result = work.create(body);
      else result = store.remove(action === 'remove-artifact' ? 'artifact' : 'routine', params.id, body.revision);
      sse.broadcast('increment-update', { source: 'project-hub' });
      sendJson(res, { ok: true, data: result });
    } catch (error) {
      if (error instanceof HubError || error instanceof WorkError) return sendJson(res, { ok: false, error: error.message }, error.status);
      throw error;
    }
  };
  router.get('/api/project-hub', handle('read'));
  router.patch('/api/project-hub', handle('profile'));
  router.get('/api/project-hub/brief', handle('brief'));
  router.post('/api/project-hub/work', handle('work'));
  router.post('/api/project-hub/artifacts', handle('artifact'));
  router.delete('/api/project-hub/artifacts/:id', handle('remove-artifact'));
  router.get('/api/project-hub/artifacts/:id/download', handle('download'));
  router.post('/api/project-hub/routines', handle('routine'));
  router.delete('/api/project-hub/routines/:id', handle('remove-routine'));
}
