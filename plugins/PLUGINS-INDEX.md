# SpecWeave Plugins Index

**Purpose**: Lightweight plugin manifest for progressive disclosure. Load plugin content only when triggers match.

**Total Plugins**: 1 | **Total Skills**: 44 | **Total Commands**: 72 | **Last Updated**: 2026-03-17

---

## Progressive Loading Pattern

1. **Scan this index** at session start (~2KB)
2. **Match triggers** to user intent
3. **Load plugin content** only when matched
4. **Savings**: ~95% (index only vs all plugins)

---

## Unified Plugin

| Plugin | Triggers | Skills | Commands | Description |
|--------|----------|--------|----------|-------------|
| **specweave** (sw) | increment, feature, plan, spec, tasks, TDD, PM, architect, brainstorm, debug, team, grill, validate, GitHub, issues, gh, sync to GitHub, PR review, JIRA, Jira, epics, stories, sync to JIRA, Azure DevOps, ADO, work items, Azure boards, documentation, docs site, Docusaurus, preview, build docs, release, version, npm publish, changelog, RC, diagram, Mermaid, C4, architecture diagram, image, video, remotion, generate image, AI video | 44 | 72 | Unified SpecWeave plugin — planning, specs, TDD, living docs, multi-agent teams, code review, GitHub/JIRA/ADO sync, docs generation, release management, diagrams, AI media |

---

## Quick Lookup Table

| User Intent | Skill/Command |
|-------------|---------------|
| "Plan a feature" | `sw:increment` |
| "Sync to GitHub" | `sw:github-sync` |
| "Review PR" | `sw:pr` (pr-review skill) |
| "Sync to JIRA" | `sw:jira-sync` |
| "Sync to Azure DevOps" | `sw:ado-sync` |
| "Create release" | `sw:release-npm` |
| "Generate diagram" | `sw:diagrams-generate` |
| "Generate an image" | image skill |
| "Create video" | video / remotion skill |
| "Preview docs" | `sw:docs-view` |
| "Build docs" | `sw:docs-build` |
| "Import JIRA issues" | `sw:jira-import-projects` |
| "Import ADO work items" | `sw:ado-import-projects` |

---

## Token Efficiency

- **This index**: ~50 lines (~1.5KB)
- **Full plugin loaded**: ~24.6 MB markdown
- **Savings**: ~99.99% by loading on-demand

**Pattern**: Load index → Match triggers → Load only matched plugin content
