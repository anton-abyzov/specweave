# ADR-0053: CLI-First Defaults Philosophy

**Date**: 2025-11-21
**Status**: Accepted

## Context

SpecWeave's current project selection UI follows GUI conventions (nothing selected by default), requiring users to manually select 45 out of 50 projects. This is tedious and inefficient for CLI power users.

**User Complaints**:
- "I had to press Space 45 times to select my projects. Terrible UX."
- "Why isn't there a 'select all' by default? I want 95% of projects."
- "I didn't know about the `<a>` keyboard shortcut until I read docs."

**Current Behavior**:
```
Select projects (Space to select, Enter to confirm):
[ ] PROJECT-001
[ ] PROJECT-002
[ ] PROJECT-003
...
[ ] PROJECT-050

Hidden shortcut: <a> to select all (low discoverability)
```

**User has to**:
1. Discover `<a>` shortcut (not obvious)
2. Press `<a>` to select all
3. Deselect 5 unwanted projects

**Problem**: GUI mental model (opt-in selection) doesn't match CLI workflows.

## Decision

Implement **CLI-first defaults with "Import all" as default strategy**:

### Upfront Strategy Choice

Show choice BEFORE loading projects:

```
? How would you like to import projects?

  ✨ Import all 127 projects (recommended)
     ↳ Fast: All projects imported in < 30 seconds
     ↳ Best for: Full JIRA sync, multi-team setups

  📋 Select specific projects
     ↳ Interactive: Deselect unwanted projects
     ↳ Best for: Large JIRA with 5-10 active projects

  ✏️  Manual entry
     ↳ Type project keys: "BACKEND,FRONTEND,MOBILE"
     ↳ Best for: Exact project list (1-2 projects)
```

**Default**: "Import all" (recommended for CLI users)

### CLI Philosophy Principles

**1. Bulk Operations by Default**
- CLI users expect bulk operations (`git clone --all`, `npm install`)
- Deselecting 5 unwanted items is faster than selecting 45 wanted items
- 80% keystroke reduction

**2. Explicit Defaults**
- No hidden shortcuts (all actions visible in prompts)
- Clear recommendations ("recommended" label)
- Safety confirmations for risky actions (> 100 projects)

**3. Deselection Workflow**
- All checkboxes checked by default (`checked: true`)
- User deselects unwanted projects (Space to toggle)
- Familiar pattern (like `apt-get` exclude lists)

**4. Escape Hatches**
- Manual entry for edge cases (1-2 projects only)
- "Select specific" for fine-grained control
- Resume capability if operation interrupted

### Checkbox Mode (When "Select specific" chosen)

```
Select projects to import (Space to deselect, Enter to confirm):
[x] PROJECT-001
[x] PROJECT-002
[x] PROJECT-003
...
[x] PROJECT-050

Instructions: All projects selected by default. Deselect unwanted with <space>, toggle all with <a>
```

**All checkboxes pre-checked**: `checked: true` (not `checked: false`)

### Safety Confirmation (> 100 Projects)

If user chooses "Import all" and count > 100:

```
⚠️  You're about to import 127 projects. This will:
   - Create 127 project folders in .specweave/
   - Fetch all issues, epics, and metadata
   - Take approximately 30-60 seconds

Continue? (y/N)
```

**Default**: "No" (safe default, prevents accidental bulk import)

## Alternatives Considered

### Alternative 1: Keep GUI Conventions (Nothing Selected)

**Approach**: Current behavior (all unchecked, user selects wanted projects)

**Pros**:
- Familiar to GUI users
- Explicit selection (no accidental imports)

**Cons**:
- Poor CLI UX (45 keystrokes vs. 5)
- Requires discovering `<a>` shortcut
- Doesn't match CLI tools (git, npm, apt)

**Why not**: Current pain point. CLI users expect bulk operations.

---

### Alternative 2: Auto-Import All (No Choice)

**Approach**: Automatically import all projects (no user choice)

**Pros**:
- Zero user interaction (fastest)
- Simple implementation

**Cons**:
- No opt-out (users import unwanted projects)
- Confusing for users with 500+ projects
- Violates user consent principle

**Why not**: Too aggressive. Users need control over bulk operations.

---

### Alternative 3: Smart Default Based on Count

**Approach**:
- < 50 projects → Import all by default
- \> 50 projects → Manual selection by default

**Pros**:
- Adaptive to project count
- Safe for large instances

**Cons**:
- Inconsistent behavior (confusing)
- Arbitrary threshold (why 50?)
- Doesn't respect user preference

**Why not**: Consistency matters. Users should know what to expect every time.

## Consequences

**Positive**:
- ✅ 80% keystroke reduction (5 deselects vs. 45 selects)
- ✅ CLI-aligned UX (bulk operations by default)
- ✅ No hidden shortcuts (all actions explicit)
- ✅ Safety confirmation prevents accidents (> 100 projects)

**Negative**:
- ❌ GUI users may be confused (expecting opt-in selection)
- ❌ Safety confirmation adds extra step (> 100 projects)
- ❌ Accidental bulk import risk (if user hits Enter too quickly)

**Risks & Mitigations**:

**Risk**: User accidentally imports 500+ projects
- **Mitigation**: Safety confirmation for > 100 projects (default: No)
- **Mitigation**: Progress tracking with cancelation (Ctrl+C saves partial state)

**Risk**: GUI users confused by pre-checked boxes
- **Mitigation**: Clear instructions ("All selected by default. Deselect unwanted...")
- **Mitigation**: Consistent with CLI tools (git, npm)

**Risk**: "Import all" slower for users wanting 1-2 projects
- **Mitigation**: Manual entry option (third choice in strategy selector)

## Implementation Notes

**Files Modified**:
- `src/cli/helpers/issue-tracker/jira.ts` - Add upfront strategy choice
- `plugins/specweave-jira/lib/project-selector.ts` - Pre-check all checkboxes (`checked: true`)

**Inquirer.js Configuration**:
```typescript
// Strategy choice prompt
{
  type: 'list',
  name: 'importStrategy',
  message: 'How would you like to import projects?',
  default: 'import-all',  // CLI-first default
  choices: [
    {
      name: '✨ Import all 127 projects (recommended)',
      value: 'import-all'
    },
    {
      name: '📋 Select specific projects',
      value: 'select-specific'
    },
    {
      name: '✏️  Manual entry',
      value: 'manual-entry'
    }
  ]
}

// Checkbox prompt (if "select-specific" chosen)
{
  type: 'checkbox',
  name: 'selectedProjects',
  message: 'Select projects to import (Space to deselect, Enter to confirm):',
  choices: projects.map(p => ({
    name: p.name,
    value: p.key,
    checked: true  // ✅ Pre-checked by default (CLI-first)
  }))
}

// Safety confirmation (if count > 100 and "import-all" chosen)
{
  type: 'confirm',
  name: 'confirmBulkImport',
  message: `⚠️  Import ${count} projects? (takes ~${estimatedTime}s)`,
  default: false  // Safe default (prevents accidents)
}
```

**Testing**:
- Unit tests: Default value verification (`importStrategy === 'import-all'`)
- Integration tests: Checkbox pre-checked state (`checked: true`)
- E2E tests: Safety confirmation displayed for > 100 projects

## Related Decisions

- **ADR-0052**: Smart Pagination - Defines 50-project initial load limit
- **ADR-0057**: Async Batch Fetching - Defines "Import all" implementation
- **ADR-0058**: Progress Tracking - Defines progress UI during bulk import
- **ADR-0059**: Cancelation Strategy - Defines Ctrl+C handling during bulk import
