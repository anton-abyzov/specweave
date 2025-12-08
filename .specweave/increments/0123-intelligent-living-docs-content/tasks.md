# Tasks: Intelligent Living Docs Content Generation

## Overview
- **Increment**: 0121-intelligent-living-docs-content
- **Feature**: FS-121
- **Total Tasks**: 9
- **Estimated Complexity**: Medium-High

---

## Tasks

### T-001: Add deriveADRTitle Function
**User Story**: US-001
**Satisfies ACs**: AC-US1-02, AC-US1-03
**Status**: [x] completed

**Description**: Create a new function `deriveADRTitle()` in `architecture-generator.ts` that uses LLM to generate human-readable ADR titles from pattern evidence.

**Implementation**:
```typescript
async function deriveADRTitle(
  pattern: string,
  evidence: string[],
  llmProvider: LLMProvider
): Promise<string> {
  const prompt = `Given this architectural pattern and evidence, generate a concise decision title (5-8 words).

Pattern: ${pattern}
Evidence: ${evidence.slice(0, 5).join(', ')}

Good examples:
- "Adopt Feature-Based Folder Structure"
- "Use Event-Driven Architecture for Async Processing"
- "Implement CQRS for Write Operations"

Return ONLY the title (5-8 words), no explanation.`;

  const response = await llmProvider.generateText(prompt, { maxTokens: 50 });
  return response.trim().replace(/[^a-zA-Z0-9\s-]/g, '').substring(0, 60);
}
```

**Files**:
- `src/core/living-docs/intelligent-analyzer/architecture-generator.ts`

**Tests**:
| Test ID | Description | Expected |
|---------|-------------|----------|
| T001-01 | deriveADRTitle returns title under 60 chars | Title length <= 60 |
| T001-02 | deriveADRTitle strips special characters | No quotes, colons in output |
| T001-03 | deriveADRTitle handles LLM error gracefully | Falls back to pattern name |

---

### T-002: Update ADR ID Generation
**User Story**: US-001
**Satisfies ACs**: AC-US1-01, AC-US1-04
**Status**: [x] completed

**Description**: Modify `detectArchitecturalDecisions()` to use semantic titles for ADR IDs instead of `DETECTED-XXXX`.

**Implementation**:
```typescript
// In detectArchitecturalDecisions() around line 184
const semanticTitle = await deriveADRTitle(pattern, data.evidence, llmProvider);
const kebabTitle = semanticTitle.toLowerCase().replace(/\s+/g, '-');

adrs.push({
  id: `${String(adrNum).padStart(4, '0')}-${kebabTitle}`,
  title: semanticTitle,
  // ... rest unchanged
});
```

**Files**:
- `src/core/living-docs/intelligent-analyzer/architecture-generator.ts`

**Tests**:
| Test ID | Description | Expected |
|---------|-------------|----------|
| T002-01 | ADR ID format is `XXXX-kebab-title` | Matches `/^\d{4}-[a-z0-9-]+$/` |
| T002-02 | ADR filename matches ID | File is `{id}.md` |

---

### T-003: Create generateRichModuleSummary Function
**User Story**: US-002
**Satisfies ACs**: AC-US2-01, AC-US2-02, AC-US2-03, AC-US2-04, AC-US2-05
**Status**: [x] completed

**Description**: Replace `generatePlaceholderSummary()` with `generateRichModuleSummary()` that includes Purpose, Dependencies, Dependents, Integration Points, and Patterns sections.

**Implementation**:
```typescript
function generateRichModuleSummary(
  module: ModuleInfo,
  analyzedFiles: AnalyzedFile[],
  totalExports: number,
  aiInsights?: AIModuleAnalysis,
  dependencyGraph?: ModuleDependencyInfo
): string {
  const sourceFiles = analyzedFiles.filter(f => f.type === 'source');
  const testFiles = analyzedFiles.filter(f => f.type === 'test');

  const sections: string[] = [
    `# ${module.name}`,
    '',
    `**Path**: \`${module.path}\``,
    '',
    '## Purpose',
    '',
    aiInsights?.purpose || inferPurposeFromName(module.name),
    '',
    '## Overview',
    '',
    `The ${module.name} module contains ${module.fileCount} files with approximately ${module.estimatedLOC.toLocaleString()} lines of code.`,
    '',
    '## Dependencies',
    '',
    formatDependencyList(dependencyGraph?.imports, 'This module imports from'),
    '',
    '## Dependents',
    '',
    formatDependencyList(dependencyGraph?.importedBy, 'This module is used by'),
    '',
    '## Integration Points',
    '',
    formatIntegrationPoints(aiInsights?.integrationPoints),
    '',
    '## Patterns Used',
    '',
    formatPatterns(aiInsights?.patterns),
    '',
    '## Analysis Summary',
    '',
    `- **Files Analyzed**: ${analyzedFiles.length}`,
    `- **Source Files**: ${sourceFiles.length}`,
    `- **Test Files**: ${testFiles.length}`,
    `- **Total Exports**: ${totalExports}`,
    '',
    '## Documentation Status',
    '',
    `**Has README**: ${module.hasReadme ? 'Yes' : 'No'}`,
    `**Has Tests**: ${testFiles.length > 0 ? 'Yes' : 'No'}`,
    '',
    '---',
    `*Analysis generated on ${new Date().toISOString().split('T')[0]}*`
  ];

  return sections.join('\n');
}

function inferPurposeFromName(name: string): string {
  const patterns: Record<string, string> = {
    'cli': 'Command-line interface for user interaction and command execution.',
    'core': 'Core business logic and domain models.',
    'api': 'API layer handling HTTP requests and responses.',
    'utils': 'Shared utility functions and helpers.',
    'services': 'Service layer orchestrating business operations.',
    'types': 'TypeScript type definitions and interfaces.',
  };
  return patterns[name.toLowerCase()] || `Provides ${name} functionality.`;
}

function formatDependencyList(deps: string[] | undefined, prefix: string): string {
  if (!deps || deps.length === 0) return 'No dependencies detected.';
  return `${prefix}:\n${deps.map(d => `- \`${d}\``).join('\n')}`;
}

function formatIntegrationPoints(points: string[] | undefined): string {
  if (!points || points.length === 0) return 'No external integration points detected.';
  return points.map(p => `- ${p}`).join('\n');
}

function formatPatterns(patterns: Array<{name: string; evidence: string}> | undefined): string {
  if (!patterns || patterns.length === 0) return 'No specific patterns detected.';
  return patterns.map(p => `- **${p.name}**: ${p.evidence}`).join('\n');
}
```

**Files**:
- `src/core/living-docs/module-analyzer.ts`

**Tests**:
| Test ID | Description | Expected |
|---------|-------------|----------|
| T003-01 | Output has Purpose section | Contains `## Purpose` |
| T003-02 | Output has Dependencies section | Contains `## Dependencies` |
| T003-03 | Output has Dependents section | Contains `## Dependents` |
| T003-04 | Output has Integration Points section | Contains `## Integration Points` |
| T003-05 | Output has Patterns Used section | Contains `## Patterns Used` |

---

### T-004: Wire AI Insights to Module Output
**User Story**: US-002
**Satisfies ACs**: AC-US2-06
**Status**: [x] completed

**Description**: Ensure `analysis.aiInsights` collected in `living-docs-worker.ts` (line 774) is passed to `generateRichModuleSummary()` and written to markdown.

**Implementation**:
1. In `living-docs-worker.ts`, pass `aiInsights` to module markdown generator
2. In `module-analyzer.ts`, update `generateModuleMarkdown()` to accept and use `aiInsights`

**Files**:
- `src/cli/workers/living-docs-worker.ts`
- `src/core/living-docs/module-analyzer.ts`

**Tests**:
| Test ID | Description | Expected |
|---------|-------------|----------|
| T004-01 | AI insights appear in module markdown | Purpose section has LLM content |
| T004-02 | Fallback works without AI insights | Default text appears |

---

### T-005: Enhance Team LLM Prompt
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-05
**Status**: [x] completed

**Description**: Update the LLM prompt in `organization-synthesizer.ts` to request structured output with responsibilities, domain expertise, and tech stack.

**Implementation**:
```typescript
// Update prompt around line 102-125
const prompt = `Analyze these repositories and cluster them into logical teams.

For each team, provide a JSON object with:
- name: Team name (e.g., "Platform Team", "API Gateway Team")
- description: 2-3 sentence summary of what this team does
- responsibilities: Array of 3-5 bullet points defining what the team owns and maintains
- domainExpertise: Array of technical competencies (e.g., "FHIR integration", "Angular development", "Azure Functions")
- techStack: Array of primary technologies used across team repos
- repos: List of repository names belonging to this team
- reasoning: Brief explanation of why these repos were grouped together

Repositories to analyze:
${JSON.stringify(repoSummaries, null, 2)}

Return a JSON array of team objects.`;
```

**Files**:
- `src/core/living-docs/intelligent-analyzer/organization-synthesizer.ts`

**Tests**:
| Test ID | Description | Expected |
|---------|-------------|----------|
| T005-01 | LLM response includes responsibilities | `team.responsibilities.length >= 3` |
| T005-02 | LLM response includes domainExpertise | `team.domainExpertise.length >= 2` |
| T005-03 | LLM response includes techStack | `team.techStack.length >= 1` |

---

### T-006: Update Team Output Template
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04
**Status**: [x] completed

**Description**: Modify `saveOrganizationStructure()` to generate richer team markdown with all new sections.

**Implementation**:
```typescript
// Update template around line 163-198
const content = [
  `# ${team.name}`,
  '',
  team.description,
  '',
  '## Responsibilities',
  '',
  ...(team.responsibilities || ['TBD']).map(r => `- ${r}`),
  '',
  '## Domain Expertise',
  '',
  ...(team.domainExpertise || ['General development']).map(e => `- ${e}`),
  '',
  '## Technology Stack',
  '',
  ...(team.techStack || ['TypeScript']).map(t => `- ${t}`),
  '',
  '## Repositories',
  '',
  ...team.repos.map(r => `- [${r}](../../modules/${r}.md)`),
  '',
  '## Integration Boundaries',
  '',
  team.integrationBoundaries || 'Integration boundaries to be documented.',
  '',
  '---',
  `*Clustering reasoning: ${team.reasoning}*`,
  `*Generated on ${new Date().toISOString().split('T')[0]}*`
].join('\n');
```

**Files**:
- `src/core/living-docs/intelligent-analyzer/organization-synthesizer.ts`

**Tests**:
| Test ID | Description | Expected |
|---------|-------------|----------|
| T006-01 | Team markdown has Responsibilities section | Contains `## Responsibilities` |
| T006-02 | Team markdown has Domain Expertise section | Contains `## Domain Expertise` |
| T006-03 | Team markdown has Technology Stack section | Contains `## Technology Stack` |
| T006-04 | Team markdown has Integration Boundaries section | Contains `## Integration Boundaries` |

---

### T-007: Add Enhanced Team Interface
**User Story**: US-003
**Satisfies ACs**: AC-US3-01, AC-US3-02, AC-US3-03, AC-US3-04
**Status**: [x] completed

**Description**: Update `types.ts` to include new team structure fields.

**Implementation**:
```typescript
// In types.ts
export interface EnhancedTeam {
  name: string;
  description: string;
  responsibilities: string[];
  domainExpertise: string[];
  techStack: string[];
  repos: string[];
  reasoning: string;
  integrationBoundaries?: string;
}

// Update LLMClusteringResponse to use EnhancedTeam
export interface LLMClusteringResponse {
  teams: EnhancedTeam[];
  services: ServiceCluster[];
  domains: DomainCluster[];
}
```

**Files**:
- `src/core/living-docs/intelligent-analyzer/types.ts`

**Tests**:
| Test ID | Description | Expected |
|---------|-------------|----------|
| T007-01 | EnhancedTeam interface compiles | No TypeScript errors |
| T007-02 | Existing code compatible with new interface | All tests pass |

---

### T-008: Add Structure-Level-Aware Team Organization
**User Story**: US-004
**Satisfies ACs**: AC-US4-01, AC-US4-02, AC-US4-03, AC-US4-07
**Status**: [x] completed

**Description**: Update `saveOrganizationStructure()` to create team folders following the detected structure level (1-level or 2-level) mirroring the specs folder structure.

**Implementation**:
```typescript
// In saveOrganizationStructure()
import { detectStructureLevel } from '../../../utils/structure-level-detector.js';

const structureConfig = detectStructureLevel(projectPath);

// Determine team path based on structure level
function getTeamPath(projectPath: string, team: EnhancedTeam): string {
  const basePath = path.join(projectPath, '.specweave/docs/internal/organization/teams');

  if (structureConfig.level === 2) {
    // 2-level: teams/{project}/{board}/
    const projectId = team.project || structureConfig.projects[0]?.id || 'default';
    const boardId = team.board || 'general';
    return path.join(basePath, projectId, boardId);
  } else {
    // 1-level: teams/{project}/
    const projectId = team.project || structureConfig.projects[0]?.id || 'default';
    return path.join(basePath, projectId);
  }
}
```

**Files**:
- `src/core/living-docs/intelligent-analyzer/organization-synthesizer.ts`
- `src/core/living-docs/intelligent-analyzer/types.ts` (add project/board to EnhancedTeam)

**Tests**:
| Test ID | Description | Expected |
|---------|-------------|----------|
| T008-01 | 1-level creates teams/{project}/ structure | Folder exists |
| T008-02 | 2-level creates teams/{project}/{board}/ structure | Folder exists |
| T008-03 | Fallback to 'default' project when not specified | Folder created at teams/default/ |

---

### T-009: Integrate External Team Sources (ADO/JIRA)
**User Story**: US-004
**Satisfies ACs**: AC-US4-04, AC-US4-05, AC-US4-06
**Status**: [x] completed

**Description**: Fetch team definitions from ADO and JIRA when sync is configured, and include external links in team documentation.

**Implementation**:
```typescript
// Add to organization-synthesizer.ts

interface ExternalTeamSource {
  provider: 'ado' | 'jira';
  teams: Array<{
    id: string;
    name: string;
    description?: string;
    url?: string;
    projectId?: string;
  }>;
}

async function fetchExternalTeams(
  projectPath: string,
  log: (msg: string) => void
): Promise<ExternalTeamSource[]> {
  const sources: ExternalTeamSource[] = [];
  const configPath = path.join(projectPath, '.specweave/config.json');

  if (!fs.existsSync(configPath)) return sources;

  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

  // Check for ADO sync profile
  for (const [profileName, profile] of Object.entries(config.sync?.profiles || {})) {
    if ((profile as any).provider === 'ado') {
      try {
        const adoClient = await createAdoClient(profileName, projectPath);
        const projectName = (profile as any).config?.project;
        if (projectName && adoClient) {
          const teams = await adoClient.getTeams(projectName);
          sources.push({
            provider: 'ado',
            teams: teams.map(t => ({
              id: t.id,
              name: t.name,
              description: t.description,
              url: t.url,
              projectId: projectName
            }))
          });
          log(`  Fetched ${teams.length} teams from ADO project: ${projectName}`);
        }
      } catch (err: any) {
        log(`  Failed to fetch ADO teams: ${err.message}`);
      }
    }

    // JIRA Teams API (organization-level, requires orgId)
    // Note: JIRA Teams API is org-level, not project-level
    // Implementation deferred - requires orgId configuration
  }

  return sources;
}

// Update team doc template to include external links
const content = [
  `# ${team.name}`,
  '',
  team.description,
  '',
  ...(team.externalUrl ? [
    '## External Links',
    '',
    `- [View in ${team.externalProvider}](${team.externalUrl})`,
    ''
  ] : []),
  // ... rest of sections
].join('\n');
```

**Files**:
- `src/core/living-docs/intelligent-analyzer/organization-synthesizer.ts`
- `src/core/living-docs/intelligent-analyzer/types.ts` (add externalUrl, externalProvider)

**Tests**:
| Test ID | Description | Expected |
|---------|-------------|----------|
| T009-01 | ADO teams fetched when ADO profile configured | Teams array populated |
| T009-02 | External URL included in team markdown | Contains external link |
| T009-03 | Graceful fallback when ADO auth fails | LLM clustering used |

---

## Summary

| Task | User Story | ACs Covered | Status |
|------|------------|-------------|--------|
| T-001 | US-001 | AC-US1-02, AC-US1-03 | [x] completed |
| T-002 | US-001 | AC-US1-01, AC-US1-04 | [x] completed |
| T-003 | US-002 | AC-US2-01 to AC-US2-05 | [x] completed |
| T-004 | US-002 | AC-US2-06 | [x] completed |
| T-005 | US-003 | AC-US3-01 to AC-US3-03, AC-US3-05 | [x] completed |
| T-006 | US-003 | AC-US3-01 to AC-US3-04 | [x] completed |
| T-007 | US-003 | AC-US3-01 to AC-US3-04 | [x] completed |
| T-008 | US-004 | AC-US4-01 to AC-US4-03, AC-US4-07 | [x] completed |
| T-009 | US-004 | AC-US4-04 to AC-US4-06 | [x] completed |

## Task Dependencies

```
T-007 (types) → T-005 (prompt) → T-006 (template)
T-001 (function) → T-002 (integration)
T-003 (function) → T-004 (wiring)
T-007 (types) → T-008 (structure) → T-009 (external teams)
```

Recommended execution order: T-007 → T-001 → T-003 → T-005 → T-002 → T-004 → T-006 → T-008 → T-009
