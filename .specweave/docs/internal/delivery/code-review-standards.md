# Code Review Standards

**Purpose**: Define guidelines for effective, consistent, and constructive code reviews.

**Last Updated**: 2025-11-04
**Owner**: Engineering Team

---

## Core Principles

1. **Be kind, be constructive** - Focus on the code, not the person
2. **Assume good intent** - Developer tried their best with available knowledge
3. **Ask questions** - "Why did you choose X?" not "This is wrong"
4. **Explain your suggestions** - Share reasoning, not just opinions
5. **Approve with minor comments** - Don't block for style nits (use linters)

**Remember**: Code review is about collaboration, not gatekeeping.

---

## Review Checklist

### 1. Functionality
- [ ] Code does what the PR description says
- [ ] Edge cases handled (null, empty, large inputs)
- [ ] Error handling present (try/catch, validation)
- [ ] No obvious bugs or logic errors

### 2. Tests
- [ ] New features have tests (unit + integration)
- [ ] Tests actually test the feature (no fake tests)
- [ ] Edge cases covered in tests
- [ ] Tests pass locally and in CI/CD

### 3. Code Quality
- [ ] Readable variable/function names
- [ ] Functions small and focused (< 50 lines ideal)
- [ ] No code duplication (DRY principle)
- [ ] Comments explain "why", not "what"
- [ ] No dead code or commented-out code

### 4. Security
- [ ] No hardcoded secrets (API keys, passwords)
- [ ] Input validation for user data
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (sanitized outputs)
- [ ] Authentication/authorization checks

### 5. Performance
- [ ] No N+1 queries (database)
- [ ] Large datasets paginated
- [ ] Expensive operations cached
- [ ] No unnecessary API calls in loops

### 6. Documentation
- [ ] Increment docs updated (spec.md, tasks.md)
- [ ] API changes documented (public docs)
- [ ] Complex logic has inline comments
- [ ] README updated if setup changes

### 7. Breaking Changes
- [ ] Backwards compatibility considered
- [ ] Migration path documented
- [ ] Deprecated features logged
- [ ] Version bump if needed

---

## Review Process

### 1. Author Responsibilities

**Before Creating PR**:
- ✅ Run tests locally (`npm test`, `npm run test:e2e`)
- ✅ Run linter (`npm run lint`)
- ✅ Self-review diff (catch obvious issues)
- ✅ Update increment docs (if applicable)

**PR Description Template**:
```markdown
## Summary
Brief description of what this PR does.

## Changes
- Added X feature
- Fixed Y bug
- Refactored Z component

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed
- [ ] Tested on [browser/environment]

## Related
- Closes #123
- Increment: 0007-smart-discipline
- RFC: RFC-0007

## Screenshots (if UI changes)
[Add screenshots here]

## Checklist
- [ ] Code follows style guide
- [ ] Tests pass
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

### 2. Reviewer Responsibilities

**SLA**: Respond within **4 hours** (working hours), complete review within **24 hours**

**Review Prioritization**:
1. **P1 (Urgent)**: Hotfixes, blockers - Review within 1 hour
2. **P2 (High)**: Feature work on critical path - Review within 4 hours
3. **P3 (Normal)**: Refactors, improvements - Review within 24 hours
4. **P4 (Low)**: Docs, chores - Review within 48 hours

**Review Steps**:
1. Read PR description and understand context
2. Check CI/CD status (green = ready to review)
3. Review code changes (use checklist above)
4. Test locally if complex (checkout branch, run tests)
5. Leave comments (specific, actionable)
6. Approve or request changes

**Comment Types**:
- 🚨 **Blocking** - Must fix before merge (security, bugs, breaking changes)
- 💡 **Suggestion** - Nice to have, not blocking (style, optimization)
- ❓ **Question** - Need clarification (why this approach?)
- 🎓 **Learning** - Educational comment (sharing knowledge)

**Example Comments**:
```markdown
🚨 Blocking: This function doesn't handle null input, which will cause a crash.

💡 Suggestion: Consider extracting this logic to a separate function for reusability.

❓ Question: Why did you choose a Map here instead of an Array?

🎓 Learning: FYI, there's a built-in function for this: `Array.prototype.flat()`
```

### 3. Approval Process

**Required Approvals**: **1 reviewer** (for most PRs)

**Special Cases**:
- **Architecture changes** (ADR, HLD, LLD) - 2+ reviewers (tech lead + architect)
- **Security changes** (auth, encryption) - 2+ reviewers (include security expert)
- **Breaking changes** (API, schema) - 2+ reviewers (tech lead + product)

**Fast-Track Approval** (use sparingly):
- Hotfixes (critical production fixes)
- Docs-only changes
- Dependency updates (automated, CI/CD green)

---

## Response to Review Comments

**Author Response Time**: Address comments within **4 hours**

**How to Respond**:
1. **Agree and fix**: "Good catch! Fixed in [commit]"
2. **Agree but defer**: "Good idea, but let's do it in a separate PR"
3. **Disagree (with reasoning)**: "I chose X because Y. What do you think?"
4. **Ask for clarification**: "Can you elaborate on what you mean?"

**Don't**:
- ❌ Ignore comments (even if non-blocking)
- ❌ Defensive responses ("It's fine as is")
- ❌ Make changes without replying (reviewer won't know)

**Do**:
- ✅ Reply to every comment (even if just "👍")
- ✅ Mark conversations as resolved
- ✅ Thank reviewer for their time

---

## Code Review Etiquette

### For Reviewers

**Do**:
- ✅ Praise good code ("Nice use of X pattern!")
- ✅ Ask questions ("Why did you choose X?")
- ✅ Suggest alternatives ("What about using Y instead?")
- ✅ Link to docs/examples ("See this pattern: [link]")
- ✅ Approve with minor comments (don't block for nits)

**Don't**:
- ❌ Nitpick style (use linters instead)
- ❌ Rewrite code in comments (pair program instead)
- ❌ Block for personal preferences
- ❌ Make vague comments ("This looks weird")
- ❌ Criticize the person ("You should know better")

**Example (Bad)**:
```markdown
❌ This is wrong. Use a Map.
```

**Example (Good)**:
```markdown
✅ I think a Map might be better here for O(1) lookups instead of O(n). What do you think?
```

### For Authors

**Do**:
- ✅ Respond to all comments
- ✅ Ask for clarification if needed
- ✅ Push back respectfully if you disagree
- ✅ Thank reviewer for their time
- ✅ Mark conversations as resolved

**Don't**:
- ❌ Take criticism personally
- ❌ Ignore comments
- ❌ Make changes without explanation
- ❌ Force push without warning reviewer

---

## Review Anti-Patterns

### 1. Rubber Stamp Reviews
**Problem**: Approving without reading code

**Solution**: Set timer for 5 minutes minimum per PR, use checklist

### 2. Bikeshedding
**Problem**: Endless debate over trivial details (variable names, spacing)

**Solution**: Use linters, defer to style guide, accept author's choice

### 3. Review Pileup
**Problem**: PRs sitting for days without review

**Solution**: Set SLA (4-hour response time), assign reviewers explicitly

### 4. Mega PRs
**Problem**: 1000+ line PRs that are impossible to review

**Solution**: Break into smaller PRs (< 400 lines ideal), use feature flags

### 5. Silent Changes
**Problem**: Author pushes changes without replying to comments

**Solution**: Always reply to comments before pushing new commits

---

## Metrics

**Track These**:
- PR review time (goal: < 24 hours)
- Number of review iterations (goal: < 3)
- PR size (goal: < 400 lines)
- Time to first comment (goal: < 4 hours)

**Dashboard**: [Internal Dashboard Link] (replace with actual link)

---

## Tools

### Code Review Tools
- **GitHub PR Review** - Primary tool
- **GitHub CLI** - `gh pr review`, `gh pr diff`
- **GitLens (VSCode)** - Inline git blame, diff

### Automation
- **Pre-commit Hooks** - Lint, test before commit
- **CI/CD Checks** - Automated tests, linting, security scan
- **Danger.js** - Automated PR comments (PR size, missing tests)

### Linters
- **ESLint** - JavaScript/TypeScript style
- **Prettier** - Code formatting
- **TypeScript** - Type checking

---

## Common Review Scenarios

### Scenario 1: Author Disagrees with Suggestion
**Response**:
```markdown
Reviewer: "Consider using a Map here for better performance."
Author: "I chose an Array because we need to maintain insertion order and iterate frequently. Map lookup isn't needed here."
Reviewer: "Good point! Makes sense. Approving."
```

### Scenario 2: Review Taking Too Long
**Response**:
```markdown
Author: "@reviewer ping - this PR has been open for 3 days. Can you review?"
Reviewer: "Apologies for the delay! Reviewing now."
```

### Scenario 3: Major Architecture Disagreement
**Response**:
```markdown
Author: "I think we should use X approach."
Reviewer: "I have concerns about scalability. Can we discuss this synchronously (call)?"
[Schedule 30-min call to discuss]
```

---

## Related Documentation

- [Branching Strategy](./branch-strategy.md) - Git workflow
- [Coding Standards](../governance/coding-standards.md) - Style guide
- [Testing Strategy](./test-strategy.md) - Test coverage expectations
- [DORA Metrics](./dora-metrics.md) - Lead time for changes

---

## References

- [Google Code Review Guidelines](https://google.github.io/eng-practices/review/) - Industry best practices
- [Code Review Best Practices](https://smartbear.com/learn/code-review/best-practices-for-peer-code-review/) - SmartBear guide
- [How to Review Code](https://www.kevinlondon.com/2015/05/05/code-review-best-practices.html) - Practical tips
