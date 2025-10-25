# SpecWeave Constitution

**Version**: 1.0.0
**Effective Date**: 2025-01-25
**Status**: Active

---

## Preamble

This constitution establishes the governing principles, standards, and constraints for all development within the SpecWeave framework. These principles are immutable and must be upheld across all features, modules, and implementations.

---

## Article I: Source of Truth Principle

**Specifications and documentation are the absolute source of truth.**

### Provisions

1.1. All code is an expression of specifications in a particular language.

1.2. When code and specifications diverge, specifications take precedence.

1.3. Missing documentation is acceptable for brownfield projects, but must be created before modification.

1.4. Living documentation must be automatically updated via hooks after each task completion.

### Enforcement

- Pre-implementation validation ensures specifications exist
- `brownfield-documenter` skill activates when missing docs detected
- Code reviews verify alignment with specifications

---

## Article II: Regression Prevention Imperative

**No code modification without documented current behavior and validated tests.**

### Provisions

2.1. Brownfield modifications require:
- Documentation of existing behavior in `specs/modules/{module}/existing/`
- E2E or unit tests validating current functionality
- User approval of tests before proceeding

2.2. Tests must exist and pass before implementing changes.

2.3. Impact analysis must identify all affected modules.

2.4. Regression risk assessment required for all modifications.

### Enforcement

- `pre-implementation` hook checks for documentation
- Tests must be user-reviewed and approved
- Implementation blocked until checklist complete

---

## Article III: Test-First Development

**Tests must be written, validated, and confirmed to fail before implementation.**

### Provisions

3.1. Every feature requires:
- Minimum 3 test cases for skills
- E2E tests for critical user paths
- Unit tests for complex logic

3.2. Test-Driven Development (TDD) workflow:
- Write tests that fail
- Implement minimum code to pass
- Refactor with tests passing

3.3. Tests must be realistic:
- Real databases, not mocks (where applicable)
- Real service integrations
- Production-like environments

### Enforcement

- Task templates place test tasks before implementation
- Tests must fail initially (red-green-refactor)
- Coverage targets validated at completion

---

## Article IV: Context Precision Principle

**Load only relevant context, never entire specifications.**

### Provisions

4.1. Every feature and issue must have a `context-manifest.yaml`:
```yaml
spec_sections:
  - specs/modules/{relevant-module}/**/*.md
architecture:
  - architecture/{relevant-doc}.md
adrs:
  - adrs/{relevant-decision}.md
max_context_tokens: 10000
```

4.2. Context loading must be selective:
- Use section anchors (e.g., `#authentication-flow`)
- Load shared modules separately
- Cache frequently accessed specs

4.3. No loading of full 500+ page specifications.

### Enforcement

- `context-loader` skill enforces manifests
- Context budget validation pre-execution
- Cache optimization for repeated access

---

## Article V: Modular Scalability

**Structure must scale from solo projects to enterprise systems.**

### Provisions

5.1. Specifications organized by functional modules:
```
specs/modules/
├── payments/
│   ├── overview.md
│   ├── stripe/
│   ├── paypal/
│   └── shared/
```

5.2. Shared concepts in dedicated folders:
- `shared/` for common models
- `overview.md` for module introduction
- Nested submodules for integrations

5.3. Features auto-numbered to prevent conflicts:
- Format: `###-short-name` (e.g., `001-context-loader`)
- Auto-increment based on existing features
- Unique identifiers across team

### Enforcement

- `feature-planner` skill enforces structure
- Auto-numbering prevents manual conflicts
- Validation scripts check structure compliance

---

## Article VI: Separation of Concerns

**Specifications, architecture, decisions, and plans are distinct artifacts.**

### Provisions

6.1. **Specifications** (`specs/`): WHAT and WHY
- Business requirements
- User stories with priorities (P1/P2/P3)
- Acceptance criteria
- Technology-agnostic

6.2. **Architecture** (`architecture/`): HOW
- System design
- Technical implementation
- Data models, API contracts
- Technology-specific

6.3. **ADRs** (`adrs/`): WHY (decisions)
- Architecture Decision Records
- Decision context and rationale
- Consequences and trade-offs
- Indexed in `adrs/index.md`

6.4. **Features** (`features/`): Implementation plans
- `spec.md`: Feature WHAT/WHY
- `plan.md`: Implementation HOW
- `tasks.md`: Executable steps
- `tests.md`: Validation strategy

### Enforcement

- Template validation ensures correct placement
- Cross-artifact consistency checks
- `spec-validator` skill enforces structure

---

## Article VII: Auto-Role Routing

**Skills must auto-detect required expertise and route appropriately.**

### Provisions

7.1. No manual `@role` selection required.

7.2. `skill-router` analyzes intent and routes to:
- `spec-author` for specification creation
- `architect` for system design
- `feature-planner` for implementation planning
- `developer` for coding
- `qa-engineer` for testing

7.3. Routing accuracy target: >90%

### Enforcement

- `skill-router` activated on all user requests
- Routing decisions logged and validated
- Feedback loop improves routing over time

---

## Article VIII: Living Documentation

**Documentation evolves with code through automated hooks.**

### Provisions

8.1. Claude hooks auto-update documentation:
- `post-task-completion` → update docs
- `pre-implementation` → check regression risk
- `human-input-required` → notify and log

8.2. Documentation types:
- **Getting Started**: Installation, quickstart (auto-updated)
- **Guides**: How-to, best practices (manual + auto)
- **Reference**: API, CLI, config (auto-updated)
- **Architecture**: System overview (manual)
- **Changelog**: Monthly updates (auto-updated)

8.3. Manual documentation preserved:
- User-written tutorials protected
- Only structured docs auto-updated

### Enforcement

- `docs-updater` skill manages automation
- Hooks trigger on task completion
- Validation ensures no manual docs overwritten

---

## Article IX: Skill Testing Mandate

**Every skill must have minimum 3 validated test cases.**

### Provisions

9.1. Skill structure requirements:
```
.claude/skills/skill-name/
├── SKILL.md
├── scripts/
├── test-cases/
│   ├── test-1-basic.yaml
│   ├── test-2-edge-case.yaml
│   └── test-3-integration.yaml
└── test-results/  (gitignored)
```

9.2. Test case format:
```yaml
name: "Test description"
input:
  prompt: "User prompt"
  files: []
expected_output:
  type: "file_generated" | "response"
  contains: ["Expected content"]
validation:
  - "File exists"
  - "Contains required sections"
```

9.3. Test results stored in `test-results/` (gitignored).

### Enforcement

- `test-validator` skill runs tests
- CI/CD validates all skills before merge
- Test coverage tracked and reported

---

## Article X: Enterprise Readiness

**Support solo developers and 100+ person teams equally.**

### Provisions

10.1. Multi-team support:
- Separate contexts per team
- Shared specs in common modules
- Team-specific configurations

10.2. Compliance tracking:
- SOC2, HIPAA, GDPR requirements in specs
- Audit trails for modifications
- Access control for sensitive specs

10.3. Dependency mapping:
- Feature dependencies tracked
- Service dependencies documented
- Impact analysis for changes

### Enforcement

- Enterprise features in separate modules
- Compliance checklist in templates
- Dependency graphs auto-generated

---

## Article XI: Brownfield Excellence

**Existing codebases are first-class citizens.**

### Provisions

11.1. Brownfield workflow:
- Analyze existing code
- Generate retroactive specs
- Create ADRs for existing decisions
- Document before modifying

11.2. Codebase analysis tools:
- `codebase-analyzer` skill
- Extract data models from code
- Identify API contracts
- Map dependencies

11.3. Regression prevention:
- Tests for current behavior
- User validation required
- Impact analysis mandatory

### Enforcement

- Pre-modification hooks check docs
- `brownfield-documenter` activates automatically
- Regression checklist required

---

## Article XII: Infrastructure as Code

**All infrastructure provisioned through code, documented in specs.**

### Provisions

12.1. IaC tools supported:
- Terraform
- Pulumi
- CloudFormation
- Kubernetes manifests

12.2. Infrastructure specs required:
- Resource definitions in `architecture/deployment/`
- Scaling strategies documented
- Security configurations specified

12.3. IaC implementation:
- Specs → IaC code via `iac-provisioner` skill
- Version controlled
- Reviewed and approved

### Enforcement

- IaC skills validate against specs
- Infrastructure tests required
- Deployment checklists mandatory

---

## Article XIII: Cross-Platform Support

**SpecWeave works on macOS, Windows, and Linux without modification.**

### Provisions

13.1. Installation methods:
- macOS: Homebrew
- Windows: Chocolatey/Scoop
- Linux: apt/yum
- Universal: npm global install

13.2. Script compatibility:
- Bash scripts for macOS/Linux
- PowerShell equivalents for Windows
- `platform-detector` skill adapts paths

13.3. Path handling:
- Use cross-platform path libraries
- No hardcoded `/` or `\` separators
- Environment-specific configurations

### Enforcement

- CI/CD tests on all platforms
- Platform detection automatic
- Installation scripts validated

---

## Article XIV: Feedback Loop Integration

**Human-in-the-loop validation at critical decision points.**

### Provisions

14.1. Feedback collection points:
- After feature planning
- Before brownfield modifications
- After test creation
- Before deployment

14.2. Feedback storage:
- `.specweave/feedback/` directory
- Timestamped entries
- Categorized by feature

14.3. Learning from feedback:
- Pattern analysis
- Skill improvements
- Process refinement

### Enforcement

- `feedback-skill` prompts for input
- Hooks trigger at critical points
- Feedback reviewed monthly

---

## Amendment Process

### Proposing Amendments

1. Create ADR in `adrs/###-constitution-amendment.md`
2. Document rationale and impact
3. Seek stakeholder approval
4. Update constitution version (MAJOR bump)

### Approval Requirements

- Solo projects: Developer approval
- Team projects: Majority vote
- Enterprise: Architecture board approval

### Version History

- v1.0.0 (2025-01-25): Initial constitution

---

## Enforcement and Compliance

### Automated Checks

- Pre-commit hooks validate structure
- CI/CD enforces test requirements
- Skills enforce principles automatically

### Manual Reviews

- Feature approvals check constitutional compliance
- Quarterly constitution audits
- Process improvement cycles

### Violation Handling

- Automated: Block non-compliant actions
- Manual: Review and correction required
- Repeated violations: Process training

---

## Conclusion

This constitution establishes SpecWeave as an **Intent-Driven Development** framework where specifications are the source of truth, regression is prevented through documentation and tests, and development scales from solo projects to enterprise systems with confidence and clarity.

All contributors, whether human or AI, must uphold these principles to ensure SpecWeave delivers on its promise of replacing vibe coding with precision, validation, and scalability.

**Ratified**: 2025-01-25
**Effective**: Immediately
**Review Cycle**: Quarterly
