import type http from 'node:http';
import { buildPlanTimeline } from '../data/plan-timeline.js';
import { sendJson, type Router } from '../router.js';
import type { PlanTimelinePayload } from '../../work-types.js';

/** Reads every increment folder; a short cache keeps the Timeline's polling cheap. */
const CACHE_MS = 5000;

export function registerPlanRoutes(router: Router, resolveRoot: (req: http.IncomingMessage) => string | undefined): void {
  const cache = new Map<string, { at: number; data: PlanTimelinePayload }>();
  router.get('/api/plan', async (req, res) => {
    const root = resolveRoot(req);
    if (!root) return sendJson(res, { ok: false, error: 'No project selected' }, 404);
    const hit = cache.get(root);
    if (hit && Date.now() - hit.at < CACHE_MS) return sendJson(res, { ok: true, data: hit.data });
    const data = buildPlanTimeline(root);
    cache.set(root, { at: Date.now(), data });
    sendJson(res, { ok: true, data });
  });
}
