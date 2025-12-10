# 0003-use-plugin-architecture-for-external-integrations: Use Plugin Architecture for External Integrations

**Status**: Detected
**Confidence**: medium

## Context

Found Plugin Architecture pattern in 2 repositories.

## Decision

The team has adopted Plugin Architecture as a standard approach.

## Consequences

- Consistent Plugin Architecture implementation across services
- Team familiarity with the pattern
- Standardization benefits for 2 repositories

## Evidence

- **core, cli**: plugins/ directory with specweave-github, specweave-jira, specweave-ado; Plugin manifest system; Claude Code .claude-plugin integration; plugins/specweave-github/; plugins/specweave-jira/