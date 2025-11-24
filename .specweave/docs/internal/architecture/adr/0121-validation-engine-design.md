# ADR-0121: Validation Engine Design (4-Tier Safety Gates)

**Date**: 2025-11-23
**Status**: Accepted
**Deciders**: Architect, PM, Tech Lead
**Priority**: P1

---

## Context

Feature deletion is a destructive operation that can lead to data loss if executed incorrectly. We need a robust validation system to prevent:

1. **Accidental deletion of active work**: Deleting features still referenced by active increments
2. **Orphaned increments**: Completed increments pointing to non-existent features
3. **Data loss**: Deleting files without user awareness
4. **Git repository corruption**: Improper handling of tracked files

**Requirements**:
- Multi-tier validation (file existence, git status, increment references, GitHub state)
- Clear validation reports (what will be deleted, what's at risk)
- Blocking vs warning validations (fatal errors vs cautionary warnings)
- Force mode to override validations (with explicit warnings)

**Key Question**: How do we structure validation to maximize safety while maintaining flexibility?

---

## Decision

**Implement 4-Tier Validation System with Progressive Safety Gates**

```typescript
// src/core/feature-deleter/validator.ts

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];      // Fatal (block deletion)
  warnings: ValidationWarning[];  // Cautionary (allow with --force)
  report: ValidationReport;       // Detailed report for user
}

export class FeatureDeletionValidator {
  async validate(featureId: string, options: ValidationOptions): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // TIER 1: Feature Existence Validation (BLOCKING)
    const featureExists = await this.tier1_validateFeatureExists(featureId);
    if (!featureExists.valid) {
      errors.push(...featureExists.errors);
    }

    // TIER 2: File Discovery & Classification (NON-BLOCKING)
    const files = await this.tier2_discoverFiles(featureId);

    // TIER 3: Increment Reference Validation (BLOCKING in safe mode)
    const incrementRefs = await this.tier3_validateIncrementReferences(featureId, options);
    if (!incrementRefs.valid && !options.force) {
      errors.push(...incrementRefs.errors);
    } else if (!incrementRefs.valid && options.force) {
      warnings.push(...incrementRefs.warnings);
    }

    // TIER 4: External State Validation (NON-BLOCKING)
    const externalState = await this.tier4_validateExternalState(featureId, options);
    warnings.push(...externalState.warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      report: this.generateReport({ featureId, files, incrementRefs, externalState })
    };
  }
}
```

### Tier 1: Feature Existence Validation (BLOCKING)

**Purpose**: Verify feature exists and is properly structured

**Validations**:
- ✅ Feature folder exists: `.specweave/docs/internal/specs/_features/FS-XXX/`
- ✅ User story files exist: `.specweave/docs/internal/specs/{project}/FS-XXX/us-*.md`
- ✅ Feature ID format: `/^FS-\d{3}$/`

**Errors** (FATAL - block deletion):
- `FeatureNotFoundError`: Feature folder doesn't exist
- `InvalidFeatureIdError`: Feature ID format invalid (e.g., "FS-52" not "FS-052")

**Example**:
```typescript
async tier1_validateFeatureExists(featureId: string): Promise<Tier1Result> {
  // Validate format
  if (!/^FS-\d{3}$/.test(featureId)) {
    return { valid: false, errors: [new InvalidFeatureIdError(featureId)] };
  }

  // Check folder exists
  const featurePath = path.join(this.projectRoot, '.specweave/docs/internal/specs/_features', featureId);
  if (!fs.existsSync(featurePath)) {
    return { valid: false, errors: [new FeatureNotFoundError(featureId)] };
  }

  return { valid: true, errors: [] };
}
```

---

### Tier 2: File Discovery & Classification (NON-BLOCKING)

**Purpose**: Discover all files belonging to feature and classify by type

**File Types**:
- **Living docs**: `.specweave/docs/internal/specs/_features/FS-XXX/`
- **User stories**: `.specweave/docs/internal/specs/{project}/FS-XXX/us-*.md`
- **Project architecture**: `.specweave/docs/internal/project-arch/{project}/FS-XXX/`
- **Modules**: `.specweave/docs/internal/modules/{project}/FS-XXX/`

**Git Classification**:
- **Tracked**: Files in git index (`git ls-files`)
- **Untracked**: Files not in git index
- **Modified**: Files with uncommitted changes

**Example**:
```typescript
async tier2_discoverFiles(featureId: string): Promise<Tier2Result> {
  const files: string[] = [];

  // Discover living docs
  const featureFolder = path.join(this.projectRoot, '.specweave/docs/internal/specs/_features', featureId);
  files.push(...glob.sync(`${featureFolder}/**/*`));

  // Discover user stories
  const projectFolders = fs.readdirSync(path.join(this.projectRoot, '.specweave/docs/internal/specs'));
  for (const project of projectFolders) {
    if (project.startsWith('_')) continue; // Skip _features
    const usFolder = path.join(this.projectRoot, '.specweave/docs/internal/specs', project, featureId);
    if (fs.existsSync(usFolder)) {
      files.push(...glob.sync(`${usFolder}/**/*.md`));
    }
  }

  // Classify git status
  const gitStatus = await this.gitService.status();
  const tracked = files.filter(f => gitStatus.tracked.includes(f));
  const untracked = files.filter(f => !gitStatus.tracked.includes(f));

  return {
    files,
    tracked,
    untracked,
    total: files.length
  };
}
```

---

### Tier 3: Increment Reference Validation (CONDITIONAL BLOCKING)

**Purpose**: Detect increments referencing the feature

**Validations**:
- ✅ Scan all `metadata.json` files for `feature_id` match
- ✅ Classify by increment status: active, completed, archived
- ✅ **BLOCK if active** (safe mode), **WARN if completed** (force mode)

**Errors** (FATAL in safe mode):
- `ActiveIncrementReferenceError`: Active increment(s) reference feature

**Warnings** (NON-FATAL in force mode):
- `CompletedIncrementReferenceWarning`: Completed increment(s) reference feature
- `OrphanedIncrementWarning`: Force deletion will orphan increment(s)

**Example**:
```typescript
async tier3_validateIncrementReferences(featureId: string, options: ValidationOptions): Promise<Tier3Result> {
  const incrementsPath = path.join(this.projectRoot, '.specweave/increments');
  const incrementFolders = fs.readdirSync(incrementsPath).filter(f => /^\d{4}-/.test(f));

  const activeRefs: string[] = [];
  const completedRefs: string[] = [];

  for (const folder of incrementFolders) {
    const metadataPath = path.join(incrementsPath, folder, 'metadata.json');
    if (!fs.existsSync(metadataPath)) continue;

    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));

    if (metadata.feature_id === featureId) {
      if (metadata.status === 'active' || metadata.status === 'planned') {
        activeRefs.push(folder);
      } else if (metadata.status === 'completed') {
        completedRefs.push(folder);
      }
    }
  }

  // BLOCKING: Active references in safe mode
  if (activeRefs.length > 0 && !options.force) {
    return {
      valid: false,
      errors: [new ActiveIncrementReferenceError(featureId, activeRefs)],
      warnings: []
    };
  }

  // WARNING: Active references in force mode
  if (activeRefs.length > 0 && options.force) {
    return {
      valid: true,
      errors: [],
      warnings: [new OrphanedIncrementWarning(featureId, activeRefs)]
    };
  }

  // WARNING: Completed references
  if (completedRefs.length > 0) {
    return {
      valid: true,
      errors: [],
      warnings: [new CompletedIncrementReferenceWarning(featureId, completedRefs)]
    };
  }

  return { valid: true, errors: [], warnings: [] };
}
```

---

### Tier 4: External State Validation (NON-BLOCKING)

**Purpose**: Check GitHub issue state

**Validations**:
- ✅ Find GitHub issues matching `[FS-XXX][US-YYY]` pattern
- ✅ Check issue state (open, closed)
- ✅ Warn about open issues (will be closed)

**Warnings** (NON-FATAL):
- `OpenGitHubIssuesWarning`: Open issue(s) will be closed

**Example**:
```typescript
async tier4_validateExternalState(featureId: string, options: ValidationOptions): Promise<Tier4Result> {
  if (options.noGithub) {
    return { warnings: [] };
  }

  const issues = await this.githubService.findFeatureIssues(featureId);
  const openIssues = issues.filter(i => i.state === 'open');

  if (openIssues.length > 0) {
    return {
      warnings: [new OpenGitHubIssuesWarning(featureId, openIssues)]
    };
  }

  return { warnings: [] };
}
```

---

## Validation Report Format

```typescript
interface ValidationReport {
  featureId: string;
  summary: {
    fileCount: number;
    trackedFiles: number;
    untrackedFiles: number;
    activeReferences: number;
    completedReferences: number;
    githubIssues: number;
  };
  details: {
    files: string[];
    activeIncrements: string[];
    completedIncrements: string[];
    githubIssues: Array<{ number: number; title: string; url: string }>;
  };
  safety: {
    canDelete: boolean;
    requiresForce: boolean;
    warningCount: number;
  };
}
```

**Console Output**:
```
Validation Report: FS-052
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Summary:
  Files: 47 (35 tracked, 12 untracked)
  Active References: 1 (increment 0053)
  Completed References: 2 (increments 0045, 0046)
  GitHub Issues: 3 (all open)

Files to Delete:
  ✓ .specweave/docs/internal/specs/_features/FS-052/
  ✓ .specweave/docs/internal/specs/specweave/FS-052/us-001-safe-deletion.md
  ... (45 more files)

Git Status:
  ✓ 35 tracked files (will use git rm)
  ✓ 12 untracked files (will use rm)

❌ BLOCKING ERRORS:
  • Active increment 0053 references FS-052
    → Cannot delete while active work exists
    → Options: Complete 0053, abandon 0053, or use --force

⚠️  WARNINGS:
  • Completed increments 0045, 0046 reference FS-052
    → These will become orphaned
  • 3 GitHub issues will be closed

SAFETY: Cannot delete (use --force to override)
```

---

## Consequences

### Positive

- ✅ **Multi-layered safety**: 4 independent validation tiers
- ✅ **Clear user guidance**: Detailed report with actionable advice
- ✅ **Flexible**: Force mode for edge cases
- ✅ **Testable**: Each tier independently testable
- ✅ **Extensible**: Easy to add new validation tiers

### Negative

- ⚠️ **Performance**: 4 tiers may take 2-5 seconds (acceptable for safety)
- ⚠️ **Complexity**: More code to maintain (justified by safety benefits)

### Neutral

- ℹ️ **Force mode**: Powerful but dangerous (clear warnings required)

---

## Testing Strategy

```typescript
describe('FeatureDeletionValidator', () => {
  describe('Tier 1: Feature Existence', () => {
    it('blocks if feature does not exist', async () => {
      const result = await validator.validate('FS-999');
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toBeInstanceOf(FeatureNotFoundError);
    });
  });

  describe('Tier 3: Increment References', () => {
    it('blocks if active increments reference feature', async () => {
      await createActiveIncrement('0053', { feature_id: 'FS-052' });

      const result = await validator.validate('FS-052', { force: false });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toBeInstanceOf(ActiveIncrementReferenceError);
    });

    it('warns if active increments exist in force mode', async () => {
      await createActiveIncrement('0053', { feature_id: 'FS-052' });

      const result = await validator.validate('FS-052', { force: true });
      expect(result.valid).toBe(true);
      expect(result.warnings[0]).toBeInstanceOf(OrphanedIncrementWarning);
    });
  });
});
```

---

## References

- **Related ADR**: ADR-0118 (Command Interface), ADR-0119 (Git Integration)
- **Pattern**: Multi-tier validation (inspired by ADR-0060 pre-commit hooks)

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-11-23 | 4-tier validation system | Comprehensive safety checks |
| 2025-11-23 | Blocking vs warning model | Flexibility with safety |
| 2025-11-23 | Detailed validation reports | User understanding + trust |
| 2025-11-23 | Force mode bypasses Tier 3 | Emergency cleanup support |
