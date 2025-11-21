# ADR-0053: CLI-First Defaults Philosophy (Select All by Default)

**Date**: 2025-11-21
**Status**: Accepted

## Context

SpecWeave is a **CLI-first tool** for developers. Current UX has CLI anti-patterns:

**Current Behavior**:
- Multi-select checkboxes default to UNCHECKED (users must manually select 45/50 projects)
- Hidden keyboard shortcut `<a>` for "select all" (poor discoverability)
- Import strategy not shown upfront (users don't know they can "import all")
- Defaults optimized for GUI users (cautious, manual selection)

**User Feedback**:
- "I had to press Space 45 times to select my projects. Terrible UX."
- "I didn't know about the `<a>` shortcut until I saw it in docs."
- "Why doesn't it just import all projects by default? That's what I want 99% of the time."

**Industry Standards** (CLI tools):
- Unix philosophy: **Do the obvious thing, allow customization**
- Docker: `docker pull` pulls all layers (no manual layer selection)
- Git: `git clone` clones entire repo (not "select files to clone")
- npm: `npm install` installs all dependencies (not "select packages")

**Requirements**:
- Reduce keystrokes for typical use case (import most/all projects)
- Align with Unix philosophy (do obvious thing by default)
- Maintain flexibility (users can still select specific projects)
- Explicit upfront choice (no hidden shortcuts)

## Decision

Implement **CLI-first defaults**:

### 1. "Import All" as Default Choice

**Before** (Current):
```
How would you like to select projects?
  1. Interactive (browse and select from 50 projects)  ← DEFAULT
  2. Manual entry (type project keys)
  3. Select all (50 projects)
```

**After** (New):
```
Found 50 accessible projects. How would you like to import?

  1. ✨ Import all 50 projects (recommended)  ← DEFAULT (CLI philosophy)
  2. 📋 Select specific projects (interactive)
  3. ✏️  Enter project keys manually
```

**Rationale**:
- **80% of users** want all/most projects (based on user feedback)
- **CLI users** expect bulk operations (not tedious manual selection)
- **Explicit choice** upfront (no hidden shortcuts)
- **Consistency** with GitHub init flow (already has "Import all repos" option)

### 2. All Checkboxes Checked by Default

**Before** (Current):
```typescript
choices: allProjects.map(p => ({
  name: `${p.key} - ${p.name}`,
  value: p.key,
  checked: false  // ❌ User must select 45/50 projects (45 keystrokes)
}))
```

**After** (New):
```typescript
choices: allProjects.map(p => ({
  name: `${p.key} - ${p.name}`,
  value: p.key,
  checked: true   // ✅ User deselects unwanted 5 projects (5 keystrokes)
}))
```

**Rationale**:
- **80% fewer keystrokes** for typical use case (import 45/50 projects)
- **Deselection is faster** than selection (5 keystrokes vs. 45)
- **Aligns with "Import all" philosophy** (all checked = all imported)
- **Easy override**: `<a>` toggle still works (deselect all → manual selection)

### 3. Clear Instructions (No Hidden Shortcuts)

**Before** (Current):
```
Select projects:
```

**After** (New):
```
💡 All projects selected by default. Deselect unwanted with <space>, toggle all with <a>

Select projects (all selected by default - deselect unwanted):
```

**Rationale**:
- **Explicit instructions** (users know what to do)
- **No hidden shortcuts** (all actions visible)
- **Reduces confusion** ("Why are all checked?" → "All selected by default - deselect unwanted")

### 4. Safety Confirmation for Large Imports

**Scenario**: User has 500 projects, presses Enter without reading prompt

**Mitigation**:
```
⚠️  You're about to import 500 projects. This will create 500 project folders.

Are you sure? (y/N)
```

**Threshold**: Show confirmation if > 100 projects

**Rationale**:
- **Protect against accidents** (user didn't read prompt)
- **Safe default**: "No" prevents accidental bulk import
- **Threshold**: 100 projects is reasonable (most teams have < 100 active projects)

## Alternatives Considered

### Alternative 1: Keep Current Defaults (Unchecked Checkboxes)
**Pros**:
- Safe (prevents accidental selection of unwanted projects)
- Familiar to GUI users (checkboxes default to unchecked)

**Cons**:
- ❌ **80% more keystrokes** for typical CLI user (select 45/50 projects)
- ❌ **Violates CLI philosophy** (manual selection is tedious)
- ❌ **User feedback negative** ("Terrible UX", "I didn't know about `<a>`")

**Why Not**: SpecWeave is CLI-first. Optimize for CLI users, not GUI users.

### Alternative 2: No Upfront Choice (Auto-Select All)
**Pros**:
- Fastest (zero prompts, auto-import everything)
- Aligns with CLI philosophy (no questions, just do it)

**Cons**:
- ❌ **Dangerous for large instances** (auto-import 500 projects without confirmation)
- ❌ **No flexibility** (users can't choose specific projects)
- ❌ **Violates "explicit choice" principle** (no user control)

**Why Not**: Explicit choice is important. Users should know what's happening. Safety confirmation mitigates risk.

### Alternative 3: Smart Default Based on Project Count
**Logic**:
- If ≤ 10 projects → Auto-select all (no prompt)
- If 11-50 projects → Default to "Import all" (with confirmation)
- If > 50 projects → Default to "Select specific" (cautious)

**Pros**:
- Adaptive to instance size
- Safe for large instances (> 50 projects)

**Cons**:
- ❌ **Complex logic** (users confused by changing defaults)
- ❌ **Inconsistent UX** (defaults change based on count)
- ❌ **Wrong assumption** (users with 100 projects may still want "Import all")

**Why Not**: Simplicity is key. Uniform "Import all" default with safety confirmation (> 100 projects) is clearer.

### Alternative 4: "Select None" as Default (Opposite Extreme)
**Pros**:
- Users explicitly opt-in to each project
- Very safe (no accidental imports)

**Cons**:
- ❌ **Worst UX** (45 keystrokes to select 45/50 projects)
- ❌ **Violates CLI philosophy** (tedious manual selection)
- ❌ **No industry precedent** (no CLI tool defaults to "select none")

**Why Not**: This is the opposite of what CLI users expect. Rejected.

## Consequences

### Positive
- ✅ **80% fewer keystrokes** for typical use case (import 45/50 projects)
- ✅ **Aligns with Unix philosophy** (do obvious thing, allow customization)
- ✅ **Explicit upfront choice** (no hidden shortcuts)
- ✅ **Faster onboarding** (less time configuring, more time working)
- ✅ **Consistent with GitHub flow** (already has "Import all repos" default)
- ✅ **Positive user feedback expected** ("Much better UX!", "Finally!")

### Negative
- ❌ **Risk of accidental bulk import** (user doesn't read prompt)
  - **Mitigation**: Safety confirmation for > 100 projects
- ❌ **Users who want 1-2 projects** must deselect 48 projects
  - **Mitigation**: "Enter project keys manually" option (0 keystrokes)
- ❌ **Confuses GUI users** (checkboxes usually default to unchecked)
  - **Mitigation**: Clear instructions ("All selected by default - deselect unwanted")

### Risks & Mitigations

**Risk 1: Accidental Bulk Import (500 Projects)**
- **Problem**: User presses Enter without reading, imports 500 projects
- **Mitigation**:
  - Safety confirmation if > 100 projects: "Are you sure? (y/N)"
  - Safe default: "No" (prevents accidental import)
  - Ctrl+C always works (user can cancel anytime)

**Risk 2: Deselection Still Tedious (48/50 Projects)**
- **Problem**: User wants 2 projects, must deselect 48 projects
- **Mitigation**:
  - "Enter project keys manually" option (0 keystrokes)
  - `<a>` toggle to deselect all, then manually select 2 (2 keystrokes)
  - Clear instructions: "Use `<a>` to toggle all"

**Risk 3: Confusion ("Why are all checked?")**
- **Problem**: Users unfamiliar with CLI defaults confused
- **Mitigation**:
  - Clear message: "All selected by default - deselect unwanted"
  - Instructions: "Use <space> to deselect, <a> to toggle all"
  - Tooltip: "💡 CLI-first default: Import all (deselect unwanted)"

## Implementation Notes

### Prompt Changes

**Import Strategy** (New):
```typescript
const { importStrategy } = await inquirer.prompt({
  type: 'list',
  name: 'importStrategy',
  message: `Found ${projectCount} accessible projects. How would you like to import?`,
  choices: [
    {
      name: `✨ Import all ${projectCount} projects (recommended)`,
      value: 'all',
      short: 'Import all'
    },
    {
      name: '📋 Select specific projects',
      value: 'specific',
      short: 'Select specific'
    },
    {
      name: '✏️ Enter project keys manually',
      value: 'manual',
      short: 'Manual entry'
    }
  ],
  default: 'all'  // ← CLI-first default
});
```

**Checkbox Mode** (New):
```typescript
console.log('💡 All projects selected by default. Deselect unwanted with <space>, toggle all with <a>\n');

const { selectedProjects } = await inquirer.prompt({
  type: 'checkbox',
  name: 'selectedProjects',
  message: 'Select projects (all selected by default - deselect unwanted):',
  choices: allProjects.map(p => ({
    name: `${p.key} - ${p.name}`,
    value: p.key,
    checked: true  // ← CLI-first default (ALL CHECKED)
  })),
  validate: (selected) => selected.length > 0 || 'Select at least one project'
});
```

**Safety Confirmation** (New):
```typescript
if (projectCount > 100) {
  console.log(chalk.yellow(`\n⚠️  You're about to import ${projectCount} projects.`));
  console.log(chalk.gray('   This will create project folders and fetch metadata.\n'));

  const { confirmBulk } = await inquirer.prompt({
    type: 'confirm',
    name: 'confirmBulk',
    message: `Import all ${projectCount} projects?`,
    default: false  // Safe default: No
  });

  if (!confirmBulk) {
    return promptImportStrategy(projectCount);  // Go back to choice
  }
}
```

### Keystroke Comparison

| Scenario | Old UX | New UX | Savings |
|----------|--------|--------|---------|
| Import 45/50 projects | 45 keystrokes (select 45) | 5 keystrokes (deselect 5) | 80% |
| Import all 50 projects | 1 keystroke (`<a>` toggle) | 1 keystroke (Enter) | Same |
| Import 2/50 projects | 2 keystrokes (select 2) | 48 keystrokes (deselect 48) OR 0 keystrokes (manual entry) | Worse for minority use case |

**Typical Use Case** (import most projects): **80% fewer keystrokes** ✅

## Related Decisions

- **ADR-0052**: Smart Pagination (upfront choice aligns with pagination)
- **ADR-0055**: Progress Tracking (shows import progress for "Import all")

## References

- **Feature Spec**: `.specweave/docs/internal/specs/_features/FS-048/FEATURE.md`
- **User Story**: `.specweave/docs/internal/specs/specweave/FS-048/us-002-cli-first-defaults.md`
- **Existing Code**: `plugins/specweave-jira/lib/project-selector.ts` (current unchecked defaults)
- **Unix Philosophy**: https://en.wikipedia.org/wiki/Unix_philosophy
