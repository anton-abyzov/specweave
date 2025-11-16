# ADR-0042: Agent Enhancement Pattern (Serverless Knowledge Injection)

**Date**: 2025-11-16
**Status**: Accepted

## Context

SpecWeave's Architect and Infrastructure agents need serverless-specific knowledge without bloating their core agent files. Key challenges:

1. **Agent Size**: Architect agent is currently ~600 lines. Adding serverless patterns, platform comparisons, cost estimation would expand it to 1500+ lines (unmanageable).
2. **Context Efficiency**: Core tenet of SpecWeave is 75% context reduction. Large agents violate this principle.
3. **Modularity**: Serverless knowledge should be optional (not all projects use serverless).
4. **Reusability**: Other agents (DevOps, Tech Lead) may also need serverless knowledge.

**Current Agent Architecture**:
```
plugins/specweave/agents/
├── architect/
│   └── AGENT.md              # ~600 lines (architecture patterns, ADR guidance)
├── infrastructure/
│   └── AGENT.md              # ~400 lines (IaC, deployment, monitoring)
└── ... (20 more agents)
```

**Problem**: How do we enhance agents with serverless knowledge without polluting agent files?

## Decision

Use **skill-based knowledge injection** pattern. Serverless knowledge lives in dedicated skills that auto-activate when needed.

**Architecture**:
```
plugins/specweave/skills/
├── serverless-recommender/
│   └── SKILL.md              # Context detection, platform recommendations (US-001)
├── serverless-iac-generator/
│   └── SKILL.md              # Terraform template generation (US-005)
├── serverless-cost-estimator/
│   └── SKILL.md              # Cost estimation and optimization (US-006)
└── serverless-security/
    └── SKILL.md              # Security best practices (US-010)

plugins/specweave/agents/
├── architect/
│   └── AGENT.md              # ~600 lines (NO serverless bloat)
└── infrastructure/
    └── AGENT.md              # ~400 lines (NO serverless bloat)
```

**How It Works**:

### 1. Skills Auto-Activate (Claude Code Native Behavior)

```yaml
---
name: serverless-recommender
description: Provides context-aware serverless recommendations for AWS Lambda, Azure Functions, GCP Cloud Functions, Firebase, Supabase. Activates when users ask about serverless deployment, cloud functions, AWS Lambda, Azure Functions, Firebase hosting, Supabase edge functions, pet project deployment, startup infrastructure, or serverless vs traditional architecture.
---

# Serverless Recommender Skill

## When to Activate

This skill activates automatically when users mention:
- "serverless", "AWS Lambda", "Azure Functions", "GCP Cloud Functions"
- "Firebase", "Supabase", "cloud functions"
- "deployment strategy", "should I use serverless"
- "pet project", "startup", "free tier"

## Collaboration with Architect Agent

When this skill activates alongside Architect Agent:
1. Skill provides serverless suitability analysis
2. Skill recommends platform (AWS vs Azure vs GCP vs Firebase vs Supabase)
3. Architect Agent uses recommendation in architecture design
4. Architect Agent creates ADR documenting serverless decision
```

**Activation Example**:
```
User: "I'm building a weather app as a pet project. Should I use serverless?"
  ↓
Claude Code: Activates 2 components
  1. architect agent (user asked about architecture)
  2. serverless-recommender skill (user mentioned "serverless" + "pet project")
  ↓
Skill: Analyzes context (pet project, low traffic) → Recommends Firebase
  ↓
Architect Agent: Receives recommendation → Creates architecture → Writes ADR
```

### 2. Agent-Skill Collaboration Pattern

**Architect Agent Enhancement** (NO code changes, just documentation):

```markdown
## Serverless Architecture (Enhanced via Skills)

When user asks about serverless deployment:

1. **Let serverless-recommender skill activate**: It will analyze project context (pet/startup/enterprise) and recommend appropriate platform.

2. **Use skill's recommendation**: Incorporate platform choice into architecture design.

3. **Document decision in ADR**: Use ADR template to document:
   - Why serverless (or why not)
   - Which platform (AWS vs Azure vs GCP vs Firebase vs Supabase)
   - Rationale (cost, scalability, learning goals)

4. **Collaborate with Infrastructure Agent**: Pass platform recommendation for IaC generation.

Example workflow:
```
User: "I need serverless architecture for my startup MVP"
  ↓
serverless-recommender skill: Analyzes → Recommends AWS Lambda (startup credits)
  ↓
Architect Agent: Creates architecture with AWS Lambda + API Gateway + DynamoDB
  ↓
Writes ADR: "ADR-001: AWS Lambda for MVP (startup credits, scalable, familiar ecosystem)"
  ↓
Infrastructure Agent: Receives recommendation → Generates Terraform (via serverless-iac-generator skill)
```

**Reference Skills**:
- `serverless-recommender`: Platform recommendations
- `serverless-cost-estimator`: Cost projections
- `serverless-security`: Security best practices
```

**Infrastructure Agent Enhancement**:

```markdown
## IaC Generation for Serverless (Enhanced via Skills)

When user requests Terraform/IaC generation:

1. **Check for serverless platform**: If architecture uses serverless (Lambda, Functions, etc.), let `serverless-iac-generator` skill activate.

2. **Use skill's templates**: Skill provides pre-built Terraform templates for:
   - AWS Lambda + API Gateway + DynamoDB
   - Azure Functions + Cosmos DB
   - GCP Cloud Functions + Firestore
   - Firebase (Hosting, Functions, Firestore)
   - Supabase (Database, Auth, Storage)

3. **Generate environment-specific configs**: Create dev/staging/prod tfvars files.

4. **Include deployment README**: Skill provides deployment instructions.

Example workflow:
```
Architect Agent: Recommends AWS Lambda architecture
  ↓
User: "Generate Terraform for this"
  ↓
Infrastructure Agent: Receives request
  ↓
serverless-iac-generator skill: Activates → Generates Terraform templates
  ↓
Infrastructure Agent: Writes files to `infrastructure/` directory
```

**Reference Skills**:
- `serverless-iac-generator`: Terraform template generation
- `serverless-cost-estimator`: Cost optimization in templates (free tier configs)
```

### 3. Skill Discovery and Dependencies

**Skill Metadata** (SKILL.md frontmatter):
```yaml
---
name: serverless-recommender
description: Provides context-aware serverless recommendations...
dependencies:
  - serverless-cost-estimator  # Uses cost data for recommendations
related-agents:
  - architect                  # Collaborates with architect agent
  - infrastructure             # Provides input to infrastructure agent
data-sources:
  - ../knowledge-base/serverless/platforms/  # Platform data (ADR-0038)
---
```

**Agent Metadata** (AGENT.md frontmatter):
```yaml
---
name: architect
description: System architecture and technical design expert
enhanced-by-skills:
  - serverless-recommender     # Auto-activates for serverless questions
  - serverless-cost-estimator  # Cost analysis
  - serverless-security        # Security guidance
---
```

### 4. Knowledge Base Access (Shared Data)

**Skills access shared knowledge base** (no duplication):

```typescript
// serverless-recommender skill
import * as awsLambda from '../../knowledge-base/serverless/platforms/aws-lambda.json';
import * as firebase from '../../knowledge-base/serverless/platforms/firebase.json';

function recommendPlatform(context: ProjectContext): PlatformRecommendation {
  const platforms = [awsLambda, firebase, azure, gcp, supabase];

  // Filter by context (pet project → prioritize free tier)
  const filtered = platforms.filter(p =>
    context === 'pet-project' ? p.pricing.freeTier.duration === "Perpetual" : true
  );

  // Rank by suitability
  return rankBySuitability(filtered, context);
}
```

**Benefits**:
- Single source of truth (knowledge base from ADR-0038)
- Skills stay DRY (don't duplicate platform data)
- Easy to update (change knowledge base, all skills benefit)

## Alternatives Considered

### Alternative 1: Bloat Agent Files with Serverless Knowledge
**Example**: Add 900 lines of serverless patterns to `architect/AGENT.md`

**Pros**: All knowledge in one place
**Cons**: Violates context efficiency (1500-line agent), hard to maintain, slows Claude Code

**Why rejected**: Contradicts SpecWeave's 75% context reduction goal.

### Alternative 2: Create Separate Serverless Agents
**Example**: `serverless-architect` and `serverless-infrastructure` agents

**Pros**: Clean separation
**Cons**: Agent proliferation (confusing for users), duplicate core agent logic

**Why rejected**: Violates DRY. Architect logic shouldn't be duplicated.

### Alternative 3: Runtime Knowledge Injection (MCP)
**Example**: Use Model Context Protocol to fetch serverless knowledge on-demand

**Pros**: True dynamic loading
**Cons**: Requires MCP server, complex setup, latency (100-200ms per fetch)

**Why rejected**: Over-engineering. Skills are simpler and Claude Code-native.

### Alternative 4: Monolithic Serverless Plugin
**Example**: One giant plugin with all serverless knowledge

**Pros**: Single install
**Cons**: Huge context (5000+ tokens), violates modularity

**Why rejected**: Users may not need all platforms (AWS-only user doesn't need Firebase knowledge).

## Consequences

### Positive
- **Context Efficiency**: Agents stay small (~600 lines), skills activate only when needed
- **Modularity**: Serverless knowledge is optional (can be uninstalled)
- **Reusability**: Multiple agents can use same skills
- **Maintainability**: Serverless knowledge in one place (skills), easy to update
- **Extensibility**: Add new platform → Add new skill (no agent changes)

### Negative
- **Skill Proliferation**: 4-5 serverless skills (but each is focused and small)
- **Discovery**: Users may not know which skills are available (mitigated by agent documentation)
- **Coordination**: Agent-skill collaboration requires clear contracts (mitigated by documentation)

### Neutral
- **Skill Count**: 4 serverless skills (~400 lines each) vs 1 bloated agent (1500 lines) - wash
- **Activation Logic**: Claude Code handles skill activation (no manual config)

## Risks and Mitigations

### Risk 1: Skills Don't Activate When Needed
**Example**: User asks "serverless?" but skill doesn't activate (missing keyword)

**Impact**: User doesn't get serverless recommendations
**Probability**: Low (Claude Code keyword matching is robust)
**Mitigation**:
- Comprehensive keyword list in skill description (20+ keywords)
- Agent documentation reminds users to mention "serverless" or platform names
- Fallback: Agent can explicitly invoke skill (Claude Code allows this)

### Risk 2: Agent-Skill Coordination Fails
**Example**: Architect agent ignores skill recommendation

**Impact**: Inconsistent recommendations
**Probability**: Low (Claude follows documented patterns)
**Mitigation**:
- Clear agent documentation: "Use skill's recommendation"
- Unit tests validate agent-skill collaboration
- E2E tests check end-to-end workflow (user question → recommendation → ADR)

### Risk 3: Skill Knowledge Becomes Stale
**Example**: AWS pricing changes but skill still uses old data

**Impact**: Inaccurate cost estimates
**Probability**: Medium (providers change pricing 2-4 times/year)
**Mitigation**:
- Skills reference shared knowledge base (ADR-0038)
- Weekly GitHub Action checks for stale data
- Update one place (knowledge base), all skills benefit

## Implementation Notes

**File Structure**:
```
plugins/specweave/
├── agents/
│   ├── architect/
│   │   └── AGENT.md                     # ~600 lines (enhanced-by-skills metadata)
│   └── infrastructure/
│       └── AGENT.md                     # ~400 lines (enhanced-by-skills metadata)
├── skills/
│   ├── serverless-recommender/
│   │   ├── SKILL.md                     # ~400 lines (US-001: context detection + recommendations)
│   │   └── tests/
│   │       └── test-recommender.ts      # Unit tests
│   ├── serverless-iac-generator/
│   │   ├── SKILL.md                     # ~500 lines (US-005: Terraform generation)
│   │   └── tests/
│   ├── serverless-cost-estimator/
│   │   ├── SKILL.md                     # ~300 lines (US-006: cost estimates)
│   │   └── tests/
│   └── serverless-security/
│       ├── SKILL.md                     # ~400 lines (US-010: security best practices)
│       └── tests/
└── knowledge-base/
    └── serverless/
        ├── platforms/                    # Platform data (ADR-0038)
        │   ├── aws-lambda.json
        │   ├── azure-functions.json
        │   └── ...
        └── schema.json
```

**Skill Activation Test** (E2E):
```typescript
describe('Agent-Skill Collaboration', () => {
  it('activates serverless-recommender skill when user asks about serverless', async () => {
    const response = await askClaude("I'm building a pet project. Should I use serverless?");

    // Verify skill activated
    expect(response.activatedSkills).toContain('serverless-recommender');

    // Verify recommendation provided
    expect(response.content).toContain('Firebase');  // Pet project → Firebase
    expect(response.content).toContain('free tier');
  });

  it('architect agent uses skill recommendation in ADR', async () => {
    const response = await askClaude("Design serverless architecture for my startup MVP");

    // Verify architect agent created ADR
    const adr = fs.readFileSync('.specweave/docs/internal/architecture/adr/001-serverless-platform.md', 'utf-8');
    expect(adr).toContain('AWS Lambda');  // Startup → AWS Lambda (startup credits)
    expect(adr).toContain('AWS Activate');
  });
});
```

## Related Decisions
- ADR-0038: Serverless Platform Knowledge Base (shared data for skills)
- ADR-0039: Context Detection Strategy (used by serverless-recommender skill)
- ADR-0040: IaC Template Engine (used by serverless-iac-generator skill)
- ADR-0041: Cost Estimation Algorithm (used by serverless-cost-estimator skill)

## References
- Claude Code Skills Documentation: https://docs.anthropic.com/claude/docs/skills
- SpecWeave Plugin Architecture: .specweave/docs/internal/architecture/system-design.md
- Context Efficiency Goal (75% reduction): CLAUDE.md
