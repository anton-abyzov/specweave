---
increment: 0160-plugin-cache-health-monitoring
status: planning
dependencies: []
phases:
  - core-types
  - metadata-manager
  - health-monitor
  - version-detector
  - invalidator
  - startup-checker
  - cli-commands
  - integration
  - testing
estimated_tasks: 28
estimated_weeks: 2-3
---

# Plugin Cache Health Monitoring - Implementation Tasks

## Phase 1: Core Types & Infrastructure

### T-001: Create core types module
**User Story**: US-001 | **Satisfies ACs**: AC-US1-02 | **Status**: [x] completed
**Model**: ⚡ Haiku

Create TypeScript interfaces for cache metadata, staleness results, and health issues.

**Dependencies**: None

**Test Plan** (TDD - RED phase):
```typescript
// tests/unit/plugin-cache/types.test.ts
describe('CacheMetadata', () => {
  it('should validate required fields', () => {
    const validMetadata: CacheMetadata = {
      pluginName: 'sw',
      version: '1.0.0',
      commitSha: 'abc123',
      lastUpdated: '2026-01-07T19:50:00Z',
      checksums: { 'hooks/reflect.sh': 'def456' }
    };
    expect(validateMetadata(validMetadata)).toBe(true);
  });

  it('should reject invalid metadata', () => {
    const invalid = { pluginName: 'sw' }; // missing required fields
    expect(validateMetadata(invalid)).toBe(false);
  });
});

describe('StalenessResult', () => {
  it('should categorize severity correctly', () => {
    const critical: StalenessResult = {
      stale: true,
      reason: 'merge_conflict',
      severity: 'critical'
    };
    expect(critical.severity).toBe('critical');
  });
});
```

**Files**:
- `src/core/plugin-cache/types.ts`
- `tests/unit/plugin-cache/types.test.ts`

---

### T-002: Create cache metadata manager
**User Story**: US-001 | **Satisfies ACs**: AC-US1-03, AC-US1-04, AC-US1-05 | **Status**: [x] completed
**Model**: 💎 Opus

Implement CacheMetadataManager class with read/write/compute functions.

**Dependencies**: T-001

**Test Plan** (TDD - RED phase):
```typescript
// tests/unit/plugin-cache/cache-metadata.test.ts
describe('CacheMetadataManager', () => {
  beforeEach(() => {
    // Setup test cache directory
    mockCacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cache-'));
  });

  describe('readMetadata', () => {
    it('should read valid metadata file', () => {
      const metadataPath = path.join(mockCacheDir, '.cache-metadata.json');
      fs.writeFileSync(metadataPath, JSON.stringify({
        pluginName: 'sw',
        version: '1.0.0',
        commitSha: 'abc123',
        lastUpdated: '2026-01-07T00:00:00Z',
        checksums: {}
      }));

      const result = CacheMetadataManager.readMetadata(mockCacheDir);
      expect(result).not.toBeNull();
      expect(result?.pluginName).toBe('sw');
    });

    it('should return null for missing file', () => {
      const result = CacheMetadataManager.readMetadata('/nonexistent');
      expect(result).toBeNull();
    });

    it('should return null for invalid JSON', () => {
      const metadataPath = path.join(mockCacheDir, '.cache-metadata.json');
      fs.writeFileSync(metadataPath, 'invalid json');
      const result = CacheMetadataManager.readMetadata(mockCacheDir);
      expect(result).toBeNull();
    });
  });

  describe('writeMetadata', () => {
    it('should write metadata with validation', () => {
      const metadata: CacheMetadata = {
        pluginName: 'sw',
        version: '1.0.0',
        commitSha: 'abc123',
        lastUpdated: new Date().toISOString(),
        checksums: { 'file.js': 'hash123' }
      };

      CacheMetadataManager.writeMetadata(mockCacheDir, metadata);

      const written = fs.readFileSync(
        path.join(mockCacheDir, '.cache-metadata.json'),
        'utf8'
      );
      const parsed = JSON.parse(written);
      expect(parsed.pluginName).toBe('sw');
    });

    it('should throw on invalid metadata', () => {
      const invalid = { pluginName: 'sw' } as CacheMetadata;
      expect(() => {
        CacheMetadataManager.writeMetadata(mockCacheDir, invalid);
      }).toThrow();
    });
  });

  describe('getPluginCachePath', () => {
    it('should resolve correct cache path', () => {
      const result = CacheMetadataManager.getPluginCachePath('sw', '1.0.0');
      expect(result).toContain('.claude/plugins/cache/specweave/sw/1.0.0');
    });
  });

  describe('computeChecksum', () => {
    it('should compute SHA256 correctly', () => {
      const testFile = path.join(mockCacheDir, 'test.txt');
      fs.writeFileSync(testFile, 'test content');

      const checksum = CacheMetadataManager['computeChecksum'](testFile);
      expect(checksum).toMatch(/^[a-f0-9]{64}$/); // Valid SHA256
    });
  });
});
```

**Files**:
- `src/core/plugin-cache/cache-metadata.ts`
- `tests/unit/plugin-cache/cache-metadata.test.ts`

---

## Phase 2: Cache Health Monitor

### T-003: Implement merge conflict detector
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01 | **Status**: [x] completed
**Model**: ⚡ Haiku

Detect merge conflict markers in any file using regex pattern matching.

**Dependencies**: T-001

**Test Plan** (TDD - RED phase):
```typescript
// tests/unit/plugin-cache/merge-conflict-detector.test.ts
describe('detectMergeConflicts', () => {
  it('should detect <<<<<<< marker', () => {
    const content = `
      <<<<<<< HEAD
      const x = 1;
      =======
      const x = 2;
      >>>>>>> branch
    `;
    expect(detectMergeConflicts(content)).toBe(true);
  });

  it('should detect ======= marker', () => {
    const content = 'some code\n=======\nmore code';
    expect(detectMergeConflicts(content)).toBe(true);
  });

  it('should detect >>>>>>> marker', () => {
    const content = '>>>>>>> df087427 (commit message)';
    expect(detectMergeConflicts(content)).toBe(true);
  });

  it('should not detect false positives', () => {
    const content = '// This is a comment with < and > symbols';
    expect(detectMergeConflicts(content)).toBe(false);
  });

  it('should handle empty files', () => {
    expect(detectMergeConflicts('')).toBe(false);
  });
});
```

**Files**:
- `src/core/plugin-cache/merge-conflict-detector.ts`
- `tests/unit/plugin-cache/merge-conflict-detector.test.ts`

---

### T-004: Implement bash syntax validator
**User Story**: US-002 | **Satisfies ACs**: AC-US2-02 | **Status**: [x] completed
**Model**: 💎 Opus

Validate shell scripts using `bash -n` with timeout and error capture.

**Dependencies**: T-001

**Test Plan** (TDD - RED phase):
```typescript
// tests/unit/plugin-cache/bash-validator.test.ts
describe('validateBashSyntax', () => {
  it('should pass valid bash script', () => {
    const validScript = `#!/bin/bash\necho "hello"`;
    fs.writeFileSync('/tmp/valid.sh', validScript);

    const result = validateBashSyntax('/tmp/valid.sh');
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should fail script with syntax error', () => {
    const invalidScript = `#!/bin/bash\nif [ test; then`;
    fs.writeFileSync('/tmp/invalid.sh', invalidScript);

    const result = validateBashSyntax('/tmp/invalid.sh');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('syntax error');
  });

  it('should timeout on long-running validation', () => {
    // bash -n shouldn't hang, but test timeout mechanism
    const result = validateBashSyntax('/tmp/test.sh', { timeout: 100 });
    // Should complete within timeout
  });

  it('should handle non-existent files gracefully', () => {
    const result = validateBashSyntax('/nonexistent.sh');
    expect(result.valid).toBe(false);
  });
});
```

**Files**:
- `src/core/plugin-cache/bash-validator.ts`
- `tests/unit/plugin-cache/bash-validator.test.ts`

---

### T-005: Implement checksum validator
**User Story**: US-002 | **Satisfies ACs**: AC-US2-03 | **Status**: [x] completed
**Model**: ⚡ Haiku

Compute SHA256 checksums and compare against metadata.

**Dependencies**: T-002

**Test Plan** (TDD - RED phase):
```typescript
// tests/unit/plugin-cache/checksum-validator.test.ts
describe('validateChecksums', () => {
  it('should pass when checksums match', () => {
    const testFile = '/tmp/test.txt';
    fs.writeFileSync(testFile, 'test content');

    const metadata: CacheMetadata = {
      pluginName: 'sw',
      version: '1.0.0',
      commitSha: 'abc',
      lastUpdated: new Date().toISOString(),
      checksums: {
        'test.txt': computeSHA256(testFile)
      }
    };

    const issues = validateChecksums('/tmp', metadata);
    expect(issues).toHaveLength(0);
  });

  it('should detect checksum mismatch', () => {
    const testFile = '/tmp/test.txt';
    fs.writeFileSync(testFile, 'test content');

    const metadata: CacheMetadata = {
      pluginName: 'sw',
      version: '1.0.0',
      commitSha: 'abc',
      lastUpdated: new Date().toISOString(),
      checksums: {
        'test.txt': 'wrong_checksum'
      }
    };

    const issues = validateChecksums('/tmp', metadata);
    expect(issues).toHaveLength(1);
    expect(issues[0].type).toBe('checksum_mismatch');
    expect(issues[0].severity).toBe('medium');
  });
});
```

**Files**:
- `src/core/plugin-cache/checksum-validator.ts`
- `tests/unit/plugin-cache/checksum-validator.test.ts`

---

### T-006: Create CacheHealthMonitor orchestrator
**User Story**: US-002 | **Satisfies ACs**: AC-US2-05, AC-US2-06 | **Status**: [x] completed
**Model**: 💎 Opus

Orchestrate all validation checks and return structured health report.

**Dependencies**: T-003, T-004, T-005

**Test Plan** (TDD - RED phase):
```typescript
// tests/unit/plugin-cache/cache-health-monitor.test.ts
describe('CacheHealthMonitor', () => {
  let monitor: CacheHealthMonitor;
  let mockCacheDir: string;

  beforeEach(() => {
    monitor = new CacheHealthMonitor();
    mockCacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'plugin-'));
  });

  describe('checkPluginHealth', () => {
    it('should report healthy for valid plugin', async () => {
      // Setup valid plugin cache
      const metadata: CacheMetadata = {
        pluginName: 'sw',
        version: '1.0.0',
        commitSha: 'abc123',
        lastUpdated: new Date().toISOString(),
        checksums: {}
      };
      fs.writeFileSync(
        path.join(mockCacheDir, '.cache-metadata.json'),
        JSON.stringify(metadata)
      );

      const result = await monitor.checkPluginHealth('sw', '1.0.0');
      expect(result.healthy).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect merge conflicts', async () => {
      const scriptPath = path.join(mockCacheDir, 'test.sh');
      fs.writeFileSync(scriptPath, '<<<<<<< HEAD\ncode\n=======\n');

      const result = await monitor.checkPluginHealth('sw', '1.0.0');
      expect(result.healthy).toBe(false);
      expect(result.issues[0].type).toBe('merge_conflict');
      expect(result.issues[0].severity).toBe('critical');
    });

    it('should detect syntax errors', async () => {
      const scriptPath = path.join(mockCacheDir, 'bad.sh');
      fs.writeFileSync(scriptPath, '#!/bin/bash\nif [ ; then');

      const result = await monitor.checkPluginHealth('sw', '1.0.0');
      const syntaxIssue = result.issues.find(i => i.type === 'syntax_error');
      expect(syntaxIssue).toBeDefined();
      expect(syntaxIssue?.severity).toBe('critical');
    });
  });
});
```

**Files**:
- `src/core/plugin-cache/cache-health-monitor.ts`
- `tests/unit/plugin-cache/cache-health-monitor.test.ts`

---

## Phase 3: GitHub Version Detector

### T-007: Implement GitHub API client with rate limiting
**User Story**: US-003 | **Satisfies ACs**: AC-US3-05, AC-US3-06 | **Status**: [x] completed
**Model**: 💎 Opus

Create GitHub API wrapper with rate limit checking and local caching.

**Dependencies**: T-001

**Test Plan** (TDD - RED phase):
```typescript
// tests/unit/plugin-cache/github-api-client.test.ts
describe('GitHubAPIClient', () => {
  let client: GitHubAPIClient;

  beforeEach(() => {
    client = new GitHubAPIClient();
  });

  describe('withRateLimit', () => {
    it('should check rate limit before API call', async () => {
      // Mock GitHub rate limit response
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            rate: { remaining: 100, reset: Date.now() / 1000 + 3600 }
          })
        });

      const result = await client['withRateLimit'](async () => 'success');
      expect(result).toBe('success');
    });

    it('should wait when rate limit low', async () => {
      const resetTime = Date.now() / 1000 + 2; // 2 seconds from now

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            rate: { remaining: 5, reset: resetTime }
          })
        });

      const startTime = Date.now();
      await client['withRateLimit'](async () => 'success');
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeGreaterThanOrEqual(2000);
    });
  });

  describe('getCached', () => {
    it('should return cached data within TTL', () => {
      client['setCached']('test-key', { value: 'data' }, 5000);
      const result = client['getCached']('test-key');
      expect(result).toEqual({ value: 'data' });
    });

    it('should return null for expired cache', async () => {
      client['setCached']('test-key', { value: 'data' }, 100);
      await new Promise(resolve => setTimeout(resolve, 150));
      const result = client['getCached']('test-key');
      expect(result).toBeNull();
    });
  });
});
```

**Files**:
- `src/core/plugin-cache/github-api-client.ts`
- `tests/unit/plugin-cache/github-api-client.test.ts`

---

### T-008: Implement commit SHA fetcher
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01 | **Status**: [x] completed
**Model**: ⚡ Haiku

Fetch latest commit SHA for plugin path from GitHub.

**Dependencies**: T-007

**Test Plan** (TDD - RED phase):
```typescript
// tests/unit/plugin-cache/commit-fetcher.test.ts
describe('getGitHubLatestCommit', () => {
  it('should fetch latest commit SHA', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ sha: 'abc123def456' }]
    });

    const sha = await detector.getGitHubLatestCommit('plugins/specweave');
    expect(sha).toBe('abc123def456');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('commits?path=plugins/specweave'),
      expect.any(Object)
    );
  });

  it('should include auth header when GITHUB_TOKEN present', async () => {
    process.env.GITHUB_TOKEN = 'test-token';

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ sha: 'abc123' }]
    });

    await detector.getGitHubLatestCommit('plugins/specweave');

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-token'
        })
      })
    );

    delete process.env.GITHUB_TOKEN;
  });
});
```

**Files**:
- `src/core/plugin-cache/commit-fetcher.ts` (part of version-detector)
- `tests/unit/plugin-cache/commit-fetcher.test.ts`

---

### T-009: Implement commit comparison
**User Story**: US-003 | **Satisfies ACs**: AC-US3-03 | **Status**: [x] completed
**Model**: ⚡ Haiku

Compare two commits and identify changed files using GitHub compare API.

**Dependencies**: T-007

**Test Plan** (TDD - RED phase):
```typescript
// tests/unit/plugin-cache/commit-compare.test.ts
describe('compareCommits', () => {
  it('should identify changed files', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        files: [
          { filename: 'hooks/reflect.sh', status: 'modified' },
          { filename: 'scripts/test.sh', status: 'added' }
        ]
      })
    });

    const files = await detector.compareCommits('abc123', 'def456');
    expect(files).toEqual(['hooks/reflect.sh', 'scripts/test.sh']);
  });

  it('should handle identical commits', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ files: [] })
    });

    const files = await detector.compareCommits('abc123', 'abc123');
    expect(files).toEqual([]);
  });
});
```

**Files**:
- `src/core/plugin-cache/commit-compare.ts` (part of version-detector)
- `tests/unit/plugin-cache/commit-compare.test.ts`

---

### T-010: Create CacheVersionDetector orchestrator
**User Story**: US-003 | **Satisfies ACs**: AC-US3-02, AC-US3-04, AC-US3-07 | **Status**: [x] completed
**Model**: 💎 Opus

Orchestrate staleness checks with graceful fallbacks.

**Dependencies**: T-007, T-008, T-009

**Test Plan** (TDD - RED phase):
```typescript
// tests/unit/plugin-cache/cache-version-detector.test.ts
describe('CacheVersionDetector', () => {
  let detector: CacheVersionDetector;

  beforeEach(() => {
    detector = new CacheVersionDetector();
  });

  describe('checkStaleness', () => {
    it('should detect stale cache', async () => {
      // Mock metadata with old commit
      vi.spyOn(CacheMetadataManager, 'readMetadata').mockReturnValue({
        pluginName: 'sw',
        version: '1.0.0',
        commitSha: 'old123',
        lastUpdated: '2026-01-01T00:00:00Z',
        checksums: {}
      });

      // Mock GitHub API with new commit
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ sha: 'new456' }]
      });

      const result = await detector.checkStaleness('sw');
      expect(result.stale).toBe(true);
      expect(result.reason).toBe('commit_changed');
      expect(result.cacheCommit).toBe('old123');
      expect(result.githubCommit).toBe('new456');
    });

    it('should handle offline gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await detector.checkStaleness('sw');
      // Should not throw, should use cached data or return unknown
      expect(result.stale).toBeDefined();
    });
  });
});
```

**Files**:
- `src/core/plugin-cache/cache-version-detector.ts`
- `tests/unit/plugin-cache/cache-version-detector.test.ts`

---

## Phase 4: Cache Invalidator

### T-011: Implement skill memory backup
**User Story**: US-004 | **Satisfies ACs**: AC-US4-03 | **Status**: [x] completed
**Model**: 💎 Opus

Backup skill memory files before cache invalidation.

**Dependencies**: T-001

**Test Plan** (TDD - RED phase):
```typescript
// tests/unit/plugin-cache/memory-backup.test.ts
describe('backupSkillMemories', () => {
  it('should create timestamped backup', async () => {
    const pluginName = 'sw';
    const backupPath = await invalidator.backupSkillMemories(pluginName);

    expect(backupPath).toContain('.specweave/backups');
    expect(backupPath).toContain(pluginName);
    expect(fs.existsSync(backupPath)).toBe(true);
  });

  it('should backup all memory files', async () => {
    // Create mock memory files
    const memoryDir = path.join(os.homedir(), '.specweave/memory');
    fs.mkdirSync(memoryDir, { recursive: true });
    fs.writeFileSync(path.join(memoryDir, 'general.md'), 'test');

    const backupPath = await invalidator.backupSkillMemories('sw');
    expect(fs.existsSync(path.join(backupPath, 'general.md'))).toBe(true);
  });
});
```

**Files**:
- `src/core/plugin-cache/memory-backup.ts` (part of invalidator)
- `tests/unit/plugin-cache/memory-backup.test.ts`

---

### T-012: Implement soft invalidation
**User Story**: US-004 | **Satisfies ACs**: AC-US4-01 | **Status**: [x] completed
**Model**: ⚡ Haiku

Mark cache as stale in metadata (non-destructive).

**Dependencies**: T-002

**Test Plan** (TDD - RED phase):
```typescript
// tests/unit/plugin-cache/soft-invalidation.test.ts
describe('invalidatePlugin - soft', () => {
  it('should mark metadata as stale', async () => {
    const metadata: CacheMetadata = {
      pluginName: 'sw',
      version: '1.0.0',
      commitSha: 'abc123',
      lastUpdated: '2026-01-01T00:00:00Z',
      checksums: {}
    };
    CacheMetadataManager.writeMetadata(mockCacheDir, metadata);

    await invalidator.invalidatePlugin('sw', 'soft', {
      preserveMemories: false,
      backupFirst: false
    });

    const updated = CacheMetadataManager.readMetadata(mockCacheDir);
    expect(updated?.lastUpdated).not.toBe('2026-01-01T00:00:00Z');
  });

  it('should not delete files', async () => {
    const testFile = path.join(mockCacheDir, 'test.sh');
    fs.writeFileSync(testFile, 'test');

    await invalidator.invalidatePlugin('sw', 'soft', {
      preserveMemories: false,
      backupFirst: false
    });

    expect(fs.existsSync(testFile)).toBe(true);
  });
});
```

**Files**:
- `src/core/plugin-cache/soft-invalidation.ts` (part of invalidator)
- `tests/unit/plugin-cache/soft-invalidation.test.ts`

---

### T-013: Implement hard invalidation
**User Story**: US-004 | **Satisfies ACs**: AC-US4-02, AC-US4-06 | **Status**: [x] completed
**Model**: 💎 Opus

Delete cache after creating backup, trigger marketplace refresh.

**Dependencies**: T-011, T-012

**Test Plan** (TDD - RED phase):
```typescript
// tests/unit/plugin-cache/hard-invalidation.test.ts
describe('invalidatePlugin - hard', () => {
  it('should delete cache directory', async () => {
    fs.mkdirSync(mockCacheDir, { recursive: true });
    fs.writeFileSync(path.join(mockCacheDir, 'test.sh'), 'test');

    await invalidator.invalidatePlugin('sw', 'hard', {
      preserveMemories: false,
      backupFirst: false
    });

    expect(fs.existsSync(mockCacheDir)).toBe(false);
  });

  it('should create backup before deletion when requested', async () => {
    fs.mkdirSync(mockCacheDir, { recursive: true });
    fs.writeFileSync(path.join(mockCacheDir, 'test.sh'), 'test');

    await invalidator.invalidatePlugin('sw', 'hard', {
      preserveMemories: false,
      backupFirst: true
    });

    // Check backup exists
    const backups = fs.readdirSync(
      path.join(os.homedir(), '.specweave/backups')
    );
    expect(backups.some(b => b.includes('cache-sw'))).toBe(true);
  });

  it('should preserve memories when requested', async () => {
    await invalidator.invalidatePlugin('sw', 'hard', {
      preserveMemories: true,
      backupFirst: false
    });

    // Should call backupSkillMemories and restoreSkillMemories
  });
});
```

**Files**:
- `src/core/plugin-cache/hard-invalidation.ts` (part of invalidator)
- `tests/unit/plugin-cache/hard-invalidation.test.ts`

---

### T-014: Create CacheInvalidator orchestrator
**User Story**: US-004 | **Satisfies ACs**: AC-US4-04, AC-US4-05 | **Status**: [x] completed
**Model**: 💎 Opus

Orchestrate invalidation strategies with memory preservation.

**Dependencies**: T-011, T-012, T-013

**Test Plan** (TDD - RED phase):
```typescript
// tests/unit/plugin-cache/cache-invalidator.test.ts
describe('CacheInvalidator', () => {
  it('should orchestrate hard invalidation workflow', async () => {
    const workflow = [];

    vi.spyOn(invalidator, 'backupSkillMemories').mockImplementation(async () => {
      workflow.push('backup');
      return '/backup/path';
    });

    vi.spyOn(fs, 'rmSync').mockImplementation(() => {
      workflow.push('delete');
    });

    vi.spyOn(invalidator, 'restoreSkillMemories').mockImplementation(async () => {
      workflow.push('restore');
    });

    await invalidator.invalidatePlugin('sw', 'hard', {
      preserveMemories: true,
      backupFirst: true
    });

    expect(workflow).toEqual(['backup', 'delete', 'restore']);
  });
});
```

**Files**:
- `src/core/plugin-cache/cache-invalidator.ts`
- `tests/unit/plugin-cache/cache-invalidator.test.ts`

---

## Phase 5: Startup Checker

### T-015: Implement throttle mechanism
**User Story**: US-005 | **Satisfies ACs**: AC-US5-01 | **Status**: [ ] pending
**Model**: ⚡ Haiku

Throttle startup checks to max once per hour.

**Dependencies**: None

**Test Plan** (TDD - RED phase):
```typescript
// tests/unit/plugin-cache/startup-throttle.test.ts
describe('StartupChecker throttle', () => {
  beforeEach(() => {
    // Clear throttle file
    const throttleFile = '.specweave/state/.cache-check-throttle';
    if (fs.existsSync(throttleFile)) {
      fs.unlinkSync(throttleFile);
    }
  });

  it('should allow first check', () => {
    expect(StartupChecker['shouldRunCheck']()).toBe(true);
  });

  it('should block second check within hour', () => {
    StartupChecker['updateThrottle']();
    expect(StartupChecker['shouldRunCheck']()).toBe(false);
  });

  it('should allow check after throttle expires', () => {
    // Mock throttle file with old timestamp
    const throttleFile = '.specweave/state/.cache-check-throttle';
    const oldTime = Date.now() - 3600001; // >1 hour ago
    fs.writeFileSync(throttleFile, oldTime.toString());

    expect(StartupChecker['shouldRunCheck']()).toBe(true);
  });
});
```

**Files**:
- `src/core/plugin-cache/startup-throttle.ts` (part of startup-checker)
- `tests/unit/plugin-cache/startup-throttle.test.ts`

---

### T-016: Implement lightweight quick check
**User Story**: US-005 | **Satisfies ACs**: AC-US5-02, AC-US5-03, AC-US5-04, AC-US5-05 | **Status**: [ ] pending
**Model**: 💎 Opus

Execute fast local-only checks with critical issue alerting.

**Dependencies**: T-003, T-004, T-015

**Test Plan** (TDD - RED phase):
```typescript
// tests/unit/plugin-cache/startup-checker.test.ts
describe('StartupChecker quickCheck', () => {
  it('should complete in <100ms', async () => {
    const startTime = Date.now();
    await StartupChecker.quickCheck();
    const elapsed = Date.now() - startTime;

    expect(elapsed).toBeLessThan(100);
  });

  it('should alert on critical issues', async () => {
    // Create plugin with merge conflict
    const pluginDir = path.join(os.homedir(), '.claude/plugins/cache/specweave/sw/1.0.0');
    fs.mkdirSync(pluginDir, { recursive: true });
    fs.writeFileSync(
      path.join(pluginDir, 'test.sh'),
      '<<<<<<< HEAD\nconflict\n======='
    );

    const consoleSpy = vi.spyOn(console, 'warn');
    await StartupChecker.quickCheck();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Plugin cache issues detected')
    );
  });

  it('should not make GitHub API calls', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');
    await StartupChecker.quickCheck();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('should fail silently on errors', async () => {
    vi.spyOn(fs, 'readdirSync').mockImplementation(() => {
      throw new Error('Permission denied');
    });

    // Should not throw
    await expect(StartupChecker.quickCheck()).resolves.not.toThrow();
  });
});
```

**Files**:
- `src/core/plugin-cache/startup-checker.ts`
- `tests/unit/plugin-cache/startup-checker.test.ts`

---

## Phase 6: CLI Commands

### T-017: Create cache-status command
**User Story**: US-006 | **Satisfies ACs**: AC-US6-01, AC-US6-02, AC-US6-03, AC-US6-04, AC-US6-05, AC-US6-06, AC-US6-07 | **Status**: [ ] pending
**Model**: 💎 Opus

CLI command to display cache health with fix suggestions.

**Dependencies**: T-006, T-010

**Test Plan** (TDD - RED phase):
```typescript
// tests/integration/plugin-cache/cache-status.spec.ts
describe('cache-status command', () => {
  it('should show all plugins', async () => {
    const result = await execAsync('specweave cache-status');
    expect(result.stdout).toContain('Plugin Cache Health Check');
    expect(result.stdout).toMatch(/✅|⚠️|❌/);
  });

  it('should show specific plugin', async () => {
    const result = await execAsync('specweave cache-status sw');
    expect(result.stdout).toContain('sw');
  });

  it('should auto-fix with --fix flag', async () => {
    // Create broken cache
    const pluginDir = mockBrokenPlugin();

    const result = await execAsync('specweave cache-status --fix');
    expect(result.stdout).toContain('Refreshing');
  });

  it('should show verbose details', async () => {
    const result = await execAsync('specweave cache-status --verbose');
    expect(result.stdout).toContain('Checksum');
  });

  it('should check GitHub with flag', async () => {
    const result = await execAsync('specweave cache-status --check-github');
    // Should show GitHub commit comparison
  });

  it('should show summary line', async () => {
    const result = await execAsync('specweave cache-status');
    expect(result.stdout).toMatch(/Summary: \d+ healthy, \d+ stale, \d+ critical/);
  });

  it('should exit 1 on critical issues', async () => {
    const pluginDir = mockBrokenPlugin();

    await expect(
      execAsync('specweave cache-status')
    ).rejects.toThrow('exit code 1');
  });
});
```

**Files**:
- `src/cli/commands/cache-status.ts`
- `tests/integration/plugin-cache/cache-status.spec.ts`

---

### T-018: Create cache-refresh command
**User Story**: US-007 | **Satisfies ACs**: AC-US7-01, AC-US7-02, AC-US7-03, AC-US7-04, AC-US7-05, AC-US7-06 | **Status**: [ ] pending
**Model**: 💎 Opus

CLI command to refresh broken caches with memory preservation.

**Dependencies**: T-014, T-017

**Test Plan** (TDD - RED phase):
```typescript
// tests/integration/plugin-cache/cache-refresh.spec.ts
describe('cache-refresh command', () => {
  it('should refresh all stale plugins', async () => {
    const result = await execAsync('specweave cache-refresh');
    expect(result.stdout).toContain('refreshed');
  });

  it('should refresh specific plugin', async () => {
    const result = await execAsync('specweave cache-refresh sw');
    expect(result.stdout).toContain('sw');
  });

  it('should force refresh with --force', async () => {
    const result = await execAsync('specweave cache-refresh sw --force');
    expect(result.stdout).toContain('deleted');
  });

  it('should refresh all with --all', async () => {
    const result = await execAsync('specweave cache-refresh --all');
    // Should refresh even healthy plugins
  });

  it('should preserve skill memories', async () => {
    // Create memory file
    const memoryPath = path.join(os.homedir(), '.specweave/memory/general.md');
    fs.writeFileSync(memoryPath, 'test learning');

    await execAsync('specweave cache-refresh sw --force');

    const restored = fs.readFileSync(memoryPath, 'utf8');
    expect(restored).toContain('test learning');
  });

  it('should verify after refresh', async () => {
    const result = await execAsync('specweave cache-refresh sw --force');
    expect(result.stdout).toContain('verified');
  });
});
```

**Files**:
- `src/cli/commands/cache-refresh.ts`
- `tests/integration/plugin-cache/cache-refresh.spec.ts`

---

## Phase 7: Integration

### T-019: Integrate with CLI startup
**User Story**: US-005 | **Satisfies ACs**: AC-US5-01, AC-US5-03 | **Status**: [ ] pending
**Model**: ⚡ Haiku

Add preAction hook to CLI for startup checks.

**Dependencies**: T-016

**Test Plan** (TDD - GREEN phase):
```typescript
// tests/integration/cli-startup.spec.ts
describe('CLI startup integration', () => {
  it('should run cache check on command', async () => {
    const checkSpy = vi.spyOn(StartupChecker, 'quickCheck');
    await execAsync('specweave --version');

    expect(checkSpy).toHaveBeenCalled();
  });

  it('should not block user workflow on check error', async () => {
    vi.spyOn(StartupChecker, 'quickCheck').mockRejectedValue(new Error('Check failed'));

    // Should still execute command
    const result = await execAsync('specweave --version');
    expect(result.stdout).toContain('version');
  });
});
```

**Files**:
- `src/cli/cli.ts` (modify)
- `tests/integration/cli-startup.spec.ts`

---

### T-020: Integrate with check-hooks command
**User Story**: US-008 | **Satisfies ACs**: AC-US8-01, AC-US8-02, AC-US8-03, AC-US8-04, AC-US8-05 | **Status**: [ ] pending
**Model**: 💎 Opus

Add --include-cache flag to existing check-hooks command.

**Dependencies**: T-006, T-017

**Test Plan** (TDD - GREEN phase):
```typescript
// tests/integration/check-hooks-cache.spec.ts
describe('check-hooks --include-cache', () => {
  it('should validate both hooks and cache', async () => {
    const result = await execAsync('specweave check-hooks --include-cache');

    expect(result.stdout).toContain('Hook Health Check');
    expect(result.stdout).toContain('Plugin Cache Health');
  });

  it('should maintain existing exit codes', async () => {
    const healthyResult = await execAsync('specweave check-hooks --include-cache');
    expect(healthyResult.exitCode).toBe(0);

    // Create critical cache issue
    mockBrokenPlugin();

    await expect(
      execAsync('specweave check-hooks --include-cache')
    ).rejects.toThrow('exit code 2'); // Critical failure
  });

  it('should match output style', async () => {
    const result = await execAsync('specweave check-hooks --include-cache');
    // Should use similar formatting as hook health output
  });
});
```

**Files**:
- `src/cli/commands/check-hooks.ts` (modify)
- `tests/integration/check-hooks-cache.spec.ts`

---

### T-021: Integrate with refresh-marketplace command
**User Story**: US-009 | **Satisfies ACs**: AC-US9-01, AC-US9-02, AC-US9-03, AC-US9-04, AC-US9-05 | **Status**: [ ] pending
**Model**: 💎 Opus

Add pre-refresh cache health check with auto-invalidation.

**Dependencies**: T-006, T-014

**Test Plan** (TDD - GREEN phase):
```typescript
// tests/integration/refresh-marketplace-cache.spec.ts
describe('refresh-marketplace cache pre-check', () => {
  it('should check cache before refresh', async () => {
    const result = await execAsync('specweave refresh-marketplace');
    expect(result.stdout).toContain('Checking cache health');
  });

  it('should auto-invalidate critical issues', async () => {
    // Create broken plugin
    const pluginDir = mockBrokenPlugin();

    const result = await execAsync('specweave refresh-marketplace');
    expect(result.stdout).toContain('merge_conflict');
    expect(result.stdout).toContain('invalidating');
  });

  it('should preserve memories during auto-invalidation', async () => {
    const memoryPath = path.join(os.homedir(), '.specweave/memory/general.md');
    fs.writeFileSync(memoryPath, 'test');

    await execAsync('specweave refresh-marketplace');

    expect(fs.existsSync(memoryPath)).toBe(true);
    expect(fs.readFileSync(memoryPath, 'utf8')).toContain('test');
  });
});
```

**Files**:
- `src/cli/commands/refresh-marketplace.ts` (modify)
- `tests/integration/refresh-marketplace-cache.spec.ts`

---

## Phase 8: Testing & Documentation

### T-022: Add CLI help documentation
**User Story**: US-006, US-007 | **Satisfies ACs**: All | **Status**: [ ] pending
**Model**: ⚡ Haiku

Add help text for new CLI commands.

**Dependencies**: T-017, T-018

**Files**:
- `src/cli/cli.ts` (update help text)
- README.md (add cache commands section)

---

### T-023: Create end-to-end test scenario
**User Story**: All | **Satisfies ACs**: All | **Status**: [ ] pending
**Model**: 💎 Opus

Test complete flow: detect broken cache → alert → fix → verify.

**Dependencies**: All previous tasks

**Test Plan**:
```typescript
// tests/integration/plugin-cache/end-to-end.spec.ts
describe('Plugin Cache E2E', () => {
  it('should detect reflect.sh merge conflict and recover', async () => {
    // Step 1: Create broken cache (simulate the actual bug)
    const reflectPath = path.join(
      os.homedir(),
      '.claude/plugins/cache/specweave/sw/1.0.0/scripts/reflect.sh'
    );
    fs.mkdirSync(path.dirname(reflectPath), { recursive: true });
    fs.writeFileSync(reflectPath, `
      #!/bin/bash
      <<<<<<< HEAD
      old_code() { echo "old"; }
      =======
      new_code() { echo "new"; }
      >>>>>>> df087427 (feat: update reflect)
    `);

    // Step 2: Run any CLI command (triggers startup check)
    const startupResult = await execAsync('specweave --version');
    expect(startupResult.stdout).toContain('Plugin cache issues detected');

    // Step 3: Run cache-status
    const statusResult = await execAsync('specweave cache-status');
    expect(statusResult.stdout).toContain('merge_conflict');
    expect(statusResult.stdout).toContain('scripts/reflect.sh');
    expect(statusResult.stdout).toContain('specweave cache-refresh sw --force');

    // Step 4: Run cache-refresh --force
    const refreshResult = await execAsync('specweave cache-refresh sw --force');
    expect(refreshResult.stdout).toContain('verified');

    // Step 5: Verify fix
    const verifyResult = await execAsync('specweave cache-status sw');
    expect(verifyResult.stdout).toContain('Healthy');

    // Step 6: Verify reflection works
    // (would need to test actual reflection, but that's out of scope)
  });
});
```

**Files**:
- `tests/integration/plugin-cache/end-to-end.spec.ts`

---

### T-024: Update CLAUDE.md with troubleshooting
**User Story**: US-006, US-007 | **Satisfies ACs**: All | **Status**: [ ] pending
**Model**: ⚡ Haiku

Add plugin cache troubleshooting section to CLAUDE.md.

**Dependencies**: T-017, T-018

**Files**:
- CLAUDE.md (add troubleshooting section)

---

### T-025: Create architecture documentation
**User Story**: All | **Satisfies ACs**: All | **Status**: [ ] pending
**Model**: ⚡ Haiku

Document cache health monitoring architecture in living docs.

**Dependencies**: All

**Files**:
- `.specweave/docs/internal/architecture/cache-health-monitoring.md`

---

## Phase 9: Deployment & Verification

### T-026: Manual verification with actual merge conflict
**User Story**: All | **Satisfies ACs**: All | **Status**: [ ] pending
**Model**: Manual Testing

Reproduce the original reflect.sh bug and verify detection.

**Manual Steps**:
1. Introduce merge conflict in `~/.claude/plugins/cache/specweave/sw/*/scripts/reflect.sh`
2. Run `specweave cache-status`
3. Verify detection message
4. Run `specweave cache-refresh sw --force`
5. Verify reflection works post-fix

---

### T-027: Performance validation
**User Story**: US-005 | **Satisfies ACs**: AC-US5-02 | **Status**: [ ] pending
**Model**: Manual Testing

Verify startup check completes in <100ms.

**Manual Steps**:
1. Run `time specweave --version` 10 times
2. Calculate average overhead
3. Verify <100ms

---

### T-028: GitHub API rate limit testing
**User Story**: US-003 | **Satisfies ACs**: AC-US3-06 | **Status**: [ ] pending
**Model**: Manual Testing

Test rate limiting behavior with and without GITHUB_TOKEN.

**Manual Steps**:
1. Test without token (60 req/hr limit)
2. Test with token (5000 req/hr limit)
3. Simulate rate limit exceeded
4. Verify graceful handling

---

## Summary

**Total Tasks**: 28
**Estimated Effort**: 2-3 weeks
**Test Coverage Target**: >85% (TDD mode)

**Critical Path**:
1. Core types (T-001)
2. Health monitor (T-003, T-004, T-005, T-006)
3. CLI commands (T-017, T-018)
4. Integration (T-019, T-020, T-021)
5. Verification (T-026, T-027, T-028)

**Risk Mitigation**:
- All checks are non-blocking (never break user workflow)
- Offline mode supported (skip GitHub checks)
- Rate limiting handled gracefully
- Comprehensive error handling

**Success Criteria**:
- Merge conflicts detected within 100ms ✅
- Clear fix instructions provided ✅
- Recovery time <2 minutes ✅
- Zero silent failures ✅
