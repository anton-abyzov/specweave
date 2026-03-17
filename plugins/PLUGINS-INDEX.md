# SpecWeave Plugins Index

**Purpose**: Lightweight plugin manifest for progressive disclosure. Load plugin content only when triggers match.

**Total Plugins**: 8 | **Total Skills**: 44 | **Last Updated**: 2026-03-17

---

## Progressive Loading Pattern

1. **Scan this index** at session start (~3KB)
2. **Match triggers** to user intent
3. **Load plugin content** only when matched
4. **Savings**: ~95% (index only vs all plugins)

---

## Core Plugin

| Plugin | Triggers | Skills | Description |
|--------|----------|--------|-------------|
| **specweave** (sw) | increment, feature, plan, spec, tasks, TDD, PM, architect, brainstorm, debug, team, grill, validate | 28 | Core framework — planning, specs, TDD, living docs, multi-agent teams, code review |

## Integration Plugins

| Plugin | Triggers | Skills | Description |
|--------|----------|--------|-------------|
| **specweave-github** (sw-github) | GitHub, issues, gh, sync to GitHub, PR review | 4 | Bidirectional GitHub Issues sync, PR review |
| **specweave-jira** (sw-jira) | JIRA, Jira, epics, stories, sync to JIRA | 3 | JIRA integration and sync |
| **specweave-ado** (sw-ado) | Azure DevOps, ADO, work items, Azure boards | 4 | Azure DevOps integration |

## Documentation & Release

| Plugin | Triggers | Skills | Description |
|--------|----------|--------|-------------|
| **specweave-docs** (docs) | documentation, docs site, Docusaurus, preview, build docs | 0 (7 commands) | Documentation generation and preview |
| **specweave-release** (sw-release) | release, version, npm publish, changelog, RC | 1 | Release management |

## Specialized Plugins

| Plugin | Triggers | Skills | Description |
|--------|----------|--------|-------------|
| **specweave-diagrams** (sw-diagrams) | diagram, Mermaid, C4, architecture diagram | 1 | Mermaid diagram generation (C4 Model) |
| **specweave-media** (sw-media) | image, video, remotion, generate image, AI video | 3 | AI image (Imagen 4), AI video (Veo 3.1), programmatic video (Remotion) |

---

## Quick Lookup Table

| User Intent | Load Plugin |
|-------------|-------------|
| "Plan a feature" | `specweave` (sw) |
| "Sync to GitHub" | `specweave-github` (sw-github) |
| "Review PR" | `specweave-github` (sw-github) |
| "Sync to JIRA" | `specweave-jira` (sw-jira) |
| "Sync to Azure DevOps" | `specweave-ado` (sw-ado) |
| "Create release" | `specweave-release` (sw-release) |
| "Generate diagram" | `specweave-diagrams` (sw-diagrams) |
| "Generate an image" | `specweave-media` (sw-media) |
| "Create video" | `specweave-media` (sw-media) |
| "Preview docs" | `specweave-docs` (docs) |

---

## Token Efficiency

- **This index**: ~80 lines (~2KB)
- **All plugins loaded**: ~24.6 MB markdown
- **Savings**: ~99.99% by loading on-demand

**Pattern**: Load index → Match triggers → Load only matched plugin content
