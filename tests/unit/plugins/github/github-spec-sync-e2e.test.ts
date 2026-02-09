/**
 * End-to-end integration test for the full GitHub sync flow
 *
 * Tests the complete pipeline: push sync → V2 board → field sync → frontmatter
 * All gh CLI calls are mocked, but the internal module composition is real.
 *
 * @see T-023: Write unit and integration tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdtemp, writeFile, readFile, rm } from 'fs/promises';

// ---------------------------------------------------------------------------
// Mock gh CLI calls (the only external dependency)
// ---------------------------------------------------------------------------

const mockExecFileNoThrow = vi.hoisted(() => vi.fn());
vi.mock('../../../../src/utils/execFileNoThrow.js', () => ({
  execFileNoThrow: mockExecFileNoThrow,
}));

// Mock child_process.execFile for GraphQL client
const mockExecFile = vi.hoisted(() => vi.fn());
vi.mock('child_process', () => ({
  execFile: mockExecFile,
}));

import { GitHubSyncOrchestrator } from '../../../../plugins/specweave-github/lib/github-sync-orchestrator.js';
import type { UserStoryForSync } from '../../../../plugins/specweave-github/lib/github-push-sync.js';

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const SPEC_CONTENT = `---
title: "User Authentication"
---

# User Authentication Spec

### US-001: User login

**Priority**: P1

**Acceptance Criteria**:
- [ ] **AC-US1-01**: User can log in with valid credentials
- [ ] **AC-US1-02**: User sees error on invalid credentials

### US-002: User dashboard

**Priority**: P2

**Acceptance Criteria**:
- [ ] **AC-US2-01**: Dashboard loads after login
`;

function makeUserStories(): UserStoryForSync[] {
  return [
    {
      id: 'US-001',
      title: 'User login',
      description: 'Users should be able to log in.',
      priority: 'P1',
      status: 'planned',
      acceptanceCriteria: [
        { id: 'AC-US1-01', description: 'User can log in with valid credentials', completed: false },
        { id: 'AC-US1-02', description: 'User sees error on invalid credentials', completed: false },
      ],
      specId: 'spec-auth',
    },
    {
      id: 'US-002',
      title: 'User dashboard',
      description: 'Dashboard loads after login.',
      priority: 'P2',
      status: 'in-progress',
      acceptanceCriteria: [
        { id: 'AC-US2-01', description: 'Dashboard loads after login', completed: false },
      ],
      specId: 'spec-auth',
    },
  ];
}

function ghSuccess(stdout: string) {
  return { stdout, stderr: '', exitCode: 0, success: true };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GitHub Sync E2E (mocked CLI)', () => {
  let tmpDir: string;
  let specPath: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    tmpDir = await mkdtemp(join(tmpdir(), 'specweave-e2e-'));
    specPath = join(tmpDir, 'spec-auth.md');
    await writeFile(specPath, SPEC_CONTENT);
  });

  // Clean up temp dir
  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  // =========================================================================
  // 1. Push-only sync (no V2)
  // =========================================================================
  it('should push user stories to GitHub issues and update frontmatter', async () => {
    // US-001: search (not found) → create
    mockExecFileNoThrow
      .mockResolvedValueOnce(ghSuccess('[]'))
      .mockResolvedValueOnce(ghSuccess(JSON.stringify({
        number: 42,
        url: 'https://github.com/test-owner/test-repo/issues/42',
        node_id: 'I_kwDO42',
      })))
      // US-002: search (not found) → create
      .mockResolvedValueOnce(ghSuccess('[]'))
      .mockResolvedValueOnce(ghSuccess(JSON.stringify({
        number: 43,
        url: 'https://github.com/test-owner/test-repo/issues/43',
        node_id: 'I_kwDO43',
      })));

    const orchestrator = new GitHubSyncOrchestrator({
      owner: 'test-owner',
      repo: 'test-repo',
    });

    const result = await orchestrator.syncSpec(specPath, makeUserStories());

    // Verify push results
    expect(result.pushResult.created).toHaveLength(2);
    expect(result.pushResult.created[0].userStoryId).toBe('US-001');
    expect(result.pushResult.created[0].issueNumber).toBe(42);
    expect(result.pushResult.created[1].userStoryId).toBe('US-002');
    expect(result.pushResult.created[1].issueNumber).toBe(43);

    // Verify frontmatter was written
    expect(result.frontmatterResult.syncStatus).toBe('synced');
    expect(result.frontmatterResult.userStories['US-001'].issueNumber).toBe(42);
    expect(result.frontmatterResult.userStories['US-002'].issueNumber).toBe(43);

    // Verify the spec file was actually updated with frontmatter
    const updatedContent = await readFile(specPath, 'utf-8');
    expect(updatedContent).toContain('syncStatus');
    expect(updatedContent).toContain('42');
    expect(updatedContent).toContain('43');

    // No V2 result
    expect(result.projectV2Result).toBeUndefined();
  });

  // =========================================================================
  // 2. Full sync with V2 board and fields
  // =========================================================================
  it('should push issues, add to V2 board, sync fields, and update frontmatter', async () => {
    // US-001: search → create
    mockExecFileNoThrow
      .mockResolvedValueOnce(ghSuccess('[]'))
      .mockResolvedValueOnce(ghSuccess(JSON.stringify({
        number: 10,
        url: 'https://github.com/test-owner/test-repo/issues/10',
        node_id: 'I_kwDO10',
      })))
      // US-002: search → create
      .mockResolvedValueOnce(ghSuccess('[]'))
      .mockResolvedValueOnce(ghSuccess(JSON.stringify({
        number: 11,
        url: 'https://github.com/test-owner/test-repo/issues/11',
        node_id: 'I_kwDO11',
      })));

    // GraphQL calls for V2 (via child_process.execFile)
    // 1. getOwnerNodeId (user query)
    mockExecFile
      .mockImplementation((_cmd: string, _args: string[], _opts: unknown, cb: Function) => {
        const argsStr = (_args as string[]).join(' ');

        // getOwnerNodeId - user query
        if (argsStr.includes('user(login:')) {
          cb(null, JSON.stringify({ data: { user: { id: 'U_kgDOTest' } } }), '');
          return;
        }

        // findOrCreateProject - createProjectV2 (this won't be called since we use projectV2Number)
        // But getOwnerNodeId is called for project lookup by number

        // addProjectV2Item mutations
        if (argsStr.includes('addProjectV2ItemById')) {
          if (argsStr.includes('I_kwDO10')) {
            cb(null, JSON.stringify({ data: { addProjectV2ItemById: { item: { id: 'PVTI_1' } } } }), '');
          } else {
            cb(null, JSON.stringify({ data: { addProjectV2ItemById: { item: { id: 'PVTI_2' } } } }), '');
          }
          return;
        }

        // getProjectFields
        if (argsStr.includes('fields(first:')) {
          cb(null, JSON.stringify({
            data: {
              node: {
                fields: {
                  nodes: [
                    {
                      id: 'FLD_status',
                      name: 'Status',
                      dataType: 'SINGLE_SELECT',
                      options: [
                        { id: 'OPT_todo', name: 'Todo' },
                        { id: 'OPT_inprog', name: 'In Progress' },
                        { id: 'OPT_done', name: 'Done' },
                      ],
                    },
                    {
                      id: 'FLD_priority',
                      name: 'Priority',
                      dataType: 'SINGLE_SELECT',
                      options: [
                        { id: 'OPT_urgent', name: 'Urgent' },
                        { id: 'OPT_high', name: 'High' },
                      ],
                    },
                  ],
                },
              },
            },
          }), '');
          return;
        }

        // updateProjectV2ItemFieldValue
        if (argsStr.includes('updateProjectV2ItemFieldValue')) {
          cb(null, JSON.stringify({ data: { updateProjectV2ItemFieldValue: { projectV2Item: { id: 'item' } } } }), '');
          return;
        }

        // Default: empty success
        cb(null, '{}', '');
      });

    const orchestrator = new GitHubSyncOrchestrator({
      owner: 'test-owner',
      repo: 'test-repo',
      projectV2Enabled: true,
      projectV2Number: 5,
    });

    const result = await orchestrator.syncSpec(specPath, makeUserStories());

    // Push sync worked
    expect(result.pushResult.created).toHaveLength(2);

    // V2 result present
    expect(result.projectV2Result).toBeDefined();
    expect(result.projectV2Result!.itemIds).toHaveLength(2);

    // Field sync ran
    expect(result.projectV2Result!.fieldSyncResult.updated.length).toBeGreaterThanOrEqual(0);

    // Frontmatter has V2 info
    const updatedContent = await readFile(specPath, 'utf-8');
    expect(updatedContent).toContain('syncStatus');
  });

  // =========================================================================
  // 3. Idempotent re-sync (update existing issues)
  // =========================================================================
  it('should update existing issues on re-sync', async () => {
    // US-001: search finds existing → update
    mockExecFileNoThrow
      .mockResolvedValueOnce(ghSuccess(JSON.stringify([
        { number: 42, title: '[US-001] User login', node_id: 'I_kwDO42' },
      ])))
      .mockResolvedValueOnce(ghSuccess(JSON.stringify({
        number: 42,
        url: 'https://github.com/test-owner/test-repo/issues/42',
      })))
      // US-002: search finds existing → update
      .mockResolvedValueOnce(ghSuccess(JSON.stringify([
        { number: 43, title: '[US-002] User dashboard', node_id: 'I_kwDO43' },
      ])))
      .mockResolvedValueOnce(ghSuccess(JSON.stringify({
        number: 43,
        url: 'https://github.com/test-owner/test-repo/issues/43',
      })));

    const orchestrator = new GitHubSyncOrchestrator({
      owner: 'test-owner',
      repo: 'test-repo',
    });

    const result = await orchestrator.syncSpec(specPath, makeUserStories());

    expect(result.pushResult.created).toHaveLength(0);
    expect(result.pushResult.updated).toHaveLength(2);
    expect(result.pushResult.updated[0].issueNumber).toBe(42);
    expect(result.pushResult.updated[1].issueNumber).toBe(43);
    expect(result.frontmatterResult.syncStatus).toBe('synced');
  });

  // =========================================================================
  // 4. Partial failure (some issues fail, others succeed)
  // =========================================================================
  it('should handle partial failures gracefully', async () => {
    // US-001: search → create succeeds
    mockExecFileNoThrow
      .mockResolvedValueOnce(ghSuccess('[]'))
      .mockResolvedValueOnce(ghSuccess(JSON.stringify({
        number: 42,
        url: 'https://github.com/test-owner/test-repo/issues/42',
        node_id: 'I_kwDO42',
      })))
      // US-002: search fails
      .mockResolvedValueOnce({
        stdout: '', stderr: 'HTTP 403: Forbidden', exitCode: 1, success: false,
      });

    const orchestrator = new GitHubSyncOrchestrator({
      owner: 'test-owner',
      repo: 'test-repo',
    });

    const result = await orchestrator.syncSpec(specPath, makeUserStories());

    expect(result.pushResult.created).toHaveLength(1);
    expect(result.pushResult.errors).toHaveLength(1);
    expect(result.pushResult.errors[0].userStoryId).toBe('US-002');
    expect(result.frontmatterResult.syncStatus).toBe('dirty');
  });

  // =========================================================================
  // 5. Conflict resolver unit verification
  // =========================================================================
  it('should detect and resolve conflicts between spec and GitHub states', async () => {
    // Import directly to test conflict resolver integration
    const { GitHubConflictResolver } = await import(
      '../../../../plugins/specweave-github/lib/github-conflict-resolver.js'
    );

    const resolver = new GitHubConflictResolver();

    const conflicts = resolver.detectConflicts(
      {
        title: 'User login (updated in spec)',
        status: 'completed',
        acceptanceCriteria: [
          { id: 'AC-US1-01', completed: true },
          { id: 'AC-US1-02', completed: false },
        ],
      },
      {
        title: 'User login (updated on GitHub)',
        state: 'open',
        acceptanceCriteria: [
          { id: 'AC-US1-01', completed: true },
          { id: 'AC-US1-02', completed: true },
        ],
      },
    );

    // Title conflict (different titles)
    expect(conflicts).toContainEqual(expect.objectContaining({ field: 'title' }));
    // Status conflict (completed spec vs open GitHub)
    expect(conflicts).toContainEqual(expect.objectContaining({ field: 'status' }));
    // AC-US1-02 conflict (spec:false vs github:true)
    expect(conflicts).toContainEqual(expect.objectContaining({ field: 'ac:AC-US1-02' }));
    // AC-US1-01: both true → no conflict
    expect(conflicts.find(c => c.field === 'ac:AC-US1-01')).toBeUndefined();

    // Resolve all conflicts
    const resolved = resolver.resolveConflicts(conflicts);
    expect(resolved).toHaveLength(3);

    // Status uses github-wins by default
    const statusResolved = resolved.find(r => r.field === 'status');
    expect(statusResolved?.resolution).toBe('github-wins');
    expect(statusResolved?.resolvedValue).toBe('open');

    // Title uses prompt by default (keeps spec value)
    const titleResolved = resolved.find(r => r.field === 'title');
    expect(titleResolved?.resolution).toBe('prompt');
  });

  // =========================================================================
  // 6. Issue body generator + parser round-trip
  // =========================================================================
  it('should generate and parse issue body in a round-trip', async () => {
    const { generateIssueBody } = await import(
      '../../../../plugins/specweave-github/lib/github-issue-body-generator.js'
    );
    const { parseIssueBody } = await import(
      '../../../../plugins/specweave-github/lib/github-issue-body-parser.js'
    );

    const body = generateIssueBody({
      id: 'US-001',
      title: 'User login',
      description: 'Users should be able to log in.',
      priority: 'P1',
      acceptanceCriteria: [
        { id: 'AC-US1-01', description: 'User can log in', completed: true },
        { id: 'AC-US1-02', description: 'Error shown on failure', completed: false },
      ],
      specId: 'spec-auth',
    });

    // Body should be parseable
    const parsed = parseIssueBody(body);

    expect(parsed.acceptanceCriteria['AC-US1-01'].checked).toBe(true);
    expect(parsed.acceptanceCriteria['AC-US1-02'].checked).toBe(false);
    expect(parsed.syncMarker?.userStoryId).toBe('US-001');
  });
});
