# Git Hooks for User Projects - Design Document

**Date**: 2026-01-07
**Status**: 📋 Design Proposal
**Context**: User requested ability to use root pollution prevention in their own projects

## Problem Statement

SpecWeave's pre-commit hooks (especially root pollution prevention) are valuable for ANY project, not just SpecWeave itself. Users want to:

1. Prevent root directory pollution in their own projects
2. Customize what files are allowed in root
3. Use the same auto-fix workflow
4. Learn from SpecWeave's best practices

## Proposed Solution

### CLI Command: `specweave install-hooks`

```bash
# Install all available hooks
specweave install-hooks

# Install specific hooks only
specweave install-hooks --only=root-pollution

# Preview without installing
specweave install-hooks --dry-run

# Force overwrite existing hooks
specweave install-hooks --force
```

### What Gets Installed

1. **Git Hooks** → `.git/hooks/`
   - `pre-commit` (master hook that calls individual checks)
   - Individual check scripts (modular design)

2. **Helper Scripts** → `scripts/`
   - `fix-root-pollution.sh` (auto-fix script)
   - Other helper scripts as needed

3. **Configuration** → `.specweave/hooks/`
   - `config.json` (customization settings)
   - Per-hook configuration files

### Example User Workflow

```bash
# User initializes SpecWeave in their project
specweave init

# User installs git hooks
specweave install-hooks

# Customize allowed files
vim .specweave/hooks/root-pollution-config.json

# Now pre-commit hooks protect their repo!
git commit -m "test"
# → Auto-detects violations
# → Suggests: bash scripts/fix-root-pollution.sh
```

## Template Structure

### 1. Hook Templates Directory

```
src/templates/git-hooks/
├── pre-commit.template              # Master pre-commit hook
├── checks/
│   ├── root-pollution-check.sh      # Root pollution detection
│   └── [future-checks].sh           # Extensible
├── scripts/
│   └── fix-root-pollution.sh        # Auto-fix script
└── config/
    └── root-pollution-config.json   # Default configuration
```

### 2. Configuration Schema

`.specweave/hooks/root-pollution-config.json`:
```json
{
  "enabled": true,
  "allowedRootFiles": [
    "README.md",
    "LICENSE.md",
    "CHANGELOG.md",
    "package.json",
    "tsconfig.json"
  ],
  "fileExtensions": [".md", ".log"],
  "autoFixEnabled": true,
  "targetDirectory": ".specweave/increments"
}
```

### 3. Pre-Commit Hook Structure

The installed hook would be **modular**:

```bash
#!/bin/bash
# Pre-commit hook installed by SpecWeave
# Generated: 2026-01-07

HOOKS_DIR=".specweave/hooks"

# Load configuration
if [ -f "$HOOKS_DIR/config.json" ]; then
  # Load enabled checks from config
  # ...
fi

# Run enabled checks
if [ "$ROOT_POLLUTION_CHECK_ENABLED" = "true" ]; then
  bash scripts/hooks/root-pollution-check.sh || exit 1
fi

# Future checks can be added here
# if [ "$ANOTHER_CHECK_ENABLED" = "true" ]; then
#   bash scripts/hooks/another-check.sh || exit 1
# fi

echo "✅ Pre-commit checks passed"
exit 0
```

## Implementation Plan

### Phase 1: Basic Hook Installation (MVP)

1. Create template files in `src/templates/git-hooks/`
2. Create `specweave install-hooks` command
3. Copy templates to user project
4. Make scripts executable
5. Show success message with next steps

### Phase 2: Configuration System

1. Add `.specweave/hooks/config.json` support
2. Allow customization of allowed files
3. Support enable/disable per-hook

### Phase 3: Advanced Features

1. Hook update mechanism (`specweave update-hooks`)
2. Multiple hook types (pre-push, commit-msg, etc.)
3. Project-specific customization
4. Integration with `specweave init --with-hooks`

## User Experience

### Installation Output

```bash
$ specweave install-hooks

🔧 Installing Git Hooks...

✅ Copied pre-commit hook → .git/hooks/pre-commit
✅ Created scripts/fix-root-pollution.sh
✅ Created .specweave/hooks/root-pollution-config.json

📝 Git hooks installed successfully!

Available checks:
  ✓ Root pollution prevention

To customize:
  Edit: .specweave/hooks/root-pollution-config.json

To test:
  git commit (will run pre-commit checks)

To disable:
  Remove: .git/hooks/pre-commit
```

### When Hook Detects Violation

```bash
$ git commit -m "test"

🚨 ERROR: Root Folder Pollution Detected!

The following files violate your project rules:
  - analysis.md

🤖 AUTO-FIX AVAILABLE:
   bash scripts/fix-root-pollution.sh

✅ Allowed root files (customize in .specweave/hooks/root-pollution-config.json):
   - README.md
   - LICENSE.md
   - package.json
```

## Customization Examples

### Example 1: Allow More Files

```json
{
  "allowedRootFiles": [
    "README.md",
    "LICENSE.md",
    "CHANGELOG.md",
    "docker-compose.yml",
    "Dockerfile",
    "Makefile"
  ]
}
```

### Example 2: Different Target Directory

```json
{
  "targetDirectory": "docs/reports"
}
```

### Example 3: Disable Auto-Fix

```json
{
  "autoFixEnabled": false
}
```

## Benefits for Users

1. **Zero Configuration** - Works out of the box with sensible defaults
2. **Customizable** - Easy to adapt to project needs
3. **Educational** - Learn SpecWeave best practices
4. **Consistent** - Same workflow across all projects
5. **Maintainable** - SpecWeave can update templates

## Alternatives Considered

### Alternative 1: Husky Integration

**Pros:**
- Standard tool in Node ecosystem
- Many developers already familiar

**Cons:**
- Extra dependency
- Less control over hook content
- Overkill for simple use case

**Decision:** Not recommended for initial version, but could support later

### Alternative 2: Automatic Installation on `init`

**Pros:**
- One less command to remember
- Consistent across all SpecWeave projects

**Cons:**
- Forces hooks on users who don't want them
- Less discoverable (hidden behavior)

**Decision:** Offer as optional flag: `specweave init --with-hooks`

### Alternative 3: Separate NPM Package

**Pros:**
- Lighter SpecWeave core
- Can be used without SpecWeave

**Cons:**
- More packages to maintain
- Fragmentation

**Decision:** Keep in core for now, extract later if needed

## Technical Considerations

### 1. Existing Hook Detection

Before installing, check for existing `.git/hooks/pre-commit`:

```typescript
const existingHook = await fs.pathExists('.git/hooks/pre-commit');
if (existingHook && !options.force) {
  const answer = await confirm({
    message: 'pre-commit hook already exists. Overwrite?',
    default: false
  });
  if (!answer) {
    logger.info('Skipping hook installation');
    return;
  }
}
```

### 2. Hook Merging

If user has existing hooks, offer to merge:
- Read existing hook content
- Append SpecWeave checks
- Preserve user's custom logic

### 3. Cross-Platform Compatibility

- Use Node.js for portability (not just bash)
- Fallback to bash for simple checks
- Test on Windows, Mac, Linux

### 4. Update Mechanism

When SpecWeave releases new hook versions:

```bash
$ specweave update-hooks

🔍 Checking for hook updates...
✓ root-pollution-check.sh: v1.0.0 → v1.1.0
  - Added .log file detection
  - Improved error messages

Update hooks? [Y/n] Y

✅ Hooks updated successfully!
```

## File Structure After Installation

```
user-project/
├── .git/
│   └── hooks/
│       └── pre-commit           # SpecWeave hook
├── .specweave/
│   ├── config.json
│   └── hooks/
│       ├── config.json          # Master hook config
│       └── root-pollution-config.json
├── scripts/
│   ├── fix-root-pollution.sh   # Auto-fix script
│   └── hooks/                  # Check scripts
│       └── root-pollution-check.sh
├── README.md
└── package.json
```

## Next Steps

1. ✅ Get user feedback on this design
2. Create increment for implementation
3. Build MVP (Phase 1)
4. Test in sample projects
5. Document in user guide
6. Release with next minor version

## Questions for User

1. Should this be part of `specweave init`? Or separate command?
2. What other hooks would be valuable?
   - Pre-push (run tests before push)
   - Commit-msg (enforce conventional commits)
   - Post-commit (update docs)
3. Should we support merging with existing hooks?
4. What customization options are most important?

## Related

- Current implementation: `.git/hooks/pre-commit` (SpecWeave repo)
- Root pollution check: `scripts/pre-commit-root-pollution-check.sh`
- Auto-fix script: `scripts/fix-root-pollution.sh`
- CLAUDE.md Rule #5: Root cleanliness
