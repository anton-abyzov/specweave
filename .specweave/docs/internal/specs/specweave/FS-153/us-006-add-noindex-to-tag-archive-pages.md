---
id: US-006
feature: FS-153
title: "Add Noindex to Tag Archive Pages"
status: in_progress
priority: P1
created: 2026-01-04
project: specweave-dev
---

# US-006: Add Noindex to Tag Archive Pages

**Feature**: [FS-153](./FEATURE.md)

---

## Acceptance Criteria

- [x] **AC-US6-01**: Custom BlogTagsPostsPage component created via swizzling (@theme/BlogTagsPostsPage)
- [x] **AC-US6-02**: Component adds `<meta name="robots" content="noindex, follow" />` to tag archive pages
- [x] **AC-US6-03**: Noindex meta tag renders on all /blog/tags/* pages
- [x] **AC-US6-04**: Original blog posts remain indexed (do NOT have noindex)
- [ ] **AC-US6-05**: Google Search Console confirms tag pages are not indexed after next crawl
- [x] **AC-US6-06**: Blog pagination pages also include noindex to prevent duplicate content

---

## Implementation

**Increment**: [0153-documentation-site-seo-enhancements](../../../../increments/0153-documentation-site-seo-enhancements/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
