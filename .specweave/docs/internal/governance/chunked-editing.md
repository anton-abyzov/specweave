# Chunked Editing Best Practice

## Problem
Large Edit operations (60+ lines) can overwhelm Claude Code's processing capacity,
especially when combined with:
- Active thinking/planning
- Multiple MCP servers running
- Background hook processing
- Git operations

## Solution: Edit in Chunks

### Chunk Size Guidelines
- ✅ **Small chunks**: 10-30 lines per Edit
- ⚠️  **Medium chunks**: 30-50 lines per Edit
- ❌ **Large chunks**: 60+ lines (avoid!)

### Example: Breaking Down Large Functions

**❌ WRONG: Single large Edit**
```typescript
// Add entire 60-line function at once
async function ensureMarketplaceBuilt(spinner: any): Promise<void> {
  // ... 60 lines of code, comments, error handling ...
}
```

**✅ CORRECT: Multiple small Edits**

**Edit 1:** Function signature + basic structure (15 lines)
```typescript
async function ensureMarketplaceBuilt(spinner: any): Promise<void> {
  const marketplacePath = path.join(os.homedir(), '.claude/plugins/marketplaces/specweave');

  if (!fs.existsSync(marketplacePath)) {
    return;
  }

  // TODO: Add build logic
}
```

**Edit 2:** Add build detection (10 lines)
```typescript
  const distPath = path.join(marketplacePath, 'dist');
  const nodeModulesPath = path.join(marketplacePath, 'node_modules');

  if (fs.existsSync(distPath) && fs.existsSync(nodeModulesPath)) {
    spinner.info(chalk.gray('Marketplace already built'));
    return;
  }
```

**Edit 3:** Add build execution (15 lines)
```typescript
  spinner.text = 'Building SpecWeave marketplace...';

  try {
    execSync('npm install', {
      cwd: marketplacePath,
      stdio: 'pipe',
      env: { ...process.env, NODE_ENV: 'production' }
    });

    spinner.succeed('Marketplace built successfully');
  } catch (error) {
    // TODO: Add error handling
  }
```

**Edit 4:** Add error handling (10 lines)

### Benefits
- ✅ Prevents Claude Code crashes
- ✅ Easier to review each change
- ✅ Better error recovery (can revert small chunks)
- ✅ Clearer git history

### When to Use
- Adding new functions > 30 lines
- Refactoring large blocks of code
- Adding comprehensive error handling
- Working in resource-constrained environments

### Incident Reference
- 2025-11-24: Claude Code crash when adding 60+ line `ensureMarketplaceBuilt` function
- Solution: Break into 4 edits of 10-15 lines each

## Related
- ADR-0070: Hook Consolidation (reduces processing overhead)
- CLAUDE.md Section 9a: Hook Performance & Safety
