# 0006-use-dependency-injection-for-logger-testability: Use Dependency Injection for Logger Testability

**Status**: Detected
**Confidence**: medium

## Context

Found Dependency Injection for Logging pattern in 2 repositories.

## Decision

The team has adopted Dependency Injection for Logging as a standard approach.

## Consequences

- Consistent Dependency Injection for Logging implementation across services
- Team familiarity with the pattern
- Standardization benefits for 2 repositories

## Evidence

- **integrations, testing**: Logger interface with consoleLogger default; setJiraMapperLogger(), setJiraClientLogger() module-level setters; Constructor options: { logger?: Logger }; moduleLogger pattern for testability; moduleLogger pattern with setTestGeneratorLogger()