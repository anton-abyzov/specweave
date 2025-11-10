# Brownfield Migration Report

**Source**: notion
**Source Path**: /Users/antonabyzov/Projects/github/specweave/tests/fixtures/e2e-brownfield-import/test-5-1762808686040/source-docs
**Imported**: 2025-11-10T21:04:46.150Z
**Total Files**: 7

## Import Summary

- **Specs**: 2 files → `specs/`
- **Modules**: 1 files → `modules/`
- **Team Docs**: 1 files → `team/`
- **Legacy**: 3 files → `legacy/notion/`

## Classification Analysis

# Brownfield Analysis Summary

**Total Files**: 7

## Classification Results

| Category | Count | Avg Confidence | Percentage |
|----------|-------|----------------|------------|
| Specs    | 2 | 39.4% | 28.6% |
| Modules  | 1 | 32.6% | 14.3% |
| Team     | 1 | 34.1% | 14.3% |
| Legacy   | 3 | N/A | 42.9% |

## Specs (2 files)

- `specs/auth-feature.md` (40%)
  - User Stories: Found 4 indicator(s) (user story, as a, i want)
- `specs/payment-flow.md` (38%)
  - User Stories: Found 3 indicator(s) (user story, as a, i want)

## Modules (1 files)

- `modules/api-client.md` (33%)
  - Components: Found 3 indicator(s) (module, component, service)

## Team Docs (1 files)

- `team/conventions.md` (34%)
  - Conventions: Found 4 indicator(s) (convention, conventions, style guide)

## Legacy (3 files)

Files with no strong classification:

- `misc/meeting-notes.md`
- `misc/random-ideas.md`
- `team/onboarding.md`


## Next Steps

1. **Review imported files** for accuracy
2. **Manually move misclassified files** if needed:
   - Use file manager or git to move files between folders
   - Update references in other docs if needed
3. **Update spec numbers** to follow SpecWeave conventions:
   - Specs should be numbered: `spec-001-feature-name.md`
   - Current files may have different naming
4. **Clean up legacy folder** when migration is complete:
   - Move useful docs to appropriate folders
   - Delete obsolete or duplicate content
5. **Update team docs** to match SpecWeave templates:
   - See `team/README.md` for template guidance

## Migration Notes

### Structure Preservation
📁 Files flattened to destination folders (no subdirectories)

### Confidence Scores

Files were classified with confidence scores (0-100%):
- **70%+**: High confidence (likely correct)
- **50-70%**: Medium confidence (review recommended)
- **30-50%**: Low confidence (likely legacy)
- **<30%**: No match (moved to legacy)

### Common Issues

**Misclassified files?**
- Check confidence scores in analysis above
- Files with low confidence may be in wrong folder
- Manually move files as needed

**Duplicate content?**
- Compare imported files with existing docs
- Merge duplicates or mark for deletion
- Update cross-references

**Outdated information?**
- Review dates and version numbers
- Mark obsolete docs for deletion
- Update references to current systems

## Source Information

- **Type**: notion
- **Source Path**: `/Users/antonabyzov/Projects/github/specweave/tests/fixtures/e2e-brownfield-import/test-5-1762808686040/source-docs`
- **Destination**: `/Users/antonabyzov/Projects/github/specweave/tests/fixtures/e2e-brownfield-import/test-5-1762808686040/.specweave/docs/internal/projects/default/legacy/notion`
- **Project**: default

## Import History

See `.specweave/config.json` → `brownfield.importHistory` for complete import history.

---

**Generated**: 2025-11-10T21:04:46.150Z
**Tool**: SpecWeave Brownfield Importer
