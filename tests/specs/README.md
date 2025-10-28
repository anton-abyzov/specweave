# Test Specifications

This directory contains test specifications (test plans) for SpecWeave skills.

## Structure

```
tests/specs/
├── jira-sync/
│   ├── test-1.yaml
│   ├── test-2.yaml
│   └── test-3.yaml
├── ado-sync/
│   └── ...
└── skill-name/
    └── test-*.yaml
```

## Test Specification Format

Each YAML file describes a test case:

```yaml
---
name: "Test Name"
description: "What this test validates"
input:
  prompt: "User input or command"
expected_output:
  skill_activated: true
  agent_invoked: "agent-name"
  result: "expected result"
---
```

## Executable Tests

Executable integration tests are in `tests/integration/skill-name/`.
