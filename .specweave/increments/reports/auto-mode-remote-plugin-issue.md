# Auto Mode Remote Plugin Architecture Issue

## Problem Statement

The `/sw:auto` command fails in user projects because it tries to execute local shell scripts from the plugin that don't exist in user environments.

### Error Example

```bash
cd /Users/aabyzovext/Projects/AI\ bussines\ ideas/AnticryBabyApp && bash plugins/specweave/scripts/setup-auto.sh
Exit code 127
bash: plugins/specweave/scripts/setup-auto.sh: No such file or directory
```

## Root Cause Analysis

### Plugin Architecture Mismatch

1. **SpecWeave Development Environment** (this repo):
   - Plugins exist locally in `plugins/specweave/`
   - Scripts are accessible at `plugins/specweave/scripts/setup-auto.sh`
   - Commands can directly execute bash scripts

2. **User Project Environment** (after `npm install -g specweave`):
   - Plugins are loaded from GitHub remotes (NOT local files)
   - No `plugins/` directory exists in user projects
   - Scripts are NOT available locally
   - Only Claude Code instructions from `.md` files are accessible

### Why This Happens

From CLAUDE.md:
```markdown
<!-- SW:SECTION:syncing version="1.0.80" -->
this project uses claude, and plugins folder will never be there,
plugins are stored in remote github repo!
```

The `auto.md` command documentation incorrectly instructs:
```bash
bash plugins/specweave/scripts/setup-auto.sh [args]
```

This path **only exists in the SpecWeave development repo**, not in user projects!

## Impact

### Affected Commands

All commands that reference `bash plugins/specweave/...`:

1. `/sw:auto` - setup-auto.sh
2. `/sw:cancel-auto` - cancel-auto.sh
3. `/sw:auto-status` - auto-status.sh
4. `/sw:check-hooks` - hook-health.sh
5. `/sw:do` - pre-increment-start.sh
6. `/sw:sync-status` - update-status-line.sh
7. `/sw:sync-progress` - post-task-completion.sh
8. `/sw:revert-wip-limit` - migrate-increment-work.sh

### User Experience

- Users running `/sw:auto` get cryptic "No such file" errors
- No clear guidance on what went wrong
- Command appears broken/non-functional
- Users don't know if it's a bug or configuration issue

## Solution Options

### Option 1: TypeScript CLI Wrappers (Recommended)

**Create proper CLI commands that wrap the shell logic:**

```typescript
// src/cli/commands/auto.ts
export async function autoCommand(args: string[]) {
  // Parse args
  const options = parseAutoArgs(args);

  // Replicate setup-auto.sh logic in TypeScript
  const session = await createAutoSession(options);

  // Return appropriate instructions for Claude
  return {
    sessionId: session.id,
    increment: session.currentIncrement,
    instructions: generateAutoInstructions(session)
  };
}
```

**Benefits:**
- Works identically in dev and user environments
- Proper error handling and user feedback
- Can be tested with unit/integration tests
- No dependency on shell script availability

**Implementation:**
1. Port bash scripts to TypeScript in `src/cli/commands/`
2. Export via `bin/specweave.js`
3. Update command docs to use `specweave auto` instead of bash scripts

### Option 2: Embedded Scripts in Distribution

**Include scripts in npm package and reference via `specweave` install location:**

```bash
# In package.json "files"
"files": [
  "dist",
  "bin",
  "scripts/**/*.sh",  # Include all scripts
  ...
]
```

```bash
# In auto.md, reference via npm global install path
SPECWEAVE_DIR=$(npm root -g)/specweave
bash "$SPECWEAVE_DIR/scripts/setup-auto.sh" [args]
```

**Benefits:**
- Minimal code changes
- Scripts remain in bash for transparency
- Works in both environments

**Drawbacks:**
- Requires finding npm global install path
- Platform-specific path resolution
- Less elegant than native CLI commands

### Option 3: Skill-Based Execution (Current Workaround)

**Have Claude execute the logic directly without scripts:**

Instead of:
```bash
bash plugins/specweave/scripts/setup-auto.sh
```

Document inline logic:
```markdown
1. Create session file at `.specweave/state/auto-session.json`
2. Generate session ID: `auto-$(date +%Y-%m-%d)-$(head -c 4 /dev/urandom | xxd -p)`
3. Build increment queue from args or detect active increment
4. Write session JSON with max iterations, status, etc.
...
```

**Benefits:**
- No external dependencies
- Works immediately

**Drawbacks:**
- Duplicates logic across command docs
- Harder to maintain consistency
- No single source of truth

## Recommended Implementation Plan

### Phase 1: Immediate Fix (CLI Wrappers)

1. **Create TypeScript CLI commands** for core auto mode functionality:
   - `src/cli/commands/auto.ts` - Session creation and management
   - `src/cli/commands/auto-status.ts` - Status checking
   - `src/cli/commands/cancel-auto.ts` - Session cancellation

2. **Update bin/specweave.js** to register new commands:
   ```javascript
   program
     .command('auto [increments...]')
     .description('Start autonomous execution session')
     .option('--max-iterations <n>', 'Maximum iterations')
     .option('--simple', 'Pure Ralph mode')
     // ...
     .action(autoCommand);
   ```

3. **Update command documentation** (plugins/specweave/commands/*.md):
   - Replace `bash plugins/specweave/scripts/setup-auto.sh`
   - With `specweave auto` (for end users) OR direct JSON manipulation (for Claude)

4. **Add contributor vs user guidance** in docs:
   ```markdown
   ## For SpecWeave Contributors
   ```bash
   bash scripts/refresh-marketplace.sh --github
   npm run rebuild
   ```

   ## For End Users
   ```bash
   specweave refresh-marketplace
   specweave auto [increments...]
   ```
   ```

### Phase 2: Full Migration

1. Port all hook scripts to TypeScript modules
2. Create `@specweave/hooks` package for testability
3. Deprecate shell scripts (keep for backward compat)
4. Update all plugin commands to use CLI

### Phase 3: Testing

1. **E2E Tests** simulating user project environment:
   - Install specweave globally in temp dir
   - Run `specweave init`
   - Execute `/sw:auto` via Claude Code
   - Verify session creation without errors

2. **Integration Tests** for CLI commands:
   - Test session creation
   - Test state management
   - Test error cases

## Immediate Action Items

### For This Analysis

1. ✅ Document the problem
2. ✅ Identify root cause
3. ✅ Propose solutions
4. ⏳ Get user input on preferred approach

### For Implementation

1. Create `src/cli/commands/auto.ts`
2. Port session creation logic from `setup-auto.sh`
3. Update `bin/specweave.js` to register command
4. Test in user project simulation
5. Update documentation
6. Update CLAUDE.md with correct usage patterns

## Testing Strategy

### Development Environment Test
```bash
# In SpecWeave repo
npm run rebuild
npm link
cd /tmp/test-project
npm install -g file:/path/to/specweave
specweave init .
# Try /sw:auto command via Claude Code
```

### User Environment Simulation
```bash
# Clean environment
npm uninstall -g specweave
npm install -g specweave@latest
mkdir /tmp/new-project && cd /tmp/new-project
specweave init .
# Try /sw:auto - should work without "file not found" error
```

## Success Criteria

- ✅ `/sw:auto` works in fresh user projects (no local `plugins/` folder)
- ✅ No "bash: plugins/specweave/scripts/setup-auto.sh: No such file" error
- ✅ Session created successfully at `.specweave/state/auto-session.json`
- ✅ Stop hook can continue execution loop
- ✅ Same behavior in dev repo and user projects
- ✅ Documentation clearly distinguishes contributor vs user commands

## References

- [CLAUDE.md](../../CLAUDE.md) - Plugin architecture notes
- [auto.md](../../../plugins/specweave/commands/auto.md) - Auto command docs
- [setup-auto.sh](../../../plugins/specweave/scripts/setup-auto.sh) - Current bash implementation
- [ADR-0062](../.specweave/docs/internal/architecture/adr/0062-github-marketplace-mode.md) - GitHub marketplace architecture (if exists)

## Next Steps

1. **User Decision**: Which solution approach to take?
   - Option 1 (TypeScript CLI) - More work, better long-term
   - Option 2 (Embedded scripts) - Quick fix, less elegant
   - Option 3 (Inline logic) - Immediate but unmaintainable

2. **Implementation**: Port bash logic to TypeScript CLI command

3. **Testing**: Verify in clean user environment

4. **Documentation**: Update all affected command docs

5. **Release**: Bump version, publish to npm, update marketplace
