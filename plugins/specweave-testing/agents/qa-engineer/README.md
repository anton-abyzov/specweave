# QA Engineer Agent

## Overview

The QA Engineer agent is a specialized AI agent designed to help with test strategy, test planning, test automation, and comprehensive quality assurance for modern software projects.

## When to Use This Agent

Invoke this agent when you need:

- **Test Strategy**: Design comprehensive testing approaches (unit, integration, E2E)
- **Test Planning**: Break down features into testable scenarios
- **Test Automation**: Set up Playwright, Vitest, Cypress, or other testing frameworks
- **TDD Workflow**: Implement test-driven development practices
- **Quality Gates**: Define coverage thresholds and quality metrics
- **Performance Testing**: Load testing, stress testing, benchmarking
- **Accessibility Testing**: WCAG compliance, a11y automation
- **Security Testing**: Vulnerability scanning, penetration testing
- **CI/CD Integration**: Automated testing in pipelines
- **Test Maintenance**: Refactor flaky tests, improve test reliability

## How to Invoke

Use the Task tool with `subagent_type`:

```typescript
Task({
  subagent_type: "specweave-testing:qa-engineer:qa-engineer",
  prompt: "Design a comprehensive test strategy for a React e-commerce application with Vitest unit tests, Playwright E2E tests, and accessibility testing"
});
```

## Agent Capabilities

### 1. Testing Frameworks

**JavaScript/TypeScript**:
- Vitest for unit and integration testing
- Playwright for cross-browser E2E testing
- Cypress for browser automation
- Testing Library (React, Vue, Angular)
- MSW (Mock Service Worker) for API mocking
- Jest with modern features

**Other Languages**:
- pytest (Python) with fixtures
- JUnit 5 (Java) with Mockito
- RSpec (Ruby) with factories
- Go testing package with testify

**Specialized Testing**:
- Percy/Chromatic for visual regression
- axe-core for accessibility
- k6 for load testing
- OWASP ZAP for security

### 2. Testing Strategies

**Testing Pyramid**:
- Unit Tests (70%): Fast, isolated, single responsibility
- Integration Tests (20%): Module interactions, API contracts
- E2E Tests (10%): Critical user journeys

**Test-Driven Development (TDD)**:
- Red-Green-Refactor cycle
- Behavior-driven naming
- Design through tests
- Refactoring safety net

**Behavior-Driven Development (BDD)**:
- Given-When-Then format
- Cucumber/Gherkin syntax
- Living documentation
- Stakeholder-readable tests

### 3. Test Coverage & Quality

- Code coverage (line, branch, statement, function)
- Mutation testing (Stryker)
- Risk-based prioritization
- Boundary value analysis
- State transition testing
- Quality gates and thresholds

### 4. Test Organization

- AAA pattern (Arrange-Act-Assert)
- Page Object Model (POM) for E2E
- Test fixtures and factories
- Tagging and categorization
- Parallel test execution
- Test data management

### 5. CI/CD Integration

- GitHub Actions workflows
- GitLab CI pipelines
- Pre-commit hooks (Husky)
- Pull request checks
- Automated regression runs
- Test result reporting

## Common Use Cases

### 1. Design Test Strategy

**Prompt**:
```
"Design a test strategy for a Next.js SaaS application with:
- User authentication (OAuth, email/password)
- Real-time dashboard with WebSocket
- Payment processing (Stripe)
- Admin panel with RBAC
- Multi-tenancy support

Target: 80%+ code coverage, < 5 min test execution, zero flaky tests"
```

**What the agent provides**:
- Testing pyramid breakdown
- Framework selection (Vitest, Playwright, etc.)
- Coverage targets per layer
- Test data management strategy
- CI/CD integration plan
- Quality gates definition

### 2. Implement Unit Tests

**Prompt**:
```
"Set up Vitest for a TypeScript React project with:
- Unit tests for custom hooks
- Component tests with Testing Library
- API mocking with MSW
- Coverage thresholds (80%+ lines, 75%+ branches)
- Watch mode for development
- CI integration"
```

**What the agent provides**:
- Vitest configuration
- Test file structure
- Mock setup examples
- Coverage configuration
- CI workflow YAML
- Best practices documentation

### 3. Implement E2E Tests

**Prompt**:
```
"Set up Playwright E2E tests for an e-commerce checkout flow:
- Product search and filtering
- Add to cart
- Checkout with guest and authenticated users
- Payment processing (test mode)
- Order confirmation

Cross-browser testing (Chrome, Firefox, Safari)
Mobile emulation (iPhone, Android)
Visual regression testing
Parallel execution"
```

**What the agent provides**:
- Playwright configuration
- Page Object Model architecture
- Test fixtures for authentication
- API mocking strategies
- Visual regression setup
- Parallelization strategy

### 4. Implement TDD Workflow

**Prompt**:
```
"Guide me through TDD for implementing a shopping cart feature:
- Add item to cart
- Remove item from cart
- Update quantity
- Calculate total with tax
- Apply discount code

Use Vitest, follow red-green-refactor strictly"
```

**What the agent provides**:
- Step-by-step TDD cycle
- Failing test examples (RED)
- Minimal implementation (GREEN)
- Refactoring strategies
- Test-first design patterns
- Best practices checklist

### 5. Accessibility Testing

**Prompt**:
```
"Set up automated accessibility testing for a React application:
- WCAG AA compliance
- axe-core integration in Vitest
- Playwright accessibility assertions
- Keyboard navigation tests
- Screen reader compatibility
- Color contrast validation

Target: Lighthouse accessibility score 95+"
```

**What the agent provides**:
- axe-core setup with Vitest
- Playwright accessibility tests
- Keyboard navigation test examples
- Manual testing checklist
- WCAG compliance guide
- Accessibility audit process

### 6. Performance Testing

**Prompt**:
```
"Set up performance testing for a REST API:
- Load testing (1000 concurrent users)
- Stress testing (find breaking point)
- Soak testing (24 hour sustained load)
- Metrics: p50, p95, p99 response times

Use k6, integrate with CI/CD, track trends"
```

**What the agent provides**:
- k6 test scripts
- Load testing scenarios
- Performance thresholds
- CI integration (GitHub Actions)
- Grafana dashboard setup
- Performance budget definition

## Example Workflows

### Workflow 1: TDD Feature Development

1. **Write Failing Test (RED)**: Define expected behavior
2. **Implement Minimally (GREEN)**: Make test pass
3. **Refactor**: Improve code quality
4. **Repeat**: Next requirement

### Workflow 2: E2E Test Setup

1. **Install Playwright**: `npm install -D @playwright/test`
2. **Configure**: Browser setup, base URL, screenshots
3. **Create Page Objects**: Reusable page interactions
4. **Write Tests**: Critical user journeys
5. **CI Integration**: Run on every PR
6. **Monitor**: Track flakiness and execution time

### Workflow 3: Quality Audit

1. **Analyze Coverage**: Identify gaps
2. **Review Test Quality**: Flaky tests, slow tests
3. **Refactor**: Improve reliability
4. **Set Thresholds**: Enforce quality gates
5. **Monitor**: Track metrics over time

## Input Format

The agent expects a clear, specific prompt describing:

1. **Context**: What are you testing? What technology stack?
2. **Requirements**: What features need tests?
3. **Quality Targets**: Coverage %, performance, accessibility
4. **Constraints**: Team size, timeline, CI/CD platform

**Good prompt**:
```
"Design test strategy for Node.js REST API with:
- 50+ endpoints (CRUD operations)
- Authentication (JWT)
- Rate limiting
- PostgreSQL database
- Redis caching

Stack: TypeScript, Express, Prisma
Target: 85%+ coverage, < 2 min test execution
CI: GitHub Actions
Team: 5 developers, all familiar with Jest"
```

**Poor prompt**:
```
"Need tests for my API"
```

## Output Format

The agent provides:

1. **Test Strategy**: High-level approach and distribution
2. **Framework Setup**: Configuration files and installation
3. **Test Examples**: Code samples for each test type
4. **Best Practices**: Patterns and anti-patterns
5. **CI/CD Integration**: Workflow files
6. **Quality Metrics**: Coverage targets, thresholds
7. **Documentation**: Testing guidelines for team

## Best Practices

### 1. Test Behavior, Not Implementation
Focus on what code does, not how it does it.

### 2. Independent Tests
No shared state between tests.

### 3. Fast Feedback
Unit tests should run in seconds.

### 4. Readable Tests
Self-documenting test names and structure.

### 5. Maintainable Tests
Page Object Model, fixtures, utilities.

### 6. Realistic Tests
Test against production-like environment.

### 7. Coverage Targets
80%+ code coverage, 100% critical paths.

### 8. Flakiness Zero Tolerance
Fix or quarantine flaky tests immediately.

## Integration with SpecWeave

### Use with /sw:increment

When planning a feature increment:

```bash
# 1. Plan increment
/sw:increment "Implement user authentication with OAuth"

# 2. Generate test strategy
Task({
  subagent_type: "specweave-testing:qa-engineer:qa-engineer",
  prompt: "Design test strategy for OAuth authentication with Google, GitHub, and email/password. Include unit tests for auth logic, integration tests for OAuth flow, and E2E tests for complete user journey."
});

# 3. Implement with TDD
/sw:do
```

### Use with /sw:qa

After implementation, validate test coverage:

```bash
# Run quality assessment
/sw:qa 0123

# Agent checks:
# - Test coverage (lines, branches, functions)
# - Test quality (independent, fast, readable)
# - Critical path coverage
# - E2E test completeness
# - Accessibility test coverage
```

## Troubleshooting

### Issue: Flaky tests

**Solution**:
- Use proper wait strategies (no hardcoded delays)
- Isolate test data
- Mock external dependencies
- Use fake timers for time-based code

### Issue: Slow tests

**Solution**:
- Mock expensive operations (DB, API, file I/O)
- Use fake timers
- Run tests in parallel
- Profile slow tests

### Issue: Low coverage

**Solution**:
- Identify untested paths
- Add tests for edge cases
- Test error handling
- Use mutation testing to find weak tests

## Advanced Usage

### Contract Testing

```typescript
Task({
  subagent_type: "specweave-testing:qa-engineer:qa-engineer",
  prompt: `Set up Pact contract testing between:
    - Frontend (React SPA)
    - Backend API (Node.js)
    - Third-party payment API (Stripe)

    Ensure API compatibility across teams`
});
```

### Visual Regression Testing

```typescript
Task({
  subagent_type: "specweave-testing:qa-engineer:qa-engineer",
  prompt: `Set up visual regression testing with Percy for:
    - 20+ pages across 3 breakpoints (mobile, tablet, desktop)
    - 5+ themes (light, dark, high-contrast)
    - Component library (Storybook integration)

    CI integration, baseline management`
});
```

## Resources

- **Vitest Docs**: https://vitest.dev
- **Playwright Docs**: https://playwright.dev
- **Testing Library**: https://testing-library.com
- **TDD Guide**: https://martinfowler.com/bliki/TestDrivenDevelopment.html
- **Testing Best Practices**: https://testingjavascript.com

## Version History

- **v1.0.0** (2025-01-22): Initial release with Vitest, Playwright, TDD expertise
- **v1.1.0** (TBD): Add mobile testing support (Appium, Detox)
- **v1.2.0** (TBD): Add chaos engineering guidance

## Support

For issues or questions:
- GitHub Issues: https://github.com/anton-abyzov/specweave/issues
- Discord: https://discord.gg/specweave
- Documentation: https://spec-weave.com
