---
id: US-007
feature: FS-153
title: "Fix Broken Markdown Links"
status: in_progress
priority: P1
created: 2026-01-04
project: specweave-dev
---

# US-007: Fix Broken Markdown Links

**Feature**: [FS-153](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US7-01**: All broken links identified in build warnings are cataloged (run `npm run build` and capture warnings)
- [x] **AC-US7-02**: Broken links to missing files are fixed by either creating the target file or updating the link to correct path
- [x] **AC-US7-03**: Broken links to external files (plugin READMEs) are fixed by using correct relative paths or removing invalid references
- [x] **AC-US7-04**: Build completes with zero "Markdown link couldn't be resolved" warnings
- [x] **AC-US7-05**: Manual testing confirms all fixed links navigate to correct destinations
- [ ] **AC-US7-06**: docusaurus.config.ts onBrokenMarkdownLinks set to 'warn' or 'throw' to prevent future broken links

---

## Implementation

**Increment**: [0153-documentation-site-seo-enhancements](../../../../increments/0153-documentation-site-seo-enhancements/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
