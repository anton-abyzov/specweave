---
increment: 0123-intelligent-living-docs-content
project: specweave
feature_id: FS-123
title: Intelligent Living Docs Content Generation
type: feature
priority: P1
status: completed
---

# FS-123: Intelligent Living Docs Content Generation

## Problem Statement

After running `living-docs-builder` on large enterprise projects (246 repos, 6,701 ADO work items), the generated documentation lacks meaningful content:

1. **ADRs are named `DETECTED-0001.md` through `DETECTED-XXXX.md`** - Generic sequential names instead of human-readable titles that describe the actual architectural decision

2. **Modules contain only statistics** - Files like `backend-service.md` show file counts and LOC but lack architectural context, purpose, dependencies, or integration points

3. **Teams have minimal descriptions** - Repository lists without explaining team responsibilities, domain expertise, or ownership boundaries

The infrastructure for deep LLM analysis EXISTS (`intelligent-analyzer/`) but output generation templates are too conservative and don't leverage the rich analysis data being collected.

## Goals

- **G1**: ADRs have human-readable names derived from content analysis (e.g., `0001-adopt-feature-based-folder-structure.md`)
- **G2**: Module docs explain architectural role, purpose, dependencies, integration points, and patterns
- **G3**: Team docs include responsibilities, domain expertise, ownership matrix, and technology preferences
- **G4**: Generated content is actionable for onboarding new developers

## Non-Goals

- Changing the analysis pipeline (phases remain the same)
- Adding new LLM calls for analysis (use existing data better)
- Modifying C4 diagram generation (already good)

## User Stories

### US-001: Human-Readable ADR Names
**As a** developer onboarding to a new codebase
**I want** ADRs to have descriptive titles like `0015-use-event-driven-architecture.md`
**So that** I can quickly understand what decisions were made without reading each file

**Acceptance Criteria:**
- [x] **AC-US1-01**: ADR filenames follow format `XXXX-kebab-case-title.md` (not `DETECTED-XXXX.md`)
- [x] **AC-US1-02**: Title is derived from detected pattern context via LLM summarization
- [x] **AC-US1-03**: Title captures the "what" not just the pattern name (e.g., "adopt-cqrs-for-write-operations" not "use-cqrs")
- [x] **AC-US1-04**: Existing DETECTED-* files are not regenerated (only new generations use new format)

### US-002: Rich Module Documentation
**As a** technical lead
**I want** module docs to explain architectural purpose and integration points
**So that** I understand how modules fit together without reading source code

**Acceptance Criteria:**
- [x] **AC-US2-01**: Each module doc has "Purpose" section explaining responsibility
- [x] **AC-US2-02**: Each module doc has "Dependencies" section listing what it imports from
- [x] **AC-US2-03**: Each module doc has "Dependents" section listing what depends on it
- [x] **AC-US2-04**: Each module doc has "Integration Points" section (APIs, events, shared state)
- [x] **AC-US2-05**: Each module doc has "Patterns Used" section with evidence
- [x] **AC-US2-06**: AI insights already collected in `analysis.aiInsights` are written to markdown

### US-003: Comprehensive Team Documentation
**As an** engineering manager
**I want** team docs to define responsibilities and ownership
**So that** I know who to contact for questions and who owns what

**Acceptance Criteria:**
- [x] **AC-US3-01**: Each team doc has "Responsibilities" section with bullet points
- [x] **AC-US3-02**: Each team doc has "Domain Expertise" section listing technical competencies
- [x] **AC-US3-03**: Each team doc has "Technology Stack" section from repo analysis
- [x] **AC-US3-04**: Each team doc has "Integration Boundaries" explaining upstream/downstream dependencies
- [x] **AC-US3-05**: LLM prompt for team clustering requests richer structured output

### US-004: Project/Board-Based Team Organization
**As a** tech lead in an enterprise with ADO/JIRA
**I want** organization folder to mirror the specs project/board structure
**So that** teams are organized by the same structure as our specs, not just by repo prefix

**Acceptance Criteria:**
- [x] **AC-US4-01**: Organization folder structure matches detected structure level (1-level or 2-level)
- [x] **AC-US4-02**: 1-level: `organization/teams/{project}/` with teams grouped by project
- [x] **AC-US4-03**: 2-level: `organization/teams/{project}/{board}/` mirroring specs structure
- [x] **AC-US4-04**: ADO teams are fetched via `getTeams()` API when ADO sync is configured
- [x] **AC-US4-05**: JIRA teams are fetched via Teams API when JIRA sync is configured (if available)
- [x] **AC-US4-06**: Team docs include external tool link (ADO team URL, JIRA team URL)
- [x] **AC-US4-07**: Fallback to LLM-based repo clustering when no external teams available

## Technical Approach

### ADR Naming Enhancement

**File**: `src/core/living-docs/intelligent-analyzer/architecture-generator.ts`

```typescript
// Current (line 184):
id: `DETECTED-${String(adrNum).padStart(4, '0')}`,
title: `Use ${pattern}`,

// Enhanced:
const semanticTitle = await deriveADRTitle(pattern, data.evidence, llmProvider);
id: `${String(adrNum).padStart(4, '0')}-${kebabCase(semanticTitle)}`,
title: semanticTitle,
```

New function `deriveADRTitle()` sends pattern + evidence to LLM with prompt:
```
Given this architectural pattern and evidence, generate a concise decision title (5-8 words) that explains WHAT was decided, not just the pattern name.

Pattern: {pattern}
Evidence: {evidence}

Examples of good titles:
- "Adopt Feature-Based Folder Structure for Scalability"
- "Use Event-Driven Architecture for Async Processing"
- "Implement CQRS for Write-Heavy Operations"

Return ONLY the title, no explanation.
```

### Module Content Enhancement

**File**: `src/core/living-docs/module-analyzer.ts`

Replace `generatePlaceholderSummary()` (line 520) with `generateRichModuleSummary()`:

```typescript
function generateRichModuleSummary(
  module: ModuleInfo,
  analyzedFiles: AnalyzedFile[],
  totalExports: number,
  aiInsights?: AIModuleAnalysis,
  dependencyGraph?: DependencyInfo
): string {
  const sections: string[] = [
    `# ${module.name}`,
    `**Path**: \`${module.path}\``,
    '',
    '## Purpose',
    aiInsights?.purpose || inferPurposeFromName(module.name),
    '',
    '## Overview',
    // ... existing stats ...
    '',
    '## Dependencies',
    formatDependencies(dependencyGraph?.imports),
    '',
    '## Dependents',
    formatDependents(dependencyGraph?.importedBy),
    '',
    '## Integration Points',
    aiInsights?.integrationPoints || 'No external integration points detected.',
    '',
    '## Patterns Used',
    formatPatterns(aiInsights?.patterns),
    '',
    '## Analysis Summary',
    // ... existing stats ...
  ];
  return sections.join('\n');
}
```

### Team Content Enhancement

**File**: `src/core/living-docs/intelligent-analyzer/organization-synthesizer.ts`

1. **Enhance LLM prompt** (line 102-125) to request structured output:

```typescript
const prompt = `Analyze these repositories and cluster them into logical teams.

For each team, provide:
- name: Team name (e.g., "Platform Team", "API Gateway Team")
- description: 2-3 sentence summary
- responsibilities: Array of 3-5 bullet points defining what the team owns
- domainExpertise: Array of technical competencies (e.g., "FHIR integration", "Angular development")
- techStack: Primary technologies used
- repos: List of repositories

Repositories:
${JSON.stringify(repoSummaries, null, 2)}
`;
```

2. **Update output template** (line 163-198):

```typescript
const content = [
  `# ${team.name}`,
  '',
  team.description,
  '',
  '## Responsibilities',
  ...team.responsibilities.map(r => `- ${r}`),
  '',
  '## Domain Expertise',
  ...team.domainExpertise.map(e => `- ${e}`),
  '',
  '## Technology Stack',
  ...team.techStack.map(t => `- ${t}`),
  '',
  '## Repositories',
  ...team.repos.map(r => `- [${r}](../../modules/${r}.md)`),
  '',
  '## Integration Boundaries',
  team.integrationBoundaries || 'TBD',
  '',
  `*Clustering reasoning: ${team.reasoning}*`
].join('\n');
```

### Project/Board-Based Team Organization

**File**: `src/core/living-docs/intelligent-analyzer/organization-synthesizer.ts`

The organization folder should mirror the 1/2 level structure detected by `structure-level-detector.ts`:

**1-Level Structure** (single project or multi-project without boards):
```
.specweave/docs/internal/organization/
├── overview.md
└── teams/
    └── {project}/
        ├── index.md          # Project-level team overview
        ├── {team-name}.md    # Individual team docs
        └── ...
```

**2-Level Structure** (ADO with area paths, JIRA with boards):
```
.specweave/docs/internal/organization/
├── overview.md
└── teams/
    └── {project}/
        └── {board}/
            ├── index.md      # Board-level team overview
            ├── {team-name}.md
            └── ...
```

**External Team Integration:**

1. **ADO Teams** - Use existing `AdoClient.getTeams(project)` API:
```typescript
// ADO returns: { id, name, description, projectId, url }
const adoTeams = await adoClient.getTeams(projectName);
```

2. **JIRA Teams** - Use Atlassian Teams Public API:
```typescript
// GET https://api.atlassian.com/public/teams/v1/org/{orgId}/teams?siteId={siteId}
// Returns: { teams: [{ id, displayName, description }] }
```

**Enhanced Team Doc with External Link:**
```typescript
const content = [
  `# ${team.name}`,
  '',
  team.description,
  '',
  '## External Links',
  '',
  team.adoUrl ? `- [View in Azure DevOps](${team.adoUrl})` : '',
  team.jiraUrl ? `- [View in Jira](${team.jiraUrl})` : '',
  '',
  // ... rest of team sections ...
].join('\n');
```

## Files to Modify

| File | Change |
|------|--------|
| `src/core/living-docs/intelligent-analyzer/architecture-generator.ts` | Add `deriveADRTitle()`, update ADR ID generation |
| `src/core/living-docs/module-analyzer.ts` | Replace `generatePlaceholderSummary()` with `generateRichModuleSummary()` |
| `src/core/living-docs/intelligent-analyzer/organization-synthesizer.ts` | Enhance LLM prompt, add structure level support, add external team fetching |
| `src/core/living-docs/intelligent-analyzer/types.ts` | Add new interfaces for enhanced team structure with external links |
| `src/integrations/jira/jira-teams-client.ts` | NEW: Add JIRA Teams API client |

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Increased LLM token usage | Medium | `deriveADRTitle()` uses small prompts (~100 tokens/ADR) |
| Output format changes break existing workflows | Low | New format is additive, existing fields preserved |
| LLM inconsistent title generation | Medium | Add validation, fallback to pattern name if title too long/generic |

## Success Metrics

- ADR files have descriptive names (manual review of 10 samples)
- Module docs have 5+ sections (Purpose, Dependencies, Dependents, Integration, Patterns)
- Team docs have responsibilities and expertise sections
- New onboarding developers can understand codebase structure in <30 minutes

## Dependencies

- Existing LLM provider infrastructure
- Current intelligent-analyzer pipeline
