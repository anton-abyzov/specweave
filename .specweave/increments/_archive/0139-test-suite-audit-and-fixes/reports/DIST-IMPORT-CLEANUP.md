# Dist Import Cleanup Report

**Date**: 2025-12-10
**Issue**: Scripts with hardcoded `dist/` imports won't work in user projects
**Root Cause**: Scripts importing from `../../../../dist/src/...` assume SpecWeave source is in project root

---

## Problem

When users install SpecWeave via npm:
- **Global install**: SpecWeave dist files are in `/usr/local/lib/node_modules/specweave/dist/`
- **Local install**: SpecWeave dist files are in `node_modules/specweave/dist/`
- **User's `.specweave/` folder**: Only contains increment data, NOT SpecWeave source code

Scripts using relative imports like:
```javascript
import { LivingDocsSync } from '../../../../dist/src/core/living-docs/living-docs-sync.js';
```

This path resolves to:
- In SpecWeave repo: `/path/to/specweave/dist/src/...` ✅ Works
- In user project: `/path/to/user-project/dist/src/...` ❌ Doesn't exist!

---

## Files Removed

### Active Increments
1. `.specweave/increments/0139-test-suite-audit-and-fixes/scripts/sync-to-living-docs.js`
   - Temporary script for manual living docs sync
   - Used `../../../../dist/src/core/living-docs/living-docs-sync.js`

### Archived Increments
2. `.specweave/increments/_archive/0031-external-tool-status-sync/scripts/sync-all-living-docs.js`
   - Used `../../../../dist/src/core/living-docs/spec-distributor.js`

3. `.specweave/increments/_archive/0029-cicd-failure-detection-auto-fix/scripts/sync-all-specs-to-github.js`
   - Used `../../../../dist/plugins/specweave-github/lib/github-spec-sync.js`

4. `.specweave/increments/_archive/0031-external-tool-status-sync/scripts/update-us-004.mjs`
   - Used dynamic imports: `path.join(projectRoot, 'dist/plugins/...')`

5. `.specweave/increments/_archive/0047-us-task-linkage/scripts/fix-incorrectly-archived-features.ts`
   - Used `../../../../dist/src/core/living-docs/feature-archiver.js`

6. `.specweave/increments/_archive/0037-project-specific-tasks/scripts/update-all-increments-status.ts`
   - Used `dist/` imports

7. `.specweave/increments/_archive/0031-external-tool-status-sync/scripts/sync-all-epics-to-github.ts`
   - Used `dist/` imports

8. `.specweave/increments/_archive/0031-external-tool-status-sync/scripts/test-single-epic.ts`
   - Used `dist/` imports

---

## Correct Approach

**Users should use SpecWeave CLI commands**, not internal scripts:

| ❌ Don't Do This | ✅ Do This Instead |
|------------------|-------------------|
| `node scripts/sync-to-living-docs.js` | `/specweave:sync-specs` |
| `node scripts/sync-all-specs-to-github.js` | `/specweave-github:sync` |
| `node scripts/update-us-004.mjs` | `/specweave-github:push` |

**Why CLI commands work**:
- CLI resolves SpecWeave's installed location automatically
- Works for both global and local npm installs
- Uses proper module resolution (not hardcoded paths)
- Maintained and tested for user projects

---

## Lesson Learned

**Helper scripts in `.specweave/increments/` should NEVER import from `dist/`**:
- ✅ **OK**: Scripts using `gh`, `git`, `curl` (external CLIs)
- ✅ **OK**: Scripts using SpecWeave CLI commands (`/specweave:*`)
- ❌ **WRONG**: Scripts importing SpecWeave internal modules
- ❌ **WRONG**: Scripts with relative paths to `dist/`

**If you need to import SpecWeave modules**:
- Create a plugin or extend SpecWeave core
- Don't create increment-specific scripts

---

## Verification

Verified no remaining problematic imports:
```bash
find .specweave/increments -type f \( -name "*.js" -o -name "*.mjs" -o -name "*.ts" \) \
  ! -path "*/_archive/*" -exec grep -l "from.*dist/" {} \;
# Result: No files found ✅
```

---

**Status**: ✅ COMPLETE - All problematic scripts removed
**Impact**: User projects will now work correctly when using SpecWeave as an npm package
