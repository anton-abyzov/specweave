# ADR-0027: Root-Level vs services/ Folder Structure

**Date**: 2025-11-11
**Status**: Accepted
**Context**: Increment 0022 - Multi-Repository Initialization UX Improvements

---

## Context

Multi-repository setup clones implementation repos into the parent folder:

**Current Behavior** (v0.13.0 and earlier):
```
my-project/                 ← Parent folder
├── .specweave/             ← Specs, docs, increments
├── services/               ← Implementation repos subdirectory
│   ├── frontend/           ← Cloned repo
│   ├── backend/            ← Cloned repo
│   └── mobile/             ← Cloned repo
└── README.md
```

**User Feedback**:
- "Why is there a services/ folder? I didn't ask for that."
- "This doesn't match monorepo patterns I'm used to."
- "Extra nesting makes CLI navigation annoying."
- "Expected frontend/ at root, not services/frontend/."

**Industry Standards**:

**Monorepo Patterns** (widely used):
```
my-project/
├── packages/
│   ├── frontend/
│   ├── backend/
│   └── shared/
└── package.json
```

**Multi-Repo with Parent** (rare, no standard):
```
# No clear standard - most teams use submodules or scripts
```

**Requirements**:
- Match user expectations (root-level folders)
- Align with monorepo patterns (flat structure)
- Maintain clear separation (.specweave/ vs implementation)
- Support easy navigation (less nesting)

---

## Decision

Clone implementation repositories at root level, NOT in services/ subdirectory:

### New Folder Structure

```
my-project/                 ← Parent folder (user creates)
├── .specweave/             ← SpecWeave source of truth
│   ├── increments/
│   ├── docs/
│   └── logs/
├── .env                    ← GitHub configuration
├── .env.example            ← Template (safe to commit)
├── .gitignore              ← Ignores repos + .env
├── frontend/               ← Root-level! (not services/frontend/)
├── backend/                ← Root-level!
├── mobile/                 ← Root-level!
└── shared/                 ← Root-level!
```

### .gitignore Pattern

```gitignore
# SpecWeave - Multi-Repo Setup
# Ignore implementation repos (cloned from GitHub)
frontend/
backend/
mobile/
shared/

# Environment variables (contains secrets!)
.env
.env.local

# SpecWeave logs
.specweave/logs/
```

**Why Dynamic Patterns?**
- User specifies repo names during setup
- .gitignore auto-generated with actual folder names
- No wildcards needed (explicit is better)

### Clone Implementation

```typescript
async function cloneRepository(
  repo: RepositoryConfig,
  parentDir: string
): Promise<void> {
  // Clone to root level (NOT services/)
  const targetPath = path.join(parentDir, repo.path);

  console.log(`Cloning ${repo.repo} to ${repo.path}...`);

  await execAsync(
    `git clone https://github.com/${repo.owner}/${repo.repo} ${targetPath}`,
    { cwd: parentDir }
  );

  console.log(`✓ Cloned ${repo.repo}`);
}
```

**Example**:
```typescript
// OLD: services/frontend/
const targetPath = path.join(parentDir, 'services', repo.path);

// NEW: frontend/
const targetPath = path.join(parentDir, repo.path);
```

---

## Alternatives Considered

### Alternative 1: Keep services/ Subdirectory (Status Quo)

**Approach**: Continue cloning into services/

```
my-project/
├── .specweave/
└── services/
    ├── frontend/
    ├── backend/
    └── mobile/
```

**Pros**:
- Clear separation (services vs framework)
- Backwards compatible with existing setups
- Explicit "implementation code" folder

**Cons**:
- ❌ Doesn't match monorepo patterns
- ❌ Extra nesting (annoying in CLI)
- ❌ User confusion ("Why services/?")
- ❌ Inconsistent with industry standards

**Why Not**: User feedback strongly opposes this

### Alternative 2: packages/ Subdirectory

**Approach**: Use packages/ to match monorepo conventions

```
my-project/
├── .specweave/
└── packages/
    ├── frontend/
    ├── backend/
    └── mobile/
```

**Pros**:
- Matches monorepo conventions (Lerna, Nx, Turborepo)
- Clear purpose (packages = code)
- Industry-standard naming

**Cons**:
- ❌ Still has nesting (packages/frontend/ vs frontend/)
- ❌ Inconsistent (multi-repo, not monorepo packages)
- ❌ Confusing (are these NPM packages?)

**Why Not**: Root-level is simpler and clearer

### Alternative 3: apps/ Subdirectory

**Approach**: Use apps/ for application code

```
my-project/
├── .specweave/
└── apps/
    ├── frontend/
    ├── backend/
    └── mobile/
```

**Pros**:
- Common in Nx monorepos
- Distinguishes apps from libraries
- Modern naming

**Cons**:
- ❌ Still has nesting
- ❌ Not all repos are "apps" (shared/ might be a library)
- ❌ Adds unnecessary complexity

**Why Not**: Root-level is cleaner

### Alternative 4: Custom Folder Name (User Choice)

**Approach**: Let user choose folder name during setup

```
Prompt: "Where should implementation repos be cloned?"
Options:
  1. Root level (frontend/, backend/)
  2. services/ subdirectory
  3. packages/ subdirectory
  4. Custom folder name
```

**Pros**:
- Maximum flexibility
- Accommodates all preferences
- No migration needed (users choose)

**Cons**:
- ❌ More complexity (another prompt)
- ❌ More code to maintain
- ❌ Inconsistent across projects
- ❌ Doesn't solve "what's the default?" problem

**Why Not**: Strong default is better than choice paralysis

---

## Consequences

### Positive

**User Experience**:
- ✅ Matches user expectations (root-level)
- ✅ Aligns with monorepo patterns (flat structure)
- ✅ Less nesting (easier CLI navigation)
- ✅ Clear separation (.specweave/ vs code)

**Simplicity**:
- ✅ Fewer directories (no services/)
- ✅ Cleaner folder structure
- ✅ Intuitive naming

**Compatibility**:
- ✅ Works with existing tools (VS Code, IDEs)
- ✅ Standard .gitignore patterns
- ✅ Easy to understand

### Negative

**Breaking Change**:
- ❌ Existing setups use services/ (migration needed)
- ❌ Documentation needs updates
- ❌ .gitignore patterns change

**Potential Confusion**:
- ❌ Root folder becomes crowded (10+ repos = 10+ folders)
- ❌ Less clear what's "framework" vs "implementation"

**Migration Complexity**:
- ❌ Must move folders for existing setups
- ❌ Git history complexity (move operations)
- ❌ IDE workspace updates needed

### Neutral

**Customization**:
- User can manually organize (move to subdirs if desired)
- .gitignore is user-editable
- Folder structure is not enforced (just default)

---

## Implementation Details

### Migration Path for Existing Setups

**Automatic Migration** (optional):

```typescript
async function migrateToRootLevel(): Promise<void> {
  const servicesPath = path.join(process.cwd(), 'services');

  // Check if services/ exists
  if (!fs.existsSync(servicesPath)) {
    return; // Nothing to migrate
  }

  console.log('📦 Detected services/ folder from previous setup.');
  console.log('   SpecWeave now uses root-level folders for repos.\n');

  const answer = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'migrate',
      message: 'Migrate repos from services/ to root level?',
      default: true
    }
  ]);

  if (!answer.migrate) {
    console.log('Skipping migration. You can move folders manually if needed.');
    return;
  }

  // Move each folder
  const repos = await fs.readdir(servicesPath);
  for (const repo of repos) {
    const oldPath = path.join(servicesPath, repo);
    const newPath = path.join(process.cwd(), repo);

    console.log(`Moving ${repo}/ to root level...`);
    await fs.rename(oldPath, newPath);
  }

  // Remove services/ directory
  await fs.rmdir(servicesPath);

  // Update .gitignore
  await updateGitignore(repos);

  console.log('✅ Migration complete! Repos are now at root level.');
}
```

**Manual Migration** (user-driven):

```bash
# User can move folders manually
mv services/frontend/ frontend/
mv services/backend/ backend/
rmdir services/

# Update .gitignore
echo "frontend/" >> .gitignore
echo "backend/" >> .gitignore
```

### .gitignore Generation

```typescript
async function generateGitignore(repos: RepositoryConfig[]): Promise<void> {
  const gitignorePath = path.join(process.cwd(), '.gitignore');
  const existingContent = fs.existsSync(gitignorePath)
    ? await fs.readFile(gitignorePath, 'utf-8')
    : '';

  // Generate patterns
  const patterns = [
    '# SpecWeave - Multi-Repo Setup',
    '# Ignore implementation repos (cloned from GitHub)',
    ...repos.map(r => `${r.path}`),
    '',
    '# Environment variables (contains secrets!)',
    '.env',
    '.env.local',
    '',
    '# SpecWeave logs',
    '.specweave/logs/'
  ];

  // Append or create
  const newContent = existingContent + '\n\n' + patterns.join('\n') + '\n';
  await fs.writeFile(gitignorePath, newContent);

  console.log('✓ Updated .gitignore with repository patterns');
}
```

### Folder Structure Validation

```typescript
function validateFolderStructure(): void {
  const requiredFolders = ['.specweave'];
  const forbiddenFolders = []; // No forbidden folders (flexible)

  for (const folder of requiredFolders) {
    if (!fs.existsSync(path.join(process.cwd(), folder))) {
      throw new Error(`Required folder missing: ${folder}`);
    }
  }

  // Warn if services/ exists (legacy)
  if (fs.existsSync(path.join(process.cwd(), 'services'))) {
    console.warn('⚠️  Found legacy services/ folder. Consider migrating to root level.');
    console.warn('   Run: specweave migrate-folders');
  }
}
```

---

## User Communication

### During Setup

```
✅ Setup Complete!

📁 Folder Structure:
   my-project/
   ├── .specweave/           ← Specs, docs, increments (source of truth)
   ├── .env                  ← GitHub configuration (DO NOT COMMIT!)
   ├── .env.example          ← Template for team (safe to commit)
   ├── frontend/             ← Cloned from GitHub
   └── backend/              ← Cloned from GitHub

💡 Tips:
   • All implementation repos are at root level (no services/ folder)
   • .specweave/ is your source of truth (commit it!)
   • .env contains secrets (DO NOT commit!)
```

### Migration Prompt

```
📦 Detected services/ folder from previous setup.
   SpecWeave now uses root-level folders for repos.

Would you like to migrate? [Y/n]

This will:
   • Move services/frontend/ → frontend/
   • Move services/backend/ → backend/
   • Remove services/ directory
   • Update .gitignore

You can also do this manually later.
```

---

## Performance Considerations

| Operation | Old (services/) | New (root-level) | Difference |
|-----------|----------------|------------------|------------|
| Clone repo | Same | Same | No change |
| File access | +1 path segment | Direct | Faster |
| CLI navigation | `cd services/frontend` | `cd frontend` | Fewer keystrokes |
| IDE indexing | Same | Same | No change |

**Result**: Slight performance improvement (fewer path segments)

---

## Security Considerations

### .gitignore Enforcement

```typescript
// Ensure repos are ignored
function validateGitignore(repos: RepositoryConfig[]): void {
  const gitignorePath = path.join(process.cwd(), '.gitignore');

  if (!fs.existsSync(gitignorePath)) {
    throw new Error('.gitignore missing! Implementation repos may be committed by accident.');
  }

  const content = fs.readFileSync(gitignorePath, 'utf-8');
  const missingPatterns = repos.filter(r => !content.includes(r.path));

  if (missingPatterns.length > 0) {
    console.warn('⚠️  Some repos are not in .gitignore:');
    for (const repo of missingPatterns) {
      console.warn(`   - ${repo.path}`);
    }
    console.warn('   These folders may be committed by accident!');
  }
}
```

### Sensitive Data Protection

- ✅ .env at root level (auto-ignored)
- ✅ All implementation repos ignored
- ✅ Only .specweave/ committed (source of truth)
- ✅ .env.example safe to share

---

## Testing Strategy

### Unit Tests

```typescript
describe('Root-Level Folder Structure', () => {
  test('clones repos to root level', async () => {
    const repo = { path: 'frontend/', owner: 'myorg', repo: 'my-frontend' };
    await cloneRepository(repo, '/tmp/test-project');

    expect(fs.existsSync('/tmp/test-project/frontend')).toBe(true);
    expect(fs.existsSync('/tmp/test-project/services/frontend')).toBe(false);
  });

  test('generates .gitignore with root-level patterns', async () => {
    const repos = [
      { path: 'frontend/' },
      { path: 'backend/' }
    ];
    await generateGitignore(repos);

    const content = fs.readFileSync('.gitignore', 'utf-8');
    expect(content).toContain('frontend/');
    expect(content).toContain('backend/');
    expect(content).not.toContain('services/frontend/');
  });
});
```

### Integration Tests

```typescript
describe('Multi-Repo Setup Flow', () => {
  test('creates root-level folder structure', async () => {
    await setupMultiRepo({
      repos: [
        { name: 'my-frontend', path: 'frontend/' },
        { name: 'my-backend', path: 'backend/' }
      ]
    });

    // Verify structure
    expect(fs.existsSync('frontend')).toBe(true);
    expect(fs.existsSync('backend')).toBe(true);
    expect(fs.existsSync('services')).toBe(false);
  });
});
```

---

## Documentation Updates

### User Guide

- ✅ Update multi-repo setup guide with new structure
- ✅ Add migration guide for existing users
- ✅ Clarify folder organization best practices

### FAQ

**Q: Why are repos at root level instead of services/?**
A: Root-level matches monorepo patterns and reduces nesting. This is the industry standard.

**Q: Can I use a subdirectory if I prefer?**
A: Yes! You can manually move folders after setup. Just update your .gitignore.

**Q: How do I migrate from services/ to root level?**
A: Run `specweave migrate-folders` or move manually: `mv services/frontend/ frontend/`

---

## Related Decisions

- **ADR-0014**: Root-Level .specweave/ Only (basis for folder structure)
- **ADR-0023**: Multi-Repo Initialization UX Architecture (parent ADR)
- **ADR-0028**: .env File Generation Strategy (root-level .env)

---

## References

**Industry Patterns**:
- Nx monorepos: https://nx.dev/concepts/more-concepts/applications-and-libraries
- Turborepo: https://turbo.build/repo/docs/handbook/what-is-a-monorepo
- Lerna: https://lerna.js.org/docs/concepts/how-it-works

**Implementation Files**:
- `src/core/repo-structure/repo-structure-manager.ts` (clone logic)
- `src/utils/gitignore-generator.ts` (pattern generation)

**User Stories**:
- US-005: Root-Level Repository Folders (Not services/)
