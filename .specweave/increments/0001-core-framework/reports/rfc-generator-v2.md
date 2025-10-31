# RFC Generator V2 - Official Documentation

## What is V2?

**V2** is the official, modern RFC generator for SpecWeave. It replaces the deprecated V1 (Jira-only) generator with a universal, multi-platform solution.

## File Location

```
src/core/rfc-generator-v2.ts
```

## Why "V2"?

- ✅ Signals "modern, advanced version"
- ✅ Clear distinction from deprecated V1
- ✅ Indicates multi-platform, flexible capabilities
- ✅ Future-proof naming (no confusion)

## Key Features

### 1. Universal Platform Support
- ✅ Jira (Epic → Story → Sub-task)
- ✅ Azure DevOps (Feature → User Story → Task)
- ✅ GitHub (Milestone → Issue)
- ✅ Custom (any hierarchy)

### 2. Flexible Work Item Types
```typescript
// V1 (OLD): Fixed types
type: 'story' | 'bug' | 'task' | 'epic'

// V2 (NEW): ANY type
type: string  // story, bug, issue, feature, user story, pull request, etc.
```

### 3. Six Grouping Strategies
1. **by_type** - Group by work item type (story, bug, task, etc.)
2. **by_parent** - Group by Epic/Feature/Milestone
3. **by_priority** - Group by P1/P2/P3
4. **by_label** - Group by labels/tags (GitHub-style)
5. **flat** - No grouping, flat list
6. **custom** - User-defined grouping function

### 4. Parent-Child Relationships
```typescript
parent: {
  type: 'Epic' | 'Feature' | 'Milestone' | any string,
  key: string,
  title: string,
  url?: string
}
```

### 5. Labels/Tags Support
```typescript
labels: ['bug', 'high-priority', 'frontend']
```

### 6. Auto-Detection
Integrates with `ProjectStructureDetector` to automatically detect your project structure.

## Usage

```typescript
import { 
  FlexibleRFCGenerator, 
  FlexibleWorkItem, 
  FlexibleRFCContent 
} from './src/core/rfc-generator-v2';

const generator = new FlexibleRFCGenerator();

// Example: Jira with Epic
const jiraWorkItems: FlexibleWorkItem[] = [
  {
    type: 'story',
    id: 'US0001',
    title: 'User can login',
    description: 'As a user, I want to login...',
    priority: 'P1',
    source_key: 'JIRA-123',
    source_url: 'https://jira.company.com/browse/JIRA-123',
    parent: {
      type: 'Epic',
      key: 'EPIC-1',
      title: 'Authentication'
    },
    labels: ['auth', 'security']
  }
];

await generator.generateRFC({
  metadata: {
    incrementId: '0001',
    title: 'User Authentication',
    status: 'draft',
    source: 'jira',
    created: '2025-10-28'
  },
  sourceMetadata: {
    source_type: 'jira',
    parent_type: 'Epic',
    parent_key: 'EPIC-1',
    parent_url: 'https://...',
    parent_title: 'Authentication'
  },
  summary: 'Implement user authentication',
  motivation: 'Users need secure access to the system',
  workItems: jiraWorkItems
});
```

## Azure DevOps Example

```typescript
const adoWorkItems: FlexibleWorkItem[] = [
  {
    type: 'User Story',  // ✅ Any type string supported
    id: 'WI12345',
    title: 'Payment processing',
    parent: {
      type: 'Feature',
      key: '11111',
      title: 'E-commerce'
    }
  }
];

await generator.generateRFC({
  metadata: {
    incrementId: '0002',
    title: 'E-commerce Feature',
    status: 'draft',
    source: 'ado',
    created: '2025-10-28'
  },
  sourceMetadata: {
    source_type: 'ado',
    parent_type: 'Feature',
    parent_key: '11111',
    project: 'MyProject'
  },
  summary: 'E-commerce functionality',
  motivation: 'Enable online sales',
  workItems: adoWorkItems
});
```

## GitHub Example

```typescript
const githubWorkItems: FlexibleWorkItem[] = [
  {
    type: 'issue',
    id: '#123',
    title: 'Fix login bug',
    parent: {
      type: 'Milestone',
      key: '1',
      title: 'v1.0 Release',
      url: 'https://github.com/org/repo/milestone/1'
    },
    labels: ['bug', 'high-priority']
  }
];

await generator.generateRFC({
  metadata: {
    incrementId: '0003',
    title: 'v1.0 Release',
    status: 'draft',
    source: 'github',
    created: '2025-10-28'
  },
  sourceMetadata: {
    source_type: 'github',
    parent_type: 'Milestone',
    parent_key: '1',
    repository: 'org/repo'
  },
  summary: 'Release v1.0',
  motivation: 'Ship MVP',
  workItems: githubWorkItems
});
```

## Comparison: V1 vs V2

| Feature | V1 (Removed) | V2 (Official) |
|---------|--------------|---------------|
| **Platforms** | ❌ Jira only | ✅ Jira, ADO, GitHub, Custom |
| **Work Item Types** | ❌ Fixed: story, bug, task, epic | ✅ Flexible: any string |
| **Grouping** | ❌ Hardcoded by type | ✅ 6 strategies |
| **Parent Support** | ❌ None | ✅ Full Epic/Feature/Milestone |
| **Labels** | ❌ None | ✅ GitHub-style tags |
| **Auto-detection** | ❌ No | ✅ Yes |
| **Custom Grouping** | ❌ No | ✅ Yes |

## Migration from V1

V1 has been removed. All code now uses V2:

```typescript
// OLD (V1 - removed)
import { RFCGenerator } from './core/rfc-generator';

// NEW (V2 - official)
import { FlexibleRFCGenerator } from './core/rfc-generator-v2';
```

## Build Status

✅ **Passing** - `npm run build` successful

## See Also

- `.specweave/docs/internal/architecture/rfc-generator-comparison.md` - Detailed comparison
- `.specweave/docs/internal/delivery/implementation-notes/rfc-generator-v2-migration.md` - Migration summary
- `src/core/project-structure-detector.ts` - Auto-detection logic

---

**V2 is the way forward!** 🚀
