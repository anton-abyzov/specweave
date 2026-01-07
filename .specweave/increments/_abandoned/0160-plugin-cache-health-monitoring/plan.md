# Plugin Cache Health Monitoring - Technical Implementation Plan

## Architecture Overview

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                   Plugin Cache Manager                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ Version Detector │  │  Health Monitor  │                │
│  │ (GitHub API)     │  │  (Checksums)     │                │
│  └────────┬─────────┘  └────────┬─────────┘                │
│           │                     │                           │
│           ▼                     ▼                           │
│  ┌─────────────────────────────────────┐                   │
│  │   Staleness Analyzer                │                   │
│  │   (Compare cache vs source)          │                   │
│  └─────────────┬───────────────────────┘                   │
│                │                                            │
│                ▼                                            │
│  ┌─────────────────────────────────────┐                   │
│  │   Auto-Recovery Engine               │                   │
│  │   (Smart invalidation & refresh)     │                   │
│  └─────────────┬───────────────────────┘                   │
│                │                                            │
│                ▼                                            │
│  ┌─────────────────────────────────────┐                   │
│  │   Notification System                │                   │
│  │   (Proactive alerts)                 │                   │
│  └─────────────────────────────────────┘                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Module Design

### 1. Core Types (`src/core/plugin-cache/types.ts`)

```typescript
export interface CacheMetadata {
  pluginName: string;
  version: string;
  commitSha: string;
  lastUpdated: string;
  checksums: Record<string, string>; // file -> sha256
}

export interface StalenessResult {
  stale: boolean;
  reason: 'commit_changed' | 'merge_conflict' | 'syntax_error' | 'age' | 'none';
  cacheCommit?: string;
  githubCommit?: string;
  affectedFiles?: string[];
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface CacheHealthIssue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: 'merge_conflict' | 'syntax_error' | 'checksum_mismatch' | 'missing_file';
  file: string;
  message: string;
  suggestion: string;
}

export interface GitHubRateLimitInfo {
  remaining: number;
  reset: number;
  limit: number;
}
```

### 2. Cache Metadata Manager (`src/core/plugin-cache/cache-metadata.ts`)

**Purpose**: Read/write metadata files in plugin cache

**Key Functions**:
```typescript
export class CacheMetadataManager {
  // Read metadata from .cache-metadata.json
  static readMetadata(pluginPath: string): CacheMetadata | null

  // Write metadata with validation
  static writeMetadata(pluginPath: string, metadata: CacheMetadata): void

  // Get plugin cache path from plugin name + version
  static getPluginCachePath(pluginName: string, version: string): string

  // Compute SHA256 for file
  private static computeChecksum(filePath: string): string
}
```

**Implementation Notes**:
- Plugin cache location: `~/.claude/plugins/cache/specweave/{name}/{version}/`
- Metadata file: `.cache-metadata.json` at plugin version root
- Use native `crypto.createHash('sha256')` for checksums
- Validate JSON schema before writing

### 3. Cache Health Monitor (`src/core/plugin-cache/cache-health-monitor.ts`)

**Purpose**: Validate cached files for corruption/conflicts

**Key Functions**:
```typescript
export class CacheHealthMonitor {
  // Check entire plugin health
  async checkPluginHealth(pluginName: string, version: string): Promise<{
    healthy: boolean;
    issues: CacheHealthIssue[];
  }>

  // Detect merge conflict markers
  private detectMergeConflicts(filePath: string): boolean

  // Validate bash script syntax
  private validateBashSyntax(scriptPath: string): { valid: boolean; error?: string }

  // Validate checksums against metadata
  private validateChecksums(pluginPath: string, metadata: CacheMetadata): CacheHealthIssue[]

  // Scan all files in plugin directory
  private scanPluginFiles(pluginPath: string): string[]
}
```

**Implementation Details**:

**Merge Conflict Detection**:
```typescript
private detectMergeConflicts(filePath: string): boolean {
  const content = fs.readFileSync(filePath, 'utf8');
  return /<{7}|={7}|>{7}/.test(content);
}
```

**Bash Syntax Validation**:
```typescript
private validateBashSyntax(scriptPath: string): { valid: boolean; error?: string } {
  try {
    execSync(`bash -n "${scriptPath}"`, { stdio: 'pipe', timeout: 5000 });
    return { valid: true };
  } catch (error: any) {
    return { valid: false, error: error.stderr?.toString() };
  }
}
```

**Checksum Validation**:
```typescript
private validateChecksums(pluginPath: string, metadata: CacheMetadata): CacheHealthIssue[] {
  const issues: CacheHealthIssue[] = [];

  for (const [file, expectedHash] of Object.entries(metadata.checksums)) {
    const fullPath = path.join(pluginPath, file);
    const actualHash = this.computeChecksum(fullPath);

    if (actualHash !== expectedHash) {
      issues.push({
        severity: 'medium',
        type: 'checksum_mismatch',
        file,
        message: `Checksum mismatch detected`,
        suggestion: `File may be corrupted or manually edited`
      });
    }
  }

  return issues;
}
```

### 4. Version Detector (`src/core/plugin-cache/version-detector.ts`)

**Purpose**: Compare cached plugins with GitHub source

**Key Functions**:
```typescript
export class CacheVersionDetector {
  private apiCache: Map<string, { data: any; expires: number }>;
  private rateLimitInfo: GitHubRateLimitInfo | null;

  // Main staleness check
  async checkStaleness(pluginName: string): Promise<StalenessResult>

  // Get latest commit SHA from GitHub
  private async getGitHubLatestCommit(pluginPath: string): Promise<string>

  // Compare commits and get changed files
  private async compareCommits(base: string, head: string): Promise<string[]>

  // Rate limit management
  private async withRateLimit<T>(fn: () => Promise<T>): Promise<T>

  // API response caching
  private getCached<T>(key: string): T | null
  private setCached<T>(key: string, data: T, ttlMs: number): void
}
```

**GitHub API Integration**:

**Fetch Latest Commit**:
```typescript
private async getGitHubLatestCommit(pluginPath: string): Promise<string> {
  const url = `https://api.github.com/repos/anton-abyzov/specweave/commits?path=${pluginPath}&per_page=1`;

  const response = await fetch(url, {
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      ...(process.env.GITHUB_TOKEN && { 'Authorization': `Bearer ${process.env.GITHUB_TOKEN}` })
    }
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const commits = await response.json();
  return commits[0].sha;
}
```

**Rate Limiting**:
```typescript
private async withRateLimit<T>(fn: () => Promise<T>): Promise<T> {
  // Check rate limit before API call
  const rateLimitUrl = 'https://api.github.com/rate_limit';
  const response = await fetch(rateLimitUrl);
  const data = await response.json();

  this.rateLimitInfo = data.rate;

  if (data.rate.remaining < 10) {
    const waitTime = data.rate.reset * 1000 - Date.now();
    console.warn(`⏱️  Rate limit low, waiting ${Math.ceil(waitTime / 1000)}s...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  return fn();
}
```

**Local Caching**:
```typescript
private getCached<T>(key: string): T | null {
  const cached = this.apiCache.get(key);
  if (!cached || cached.expires < Date.now()) {
    this.apiCache.delete(key);
    return null;
  }
  return cached.data as T;
}

private setCached<T>(key: string, data: T, ttlMs: number = 300000): void {
  this.apiCache.set(key, {
    data,
    expires: Date.now() + ttlMs
  });
}
```

### 5. Cache Invalidator (`src/core/plugin-cache/cache-invalidator.ts`)

**Purpose**: Smart cache refresh with memory preservation

**Key Functions**:
```typescript
export class CacheInvalidator {
  // Main invalidation method
  async invalidatePlugin(
    pluginName: string,
    strategy: 'soft' | 'hard',
    options: { preserveMemories: boolean; backupFirst: boolean }
  ): Promise<void>

  // Backup skill memories
  async backupSkillMemories(pluginName: string): Promise<string>

  // Restore memories after refresh
  async restoreSkillMemories(backupPath: string): Promise<void>
}
```

**Implementation**:

**Soft Invalidation**:
```typescript
async invalidatePlugin(pluginName: string, strategy: 'soft', options): Promise<void> {
  const metadata = CacheMetadataManager.readMetadata(pluginPath);
  if (!metadata) return;

  // Mark as stale in metadata
  metadata.lastUpdated = new Date().toISOString();
  CacheMetadataManager.writeMetadata(pluginPath, metadata);

  console.log(`✅ Marked ${pluginName} as stale (will refresh on next marketplace update)`);
}
```

**Hard Invalidation**:
```typescript
async invalidatePlugin(pluginName: string, strategy: 'hard', options): Promise<void> {
  // Step 1: Backup memories if requested
  let backupPath: string | null = null;
  if (options.preserveMemories) {
    backupPath = await this.backupSkillMemories(pluginName);
  }

  // Step 2: Backup entire cache if requested
  if (options.backupFirst) {
    const cacheBackup = path.join(os.homedir(), '.specweave/backups', `cache-${pluginName}-${Date.now()}`);
    fs.cpSync(pluginPath, cacheBackup, { recursive: true });
  }

  // Step 3: Delete cache directory
  fs.rmSync(pluginPath, { recursive: true, force: true });

  console.log(`✅ Deleted cache for ${pluginName} (will re-download on refresh)`);

  // Step 4: Trigger marketplace refresh
  execSync('specweave refresh-marketplace', { stdio: 'inherit' });

  // Step 5: Restore memories if backed up
  if (backupPath) {
    await this.restoreSkillMemories(backupPath);
  }
}
```

### 6. Startup Checker (`src/core/plugin-cache/startup-checker.ts`)

**Purpose**: Lightweight proactive monitoring

**Key Functions**:
```typescript
export class StartupChecker {
  private static THROTTLE_FILE = '.specweave/state/.cache-check-throttle';
  private static THROTTLE_MS = 3600000; // 1 hour

  // Main quick check (runs on CLI startup)
  static async quickCheck(): Promise<void>

  // Check if throttled
  private static shouldRunCheck(): boolean

  // Update throttle timestamp
  private static updateThrottle(): void
}
```

**Implementation**:
```typescript
static async quickCheck(): Promise<void> {
  // Check throttle
  if (!this.shouldRunCheck()) return;

  const plugins = this.getInstalledPlugins();
  const issues: CacheHealthIssue[] = [];

  for (const plugin of plugins) {
    const cachePath = CacheMetadataManager.getPluginCachePath(plugin.name, plugin.version);

    // Check shell scripts only (fast)
    const scripts = glob.sync(`${cachePath}/**/*.sh`);

    for (const script of scripts) {
      // Merge conflict check
      if (this.detectMergeConflicts(script)) {
        issues.push({
          severity: 'critical',
          type: 'merge_conflict',
          file: script,
          message: 'Merge conflict detected',
          suggestion: `specweave cache-refresh ${plugin.name} --force`
        });
      }

      // Syntax check
      const syntaxResult = this.validateBashSyntax(script);
      if (!syntaxResult.valid) {
        issues.push({
          severity: 'critical',
          type: 'syntax_error',
          file: script,
          message: syntaxResult.error || 'Syntax error',
          suggestion: `specweave cache-refresh ${plugin.name} --force`
        });
      }
    }
  }

  // Alert only if critical issues found
  if (issues.some(i => i.severity === 'critical')) {
    console.warn('⚠️  Plugin cache issues detected. Run: specweave cache-status');
  }

  // Update throttle
  this.updateThrottle();
}
```

## CLI Commands

### 1. cache-status Command (`src/cli/commands/cache-status.ts`)

**Usage**: `specweave cache-status [plugin] [--fix] [--verbose] [--check-github]`

**Implementation**:
```typescript
async function main() {
  const options = parseArgs(process.argv.slice(2));
  const plugins = options.plugin
    ? [getPluginInfo(options.plugin)]
    : getAllInstalledPlugins();

  const monitor = new CacheHealthMonitor();
  const detector = options.checkGithub ? new CacheVersionDetector() : null;

  console.log('🔍 Plugin Cache Health Check\n');

  let healthyCount = 0;
  let staleCount = 0;
  let criticalCount = 0;

  for (const plugin of plugins) {
    const health = await monitor.checkPluginHealth(plugin.name, plugin.version);
    const staleness = detector ? await detector.checkStaleness(plugin.name) : null;

    if (health.issues.length === 0 && (!staleness || !staleness.stale)) {
      console.log(`✅ ${plugin.name} (${plugin.version}) - Healthy`);
      healthyCount++;
    } else if (health.issues.some(i => i.severity === 'critical')) {
      console.log(`❌ ${plugin.name} (${plugin.version}) - Critical Issues`);
      health.issues.forEach(issue => {
        console.log(`   Issue: ${issue.message}`);
        console.log(`   File: ${issue.file}`);
        console.log(`   → Run: ${issue.suggestion}`);
      });
      criticalCount++;
    } else {
      console.log(`⚠️  ${plugin.name} (${plugin.version}) - Stale`);
      if (staleness) {
        console.log(`   Cache commit: ${staleness.cacheCommit?.slice(0, 7)}`);
        console.log(`   GitHub commit: ${staleness.githubCommit?.slice(0, 7)}`);
      }
      staleCount++;
    }
  }

  console.log(`\nSummary: ${healthyCount} healthy, ${staleCount} stale, ${criticalCount} critical`);

  // Auto-fix if requested
  if (options.fix && criticalCount > 0) {
    const invalidator = new CacheInvalidator();
    for (const plugin of plugins) {
      const health = await monitor.checkPluginHealth(plugin.name, plugin.version);
      if (health.issues.some(i => i.severity === 'critical')) {
        await invalidator.invalidatePlugin(plugin.name, 'hard', {
          preserveMemories: true,
          backupFirst: true
        });
      }
    }
  }

  process.exit(criticalCount > 0 ? 1 : 0);
}
```

### 2. cache-refresh Command (`src/cli/commands/cache-refresh.ts`)

**Usage**: `specweave cache-refresh [plugin] [--force] [--all]`

**Implementation**:
```typescript
async function main() {
  const options = parseArgs(process.argv.slice(2));
  const plugins = options.plugin
    ? [getPluginInfo(options.plugin)]
    : getAllInstalledPlugins();

  const invalidator = new CacheInvalidator();
  const monitor = new CacheHealthMonitor();

  for (const plugin of plugins) {
    const health = await monitor.checkPluginHealth(plugin.name, plugin.version);

    // Skip healthy plugins unless --all or --force
    if (health.healthy && !options.all && !options.force) {
      console.log(`✅ ${plugin.name} is healthy, skipping...`);
      continue;
    }

    console.log(`🔄 Refreshing ${plugin.name}...`);

    await invalidator.invalidatePlugin(plugin.name, options.force ? 'hard' : 'soft', {
      preserveMemories: true,
      backupFirst: true
    });

    // Verify after refresh
    const postHealth = await monitor.checkPluginHealth(plugin.name, plugin.version);
    if (postHealth.healthy) {
      console.log(`✅ ${plugin.name} refreshed and verified`);
    } else {
      console.log(`⚠️  ${plugin.name} still has issues after refresh`);
    }
  }
}
```

## Integration Points

### 1. CLI Startup Integration (`src/cli/cli.ts`)

**Add preAction hook**:
```typescript
import { StartupChecker } from './core/plugin-cache/startup-checker.js';

program.hook('preAction', async () => {
  // Quick cache check (non-blocking, <100ms)
  await StartupChecker.quickCheck().catch(() => {
    // Silent failure - don't block user workflow
  });
});
```

### 2. check-hooks Enhancement (`src/cli/commands/check-hooks.ts`)

**Add --include-cache flag**:
```typescript
// After existing hook checks
if (options.includeCache) {
  console.log('\n🔍 Checking plugin cache health...\n');

  const monitor = new CacheHealthMonitor();
  const plugins = await getInstalledPlugins();

  for (const plugin of plugins) {
    const health = await monitor.checkPluginHealth(plugin.name, plugin.version);
    // Display results...
  }
}
```

### 3. refresh-marketplace Enhancement (`src/cli/commands/refresh-marketplace.ts`)

**Add pre-refresh cache check**:
```typescript
async function preRefreshCacheCheck(): Promise<void> {
  const detector = new CacheVersionDetector();
  const plugins = await getInstalledPlugins();

  console.log('Checking cache health before refresh...');

  for (const plugin of plugins) {
    const staleness = await detector.checkStaleness(plugin.name);

    if (staleness.severity === 'critical') {
      console.warn(`⚠️  ${plugin.name}: ${staleness.reason}`);

      const invalidator = new CacheInvalidator();
      await invalidator.invalidatePlugin(plugin.name, 'hard', {
        preserveMemories: true,
        backupFirst: true
      });
    }
  }
}

// At start of main()
await preRefreshCacheCheck();
```

## Testing Strategy

### Unit Tests

**Test Files**:
- `tests/unit/plugin-cache/cache-metadata.test.ts`
- `tests/unit/plugin-cache/cache-health-monitor.test.ts`
- `tests/unit/plugin-cache/version-detector.test.ts`
- `tests/unit/plugin-cache/cache-invalidator.test.ts`
- `tests/unit/plugin-cache/startup-checker.test.ts`

**Key Test Cases**:
1. Merge conflict detection (various patterns)
2. Bash syntax validation (valid/invalid scripts)
3. SHA256 checksum computation
4. Metadata read/write with validation
5. GitHub API mocking (rate limits, errors, offline)
6. Cache invalidation (soft vs hard)
7. Memory backup/restore

### Integration Tests

**Test Files**:
- `tests/integration/plugin-cache/cache-status.spec.ts`
- `tests/integration/plugin-cache/cache-refresh.spec.ts`
- `tests/integration/plugin-cache/end-to-end.spec.ts`

**Scenarios**:
1. Full cache-status on broken plugin
2. Full cache-refresh with memory preservation
3. Rate limiting behavior (mock GitHub API)
4. Offline mode (network unavailable)
5. Multiple concurrent refreshes

## Error Handling

**Principles**:
1. All checks are non-blocking (never break user workflow)
2. Offline mode: skip GitHub checks, use local-only validation
3. Rate limit exceeded: show warning, defer to next check
4. Invalid metadata: regenerate from filesystem scan
5. Missing cache directory: skip validation

**Example**:
```typescript
try {
  const health = await monitor.checkPluginHealth(pluginName, version);
} catch (error) {
  // Silent failure for startup checks
  if (isStartupCheck) {
    return;
  }

  // User-facing command: show error but continue
  console.warn(`⚠️  Could not check ${pluginName}: ${error.message}`);
}
```

## Security Considerations

1. **Command Injection**: Use `execSync` with proper escaping for bash -n
2. **Path Traversal**: Validate plugin paths are within cache directory
3. **GitHub Token**: Never log GITHUB_TOKEN, use environment variable only
4. **File Permissions**: Respect user file permissions during cache operations
5. **Backup Integrity**: Verify backups completed before deletion

## Performance Targets

1. **Startup Check**: <100ms (throttled to max 1/hour)
2. **cache-status**: <2s for all plugins (without GitHub check)
3. **cache-status --check-github**: <5s (with GitHub API + caching)
4. **cache-refresh --force**: <30s (includes marketplace refresh)
5. **Memory Usage**: <50MB for cache operations

## Success Metrics

**Before Implementation**: reflect.sh merge conflict undetected for 30+ hours

**After Implementation**:
- Merge conflicts detected within 100ms of CLI startup ✅
- Clear fix instructions provided immediately ✅
- Recovery time: <2 minutes (user runs cache-refresh) ✅
- Zero silent failures in production ✅
