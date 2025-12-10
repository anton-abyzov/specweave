# 0002-standardize-logger-dependency-injection-pattern: Standardize Logger Dependency Injection Pattern

**Status**: Detected
**Confidence**: medium

## Context

Found Dependency Injection for Logger pattern in 3 repositories.

## Decision

The team has adopted Dependency Injection for Logger as a standard approach.

## Consequences

- Consistent Dependency Injection for Logger implementation across services
- Team familiarity with the pattern
- Standardization benefits for 3 repositories

## Evidence

- **sync, validators, progress**: Logger interface with consoleLogger default; options.logger ?? consoleLogger pattern; Logger passed through constructor options; constructor(options: { logger?: Logger } = {}); this.logger = options.logger ?? consoleLogger