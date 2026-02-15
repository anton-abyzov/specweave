---
status: abandoned
---
# Skill Fabric — Terminology, Marketplace Foundation & Natural Language UX

## Overview
Rebrand "skill layer" to "Skill Fabric", rewrite README/docs to showcase natural language UX (chat-first, commands under the hood), and build the foundation for a curated skill registry with security-first trust tiers.

## User Stories

### US-001: Developer reading README
As a developer discovering SpecWeave, I want to see that I can just describe what I want in natural language, so I understand the power without memorizing commands.

**Acceptance Criteria:**
- [ ] AC-US1-01: README workflow shows natural language prompting as primary UX
- [ ] AC-US1-02: Slash commands shown as "under the hood" / power-user knowledge
- [ ] AC-US1-03: "Skill Fabric" terminology used consistently across all docs

### US-002: Developer wanting to browse available skills
As a developer, I want to search and browse available skills from the CLI, so I can discover capabilities without reading docs.

**Acceptance Criteria:**
- [ ] AC-US2-01: `specweave fabric search` returns relevant results
- [ ] AC-US2-02: `specweave fabric info` shows detailed skill information
- [ ] AC-US2-03: `specweave fabric list` shows installed skills

### US-003: Skill contributor
As a skill author, I want a clear submission process with security validation, so my skills can be shared safely.

**Acceptance Criteria:**
- [ ] AC-US3-01: Security scanner validates SKILL.md files
- [ ] AC-US3-02: Contributing guide documents PR-based submission process
- [ ] AC-US3-03: Trust tiers (Official/Verified/Community) are documented
