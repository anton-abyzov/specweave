/**
 * Workspace API route handlers
 *
 * CRUD operations for workspace configuration (repos, sync mappings).
 * Used by the dashboard WorkspacePage.
 */

import * as http from 'http';
import { ConfigManager } from '../../../core/config/config-manager.js';
import { sendJson } from '../router.js';
import type { WorkspaceRepo, WorkspaceRepoSync } from '../../../core/config/types.js';

function validateSyncStructure(sync: unknown): string | null {
  if (sync == null) return null;
  if (typeof sync !== 'object') return 'sync must be an object';
  const s = sync as Record<string, unknown>;
  for (const key of ['github', 'jira', 'ado']) {
    if (s[key] != null && typeof s[key] !== 'object') {
      return `sync.${key} must be an object`;
    }
  }
  return null;
}

export function createWorkspaceRouteHandlers(projectRoot: string) {
  const configManager = new ConfigManager(projectRoot);

  return {
    /** GET /api/workspace — return workspace config */
    async getWorkspace(
      _req: http.IncomingMessage,
      res: http.ServerResponse,
      _params: Record<string, string>,
    ): Promise<void> {
      const config = await configManager.read();
      const ws = config.workspace;
      sendJson(res, {
        name: ws?.name ?? '',
        rootRepo: ws?.rootRepo ?? null,
        repos: ws?.repos ?? [],
      });
    },

    /** PATCH /api/workspace/repos/:id — merge body into matching repo */
    async patchRepo(
      _req: http.IncomingMessage,
      res: http.ServerResponse,
      params: Record<string, string>,
      body: Record<string, unknown>,
    ): Promise<void> {
      // Validate sync if present
      if (body.sync != null) {
        const syncErr = validateSyncStructure(body.sync);
        if (syncErr) {
          sendJson(res, { error: syncErr }, 400);
          return;
        }
      }

      const config = await configManager.read();
      if (!config.workspace) {
        sendJson(res, { error: 'No workspace configured' }, 404);
        return;
      }

      const idx = config.workspace.repos.findIndex(r => r.id === params.id);
      if (idx === -1) {
        sendJson(res, { error: `Repo '${params.id}' not found` }, 404);
        return;
      }

      // Merge — don't allow changing id
      const { id: _ignoreId, ...updates } = body;
      const existing = config.workspace.repos[idx];
      const merged: WorkspaceRepo = {
        ...existing,
        ...updates as Partial<WorkspaceRepo>,
      };
      // Deep-merge sync if both exist
      if (updates.sync && existing.sync) {
        merged.sync = { ...existing.sync, ...(updates.sync as Partial<WorkspaceRepoSync>) };
      }
      config.workspace.repos[idx] = merged;

      await configManager.write(config);
      sendJson(res, merged);
    },

    /** POST /api/workspace/repos — append new repo */
    async postRepo(
      _req: http.IncomingMessage,
      res: http.ServerResponse,
      _params: Record<string, string>,
      body: Record<string, unknown>,
    ): Promise<void> {
      const { id, path, prefix } = body as { id?: string; path?: string; prefix?: string };

      // Validate required fields
      if (!id || !path || !prefix) {
        sendJson(res, { error: 'Fields id, path, and prefix are required' }, 400);
        return;
      }

      // Validate sync if present
      if (body.sync != null) {
        const syncErr = validateSyncStructure(body.sync);
        if (syncErr) {
          sendJson(res, { error: syncErr }, 400);
          return;
        }
      }

      const config = await configManager.read();
      if (!config.workspace) {
        config.workspace = { name: '', repos: [] };
      }

      // Check duplicate
      if (config.workspace.repos.some(r => r.id === id)) {
        sendJson(res, { error: `Repo '${id}' already exists` }, 400);
        return;
      }

      const newRepo: WorkspaceRepo = {
        id,
        path,
        prefix,
        ...(body.name ? { name: body.name as string } : {}),
        ...(body.techStack ? { techStack: body.techStack as string[] } : {}),
        ...(body.role ? { role: body.role as string } : {}),
        ...(body.sync ? { sync: body.sync as WorkspaceRepoSync } : {}),
      };

      config.workspace.repos.push(newRepo);
      await configManager.write(config);
      sendJson(res, newRepo, 201);
    },

    /** DELETE /api/workspace/repos/:id — remove repo */
    async deleteRepo(
      _req: http.IncomingMessage,
      res: http.ServerResponse,
      params: Record<string, string>,
    ): Promise<void> {
      const config = await configManager.read();
      if (!config.workspace) {
        sendJson(res, { error: `Repo '${params.id}' not found` }, 404);
        return;
      }

      const idx = config.workspace.repos.findIndex(r => r.id === params.id);
      if (idx === -1) {
        sendJson(res, { error: `Repo '${params.id}' not found` }, 404);
        return;
      }

      config.workspace.repos.splice(idx, 1);
      await configManager.write(config);
      res.writeHead(204);
      res.end();
    },
  };
}
