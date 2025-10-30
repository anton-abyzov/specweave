---
increment_id: '0003'
increment: 0003-intelligent-model-selection
title: "Intelligent Model Selection - Automatic Cost Optimization"
type: feature
priority: P1
status: planned
created: 2025-10-30
updated: 2025-10-30
dependencies:
  - 0001-core-framework
  - 0002-core-enhancements
tags:
  - cost-optimization
  - ai-models
  - anthropic
  - haiku-4.5
  - sonnet-4.5
estimated_savings: 60-70%
---

# Intelligent Model Selection - Automatic Cost Optimization

## Problem Statement

**Current State**: SpecWeave uses Claude Sonnet 4.5 for all operations, resulting in high costs for simple implementation tasks. Users must manually specify `model: "haiku"` to optimize costs.

**User Pain Points**:
- High AI costs for repetitive implementation work ($0.80 per feature)
- No visibility into where costs are incurred
- Manual model selection requires deep knowledge of capabilities
- No guidance on when to use Haiku vs Sonnet
- Missing opportunity to leverage Anthropic's official cost optimization pattern

**Market Context**: Anthropic officially recommends using **Sonnet 4.5 for planning** and **Haiku 4.5 for execution** (90% performance, 1/3 cost, 2x speed).

## Solution Overview

**Intelligent Model Selection System** - Automatically routes work to the optimal AI model based on task type, achieving 60-70% cost savings while maintaining quality.

### Core Capabilities

1. **Automatic Model Selection**
   - System intelligently chooses Sonnet (planning) vs Haiku (execution)
   - Based on agent type, work phase, and task complexity
   - No user intervention required

2. **Cost Visibility**
   - Real-time cost tracking per increment, agent, and phase
   - Savings calculations vs baseline (all-Sonnet)
   - ROI reporting for AI investments

3. **Multi-Phase Orchestration**
   - Complex tasks auto-split: Sonnet plans → Haiku executes → Sonnet validates
   - Transparent phase transitions
   - Quality gates between phases

4. **User Control**
   - Three modes: Auto (default), Balanced (approval), Manual
   - Override capability for any task
   - Configurable cost policies

## Business Value

### For Individual Developers
- **60-70% cost reduction** on implementation work
- Build more features with same AI budget
- Transparent cost tracking per feature

### For Teams
- Predictable AI costs per sprint
- Cost allocation by feature/team
- ROI metrics for management reporting

### For SpecWeave Project
- **Competitive advantage**: Only framework with automatic cost optimization
- Aligns with Anthropic's official best practices
- Differentiation in crowded AI-tools market

### Market Impact
- Lower barrier to entry (affordable AI-assisted development)
- Enables longer development sessions
- Positions SpecWeave as cost-conscious enterprise solution

## User Stories

### US-001: Automatic Cost Optimization (Core Value)
**As a** SpecWeave user
**I want** the system to automatically use the most cost-effective AI model
**So that** I can build features for 60% less cost without sacrificing quality

**Acceptance Criteria**:
- [ ] System detects planning phase and uses Sonnet 4.5
- [ ] System detects execution phase and uses Haiku 4.5
- [ ] Quality of Haiku-generated code matches Sonnet baseline (90%+ success rate)
- [ ] User sees transparent model selection (logs show which model used)
- [ ] No configuration required (works out of the box)

**Priority**: P1 - Core differentiator

---

### US-002: Cost Visibility & Tracking
**As a** developer
**I want** to see how much each feature costs in AI usage
**So that** I can budget AI spending and optimize expensive operations

**Acceptance Criteria**:
- [ ] Real-time cost display during increment execution
- [ ] Cost report per increment in `.specweave/increments/####/reports/cost-analysis.json`
- [ ] Command `/specweave.costs` shows current and historical costs
- [ ] Cost breakdown by: model, agent, phase, increment
- [ ] Savings calculation vs all-Sonnet baseline

**Priority**: P1 - Essential transparency

---

### US-003: Agent-Level Model Intelligence
**As a** SpecWeave architect
**I want** each agent to declare its optimal model preference
**So that** planning agents use Sonnet and execution agents use Haiku automatically

**Acceptance Criteria**:
- [ ] All 20 agents have `model_preference` field in AGENT.md
- [ ] PM/Architect/Security agents default to Sonnet
- [ ] Frontend/Backend/DevOps agents default to Haiku
- [ ] Diagrams/Docs agents support auto mode (context-dependent)
- [ ] Task tool respects agent preferences unless overridden

**Priority**: P1 - Foundation of system

---

### US-004: Phase Detection
**As a** system
**I want** to detect whether user is planning or executing work
**So that** I can auto-select the appropriate model without user input

**Acceptance Criteria**:
- [ ] Detects planning phase from keywords: "plan", "design", "analyze", "architecture"
- [ ] Detects execution phase from keywords: "implement", "build", "create", "write"
- [ ] Detects review phase from keywords: "review", "validate", "audit", "assess"
- [ ] Slash commands hint at phase: `/specweave.inc` = planning, `/specweave.do` = execution
- [ ] Phase detection logged for transparency

**Priority**: P1 - Smart automation

---

### US-005: Multi-Phase Auto-Split
**As a** user running complex workflows
**I want** the system to automatically split work across models
**So that** I get Sonnet's planning intelligence and Haiku's execution speed

**Acceptance Criteria**:
- [ ] Brownfield-onboarder splits: Sonnet analysis → Haiku migration → Sonnet validation
- [ ] Role-orchestrator uses Sonnet for PM/Architect, Haiku for Frontend/Backend
- [ ] Phase transitions are transparent (user sees "Switching to Haiku for execution")
- [ ] Each phase completes independently (no cross-phase dependencies)
- [ ] Failed phase falls back to Sonnet for debugging

**Priority**: P2 - Advanced optimization

---

### US-006: Cost Dashboard & Reporting
**As a** project manager
**I want** to see AI cost trends and savings over time
**So that** I can justify AI tool investments and optimize spending

**Acceptance Criteria**:
- [ ] `/specweave.costs` command shows summary dashboard
- [ ] Dashboard displays: total spent, savings %, cost per increment
- [ ] Historical trend chart (last 10 increments)
- [ ] Cost comparison: Sonnet-only vs optimized
- [ ] Export to CSV for reporting

**Priority**: P2 - Business reporting

---

### US-007: User Control Modes
**As a** power user
**I want** to control how aggressively the system optimizes costs
**So that** I can balance cost savings with my preferred workflow

**Acceptance Criteria**:
- [ ] `auto` mode: System decides everything (default)
- [ ] `balanced` mode: System asks approval for major model switches
- [ ] `manual` mode: User specifies model per task
- [ ] Configuration in `.specweave/config.yaml`
- [ ] Mode change takes effect immediately (no restart)

**Priority**: P3 - Power user feature

---

### US-008: Cost Policies & Guardrails
**As a** team lead
**I want** to set cost policies for my project
**So that** I can prevent runaway AI spending

**Acceptance Criteria**:
- [ ] Set max cost per increment (warning/block thresholds)
- [ ] Set daily/weekly/monthly budget limits
- [ ] Warning notifications when approaching limits
- [ ] Automatic downgrade to Haiku when nearing budget
- [ ] Override with `--force` flag for critical work

**Priority**: P3 - Enterprise feature

---

## Non-Functional Requirements

### Performance
- **NFR-001**: Model selection decision < 50ms (negligible overhead)
- **NFR-002**: Cost tracking adds < 10ms per operation
- **NFR-003**: Phase detection accuracy > 95%

### Reliability
- **NFR-004**: Haiku execution success rate > 90% (vs Sonnet baseline)
- **NFR-005**: Automatic fallback to Sonnet if Haiku fails repeatedly
- **NFR-006**: Cost data persists across sessions (no data loss)

### Usability
- **NFR-007**: Zero configuration required for basic usage
- **NFR-008**: Clear explanation of model choices in logs
- **NFR-009**: Cost savings visible in real-time

### Compatibility
- **NFR-010**: Backward compatible (existing projects work without changes)
- **NFR-011**: Works with all existing agents and skills
- **NFR-012**: Manual model override always available

## Success Criteria

### Quantitative Metrics
- **60% cost reduction** on implementation-heavy increments
- **90% accuracy** for Haiku vs Sonnet on execution tasks
- **95% phase detection** accuracy
- **0 breaking changes** to existing workflows

### Qualitative Metrics
- Users report significant cost savings
- Positive feedback on cost transparency
- No complaints about degraded quality from Haiku

### Adoption Metrics
- 80% of users keep default (auto mode)
- 50% of users check `/specweave.costs` regularly
- 90% of agents use model_preference field

## Out of Scope (Future Increments)

### Deferred to Later
- ❌ Opus model support (focus on Sonnet/Haiku only)
- ❌ Cost prediction before execution (ML model required)
- ❌ Team-level cost analytics dashboard (web UI)
- ❌ Integration with cloud billing APIs
- ❌ Cost optimization for MCP servers

### Explicitly Not Included
- ❌ Support for non-Anthropic models (OpenAI, etc.)
- ❌ Real-time model switching mid-task
- ❌ A/B testing framework for model comparison
- ❌ Cost-based task prioritization

## Technical Constraints

### Must Maintain
- ✅ Current Task tool API (backward compatible)
- ✅ Manual model override capability
- ✅ All existing agent/skill functionality

### Must Avoid
- ❌ Breaking existing user projects
- ❌ Requiring configuration for basic usage
- ❌ Hidden cost charges (full transparency required)
- ❌ Quality degradation below 90% threshold

## Risk Assessment

### High Risks
1. **Haiku quality insufficient** → Mitigation: Automatic fallback to Sonnet
2. **Phase detection inaccurate** → Mitigation: Explicit logging, user override
3. **Cost tracking overhead** → Mitigation: Async logging, minimal instrumentation

### Medium Risks
1. **User confusion about models** → Mitigation: Clear documentation, transparent logs
2. **Cost savings overpromised** → Mitigation: Conservative estimates (60% vs 70%)

### Low Risks
1. **Agent classification errors** → Mitigation: Easy to update agent preferences
2. **Budget policy too restrictive** → Mitigation: Configurable, default generous

## Dependencies

### Technical Dependencies
- Anthropic Claude API (Haiku 4.5 availability) ✅ Available
- Task tool model parameter support ✅ Exists
- Agent system ✅ Exists
- Config management system ✅ Exists

### Increment Dependencies
- **0001-core-framework**: Agent system, Task tool
- **0002-core-enhancements**: Command system, hooks

### External Dependencies
- None (self-contained feature)

## Rollout Strategy

### Phase 1: Foundation (Week 1)
- Agent model preferences
- Basic phase detection
- Cost tracking infrastructure

### Phase 2: Intelligence (Week 2)
- Advanced phase detection
- Auto-split orchestration
- Cost dashboard

### Phase 3: Control (Week 3)
- User control modes
- Cost policies
- Documentation

### Beta Testing
- Internal dogfooding (SpecWeave development)
- 5-10 beta users
- Measure actual cost savings
- Refine thresholds

### General Availability
- Documentation complete
- Success metrics validated
- Announcement blog post

## Documentation Requirements

### User Documentation
- [ ] Getting Started: "How SpecWeave saves you 60% on AI costs"
- [ ] Reference: Model selection algorithm explanation
- [ ] How-To: Overriding model selection
- [ ] How-To: Reading cost reports
- [ ] How-To: Setting cost policies

### Developer Documentation
- [ ] Architecture: Cost tracking system design
- [ ] API: Cost tracker service API
- [ ] Contributing: Adding new agents with preferences

### Marketing Materials
- [ ] Blog post: "Announcing Intelligent Model Selection"
- [ ] Comparison: SpecWeave vs competitors (cost focus)
- [ ] Case study: Real project cost savings

## Related Work

### Inspiration
- Anthropic's official Sonnet/Haiku guidance (transcript)
- BMAD-METHOD's cost-conscious approach
- spec-kit's simplicity philosophy

### Competitive Analysis
- ❌ Cursor: No automatic model optimization
- ❌ GitHub Copilot: No cost visibility
- ❌ Windsurf: No multi-model support
- ✅ **SpecWeave: Only framework with automatic cost optimization**

## Appendix: Anthropic Official Guidance

**From Anthropic Video Transcript**:
> "The big pattern we're seeing from our community is that **Sonnet 4.5 does the high-level problem decomposition and planning**, and then **Haiku 4.5 is used to actually implement and write the code**. This multi-agent approach is becoming really popular for things like large-scale refactors or tackling technical debt."

**Performance**: Haiku 4.5 achieves **90% of Sonnet 4.5's performance** in agentic coding evaluations.

**Cost**: Haiku is **1/3 the cost** ($1 vs $3 per million input tokens).

**Speed**: Haiku is **2x faster** than Sonnet.

**Conclusion**: This increment implements Anthropic's official recommendation as an automatic, transparent system.

---

**Last Updated**: 2025-10-30
**Increment ID**: 0003-intelligent-model-selection
**Status**: Planned
**Next Steps**: Create `plan.md` with technical architecture
