# testing

*Analyzed: 2025-12-10 | Confidence: low**

## Purpose

A test code generator that converts YAML test specifications into executable TypeScript integration tests. It supports skill activation testing, API integration testing with real credentials (Jira, ADO, GitHub), and end-to-end workflow tests.

## Key Concepts

- YAML-to-TypeScript test generation
- Test specification DSL
- Integration test scaffolding
- Multi-provider API testing
- Credential-based test execution
- Automated test report generation

## Patterns

- **Code Generation from DSL** (architecture)
- **Test Specification Pattern** (testing)
- **Integration Testing Framework** (testing)
- **Dependency Injection for Logging** (architecture)
- **Test Report Generation** (testing)
- **Convention over Configuration** (structure)

## External Dependencies

- js-yaml (YAML parsing)
- Jira API
- Azure DevOps API
- GitHub API

## Observations

- Uses js-yaml for parsing test specifications from YAML files
- Generated tests include ASCII box-drawing for console output formatting
- Supports conditional imports based on required credentials (jira, ado, github)
- Test methods are auto-numbered and camelCased from spec names
- Handles trailing '---' in YAML files gracefully
- Generated tests save JSON reports with timestamps for CI/CD integration
- String escaping handles single quotes, backslashes, and newlines for safe code generation