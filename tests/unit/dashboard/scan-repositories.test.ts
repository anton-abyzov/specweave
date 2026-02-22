/**
 * Tests for scanRepositories — umbrella-managed badge detection
 * Increment: 0312-repos-umbrella-badge
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { scanRepositories } from '../../../src/dashboard/server/dashboard-server.js';

describe('scanRepositories', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scan-repos-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('umbrella-managed detection (AC-US1-01)', () => {
    it('sets isUmbrellaManaged on sub-repos without own .specweave when project root has .specweave', () => {
      // Project root has .specweave/
      fs.mkdirSync(path.join(tempDir, '.specweave'), { recursive: true });

      // Two sub-repos: one with .specweave, one without
      fs.mkdirSync(path.join(tempDir, 'repositories/my-org/repo-a'), { recursive: true });
      fs.mkdirSync(path.join(tempDir, 'repositories/my-org/repo-b/.specweave'), { recursive: true });

      const repos = scanRepositories(tempDir);

      const repoA = repos.find(r => r.name === 'repo-a');
      const repoB = repos.find(r => r.name === 'repo-b');

      expect(repoA).toBeDefined();
      expect(repoA!.hasSpecweave).toBe(false);
      expect(repoA!.isUmbrellaManaged).toBe(true);

      expect(repoB).toBeDefined();
      expect(repoB!.hasSpecweave).toBe(true);
      expect(repoB!.isUmbrellaManaged).toBeUndefined();
    });

    it('does NOT set isUmbrellaManaged when project root lacks .specweave', () => {
      // No .specweave/ at project root
      fs.mkdirSync(path.join(tempDir, 'repositories/org/repo-x'), { recursive: true });

      const repos = scanRepositories(tempDir);

      const repoX = repos.find(r => r.name === 'repo-x');
      expect(repoX).toBeDefined();
      expect(repoX!.hasSpecweave).toBe(false);
      expect(repoX!.isUmbrellaManaged).toBeUndefined();
    });
  });

  describe('multi-repo scanning', () => {
    it('scans repositories/<org>/<repo> structure', () => {
      fs.mkdirSync(path.join(tempDir, 'repositories/acme/frontend'), { recursive: true });
      fs.mkdirSync(path.join(tempDir, 'repositories/acme/backend'), { recursive: true });

      const repos = scanRepositories(tempDir);

      expect(repos).toHaveLength(2);
      expect(repos.map(r => r.name).sort()).toEqual(['backend', 'frontend']);
      expect(repos.every(r => r.org === 'acme')).toBe(true);
    });

    it('returns repos sorted by name', () => {
      fs.mkdirSync(path.join(tempDir, 'repositories/org/zeta'), { recursive: true });
      fs.mkdirSync(path.join(tempDir, 'repositories/org/alpha'), { recursive: true });
      fs.mkdirSync(path.join(tempDir, 'repositories/org/mid'), { recursive: true });

      const repos = scanRepositories(tempDir);

      expect(repos.map(r => r.name)).toEqual(['alpha', 'mid', 'zeta']);
    });
  });

  describe('single-repo fallback', () => {
    it('falls back to project root when no repositories/ directory exists and .git is present', () => {
      // Create a minimal .git structure
      fs.mkdirSync(path.join(tempDir, '.git'), { recursive: true });
      fs.writeFileSync(path.join(tempDir, '.git/HEAD'), 'ref: refs/heads/main\n');

      const repos = scanRepositories(tempDir);

      expect(repos).toHaveLength(1);
      expect(repos[0].isCurrent).toBe(true);
      expect(repos[0].branch).toBe('main');
    });

    it('returns empty array when no repositories/ and no .git', () => {
      const repos = scanRepositories(tempDir);
      expect(repos).toEqual([]);
    });
  });

  describe('KPI count logic (AC-US1-03)', () => {
    it('umbrella-managed repos should be counted alongside hasSpecweave repos', () => {
      fs.mkdirSync(path.join(tempDir, '.specweave'), { recursive: true });
      fs.mkdirSync(path.join(tempDir, 'repositories/org/repo-own/.specweave'), { recursive: true });
      fs.mkdirSync(path.join(tempDir, 'repositories/org/repo-umbrella-1'), { recursive: true });
      fs.mkdirSync(path.join(tempDir, 'repositories/org/repo-umbrella-2'), { recursive: true });

      const repos = scanRepositories(tempDir);

      // Replicate the KPI logic from ReposPage.tsx
      const withSpecweave = repos.filter(r => r.hasSpecweave || r.isUmbrellaManaged).length;

      expect(withSpecweave).toBe(3); // 1 own + 2 umbrella-managed
    });
  });
});
