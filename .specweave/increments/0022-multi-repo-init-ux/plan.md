# Implementation Plan: Multi-Repository Initialization UX Improvements

**Increment**: 0022-multi-repo-init-ux
**Status**: Planning → Implementation
**Complete Specification**: See [SPEC-022](../../docs/internal/projects/default/specs/spec-022-multi-repo-init-ux.md)

---

## Architecture Overview

**Complete architecture**: [System Design](../../docs/internal/architecture/system-design.md)

**Key Decisions**:
- [ADR-0023: Multi-Repo Initialization UX Architecture](../../docs/internal/architecture/adr/0023-multi-repo-init-ux-architecture.md) - Overall approach
- [ADR-0024: Repository ID Auto-Generation Strategy](../../docs/internal/architecture/adr/0024-repo-id-auto-generation.md) - Algorithm choice
- [ADR-0025: Setup State Persistence Design](../../docs/internal/architecture/adr/0025-setup-state-persistence.md) - Atomic writes, recovery
- [ADR-0026: GitHub API Validation Approach](../../docs/internal/architecture/adr/0026-github-api-validation.md) - Existence checks, rate limits
- [ADR-0027: Root-Level vs services/ Folder Structure](../../docs/internal/architecture/adr/0027-root-level-folder-structure.md) - Why root-level
- [ADR-0028: .env File Generation Strategy](../../docs/internal/architecture/adr/0028-env-file-generation.md) - Security, multi-provider

---

## Technology Stack Summary

**Core Stack**:
- Language: TypeScript 5.x (strict mode)
- Runtime: Node.js 20 LTS
- CLI Framework: Commander.js 11.x
- Prompts: inquirer.js 9.x
- GitHub API: Octokit REST API v20.x

**Testing Stack**:
- Unit Tests: Jest 29.x + ts-jest
- Integration Tests: Jest with test helpers
- E2E Tests: Playwright 1.40.x
- Mocking: nock (HTTP), mock-fs (filesystem)

**Key Dependencies**:
```json
{
  "inquirer": "^9.2.12",
  "@octokit/rest": "^20.0.2",
  "dotenv": "^16.3.1",
  "fs-extra": "^11.2.0"
}
```

---

## Implementation Phases

### Phase 1: Core Modules (T-001 to T-006)

**Create 6 new specialized modules** with single responsibility:

**T-001: Repository ID Generator** (~50 lines)
```typescript
// src/core/repo-structure/repo-id-generator.ts

/**
 * Generate repository ID from repository name
 * Algorithm: Strip common suffixes, take last segment
 *
 * Examples:
 * - "my-saas-frontend-app" → "frontend"
 * - "acme-api-gateway-service" → "gateway"
 * - "backend-service" → "backend"
 */
export function generateRepoId(repoName: string): string {
  const suffixes = ['-app', '-service', '-api', '-frontend', '-backend', '-web', '-mobile'];
  let cleaned = repoName.toLowerCase();

  for (const suffix of suffixes) {
    if (cleaned.endsWith(suffix)) {
      cleaned = cleaned.slice(0, -suffix.length);
      break;
    }
  }

  const segments = cleaned.split('-');
  return segments[segments.length - 1] || repoName.toLowerCase();
}

export function ensureUniqueId(
  proposedId: string,
  existingIds: Set<string>
): { id: string; wasModified: boolean } {
  // Uniqueness logic
}

export function validateRepoId(id: string): ValidationResult {
  // Validation rules (no commas, alphanumeric + hyphens, length limits)
}
```

**ADR Reference**: [ADR-0024: Repository ID Auto-Generation Strategy](../../docs/internal/architecture/adr/0024-repo-id-auto-generation.md)

**Tests**:
- Unit: `tests/unit/repo-structure/repo-id-generator.test.ts` (15 test cases)
- Coverage: 90%+

---

**T-002: Setup State Manager** (~200 lines)
```typescript
// src/core/repo-structure/setup-state-manager.ts

/**
 * Manages setup state persistence for Ctrl+C recovery
 * Uses atomic file operations to prevent corruption
 */
export class SetupStateManager {
  private statePath: string;

  constructor(projectRoot: string) {
    this.statePath = path.join(projectRoot, '.specweave', 'setup-state.json');
  }

  /**
   * Save state atomically (temp file → rename)
   */
  async saveState(state: SetupState): Promise<void> {
    const tempPath = this.statePath + '.tmp';
    const backupPath = this.statePath + '.bak';

    try {
      // Backup existing
      if (fs.existsSync(this.statePath)) {
        await fs.copyFile(this.statePath, backupPath);
      }

      // Write to temp
      await fs.writeFile(tempPath, JSON.stringify(state, null, 2), { mode: 0o600 });

      // Atomic rename (OS-level guarantee)
      await fs.rename(tempPath, this.statePath);

      // Remove backup on success
      if (fs.existsSync(backupPath)) {
        await fs.unlink(backupPath);
      }
    } catch (error) {
      // Restore from backup if write failed
      if (fs.existsSync(backupPath)) {
        await fs.copyFile(backupPath, this.statePath);
      }
      throw error;
    }
  }

  /**
   * Load state with validation and error recovery
   */
  async loadState(): Promise<SetupState | null> {
    // Load, validate schema, handle corruption with backup
  }

  /**
   * Detect incomplete setup and prompt for resume
   */
  async detectAndResumeSetup(): Promise<boolean> {
    // Check existence, show progress, prompt user
  }

  /**
   * Delete state file on successful completion
   */
  async deleteState(): Promise<void> {
    // Clean up state and backup files
  }
}
```

**ADR Reference**: [ADR-0025: Setup State Persistence Design](../../docs/internal/architecture/adr/0025-setup-state-persistence.md)

**Tests**:
- Unit: `tests/unit/repo-structure/setup-state-manager.test.ts` (20 test cases)
- Coverage: 90%+
- Key scenarios: Save/load, corruption recovery, atomic writes, Ctrl+C simulation

---

**T-003: GitHub Validator** (~150 lines)
```typescript
// src/core/repo-structure/github-validator.ts

/**
 * Validates GitHub repositories and owners before creation
 * Implements retry logic and rate limit handling
 */
export class GitHubValidator {
  constructor(private token: string) {}

  /**
   * Check if repository exists
   * @returns ValidationResult with exists, valid, url, error
   */
  async validateRepository(owner: string, repo: string): Promise<ValidationResult> {
    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: {
          'Authorization': `token ${this.token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (response.status === 404) {
        return { exists: false, valid: true };
      } else if (response.status === 200) {
        const data = await response.json();
        return { exists: true, valid: true, url: data.html_url };
      } else if (response.status === 401 || response.status === 403) {
        return { exists: false, valid: false, error: 'Invalid GitHub token or permissions' };
      }

      return { exists: false, valid: false, error: `GitHub API error: ${response.status}` };
    } catch (error) {
      return { exists: false, valid: false, error: `Network error: ${error.message}` };
    }
  }

  /**
   * Check if owner/org exists
   */
  async validateOwner(owner: string): Promise<{ valid: boolean; type?: 'user' | 'org'; error?: string }> {
    // Try as user, then as org
  }

  /**
   * Retry with exponential backoff on network errors
   */
  async validateWithRetry<T>(fn: () => Promise<T>, maxRetries: number = 3): Promise<T> {
    // Retry logic for network failures
  }

  /**
   * Check GitHub API rate limit and warn if low
   */
  async checkRateLimit(): Promise<RateLimitInfo> {
    // GET /rate_limit
  }
}
```

**ADR Reference**: [ADR-0026: GitHub API Validation Approach](../../docs/internal/architecture/adr/0026-github-api-validation.md)

**Tests**:
- Unit: `tests/unit/repo-structure/github-validator.test.ts` (25 test cases)
- Coverage: 85%+
- Mocking: nock for GitHub API responses

---

**T-004: .env File Generator** (~150 lines)
```typescript
// src/utils/env-file-generator.ts

/**
 * Generates .env and .env.example files with security best practices
 */
export class EnvFileGenerator {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * Generate .env file with GitHub configuration
   */
  async generateEnvFile(config: EnvConfig): Promise<void> {
    const envPath = path.join(this.projectRoot, '.env');

    // Check if exists, prompt for overwrite
    if (fs.existsSync(envPath)) {
      const answer = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: '.env file already exists. Overwrite?',
          default: false
        }
      ]);

      if (!answer.overwrite) {
        console.log('Skipping .env generation.');
        return;
      }

      // Backup existing
      await fs.copyFile(envPath, envPath + '.backup');
    }

    // Generate content
    const content = this.generateEnvContent(config);

    // Write with secure permissions (0600)
    await fs.writeFile(envPath, content, { mode: 0o600 });
    console.log('✓ Created .env file (permissions: 0600)');

    // Generate .env.example
    await this.generateEnvExample(config);

    // Update .gitignore
    await this.ensureGitignoreIncludes(['.env', '.env.local', '.env.*.local']);

    // Show security warning
    this.showSecurityWarning();
  }

  private generateEnvContent(config: EnvConfig): string {
    // Multi-provider support (GitHub, JIRA, ADO)
  }

  private generateEnvExample(config: EnvConfig): string {
    // Safe template without secrets
  }

  private async ensureGitignoreIncludes(patterns: string[]): Promise<void> {
    // Append to .gitignore if not present
  }
}
```

**ADR Reference**: [ADR-0028: .env File Generation Strategy](../../docs/internal/architecture/adr/0028-env-file-generation.md)

**Tests**:
- Unit: `tests/unit/utils/env-file-generator.test.ts` (20 test cases)
- Coverage: 90%+
- Scenarios: Generation, permissions, .gitignore updates, overwrite handling

---

**T-005: Setup Summary Generator** (~100 lines)
```typescript
// src/core/repo-structure/setup-summary.ts

/**
 * Generates comprehensive setup completion summary
 */
export class SetupSummaryGenerator {
  /**
   * Generate formatted summary with repos, structure, next steps
   */
  generateSummary(state: SetupState): string {
    const totalRepos = state.repos.length + (state.parentRepo ? 1 : 0);

    let summary = '\n✅ Setup Complete!\n\n';

    // Repositories section
    summary += `📦 Created Repositories (${totalRepos} total):\n`;
    if (state.parentRepo) {
      summary += `   1. Parent: ${state.parentRepo.url}\n`;
      summary += `      • Contains .specweave/ for specs, docs, increments\n`;
      summary += `      • ${state.parentRepo.visibility} repository\n\n`;
    }

    state.repos.forEach((repo, i) => {
      summary += `   ${i + 2}. ${repo.displayName}: ${repo.url}\n`;
      summary += `      • Implementation repository\n`;
      summary += `      • ${repo.visibility} repository\n`;
      summary += `      • Local path: ${repo.path}\n\n`;
    });

    // Folder structure
    summary += this.generateFolderStructure(state);

    // Configuration details
    summary += this.generateConfigSection(state);

    // Next steps
    summary += this.generateNextSteps(state);

    // Tips
    summary += this.generateTips();

    // Time saved
    summary += this.calculateTimeSaved(totalRepos);

    return summary;
  }
}
```

**Tests**:
- Unit: `tests/unit/repo-structure/setup-summary.test.ts` (10 test cases)
- Coverage: 80%+
- Snapshot tests for output format

---

**T-006: Prompt Consolidator** (~150 lines)
```typescript
// src/core/repo-structure/prompt-consolidator.ts

/**
 * Consolidated prompts for repository architecture
 * Removes "polyrepo" jargon, adds visual examples
 */
export class PromptConsolidator {
  /**
   * Single consolidated architecture prompt
   */
  async promptForArchitecture(): Promise<ArchitectureChoice> {
    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'architecture',
        message: 'What is your repository architecture?',
        choices: [
          {
            name: '1. Single repository\n   • All code in one repo\n   • Simplest setup',
            value: 'single'
          },
          {
            name: '2. Multiple separate repositories (microservices)\n   WITH parent repository for .specweave/\n   • 1 parent repo (specs, docs, increments)\n   • N implementation repos (frontend, backend, services)\n   • Recommended for teams',
            value: 'polyrepo-with-parent'
          },
          {
            name: '3. Multiple separate repositories (microservices)\n   WITHOUT parent repository\n   • Each repo has its own .specweave/ (NOT RECOMMENDED)\n   • Leads to fragmentation',
            value: 'polyrepo-without-parent'
          },
          {
            name: '4. Monorepo (single repo, multiple projects)\n   • All code in one repo, organized by project\n   • Best for tightly coupled services',
            value: 'monorepo'
          }
        ],
        default: 'polyrepo-with-parent'
      }
    ]);

    return answer.architecture;
  }

  /**
   * Prompt for repository count with clarification
   */
  async promptForRepoCount(): Promise<number> {
    const answer = await inquirer.prompt([
      {
        type: 'number',
        name: 'count',
        message: 'How many implementation repositories? (e.g., frontend, backend, mobile)',
        default: 2,
        validate: (input: number) => {
          if (input < 1) return 'Must have at least 1 repository';
          if (input > 20) return 'Maximum 20 repositories (for performance)';
          return true;
        }
      }
    ]);

    console.log(`\n✓ Total repositories: 1 parent + ${answer.count} implementation = ${answer.count + 1} total\n`);

    return answer.count;
  }

  /**
   * Show parent folder benefits explanation
   */
  showParentFolderBenefits(): void {
    console.log('\n📚 Why use a parent repository?\n');
    console.log('   • Central .specweave/ for all specs/docs (single source of truth)');
    console.log('   • Cross-cutting features (auth spans frontend + backend)');
    console.log('   • System-wide architecture decisions (ADRs)');
    console.log('   • Easier onboarding (one place for all documentation)');
    console.log('   • Compliance & auditing (complete project history)');
    console.log('\n   Learn more: https://spec-weave.com/docs/architecture/repository-patterns\n');
  }
}
```

**Tests**:
- Unit: `tests/unit/repo-structure/prompt-consolidator.test.ts` (15 test cases)
- Coverage: 75%+
- Snapshot tests for prompt text

---

### Phase 2: Integration (T-007 to T-012)

**Integrate new modules into existing codebase**:

**T-007: Modify repo-structure-manager.ts** (~400 lines affected)
```typescript
// src/core/repo-structure/repo-structure-manager.ts

// Changes:
// 1. Replace services/ with root-level cloning (line 319)
// 2. Integrate SetupStateManager for Ctrl+C recovery
// 3. Integrate GitHubValidator before repo creation
// 4. Call EnvFileGenerator after all repos created
// 5. Show SetupSummary at end
// 6. Use PromptConsolidator for architecture questions (lines 65-87, 203-208)

export class RepoStructureManager {
  private stateManager: SetupStateManager;
  private githubValidator: GitHubValidator;
  private envGenerator: EnvFileGenerator;
  private summaryGenerator: SetupSummaryGenerator;

  constructor(projectRoot: string) {
    this.stateManager = new SetupStateManager(projectRoot);
    // Initialize other components
  }

  async setupMultiRepo(): Promise<void> {
    // Check for incomplete setup
    const shouldResume = await this.stateManager.detectAndResumeSetup();

    if (shouldResume) {
      const state = await this.stateManager.loadState();
      await this.resumeSetup(state);
      return;
    }

    // New setup flow
    const architecture = await this.promptConsolidator.promptForArchitecture();

    // Initialize state
    const state: SetupState = {
      version: '1.0',
      architecture,
      repos: [],
      currentStep: 'init',
      timestamp: new Date().toISOString()
    };

    // Save initial state
    await this.stateManager.saveState(state);

    // Setup repositories with validation
    for (const repo of repos) {
      // Validate with GitHub API
      const validation = await this.githubValidator.validateRepository(repo.owner, repo.repo);

      if (!validation.valid) {
        console.error(`❌ ${validation.error}`);
        continue; // Retry prompt
      }

      // Create repository
      await this.createRepository(repo);
      repo.created = true;
      state.currentStep = `repo-${repo.id}-created`;
      await this.stateManager.saveState(state);

      // Clone repository to ROOT LEVEL (not services/)
      const targetPath = path.join(this.projectRoot, repo.path);
      await this.cloneRepository(repo, targetPath);
      repo.cloned = true;
      state.currentStep = `repo-${repo.id}-cloned`;
      await this.stateManager.saveState(state);
    }

    // Generate .env file
    await this.envGenerator.generateEnvFile({ ... });
    state.envCreated = true;
    await this.stateManager.saveState(state);

    // Show summary
    const summary = this.summaryGenerator.generateSummary(state);
    console.log(summary);

    // Delete state on success
    await this.stateManager.deleteState();
  }
}
```

**ADR References**: All 6 ADRs apply here (orchestration layer)

**Tests**:
- Integration: `tests/integration/repo-structure/multi-repo-flow.test.ts` (15 test cases)
- Coverage: 85%+

---

**T-008: Modify github-multi-repo.ts** (~300 lines affected)
```typescript
// src/cli/helpers/issue-tracker/github-multi-repo.ts

// Changes:
// 1. Auto-generate repository IDs (lines 288-302)
// 2. Add visibility prompts (new section after line 338)
// 3. Integrate GitHubValidator before creation
// 4. Update prompt text to remove "polyrepo" (lines 106-132)

export class GitHubMultiRepoHelper {
  private repoIdGenerator = new RepoIdGenerator();
  private githubValidator: GitHubValidator;

  async promptForRepository(existingRepos: RepositoryConfig[]): Promise<RepositoryConfig> {
    // Step 1: Repository name
    const repoName = await this.promptForRepoName();

    // Step 2: Auto-generate ID with edit option
    const generatedId = this.repoIdGenerator.generateRepoId(repoName);
    const uniqueId = this.repoIdGenerator.ensureUniqueId(
      generatedId,
      new Set(existingRepos.map(r => r.id))
    );

    const idAnswer = await inquirer.prompt([
      {
        type: 'input',
        name: 'id',
        message: 'Repository ID:',
        default: uniqueId.id,
        validate: (input) => this.repoIdGenerator.validateRepoId(input)
      }
    ]);

    // Step 3: Visibility prompt (NEW!)
    const visibilityAnswer = await inquirer.prompt([
      {
        type: 'list',
        name: 'visibility',
        message: 'Repository visibility:',
        choices: [
          { name: 'Private (recommended for security)', value: 'private' },
          { name: 'Public', value: 'public' }
        ],
        default: 'private'
      }
    ]);

    // Step 4: Validate with GitHub API
    console.log('Validating repository...');
    const validation = await this.githubValidator.validateRepository(owner, repoName);

    if (!validation.valid) {
      console.error(`❌ ${validation.error}`);
      return this.promptForRepository(existingRepos); // Retry
    }

    if (validation.exists) {
      console.log(`⚠️  Repository already exists: ${validation.url}`);
      const useExisting = await this.promptUseExisting();
      if (useExisting) {
        return { id: idAnswer.id, repo: repoName, created: true, url: validation.url };
      }
      return this.promptForRepository(existingRepos); // Retry
    }

    return {
      id: idAnswer.id,
      repo: repoName,
      visibility: visibilityAnswer.visibility,
      created: false
    };
  }
}
```

**Tests**:
- Integration: `tests/integration/repo-structure/github-multi-repo.test.ts` (12 test cases)
- Coverage: 85%+

---

**T-009: Update .gitignore** (~10 lines added)
```gitignore
# SpecWeave - Multi-Repo Setup (auto-generated)
# Ignore implementation repos (cloned from GitHub)
frontend/
backend/
mobile/
shared/

# Environment variables (contains secrets!)
.env
.env.local
.env.*.local

# SpecWeave logs
.specweave/logs/
```

---

**T-010: Create .env.example Template** (~50 lines)
```bash
# src/templates/.env.example

# GitHub Configuration (Example - Safe to Commit)
# Copy this file to .env and fill in your values

# =============================================================================
# GitHub Settings
# =============================================================================

# GitHub Personal Access Token (REQUIRED)
# Generate at: https://github.com/settings/tokens
# Scope: repo
GITHUB_TOKEN=

# GitHub Owner (REQUIRED)
# Your username or organization name
GITHUB_OWNER=

# Repository Mapping (REQUIRED)
# Format: id:repo-name,id2:repo-name2
GITHUB_REPOS=parent:my-project-parent,frontend:my-project-frontend

# =============================================================================
# Sync Configuration
# =============================================================================

GITHUB_SYNC_ENABLED=true
GITHUB_AUTO_CREATE_ISSUE=true
GITHUB_SYNC_DIRECTION=bidirectional
```

---

### Phase 3: E2E Validation (T-013 to T-020)

**Create comprehensive end-to-end tests** using Playwright:

**T-013: Happy Path Test** (~50 lines)
```typescript
// tests/e2e/init/multi-repo-setup.spec.ts

test('multi-repo setup with parent - happy path', async ({ page }) => {
  // Start setup
  await page.goto('http://localhost:3000/setup');

  // Select "Multiple repositories WITH parent"
  await page.click('text=Multiple separate repositories (microservices)');
  await page.click('text=WITH parent repository');

  // Enter 2 implementation repos
  await page.fill('input[name="repoCount"]', '2');

  // Configure parent repo
  await page.fill('input[name="owner"]', 'myorg');
  await page.fill('input[name="repo"]', 'my-project-parent');
  await page.selectOption('select[name="visibility"]', 'private');

  // Configure frontend repo
  await page.fill('input[name="repo"]', 'my-project-frontend');
  // ID auto-generated: "frontend" (check default value)
  await expect(page.locator('input[name="id"]')).toHaveValue('frontend');
  await page.click('button:text("Next")');

  // Configure backend repo
  await page.fill('input[name="repo"]', 'my-project-backend');
  await expect(page.locator('input[name="id"]')).toHaveValue('backend');
  await page.click('button:text("Complete Setup")');

  // Verify summary shown
  await expect(page.locator('text=Setup Complete!')).toBeVisible();
  await expect(page.locator('text=Created Repositories (3 total)')).toBeVisible();
  await expect(page.locator('text=frontend/')).toBeVisible();
  await expect(page.locator('text=backend/')).toBeVisible();

  // Verify files created
  expect(fs.existsSync('.specweave')).toBe(true);
  expect(fs.existsSync('.env')).toBe(true);
  expect(fs.existsSync('.env.example')).toBe(true);
  expect(fs.existsSync('frontend')).toBe(true);
  expect(fs.existsSync('backend')).toBe(true);
  expect(fs.existsSync('services')).toBe(false); // NOT services/!
});
```

**T-014: Ctrl+C Recovery Test** (~40 lines)
```typescript
// tests/e2e/init/resume-setup.spec.ts

test('Ctrl+C recovery - resume from last state', async ({ page }) => {
  // Start setup
  await page.goto('http://localhost:3000/setup');
  await setupParentRepo(page);

  // Start first implementation repo
  await page.fill('input[name="repo"]', 'my-project-frontend');

  // Simulate Ctrl+C (close browser)
  await page.close();

  // Verify state saved
  expect(fs.existsSync('.specweave/setup-state.json')).toBe(true);
  const state = JSON.parse(fs.readFileSync('.specweave/setup-state.json', 'utf-8'));
  expect(state.parentRepo.created).toBe(true);
  expect(state.repos.length).toBe(0); // Frontend not completed

  // Resume setup (new browser session)
  const newPage = await browser.newPage();
  await newPage.goto('http://localhost:3000/setup');

  // Should show resume prompt
  await expect(newPage.locator('text=Found incomplete setup')).toBeVisible();
  await expect(newPage.locator('text=1/3 repos completed')).toBeVisible();
  await newPage.click('button:text("Resume")');

  // Should skip parent repo, continue with frontend
  await expect(newPage.locator('text=Configure Repository 1')).toBeVisible();
  await newPage.fill('input[name="repo"]', 'my-project-frontend');
  await newPage.click('button:text("Next")');

  // Complete setup
  await newPage.fill('input[name="repo"]', 'my-project-backend');
  await newPage.click('button:text("Complete Setup")');

  // Verify state file deleted
  expect(fs.existsSync('.specweave/setup-state.json')).toBe(false);
});
```

**T-015: Repository Exists Error Test** (~30 lines)
```typescript
// tests/e2e/init/error-handling.spec.ts

test('repository already exists - offer use existing', async ({ page }) => {
  // Mock GitHub API: repository exists
  await page.route('**/api.github.com/repos/myorg/my-project-frontend', route => {
    route.fulfill({
      status: 200,
      body: JSON.stringify({ html_url: 'https://github.com/myorg/my-project-frontend' })
    });
  });

  await page.goto('http://localhost:3000/setup');
  await setupParentRepo(page);

  // Enter frontend repo
  await page.fill('input[name="repo"]', 'my-project-frontend');
  await page.click('button:text("Next")');

  // Should show "already exists" warning
  await expect(page.locator('text=Repository already exists')).toBeVisible();
  await expect(page.locator('text=https://github.com/myorg/my-project-frontend')).toBeVisible();

  // Options: Use existing / Enter different name
  await expect(page.locator('button:text("Use Existing")')).toBeVisible();
  await expect(page.locator('button:text("Enter Different Name")')).toBeVisible();

  // Use existing
  await page.click('button:text("Use Existing")');

  // Should continue to next repo
  await expect(page.locator('text=Configure Repository 2')).toBeVisible();
});
```

**T-016: Invalid Owner Test** (~25 lines)
**T-017: Network Failure Test** (~30 lines)
**T-018: Rate Limit Test** (~25 lines)
**T-019: Duplicate ID Test** (~20 lines)
**T-020: .env Overwrite Test** (~25 lines)

---

### Phase 4: Documentation (T-021 to T-024)

**T-021: Update Multi-Repo Setup Guide** (~100 lines)
```markdown
# docs-site/docs/guides/multi-repo-setup.md

## Multi-Repository Setup

### Quick Start

1. **Run Setup**:
   ```bash
   specweave init my-project
   ```

2. **Select Architecture**: "Multiple repositories WITH parent"

3. **Configure Repositories**: Enter names, IDs auto-generated

4. **Done!** All repos created, .env configured, ready to use

### What Gets Created

```
my-project/
├── .specweave/           ← Specs, docs, increments (source of truth)
├── .env                  ← GitHub configuration (DO NOT COMMIT!)
├── .env.example          ← Template for team (safe to commit)
├── frontend/             ← Cloned from GitHub
└── backend/              ← Cloned from GitHub
```

### Repository IDs

Repository IDs are **auto-generated** from names:
- `my-saas-frontend-app` → `frontend`
- `acme-api-gateway` → `gateway`
- `backend-service` → `backend`

You can edit the default if needed.

### Ctrl+C Recovery

Setup progress is saved automatically. If interrupted:
1. Run `specweave init` again
2. Select "Resume" when prompted
3. Continues from last completed step

### Security Best Practices

- ✅ .env auto-added to .gitignore
- ✅ Permissions set to 0600 (owner only)
- ✅ Never commit .env to git
- ✅ Share .env.example with team instead
```

**T-022: Create Ctrl+C Recovery Guide** (~50 lines)
**T-023: Create .env Security Guide** (~75 lines)
**T-024: Update Troubleshooting Guide** (~100 lines)

---

## Component Architecture

### Module Dependency Graph

```
┌──────────────────────────────────────────────┐
│         repo-structure-manager.ts            │
│         (Orchestration Layer)                │
└───────────────┬──────────────────────────────┘
                │
    ┌───────────┼───────────┬───────────┬───────────┬───────────┐
    │           │           │           │           │           │
    v           v           v           v           v           v
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│  Repo   │ │  Setup  │ │ GitHub  │ │   .env  │ │  Setup  │ │ Prompt  │
│   ID    │ │  State  │ │Validator│ │Generator│ │ Summary │ │Consolid.│
│Generator│ │ Manager │ │         │ │         │ │Generator│ │         │
└─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘
     │           │           │           │           │           │
     └───────────┴───────────┴───────────┴───────────┴───────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    v                   v
            ┌───────────────┐   ┌───────────────┐
            │  github-multi │   │   .gitignore  │
            │   -repo.ts    │   │   (updated)   │
            │  (modified)   │   └───────────────┘
            └───────────────┘
```

### Data Flow

```
User Input
    ↓
┌────────────────────────────────────────┐
│  Prompt Consolidator                   │
│  • Single architecture prompt          │
│  • Remove "polyrepo" jargon            │
│  • Visual examples                     │
└────────────┬───────────────────────────┘
             ↓
┌────────────────────────────────────────┐
│  Repository ID Generator               │
│  • Auto-generate from name             │
│  • Ensure uniqueness                   │
│  • Validate format                     │
└────────────┬───────────────────────────┘
             ↓
┌────────────────────────────────────────┐
│  GitHub Validator                      │
│  • Check owner exists                  │
│  • Check repo availability             │
│  • Offer "use existing" if found       │
└────────────┬───────────────────────────┘
             ↓
┌────────────────────────────────────────┐
│  Setup State Manager                   │
│  • Save state after each step          │
│  • Atomic file operations              │
│  • Enable Ctrl+C recovery              │
└────────────┬───────────────────────────┘
             ↓
┌────────────────────────────────────────┐
│  Create Repositories (GitHub API)      │
│  • POST /user/repos                    │
│  • Clone to ROOT LEVEL (not services/) │
└────────────┬───────────────────────────┘
             ↓
┌────────────────────────────────────────┐
│  .env File Generator                   │
│  • Generate .env with config           │
│  • Create .env.example                 │
│  • Update .gitignore                   │
│  • Set permissions 0600                │
└────────────┬───────────────────────────┘
             ↓
┌────────────────────────────────────────┐
│  Setup Summary Generator               │
│  • Show created repos + URLs           │
│  • Display folder structure            │
│  • List next steps                     │
│  • Calculate time saved                │
└────────────┬───────────────────────────┘
             ↓
┌────────────────────────────────────────┐
│  Delete State File                     │
│  • Cleanup setup-state.json            │
│  • Setup complete!                     │
└────────────────────────────────────────┘
```

---

## Testing Strategy

### Test Pyramid

```
       E2E Tests (10%)
       - Full setup flow
       - Ctrl+C recovery
       - Error handling
      /              \
     /                \
    Integration (30%)
    - Multi-repo flow
    - GitHub validation
    - State persistence
   /                    \
  /                      \
 Unit Tests (60%)
 - ID generation
 - .env generation
 - Summary formatting
 - Prompt validation
```

### Coverage Targets

| Layer | Target Coverage | Critical Paths |
|-------|----------------|----------------|
| **Unit** | 85%+ overall | 90%+ for core modules |
| **Integration** | 85%+ overall | 90%+ for state persistence |
| **E2E** | 15+ scenarios | 100% for happy path + recovery |

### Test Scenarios

**Happy Path**:
1. Multi-repo with parent (3 repos) → Success
2. Auto-generated IDs accepted → Success
3. All validations pass → Success
4. .env created → Success
5. Summary shown → Success

**Recovery Scenarios**:
1. Ctrl+C after parent created → Resume successful
2. Ctrl+C after repo 1 created → Resume successful
3. Corrupted state file → Fallback to backup successful

**Error Scenarios**:
1. Repository already exists → Offer use existing
2. Invalid owner → Clear error + retry
3. Network failure → Retry with backoff
4. Rate limit exceeded → Clear message + wait time
5. Duplicate repository ID → Auto-suffix (frontend-2)

**Security Scenarios**:
1. .env permissions → 0600 verified
2. .gitignore updated → .env excluded
3. Accidental .env commit → Detection + warning

---

## Risk Mitigation

### High Risks

**1. GitHub API Rate Limiting** (Impact: High, Likelihood: Medium)
- **Mitigation**:
  - Pre-validation with rate limit checking
  - Exponential backoff on retries
  - Show rate limit status to user
- **Fallback**: Manual repo creation instructions

**2. State File Corruption** (Impact: High, Likelihood: Low)
- **Mitigation**:
  - Atomic write operations (temp → rename)
  - Backup file before overwrite
  - Schema validation on load
- **Fallback**: Restart with detection of completed repos

**3. Network Failures** (Impact: Medium, Likelihood: Medium)
- **Mitigation**:
  - Retry logic (3 attempts)
  - Ctrl+C recovery (resume from last state)
  - Clear error messages
- **Fallback**: Offline mode (skip validation)

### Medium Risks

**4. User Confusion on Prompts** (Impact: Medium, Likelihood: Low)
- **Mitigation**:
  - Clear examples for each option
  - Visual diagrams
  - Link to documentation
- **Fallback**: Interactive help

**5. .env Security Breach** (Impact: High, Likelihood: Low)
- **Mitigation**:
  - Permissions 0600
  - .gitignore enforcement
  - Detection of committed .env
- **Fallback**: Regenerate tokens

---

## Performance Targets

| Operation | Target Time | Acceptable Range |
|-----------|-------------|------------------|
| Repository ID generation | <1ms | 0.1-2ms |
| GitHub API validation | <500ms | 200ms-1s |
| State persistence | <10ms | 5-20ms |
| .env generation | <5ms | 2-10ms |
| Setup summary | <50ms | 20-100ms |
| **Total setup (3 repos)** | **2-3 min** | **1-5 min** |

**Bottlenecks**:
- GitHub API calls: 200-500ms each
- Git clone operations: 5-15s each
- User input prompts: Variable (user-dependent)

---

## Success Metrics

### User Experience

- **Setup time**: 60% reduction (20min → 8min)
- **Error rate**: 90% reduction (10% → 1%)
- **First-run success**: 95% (vs 40% before)
- **Support tickets**: 0 about multi-repo confusion

### Technical Quality

- **Code coverage**: 85%+ overall (90% for critical paths)
- **E2E test pass rate**: 100%
- **Performance**: All operations <500ms (except GitHub API)
- **State persistence reliability**: 99.9%+

### Adoption

- **Multi-repo usage**: 80% of enterprise users
- **.env creation**: 100% (vs 40% manual before)
- **Ctrl+C recovery**: 95% successful resumes
- **Setup summary views**: 100% (shown to all users)

---

## Implementation Order

**Phase 1: Core Modules** (5 days)
- T-001: Repo ID Generator
- T-002: Setup State Manager
- T-003: GitHub Validator
- T-004: .env File Generator
- T-005: Setup Summary Generator
- T-006: Prompt Consolidator

**Phase 2: Integration** (3 days)
- T-007: Modify repo-structure-manager.ts
- T-008: Modify github-multi-repo.ts
- T-009: Update .gitignore
- T-010: Create .env.example template

**Phase 3: E2E Validation** (3 days)
- T-013: Happy path test
- T-014: Ctrl+C recovery test
- T-015-T-020: Error scenario tests

**Phase 4: Documentation** (2 days)
- T-021: Update multi-repo guide
- T-022: Ctrl+C recovery guide
- T-023: .env security guide
- T-024: Troubleshooting guide

**Total Estimated Time**: 13 days

---

## Rollout Plan

### Phase 1: Internal Testing (Week 1)

- Deploy to internal test environment
- Run full E2E test suite
- Manual testing with real GitHub repos
- Gather internal feedback

### Phase 2: Beta Release (Week 2)

- Release as v0.14.0-beta
- Announce in GitHub Discussions
- Request community feedback
- Monitor error rates and user reports

### Phase 3: Stable Release (Week 3)

- Fix critical bugs from beta
- Update documentation
- Release as v0.14.0
- Announce in changelog
- Social media promotion

---

## References

**Living Docs**: [SPEC-022: Multi-Repository Initialization UX Improvements](../../docs/internal/projects/default/specs/spec-022-multi-repo-init-ux.md)

**Architecture Decisions**:
- [ADR-0023: Multi-Repo Initialization UX Architecture](../../docs/internal/architecture/adr/0023-multi-repo-init-ux-architecture.md)
- [ADR-0024: Repository ID Auto-Generation Strategy](../../docs/internal/architecture/adr/0024-repo-id-auto-generation.md)
- [ADR-0025: Setup State Persistence Design](../../docs/internal/architecture/adr/0025-setup-state-persistence.md)
- [ADR-0026: GitHub API Validation Approach](../../docs/internal/architecture/adr/0026-github-api-validation.md)
- [ADR-0027: Root-Level vs services/ Folder Structure](../../docs/internal/architecture/adr/0027-root-level-folder-structure.md)
- [ADR-0028: .env File Generation Strategy](../../docs/internal/architecture/adr/0028-env-file-generation.md)

**Related Increments**:
- 0001-core-framework: Initial SpecWeave framework
- 0004-plugin-architecture: Claude native plugin system
- 0011-multi-project-sync: Multi-project external sync

**External Documentation**:
- GitHub API: https://docs.github.com/en/rest
- Node.js fs atomic operations: https://nodejs.org/api/fs.html
- inquirer.js prompts: https://github.com/SBoudrias/Inquirer.js
