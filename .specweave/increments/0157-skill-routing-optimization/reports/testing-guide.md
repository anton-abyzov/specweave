# Skill Visibility Testing Guide

## Overview

This guide documents how to test the skill visibility feature implemented in increment 0157.

## Unit Tests

### Location
`tests/unit/plugin-system/plugin-loader.test.ts`

### Running Tests

```bash
# Run all plugin loader tests
npx vitest run tests/unit/plugin-system/plugin-loader.test.ts

# Run with verbose output
npx vitest run tests/unit/plugin-system/plugin-loader.test.ts --reporter=verbose
```

### Test Scenarios

1. **Extract visibility from SKILL.md frontmatter**
   - Verifies `increment-planner` skill has `visibility: internal`
   - Verifies `invocableBy` contains `sw:increment`

2. **Default to public visibility when not specified**
   - Verifies skills without `visibility` field default to undefined (public)

3. **Parse invocableBy array correctly**
   - Verifies YAML array parsing works correctly

## Manual E2E Testing

### Test 1: Verify Skill Visibility Parsing

Run this command to verify the increment-planner skill is correctly marked as internal:

```bash
node << 'SCRIPT'
import { PluginLoader } from './dist/src/core/plugins/plugin-loader.js';
import path from 'path';

const loader = new PluginLoader();
const plugin = await loader.loadFromDirectory(path.join(process.cwd(), 'plugins/specweave'));
const ipSkill = plugin.skills.find(s => s.name === 'increment-planner');

console.log('increment-planner skill:');
console.log('  Visibility:', ipSkill.visibility);
console.log('  InvocableBy:', ipSkill.invocableBy);
SCRIPT
```

Expected output:
```
increment-planner skill:
  Visibility: internal
  InvocableBy: [ 'sw:increment' ]
```

### Test 2: Count Internal vs Public Skills

```bash
# Should show 1 internal skill (increment-planner) and 44+ public skills
```

### Test 3: SKILL.md Frontmatter Format

The increment-planner SKILL.md should have this frontmatter:

```yaml
---
name: increment-planner
description: Creates comprehensive implementation plans...
visibility: internal
invocableBy:
  - sw:increment
---
```

## Expected Results

| Test | Expected Result |
|------|-----------------|
| Plugin loader parses visibility | `internal` for increment-planner |
| Plugin loader parses invocableBy | `['sw:increment']` |
| Default visibility | undefined (public by default) |
| Unit tests | All 12 tests passing |

## Troubleshooting

### Tests Failing

1. **Build first**: `npm run build`
2. **Check SKILL.md format**: Ensure YAML frontmatter is valid
3. **Check import paths**: Ensure `.js` extensions are used

### Visibility Not Detected

1. Check the SKILL.md has proper YAML frontmatter (starts with `---`)
2. Verify the `visibility` field is at the root level
3. Verify the `invocableBy` field uses proper YAML array format:
   ```yaml
   invocableBy:
     - sw:increment
     - sw:plan
   ```
