---
id: US-001
feature: FS-160
title: "Plugin Cache Metadata System"
status: not_started
priority: P0
created: 2026-01-07
project: specweave-dev
---

# US-001: Plugin Cache Metadata System

**Feature**: [FS-160](./FEATURE.md)

---

## Acceptance Criteria

- [ ] **AC-US1-01**: `.cache-metadata.json` file created in each plugin version directory
- [ ] **AC-US1-02**: Metadata includes: pluginName, version, commitSha, lastUpdated, checksums (file -> SHA256)
- [ ] **AC-US1-03**: `readMetadata()` function reads and parses metadata
- [ ] **AC-US1-04**: `writeMetadata()` function writes metadata with validation
- [ ] **AC-US1-05**: `getPluginCachePath()` resolves plugin cache location from `~/.claude/plugins/cache/`

---

## Implementation

**Increment**: [0160-plugin-cache-health-monitoring](../../../../increments/0160-plugin-cache-health-monitoring/spec.md)

**Tasks**: See increment tasks.md for implementation details.


## Tasks

_No tasks defined for this user story_
