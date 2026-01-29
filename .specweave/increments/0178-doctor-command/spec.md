---
increment: 0178-doctor-command
title: "Doctor Command - Comprehensive Health Check"
status: active
---

# Doctor Command

## Overview

Add a `specweave doctor` command that provides comprehensive health diagnostics for SpecWeave projects without modifying anything (read-only).

## User Stories

### US-001: Health Check Command
**As a** SpecWeave user
**I want** to run a single command that checks the health of my project
**So that** I can identify and fix issues before they cause problems

**Acceptance Criteria:**
- [x] AC-US1-01: Command checks environment (Node.js, Git, Claude CLI)
- [x] AC-US1-02: Command checks project structure (.specweave/, increments/)
- [x] AC-US1-03: Command checks configuration (config.json, CLAUDE.md freshness)
- [x] AC-US1-04: Command checks hooks health
- [x] AC-US1-05: Command checks plugins status
- [x] AC-US1-06: Command checks increment integrity
- [x] AC-US1-07: Command checks git status
- [x] AC-US1-08: Command provides fix suggestions
- [x] AC-US1-09: Command supports --json output
- [x] AC-US1-10: Command supports --verbose mode
- [x] AC-US1-11: Command supports --quick mode (skip slow checks)
- [x] AC-US1-12: Command exits with code 1 on failures (CI/CD friendly)
