---
increment: 0160-plugin-cache-health-monitoring
title: Plugin Cache Health Monitoring System
priority: P0
status: abandoned
created: 2026-01-07T00:00:00.000Z
dependencies: []
structure: user-stories
tech_stack:
  detected_from: package.json
  language: typescript
  framework: node-cli
  database: filesystem
  orm: none
platform: local
estimated_cost: $0/month
---

# Plugin Cache Health Monitoring System

## Overview

Implement a comprehensive plugin cache health monitoring system that detects stale/broken cached plugins and provides automatic recovery mechanisms. This prevents silent failures like the recent reflect.sh merge conflict that went undetected for 30+ hours, causing all reflection functionality to fail silently.

## Problem Statement

**Root Cause**: The cached plugin at `~/.claude/plugins/cache/specweave/sw/1.0.0/scripts/reflect.sh` contained an unresolved merge conflict (`>>>>>>> df087427`), even though the source was fixed on Jan 7, 2026. The system had no way to detect this staleness.

**Impact**:
- Reflection system failed silently for 30+ hours
- All user corrections during that period were not captured
- No alerts or warnings about the broken state
- Issue only discovered through manual investigation

**Gap**: No validation between cached plugins and GitHub source, no proactive health monitoring, no automatic recovery mechanisms.

## User Stories

### US-001: Plugin Cache Metadata System
**Project**: specweave-dev

**As a** developer, I want plugin cache to store metadata about versions and checksums so that the system can detect when cached files become stale or corrupted.

**Acceptance Criteria**:
- [x] **AC-US1-01**: `.cache-metadata.json` file created in each plugin version directory
- [x] **AC-US1-02**: Metadata includes: pluginName, version, commitSha, lastUpdated, checksums (file -> SHA256)
- [x] **AC-US1-03**: `readMetadata()` function reads and parses metadata
- [x] **AC-US1-04**: `writeMetadata()` function writes metadata with validation
- [x] **AC-US1-05**: `getPluginCachePath()` resolves plugin cache location from `~/.claude/plugins/cache/`

**Out of Scope**:
- Automatic metadata generation during refresh (defer to future increment)

### US-002: Cache Health Monitor
**Project**: specweave-dev

**As a** developer, I want the system to validate cached files for corruption and conflicts so that broken plugins are detected before they cause failures.

**Acceptance Criteria**:
- [x] **AC-US2-01**: Detect merge conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`) in all cached files
- [x] **AC-US2-02**: Validate shell script syntax using `bash -n` for all `.sh` files
- [x] **AC-US2-03**: Compute and validate SHA256 checksums against metadata
- [x] **AC-US2-04**: Detect missing files that should exist based on metadata
- [x] **AC-US2-05**: Return structured `CacheHealthIssue[]` with severity, type, file, message, suggestion
- [x] **AC-US2-06**: Categorize severity: critical (merge conflict, syntax error), medium (checksum mismatch), low (missing optional file)

**Technical Requirements**:
- Use native `crypto` module for SHA256 hashing
- Pattern matching: `/<{7}|={7}|>{7}/` for merge conflicts
- Execute `bash -n` in child process with timeout
- Scan all files recursively in plugin cache directory

### US-003: GitHub Version Detector
**Project**: specweave-dev

**As a** developer, I want the system to compare cached plugin versions with GitHub source so that stale caches are automatically detected.

**Acceptance Criteria**:
- [x] **AC-US3-01**: Fetch latest commit SHA for plugin path from GitHub API
- [x] **AC-US3-02**: Compare cached commit SHA with GitHub HEAD
- [x] **AC-US3-03**: Identify changed files between commits using GitHub compare API
- [x] **AC-US3-04**: Return `StalenessResult` with: stale boolean, reason, cacheCommit, githubCommit, affectedFiles[], severity
- [x] **AC-US3-05**: Implement 5-minute local cache for GitHub API responses (avoid rate limits)
- [x] **AC-US3-06**: Handle rate limiting: check remaining quota, wait if needed
- [x] **AC-US3-07**: Graceful offline fallback: use cached metadata if GitHub API unavailable

**Technical Requirements**:
- Use native `fetch()` API (no @octokit/rest dependency)
- Repository: `anton-abyzov/specweave`
- Rate limits: 60 req/hr unauthenticated, 5000 with GITHUB_TOKEN
- API endpoints: `/repos/{owner}/{repo}/commits?path={path}`, `/repos/{owner}/{repo}/compare/{base}...{head}`

### US-004: Cache Invalidator
**Project**: specweave-dev

**As a** developer, I want smart cache invalidation strategies so that broken caches can be refreshed while preserving skill memories.

**Acceptance Criteria**:
- [x] **AC-US4-01**: Soft invalidation: mark cache as stale in metadata (non-destructive)
- [x] **AC-US4-02**: Hard invalidation: delete cache directory after creating backup
- [x] **AC-US4-03**: Backup skill memories before invalidation to `~/.specweave/backups/`
- [x] **AC-US4-04**: Restore skill memories after marketplace refresh completes
- [x] **AC-US4-05**: `invalidatePlugin()` accepts strategy ('soft'|'hard') and options (preserveMemories, backupFirst)
- [x] **AC-US4-06**: Validate backup completed successfully before deletion

**Dependencies**:
- Uses existing `mergeSkillMemoriesOnRefresh()` from refresh-marketplace.ts

### US-005: Proactive Startup Checker
**Project**: specweave-dev

**As a** developer, I want proactive background monitoring on CLI startup so that critical cache issues are detected immediately.

**Acceptance Criteria**:
- [ ] **AC-US5-01**: Run max once per hour (throttled check using timestamp file)
- [ ] **AC-US5-02**: Execute in <100ms (use local checks only, no GitHub API)
- [ ] **AC-US5-03**: Non-blocking: silent failure if checks error out
- [ ] **AC-US5-04**: Alert only if critical issues found (merge conflicts, syntax errors)
- [ ] **AC-US5-05**: Simple warning message with fix command: `⚠️ Plugin cache issues detected. Run: specweave cache-status`

**Technical Requirements**:
- Throttle file: `.specweave/state/.cache-check-throttle`
- Scan only `.sh` files for merge conflicts and syntax errors
- Skip checksum validation (too slow for startup)
- Skip GitHub API calls (too slow, rate limits)

### US-006: cache-status CLI Command
**Project**: specweave-dev

**As a** developer, I want a CLI command to view cache health so that I can diagnose issues and get clear fix instructions.

**Acceptance Criteria**:
- [ ] **AC-US6-01**: Command: `specweave cache-status` shows all plugins
- [ ] **AC-US6-02**: Command: `specweave cache-status sw` shows specific plugin
- [ ] **AC-US6-03**: Flag: `--fix` auto-fixes detected issues
- [ ] **AC-US6-04**: Flag: `--verbose` shows detailed diagnostics
- [ ] **AC-US6-05**: Flag: `--check-github` forces GitHub API check (uses rate limit)
- [ ] **AC-US6-06**: Output format: plugin name, version, health status (✅/⚠️/❌), issues list, fix suggestions
- [ ] **AC-US6-07**: Summary line: "X healthy, Y stale, Z critical"

**Example Output**:
```
🔍 Plugin Cache Health Check

✅ sw-github (1.0.0) - Healthy
❌ sw (1.0.0) - Critical Issues
   Issue: Merge conflict detected
   File: scripts/reflect.sh
   Line: 42 (>>>>>>> df087427)
   → Run: specweave cache-refresh sw --force

Summary: 2 healthy, 1 critical
```

### US-007: cache-refresh CLI Command
**Project**: specweave-dev

**As a** developer, I want a CLI command to refresh broken caches so that I can quickly recover from corruption or staleness.

**Acceptance Criteria**:
- [ ] **AC-US7-01**: Command: `specweave cache-refresh` smart refresh all stale
- [ ] **AC-US7-02**: Command: `specweave cache-refresh sw` refresh specific plugin
- [ ] **AC-US7-03**: Flag: `--force` performs hard refresh (delete cache)
- [ ] **AC-US7-04**: Flag: `--all` refreshes all plugins (even healthy ones)
- [ ] **AC-US7-05**: Workflow: backup memories → invalidate → refresh-marketplace → restore memories → verify
- [ ] **AC-US7-06**: Show success message with verification: "✅ Cache refreshed and verified"

**Dependencies**:
- Calls existing `specweave refresh-marketplace` after invalidation
- Integrates with cache-status for post-refresh verification

### US-008: Integration with check-hooks
**Project**: specweave-dev

**As a** developer, I want cache health integrated into existing health checks so that one command validates both hooks and cache.

**Acceptance Criteria**:
- [ ] **AC-US8-01**: New flag: `specweave check-hooks --include-cache`
- [ ] **AC-US8-02**: After hook health check, add cache health section
- [ ] **AC-US8-03**: Uses existing `CacheHealthMonitor` to validate all plugins
- [ ] **AC-US8-04**: Output format matches existing hook health output style
- [ ] **AC-US8-05**: Exit code: 0=all healthy, 1=failures, 2=critical failures (existing behavior)

**Modification Required**:
- File: `src/cli/commands/check-hooks.ts`
- Add cache health section after hook results

### US-009: Enhanced refresh-marketplace with Pre-check
**Project**: specweave-dev

**As a** developer, I want marketplace refresh to detect and fix critical cache issues automatically so that refreshes are more reliable.

**Acceptance Criteria**:
- [ ] **AC-US9-01**: Before marketplace update, run cache health check
- [ ] **AC-US9-02**: Auto-invalidate caches with critical issues (merge conflicts, syntax errors)
- [ ] **AC-US9-03**: Show warning: `⚠️ {plugin}: {reason}` for each invalidation
- [ ] **AC-US9-04**: Preserve skill memories during auto-invalidation
- [ ] **AC-US9-05**: Continue with normal refresh flow after pre-check

**Modification Required**:
- File: `src/cli/commands/refresh-marketplace.ts`
- Add `preRefreshCacheCheck()` function before marketplace update

## Success Criteria

**Primary Goal**: Detect and prevent silent plugin cache failures (like reflect.sh merge conflict)

**Measurable Outcomes**:
1. Merge conflicts detected within 100ms of CLI startup
2. Syntax errors detected before hook execution
3. Clear fix instructions provided to user
4. <2 minutes to recover from broken cache (vs 30+ hours manual discovery)
5. Zero silent failures in production

## Out of Scope

**Deferred to Future Increments**:
- Automatic metadata generation during `refresh-marketplace` (requires hook integration)
- Historical tracking of cache issues (metrics dashboard)
- Visual diff of cache vs source (CLI diff viewer)
- Selective file invalidation (only changed files, not entire cache)

## Dependencies

**Existing Code to Leverage**:
- `src/cli/commands/refresh-marketplace.ts` - Marketplace refresh logic
- `src/utils/cleanup-stale-plugins.ts` - Plugin registry manipulation patterns
- `src/core/hooks/HookHealthChecker.ts` - Health check architecture
- `src/init/repo/GitHubAPIClient.ts` - GitHub API patterns with rate limiting

**No New NPM Dependencies**:
- Use native `crypto` for SHA256
- Use native `fetch()` for GitHub API
- Use `glob` (already installed) for file scanning

## Technical Notes

**Cache Location**: `~/.claude/plugins/cache/specweave/{plugin-name}/{version}/`

**Staleness Criteria**:
1. **Critical** (immediate): Merge conflict markers, shell script syntax errors
2. **High** (recommended): Commit SHA mismatch (cached ≠ GitHub)
3. **Medium** (informational): Checksum mismatch, cache age >7 days
4. **Low** (FYI): Cache age >14 days (no GitHub check needed)

**Error Handling**:
- All checks are non-blocking (never break user workflow)
- Offline mode: skip GitHub checks, use local-only validation
- Rate limit exceeded: show warning, defer to next check

## Testing Strategy

**Unit Tests** (`tests/unit/plugin-cache/`):
- Merge conflict detection
- Bash syntax validation
- Checksum computation
- Metadata read/write
- GitHub API mocking

**Integration Tests** (`tests/integration/plugin-cache/`):
- Full cache-status command
- Full cache-refresh command
- Skill memory preservation
- Rate limiting behavior

**Manual Validation**:
1. Introduce merge conflict in cached reflect.sh
2. Run `specweave cache-status`
3. Verify detection and fix suggestion
4. Run `specweave cache-refresh sw --force`
5. Verify reflection works post-fix
