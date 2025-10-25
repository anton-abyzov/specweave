# SpecWeave Principles

**Version**: 1.0.0
**Last Updated**: 2025-01-25

---

## Overview

SpecWeave is guided by **Intent-Driven Development** principles that emphasize clarity, validation, and scalability. Unlike rigid rules, these are **best practices** that can be configured per project in `.specweave/config.yaml`.

---

## Core Principles

### 1. Specifications as Source of Truth

**Intent**: Documentation and specifications should be the foundation, with code expressing them in a specific language.

**Best Practices**:
- Write specs before code
- Keep specs and code in sync
- When divergence occurs, specs take precedence
- Missing docs for brownfield is acceptable, but document before modifying

**Configuration**:
```yaml
principles:
  enforce_specs_as_truth: true  # Enforce in pre-commit hooks
```

---

### 2. Regression Prevention

**Intent**: Prevent breaking existing functionality when modifying code.

**Best Practices**:
- Document existing behavior before modification
- Create tests for current functionality
- User validates tests before proceeding
- Run regression tests after changes

**For Brownfield Projects**:
1. Analyze existing code
2. Generate specs from implementation
3. Create E2E tests for critical paths
4. Get user approval
5. Implement changes safely

**Configuration**:
```yaml
principles:
  require_regression_tests: true
  brownfield_check: true
```

---

### 3. Test-First Development

**Intent**: Write tests before implementation to ensure correctness and prevent bugs.

**Best Practices**:
- Write test, see it fail (red)
- Implement minimum code to pass (green)
- Refactor with tests passing (refactor)
- Use real environments, not mocks (where feasible)

**Exceptions**:
- Prototyping/exploration (document as technical debt)
- Trivial getters/setters
- UI styling (use visual regression tests instead)

**Configuration**:
```yaml
principles:
  test_first_development: true
  min_coverage: 80  # Adjustable per project
```

---

###  4. Context Precision

**Intent**: Load only relevant specifications and documentation, not entire 500-page documents.

**Best Practices**:
- Every feature/issue has a `context-manifest.yaml`
- Use section anchors (e.g., `#authentication-flow`)
- Set token budgets to prevent bloat
- Cache frequently accessed specs

**Benefits**:
- 70%+ token reduction
- Faster AI response times
- Scalable to enterprise documentation
- Better focus on relevant context

**Configuration**:
```yaml
principles:
  context_precision: true
  max_context_tokens: 10000  # Per operation
  cache_enabled: true
```

---

### 5. Modular Scalability

**Intent**: Structure that scales from solo projects to 100+ developer teams without reorganization.

**Best Practices**:
- Organize specs by functional modules
- Use nested folders for submodules
- Auto-number features to prevent conflicts
- Shared concepts in dedicated folders

**Example**:
```
specs/modules/
├── payments/
│   ├── overview.md
│   ├── stripe/
│   └── shared/
```

**Configuration**:
```yaml
principles:
  modular_structure: true
  auto_number_features: true
```

---

### 6. Separation of Concerns

**Intent**: Keep different types of documentation separate for clarity.

**Best Practices**:
- **specs/**: WHAT and WHY (business requirements)
- **architecture/**: HOW (system design)
- **docs/decisions/**: WHY (architecture decisions)
- **features/**: Implementation plans

**Anti-patterns**:
- Mixing ADRs with user stories
- Technical details in specs
- Business requirements in architecture

---

### 7. Auto-Role Routing

**Intent**: Skills should automatically detect required expertise without manual `@role` selection.

**Best Practices**:
- `specweave-detector` skill activates automatically
- User intent is parsed and routed
- Multiple skills orchestrated for complex tasks
- Fallback to `skill-router` for ambiguous requests

**User Experience**:
```
User: "I want to add Stripe payments"
↓
SpecWeave: (auto-routes to feature-planner, then architect, then developer)
```

**Configuration**:
```yaml
principles:
  auto_role_routing: true
  routing_accuracy_target: 0.90
```

---

### 8. Living Documentation

**Intent**: Documentation evolves with code through automated updates.

**Best Practices**:
- Claude hooks auto-update docs after task completion
- Manual documentation is preserved
- API/CLI reference auto-generated
- Changelog updated automatically

**Auto-Updated**:
- CLI command reference
- API documentation
- Configuration options
- Changelogs

**Manual (Preserved)**:
- Guides and tutorials
- Architecture overviews
- Principles and philosophy

**Configuration**:
```yaml
principles:
  living_docs: true
  auto_update_docs: true
  preserve_manual_content: true
```

---

### 9. Skill Testing Mandate

**Intent**: Every skill must be validated through tests to ensure quality.

**Best Practices**:
- Minimum 3 test cases per skill
- Tests in `test-cases/` directory
- Results in `test-results/` (gitignored)
- Tests cover: basic, edge cases, integration

**Test Case Format**:
```yaml
name: "Test name"
input:
  prompt: "..."
expected_output:
  type: "files_generated"
validation:
  - "Files exist"
```

**Configuration**:
```yaml
principles:
  require_skill_tests: true
  min_tests_per_skill: 3
```

---

### 10. Enterprise Readiness

**Intent**: Support solo developers and large teams equally.

**Best Practices**:
- Multi-team support with separate contexts
- Compliance tracking (SOC2, HIPAA, GDPR)
- Dependency mapping
- Access control for sensitive specs

**Enterprise Features** (Optional):
```yaml
principles:
  enterprise:
    enabled: false
    multi_team: false
    compliance_tracking: false
```

---

### 11. Brownfield Excellence

**Intent**: Existing codebases are first-class citizens.

**Best Practices**:
- Analyze code before documenting
- Generate retroactive specs
- Create ADRs for existing decisions
- Document before modifying

**Brownfield Workflow**:
1. Run `specweave analyze src/`
2. Generate specs from code
3. Create current-state tests
4. Get user validation
5. Proceed with modifications

**Configuration**:
```yaml
principles:
  brownfield_support: true
  auto_generate_specs: true
```

---

### 12. Infrastructure as Code

**Intent**: All infrastructure provisioned through code, documented in specs.

**Best Practices**:
- Infrastructure specs in `architecture/deployment/`
- IaC code generated from specs (Terraform, Pulumi, CloudFormation)
- Version controlled
- Reviewed and approved

**Supported Tools**:
- Terraform
- Pulumi
- AWS CloudFormation
- Kubernetes manifests

**Configuration**:
```yaml
principles:
  iac_required: true
  iac_tools: ["terraform", "pulumi"]
```

---

### 13. Cross-Platform Support

**Intent**: SpecWeave works on macOS, Windows, and Linux without modification.

**Best Practices**:
- Platform-agnostic paths
- Dual scripts (Bash + PowerShell)
- Auto-detect platform
- Consistent installation across platforms

**Installation**:
- macOS: Homebrew
- Windows: Chocolatey/Scoop
- Linux: apt/yum
- Universal: npm

---

### 14. Feedback Loop Integration

**Intent**: Human validation at critical decision points.

**Best Practices**:
- Prompt for feedback after feature planning
- Require approval before brownfield modifications
- Validate tests before implementation
- Review deployment plans

**Feedback Points**:
- After spec creation
- Before brownfield changes
- After test generation
- Before deployment

**Configuration**:
```yaml
principles:
  feedback_loops: true
  require_approval: ["brownfield_changes", "deployments"]
```

---

## Customization

### Project-Specific Principles

Add your own principles in `.specweave/config.yaml`:

```yaml
principles:
  # Core principles (true/false to enable/disable)
  enforce_specs_as_truth: true
  test_first_development: true
  context_precision: true
  # ... (all principles configurable)

  # Custom principles for your project
  custom_principles:
    - "All APIs must have OpenAPI 3.0 specifications"
    - "No direct database queries in controllers (use repositories)"
    - "All user-facing text must be i18n-ready"
    - "Security review required for auth/payment features"
```

### Enforcement Levels

Configure how strictly principles are enforced:

```yaml
principles:
  enforcement:
    level: "strict"  # strict | moderate | relaxed

    # What happens on violation
    on_violation: "block"  # block | warn | log

    # Exceptions
    exceptions:
      - principle: "test_first_development"
        reason: "Exploratory prototyping"
        expires: "2025-02-01"
```

---

## Principle Evolution

### Proposing Changes

1. Create ADR in `docs/decisions/###-principle-change.md`
2. Document rationale and impact
3. Seek team approval (if applicable)
4. Update principles version (MAJOR bump if breaking)

### Version History

- **v1.0.0** (2025-01-25): Initial principles (moved from constitution)

---

## Principles vs. Rules

**Principles are guidelines, not immutable laws.**

- ✅ Adaptable to project context
- ✅ Configurable enforcement
- ✅ Can have exceptions with justification
- ✅ Evolve based on feedback

**Unlike rigid "constitution"**:
- ❌ Not "Articles" with legal language
- ❌ Not all-or-nothing
- ❌ Not conflicting with agent flexibility

---

## Enforcement Mechanisms

### Automated

- Pre-commit hooks validate structure
- CI/CD checks test coverage and documentation
- Skills enforce principles automatically (e.g., context-loader enforces context precision)

### Manual

- Code reviews check principle alignment
- Architecture reviews for major decisions
- Periodic audits for compliance

### Reporting

```bash
# Check principle compliance
specweave validate --principles

# Output:
# ✅ Specs as Source of Truth: PASS
# ✅ Test Coverage: PASS (85%)
# ⚠️  Context Precision: WARNING (15k tokens used, budget 10k)
# ❌ Brownfield Documentation: FAIL (missing docs for src/payments/)
```

---

## Summary

SpecWeave principles guide **Intent-Driven Development** through:

1. **Flexibility**: Configure per project
2. **Clarity**: Clear best practices without rigidity
3. **Validation**: Automated enforcement where helpful
4. **Evolution**: Principles adapt based on feedback

Unlike a "constitution", these are **living guidelines** that make SpecWeave adaptable to any project, from solo to enterprise.

---

**Remember**: Principles serve you, not the other way around. Adjust to fit your context.
