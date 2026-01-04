# Broken Markdown Links Catalog

**Generated**: 2026-01-04
**Build Output Analysis**: docs-site build warnings

## Summary

Total broken links identified: 30+

## Categories

### 1. Missing Integration/Feature Documents
Links to planning documents that don't exist:
- `./multi-project-sync.md` (in scheduling-and-planning.md)
- `./cicd-integration.md` (in multiple enterprise docs)
- `./sprint-planning.md` (in jira-migration.md)
- `./spec-task-mapping.md`, `./living-docs-sync.md`, `./external-tool-integration.md` (in spec-commit-sync.md)

**Fix Strategy**: Create placeholder documents or remove links

### 2. Missing Architectural Documents
Links to design documents:
- `./REVISED-ORGANIZATION-STRATEGY.md`
- `./V2-BROWNFIELD-FIRST.md`
- `./COMPLETE-ARCHITECTURE.md`
- `./FINAL-DECISION.md`
(in specs-organization-guide.md)

**Fix Strategy**: Create stub documents or remove references

### 3. Plugin README References
External plugin documentation:
- `../../../plugins/sw-github/README.md`
- `../../../plugins/sw-jira/README.md`
- `../../../plugins/sw-ado/README.md`

**Fix Strategy**: Update paths or link to GitHub instead

### 4. Glossary Term Cross-References
- `user-story.md` (in copied-acs-and-tasks.md, project-specific-tasks.md)

**Fix Strategy**: Create glossary term files or use proper relative paths

### 5. Internal/API Documentation
- `../internal/architecture/adr/0031-status-sync-architecture.md`
- `../api/status-sync-api.md`
- `../../../increments/0003-intelligent-model-selection/reports/TEST-AWARE-PLANNING.md`

**Fix Strategy**: These reference internal SpecWeave project files - update paths to correct locations

### 6. Root-Level Documents
- `../../../README.md` (in react-native-setup-guide.md)
- `../../CLAUDE.md` (in hierarchy-mapping.md)

**Fix Strategy**: Update relative paths from docs-site/docs/ to project root

## Priority Fixes

**P1 - Critical (user-facing)**:
1. Plugin README links → Update to correct paths or GitHub URLs
2. Glossary cross-references → Create term files

**P2 - Important (documentation completeness)**:
3. Missing feature docs → Create stubs with "Coming soon"
4. Root-level doc links → Fix relative paths

**P3 - Nice-to-have**:
5. Architectural decision docs → Archive or remove old references

## Recommended Approach

1. **Quick wins**: Remove or comment out links to non-existent design docs
2. **Plugin links**: Update to point to GitHub plugin directories
3. **Glossary**: Create basic term files with cross-references
4. **Stubs**: Create placeholder docs for planned features with "Documentation in progress"
5. **Validation**: Run build after each fix batch to track progress

## Build Configuration

Consider setting `onBrokenMarkdownLinks: 'throw'` in docusaurus.config.ts once all links are fixed to prevent future breakage.
