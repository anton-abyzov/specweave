# Implementation Plan: Remove Frontmatter Project Field

**Increment**: 0140-remove-frontmatter-project-field
**Last Updated**: 2025-12-10

---

## Architecture Overview

### Current State (Problem)

```
spec.md YAML frontmatter
├─ project: "my-app"  ← REDUNDANT, CONFUSING
│
User Story Content
├─ ### US-001: Feature
│   ├─ **Project**: my-app  ← ACTUAL SOURCE OF TRUTH
│   ├─ **Board**: frontend
│
Living Docs Sync
├─ Reads frontmatter.project
├─ Uses as fallback for extractUserStories()
├─ BUT resolveProjectPath() ignores it in single-project!
│
Validation Hooks
├─ Enforces frontmatter.project exists
├─ Must match config or listed projects
├─ BUT value is often ignored by resolution logic
```

**Problems**:
1. Duplication: Same info in 2 places (frontmatter + per-US)
2. Confusion: Which is source of truth?
3. Single-project mode: frontmatter required but ignored
4. Cross-project: frontmatter can't represent multiple projects
5. Maintenance: 70+ files must stay in sync

### Target State (Solution)

```
spec.md YAML frontmatter
├─ NO project field  ← REMOVED
│
User Story Content
├─ ### US-001: Feature
│   ├─ **Project**: my-app  ← SINGLE SOURCE OF TRUTH
│   ├─ **Board**: frontend  ← (for 2-level)
│
ProjectResolutionService (NEW)
├─ resolveProjectForIncrement(id)
│   ├─ 1. Extract from per-US fields (primary)
│   ├─ 2. Fallback to config.project.name (single-project)
│   ├─ 3. Fallback to intelligent detection
│   └─ Returns: Resolved project ID + confidence
│
Living Docs Sync
├─ Uses ProjectResolutionService
├─ No frontmatter dependencies
│
Validation Hooks
├─ Validates per-US **Project**: fields only
├─ No frontmatter validation (optional field)
```

**Benefits**:
1. Single source of truth: per-US fields
2. Clear semantics: explicit per-story assignment
3. Simple templates: no redundant field
4. Better cross-project support: each US independent
5. Easier maintenance: one place to update

---

## Phase 1: Create ProjectResolutionService

### 1.1 Service Interface

**File**: `src/core/project/project-resolution.ts`

```typescript
import { ConfigManager } from '../config/config-manager.js';
import { Logger } from '../../utils/logger.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface ResolvedProject {
  projectId: string;
  confidence: 'high' | 'medium' | 'low';
  source: 'per-us' | 'config' | 'detection' | 'fallback';
  reasoning: string[];
}

export class ProjectResolutionService {
  private cache = new Map<string, ResolvedProject>();
  private configManager: ConfigManager;
  private logger: Logger;
  private projectRoot: string;

  constructor(
    projectRoot: string,
    options: { logger?: Logger; configManager?: ConfigManager } = {}
  ) {
    this.projectRoot = projectRoot;
    this.logger = options.logger || console;
    this.configManager = options.configManager || new ConfigManager(projectRoot);
  }

  /**
   * Resolve project for an increment with priority-based fallback
   */
  async resolveProjectForIncrement(incrementId: string): Promise<ResolvedProject> {
    // Check cache first
    const cached = this.cache.get(incrementId);
    if (cached) {
      this.logger.debug(`Using cached project resolution for ${incrementId}`);
      return cached;
    }

    // Resolution priority chain
    const resolved =
      await this.resolveFromPerUSFields(incrementId) ||
      await this.resolveFromConfig(incrementId) ||
      await this.resolveFromIntelligentDetection(incrementId) ||
      this.resolveFallback();

    // Cache result
    this.cache.set(incrementId, resolved);

    this.logger.debug(
      `Resolved project for ${incrementId}: ${resolved.projectId} ` +
      `(${resolved.confidence}, source: ${resolved.source})`
    );

    return resolved;
  }

  /**
   * Priority 1: Extract from per-US **Project**: fields
   */
  private async resolveFromPerUSFields(
    incrementId: string
  ): Promise<ResolvedProject | null> {
    const specPath = path.join(
      this.projectRoot,
      '.specweave/increments',
      incrementId,
      'spec.md'
    );

    try {
      const content = await fs.readFile(specPath, 'utf-8');
      const projects = this.extractProjectsFromUSFields(content);

      if (projects.length === 0) {
        return null; // No per-US fields found
      }

      if (projects.length === 1) {
        // Single project - high confidence
        return {
          projectId: projects[0],
          confidence: 'high',
          source: 'per-us',
          reasoning: [`Single project found in US fields: ${projects[0]}`]
        };
      }

      // Multiple projects - use first one as primary
      return {
        projectId: projects[0],
        confidence: 'medium',
        source: 'per-us',
        reasoning: [
          `Multiple projects found: ${projects.join(', ')}`,
          `Using first project as primary: ${projects[0]}`
        ]
      };
    } catch (error) {
      this.logger.debug(`Could not extract from per-US fields: ${error}`);
      return null;
    }
  }

  /**
   * Priority 2: Use config.project.name (single-project mode)
   */
  private async resolveFromConfig(
    incrementId: string
  ): Promise<ResolvedProject | null> {
    const config = await this.configManager.read();

    const isSingleProject = config.multiProject?.enabled !== true;
    if (!isSingleProject) {
      return null; // Multi-project mode, can't use config fallback
    }

    const projectName = config.project?.name;
    if (!projectName) {
      return null; // No project name in config
    }

    return {
      projectId: projectName,
      confidence: 'high',
      source: 'config',
      reasoning: [
        'Single-project mode detected',
        `Using project.name from config: ${projectName}`
      ]
    };
  }

  /**
   * Priority 3: Intelligent detection from increment content
   */
  private async resolveFromIntelligentDetection(
    incrementId: string
  ): Promise<ResolvedProject | null> {
    const specPath = path.join(
      this.projectRoot,
      '.specweave/increments',
      incrementId,
      'spec.md'
    );

    try {
      const content = await fs.readFile(specPath, 'utf-8');
      const config = await this.configManager.read();

      // Get available projects
      const availableProjects = this.getAvailableProjects(config);
      if (availableProjects.length === 0) {
        return null;
      }

      // Score each project based on keyword matching
      const scores = new Map<string, number>();
      const keywords = this.extractKeywords(content);

      for (const project of availableProjects) {
        let score = 0;

        // Match project name
        if (keywords.has(project.id.toLowerCase())) {
          score += 10;
        }

        // Match project keywords (if configured)
        const projectKeywords = project.keywords || [];
        for (const keyword of projectKeywords) {
          if (keywords.has(keyword.toLowerCase())) {
            score += 3;
          }
        }

        scores.set(project.id, score);
      }

      // Find highest scoring project
      const bestMatch = Array.from(scores.entries())
        .sort((a, b) => b[1] - a[1])[0];

      if (bestMatch && bestMatch[1] > 0) {
        return {
          projectId: bestMatch[0],
          confidence: bestMatch[1] >= 10 ? 'medium' : 'low',
          source: 'detection',
          reasoning: [
            `Intelligent detection based on keywords`,
            `Best match: ${bestMatch[0]} (score: ${bestMatch[1]})`
          ]
        };
      }

      return null;
    } catch (error) {
      this.logger.debug(`Intelligent detection failed: ${error}`);
      return null;
    }
  }

  /**
   * Priority 4: Ultimate fallback - first available project
   */
  private resolveFallback(): ResolvedProject {
    // This should rarely happen in practice
    return {
      projectId: 'default',
      confidence: 'low',
      source: 'fallback',
      reasoning: [
        'No project could be resolved from any source',
        'Using fallback project: default'
      ]
    };
  }

  /**
   * Extract project IDs from **Project**: fields in spec.md
   */
  private extractProjectsFromUSFields(content: string): string[] {
    const projectPattern = /\*\*Project\*\*:\s*([a-z0-9-]+)/gi;
    const projects = new Set<string>();

    let match;
    while ((match = projectPattern.exec(content)) !== null) {
      projects.add(match[1].toLowerCase());
    }

    return Array.from(projects);
  }

  /**
   * Extract keywords from spec content for intelligent matching
   */
  private extractKeywords(content: string): Set<string> {
    const words = content
      .toLowerCase()
      .split(/\W+/)
      .filter(w => w.length > 3);

    return new Set(words);
  }

  /**
   * Get available projects from config
   */
  private getAvailableProjects(config: any): Array<{id: string; keywords?: string[]}> {
    if (config.multiProject?.enabled) {
      return Object.entries(config.multiProject.projects || {}).map(
        ([id, proj]: [string, any]) => ({
          id,
          keywords: proj.keywords || []
        })
      );
    }

    if (config.project?.name) {
      return [{ id: config.project.name, keywords: [] }];
    }

    return [];
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}
```

### 1.2 Service Tests

**File**: `src/core/project/__tests__/project-resolution.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProjectResolutionService } from '../project-resolution.js';
import { ConfigManager } from '../../config/config-manager.js';
import * as fs from 'fs/promises';

vi.mock('fs/promises');

describe('ProjectResolutionService', () => {
  let service: ProjectResolutionService;
  let mockConfigManager: ConfigManager;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfigManager = {
      read: vi.fn()
    } as any;

    service = new ProjectResolutionService('/test/root', {
      configManager: mockConfigManager
    });
  });

  describe('resolveFromPerUSFields', () => {
    it('resolves from single **Project**: field', async () => {
      const spec = `
## User Stories

### US-001: Feature
**Project**: my-app
**As a** user...
      `;

      vi.mocked(fs.readFile).mockResolvedValue(spec);

      const result = await service.resolveProjectForIncrement('0001-test');

      expect(result.projectId).toBe('my-app');
      expect(result.confidence).toBe('high');
      expect(result.source).toBe('per-us');
    });

    it('handles multiple projects (cross-project increment)', async () => {
      const spec = `
### US-001: Frontend
**Project**: web-app

### US-002: Backend
**Project**: api-service
      `;

      vi.mocked(fs.readFile).mockResolvedValue(spec);

      const result = await service.resolveProjectForIncrement('0001-test');

      expect(result.projectId).toBe('web-app');
      expect(result.confidence).toBe('medium');
      expect(result.reasoning).toContain('Multiple projects found: web-app, api-service');
    });
  });

  describe('resolveFromConfig', () => {
    it('uses config.project.name in single-project mode', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('No spec'));
      vi.mocked(mockConfigManager.read).mockResolvedValue({
        multiProject: { enabled: false },
        project: { name: 'my-project' }
      });

      const result = await service.resolveProjectForIncrement('0001-test');

      expect(result.projectId).toBe('my-project');
      expect(result.confidence).toBe('high');
      expect(result.source).toBe('config');
    });

    it('skips config fallback in multi-project mode', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('No spec'));
      vi.mocked(mockConfigManager.read).mockResolvedValue({
        multiProject: { enabled: true, projects: {} }
      });

      const result = await service.resolveProjectForIncrement('0001-test');

      expect(result.source).toBe('fallback'); // Skipped config, went to fallback
    });
  });

  describe('caching', () => {
    it('caches resolved projects', async () => {
      const spec = `**Project**: my-app`;
      vi.mocked(fs.readFile).mockResolvedValue(spec);

      await service.resolveProjectForIncrement('0001-test');
      await service.resolveProjectForIncrement('0001-test');

      expect(fs.readFile).toHaveBeenCalledTimes(1); // Only called once
    });

    it('clears cache on demand', async () => {
      const spec = `**Project**: my-app`;
      vi.mocked(fs.readFile).mockResolvedValue(spec);

      await service.resolveProjectForIncrement('0001-test');
      service.clearCache();
      await service.resolveProjectForIncrement('0001-test');

      expect(fs.readFile).toHaveBeenCalledTimes(2);
    });
  });
});
```

---

## Phase 2: Update Living Docs Sync

### 2.1 Integrate Resolution Service

**File**: `src/core/living-docs/living-docs-sync.ts` (modifications)

```typescript
// Add import
import { ProjectResolutionService } from '../project/project-resolution.js';

export class LivingDocsSync {
  private projectResolution: ProjectResolutionService;

  constructor(
    projectRoot: string,
    projectId: string = 'default',
    options: LivingDocsSyncOptions = {}
  ) {
    // ... existing initialization ...

    // Initialize resolution service
    this.projectResolution = new ProjectResolutionService(projectRoot, {
      logger: this.logger,
      configManager: options.configManager
    });
  }

  /**
   * Resolve project path using resolution service (v0.34.1+)
   * REMOVED: frontmatter.project extraction
   */
  private async resolveProjectPath(incrementId: string): Promise<string> {
    // NEW (v0.34.1): Check if single-project mode
    const configPath = path.join(this.projectRoot, '.specweave/config.json');
    let config: any = {};
    try {
      const configContent = await fs.readFile(configPath, 'utf-8');
      config = JSON.parse(configContent);
    } catch {
      // Config not found - proceed with detection
    }

    const isSingleProject = config.multiProject?.enabled !== true;

    if (isSingleProject) {
      // Single-project mode: use resolution service
      const resolved = await this.projectResolution.resolveProjectForIncrement(incrementId);
      this.logger.log(`📁 Single-project mode: using ${resolved.projectId} (${resolved.source})`);
      return resolved.projectId;
    }

    // Multi-project mode: use resolution service with validation
    const { detectStructureLevel } = await import('../../utils/structure-level-detector.js');
    const structureConfig = detectStructureLevel(this.projectRoot);

    const resolved = await this.projectResolution.resolveProjectForIncrement(incrementId);
    const project = resolved.projectId;

    // Validate project exists in config
    if (structureConfig.level === 2) {
      const projectConfig = structureConfig.projects.find(p => p.id === project);
      if (!projectConfig) {
        throw new Error(
          `Resolved project '${project}' not found in configuration. ` +
          `Available: ${structureConfig.projects.map(p => p.id).join(', ')}`
        );
      }

      // For 2-level, we still need board from spec (TODO: future enhancement)
      const { board } = await this.extractProjectBoardFromSpec(incrementId);

      if (!board) {
        throw new Error(
          `Missing 'board:' for 2-level structure. Project: ${project}`
        );
      }

      return `${project}/${board}`;
    }

    // 1-level structure: just return resolved project
    return project;
  }

  /**
   * Parse increment spec (REMOVED frontmatter.project usage)
   */
  private async parseIncrementSpec(incrementId: string): Promise<IncrementSpec> {
    // ... existing parsing logic ...

    // REMOVED: const defaultProject = frontmatter.project || this.projectId;

    // NEW: Use resolution service
    const resolved = await this.projectResolution.resolveProjectForIncrement(incrementId);
    const defaultProject = resolved.projectId;

    const userStories = extractUserStories(bodyContent, defaultProject);

    return {
      incrementId,
      title,
      frontmatter, // Still pass frontmatter (other fields may exist)
      overview,
      userStories,
      acceptanceCriteria,
      technicalRequirements,
      outOfScope,
      dependencies
    };
  }
}
```

### 2.2 Remove Frontmatter References

**Files to update**:
- `src/core/living-docs/project-detector.ts` - Remove frontmatter scoring
- `src/core/living-docs/hierarchy-mapper.ts` - Remove `detectProjectsFromFrontmatter()`
- `src/core/specs/spec-identifier-detector.ts` - Use resolution service
- `plugins/specweave-github/lib/user-story-issue-builder.ts` - Remove frontmatter label

---

## Phase 3: Update Templates

### 3.1 Single-Project Template

**File**: `plugins/specweave/skills/increment-planner/templates/spec-single-project.md`

```yaml
---
increment: {{INCREMENT_ID}}
title: "{{FEATURE_TITLE}}"
priority: {{PRIORITY}}
status: planned
created: {{DATE}}
type: {{TYPE}}
test_mode: {{TEST_MODE}}
coverage_target: {{COVERAGE_TARGET}}
# NO project field - resolved from per-US fields or config
---

## User Stories

### US-001: {{FEATURE_NAME}}
**Project**: {{PROJECT_ID}}  <!-- Required: explicit per-US assignment -->
**Priority**: P1

**As a** {{USER_ROLE}}
**I want** {{USER_GOAL}}
**So that** {{USER_BENEFIT}}

**Acceptance Criteria**:
- [ ] **AC-US1-01**: {{CRITERION_1}}
- [ ] **AC-US1-02**: {{CRITERION_2}}
```

### 3.2 Multi-Project Template

**File**: `plugins/specweave/skills/increment-planner/templates/spec-multi-project.md`

```yaml
---
increment: {{INCREMENT_ID}}
title: "{{FEATURE_TITLE}}"
priority: {{PRIORITY}}
status: planned
created: {{DATE}}
type: {{TYPE}}
test_mode: {{TEST_MODE}}
coverage_target: {{COVERAGE_TARGET}}
# NO project/board fields - each US specifies its own
---

## User Stories

### US-FE-001: {{FRONTEND_FEATURE}}
**Project**: {{PROJECT_FE_ID}}  <!-- Required: explicit per-US -->
**Board**: {{BOARD_FE_ID}}      <!-- Required for 2-level -->
**Priority**: P1

**As a** {{USER_ROLE}}
**I want** {{USER_GOAL}}
**So that** {{USER_BENEFIT}}

**Acceptance Criteria**:
- [ ] **AC-FE-US1-01**: {{CRITERION_1}}
- [ ] **AC-FE-US1-02**: {{CRITERION_2}}

---

### US-BE-001: {{BACKEND_FEATURE}}
**Project**: {{PROJECT_BE_ID}}  <!-- Different project -->
**Board**: {{BOARD_BE_ID}}      <!-- Different board -->
**Priority**: P1

**As a** {{USER_ROLE}}
**I want** {{USER_GOAL}}
**So that** {{USER_BENEFIT}}

**Acceptance Criteria**:
- [ ] **AC-BE-US1-01**: {{CRITERION_1}}
- [ ] **AC-BE-US1-02**: {{CRITERION_2}}
```

---

## Phase 4: Update Validation Hooks

### 4.1 Make Frontmatter Optional

**File**: `plugins/specweave/hooks/spec-project-validator.sh`

```bash
#!/usr/bin/env bash
# spec-project-validator.sh - Validate per-US project fields (v0.34.1+)
#
# NEW BEHAVIOR (v0.34.1):
# - Frontmatter project: field is OPTIONAL (no longer validated)
# - Per-US **Project**: fields are MANDATORY (primary validation)
# - Per-US **Board**: fields are MANDATORY for 2-level

# Extract per-US project fields
US_PROJECTS=$(echo "$SPEC_CONTENT" | grep -oP '\*\*Project\*\*:\s*\K[a-z0-9-]+' | sort -u)

# Count user stories
US_COUNT=$(echo "$SPEC_CONTENT" | grep -cP '^###\s+US-')

# Validation: Each US must have explicit **Project**: field
if [ "$US_COUNT" -gt 0 ] && [ -z "$US_PROJECTS" ]; then
  echo '{"decision": "block", "reason": "Missing **Project**: fields in user stories.\n\nEach user story MUST have explicit project assignment.\n\nAdd to each US:\n**Project**: {project-id}\n\nRun: specweave context projects"}'
  exit 0
fi

# Validate projects exist in config
for PROJECT in $US_PROJECTS; do
  if ! echo "$AVAILABLE_PROJECTS" | grep -qw "$PROJECT"; then
    echo "{\"decision\": \"block\", \"reason\": \"Invalid project: $PROJECT\n\nAvailable: $AVAILABLE_PROJECTS\n\nRun: specweave context projects\"}"
    exit 0
  fi
done

# 2-level validation (board fields)
if [ "$STRUCTURE_LEVEL" = "2" ]; then
  US_BOARDS=$(echo "$SPEC_CONTENT" | grep -oP '\*\*Board\*\*:\s*\K[a-z0-9-]+' | sort -u)

  if [ "$US_COUNT" -gt 0 ] && [ -z "$US_BOARDS" ]; then
    echo '{"decision": "block", "reason": "2-level structure requires **Board**: field per US"}'
    exit 0
  fi
fi

# Allow (no frontmatter validation)
echo '{"decision": "allow"}'
```

---

## Phase 5: Migration Script

### 5.1 Automated Migration

**File**: `scripts/migrate-project-frontmatter.ts`

```typescript
import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';

interface MigrationResult {
  incrementId: string;
  action: 'removed' | 'skipped' | 'error';
  reason: string;
  backup?: string;
}

async function migrateIncrement(specPath: string): Promise<MigrationResult> {
  const incrementId = path.basename(path.dirname(specPath));

  try {
    const content = await fs.readFile(specPath, 'utf-8');

    // Check if frontmatter has project field
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) {
      return {
        incrementId,
        action: 'skipped',
        reason: 'No YAML frontmatter found'
      };
    }

    const frontmatter = frontmatterMatch[1];
    if (!frontmatter.includes('project:')) {
      return {
        incrementId,
        action: 'skipped',
        reason: 'No project field in frontmatter'
      };
    }

    // Validate per-US fields exist
    const usProjects = content.match(/\*\*Project\*\*:\s*([a-z0-9-]+)/gi);
    if (!usProjects || usProjects.length === 0) {
      return {
        incrementId,
        action: 'error',
        reason: 'No per-US **Project**: fields found - manual review needed'
      };
    }

    // Backup original
    const backupPath = specPath + '.backup';
    await fs.copyFile(specPath, backupPath);

    // Remove project: line from frontmatter
    const newFrontmatter = frontmatter
      .split('\n')
      .filter(line => !line.match(/^project:\s/))
      .join('\n');

    const newContent = content.replace(
      frontmatterMatch[0],
      `---\n${newFrontmatter}\n---`
    );

    await fs.writeFile(specPath, newContent, 'utf-8');

    return {
      incrementId,
      action: 'removed',
      reason: `Removed frontmatter project field (${usProjects.length} per-US fields found)`,
      backup: backupPath
    };
  } catch (error) {
    return {
      incrementId,
      action: 'error',
      reason: `Migration failed: ${error.message}`
    };
  }
}

async function main() {
  const specPaths = await glob('.specweave/increments/*/spec.md');

  console.log(`Found ${specPaths.length} increments to migrate\n`);

  const results: MigrationResult[] = [];

  for (const specPath of specPaths) {
    const result = await migrateIncrement(specPath);
    results.push(result);

    const icon = result.action === 'removed' ? '✅' :
                 result.action === 'skipped' ? '⏭️' : '❌';
    console.log(`${icon} ${result.incrementId}: ${result.reason}`);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('Migration Summary:');
  console.log(`  Removed: ${results.filter(r => r.action === 'removed').length}`);
  console.log(`  Skipped: ${results.filter(r => r.action === 'skipped').length}`);
  console.log(`  Errors: ${results.filter(r => r.action === 'error').length}`);

  // Save detailed report
  const report = {
    timestamp: new Date().toISOString(),
    results
  };

  await fs.writeFile(
    '.specweave/migration-report.json',
    JSON.stringify(report, null, 2)
  );

  console.log('\nDetailed report: .specweave/migration-report.json');
}

main().catch(console.error);
```

---

## Phase 6: Documentation Updates

### 6.1 CLAUDE.md Updates

**File**: `CLAUDE.md` (section 2c - complete rewrite)

```markdown
### 2c. Per-US Project Fields - Source of Truth (v0.34.1+)

**CRITICAL CHANGE (v0.34.1): Frontmatter `project:` field REMOVED**

**NEW ARCHITECTURE:**
- ✅ Each User Story has **Project**: field (source of truth)
- ✅ ProjectResolutionService provides centralized resolution
- ✅ Fallback to config.project.name in single-project mode
- ❌ NO frontmatter project: field (removed in v0.34.1)

**Single-project mode** (multiProject.enabled: false):
```yaml
---
increment: 0001-feature
# NO project field
---

### US-001: Feature Name
**Project**: my-app  # ← Explicit (or resolved from config)
```

**Multi-project mode** (multiProject.enabled: true):
```yaml
---
increment: 0001-feature
# NO project/board fields
---

### US-001: Frontend Feature
**Project**: web-app      # ← Explicit per-US
**Board**: frontend       # ← For 2-level structures

### US-002: Backend Feature
**Project**: api-service  # ← Different project
**Board**: backend        # ← Different board
```

**Why This Change?**
- Single source of truth: per-US fields
- Better cross-project support
- Simpler templates and validation
- Eliminates redundancy and confusion
```

### 6.2 ADR Creation

**File**: `.specweave/docs/internal/architecture/adr/0140-remove-frontmatter-project.md`

(Complete ADR documenting decision, context, alternatives, consequences)

---

## Testing Strategy

### Phase 7.1: Unit Tests

- `project-resolution.test.ts` - 100% coverage of resolution service
- `living-docs-sync.test.ts` - Updated to use resolution service
- `spec-identifier-detector.test.ts` - Updated validation tests

### Phase 7.2: Integration Tests

- End-to-end increment creation without frontmatter
- Living docs sync with resolution service
- External tool sync using resolved projects
- Migration script dry-run validation

### Phase 7.3: Regression Tests

- All existing tests must pass
- No breaking changes to user workflows
- Backward compatibility verified

---

## Rollout Plan

### Stage 1: Feature Complete (Week 1)
1. Implement ProjectResolutionService
2. Update all code paths
3. Update tests
4. Internal testing

### Stage 2: Beta Testing (Week 2)
1. Update templates and validation
2. Test migration script on copy
3. Beta users test new architecture
4. Fix issues

### Stage 3: Migration (Week 3)
1. Run migration script on all projects
2. Update documentation
3. Announce changes
4. Monitor for issues

### Stage 4: Cleanup (Week 4)
1. Remove deprecated code
2. Archive old templates
3. Final documentation review

---

## Success Criteria

| Criterion | Target | Status |
|-----------|--------|--------|
| Resolution service implemented | 100% test coverage | ⏳ |
| All code paths updated | 70+ files modified | ⏳ |
| Tests passing | 100% pass rate | ⏳ |
| Migration successful | 100% of increments | ⏳ |
| Documentation updated | All docs current | ⏳ |
| Zero regressions | All workflows work | ⏳ |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking changes | Extensive testing, backward compatibility |
| Data loss during migration | Automated backups, dry-run first |
| Performance degradation | Caching, benchmarking |
| User confusion | Clear documentation, migration guide |
| Incomplete migration | Validation scripts, rollback plan |

---

## Rollback Plan

If issues arise:
1. Revert code changes via git
2. Restore backed-up spec.md files
3. Re-enable frontmatter validation
4. Communicate status to users
5. Fix issues before retry
