# Glossary

## Test Infrastructure Terms

**Fixture**: Predefined test data stored in JSON/Markdown files for reuse across multiple tests.

**Test Health**: Percentage of tests passing in the test suite.

**Duplication**: When the same test exists in multiple locations (e.g., flat and categorized directories).

**Categorization**: Organizing tests into semantic categories (core, features, external-tools, generators).

**Test Isolation**: Ensuring tests don't affect each other by using isolated temp directories.

**Process.cwd()**: Dangerous pattern that can cause catastrophic deletions if used in test cleanup code.

**TDD**: Test-Driven Development - write tests first, then implementation.

**BDD**: Behavior-Driven Development - write tests in Given-When-Then format.

**Coverage**: Percentage of code executed by tests.

**CI/CD**: Continuous Integration/Continuous Deployment - automated testing and deployment pipeline.
