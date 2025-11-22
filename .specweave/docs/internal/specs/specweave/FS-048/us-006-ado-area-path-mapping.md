---
id: US-006
feature: FS-048
title: "Azure DevOps Area Path Mapping (Hierarchical Sub-Projects)"
status: proposed
priority: P2
created: 2025-11-21
---

# US-006: Azure DevOps Area Path Mapping (Hierarchical Sub-Projects)

**GitHub Project**: https://github.com/anton-abyzov/specweave/issues/708

**Feature**: [FS-048 - Enhanced External Tool Import](../../../_features/FS-048/FEATURE.md)

## User Story

**As a** team using Azure DevOps with hierarchical area paths
**I want** area paths mapped to SpecWeave projects automatically
**So that** my team structure (Backend\API, Frontend\Mobile) is preserved in SpecWeave

## Business Value

- **ADO-Specific**: Addresses ADO's unique hierarchical organization model
- **Team Scalability**: Support large orgs with 50+ area paths (sub-teams)
- **Flexibility**: User chooses granularity (top-level, two-level, full tree)

## Acceptance Criteria

### AC-US6-01: Area Path Discovery
- **Priority**: P1
- **Testable**: Yes (integration test with ADO API mock)
- **Description**: Automatically discover all area paths for ADO project
- **API Endpoint**: `https://dev.azure.com/{org}/{project}/_apis/wit/classificationnodes/areas?$depth=10`
- **Example Area Paths**:
  ```
  Platform
  ├── Backend
  │   ├── API
  │   ├── Database
  │   └── Services
  ├── Frontend
  │   ├── Web
  │   └── Mobile
  └── Infrastructure
      ├── DevOps
      └── Security
  ```
- **Validation**: Fetch returns all area paths in tree structure

### AC-US6-02: Granularity Selection
- **Priority**: P1
- **Testable**: Yes (E2E test)
- **Description**: User chooses area path mapping granularity
- **Prompt**:
  ```
  How would you like to map Azure DevOps area paths?

  1. Top-level only (3 projects: Backend, Frontend, Infrastructure)
  2. Two-level (8 projects: Backend-API, Backend-Database, Frontend-Web, ...)
  3. Full tree (all 10 area paths as separate projects)
  4. Custom (select specific area paths manually)
  ```
- **Validation**: All 4 options available, choice persisted

### AC-US6-03: Top-Level Mapping
- **Priority**: P1
- **Testable**: Yes (integration test)
- **Description**: Map only top-level area paths to projects
- **Example**:
  ```
  ADO: Platform/Backend → SpecWeave: .specweave/docs/internal/specs/backend/
  ADO: Platform/Frontend → SpecWeave: .specweave/docs/internal/specs/frontend/
  ```
- **Validation**: 3 project folders created (top-level only)

### AC-US6-04: Two-Level Mapping
- **Priority**: P1
- **Testable**: Yes (integration test)
- **Description**: Map two-level area paths to projects
- **Example**:
  ```
  ADO: Platform/Backend/API → SpecWeave: .specweave/docs/internal/specs/backend-api/
  ADO: Platform/Backend/Database → SpecWeave: .specweave/docs/internal/specs/backend-database/
  ADO: Platform/Frontend/Web → SpecWeave: .specweave/docs/internal/specs/frontend-web/
  ```
- **Validation**: 8 project folders created (two-level)

### AC-US6-05: Full Tree Mapping
- **Priority**: P2
- **Testable**: Yes (integration test)
- **Description**: Map all area paths to projects (including nested)
- **Example**:
  ```
  ADO: Platform → .specweave/docs/internal/specs/platform/
  ADO: Platform/Backend → .specweave/docs/internal/specs/platform-backend/
  ADO: Platform/Backend/API → .specweave/docs/internal/specs/platform-backend-api/
  ```
- **Validation**: 10 project folders created (all area paths)

### AC-US6-06: Bidirectional Sync (ADO ↔ SpecWeave)
- **Priority**: P2
- **Testable**: Yes (integration test)
- **Description**: Area path changes sync bidirectionally
- **Scenarios**:
  - **ADO → SpecWeave**: New area path created in ADO → New project folder in SpecWeave
  - **SpecWeave → ADO**: New project created in SpecWeave → New area path in ADO
- **Validation**: Both directions work correctly

## Technical Implementation

### Area Path Parser

```typescript
// src/integrations/ado/area-path-mapper.ts (NEW)

export interface AreaPathNode {
  name: string;
  path: string;  // Full path: "Platform/Backend/API"
  level: number;  // 0 = root, 1 = top-level, 2 = two-level, etc.
  children: AreaPathNode[];
}

export type AreaPathGranularity = 'top-level' | 'two-level' | 'full-tree' | 'custom';

export class AreaPathMapper {
  private client: AdoClient;

  constructor(client: AdoClient) {
    this.client = client;
  }

  /**
   * Fetch area paths from ADO (recursive tree structure)
   */
  async fetchAreaPaths(project: string): Promise<AreaPathNode> {
    const endpoint = `https://dev.azure.com/${this.client.org}/${project}/_apis/wit/classificationnodes/areas?$depth=10`;

    const response = await fetch(endpoint, {
      headers: {
        'Authorization': `Basic ${this.client.auth}`
      }
    });

    const data = await response.json();
    return this.parseAreaPathTree(data);
  }

  /**
   * Parse ADO API response into tree structure
   */
  private parseAreaPathTree(node: any, level: number = 0, parentPath: string = ''): AreaPathNode {
    const currentPath = parentPath ? `${parentPath}/${node.name}` : node.name;

    return {
      name: node.name,
      path: currentPath,
      level,
      children: (node.children || []).map((child: any) =>
        this.parseAreaPathTree(child, level + 1, currentPath)
      )
    };
  }

  /**
   * Flatten tree to list of area paths at specific granularity
   */
  flattenAreaPaths(root: AreaPathNode, granularity: AreaPathGranularity): AreaPathNode[] {
    switch (granularity) {
      case 'top-level':
        return this.getNodesByLevel(root, 1);  // Level 1 only

      case 'two-level':
        return this.getNodesByLevel(root, 2);  // Levels 1-2

      case 'full-tree':
        return this.getAllNodes(root);  // All levels

      case 'custom':
        return [];  // User will select manually
    }
  }

  /**
   * Get all nodes at specific level (recursive)
   */
  private getNodesByLevel(node: AreaPathNode, targetLevel: number): AreaPathNode[] {
    if (node.level === targetLevel) {
      return [node];
    }

    return node.children.flatMap(child =>
      this.getNodesByLevel(child, targetLevel)
    );
  }

  /**
   * Get all nodes (recursive flatten)
   */
  private getAllNodes(node: AreaPathNode): AreaPathNode[] {
    return [
      node,
      ...node.children.flatMap(child => this.getAllNodes(child))
    ];
  }

  /**
   * Map area path to SpecWeave project ID
   *
   * Examples:
   *   "Platform/Backend/API" → "backend-api"
   *   "Platform/Frontend" → "frontend"
   *   "Platform" → "platform"
   */
  mapToProjectId(areaPath: string): string {
    // Remove root (Platform)
    const withoutRoot = areaPath.split('/').slice(1);

    // Convert to kebab-case
    return withoutRoot
      .map(part => part.toLowerCase())
      .join('-');
  }
}
```

### Init Flow Integration

```typescript
// src/cli/helpers/issue-tracker/ado.ts (Modified)

async function promptAreaPathGranularity(
  areaPaths: AreaPathNode
): Promise<AreaPathGranularity> {
  const topLevelCount = countNodesAtLevel(areaPaths, 1);
  const twoLevelCount = countNodesAtLevel(areaPaths, 2);
  const fullTreeCount = countAllNodes(areaPaths);

  const { granularity } = await inquirer.prompt({
    type: 'list',
    name: 'granularity',
    message: 'How would you like to map Azure DevOps area paths?',
    choices: [
      {
        name: `📁 Top-level only (${topLevelCount} projects)`,
        value: 'top-level',
        short: 'Top-level'
      },
      {
        name: `📁📁 Two-level (${twoLevelCount} projects)`,
        value: 'two-level',
        short: 'Two-level'
      },
      {
        name: `📁🌳 Full tree (${fullTreeCount} projects)`,
        value: 'full-tree',
        short: 'Full tree'
      },
      {
        name: '✏️  Custom (select specific area paths)',
        value: 'custom',
        short: 'Custom'
      }
    ],
    default: 'top-level'  // Safe default
  });

  return granularity;
}
```

## Test Cases

### TC-US6-01: Area Path Discovery (Integration Test)
```typescript
test('should discover all ADO area paths', async () => {
  const client = createMockAdoClient();
  const mapper = new AreaPathMapper(client);

  const areaPaths = await mapper.fetchAreaPaths('Platform');

  expect(areaPaths.name).toBe('Platform');
  expect(areaPaths.children.length).toBe(3);  // Backend, Frontend, Infrastructure
  expect(areaPaths.children[0].name).toBe('Backend');
  expect(areaPaths.children[0].children.length).toBe(3);  // API, Database, Services
});
```

### TC-US6-02: Top-Level Mapping (Integration Test)
```typescript
test('should map top-level area paths only', async () => {
  const mapper = new AreaPathMapper(mockClient);
  const areaPaths = await mapper.fetchAreaPaths('Platform');

  const flattened = mapper.flattenAreaPaths(areaPaths, 'top-level');

  expect(flattened.length).toBe(3);  // Backend, Frontend, Infrastructure
  expect(flattened.map(n => n.name)).toEqual(['Backend', 'Frontend', 'Infrastructure']);
});
```

### TC-US6-03: Two-Level Mapping (Integration Test)
```typescript
test('should map two-level area paths', async () => {
  const mapper = new AreaPathMapper(mockClient);
  const areaPaths = await mapper.fetchAreaPaths('Platform');

  const flattened = mapper.flattenAreaPaths(areaPaths, 'two-level');

  expect(flattened.length).toBe(8);  // 8 two-level paths
  expect(flattened.map(n => mapper.mapToProjectId(n.path))).toContain('backend-api');
  expect(flattened.map(n => mapper.mapToProjectId(n.path))).toContain('frontend-web');
});
```

### TC-US6-04: Area Path to Project ID Conversion (Unit Test)
```typescript
test('should convert area path to project ID', () => {
  const mapper = new AreaPathMapper(mockClient);

  expect(mapper.mapToProjectId('Platform/Backend/API')).toBe('backend-api');
  expect(mapper.mapToProjectId('Platform/Frontend')).toBe('frontend');
  expect(mapper.mapToProjectId('Platform')).toBe('platform');
});
```

## Dependencies

- **US-001**: Smart Pagination (applies to area path loading)
- **US-003**: Three-Tier Dependency Loading (area paths are dependencies)
- **Existing**: `src/integrations/ado/ado-client.ts` (ADO API client)

## Risks & Mitigations

### Risk: Deep Area Path Trees (10+ Levels)
- **Problem**: Organization with 100+ area paths is overwhelming
- **Mitigation**:
  - Default to "top-level" granularity (safe choice)
  - Show counts in prompt (helps user decide)
  - Support custom selection (manual checkbox)

### Risk: Area Path Renames (Sync Breaks)
- **Problem**: ADO area path renamed → SpecWeave project ID no longer matches
- **Mitigation**:
  - Store ADO area path ID (not name) in config
  - Detect renames via ID comparison
  - Prompt user: "Area path renamed: Backend/API → Backend/REST. Update SpecWeave project? (Y/n)"

---

**Implementation Tasks**: See increment plan
**Related User Stories**: US-001 (Smart Pagination), US-003 (Dependency Loading)
