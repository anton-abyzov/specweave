---
expected_type: team
expected_confidence: high
source: notion
keywords_density: high
---

# Team Coding Conventions

## General Principles

- **Readability over cleverness**: Write code for humans first
- **Consistency**: Follow existing patterns
- **Simplicity**: KISS principle (Keep It Simple, Stupid)
- **YAGNI**: You Aren't Gonna Need It - don't over-engineer
- **DRY**: Don't Repeat Yourself - extract common code

## Code Style

### TypeScript/JavaScript

**File naming**: kebab-case
```
user-service.ts (correct)
UserService.ts (incorrect)
```

**Class naming**: PascalCase
```typescript
class UserService {} // correct
class userService {} // incorrect
```

**Function naming**: camelCase
```typescript
function getUserById() {} // correct
function get_user_by_id() {} // incorrect
```

**Constants**: UPPER_SNAKE_CASE
```typescript
const MAX_RETRY_ATTEMPTS = 3; // correct
const maxRetryAttempts = 3; // incorrect
```

### Formatting

- Indentation: 2 spaces (not tabs)
- Line length: 100 characters max
- Trailing commas: Always
- Semicolons: Required
- Quotes: Single quotes for strings
- Template literals: Use for interpolation

### Commenting

```typescript
// Good: Explain WHY, not WHAT
// Use exponential backoff to avoid overwhelming the API during outages
const delay = baseDelay * Math.pow(2, attempt);

// Bad: Obvious comment
// Multiply baseDelay by 2 to the power of attempt
const delay = baseDelay * Math.pow(2, attempt);
```

## Git Workflow

### Branch Naming

- `feature/add-user-auth` - New features
- `fix/login-bug` - Bug fixes
- `refactor/extract-auth-logic` - Refactoring
- `docs/update-api-guide` - Documentation
- `test/add-user-tests` - Test additions

### Commit Messages

Format: `type(scope): description`

Types:
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `test`: Adding tests
- `docs`: Documentation
- `chore`: Build/tooling changes

Examples:
```
feat(auth): add OAuth2 support
fix(payment): handle timeout errors
refactor(api): extract validation logic
test(user): add edge case tests
docs(readme): update installation steps
```

### Pull Request Guidelines

- Title: Clear, descriptive
- Description: What, why, how
- Screenshots: For UI changes
- Tests: All tests must pass
- Reviews: At least 1 approval required
- Small PRs: <500 lines preferred

## Testing

- Unit test coverage: 90%+ target
- Integration tests: Critical paths
- E2E tests: User workflows
- Test naming: `should_expectedBehavior_when_condition`

Example:
```typescript
test('should_returnUser_when_validIdProvided', () => {
  // Arrange
  const userId = 'valid-id';

  // Act
  const user = getUserById(userId);

  // Assert
  expect(user).toBeDefined();
  expect(user.id).toBe(userId);
});
```

## Code Review Process

### As Author
1. Self-review your changes
2. Ensure tests pass
3. Update documentation
4. Request review from team
5. Address feedback promptly

### As Reviewer
- Review within 24 hours
- Be constructive and kind
- Focus on logic, not style (linter handles that)
- Ask questions if unclear
- Approve when satisfied

## Team Playbook

### Development Workflow
1. Pick task from backlog
2. Create feature branch
3. Implement with TDD
4. Submit PR
5. Address review feedback
6. Merge after approval
7. Monitor deployment

### Definition of Done
- [ ] Code written and tested
- [ ] Unit tests added (90%+ coverage)
- [ ] Integration tests for critical paths
- [ ] Documentation updated
- [ ] Code reviewed and approved
- [ ] Deployed to staging
- [ ] QA verification passed
- [ ] Deployed to production

## Resources

- Prettier config: `.prettierrc`
- ESLint config: `.eslintrc.json`
- TypeScript config: `tsconfig.json`
- Team handbook: Link to handbook

## Questions?

Ask in #engineering Slack channel or ping tech lead.
