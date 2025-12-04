---
id: FS-058-specweave
title: "Fix Status Sync Desync Bug + Auto GitHub Sync on Status Change - SpecWeave Implementation"
feature: FS-058
project: specweave
type: feature-context
status: active
---

# Fix Status Sync Desync Bug + Auto GitHub Sync on Status Change

**Feature**: [FS-058](./FEATURE.md)

## Overview

**Problem 1**: `increment-reopener.ts` bypasses `MetadataManager.updateStatus()`, causing spec.md/metadata.json desync when increments are reopened.

## User Stories

See user story files in this directory.
