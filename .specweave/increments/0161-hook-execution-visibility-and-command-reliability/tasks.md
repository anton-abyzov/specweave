---
increment: 0161-hook-execution-visibility-and-command-reliability
status: planned
type: hotfix
priority: P0
testMode: TDD
dependencies: []
phases:
  - hook-response-warnings
  - real-time-logging
  - diagnostic-commands
  - skill-routing-fix
  - reflection-restoration
  - integration-testing
estimated_tasks: 18
estimated_weeks: 1
---

# Implementation Tasks - Hook Execution Visibility and Command Reliability

## Phase 1: Hook Response Warnings (US-001)

### T-001: Add warnings array to hook response types
**User Story**: US-001 | **Satisfies ACs**: AC-US1-01, AC-US1-02 | **Status**: [x] completed
**Model**: ⚡ Haiku

Add `warnings` array to hook response TypeScript interfaces.

**Dependencies**: None

**Test Plan** (TDD - RED phase):
```typescript
// tests/unit/hooks/hook-response.test.ts
describe('Hook Response with Warnings', () => {
  it('should include warnings array in response', () => {
    const response: HookResponse = {
      continue: true,
      warnings: ['Hook execution timeout after 5s']
    };
    expect(response.warnings).toHaveLength(1);
  });

  it('should allow multiple warnings', () => {
    const response: HookResponse = {
      continue: true,
      warnings: [
        'Semaphore acquisition timeout',
        'GitHub sync failed: rate limit'
      ]
    };
    expect(response.warnings).toHaveLength(2);
  });
});
```

**Files**:
- `src/types/hook-types.ts` (modify)
- `tests/unit/hooks/hook-response.test.ts` (create)

---

### T-002: Implement warning formatter utility
**User Story**: US-001 | **Satisfies ACs**: AC-US1-03, AC-US1-05, AC-US1-06, AC-US1-07 | **Status**: [x] completed
**Model**: 💎 Opus

Create utility to format hook failures as structured warnings with severity levels.

**Dependencies**: T-001

**Test Plan** (TDD - RED phase):
```typescript
// tests/unit/hooks/warning-formatter.test.ts
describe('WarningFormatter', () => {
  it('should format timeout as WARNING severity', () => {
    const warning = formatHookWarning({
      type: 'timeout',
      hookName: 'user-prompt-submit',
      duration: 5000
    });

    expect(warning.severity).toBe('WARNING');
    expect(warning.message).toContain('timeout after 5s');
    expect(warning.recommendation).toContain('specweave check-hooks');
  });

  it('should format merge conflict as ERROR severity', () => {
    const warning = formatHookWarning({
      type: 'merge_conflict',
      hookName: 'post-tool-use',
      file: 'reflect.sh'
    });

    expect(warning.severity).toBe('ERROR');
    expect(warning.message).toContain('merge conflict');
    expect(warning.recommendation).toContain('specweave cache-refresh');
  });

  it('should include execution time in warning', () => {
    const warning = formatHookWarning({
      type: 'slow_execution',
      hookName: 'session-start',
      duration: 1200
    });

    expect(warning.message).toContain('1200ms');
  });
});
```

**Files**:
- `src/utils/hook-warning-formatter.ts` (create)
- `tests/unit/hooks/warning-formatter.test.ts` (create)

---

### T-003: Update fail-fast-wrapper.sh to output warnings
**User Story**: US-001 | **Satisfies ACs**: AC-US1-04 | **Status**: [x] completed
**Model**: 💎 Opus

Modify fail-fast-wrapper.sh to output JSON with warnings array instead of silent `{"continue":true}`.

**Dependencies**: T-002

**Test Plan** (TDD - GREEN phase):
```bash
# tests/integration/hooks/fail-fast-wrapper.test.sh
test_timeout_produces_warning() {
  # Simulate timeout
  HOOK_TIMEOUT=1 bash hooks/universal/fail-fast-wrapper.sh /dev/null <<EOF
sleep 5
EOF

  # Check JSON output
  output=$(cat)
  echo "$output" | jq -e '.warnings | length > 0'
  echo "$output" | jq -e '.warnings[0] | contains("timeout")'
}

test_syntax_error_produces_error_warning() {
  # Create invalid script
  echo '#!/bin/bash\nif [ ; then' > /tmp/bad.sh

  bash hooks/universal/fail-fast-wrapper.sh /tmp/bad.sh

  output=$(cat)
  echo "$output" | jq -e '.warnings[0].severity == "ERROR"'
}
```

**Files**:
- `plugins/specweave/hooks/universal/fail-fast-wrapper.sh` (modify)
- `tests/integration/hooks/fail-fast-wrapper.test.sh` (create)

---

## Phase 2: Real-Time Hook Logging (US-002)

### T-004: Create hook logger module
**User Story**: US-002 | **Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-06 | **Status**: [x] completed
**Model**: 💎 Opus

Create centralized hook logging system with structured output.

**Dependencies**: None

**Test Plan** (TDD - RED phase):
```typescript
// tests/unit/hooks/hook-logger.test.ts
describe('HookLogger', () => {
  let logger: HookLogger;
  let logDir: string;

  beforeEach(() => {
    logDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hook-logs-'));
    logger = new HookLogger(logDir);
  });

  it('should write log with timestamp and hook name', async () => {
    await logger.log({
      hookName: 'session-start',
      status: 'success',
      duration: 45
    });

    const logFile = path.join(logDir, 'session-start.log');
    const content = fs.readFileSync(logFile, 'utf8');
    const entry = JSON.parse(content.split('\n')[0]);

    expect(entry.timestamp).toBeDefined();
    expect(entry.hookName).toBe('session-start');
    expect(entry.status).toBe('success');
    expect(entry.duration).toBe(45);
  });

  it('should log failures with error details', async () => {
    await logger.log({
      hookName: 'user-prompt-submit',
      status: 'error',
      error: 'Timeout after 5s',
      stackTrace: 'Error: Timeout...'
    });

    const logFile = path.join(logDir, 'user-prompt-submit.log');
    const content = fs.readFileSync(logFile, 'utf8');
    const entry = JSON.parse(content.split('\n')[0]);

    expect(entry.error).toBe('Timeout after 5s');
    expect(entry.stackTrace).toContain('Error: Timeout');
  });

  it('should include request ID for correlation', async () => {
    const requestId = 'req-12345';

    await logger.log({
      hookName: 'post-tool-use',
      status: 'success',
      requestId
    });

    const logFile = path.join(logDir, 'post-tool-use.log');
    const content = fs.readFileSync(logFile, 'utf8');
    const entry = JSON.parse(content.split('\n')[0]);

    expect(entry.requestId).toBe(requestId);
  });
});
```

**Files**:
- `src/core/hooks/hook-logger.ts` (create)
- `tests/unit/hooks/hook-logger.test.ts` (create)

---

### T-005: Implement log rotation
**User Story**: US-002 | **Satisfies ACs**: AC-US2-04 | **Status**: [x] completed
**Model**: ⚡ Haiku

Add daily log rotation to prevent unbounded growth.

**Dependencies**: T-004

**Test Plan** (TDD - RED phase):
```typescript
// tests/unit/hooks/log-rotation.test.ts
describe('LogRotation', () => {
  it('should create dated log files', () => {
    const rotator = new LogRotator('.specweave/logs/hooks');
    const logPath = rotator.getCurrentLogPath('session-start');

    expect(logPath).toContain(new Date().toISOString().split('T')[0]);
  });

  it('should clean logs older than 7 days', async () => {
    // Create old log files
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 8);
    const oldLog = `session-start-${oldDate.toISOString().split('T')[0]}.log`;

    fs.writeFileSync(path.join(logDir, oldLog), 'old content');

    await rotator.cleanOldLogs(7);

    expect(fs.existsSync(path.join(logDir, oldLog))).toBe(false);
  });
});
```

**Files**:
- `src/core/hooks/log-rotator.ts` (create)
- `tests/unit/hooks/log-rotation.test.ts` (create)

---

### T-006: Add log viewer command
**User Story**: US-002 | **Satisfies ACs**: AC-US2-05 | **Status**: [x] completed
**Model**: 💎 Opus

Create `specweave logs hooks` command with tail and follow options.

**Dependencies**: T-004, T-005

**Test Plan** (TDD - RED phase):
```typescript
// tests/integration/cli/logs-command.test.ts
describe('specweave logs hooks', () => {
  it('should tail last 50 lines by default', async () => {
    const { stdout } = await execAsync('specweave logs hooks --tail=50');

    const lines = stdout.trim().split('\n');
    expect(lines.length).toBeLessThanOrEqual(50);
  });

  it('should filter by hook name', async () => {
    const { stdout } = await execAsync('specweave logs hooks --hook=session-start');

    const entries = stdout.trim().split('\n').map(JSON.parse);
    expect(entries.every(e => e.hookName === 'session-start')).toBe(true);
  });

  it('should follow new log entries', async () => {
    const child = spawn('specweave', ['logs', 'hooks', '--follow']);

    // Wait for initial output
    await new Promise(resolve => setTimeout(resolve, 100));

    // Trigger a hook execution
    await execAsync('echo "test" >> .specweave/increments/0001-test/spec.md');

    // Check child received new log
    child.stdout.on('data', (data) => {
      expect(data.toString()).toContain('post-tool-use');
    });
  });
});
```

**Files**:
- `src/cli/commands/logs.ts` (create)
- `tests/integration/cli/logs-command.test.ts` (create)

---

## Phase 3: Hook Status Dashboard (US-003)

### T-007: Create hook health tracker
**User Story**: US-003 | **Satisfies ACs**: AC-US3-02, AC-US3-04, AC-US3-05 | **Status**: [x] completed
**Model**: 💎 Opus

Implement health tracking logic analyzing last 24h of hook executions.

**Dependencies**: T-004

**Test Plan** (TDD - RED phase):
```typescript
// tests/unit/hooks/hook-health-tracker.test.ts
describe('HookHealthTracker', () => {
  it('should calculate success rate from logs', () => {
    const tracker = new HookHealthTracker();
    const logs = [
      { status: 'success' },
      { status: 'success' },
      { status: 'warning' },
      { status: 'error' }
    ];

    const health = tracker.analyze('session-start', logs);

    expect(health.successRate).toBe(0.5); // 2/4
    expect(health.status).toBe('DEGRADED');
  });

  it('should mark as FAILED after 3 consecutive failures', () => {
    const logs = [
      { status: 'error' },
      { status: 'error' },
      { status: 'error' }
    ];

    const health = tracker.analyze('user-prompt-submit', logs);

    expect(health.status).toBe('FAILED');
  });

  it('should calculate average duration', () => {
    const logs = [
      { status: 'success', duration: 100 },
      { status: 'success', duration: 200 },
      { status: 'success', duration: 300 }
    ];

    const health = tracker.analyze('post-tool-use', logs);

    expect(health.avgDuration).toBe(200);
  });
});
```

**Files**:
- `src/core/hooks/hook-health-tracker.ts` (create)
- `tests/unit/hooks/hook-health-tracker.test.ts` (create)

---

### T-008: Implement hook-status command
**User Story**: US-003 | **Satisfies ACs**: AC-US3-01, AC-US3-03, AC-US3-06, AC-US3-07 | **Status**: [ ] pending
**Model**: 💎 Opus

Create CLI command displaying hook health dashboard.

**Dependencies**: T-007

**Test Plan** (TDD - RED phase):
```typescript
// tests/integration/cli/hook-status.test.ts
describe('specweave hook-status', () => {
  it('should show table of all hooks', async () => {
    const { stdout } = await execAsync('specweave hook-status');

    expect(stdout).toContain('Hook Name');
    expect(stdout).toContain('Last Run');
    expect(stdout).toContain('Status');
    expect(stdout).toContain('Success Rate');
  });

  it('should display status indicators', async () => {
    const { stdout } = await execAsync('specweave hook-status');

    expect(stdout).toMatch(/✅|⚠️|❌/);
  });

  it('should show summary line', async () => {
    const { stdout } = await execAsync('specweave hook-status');

    expect(stdout).toContain('hooks healthy');
    expect(stdout).toContain('issues detected');
  });

  it('should provide recommendations', async () => {
    // Create failing hook scenario
    const { stdout } = await execAsync('specweave hook-status');

    expect(stdout).toContain('Recommendations:');
  });
});
```

**Files**:
- `src/cli/commands/hook-status.ts` (create)
- `tests/integration/cli/hook-status.test.ts` (create)

---

## Phase 4: Session Cleanup Command (US-004)

### T-009: Create session detector
**User Story**: US-004 | **Satisfies ACs**: AC-US4-01, AC-US4-02 | **Status**: [ ] pending
**Model**: 💎 Opus

Detect running Claude Code sessions via process list.

**Dependencies**: None

**Test Plan** (TDD - RED phase):
```typescript
// tests/unit/session/session-detector.test.ts
describe('SessionDetector', () => {
  it('should find Claude processes', async () => {
    const detector = new SessionDetector();
    const sessions = await detector.findSessions();

    expect(sessions).toBeInstanceOf(Array);
    sessions.forEach(s => {
      expect(s.pid).toBeGreaterThan(0);
      expect(s.startTime).toBeInstanceOf(Date);
    });
  });

  it('should parse session ID from command line', async () => {
    const detector = new SessionDetector();
    const sessions = await detector.findSessions();

    const withSessionId = sessions.find(s => s.sessionId);
    if (withSessionId) {
      expect(withSessionId.sessionId).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it('should calculate memory usage', async () => {
    const detector = new SessionDetector();
    const sessions = await detector.findSessions();

    sessions.forEach(s => {
      expect(s.memoryMB).toBeGreaterThan(0);
    });
  });
});
```

**Files**:
- `src/core/session/session-detector.ts` (create)
- `tests/unit/session/session-detector.test.ts` (create)

---

### T-010: Implement cleanup-sessions command
**User Story**: US-004 | **Satisfies ACs**: AC-US4-03, AC-US4-04, AC-US4-05, AC-US4-06, AC-US4-07 | **Status**: [ ] pending
**Model**: 💎 Opus

Create command to kill zombie sessions and clean locks.

**Dependencies**: T-009

**Test Plan** (TDD - RED phase):
```typescript
// tests/integration/cli/cleanup-sessions.test.ts
describe('specweave cleanup-sessions', () => {
  it('should list sessions in dry-run mode', async () => {
    const { stdout } = await execAsync('specweave cleanup-sessions --dry-run');

    expect(stdout).toContain('PID');
    expect(stdout).toContain('Started');
    expect(stdout).toContain('Session ID');
  });

  it('should prompt before force kill', async () => {
    const child = spawn('specweave', ['cleanup-sessions', '--force'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const output = await new Promise<string>(resolve => {
      child.stdout.on('data', data => resolve(data.toString()));
    });

    expect(output).toContain('Continue? (y/N)');
  });

  it('should remove stale lock files', async () => {
    // Create stale lock
    fs.writeFileSync('.specweave/state/test.lock', JSON.stringify({
      pid: 99999,
      timestamp: Date.now() - 86400000
    }));

    await execAsync('specweave cleanup-sessions --force', { input: 'y\n' });

    expect(fs.existsSync('.specweave/state/test.lock')).toBe(false);
  });
});
```

**Files**:
- `src/cli/commands/cleanup-sessions.ts` (create)
- `tests/integration/cli/cleanup-sessions.test.ts` (create)

---

## Phase 5: Fix Skill Routing (US-005)

### T-011: Add cache staleness detector
**User Story**: US-005 | **Satisfies ACs**: AC-US5-03, AC-US5-06 | **Status**: [ ] pending
**Model**: 💎 Opus

Detect when CLAUDE_PLUGIN_ROOT doesn't match latest cache refresh.

**Dependencies**: None

**Test Plan** (TDD - RED phase):
```typescript
// tests/unit/skill-router/cache-staleness.test.ts
describe('CacheStalenessDetector', () => {
  it('should detect stale CLAUDE_PLUGIN_ROOT', () => {
    const detector = new CacheStalenessDetector();

    process.env.CLAUDE_PLUGIN_ROOT = '/old/cache/path';
    const latestCache = '/new/cache/path';

    expect(detector.isStale()).toBe(true);
    expect(detector.getRecommendation()).toContain('Restart Claude Code');
  });

  it('should check cache modification time', () => {
    const detector = new CacheStalenessDetector();
    const cacheTime = fs.statSync(process.env.CLAUDE_PLUGIN_ROOT).mtime;
    const sessionStart = new Date(Date.now() - 3600000); // 1h ago

    expect(detector.isCacheNewerThanSession(cacheTime, sessionStart)).toBe(true);
  });
});
```

**Files**:
- `src/core/skill-router/cache-staleness-detector.ts` (create)
- `tests/unit/skill-router/cache-staleness.test.ts` (create)

---

### T-012: Implement skill routing fallback
**User Story**: US-005 | **Satisfies ACs**: AC-US5-04, AC-US5-05 | **Status**: [ ] pending
**Model**: 💎 Opus

Add fallback from skill execution to direct CLI command.

**Dependencies**: T-011

**Test Plan** (TDD - RED phase):
```typescript
// tests/integration/skill-router/fallback.test.ts
describe('Skill Routing Fallback', () => {
  it('should try CLI command if skill fails', async () => {
    // Simulate skill failure
    vi.spyOn(SkillExecutor.prototype, 'execute').mockRejectedValue(new Error('Skill not found'));

    const router = new SkillRouter();
    const result = await router.route('/sw:progress');

    expect(result.source).toBe('cli');
    expect(result.output).toContain('increments complete');
  });

  it('should distinguish error types', async () => {
    const router = new SkillRouter();

    const notFoundError = await router.route('/sw:nonexistent');
    expect(notFoundError.error).toContain('Skill not found');

    const executionError = await router.route('/sw:broken');
    expect(executionError.error).toContain('execution failed');
  });
});
```

**Files**:
- `src/core/skill-router/skill-router.ts` (modify)
- `tests/integration/skill-router/fallback.test.ts` (create)

---

### T-013: Fix progress/status/reflect skill execution
**User Story**: US-005 | **Satisfies ACs**: AC-US5-01, AC-US5-02 | **Status**: [ ] pending
**Model**: 💎 Opus

Ensure core commands produce full output, not generic text.

**Dependencies**: T-012

**Test Plan** (TDD - GREEN phase):
```typescript
// tests/e2e/skill-routing/core-commands.e2e.ts
describe('Core Command Skill Routing E2E', () => {
  it('should show full progress table for /sw:progress', async () => {
    const { stdout } = await execAsync('specweave progress');

    expect(stdout).toContain('Increment');
    expect(stdout).toContain('Status');
    expect(stdout).toContain('Progress');
    expect(stdout).not.toBe('62%'); // Not generic
  });

  it('should show full metadata for /sw:status', async () => {
    const { stdout } = await execAsync('specweave status');

    expect(stdout).toContain('Active');
    expect(stdout).toContain('Paused');
    expect(stdout).toContain('Completed');
  });
});
```

**Files**:
- `plugins/specweave/skills/progress/index.ts` (fix)
- `plugins/specweave/skills/status/index.ts` (fix)
- `tests/e2e/skill-routing/core-commands.e2e.ts` (create)

---

## Phase 6: Restore Stop Hook Reflection (US-006)

### T-014: Fix stop hook dispatcher
**User Story**: US-006 | **Satisfies ACs**: AC-US6-01 | **Status**: [ ] pending
**Model**: 💎 Opus

Ensure stop hook calls reflection system on session end.

**Dependencies**: None

**Test Plan** (TDD - RED phase):
```typescript
// tests/integration/hooks/stop-hook.test.ts
describe('Stop Hook Reflection', () => {
  it('should call reflection system on stop', async () => {
    const reflectSpy = vi.spyOn(ReflectionSystem.prototype, 'analyzeSession');

    // Trigger stop hook
    await execAsync('claude-code --stop');

    expect(reflectSpy).toHaveBeenCalled();
  });

  it('should pass session data to reflection', async () => {
    const reflectSpy = vi.spyOn(ReflectionSystem.prototype, 'analyzeSession');

    await execAsync('claude-code --stop');

    expect(reflectSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: expect.any(String),
        startTime: expect.any(Date),
        commands: expect.any(Array)
      })
    );
  });
});
```

**Files**:
- `plugins/specweave/hooks/stop-dispatcher.sh` (fix)
- `tests/integration/hooks/stop-hook.test.ts` (create)

---

### T-015: Implement reflection analyzer
**User Story**: US-006 | **Satisfies ACs**: AC-US6-02, AC-US6-03, AC-US6-04 | **Status**: [ ] pending
**Model**: 💎 Opus

Analyze session for patterns and extract learnings.

**Dependencies**: T-014

**Test Plan** (TDD - RED phase):
```typescript
// tests/unit/reflection/session-analyzer.test.ts
describe('SessionAnalyzer', () => {
  it('should extract learnings from session', async () => {
    const analyzer = new SessionAnalyzer();
    const session = {
      commands: ['sw:increment', 'sw:do', 'sw:validate'],
      filesModified: ['spec.md', 'tasks.md'],
      errors: []
    };

    const learnings = await analyzer.analyze(session);

    expect(learnings).toHaveLength.greaterThan(0);
    expect(learnings[0].category).toBeDefined();
    expect(learnings[0].content).toBeDefined();
  });

  it('should categorize learnings', async () => {
    const analyzer = new SessionAnalyzer();
    const learning = {
      type: 'error_resolution',
      content: 'Fixed syntax error in hook'
    };

    const category = analyzer.categorize(learning);

    expect(category).toBe('testing');
  });
});
```

**Files**:
- `src/core/reflection/session-analyzer.ts` (create)
- `tests/unit/reflection/session-analyzer.test.ts` (create)

---

### T-016: Add reflection skip for short sessions
**User Story**: US-006 | **Satisfies ACs**: AC-US6-05, AC-US6-07 | **Status**: [ ] pending
**Model**: ⚡ Haiku

Skip reflection for sessions <5 minutes or when disabled.

**Dependencies**: T-015

**Test Plan** (TDD - RED phase):
```typescript
// tests/unit/reflection/reflection-guard.test.ts
describe('ReflectionGuard', () => {
  it('should skip sessions shorter than 5 minutes', () => {
    const guard = new ReflectionGuard();
    const session = {
      startTime: new Date(Date.now() - 60000), // 1 minute ago
      endTime: new Date()
    };

    expect(guard.shouldReflect(session)).toBe(false);
  });

  it('should skip when SPECWEAVE_REFLECT_OFF=1', () => {
    process.env.SPECWEAVE_REFLECT_OFF = '1';
    const guard = new ReflectionGuard();

    expect(guard.shouldReflect({ duration: 600000 })).toBe(false);
  });

  it('should allow manual trigger', () => {
    const guard = new ReflectionGuard();

    expect(guard.shouldReflect({ duration: 60000, manual: true })).toBe(true);
  });
});
```

**Files**:
- `src/core/reflection/reflection-guard.ts` (create)
- `tests/unit/reflection/reflection-guard.test.ts` (create)

---

### T-017: Add manual reflection trigger
**User Story**: US-006 | **Satisfies ACs**: AC-US6-06 | **Status**: [ ] pending
**Model**: ⚡ Haiku

Create `specweave reflect --session=current` command.

**Dependencies**: T-015, T-016

**Test Plan** (TDD - RED phase):
```typescript
// tests/integration/cli/reflect.test.ts
describe('specweave reflect', () => {
  it('should run reflection on current session', async () => {
    const { stdout } = await execAsync('specweave reflect --session=current');

    expect(stdout).toContain('Session reflection complete');
    expect(stdout).toContain('learnings captured');
  });

  it('should save learnings to memory files', async () => {
    await execAsync('specweave reflect --session=current');

    const memoryFiles = fs.readdirSync('.specweave/memory/');
    expect(memoryFiles.length).toBeGreaterThan(0);
  });
});
```

**Files**:
- `src/cli/commands/reflect.ts` (modify)
- `tests/integration/cli/reflect.test.ts` (create)

---

## Phase 7: Integration Testing

### T-018: End-to-end workflow test
**User Story**: All | **Satisfies ACs**: All | **Status**: [ ] pending
**Model**: 💎 Opus

Test complete workflow: hook failure → warning → diagnostic → fix.

**Dependencies**: All previous tasks

**Test Plan** (E2E):
```typescript
// tests/e2e/hook-visibility/complete-workflow.e2e.ts
describe('Hook Visibility Complete Workflow', () => {
  it('should surface hook failure and guide user to fix', async () => {
    // 1. Trigger hook that will fail
    const response = await simulateHookExecution('broken-hook');

    // 2. Verify warning in response
    expect(response.warnings).toHaveLength(1);
    expect(response.warnings[0].severity).toBe('ERROR');
    expect(response.warnings[0].recommendation).toContain('specweave hook-status');

    // 3. Run hook-status command
    const { stdout: status } = await execAsync('specweave hook-status');
    expect(status).toContain('❌ FAILED');
    expect(status).toContain('Recommendations:');

    // 4. View logs
    const { stdout: logs } = await execAsync('specweave logs hooks --hook=broken-hook --tail=10');
    expect(logs).toContain('error');

    // 5. Fix issue (cleanup sessions)
    await execAsync('specweave cleanup-sessions --force', { input: 'y\n' });

    // 6. Verify fix
    const { stdout: fixedStatus } = await execAsync('specweave hook-status');
    expect(fixedStatus).toContain('✅ OK');
  });
});
```

**Files**:
- `tests/e2e/hook-visibility/complete-workflow.e2e.ts` (create)

---

## Summary

**Total Tasks**: 18
**Estimated Effort**: 1 week (P0 hotfix - focused execution)
**Test Strategy**: TDD mode (write failing tests first)

**Critical Path**:
1. Hook response warnings (T-001, T-002, T-003)
2. Real-time logging (T-004, T-005, T-006)
3. Diagnostic commands (T-007, T-008, T-009, T-010)
4. Skill routing fixes (T-011, T-012, T-013)
5. Reflection restoration (T-014, T-015, T-016, T-017)
6. E2E validation (T-018)

**Success Criteria**:
- All 6 User Stories fully implemented
- All 43 Acceptance Criteria passing
- Test coverage: Unit >85%, Integration >80%, E2E >90%
- Zero silent hook failures - all surfaced to user
- Commands `/sw:progress`, `/sw:status`, `/sw:reflect` functional
- Diagnostic commands reduce debugging time from hours to minutes
