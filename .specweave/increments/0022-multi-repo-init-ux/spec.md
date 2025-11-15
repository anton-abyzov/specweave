# Increment 0022: Multi-Repository Initialization UX Improvements

**Status**: Planning → Implementation
**Created**: 2025-11-11
**Complete Specification**: See [SPEC-022](../../docs/internal/projects/default/specs/spec-022-multi-repo-init-ux.md)
**Priority**: P1 (High - Core User Experience)

---

## Quick Overview

Comprehensive UX improvements to multi-repository initialization flow, addressing 9 critical pain points discovered during real-world usage.

**Problem**: Current multi-repo setup causes confusion (duplicated questions, manual ID entry, unclear folder structure, no .env generation, no Ctrl+C recovery).

**Solution**: Streamline prompts, auto-generate IDs, validate repositories, create .env files, add recovery mechanisms, and provide detailed summaries.

**Impact**: Reduces setup time by 60%, eliminates 90% of user errors, improves first-run success rate from 40% to 95%.

---

## What We're Implementing (This Increment)

This increment implements **ALL 9 user stories** from [SPEC-022](../../docs/internal/projects/default/specs/spec-022-multi-repo-init-ux.md):

### US-001: Simplify Repository Architecture Questions
- Consolidate architecture questions into single prompt
- Replace "polyrepo" jargon with "multiple separate repositories"
- Clarify parent repo count (e.g., "1 parent + 3 implementation = 4 total")
- Add visual examples for each architecture option

### US-002: Auto-Generate Repository IDs
- Auto-generate repository ID from repository name
- Show generated ID as default with edit option
- Validate IDs prevent comma-separated input
- Ensure uniqueness across all repos

### US-003: Add Private/Public Repository Visibility Prompt
- Add visibility prompt for each repository
- Default to "Private" for security
- Store visibility in repository configuration
- Pass visibility to GitHub API on creation

### US-004: GitHub Repository Existence Validation
- Check repository existence via GitHub API before creation
- Validate owner/organization exists
- Show clear error if repo already exists
- Offer to use existing repo if found

### US-005: Root-Level Repository Folders (Not services/)
- Clone repos at root level by default
- Update .gitignore to ignore root-level repos
- Offer choice during setup (root vs services/)
- Document folder structure in setup summary

### US-006: Create .env File with GitHub Configuration
- Generate .env file at project root with GitHub config
- Add .env to .gitignore if not present
- Create .env.example for team sharing
- Support multi-provider (GitHub, JIRA, ADO)

### US-007: Ctrl+C Recovery (Save Progress Incrementally)
- Save state to `.specweave/setup-state.json` after each step
- Detect incomplete setup on next `specweave init`
- Offer resume option with summary of progress
- Delete state file on successful completion

### US-008: Detailed Setup Summary
- Show detailed summary with created repos and URLs
- Include links to documentation
- Show estimated setup time saved

### US-009: Update Parent Folder Benefits Explanation
- Expand parent folder benefits with examples
- Show visual comparison (with parent vs without)
- Link to architecture documentation

---

## Implementation Scope

### Files to Create (~800 lines)

1. **`src/core/repo-structure/setup-state-manager.ts`** (~200 lines)
   - Load/save setup state to `.specweave/setup-state.json`
   - Atomic file operations (temp file → rename)
   - State validation and migration
   - Resume logic with progress summary

2. **`src/core/repo-structure/github-validator.ts`** (~150 lines)
   - Repository existence check via GitHub API
   - Owner/org validation
   - API error handling with retries
   - Rate limit awareness

3. **`src/utils/env-file-generator.ts`** (~150 lines)
   - .env template generation
   - Multi-provider support (GitHub, JIRA, ADO)
   - .gitignore updates
   - .env.example creation

4. **`src/core/repo-structure/setup-summary.ts`** (~100 lines)
   - Summary formatting (Markdown + CLI colors)
   - Time calculation (estimate setup time saved)
   - Next steps generation

5. **`src/core/repo-structure/repo-id-generator.ts`** (~50 lines)
   - ID generation algorithm (strip suffixes, take last segment)
   - Uniqueness validation
   - Edit validation

6. **`src/core/repo-structure/prompt-consolidator.ts`** (~150 lines)
   - Consolidated prompts (no "polyrepo" jargon)
   - Visual examples for each architecture
   - Choice validation

### Files to Modify (~1,500 lines affected)

1. **`src/core/repo-structure/repo-structure-manager.ts`** (~400 lines modified)
   - Replace services/ with root-level cloning (line 319)
   - Integrate state manager for Ctrl+C recovery
   - Integrate GitHub validator before repo creation
   - Call .env generator after all repos created
   - Show setup summary at end
   - Consolidate architecture prompts (lines 65-87, 203-208)

2. **`src/cli/helpers/issue-tracker/github-multi-repo.ts`** (~300 lines modified)
   - Auto-generate repository IDs (lines 288-302)
   - Add visibility prompts (new section after line 338)
   - Integrate GitHub validator before creation
   - Update prompt text to remove "polyrepo" (lines 106-132)

3. **`.gitignore`** (~10 lines added)
   - Add root-level repo patterns (frontend/, backend/, etc.)
   - Add .env patterns

4. **`src/templates/.env.example`** (~50 lines added)
   - Add GitHub configuration template section

### Test Files (~1,200 lines)

**Unit Tests** (~500 lines):
- `tests/unit/repo-structure/setup-state-manager.test.ts`
- `tests/unit/repo-structure/github-validator.test.ts`
- `tests/unit/utils/env-file-generator.test.ts`
- `tests/unit/repo-structure/setup-summary.test.ts`
- `tests/unit/repo-structure/repo-id-generator.test.ts`

**Integration Tests** (~400 lines):
- `tests/integration/repo-structure/multi-repo-flow.test.ts`
- `tests/integration/repo-structure/ctrl-c-recovery.test.ts`
- `tests/integration/repo-structure/github-validation.test.ts`

**E2E Tests** (~300 lines):
- `tests/e2e/init/multi-repo-setup.spec.ts`
- `tests/e2e/init/resume-setup.spec.ts`
- `tests/e2e/init/error-handling.spec.ts`

**Total Lines**: ~2,300 (800 new + 1,500 modified)

---

## Technical Approach

### Repository ID Generation Algorithm

```typescript
function generateRepoId(repoName: string): string {
  const suffixes = ['-app', '-service', '-api', '-frontend', '-backend', '-web', '-mobile'];
  let cleaned = repoName;
  for (const suffix of suffixes) {
    if (cleaned.endsWith(suffix)) {
      cleaned = cleaned.slice(0, -suffix.length);
    }
  }
  const segments = cleaned.split('-');
  return segments[segments.length - 1];
}
```

**Examples**:
- "my-saas-frontend-app" → "frontend"
- "acme-api-gateway-service" → "gateway"
- "backend-service" → "backend"

### Setup State Structure

```json
{
  "version": "1.0",
  "architecture": "polyrepo",
  "parentRepo": {
    "id": "parent",
    "displayName": "Parent Repository",
    "owner": "myorg",
    "repo": "my-project-parent",
    "visibility": "private",
    "created": true,
    "url": "https://github.com/myorg/my-project-parent"
  },
  "repos": [
    {
      "id": "frontend",
      "displayName": "Frontend Application",
      "owner": "myorg",
      "repo": "my-project-frontend",
      "visibility": "private",
      "created": true,
      "cloned": true,
      "path": "frontend/"
    }
  ],
  "currentStep": "repo-2-of-3",
  "timestamp": "2025-11-11T10:30:00Z",
  "envCreated": true
}
```

### GitHub Validation Flow

```typescript
async function validateRepository(owner: string, repo: string): Promise<ValidationResult> {
  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: { Authorization: `token ${GITHUB_TOKEN}` }
    });

    if (response.status === 404) {
      return { exists: false, valid: true };
    } else if (response.status === 200) {
      return { exists: true, valid: true, url: response.data.html_url };
    } else {
      return { exists: false, valid: false, error: response.statusText };
    }
  } catch (error) {
    return { exists: false, valid: false, error: error.message };
  }
}
```

### .env File Template

```bash
# GitHub Configuration (Auto-generated by SpecWeave)
# Created: 2025-11-11T10:30:00Z

GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
GITHUB_OWNER=myorg

# Repository Mapping (id:repo-name)
GITHUB_REPOS=parent:my-project-parent,frontend:my-project-frontend,backend:my-project-backend

# Sync Configuration
GITHUB_SYNC_ENABLED=true
GITHUB_AUTO_CREATE_ISSUE=true
GITHUB_SYNC_DIRECTION=bidirectional
```

---

## Success Criteria

### User Experience Metrics
- Setup time: 60% reduction (20min → 8min)
- Error rate: 90% reduction (10% → 1%)
- First-run success: 95% (vs 40% before)
- User confusion: 0 support tickets about multi-repo setup

### Technical Metrics
- Code coverage: 85%+ overall (90% for critical paths)
- E2E tests: 15+ test cases covering all flows
- Performance: All operations <500ms (except GitHub API)
- Reliability: 99.9% success rate for state persistence

---

## Out of Scope (For This Increment)

The following are deferred to future increments:

- ❌ **Bulk repository creation** (create all repos with one command)
- ❌ **GitHub organization management** (create orgs, teams, permissions)
- ❌ **Repository templates** (pre-configured starter repos)
- ❌ **CI/CD setup** (GitHub Actions, workflows)
- ❌ **Advanced .env management** (encrypted secrets, vault integration)
- ❌ **Multi-provider sync** (GitHub + JIRA + ADO simultaneously)

---

## References

**Living Docs**: [SPEC-022: Multi-Repository Initialization UX Improvements](../../docs/internal/projects/default/specs/spec-022-multi-repo-init-ux.md)

**Architecture Decisions**:
- ADR-0014: Root-Level .specweave/ Only (No Nested Folders)
- ADR-TBD: Multi-Repo Initialization UX Architecture (to be created)

**Related Increments**:
- 0001-core-framework: Initial SpecWeave framework
- 0004-plugin-architecture: Claude native plugin system

**External Links**:
- GitHub Project: TBD
- Documentation: https://spec-weave.com/docs/guides/multi-repo-setup
