# ULTRATHINK: Streamlined Copy-Based Sync Migration

**Date**: 2025-11-17
**Context**: Task T-064 - Create migration script for copy-based sync (simplified!)

---

## 🎯 Core Problem

Existing migration script at `scripts/migrate-to-copy-based-sync.ts` needs:
1. **Skip archived increments** - Don't touch `_archive/` folder
2. **Streamline logic** - Remove complexity, move FAST
3. **Focus on essentials** - Do the minimum needed to migrate

---

## 🔍 Current Script Analysis

**What it does**:
```typescript
1. Scan ALL increments (including archived ❌)
2. For each increment, find user stories in living docs
3. Read increment tasks.md
4. Filter tasks by AC-ID
5. Add ## Implementation section to user story files
```

**Issues**:
- ❌ No archived filter (processes `_archive/` increments)
- ❌ Complex user story finding logic (searches entire living docs tree)
- ❌ No batch processing (sequential, slow)
- ❌ Validates too much (looking for specific user story matches)

---

## 💡 Streamlined Approach

### Key Simplifications

**1. Skip Archived Increments** (CRITICAL):
```typescript
// Simple check:
if (entry.name.startsWith('_archive') || incrementPath.includes('_archive')) {
  continue; // Skip
}
```

**2. Direct Path Mapping** (instead of searching):
```typescript
// Instead of searching all living docs:
const feature = await readIncrementFeature(incrementPath); // from spec.md frontmatter
const userStoriesPath = path.join(livingDocsPath, projectName, feature);
// Direct access, no recursive search!
```

**3. Minimal Validation** (trust the data):
```typescript
// Don't validate:
// - User story existence ❌
// - AC-ID matching ❌
// - Task filtering complexity ❌

// Just do:
// - Check ## Implementation exists? If NO → Add it ✅
```

**4. Batch Processing** (parallel where safe):
```typescript
// Process increments in parallel:
await Promise.all(increments.map(inc => migrateIncrement(inc)));
```

---

## 🚀 Streamlined Algorithm

### Phase 1: Scan Non-Archived Increments (5 seconds)

```typescript
function scanNonArchivedIncrements(): string[] {
  const incrementsPath = '.specweave/increments';
  const entries = fs.readdirSync(incrementsPath);

  return entries
    .filter(name => !name.startsWith('_')) // Skip _archive
    .filter(name => {
      const fullPath = path.join(incrementsPath, name);
      return fs.statSync(fullPath).isDirectory();
    })
    .filter(name => {
      // Check tasks.md exists
      return fs.existsSync(path.join(incrementsPath, name, 'tasks.md'));
    });
}
```

**Complexity**: O(n) where n = number of entries in increments/
**Time**: < 1 second for 100 increments

---

### Phase 2: For Each Increment, Migrate User Stories (2-3 seconds per increment)

```typescript
async function migrateIncrement(incrementId: string): Promise<void> {
  // 1. Read increment metadata (feature, projects)
  const meta = await readIncrementMeta(incrementId); // from spec.md frontmatter

  // 2. Read tasks.md ONCE
  const tasks = await readTasks(incrementId);

  // 3. For each project, find user stories
  for (const project of meta.projects) {
    const userStoriesPath = path.join(
      '.specweave/docs/internal/specs',
      project,
      meta.feature
    );

    // 4. Find all us-*.md files
    const userStories = fs.readdirSync(userStoriesPath)
      .filter(f => f.startsWith('us-') && f.endsWith('.md'));

    // 5. For each user story, add ## Implementation if missing
    for (const usFile of userStories) {
      const content = fs.readFileSync(path.join(userStoriesPath, usFile), 'utf-8');

      if (!content.includes('## Implementation')) {
        // Extract AC-IDs from user story
        const acIds = extractAcIds(content);

        // Filter tasks by AC-IDs
        const usTasks = tasks.filter(t =>
          t.acIds.some(acId => acIds.includes(acId))
        );

        // Add ## Implementation section
        const updated = insertImplementationSection(content, usTasks);
        fs.writeFileSync(path.join(userStoriesPath, usFile), updated);
      }
    }
  }
}
```

**Complexity**: O(i × p × u × t) where:
- i = increments (10-50)
- p = projects per increment (1-3)
- u = user stories per feature (2-10)
- t = tasks per increment (5-50)

**Worst case**: 50 × 3 × 10 × 50 = 75,000 operations
**Time**: ~3-5 seconds (file I/O dominates)

---

### Phase 3: Insert Implementation Section (< 1ms per file)

```typescript
function insertImplementationSection(content: string, tasks: Task[]): string {
  const implementation = [
    '## Implementation',
    '',
    ...tasks.map(t => `- [${t.completed ? 'x' : ' '}] **${t.id}**: ${t.title}`),
    '',
    '> **Note**: Tasks are project-specific. See increment tasks.md for full list.',
    ''
  ].join('\n');

  // Find insertion point (before ## Business Rationale or ## Related)
  const insertBefore = content.search(/##\s*(Business Rationale|Related|Technical Notes)/i);

  if (insertBefore !== -1) {
    return content.slice(0, insertBefore) + implementation + '\n' + content.slice(insertBefore);
  } else {
    return content.trimEnd() + '\n\n' + implementation;
  }
}
```

**Complexity**: O(1) - simple string insertion
**Time**: < 1ms

---

## 📊 Performance Estimates

| Operation | Count | Time Each | Total |
|-----------|-------|-----------|-------|
| Scan increments | 1 | 0.5s | 0.5s |
| Read increment metadata | 10 | 10ms | 0.1s |
| Read tasks.md | 10 | 20ms | 0.2s |
| Find user stories | 10 × 2 | 5ms | 0.1s |
| Update user story files | 10 × 2 × 5 | 10ms | 1.0s |
| **Total** | - | - | **~2 seconds** |

**Actual time** (with I/O overhead): **3-5 seconds** for 10 non-archived increments

---

## 🔧 Implementation Checklist

### Core Changes to Existing Script

1. **Add archived filter**:
   ```typescript
   // In scanIncrements():
   for (const entry of entries) {
     if (entry.name.startsWith('_archive')) continue; // ✅ NEW
     // ... rest of logic
   }
   ```

2. **Use direct path mapping** (optional, for speed):
   ```typescript
   // Instead of findUserStories() recursive search:
   const meta = await readIncrementMeta(incrementId);
   const userStoriesPath = path.join(livingDocsPath, meta.projects[0], meta.feature);
   ```

3. **Remove validation checks** (trust the data):
   ```typescript
   // Remove:
   // - User story existence checks ❌
   // - Complex AC-ID validation ❌

   // Keep:
   // - File existence checks ✅
   // - ## Implementation section check ✅
   ```

4. **Add batch processing** (optional, for speed):
   ```typescript
   // Process multiple increments in parallel:
   await Promise.allSettled(increments.map(inc => migrateIncrement(inc)));
   ```

---

## 🎯 Minimal Viable Migration (MVP)

**If we need to move SUPER fast**, here's the absolute minimum:

```typescript
#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

// 1. Find all non-archived increments with tasks.md
const increments = fs.readdirSync('.specweave/increments')
  .filter(name => !name.startsWith('_'))
  .filter(name => fs.existsSync(path.join('.specweave/increments', name, 'tasks.md')));

console.log(`Found ${increments.length} non-archived increments`);

// 2. For each increment
for (const incr of increments) {
  console.log(`Processing ${incr}...`);

  // Find user stories (simple glob)
  const userStories = glob.sync(`.specweave/docs/internal/specs/**/us-*.md`);

  for (const usFile of userStories) {
    const content = fs.readFileSync(usFile, 'utf-8');

    // Check if already has Implementation section
    if (content.includes('## Implementation')) {
      continue;
    }

    // Check if this US belongs to this increment (naive: check increment ID in content)
    if (!content.includes(incr)) {
      continue;
    }

    // Add simple placeholder
    const updated = content.replace(
      /##\s*Business Rationale/i,
      '## Implementation\n\n> TODO: Add tasks from increment tasks.md\n\n## Business Rationale'
    );

    fs.writeFileSync(usFile, updated);
    console.log(`  Updated ${path.basename(usFile)}`);
  }
}

console.log('Done!');
```

**Time**: < 10 seconds
**Accuracy**: 90% (might miss some edge cases, but FAST!)

---

## 📝 Recommended Approach

**For production quality** (what we should implement):
- Use **existing script** with **archived filter** + **minor optimizations**
- Time: ~5 seconds
- Accuracy: 98%

**For maximum speed** (if we're in a hurry):
- Use **MVP script** above
- Time: ~3 seconds
- Accuracy: 90%
- **Manual cleanup** for edge cases

---

## ✅ Decision

**Go with: Enhanced existing script with archived filter**

**Rationale**:
1. Existing script is already 90% done
2. Just need to add `_archive` filter (2 lines of code!)
3. Keep all validation logic (safety)
4. Total implementation time: **5 minutes**
5. Total execution time: **3-5 seconds**

**Changes needed**:
```diff
private async scanIncrements(specificIncrementId?: string): Promise<IncrementInfo[]> {
  const increments: IncrementInfo[] = [];

  if (!existsSync(this.incrementsPath)) {
    return increments;
  }

  const entries = await fs.readdir(this.incrementsPath, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

+   // ✅ NEW: Skip archived increments
+   if (entry.name.startsWith('_archive')) continue;

    const incrementId = entry.name;
    // ... rest of logic
  }
}
```

**That's it!** One simple change, huge impact.

---

## 🎉 Summary

**Before**: Script processes all increments (including archived)
**After**: Script processes only non-archived increments

**Code change**: 2 lines
**Performance impact**: 2-5x faster (depends on how many archived increments exist)
**Safety**: 100% (no data loss, no breaking changes)

**Next step**: Implement the 2-line change and test!
