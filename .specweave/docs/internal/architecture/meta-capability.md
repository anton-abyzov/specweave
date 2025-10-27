# SpecWeave Meta-Capability: Agents Build Agents, Skills Build Skills

**Last Updated**: 2025-10-27

---

## The Recursive Power of SpecWeave

**SpecWeave is self-extending**: The framework's agents and skills can create NEW agents and skills, which in turn can create MORE agents and skills. This recursive capability forms a **controlled chain of improvement** where the user remains in full control.

### The Three-Layer Architecture

```
Layer 1: SpecWeave Framework (The Factory)
   ↓ creates
Layer 2: User Projects (Using SpecWeave)
   ↓ creates
Layer 3: Custom Extensions (Agents Build Agents)
   ↓ feeds back to
Layer 1: SpecWeave improves itself
```

**Visualization**: See [meta-capability.mmd](diagrams/meta-capability.mmd)

---

## Layer 1: SpecWeave Framework (The Factory)

**Purpose**: Provide the foundational agents, skills, and methodology

**Components**:
- **20 Core Agents** (pm, architect, devops, security, qa-lead, etc.)
- **24 Core Skills** (feature-planner, context-loader, skill-router, etc.)
- **Framework Increments** (001-core-framework, 002-core-enhancements, etc.)

**Meta-capability**: **SpecWeave uses itself to build new SpecWeave features!**

**Example**:
```
Increment: 002-diagram-agents
↓
Uses: pm agent (requirements) + architect agent (design)
↓
Creates: diagrams-architect agent + diagrams-generator skill
↓
Result: SpecWeave now has diagram capabilities (built by SpecWeave!)
```

---

## Layer 2: User Projects (Using SpecWeave)

**Purpose**: Build production applications using SpecWeave methodology

**Workflow**:
1. Install SpecWeave (selective: only relevant agents/skills)
2. Create increments (auth, payments, calendar, etc.)
3. SpecWeave agents create specifications (WHAT/WHY)
4. SpecWeave agents implement code (HOW)
5. User controls every step

**Example**:
```
User: "Create payment processing feature"
↓
feature-planner skill: Plans increment
↓
pm agent: Creates requirements
↓
architect agent: Designs architecture
↓
python-backend agent: Implements code
↓
Result: Production-ready payment system
```

---

## Layer 3: Custom Extensions (Agents Build Agents)

**Purpose**: Extend SpecWeave with project-specific or domain-specific capabilities

### Agents Building Agents

**Scenario**: You need a Stripe integration expert for your SaaS

**Workflow**:
```
User: "Create a custom agent for Stripe integration"
↓
architect agent: Designs agent structure
↓
Generates: .claude/agents/stripe-integration/AGENT.md
↓
Content: Expert prompt for Stripe API, webhooks, subscriptions
↓
Result: New agent available for all future Stripe work
```

**Custom Agent Example**:
```yaml
---
name: stripe-integration
description: Expert in Stripe API integration, webhooks, subscriptions, PCI compliance
tools: Read, Write, Edit, Bash
model: sonnet
---

You are a Stripe integration expert with deep knowledge of:
- Stripe API (Charges, Payment Intents, Subscriptions)
- Webhook handling and signature verification
- PCI compliance best practices
- Error handling for payment failures
...
```

**Usage**:
```
User: "Implement Stripe subscription billing"
↓
stripe-integration agent: Implements with Stripe expertise
↓
Result: Production-ready Stripe integration
```

### Skills Building Skills

**Scenario**: You need a custom validator for your company's API standards

**Workflow**:
```
User: "Create a skill to validate API contracts against our company standards"
↓
architect agent: Designs skill structure
↓
Generates: .claude/skills/company-api-validator/SKILL.md
↓
Content: Rules for RESTful naming, error handling, versioning
↓
Result: New skill activates automatically when working on APIs
```

**Custom Skill Example**:
```yaml
---
name: company-api-validator
description: Validates API contracts against AcmeCorp standards (RESTful naming, error handling, versioning)
allowed-tools: Read, Grep, Glob
---

# AcmeCorp API Validator

Validates that APIs follow company standards:

## Naming Conventions
- Endpoints: `/api/v1/resources` (plural, lowercase)
- HTTP methods: GET, POST, PUT, PATCH, DELETE

## Error Handling
- 4xx errors: Include `error_code`, `message`, `details`
- 5xx errors: Include `request_id` for tracing

## Versioning
- Major version in URL: `/api/v1/`, `/api/v2/`
- Breaking changes require version bump
...
```

**Usage**:
```
User: "Review this API endpoint"
↓
company-api-validator skill: Activates automatically
↓
Result: Validation against company standards
```

### Tools Building Tools

**Scenario**: You need code generators, custom linters, domain-specific validators

**Examples**:
1. **GraphQL Schema Generator** - Generates schemas from data models
2. **Custom ESLint Rules** - Enforces company coding standards
3. **SQL Migration Generator** - Creates migrations from schema changes
4. **Documentation Generator** - Extracts docs from code comments

**All built by SpecWeave agents/skills!**

---

## The Recursive Chain (Controlled by User)

```
Layer 1: SpecWeave Framework
   ↓ (pm agent + architect agent)
   Creates: diagrams-architect agent

diagrams-architect agent
   ↓ (user request)
   Creates: Custom UML generator skill

Custom UML generator skill
   ↓ (user request)
   Creates: Company-specific diagram templates

Company-specific diagram templates
   ↓ (feedback loop)
   Improves: SpecWeave diagram capabilities (Layer 1)
```

**Key Point**: **User is in control at EVERY step**

- ✅ User decides when to create custom agents/skills
- ✅ User reviews generated agent/skill prompts
- ✅ User approves or modifies
- ✅ User can delete custom extensions anytime
- ✅ User controls what feeds back to SpecWeave framework

---

## SpecWeave Building SpecWeave (The Ultimate Meta)

**Principle**: **The framework uses itself to improve itself**

**Example: Creating a New Agent**

```
Increment: 003-figma-integration
↓
Uses: pm agent (requirements)
↓
Output: .specweave/increments/003-figma-integration/spec.md
↓
Uses: architect agent (design)
↓
Output: .specweave/increments/003-figma-integration/plan.md
↓
Uses: docs-writer agent (documentation)
↓
Output: src/agents/figma-implementer/AGENT.md
↓
Result: SpecWeave now has Figma capabilities (built by SpecWeave!)
```

**Observed Pattern**:
1. ✅ Increment 001: Core framework (built manually)
2. ✅ Increment 002+: Built using increment 001 agents/skills
3. ✅ Each increment adds capabilities
4. ✅ New capabilities improve future increments
5. ✅ **Continuous self-improvement loop**

---

## Benefits of Meta-Capability

### 1. Infinite Extensibility

**No limits**: Create agents/skills for ANY domain (healthcare, finance, gaming, IoT, etc.)

**Examples**:
- `hipaa-compliance` agent - Healthcare-specific compliance
- `financial-reporting` skill - GAAP/IFRS reporting standards
- `game-balance` agent - Game mechanics balancing
- `iot-protocol` skill - MQTT, CoAP, Zigbee protocols

### 2. Domain Expertise On-Demand

**Problem**: Generic AI doesn't know your company's standards

**Solution**: Create custom agents with your company's knowledge

**Example**:
```
acme-corp-standards agent:
- Coding standards from internal wiki
- Architectural patterns from past projects
- Security requirements from compliance team
- Performance benchmarks from production data
```

### 3. Continuous Learning

**Feedback loop**:
```
User discovers better pattern
   ↓
Updates custom agent/skill
   ↓
All future work uses improved pattern
   ↓
Shares improvement with team (git commit)
   ↓
Team benefits from improvement
```

### 4. Framework Evolution

**SpecWeave improves over time**:
- User feedback → New agents/skills
- Community contributions → Framework grows
- Best practices emerge → Codified in agents
- Edge cases handled → Skill improvements

### 5. Zero Lock-In

**User controls everything**:
- Custom agents/skills in `.claude/` (version controlled)
- Can modify SpecWeave agents in `src/` (fork-friendly)
- Can replace agents with custom versions
- Can remove SpecWeave entirely (specs remain)

---

## Practical Examples

### Example 1: Building a Healthcare SaaS

**Phase 1**: Use SpecWeave core agents
```
pm agent → Requirements (HIPAA compliance needed)
architect agent → Design (encryption, audit logs)
python-backend agent → Implementation
```

**Phase 2**: Create custom healthcare agent
```
User: "Create HIPAA compliance agent"
↓
SpecWeave creates: hipaa-compliance agent
↓
Agent knows: PHI handling, BAA requirements, audit trails
```

**Phase 3**: Agent builds tools
```
hipaa-compliance agent → Creates: phi-scanner skill
phi-scanner skill → Detects PHI in code/logs
```

**Phase 4**: Tools improve workflow
```
Every code commit → phi-scanner runs automatically
Detects PHI exposure → Alerts developer
Developer fixes → No HIPAA violation
```

**Result**: Healthcare SaaS built with HIPAA expertise (by SpecWeave!)

---

### Example 2: E-Commerce Platform

**Phase 1**: Core agents build foundation
```
pm agent → Product catalog, cart, checkout specs
architect agent → Microservices architecture
nodejs-backend agent → Implements services
```

**Phase 2**: Custom e-commerce skills
```
User: "Create inventory management skill"
↓
SpecWeave creates: inventory-optimizer skill
↓
Skill knows: Stock levels, reorder points, demand forecasting
```

**Phase 3**: Integration agents
```
User: "Create Shopify integration agent"
↓
SpecWeave creates: shopify-integration agent
↓
Agent knows: Shopify API, webhooks, product sync
```

**Phase 4**: Skills build more skills
```
shopify-integration agent → Creates: product-mapper skill
product-mapper skill → Maps Shopify products to internal catalog
```

**Result**: E-commerce platform with Shopify expertise (by SpecWeave!)

---

## User Control: The Safety Net

**Every step requires user approval**:

1. **Creating Custom Agent**:
   ```
   SpecWeave: "I can create a custom agent for Stripe. Review the prompt?"
   User: [Reviews] "Approved" or "Modify this section"
   ```

2. **Generating Code**:
   ```
   Agent: "I'll implement Stripe subscriptions. Review the plan?"
   User: [Reviews] "Approved" or "Change approach"
   ```

3. **Modifying Framework**:
   ```
   SpecWeave: "This improvement could enhance the framework. Contribute?"
   User: "Yes, create PR" or "No, keep local"
   ```

**No autonomous chaos** - User is always in the driver's seat.

---

## How to Leverage Meta-Capability

### 1. Identify Repetitive Tasks

**Look for**:
- Same type of API endpoints repeated
- Similar validation logic across modules
- Repeated architectural patterns
- Common error handling

**Create**: Custom skill or agent to automate

### 2. Codify Domain Knowledge

**Capture**:
- Company coding standards
- Security requirements
- Performance benchmarks
- Compliance rules

**Create**: Custom agent with company expertise

### 3. Build Team Libraries

**Share**:
- Custom agents in company repo
- Custom skills as npm packages
- Tool generators in shared folder

**Benefit**: Entire team gets expertise

### 4. Contribute Back

**If useful to others**:
- Submit PR to SpecWeave framework
- Share custom agents on GitHub
- Write blog posts about patterns

**Benefit**: Community grows stronger

---

## Related Documentation

- [Agents vs Skills Architecture](../../CLAUDE.md#agents-vs-skills-architecture) - Understanding agents and skills
- [Agents/Skills Factory Pattern](../../CLAUDE.md#agents-skills-factory-pattern) - Selective installation
- [Creating Custom Agents](../../../docs/public/guides/creating-custom-agents.md) - Step-by-step guide (to be created)
- [Creating Custom Skills](../../../docs/public/guides/creating-custom-skills.md) - Step-by-step guide (to be created)

---

## Summary: The Power of Recursion

**SpecWeave is not just a framework** - it's a **self-improving, self-extending system** where:

1. ✅ **Agents build agents** - Core agents create custom domain experts
2. ✅ **Skills build skills** - Core skills generate specialized capabilities
3. ✅ **SpecWeave builds SpecWeave** - Framework uses itself to add features
4. ✅ **Users control everything** - No autonomous changes, always approved
5. ✅ **Continuous improvement** - Each iteration makes the system smarter
6. ✅ **Community-driven** - Contributions flow back to framework

**This recursive capability is what makes SpecWeave infinitely scalable and adaptable to ANY domain.**

**The factory builds factories, and you're the architect of it all.**
