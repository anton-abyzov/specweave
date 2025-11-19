# ULTRATHINK: Project-Specific AC Generation Architecture

**Date**: 2025-11-15
**Context**: User identified critical issues with GitHub sync blindly copying AC
**Scope**: Fix status sync + implement intelligent AC project-specific generation

---

## Problem Analysis

### Problem 1: Status Sync Bug

**Current Behavior**:
- User story has `status: complete` in frontmatter
- GitHub issue #567 shows as OPEN (should be CLOSED)

**Root Cause**:
```typescript
// github-feature-sync.ts:350-373
private async createUserStoryIssue(issueContent, milestoneTitle) {
  await execFileNoThrow('gh', [
    'issue', 'create',
    '--title', issueContent.title,
    '--body', issueContent.body,
    '--milestone', milestoneTitle,
    ...issueContent.labels.flatMap((label) => ['--label', label]),
    // ❌ MISSING: No --state flag based on user story status!
  ]);
}
```

**Impact**: All issues created as OPEN, manual close required

---

### Problem 2: AC Blindly Copied

**Current Behavior**:
```
Increment spec.md:
  US-003: Status Mapping Configuration
    AC-US3-01: Config schema supports status mappings
    AC-US3-02: Default mappings for GitHub/JIRA/ADO
    ...

Living Docs Sync → Creates identical files:
  specs/backend/FS-031/us-003-status-mapping.md
    AC-US3-01: Config schema supports status mappings (SAME!)
    AC-US3-02: Default mappings for GitHub/JIRA/ADO (SAME!)

  specs/frontend/FS-031/us-003-status-mapping.md
    AC-US3-01: Config schema supports status mappings (SAME!)
    AC-US3-02: Default mappings for GitHub/JIRA/ADO (SAME!)
```

**Root Cause**:
```typescript
// spec-distributor.ts:466-469
let acceptanceCriteria = this.extractAcceptanceCriteriaFromSection(content, id);
// ❌ Just extracts AC as-is, no project context applied
```

**Impact**: AC don't reflect project-specific implementation requirements

---

## Solution Design

### Phase 1: Status Sync Fix (QUICK WIN - 30 min)

**Goal**: Create GitHub issues with correct state based on user story status

**Implementation**:

```typescript
// plugins/specweave-github/lib/github-feature-sync.ts

interface CreateIssueParams {
  title: string;
  body: string;
  labels: string[];
  status?: string;  // ← NEW: Pass user story status
}

private async createUserStoryIssue(
  issueContent: CreateIssueParams,
  milestoneTitle: string
): Promise<number> {
  // ✅ NEW: Determine if issue should be closed
  const shouldBeClosed = issueContent.status &&
    ['complete', 'completed', 'done'].includes(issueContent.status.toLowerCase());

  const result = await execFileNoThrow('gh', [
    'issue',
    'create',
    '--title',
    issueContent.title,
    '--body',
    issueContent.body,
    '--milestone',
    milestoneTitle,
    // ✅ NEW: Add state flag for completed user stories
    ...(shouldBeClosed ? ['--state', 'closed'] : []),
    ...issueContent.labels.flatMap((label) => ['--label', label]),
  ]);

  if (result.exitCode !== 0) {
    throw new Error(`Failed to create GitHub Issue: ${result.stderr || result.stdout}`);
  }

  // Parse issue number from output
  const match = result.stdout.match(/issues\/(\d+)/);
  if (!match) {
    throw new Error(`Failed to parse issue number from: ${result.stdout}`);
  }

  return parseInt(match[1], 10);
}
```

**Testing**:
```typescript
// tests/e2e/github-user-story-status-sync.spec.ts

test('creates closed issue for completed user story', async () => {
  // Setup: User story with status: complete
  const userStory = {
    id: 'US-001',
    title: 'Test User Story',
    status: 'complete',
    frontmatter: { status: 'complete' }
  };

  // Execute: Sync to GitHub
  const issueNumber = await featureSync.syncFeatureToGitHub('FS-TEST');

  // Verify: Issue created as CLOSED
  const issue = await githubClient.getIssue(issueNumber);
  expect(issue.state).toBe('closed');
  expect(issue.title).toContain('US-001');
});

test('creates open issue for active user story', async () => {
  // Setup: User story with status: active
  const userStory = { status: 'active' };

  // Execute: Sync
  const issueNumber = await featureSync.syncFeatureToGitHub('FS-TEST');

  // Verify: Issue created as OPEN
  const issue = await githubClient.getIssue(issueNumber);
  expect(issue.state).toBe('open');
});
```

**Acceptance Criteria**:
- ✅ AC-FIX1-01: Issues for completed user stories created as CLOSED
- ✅ AC-FIX1-02: Issues for active user stories created as OPEN
- ✅ AC-FIX1-03: Status change from active → complete closes issue
- ✅ AC-FIX1-04: E2E test validates status sync behavior

---

### Phase 2: Project-Specific AC Generation (COMPLEX - 2-3 hours)

**Goal**: Generate different AC for backend vs frontend vs other projects

**Architecture**:

```typescript
// src/core/living-docs/spec-distributor.ts

interface ProjectContext {
  id: string;  // 'backend', 'frontend', 'mobile', etc.
  name: string;  // 'Backend Services'
  type: 'backend' | 'frontend' | 'mobile' | 'infrastructure' | 'generic';
  techStack: string[];  // ['Node.js', 'PostgreSQL']
  keywords: string[];  // ['api', 'service']
}

interface AcceptanceCriterion {
  id: string;  // AC-US3-01
  description: string;
  priority?: string;
  testable: boolean;
  completed: boolean;
  projectSpecific?: boolean;  // ← NEW: Mark if project-specific
}

class ACProjectSpecificGenerator {
  /**
   * Make acceptance criteria project-specific
   *
   * Strategy:
   * 1. Detect if AC is generic (applies to all projects)
   * 2. Detect if AC needs project-specific variant
   * 3. Rewrite AC description based on project context
   * 4. Add project suffix to AC ID
   */
  makeProjectSpecific(
    ac: AcceptanceCriterion[],
    userStoryId: string,
    projectContext: ProjectContext
  ): AcceptanceCriterion[] {
    return ac.map(criterion => {
      // Step 1: Detect if AC is generic
      if (this.isGenericAC(criterion.description)) {
        return criterion; // Keep as-is
      }

      // Step 2: Detect if AC needs project-specific variant
      const needsProjectVariant = this.needsProjectVariant(
        criterion.description,
        projectContext
      );

      if (!needsProjectVariant) {
        return criterion; // Keep as-is
      }

      // Step 3: Rewrite AC for this project
      const projectSpecificDesc = this.rewriteACForProject(
        criterion.description,
        projectContext
      );

      // Step 4: Add project suffix to ID
      const projectSuffix = this.getProjectSuffix(projectContext);
      const projectSpecificId = `${criterion.id}-${projectSuffix}`;

      return {
        ...criterion,
        id: projectSpecificId,
        description: projectSpecificDesc,
        projectSpecific: true,
      };
    });
  }

  /**
   * Detect if AC is generic (applies to all projects without changes)
   */
  private isGenericAC(description: string): boolean {
    const genericIndicators = [
      /config\s+schema/i,
      /default\s+(mappings|settings|configuration)/i,
      /validation\s+prevents/i,
      /error\s+handling/i,
      /documentation\s+includes/i,
      /logging/i,
    ];

    return genericIndicators.some(pattern => pattern.test(description));
  }

  /**
   * Detect if AC needs project-specific variant
   */
  private needsProjectVariant(
    description: string,
    projectContext: ProjectContext
  ): boolean {
    // Backend-specific indicators
    if (projectContext.type === 'backend') {
      return /API|endpoint|database|service|server/i.test(description);
    }

    // Frontend-specific indicators
    if (projectContext.type === 'frontend') {
      return /UI|component|screen|form|display|render/i.test(description);
    }

    // Mobile-specific indicators
    if (projectContext.type === 'mobile') {
      return /screen|navigation|gesture|native|platform/i.test(description);
    }

    // Infrastructure-specific indicators
    if (projectContext.type === 'infrastructure') {
      return /deployment|CI\/CD|pipeline|monitoring|scaling/i.test(description);
    }

    return false;
  }

  /**
   * Rewrite AC description for specific project
   */
  private rewriteACForProject(
    description: string,
    projectContext: ProjectContext
  ): string {
    let rewritten = description;

    // Backend-specific rewrites
    if (projectContext.type === 'backend') {
      rewritten = rewritten
        .replace(/UI\s+(displays|shows)/gi, 'API returns')
        .replace(/form\s+validation/gi, 'request payload validation')
        .replace(/screen/gi, 'endpoint')
        .replace(/button\s+click/gi, 'API call')
        .replace(/user\s+sees/gi, 'API response includes');

      // Add backend context
      if (!rewritten.includes('API') && !rewritten.includes('service')) {
        rewritten = `Backend service: ${rewritten}`;
      }
    }

    // Frontend-specific rewrites
    if (projectContext.type === 'frontend') {
      rewritten = rewritten
        .replace(/API\s+endpoint/gi, 'UI component')
        .replace(/database\s+schema/gi, 'state management')
        .replace(/server\s+validates/gi, 'client-side validation')
        .replace(/returns\s+response/gi, 'displays result');

      // Add frontend context
      if (!rewritten.includes('UI') && !rewritten.includes('component')) {
        rewritten = `UI: ${rewritten}`;
      }
    }

    // Mobile-specific rewrites
    if (projectContext.type === 'mobile') {
      rewritten = rewritten
        .replace(/page/gi, 'screen')
        .replace(/click/gi, 'tap')
        .replace(/hover/gi, 'long press');

      // Add mobile context
      if (!rewritten.includes('screen') && !rewritten.includes('mobile')) {
        rewritten = `Mobile app: ${rewritten}`;
      }
    }

    return rewritten;
  }

  /**
   * Get project suffix for AC ID
   */
  private getProjectSuffix(projectContext: ProjectContext): string {
    const suffixMap: Record<string, string> = {
      backend: 'BE',
      frontend: 'FE',
      mobile: 'MOB',
      infrastructure: 'INFRA',
      generic: 'GEN',
    };

    return suffixMap[projectContext.type] || projectContext.id.slice(0, 3).toUpperCase();
  }
}
```

**Example Output**:

```markdown
<!-- Increment spec.md (GENERIC) -->
### US-003: Status Mapping Configuration

**Acceptance Criteria**:
- AC-US3-01: Config schema supports status mappings per tool
- AC-US3-02: Users can customize mappings via UI
- AC-US3-03: Validation prevents invalid state transitions

<!-- Living Docs: specs/backend/FS-031/us-003-status-mapping.md -->
### US-003: Status Mapping Configuration

**Acceptance Criteria**:
- AC-US3-01: Config schema supports status mappings per tool (P1, testable)
- AC-US3-02-BE: Backend service: Users can customize mappings via API endpoint (P2, testable)
- AC-US3-03-BE: Backend service validates request payload prevents invalid state transitions (P2, testable)

<!-- Living Docs: specs/frontend/FS-031/us-003-status-mapping.md -->
### US-003: Status Mapping Configuration

**Acceptance Criteria**:
- AC-US3-01: Config schema supports status mappings per tool (P1, testable)
- AC-US3-02-FE: UI: Users can customize mappings via configuration screen (P2, testable)
- AC-US3-03-FE: UI: Client-side validation prevents invalid state transitions (P2, testable)
```

**Testing**:

```typescript
// tests/unit/ac-project-specific-generator.test.ts

describe('ACProjectSpecificGenerator', () => {
  let generator: ACProjectSpecificGenerator;

  beforeEach(() => {
    generator = new ACProjectSpecificGenerator();
  });

  describe('isGenericAC', () => {
    test('detects config schema as generic', () => {
      const description = 'Config schema supports status mappings';
      expect(generator.isGenericAC(description)).toBe(true);
    });

    test('detects UI-specific AC as not generic', () => {
      const description = 'UI displays status configuration form';
      expect(generator.isGenericAC(description)).toBe(false);
    });
  });

  describe('makeProjectSpecific', () => {
    test('keeps generic AC unchanged', () => {
      const ac: AcceptanceCriterion[] = [
        {
          id: 'AC-US3-01',
          description: 'Config schema supports status mappings',
          testable: true,
          completed: false,
        },
      ];

      const backend: ProjectContext = {
        id: 'backend',
        name: 'Backend Services',
        type: 'backend',
        techStack: ['Node.js'],
        keywords: ['api'],
      };

      const result = generator.makeProjectSpecific(ac, 'US-003', backend);

      expect(result[0].id).toBe('AC-US3-01'); // No suffix
      expect(result[0].description).toBe('Config schema supports status mappings'); // Unchanged
    });

    test('rewrites UI AC for backend project', () => {
      const ac: AcceptanceCriterion[] = [
        {
          id: 'AC-US3-02',
          description: 'UI displays status configuration form',
          testable: true,
          completed: false,
        },
      ];

      const backend: ProjectContext = {
        id: 'backend',
        name: 'Backend Services',
        type: 'backend',
        techStack: ['Node.js'],
        keywords: ['api'],
      };

      const result = generator.makeProjectSpecific(ac, 'US-003', backend);

      expect(result[0].id).toBe('AC-US3-02-BE'); // Backend suffix
      expect(result[0].description).toContain('API returns'); // Rewritten
      expect(result[0].description).not.toContain('UI displays'); // Original removed
      expect(result[0].projectSpecific).toBe(true);
    });

    test('rewrites API AC for frontend project', () => {
      const ac: AcceptanceCriterion[] = [
        {
          id: 'AC-US3-02',
          description: 'API endpoint validates status mapping',
          testable: true,
          completed: false,
        },
      ];

      const frontend: ProjectContext = {
        id: 'frontend',
        name: 'Frontend App',
        type: 'frontend',
        techStack: ['React'],
        keywords: ['ui'],
      };

      const result = generator.makeProjectSpecific(ac, 'US-003', frontend);

      expect(result[0].id).toBe('AC-US3-02-FE'); // Frontend suffix
      expect(result[0].description).toContain('UI component'); // Rewritten
      expect(result[0].description).not.toContain('API endpoint'); // Original removed
    });

    test('handles multiple projects differently', () => {
      const ac: AcceptanceCriterion[] = [
        {
          id: 'AC-US3-02',
          description: 'System validates status configuration',
          testable: true,
          completed: false,
        },
      ];

      const backend: ProjectContext = { type: 'backend' } as ProjectContext;
      const frontend: ProjectContext = { type: 'frontend' } as ProjectContext;

      const backendResult = generator.makeProjectSpecific(ac, 'US-003', backend);
      const frontendResult = generator.makeProjectSpecific(ac, 'US-003', frontend);

      // Different AC IDs
      expect(backendResult[0].id).toBe('AC-US3-02-BE');
      expect(frontendResult[0].id).toBe('AC-US3-02-FE');

      // Different descriptions
      expect(backendResult[0].description).toContain('Backend service');
      expect(frontendResult[0].description).toContain('UI');
    });
  });
});
```

**E2E Test**:

```typescript
// tests/e2e/multi-project-ac-generation.spec.ts

test('generates different AC for backend and frontend projects', async () => {
  // Setup: Create increment with generic AC
  await createIncrement({
    id: '9999-test-multi-project-ac',
    spec: `
### US-001: Status Configuration

**Acceptance Criteria**:
- AC-US1-01: Config schema supports mappings
- AC-US1-02: UI displays configuration form
- AC-US1-03: System validates input
    `,
    config: {
      projects: {
        backend: { type: 'backend', techStack: ['Node.js'] },
        frontend: { type: 'frontend', techStack: ['React'] },
      },
    },
  });

  // Execute: Sync to living docs
  await specDistributor.distribute('9999-test-multi-project-ac');

  // Verify: Backend AC
  const backendUS = await readFile(
    '.specweave/docs/internal/specs/backend/FS-999/us-001-status-configuration.md',
    'utf-8'
  );

  expect(backendUS).toContain('AC-US1-01'); // Generic AC unchanged
  expect(backendUS).toContain('AC-US1-02-BE'); // Backend-specific ID
  expect(backendUS).toContain('API returns'); // Backend-specific description
  expect(backendUS).toContain('AC-US1-03-BE'); // Backend-specific ID

  // Verify: Frontend AC
  const frontendUS = await readFile(
    '.specweave/docs/internal/specs/frontend/FS-999/us-001-status-configuration.md',
    'utf-8'
  );

  expect(frontendUS).toContain('AC-US1-01'); // Generic AC unchanged
  expect(frontendUS).toContain('AC-US1-02-FE'); // Frontend-specific ID
  expect(frontendUS).toContain('UI component'); // Frontend-specific description
  expect(frontendUS).toContain('AC-US1-03-FE'); // Frontend-specific ID

  // Verify: GitHub issues have project-specific AC
  const backendIssue = await githubClient.getIssue(backendIssueNumber);
  expect(backendIssue.body).toContain('AC-US1-02-BE');

  const frontendIssue = await githubClient.getIssue(frontendIssueNumber);
  expect(frontendIssue.body).toContain('AC-US1-02-FE');
});
```

**Acceptance Criteria**:
- ✅ AC-FIX2-01: Generic AC kept unchanged across all projects
- ✅ AC-FIX2-02: Backend AC rewritten with API/service context
- ✅ AC-FIX2-03: Frontend AC rewritten with UI/component context
- ✅ AC-FIX2-04: Project suffix added to AC IDs (-BE, -FE, -MOB, etc.)
- ✅ AC-FIX2-05: Unit tests validate AC generation logic
- ✅ AC-FIX2-06: E2E tests validate multi-project sync with different AC

---

## Implementation Priority

### Phase 1: Status Sync (SHIP FIRST)
- **Effort**: 30 minutes
- **Impact**: HIGH (immediate bug fix)
- **Risk**: LOW (simple change)
- **Ship Criteria**: E2E test passes

### Phase 2: Project-Specific AC (SHIP AFTER)
- **Effort**: 2-3 hours
- **Impact**: CRITICAL (core architecture improvement)
- **Risk**: MEDIUM (complex logic, many edge cases)
- **Ship Criteria**: Unit + E2E tests pass, manual verification with FS-031

---

## Migration Strategy

### Phase 1: No Migration Needed
- New issues created with correct status
- Existing issues unchanged (will be corrected on next sync)

### Phase 2: Regenerate Living Docs
```bash
# After deploying Phase 2, regenerate living docs for all features
node -e "
import('./dist/src/core/living-docs/spec-distributor.js').then(async ({ SpecDistributor }) => {
  const features = ['FS-023', 'FS-028', 'FS-031', 'FS-033'];
  for (const feature of features) {
    const increment = getIncrementForFeature(feature);
    await distributor.distribute(increment);
  }
});
"

# Re-sync to GitHub to update issue bodies with project-specific AC
/specweave-github:sync --all --force
```

---

## Risk Assessment

### Phase 1 Risks: LOW
- ✅ Simple flag addition to gh CLI
- ✅ No breaking changes
- ✅ Reversible (can always reopen issues)

### Phase 2 Risks: MEDIUM
- ⚠️ AC rewrite logic might be too aggressive
- ⚠️ Edge cases in AC detection
- ⚠️ Existing living docs will have outdated AC (need regeneration)

**Mitigation**:
1. Start with conservative rewrite rules (backend/frontend only)
2. Add extensive unit tests for edge cases
3. Manual review of FS-031 regenerated docs before shipping
4. Add config flag to disable project-specific AC if issues arise

---

## Success Metrics

### Phase 1
- [ ] All new issues created with correct status (open vs closed)
- [ ] Existing issues corrected on next sync
- [ ] E2E test passes

### Phase 2
- [ ] Backend AC have API/service context
- [ ] Frontend AC have UI/component context
- [ ] Generic AC unchanged across projects
- [ ] Unit tests achieve 90%+ coverage
- [ ] E2E test validates multi-project sync
- [ ] FS-031 regenerated docs validated manually

---

**Next Steps**: Implement Phase 1 first (status sync), ship it, then implement Phase 2 (project-specific AC).
