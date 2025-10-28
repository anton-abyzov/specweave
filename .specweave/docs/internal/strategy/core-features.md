# Core Features

## 1. Skills System (P1)

**WHAT**: Lightweight AI capabilities that auto-activate based on keywords.

**WHY**: Extend Claude's functionality without separate context windows.

**Requirements**:
- TC-001: Skills auto-activate when description matches user request
- TC-002: Skills installed from `src/skills/` to `.claude/skills/`
- TC-003: Minimum 3 test cases per skill (YAML format)
- TC-004: Selective installation (not all skills loaded)

**Acceptance Criteria**:
- User asks "plan feature" → `increment-planner` activates
- Skills have YAML frontmatter (name, description)
- Test cases validate skill behavior
- Token savings via selective loading

## 2. Context Loading (P1)

**WHAT**: Selective specification loading via manifests (70%+ token reduction).

**WHY**: Loading ALL specs (500+ pages) wastes tokens and slows AI.

**Requirements**:
- TC-010: Context manifests declare needed specs/docs
- TC-011: Loader reads manifest and loads only specified files
- TC-012: Supports section-level loading (`file.md#section`)
- TC-013: Achieves >70% token reduction vs loading everything

**Acceptance Criteria**:
- Manifest format: YAML with `spec_sections`, `documentation`, `max_context_tokens`
- Loader caches loaded context
- Metrics show 70%+ reduction (50k → 15k typical)

## 3. Auto-Role Routing (P1)

**WHAT**: Intelligent routing of requests to appropriate agents/skills (>90% accuracy).

**WHY**: Users shouldn't need to know which agent/skill to use.

**Requirements**:
- TC-020: `specweave-detector` auto-detects SpecWeave projects
- TC-021: `skill-router` parses requests and routes correctly
- TC-022: Routing accuracy >90%
- TC-023: Handles ambiguous requests with clarification

**Acceptance Criteria**:
- User asks "create security review" → routes to `security` agent
- User asks "plan feature" → routes to `increment-planner` skill
- Ambiguous requests trigger `AskUserQuestion`
- Routing accuracy measured and logged

## 4. Increment Structure (P1)

**WHAT**: Auto-numbered increments (0001, 0002, 0003) with WIP limits.

**WHY**: Prevent merge conflicts, enforce focus, maintain clarity.

**Requirements**:
- TC-030: Auto-increment numbering (scan, find max, +1)
- TC-031: WIP limits enforced (2-3 framework, 1-2 solo, 3-5 team)
- TC-032: Lifecycle: backlog → planned → in-progress → completed → closed
- TC-033: Leftover transfer when closing incomplete increments

**Acceptance Criteria**:
- `/create-increment` auto-numbers next available
- WIP limit check before starting new increment
- Status progression tracked in frontmatter
- Leftover tasks transferable to new/existing increments

## 5. Multi-Platform Deployment (P1)

**WHAT**: Adaptive infrastructure generation (local, Hetzner, AWS, Railway, Vercel, etc.).

**WHY**: Different projects have different deployment needs.

**Requirements**:
- TC-040: Progressive disclosure (ask deployment only when relevant)
- TC-041: Cost optimization skill shows price comparison
- TC-042: Infrastructure code adapts to selected platform
- TC-043: Secrets requested only when deploying (not Day 1)

**Acceptance Criteria**:
- User mentions "deploy" → asks deployment questions
- `cost-optimizer` shows Hetzner ($10), Railway ($20), AWS ($65)
- DevOps agent generates Terraform for selected platform
- Secrets (API tokens) requested only before `terraform apply`

## 6. Brownfield Support (P1)

**WHAT**: Regression prevention for modifying existing code.

**WHY**: Most real-world projects are brownfield, not greenfield.

**Requirements**:
- TC-050: `brownfield-analyzer` scans and generates specs from code
- TC-051: Document current behavior before modification
- TC-052: Create tests for existing functionality
- TC-053: `brownfield-onboarder` merges existing CLAUDE.md

**Acceptance Criteria**:
- Analyzer creates specs in `strategy/{module}/existing/`
- Tests validate current behavior (user-reviewed)
- Onboarder extracts content to SpecWeave folders (99%+ distribution)
- Regression prevention workflow enforced

## 7. 4-Level Testing (P1)

**WHAT**: Test cases at 4 levels (Spec, Feature, Skill, Code) with TC-0001 traceability.

**WHY**: Maintain traceability from business requirements to automated tests.

**Requirements**:
- TC-060: Level 1 - Acceptance criteria in specs (TC-0001 format)
- TC-061: Level 2 - Test strategy in `tests.md` (coverage matrix)
- TC-062: Level 3 - Skill test cases (YAML, min 3 per skill)
- TC-063: Level 4 - Code tests (E2E, Unit, Integration)

**Acceptance Criteria**:
- TC IDs (TC-0001) appear at all 4 levels
- Failed test traces back to business requirement
- E2E tests tell truth (no false positives)
- Coverage >80% for critical paths

## Related

- [Product Vision](product-vision.md)
- [Requirements Overview](requirements-overview.md)
