import { readLocalSessions } from '../data/local-sessions.js';
import type http from 'node:http';
import { IntentStore, WorkError } from '../data/intent-store.js';
import { readBody, sendJson, type Router } from '../router.js';
import type { SSEManager } from '../sse-manager.js';

export function registerWorkRoutes(
  router: Router,
  resolveRoot: (req: http.IncomingMessage) => string | undefined,
  sse: SSEManager,
): void {
  const handle =
    (mutation?: 'create' | 'update' | 'execution') =>
    async (req: http.IncomingMessage, res: http.ServerResponse, params: Record<string, string>) => {
      const root = resolveRoot(req);
      if (!root) return sendJson(res, { ok: false, error: 'No project selected' }, 404);
      const store = new IntentStore(root);
      try {
        if (!mutation) return sendJson(res, { ok: true, data: store.board() });
        const input = await readBody(req);
        const item =
          mutation === 'create'
            ? store.create(input)
            : mutation === 'execution'
              ? store.addExecution(params.id, input)
              : store.update(params.id, input);
        sse.broadcast('increment-update', { source: 'intent', intentId: item.id });
        sendJson(res, { ok: true, data: item }, mutation === 'create' ? 201 : 200);
      } catch (error) {
        if (error instanceof WorkError)
          return sendJson(res, { ok: false, error: error.message }, error.status);
        throw error;
      }
    };
  router.get('/api/work/sessions', async (req, res) => {
    const root = resolveRoot(req);
    sendJson(res, { ok: true, data: root ? readLocalSessions(root) : [] });
  });
  router.get('/api/work', handle());
  router.post('/api/work', handle('create'));
  router.patch('/api/work/:id', handle('update'));
  router.post('/api/work/:id/executions', handle('execution'));
}
