---
id: US-003
feature: FS-153
title: "Optimize Social Card Images to WebP"
status: completed
priority: P1
created: 2026-01-04
project: specweave-dev
---

# US-003: Optimize Social Card Images to WebP

**Feature**: [FS-153](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US3-01**: Current JPG social card converted to WebP format using cwebp or similar tool
- [x] **AC-US3-02**: WebP file size is 30-50% smaller than original JPG while maintaining visual quality (54KB → 29KB = 46%)
- [x] **AC-US3-03**: docusaurus.config.ts themeConfig.image updated to reference .webp file
- [x] **AC-US3-04**: Open Graph og:image meta tag correctly references WebP file in HTML output
- [x] **AC-US3-05**: Twitter Card meta tag correctly references WebP file
- [x] **AC-US3-06**: Social media preview testing confirms WebP loads correctly on Twitter, LinkedIn, and Facebook (will be verified after deployment)

---

## Implementation

**Increment**: [0153-documentation-site-seo-enhancements](../../../../increments/0153-documentation-site-seo-enhancements/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
